"""CLI commands for database management and seeding."""

import asyncio
import random
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

from passlib.hash import bcrypt
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


async def seed_demo_account(
    email: str = "demo@sparkupcloud.com",
    password: str = "Demo2026!",
    exam_id: str = "aws-saa-c03",
) -> None:
    """Create or refresh a marketing/demo account with realistic progress.

    Used for ad screen recordings — the dashboard shouldn't look empty
    when the camera rolls. Idempotent: re-running refreshes the same
    user's data instead of creating duplicates.

    What it populates:
      - User row (email-verified, password set)
      - UserExamEnrollment with believable readiness, streak, XP
      - UserConceptMastery rows for every concept in the exam, with a
        weighted distribution so most are mastered, a few are weak
        (those weak ones drive the WeakConcepts dashboard card we want
        to film)
      - A passing mock exam attempt so RecentMockExams isn't empty
      - UserPathProgress on the matching learning path, half-completed
    """
    from app.models.user import User
    from app.models.exam import Concept
    from app.models.progress import (
        UserExamEnrollment,
        UserConceptMastery,
        MockExamSession,
    )
    from app.models.tutor import UserPathProgress

    rnd = random.Random(42)  # deterministic — re-runs produce the same look

    async with get_session_factory()() as db:
        # ── 1. User ──
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            # Prod schema retains a legacy `clerk_id NOT NULL` column from
            # the Clerk auth era. Current model doesn't expose it, so set it
            # via raw SQL on insert. Value is a stable synthetic ID derived
            # from the email so re-runs of this script are idempotent.
            new_user_id = await db.execute(
                text(
                    "INSERT INTO users "
                    "(id, clerk_id, email, display_name, password_hash, "
                    " is_email_verified, is_admin, plan, timezone, "
                    " daily_study_target_minutes, preferred_session_length, "
                    " notification_preferences, nudge_time, "
                    " referral_credits_usd, subscription_status) "
                    "VALUES (gen_random_uuid(), :cid, :email, :name, :pw, "
                    " true, false, 'pro_annual', 'UTC', 30, 30, "
                    " '{\"push\": true, \"email\": true, \"sms\": false}'::jsonb, "
                    " '08:00:00', 0.00, 'none') "
                    "RETURNING id"
                ).bindparams(
                    cid=f"demo-{email}",
                    email=email,
                    name="Demo Learner",
                    pw=bcrypt.hash(password),
                )
            )
            uid = new_user_id.scalar_one()
            await db.flush()
            # Reload the row through the ORM so the rest of the seeder
            # has a managed object to attach relationships to.
            result2 = await db.execute(select(User).where(User.id == uid))
            user = result2.scalar_one()
            print(f"✓ Created user {email}")
        else:
            user.password_hash = bcrypt.hash(password)
            user.is_email_verified = True
            user.plan = "pro_annual"
            user.display_name = user.display_name or "Demo Learner"
            print(f"✓ Refreshed user {email}")

        # ── 2. Concepts for the exam ──
        c_result = await db.execute(
            select(Concept).where(Concept.exam_id == exam_id)
        )
        concepts = list(c_result.scalars())
        if not concepts:
            print(
                f"✗ No concepts seeded for exam {exam_id}. Run "
                f"`python -m app.cli seed --exam {exam_id} --data-dir "
                f"data/seed/<dir>` first."
            )
            return
        total_concepts = len(concepts)

        # Mastery distribution — tuned so the WeakConcepts card has 3-5
        # weak items to display (drives the "we drill what you don't know"
        # narrative beat in the ad).
        # 50% expert (80-95%), 25% proficient (60-79%), 15% novice (35-59%),
        # 10% learning (15-34%) → ~10% feed the weakest_concepts list.
        rnd.shuffle(concepts)
        n_expert = int(total_concepts * 0.50)
        n_proficient = int(total_concepts * 0.25)
        n_novice = int(total_concepts * 0.15)
        # Remainder = learning (the weak ones)

        bands: list[tuple[float, float, str]] = []
        for i in range(total_concepts):
            if i < n_expert:
                bands.append((0.80, 0.95, "expert"))
            elif i < n_expert + n_proficient:
                bands.append((0.60, 0.79, "proficient"))
            elif i < n_expert + n_proficient + n_novice:
                bands.append((0.35, 0.59, "novice"))
            else:
                bands.append((0.15, 0.34, "learning"))

        # Wipe existing mastery for a clean slate, then re-insert.
        await db.execute(
            text("DELETE FROM user_concept_mastery WHERE user_id = :uid").bindparams(
                uid=user.id
            )
        )
        today = date.today()
        for concept, (lo, hi, level) in zip(concepts, bands):
            p = rnd.uniform(lo, hi)
            attempts = rnd.randint(8, 24)
            correct = int(attempts * (0.55 + p * 0.4))  # roughly tracks mastery
            db.add(
                UserConceptMastery(
                    user_id=user.id,
                    concept_id=concept.id,
                    mastery_probability=Decimal(f"{p:.4f}"),
                    mastery_level=level,
                    total_attempts=attempts,
                    correct_attempts=correct,
                    next_review_date=today + timedelta(days=rnd.randint(1, 7)),
                    last_review_date=today - timedelta(days=rnd.randint(0, 3)),
                )
            )

        concepts_mastered = n_expert + n_proficient

        # ── 3. Enrollment ──
        e_result = await db.execute(
            select(UserExamEnrollment).where(
                UserExamEnrollment.user_id == user.id,
                UserExamEnrollment.exam_id == exam_id,
            )
        )
        enrollment = e_result.scalar_one_or_none()
        if enrollment is None:
            enrollment = UserExamEnrollment(
                user_id=user.id,
                exam_id=exam_id,
            )
            db.add(enrollment)
        enrollment.exam_date = today + timedelta(days=28)
        enrollment.diagnostic_completed = True
        enrollment.diagnostic_completed_at = datetime.now(timezone.utc) - timedelta(
            days=21
        )
        enrollment.diagnostic_score = Decimal("64.00")
        enrollment.overall_readiness_pct = Decimal("89.00")
        enrollment.pass_probability_pct = Decimal("87.00")
        enrollment.concepts_mastered = concepts_mastered
        enrollment.concepts_total = total_concepts
        enrollment.total_xp = 4250
        enrollment.weekly_xp = 580
        enrollment.current_streak_days = 12
        enrollment.longest_streak_days = 23
        enrollment.streak_freezes_remaining = 1
        enrollment.last_active_date = today
        enrollment.is_active = True

        # ── 4. Mock exam history (one passing attempt 4 days ago) ──
        await db.execute(
            text(
                "DELETE FROM mock_exam_sessions WHERE user_id = :uid AND exam_id = :eid"
            ).bindparams(uid=user.id, eid=exam_id)
        )
        started = datetime.now(timezone.utc) - timedelta(days=4, hours=2)
        ended = started + timedelta(minutes=118)
        db.add(
            MockExamSession(
                user_id=user.id,
                exam_id=exam_id,
                mock_number=1,
                started_at=started,
                ended_at=ended,
                time_limit_minutes=130,
                question_ids=[],
                answers={},
                total_questions=65,
                questions_answered=65,
                questions_correct=56,
                score_pct=Decimal("86.15"),
                passed=True,
                completed=True,
            )
        )

        # ── 5. Path progress (half-done) ──
        # If a path covers this exam, drop the user mid-path so the
        # "Your Learning Paths" card on the dashboard isn't empty.
        # Hard-coded to the AWS SAA path we ship with — generalise if
        # we add more paths per exam.
        path_id = "aws-saa-foundations"
        p_result = await db.execute(
            select(UserPathProgress).where(
                UserPathProgress.user_id == user.id,
                UserPathProgress.path_id == path_id,
            )
        )
        prog = p_result.scalar_one_or_none()
        if prog is None:
            prog = UserPathProgress(
                user_id=user.id,
                path_id=path_id,
                current_step_id="m1-s2",
                completed_steps=["m1-s1"],
                quiz_results={},
            )
            db.add(prog)
        else:
            prog.current_step_id = "m1-s2"
            prog.completed_steps = ["m1-s1"]
            prog.completed = False

        await db.commit()

        print()
        print("─" * 60)
        print("Demo account ready. Use these to log in:")
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
        print(f"  Exam:     {exam_id}")
        print(f"  Mastery:  {concepts_mastered}/{total_concepts} concepts")
        print(f"  Streak:   12 days")
        print(f"  Readiness: 89%")
        print("─" * 60)


