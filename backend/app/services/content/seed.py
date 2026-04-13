"""Seed data loader — imports exam content from JSON fixtures."""

import json
from decimal import Decimal
from pathlib import Path

from passlib.hash import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Concept, Exam, Question
from app.models.user import User


async def seed_exam(db: AsyncSession, data_dir: str) -> dict[str, int]:
    """Load exam, concepts, questions, and a dev user from JSON fixtures.

    Returns counts of imported records.
    """
    data_path = Path(data_dir)
    counts = {"exams": 0, "concepts": 0, "questions": 0, "dev_user": 0}

    # Load exam
    exam_file = data_path / "exam.json"
    if exam_file.exists():
        with open(exam_file) as f:
            exam_data = json.load(f)

        existing = await db.get(Exam, exam_data["id"])
        if not existing:
            exam = Exam(**exam_data)
            db.add(exam)
            counts["exams"] = 1

    # Load concepts
    concepts_file = data_path / "concepts.json"
    if concepts_file.exists():
        with open(concepts_file) as f:
            concepts_data = json.load(f)

        # Known Concept model columns
        concept_columns = {c.key for c in Concept.__table__.columns}

        for cd in concepts_data:
            cd["exam_weight"] = Decimal(str(cd["exam_weight"]))
            filtered = {k: v for k, v in cd.items() if k in concept_columns}
            existing = await db.get(Concept, cd["id"])
            if existing:
                # Update existing concept with corrected data (domain_id, exam_weight, etc.)
                for key, value in filtered.items():
                    if key != "id":
                        setattr(existing, key, value)
                counts["concepts"] += 1
            else:
                concept = Concept(**filtered)
                db.add(concept)
                counts["concepts"] += 1

    # Load questions
    questions_file = data_path / "questions.json"
    if questions_file.exists():
        with open(questions_file) as f:
            questions_data = json.load(f)

        question_columns = {c.key for c in Question.__table__.columns}

        for qd in questions_data:
            for field in ["bkt_p_guess", "bkt_p_slip", "bkt_p_transit"]:
                if field in qd and qd[field] is not None:
                    qd[field] = Decimal(str(qd[field]))
            filtered = {k: v for k, v in qd.items() if k in question_columns}
            existing = await db.get(Question, qd["id"])
            if existing:
                for key, value in filtered.items():
                    if key != "id":
                        setattr(existing, key, value)
                counts["questions"] += 1
            else:
                question = Question(**filtered)
                db.add(question)
                counts["questions"] += 1

    # Create dev user (for testing authenticated endpoints)
    result = await db.execute(select(User).where(User.clerk_id == "dev_user"))
    if not result.scalar_one_or_none():
        dev_user = User(
            clerk_id="dev_user",
            email="dev@sparkupcloud.com",
            display_name="Dev User",
            referral_code="DEVTEST",
            password_hash=bcrypt.hash("password123"),
            is_email_verified=True,
            is_admin=True,
        )
        db.add(dev_user)
        counts["dev_user"] = 1

    # Make tapas admin if exists
    result = await db.execute(select(User).where(User.email == "tapas.eric@gmail.com"))
    tapas = result.scalar_one_or_none()
    if tapas and not tapas.is_admin:
        tapas.is_admin = True

    await db.flush()
    return counts
