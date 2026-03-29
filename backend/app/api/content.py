"""Content browsing endpoints — exams, concepts, decision trees, mind maps."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, func, select

from app.api.deps import DB, OptionalUser
from app.models.exam import Concept, DecisionTree, Exam, MindMap, Question
from app.models.progress import UserConceptMastery

router = APIRouter(prefix="/content", tags=["content"])


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