async def send_day1_reengagement(dry_run: bool = False) -> None:
    """Email users who signed up ~24h ago but haven't tried a question.

    Activation rescue. Engagement audit showed ~95% of signups never
    answer a single question. This email is a polite "you signed up
    yesterday, here's the one-click path to actually use the thing"
    nudge with a direct link to /dashboard (which now has the
    first-question hook front and center).

    Idempotency: tracked via notification_preferences->>'day1_email_sent'
    on the User row. Re-runs of this command skip users who already
    received it. Set the JSON field by string ISO timestamp so we
    can also see WHEN it was sent for ops/debugging.

    Use --dry-run to preview the candidate list without sending.

    Cron schedule (run hourly, hits each user exactly once when their
    24-hour mark falls inside the window):
      0 * * * * cd /opt/certprep/backend && source .venv/bin/activate && python -m app.cli send-day1-reengagement
    """
    from datetime import datetime, timezone
    from sqlalchemy import text as _text
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker

    from app.services.email import send_email

    Session = sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        result = await db.execute(
            _text(
                """
                SELECT u.id, u.email, u.display_name
                FROM users u
                WHERE u.created_at BETWEEN
                       now() - interval '48 hours'
                       AND now() - interval '24 hours'
                  AND NOT EXISTS (
                      SELECT 1 FROM user_answers a WHERE a.user_id = u.id
                  )
                  AND COALESCE(
                      (u.notification_preferences->>'day1_email_sent'),
                      ''
                  ) = ''
                """
            )
        )
        candidates = list(result)

        if not candidates:
            print("No candidates for day-1 reengagement.")
            return

        print(f"Found {len(candidates)} candidate(s) for day-1 reengagement.")

        sent = 0
        skipped = 0
        for user_id, email, display_name in candidates:
            name = (display_name or email.split("@")[0] or "there").strip()
            if dry_run:
                print(f"  [DRY RUN] Would send to {email} (name={name})")
                continue

            ok = send_email(
                to=email,
                subject="Try one question — see if SparkUpCloud is actually for you",
                body_html=_day1_reengagement_html(name),
                body_text=_day1_reengagement_text(name),
            )
            if ok:
                # Mark as sent so re-runs skip this user
                await db.execute(
                    _text(
                        """
                        UPDATE users
                        SET notification_preferences =
                            COALESCE(notification_preferences, '{}'::jsonb)
                            || jsonb_build_object('day1_email_sent', :ts)
                        WHERE id = :uid
                        """
                    ),
                    {
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "uid": user_id,
                    },
                )
                sent += 1
                print(f"  ✓ sent to {email}")
            else:
                skipped += 1
                print(f"  ✗ SES error for {email}")

        await db.commit()
        print(f"\nDone. Sent {sent}, failed {skipped}, of {len(candidates)} candidates.")


