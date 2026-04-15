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

    # Load exam info
    exam_info_file = data_path / "exam_info.json"
    if exam_info_file.exists():
        with open(exam_info_file) as f:
            exam_info = json.load(f)
        existing_exam = await db.get(Exam, exam_data["id"])
        if existing_exam:
            existing_exam.exam_info = exam_info

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

    # Auto-link questions with empty concept_ids using keyword matching
    if concepts_file.exists() and questions_file.exists():
        # Build concept keyword index for content-based matching
        import re

        domain_concepts: dict[str, list[dict]] = {}
        for cd in concepts_data:
            did = cd.get("domain_id", "")
            if did not in domain_concepts:
                domain_concepts[did] = []
            # Extract keywords from concept name, description, key_facts, aws_services
            keywords = set()
            name = cd.get("name", "").lower()
            keywords.update(re.findall(r'[a-z][a-z0-9]+', name))
            desc = cd.get("description", "") or ""
            keywords.update(re.findall(r'[a-z][a-z0-9]+', desc.lower()))
            for svc in cd.get("aws_services", []):
                keywords.update(re.findall(r'[a-z][a-z0-9]+', svc.lower()))
            for fact in cd.get("key_facts", []):
                if isinstance(fact, str):
                    keywords.update(re.findall(r'[a-z][a-z0-9]+', fact.lower()))
            # Remove noise words
            noise = {"the", "and", "for", "with", "that", "this", "are", "from",
                     "can", "has", "was", "will", "use", "used", "using", "which",
                     "when", "how", "what", "each", "all", "more", "most", "also",
                     "not", "but", "its", "you", "your", "into", "between", "across"}
            keywords -= noise
            domain_concepts[did].append({
                "id": cd["id"],
                "name": name,
                "keywords": keywords,
            })

        for qd in questions_data:
            if not qd.get("concept_ids"):
                domain_id = qd.get("domain_id", "")
                candidates = domain_concepts.get(domain_id, [])
                if candidates:
                    # Score each concept by keyword overlap with question stem
                    stem_lower = qd.get("stem", "").lower()
                    stem_words = set(re.findall(r'[a-z][a-z0-9]+', stem_lower))
                    # Also check options text
                    for opt in qd.get("options", []):
                        if isinstance(opt, dict):
                            opt_text = opt.get("text", "")
                        else:
                            opt_text = str(opt)
                        stem_words.update(re.findall(r'[a-z][a-z0-9]+', opt_text.lower()))

                    scored = []
                    for c in candidates:
                        overlap = len(c["keywords"] & stem_words)
                        # Boost if concept name words appear in stem
                        name_words = set(re.findall(r'[a-z][a-z0-9]+', c["name"]))
                        name_overlap = len(name_words & stem_words)
                        score = overlap + name_overlap * 3  # name matches weight 3x
                        scored.append((c["id"], score))

                    scored.sort(key=lambda x: x[1], reverse=True)
                    # Take best match, plus second if it also scores well
                    if scored and scored[0][1] > 0:
                        linked = [scored[0][0]]
                        if len(scored) > 1 and scored[1][1] >= scored[0][1] * 0.6:
                            linked.append(scored[1][0])
                    elif scored:
                        # Fallback: pick the first concept in the domain (deterministic)
                        linked = [scored[0][0]]
                    else:
                        linked = []

                    if linked:
                        qd["concept_ids"] = linked
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
