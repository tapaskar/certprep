"""Session composition engine — builds personalized study sessions."""

from dataclasses import dataclass, field


@dataclass
class SessionPlan:
    review_card_ids: list[str] = field(default_factory=list)
    question_ids: list[str] = field(default_factory=list)
    concept_preview_ids: list[str] = field(default_factory=list)
    estimated_duration_minutes: int = 0


@dataclass
class ConceptState:
    concept_id: str
    mastery: float
    next_review_date: str | None
    is_overdue: bool
    exam_weight: float
    domain_id: str


def compose_session(
    duration_minutes: int,
    overdue_concepts: list[ConceptState],
    weak_concepts: list[ConceptState],
    unexplored_concepts: list[ConceptState],
    days_to_exam: int | None = None,
) -> SessionPlan:
    """Build a session plan based on user state and available time."""
    plan = SessionPlan()

    # Priority 1: Overdue spaced repetition (up to 30% of time)
    overdue_budget = min(len(overdue_concepts), int(duration_minutes * 0.3 / 1.5))
    plan.review_card_ids = [c.concept_id for c in overdue_concepts[:overdue_budget]]
    remaining = duration_minutes - (overdue_budget * 1.5)

    # Priority 2: Remediation (weak concepts, 40% of remaining)
    if remaining > 5 and weak_concepts:
        remediation_count = min(len(weak_concepts), int(remaining * 0.4 / 2))
        plan.question_ids.extend(
            c.concept_id for c in weak_concepts[:remediation_count]
        )
        remaining -= remediation_count * 2

    # Priority 3: Exploration (new concepts, if not cramming)
    should_explore = days_to_exam is None or days_to_exam > 14
    if remaining > 5 and unexplored_concepts and should_explore:
        explore_count = min(2, len(unexplored_concepts))
        plan.concept_preview_ids = [
            c.concept_id for c in unexplored_concepts[:explore_count]
        ]
        remaining -= explore_count * 3

    # Priority 4: Fill remaining with reinforcement
    if remaining > 3 and weak_concepts:
        filler_count = int(remaining / 2)
        already_selected = set(plan.question_ids)
        for c in weak_concepts:
            if len(plan.question_ids) - len(already_selected) >= filler_count:
                break
            if c.concept_id not in already_selected:
                plan.question_ids.append(c.concept_id)

    plan.estimated_duration_minutes = duration_minutes
    return plan