def _day1_reengagement_html(name: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px 20px;background:#f5f5f4;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="padding:28px 32px;border-bottom:1px solid #f5f5f4;">
      <div style="font-size:18px;font-weight:800;letter-spacing:-0.01em;">
        <span style="color:#1c1917;">Spark</span><span style="color:#f59e0b;">Up</span><span style="color:#1c1917;">Cloud</span>
      </div>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:22px;color:#1c1917;line-height:1.3;margin:0 0 16px;font-weight:700;">
        Hi {name} — try one question?
      </h1>
      <p style="color:#44403c;line-height:1.65;margin:0 0 16px;font-size:15px;">
        You signed up yesterday but haven't tried a practice question yet —
        totally fair, life happens.
      </p>
      <p style="color:#44403c;line-height:1.65;margin:0 0 24px;font-size:15px;">
        If you've got <strong>30 seconds</strong>, here's the easiest place
        to start. One sample question is waiting on your dashboard —
        no commitment.
      </p>
      <div style="text-align:center;margin:24px 0 28px;">
        <a href="https://www.sparkupcloud.com/dashboard?utm_source=day1_email"
           style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;">
          Try one question →
        </a>
      </div>
      <p style="color:#57534e;line-height:1.65;margin:0 0 16px;font-size:14px;">
        Click anything (right or wrong), see the explanation, and you'll know
        in a minute whether SparkUpCloud is what you need.
      </p>
      <p style="color:#57534e;line-height:1.65;margin:0;font-size:14px;">
        If it's not for you, that's fine too — just hit reply and tell us
        what felt off. We read every reply.
      </p>
      <p style="color:#1c1917;line-height:1.5;margin:20px 0 0;font-size:14px;">
        — The SparkUpCloud team
      </p>
    </div>
    <div style="padding:14px 32px;background:#fafaf9;color:#a8a29e;font-size:11px;text-align:center;border-top:1px solid #f5f5f4;">
      You're getting this because you signed up at sparkupcloud.com.
      We send at most one of these. Don't want it? Just reply with "stop".
    </div>
  </div>
</body></html>"""


def _day1_reengagement_text(name: str) -> str:
    return f"""Hi {name} — try one question?

You signed up yesterday but haven't tried a practice question yet —
totally fair, life happens.

If you've got 30 seconds, here's the easiest place to start. One sample
question is waiting on your dashboard — no commitment.

  → https://www.sparkupcloud.com/dashboard?utm_source=day1_email

Click anything (right or wrong), see the explanation, and you'll know
in a minute whether SparkUpCloud is what you need.

If it's not for you, that's fine too — just hit reply and tell us what
felt off. We read every reply.

— The SparkUpCloud team

—
You're getting this because you signed up at sparkupcloud.com. We send
at most one of these. Don't want it? Just reply with "stop".
"""


async def resend_verification_for(email: str) -> None:
    """Generate + email a fresh verification code for an arbitrary user.

    Manual rescue tool when a real user is stuck on the
    /verify-email page. Bypasses the 60-second cooldown that the
    public /auth/resend-verification endpoint enforces.

    Prints the new code to stdout so support can confirm what was
    sent (handy if the user replies "I never got it"). Email is sent
    via the same template the welcome email uses — prominent
    36px monospace code in an amber box.
    """
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker

    from app.models.user import User
    from app.api.auth import (
        _generate_verification_code,
        _welcome_email_html,
        _welcome_email_text,
    )
    from app.services.email import send_email

    Session = sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        result = await db.execute(select(User).where(User.email == email.lower().strip()))
        user = result.scalar_one_or_none()
        if not user:
            print(f"✗ No user with email {email}")
            return
        if user.is_email_verified:
            print(f"✓ {email} is already verified — no action needed.")
            return

        code = _generate_verification_code()
        user.email_verification_code = code
        user.email_verification_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.commit()

        send_email(
            to=user.email,
            subject="Your fresh SparkUpCloud verification code",
            body_html=_welcome_email_html(user.display_name or "there", code),
            body_text=_welcome_email_text(user.display_name or "there", code),
        )

    print(f"✓ Sent fresh code {code} to {email} (expires in 1 hour)")


async def list_signups(days: int = 14) -> None:
    """Audit recent user signups for abuse patterns.

    Prints a compact table: when, verified status, plan, email,
    last login. Use to spot bot waves (lots of free signups in a
    short window with display_name == email-local-part) and to
    seed the DISPOSABLE_EMAIL_DOMAINS allowlist in auth.py.
    """
    from sqlalchemy import text as _text

    async with get_engine().connect() as conn:
        # Pass days as a string — asyncpg's `||` (string concat) operator
        # is strict about types, won't auto-cast int to text.
        result = await conn.execute(
            _text(
                "SELECT created_at, email, display_name, "
                "       is_email_verified, last_login_at, plan "
                "FROM users "
                "WHERE created_at > now() - (:days || ' days')::interval "
                "ORDER BY created_at DESC"
            ),
            {"days": str(days)},
        )
        rows = list(result)

    print(f"\n=== Last {days} days · {len(rows)} signups ===\n")
    print(
        f'{"created_at":21s} {"verified":>8s} {"logged_in":>10s} '
        f'{"plan":12s} {"email":40s} {"display_name":20s}'
    )
    print("─" * 120)
    for row in rows:
        ver = "YES" if row[3] else "no"
        login = "YES" if row[4] else "no"
        # Earlier versions of this script flagged "display_name ==
        # email local-part" as a bot signature. That was wrong — the
        # frontend's register form auto-derives display_name from the
        # email when the user leaves the optional name field blank
        # (which is the default — the field is hidden behind a
        # disclosure). So display_name == email-local-part is the
        # NORMAL pattern for real signups, not a bot tell. The flag
        # was misleading; removed.
        print(
            f"{str(row[0])[:19]:21s} {ver:>8s} {login:>10s} "
            f"{row[5][:12]:12s} {(row[1] or '')[:40]:40s} "
            f"{(row[2] or '')[:20]:20s}"
        )

    # Domain breakdown — quick way to spot a flood from one domain
    print()
    from collections import Counter
    domains = Counter((r[1] or "").split("@")[-1].lower() for r in rows)
    print("Top domains:")
    for d, n in domains.most_common(8):
        print(f"  {n:5d}  {d}")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python -m app.cli create-tables          # idempotent; installs pgvector + HNSW index")
        print("  python -m app.cli drop-tables            # DESTRUCTIVE")
        print("  python -m app.cli seed [--exam <id>] [--data-dir <path>]")
        print("  python -m app.cli seed-all")
        print("  python -m app.cli backfill-embeddings    # embed existing Coach history for RAG")
        print("  python -m app.cli seed-demo-account [--email <e>] [--password <p>] [--exam <id>]")
        print("  python -m app.cli list-signups [--days N]  # audit recent registrations")
        print("  python -m app.cli resend-verification <email>  # manual rescue for stuck users")
        print("  python -m app.cli send-day1-reengagement [--dry-run]  # email yesterday's silent signups")
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
    elif command == "seed-demo-account":
        kwargs: dict[str, str] = {}
        args = sys.argv[2:]
        for i, arg in enumerate(args):
            if arg == "--email" and i + 1 < len(args):
                kwargs["email"] = args[i + 1]
            elif arg == "--password" and i + 1 < len(args):
                kwargs["password"] = args[i + 1]
            elif arg == "--exam" and i + 1 < len(args):
                kwargs["exam_id"] = args[i + 1]
        asyncio.run(seed_demo_account(**kwargs))
    elif command == "resend-verification":
        if len(sys.argv) < 3:
            print("Usage: python -m app.cli resend-verification <email>")
            sys.exit(1)
        asyncio.run(resend_verification_for(sys.argv[2]))
    elif command == "send-day1-reengagement":
        dry = "--dry-run" in sys.argv[2:]
        asyncio.run(send_day1_reengagement(dry_run=dry))
    elif command == "list-signups":
        days = 14
        args = sys.argv[2:]
        for i, arg in enumerate(args):
            if arg == "--days" and i + 1 < len(args):
                try:
                    days = int(args[i + 1])
                except ValueError:
                    print(f"--days must be an integer; got {args[i + 1]}")
                    sys.exit(1)
        asyncio.run(list_signups(days))
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
