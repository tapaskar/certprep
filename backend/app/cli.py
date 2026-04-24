"""CLI commands for database management and seeding."""

import asyncio
import sys
from pathlib import Path

from sqlalchemy import select, text

from app.database import get_engine, get_session_factory
from app.models import Base
from app.services.content.seed import seed_exam


async def create_tables() -> None:
    """Create all database tables. Also installs pgvector + HNSW index if available."""
    engine = get_engine()

    # 1. Try to enable pgvector — required for the RAG embedding column.
    #    Soft-fails if the user doesn't have permission; we just won't get
    #    fast vector search until they install it manually.
    async with engine.begin() as conn:
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            print("✓ pgvector extension enabled")
        except Exception as e:  # noqa: BLE001
            print(
                f"⚠ Could not enable pgvector ({e}). RAG will fall back to "
                "Python cosine on JSONB. Ask your DB admin to run "
                "`CREATE EXTENSION vector;` for fast vector search."
            )

    # 2. Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 3. Create HNSW index on the embedding column (pgvector only).
    #    Idempotent — IF NOT EXISTS handles the rerun case.
    async with engine.begin() as conn:
        try:
            await conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_tme_embedding_hnsw "
                    "ON tutor_message_embeddings "
                    "USING hnsw (embedding vector_cosine_ops)"
                )
            )
            print("✓ HNSW index ready on tutor_message_embeddings.embedding")
        except Exception as e:  # noqa: BLE001
            # Will fail if pgvector wasn't installed or the column is JSONB.
            # Not fatal.
            print(f"⚠ Skipped HNSW index ({e})")

    print("Tables created successfully.")


async def drop_tables() -> None:
    """Drop all database tables."""
    async with get_engine().begin() as conn:
        # Drop all tables with CASCADE to handle circular FK deps
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
    print("Tables dropped.")


async def seed(exam_id: str, data_dir: str) -> None:
    """Seed exam content from JSON fixtures."""
    async with get_session_factory()() as db:
        counts = await seed_exam(db, data_dir)
        await db.commit()
    print(f"Seeded {exam_id}:")
    for entity, count in counts.items():
        print(f"  {entity}: {count}")


async def backfill_embeddings(batch_size: int = 32) -> None:
    """Backfill embeddings for every existing message in tutor_conversations.

    Iterates every (user, scope) conversation, walks its `messages` array,
    and embeds any message that doesn't already have a row in
    tutor_message_embeddings (matched by content prefix to avoid expensive
    full-text comparisons).

    Safe to re-run — only inserts what's missing.
    """
    from app.models.tutor import TutorConversation, TutorMessageEmbedding
    from app.services.ai.retrieval import index_messages

    async with get_session_factory()() as db:
        result = await db.execute(select(TutorConversation))
        conversations = result.scalars().all()
        print(f"Found {len(conversations)} conversations to scan")

        total_embedded = 0
        for conv in conversations:
            messages = conv.messages or []
            if not messages:
                continue

            # What's already embedded for this conversation?
            existing_q = await db.execute(
                select(TutorMessageEmbedding.content).where(
                    TutorMessageEmbedding.conversation_id == conv.id
                )
            )
            existing_contents = {row[0] for row in existing_q.all()}

            # Filter to messages we haven't embedded yet
            to_embed = [
                m for m in messages
                if m.get("content") and m["content"] not in existing_contents
            ]
            if not to_embed:
                continue

            # Embed in batches so we don't blast the embedder API
            for i in range(0, len(to_embed), batch_size):
                batch = to_embed[i : i + batch_size]
                indexed = await index_messages(
                    db,
                    user_id=conv.user_id,
                    conversation_id=conv.id,
                    scope=conv.scope,
                    messages=batch,
                )
                total_embedded += indexed
                print(
                    f"  conv {conv.id} (scope={conv.scope}): +{indexed} "
                    f"(total {total_embedded})"
                )

        print(f"\n✓ Backfill complete. {total_embedded} messages embedded.")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python -m app.cli create-tables          # idempotent; installs pgvector + HNSW index")
        print("  python -m app.cli drop-tables            # DESTRUCTIVE")
        print("  python -m app.cli seed [--exam <id>] [--data-dir <path>]")
        print("  python -m app.cli seed-all")
        print("  python -m app.cli backfill-embeddings    # embed existing Coach history for RAG")
        sys.exit(1)

    command = sys.argv[1]

    if command == "create-tables":
        asyncio.run(create_tables())
    elif command == "drop-tables":
        asyncio.run(drop_tables())
    elif command == "seed":
        exam_id = "aws-sap-c02"
        data_dir = "data/seed/aws-sap"

        args = sys.argv[2:]
        for i, arg in enumerate(args):
            if arg == "--exam" and i + 1 < len(args):
                exam_id = args[i + 1]
            elif arg == "--data-dir" and i + 1 < len(args):
                data_dir = args[i + 1]

        asyncio.run(seed(exam_id, data_dir))
    elif command == "seed-all":
        async def seed_all():
            for exam_dir in sorted(Path("data/seed").iterdir()):
                if exam_dir.is_dir() and (exam_dir / "exam.json").exists():
                    async with get_session_factory()() as db:
                        counts = await seed_exam(db, data_dir=str(exam_dir))
                        await db.commit()
                    print(f"Seeded {exam_dir.name}: {counts}")
        asyncio.run(seed_all())
    elif command == "backfill-embeddings":
        asyncio.run(backfill_embeddings())
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
