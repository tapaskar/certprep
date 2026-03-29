"""Seed data loader — imports exam content from JSON fixtures."""

import json
from decimal import Decimal
from pathlib import Path

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

        for cd in concepts_data:
            existing = await db.get(Concept, cd["id"])
            if not existing:
                cd["exam_weight"] = Decimal(str(cd["exam_weight"]))
                concept = Concept(**cd)
                db.add(concept)
                counts["concepts"] += 1

    # Load questions
    questions_file = data_path / "questions.json"
    if questions_file.exists():
        with open(questions_file) as f:
            questions_data = json.load(f)

        for qd in questions_data:
            existing = await db.get(Question, qd["id"])
            if not existing:
                for field in ["bkt_p_guess", "bkt_p_slip", "bkt_p_transit"]:
                    if field in qd and qd[field] is not None:
                        qd[field] = Decimal(str(qd[field]))
                question = Question(**qd)
                db.add(question)
                counts["questions"] += 1

    # Create dev user (for testing authenticated endpoints)
    result = await db.execute(select(User).where(User.clerk_id == "dev_user"))
    if not result.scalar_one_or_none():
        dev_user = User(
            clerk_id="dev_user",
            email="dev@certprep.local",
            display_name="Dev User",
            referral_code="DEVTEST",
        )
        db.add(dev_user)
        counts["dev_user"] = 1

    await db.flush()
    return counts
