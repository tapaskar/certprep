"""Pydantic schemas for content browsing endpoints."""

from pydantic import BaseModel


class ExamResponse(BaseModel):
    id: str
    provider: str
    name: str
    code: str | None
    description: str | None
    total_questions: int
    time_limit_minutes: int
    passing_score_pct: int
    domains: list[dict]
    is_active: bool


class ConceptResponse(BaseModel):
    id: str
    name: str
    domain_id: str
    topic_id: str
    description: str | None
    exam_weight: float
    difficulty_tier: int | None
    key_facts: list[str]
    common_misconceptions: list[str]
    aws_services: list[str]


class ConceptDetailResponse(BaseModel):
    concept: ConceptResponse
    user_mastery: dict | None = None
    related_concepts: list[dict] = []
    decision_tree: dict | None = None
    question_count: int = 0


class DecisionTreeResponse(BaseModel):
    id: str
    title: str
    trigger_pattern: str | None
    tree_data: dict


class MindMapResponse(BaseModel):
    id: str
    title: str
    domain_id: str | None
    nodes: list[dict]
    edges: list[dict]


class QuestionResponse(BaseModel):
    id: str
    type: str
    difficulty: int | None
    stem: str
    options: list[dict]
    concept_ids: list[str]
    tags: list[str]
    estimated_time_seconds: int
