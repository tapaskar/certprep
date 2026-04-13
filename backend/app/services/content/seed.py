"""Seed data loader — imports exam content from JSON fixtures."""

import json
import random
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

        exam_columns = {c.key for c in Exam.__table__.columns}
        filtered_exam = {k: v for k, v in exam_data.items() if k in exam_columns}
        existing = await db.get(Exam, exam_data["id"])
        if existing:
            for key, value in filtered_exam.items():
                if key != "id":
                    setattr(existing, key, value)
            counts["exams"] = 1
        else:
            exam = Exam(**filtered_exam)
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

    # Auto-link questions with empty concept_ids to concepts in same domain
    if concepts_file.exists() and questions_file.exists():
        # Build domain → concept_ids map from seed data
        domain_concepts: dict[str, list[str]] = {}
        for cd in concepts_data:
            did = cd.get("domain_id", "")
            if did not in domain_concepts:
                domain_concepts[did] = []
            domain_concepts[did].append(cd["id"])

        for qd in questions_data:
            if not qd.get("concept_ids"):
                domain_id = qd.get("domain_id", "")
                candidates = domain_concepts.get(domain_id, [])
                if candidates:
                    # Assign 1-2 random concepts from the same domain
                    linked = random.sample(candidates, min(2, len(candidates)))
                    qd["concept_ids"] = linked
                    # Update in DB too
                    existing_q = await db.get(Question, qd["id"])
                    if existing_q:
                        existing_q.concept_ids = linked

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
