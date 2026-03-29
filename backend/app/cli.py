"""CLI commands for database management and seeding."""

import asyncio
import sys

from app.database import get_engine, get_session_factory
from app.models import Base
from app.services.content.seed import seed_exam


async def create_tables() -> None:
    """Create all database tables."""
    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")


async def drop_tables() -> None:
    """Drop all database tables."""
    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("Tables dropped.")


async def seed(exam_id: str, data_dir: str) -> None:
    """Seed exam content from JSON fixtures."""
    async with get_session_factory()() as db:
        counts = await seed_exam(db, data_dir)
        await db.commit()
    print(f"Seeded {exam_id}:")
    for entity, count in counts.items():
        print(f"  {entity}: {count}")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python -m app.cli create-tables")
        print("  python -m app.cli drop-tables")
        print("  python -m app.cli seed [--exam <id>] [--data-dir <path>]")
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
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
