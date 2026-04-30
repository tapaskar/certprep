"""Content browsing endpoints — exams, concepts, decision trees, mind maps, roadmaps."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, func, select

from app.api.deps import DB, OptionalUser
from app.models.exam import Concept, DecisionTree, Exam, MindMap, Question
from app.models.progress import UserConceptMastery

router = APIRouter(prefix="/content", tags=["content"])

ROADMAPS_FILE = Path(__file__).parent.parent.parent / "data" / "roadmaps.json"


@router.get("/concepts/popular")
async def list_popular_concepts(db: DB, limit: int = 200):
    """Concepts ranked for SEO landing pages.

    Public endpoint — drives `generateStaticParams` and the sitemap
    for the programmatic /concepts/[slug] route. Without this we'd
    have no way to know which concepts deserve their own indexable
    page (we have thousands; ~200 is enough for a first wave).

    Ranking proxy: concepts from the most-popular exams first
    (the same six certs the homepage features). Within each exam,
    sort by exam_weight descending so the heaviest topics rank first.
    """
    POPULAR_EXAM_IDS = [
        "aws-clf-c02",
        "aws-saa-c03",
        "azure-az900",
        "azure-az104",
        "gcp-cdl",
        "gcp-ace",
    ]
    result = await db.execute(
        select(Concept)
        .where(Concept.exam_id.in_(POPULAR_EXAM_IDS))
        .order_by(Concept.exam_id, Concept.exam_weight.desc())
        .limit(limit)
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "exam_id": c.exam_id,
            "exam_weight": float(c.exam_weight),
        }
        for c in result.scalars()
    ]


@router.get("/concepts/{concept_id}")
async def get_concept_public(concept_id: str, db: DB):
    """Public concept detail — no auth required.

    The original /content/{exam_id}/concept/{concept_id} route is
    auth-aware (returns user mastery if logged in) and requires the
    exam_id prefix. This one is purely public, looks up by concept_id
    only, and bundles the parent exam summary so the SEO page can
    render in a single fetch.
    """
    concept = await db.get(Concept, concept_id)
    if not concept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Concept not found"
        )

    exam = await db.get(Exam, concept.exam_id)
    q_count_result = await db.execute(
        select(func.count())
        .select_from(Question)
        .where(Question.concept_ids.contains([concept_id]))
    )
    q_count = q_count_result.scalar_one() or 0

    # Resolve sibling concept names for the prerequisites/lateral lists
    # so the SEO page can render real anchor links instead of opaque IDs.
    related_ids: list[str] = []
    related_ids.extend(concept.prerequisites or [])
    related_ids.extend(concept.lateral_relations or [])
    related_ids = list({rid for rid in related_ids if rid})
    related_lookup: dict[str, str] = {}
    if related_ids:
        rel_result = await db.execute(
            select(Concept.id, Concept.name).where(Concept.id.in_(related_ids))
        )
        related_lookup = {row[0]: row[1] for row in rel_result.all()}

    def hydrate(ids: list[str] | None) -> list[dict]:
        return [
            {"id": rid, "name": related_lookup.get(rid, rid)}
            for rid in (ids or [])
            if rid
        ]

    return {
        "concept": {
            "id": concept.id,
            "name": concept.name,
            "domain_id": concept.domain_id,
            "topic_id": concept.topic_id,
            "description": concept.description,
            "exam_weight": float(concept.exam_weight),
            "difficulty_tier": concept.difficulty_tier,
            "key_facts": concept.key_facts or [],
            "common_misconceptions": concept.common_misconceptions or [],
            "aws_services": concept.aws_services or [],
            "prerequisites": hydrate(concept.prerequisites),
            "lateral_relations": hydrate(concept.lateral_relations),
        },
        "exam": (
            {
                "id": exam.id,
                "name": exam.name,
                "code": exam.code,
                "provider": exam.provider,
            }
            if exam
            else None
        ),
        "question_count": int(q_count),
    }


@router.get("/exams")
async def list_exams(db: DB):
    """List all available exams."""
    result = await db.execute(select(Exam).where(Exam.is_active))
    exams = result.scalars().all()
    return [
        {
            "id": e.id,
            "provider": e.provider,
            "name": e.name,
            "code": e.code,
            "total_questions": e.total_questions,
            "time_limit_minutes": e.time_limit_minutes,
            "passing_score_pct": e.passing_score_pct,
            "domains": e.domains,
        }
        for e in exams
    ]


@router.get("/{exam_id}/details")
async def get_exam_details(exam_id: str, db: DB):
    """Get full exam details including domains, tips, official resources."""
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    # Count questions per domain
    domain_question_counts = {}
    result = await db.execute(
        select(Question.domain_id, func.count())
        .where(Question.exam_id == exam_id)
        .group_by(Question.domain_id)
    )
    for domain_id, count in result.all():
        domain_question_counts[domain_id] = count

    total_questions_in_bank = sum(domain_question_counts.values())

    return {
        "id": exam.id,
        "provider": exam.provider,
        "name": exam.name,
        "code": exam.code,
        "description": exam.description,
        "total_questions": exam.total_questions,
        "time_limit_minutes": exam.time_limit_minutes,
        "passing_score_pct": exam.passing_score_pct,
        "domains": [
            {
                **d,
                "question_count": domain_question_counts.get(d["id"], 0),
            }
            for d in exam.domains
        ],
        "exam_guide_url": exam.exam_guide_url,
        "questions_in_bank": total_questions_in_bank,
        "mock_exams_available": min(3, total_questions_in_bank // max(exam.total_questions, 1)),
        "exam_info": exam.exam_info,
    }


@router.get("/{exam_id}/concepts")
async def list_concepts(exam_id: str, db: DB):
    """List all concepts for an exam."""
    result = await db.execute(
        select(Concept)
        .where(Concept.exam_id == exam_id)
        .order_by(Concept.domain_id, Concept.topic_id)
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "domain_id": c.domain_id,
            "topic_id": c.topic_id,
            "exam_weight": float(c.exam_weight),
            "difficulty_tier": c.difficulty_tier,
        }
        for c in result.scalars()
    ]


@router.get("/{exam_id}/concept/{concept_id}")
async def get_concept_detail(
    exam_id: str,
    concept_id: str,
    db: DB,
    user: OptionalUser = None,
):
    """Get full concept detail with optional user mastery."""
    concept = await db.get(Concept, concept_id)
    if not concept or concept.exam_id != exam_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Concept not found")

    # User mastery (only if authenticated)
    mastery_record = None
    if user:
        mastery = await db.execute(
            select(UserConceptMastery).where(
                and_(
                    UserConceptMastery.user_id == user.id,
                    UserConceptMastery.concept_id == concept_id,
                )
            )
        )
        mastery_record = mastery.scalar_one_or_none()

    # Question count
    q_count = await db.execute(
        select(func.count()).select_from(Question).where(
            Question.concept_ids.contains([concept_id])
        )
    )

    return {
        "concept": {
            "id": concept.id,
            "name": concept.name,
            "domain_id": concept.domain_id,
            "topic_id": concept.topic_id,
            "description": concept.description,
            "exam_weight": float(concept.exam_weight),
            "difficulty_tier": concept.difficulty_tier,
            "key_facts": concept.key_facts,
            "common_misconceptions": concept.common_misconceptions,
            "aws_services": concept.aws_services,
        },
        "user_mastery": (
            {
                "mastery_pct": round(float(mastery_record.mastery_probability) * 100),
                "level": mastery_record.mastery_level,
                "total_attempts": mastery_record.total_attempts,
                "accuracy_pct": (
                    round(mastery_record.correct_attempts / mastery_record.total_attempts * 100)
                    if mastery_record.total_attempts > 0
                    else 0
                ),
                "next_review": (
                    mastery_record.next_review_date.isoformat()
                    if mastery_record.next_review_date
                    else None
                ),
                "misconception_count": mastery_record.misconception_count,
            }
            if mastery_record
            else None
        ),
        "question_count": q_count.scalar() or 0,
    }


@router.get("/{exam_id}/mind-map/{mind_map_id}")
async def get_mind_map(exam_id: str, mind_map_id: str, db: DB):
    """Get mind map for React Flow rendering."""
    mm = await db.get(MindMap, mind_map_id)
    if not mm or mm.exam_id != exam_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mind map not found")
    return {
        "id": mm.id,
        "title": mm.title,
        "domain_id": mm.domain_id,
        "nodes": mm.nodes,
        "edges": mm.edges,
    }


@router.get("/{exam_id}/decision-tree/{tree_id}")
async def get_decision_tree(exam_id: str, tree_id: str, db: DB):
    """Get decision tree for interactive rendering."""
    dt = await db.get(DecisionTree, tree_id)
    if not dt or dt.exam_id != exam_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision tree not found")
    return {
        "id": dt.id,
        "title": dt.title,
        "trigger_pattern": dt.trigger_pattern,
        "tree_data": dt.tree_data,
    }


@router.get("/roadmaps")
async def get_roadmaps():
    """Get certification career roadmaps."""
    if ROADMAPS_FILE.exists():
        with open(ROADMAPS_FILE) as f:
            return json.load(f)
    return []
