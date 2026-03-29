import uuid
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Exam(Base, TimestampMixin):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    passing_score_pct: Mapped[int] = mapped_column(Integer, nullable=False)

    domains: Mapped[list] = mapped_column(JSONB, nullable=False)
    exam_guide_url: Mapped[str | None] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)

    concepts: Mapped[list["Concept"]] = relationship("Concept", back_populates="exam")
    questions: Mapped[list["Question"]] = relationship("Question", back_populates="exam")


class Concept(Base, TimestampMixin):
    __tablename__ = "concepts"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    exam_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("exams.id"), nullable=False
    )
    domain_id: Mapped[str] = mapped_column(String(100), nullable=False)
    topic_id: Mapped[str] = mapped_column(String(100), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    exam_weight: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    difficulty_tier: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("difficulty_tier BETWEEN 1 AND 5")
    )

    key_facts: Mapped[list] = mapped_column(JSONB, default=[])
    common_misconceptions: Mapped[list] = mapped_column(JSONB, default=[])
    aws_services: Mapped[list] = mapped_column(JSONB, default=[])

    prerequisites: Mapped[list] = mapped_column(JSONB, default=[])
    lateral_relations: Mapped[list] = mapped_column(JSONB, default=[])

    decision_tree_node_id: Mapped[str | None] = mapped_column(String(100))
    mind_map_node_id: Mapped[str | None] = mapped_column(String(100))

    exam: Mapped[Exam] = relationship("Exam", back_populates="concepts")

    __table_args__ = (
        Index("idx_concepts_exam", "exam_id"),
        Index("idx_concepts_domain", "exam_id", "domain_id"),
        Index("idx_concepts_topic", "exam_id", "domain_id", "topic_id"),
    )


class ConceptEdge(Base):
    __tablename__ = "concept_edges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_concept_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("concepts.id"), nullable=False
    )
    target_concept_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("concepts.id"), nullable=False
    )
    edge_type: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint("edge_type IN ('prerequisite', 'lateral', 'contrasts_with')"),
        nullable=False,
    )
    weight: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1.0"))

    __table_args__ = (
        UniqueConstraint("source_concept_id", "target_concept_id", "edge_type"),
        Index("idx_edges_source", "source_concept_id"),
        Index("idx_edges_target", "target_concept_id"),
    )


class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    exam_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("exams.id"), nullable=False
    )
    domain_id: Mapped[str] = mapped_column(String(100), nullable=False)

    type: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint("type IN ('scenario', 'factual', 'comparison', 'troubleshooting')"),
        nullable=False,
    )
    difficulty: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("difficulty BETWEEN 1 AND 5")
    )

    stem: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSONB, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(5), nullable=False)

    explanation: Mapped[dict] = mapped_column(JSONB, nullable=False)

    concept_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=[])
    decision_tree_id: Mapped[str | None] = mapped_column(String(100))
    tags: Mapped[list] = mapped_column(JSONB, default=[])

    # IRT parameters
    irt_discrimination: Mapped[Decimal | None] = mapped_column(Numeric(5, 3))
    irt_difficulty: Mapped[Decimal | None] = mapped_column(Numeric(5, 3))
    irt_responses_count: Mapped[int] = mapped_column(Integer, default=0)

    # BKT parameters
    bkt_p_guess: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    bkt_p_slip: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    bkt_p_transit: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))

    estimated_time_seconds: Mapped[int] = mapped_column(Integer, default=90)
    source: Mapped[str] = mapped_column(String(20), default="original")
    review_status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint("review_status IN ('draft', 'review', 'approved', 'retired')"),
        default="draft",
    )

    exam: Mapped[Exam] = relationship("Exam", back_populates="questions")

    __table_args__ = (
        Index("idx_questions_exam", "exam_id"),
        Index("idx_questions_domain", "exam_id", "domain_id"),
        Index("idx_questions_type", "type"),
        Index("idx_questions_difficulty", "difficulty"),
        Index("idx_questions_status", "review_status"),
    )


class DecisionTree(Base, TimestampMixin):
    __tablename__ = "decision_trees"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    exam_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("exams.id"), nullable=False
    )
    domain_id: Mapped[str] = mapped_column(String(100), nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    trigger_pattern: Mapped[str | None] = mapped_column(Text)
    tree_data: Mapped[dict] = mapped_column(JSONB, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class MindMap(Base, TimestampMixin):
    __tablename__ = "mind_maps"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    exam_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("exams.id"), nullable=False
    )
    domain_id: Mapped[str | None] = mapped_column(String(100))

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    nodes: Mapped[list] = mapped_column(JSONB, nullable=False)
    edges: Mapped[list] = mapped_column(JSONB, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
