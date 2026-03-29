"""Cold-start diagnostic assessment — 15-question initial assessment."""

from dataclasses import dataclass

DIAGNOSTIC_CONFIG = {
    "total_questions": 15,
    "per_domain": 3,
    "difficulty_spread": [1, 3, 5],
    "time_limit_per_question": 90,
}


@dataclass
class DiagnosticResult:
    domain_id: str
    score: float
    initial_mastery: float


def compute_initial_mastery(
    domain_results: list[tuple[bool, int]],
) -> float:
    """Compute initial mastery estimate from diagnostic answers.

    domain_results: list of (is_correct, difficulty) tuples
    """
    if not domain_results:
        return 0.0

    total = len(domain_results)
    correct = sum(1 for c, _ in domain_results if c)
    score = correct / total

    # Weight by difficulty
    difficulty_weights = {1: 0.6, 2: 0.8, 3: 1.0, 4: 1.2, 5: 1.4}
    weighted_score = 0.0
    weight_sum = 0.0
    for is_correct, difficulty in domain_results:
        w = difficulty_weights.get(difficulty, 1.0)
        weighted_score += (1.0 if is_correct else 0.0) * w
        weight_sum += w

    if weight_sum > 0:
        difficulty_adjusted = weighted_score / weight_sum
    else:
        difficulty_adjusted = score

    # Conservative estimate
    return round(difficulty_adjusted * 0.7, 4)
