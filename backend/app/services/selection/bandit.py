"""Multi-armed bandit question selection.

Three arms: Remediate (fix weak spots), Reinforce (prevent decay), Explore (new ground).
Budget shifts as exam date approaches.
"""

import random
from dataclasses import dataclass
from enum import StrEnum


class SelectionArm(StrEnum):
    REMEDIATE = "remediate"
    REINFORCE = "reinforce"
    EXPLORE = "explore"


# Budget allocation by days to exam
BUDGET_TABLE = [
    (60, {"remediate": 0.35, "reinforce": 0.25, "explore": 0.40}),
    (30, {"remediate": 0.45, "reinforce": 0.30, "explore": 0.25}),
    (14, {"remediate": 0.55, "reinforce": 0.35, "explore": 0.10}),
    (7, {"remediate": 0.60, "reinforce": 0.35, "explore": 0.05}),
    (0, {"remediate": 0.50, "reinforce": 0.45, "explore": 0.05}),
]


def get_budget(days_to_exam: int | None) -> dict[str, float]:
    if days_to_exam is None:
        return {"remediate": 0.40, "reinforce": 0.30, "explore": 0.30}
    for threshold, budget in BUDGET_TABLE:
        if days_to_exam >= threshold:
            return budget
    return BUDGET_TABLE[-1][1]


def select_arm(days_to_exam: int | None) -> SelectionArm:
    """Select which arm to pull via Thompson Sampling (simplified as weighted random)."""
    budget = get_budget(days_to_exam)
    r = random.random()
    cumulative = 0.0
    for arm_name, weight in budget.items():
        cumulative += weight
        if r <= cumulative:
            return SelectionArm(arm_name)
    return SelectionArm.REMEDIATE


@dataclass
class ConceptScore:
    concept_id: str
    score: float
    arm: SelectionArm


def remediation_score(mastery: float, exam_weight: float, had_recent_failure: bool) -> float:
    if mastery < 0.3:
        return 0.3
    elif mastery < 0.7:
        learning_value = 1.0 - abs(mastery - 0.5) * 2
        recency_boost = 1.5 if had_recent_failure else 1.0
        return learning_value * recency_boost * exam_weight
    else:
        return 0.1


def reinforcement_score(mastery: float, exam_weight: float, days_until_due: int | None) -> float:
    if mastery < 0.7:
        return 0.0
    if days_until_due is None:
        return 0.1
    if days_until_due <= 0:
        return 1.0 * exam_weight
    elif days_until_due <= 2:
        return 0.6 * exam_weight
    else:
        return 0.1


def exploration_score(mastery: float, exam_weight: float, prereqs_met: bool) -> float:
    if mastery > 0.1:
        return 0.0
    if not prereqs_met:
        return 0.0
    return exam_weight * 0.8
