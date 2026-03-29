"""Question scoring formula — ranks questions within a selected arm."""


def score_question(
    mastery: float,
    difficulty_normalized: float,
    exam_weight: float,
    days_until_review: int | None,
    same_domain_streak: bool,
    irt_discrimination: float | None,
    recently_seen: bool,
) -> float:
    """Score a candidate question for selection.

    Returns negative score if question should be skipped.
    """
    if recently_seen:
        return -1.0

    # Learning value: questions near mastery edge teach most
    learning_value = 1.0 - abs(mastery - difficulty_normalized)

    # Exam weight: high-weight domains get priority
    exam_importance = exam_weight

    # Urgency: approaching review deadline
    if days_until_review is not None:
        urgency = max(0.0, 1.0 - (days_until_review / 7))
    else:
        urgency = 0.0

    # Variety: penalize same domain 3x in a row
    variety = 0.0 if same_domain_streak else 0.2

    # IRT discrimination bonus
    discrimination_bonus = (irt_discrimination or 1.0) * 0.1

    return (
        0.35 * learning_value
        + 0.25 * exam_importance
        + 0.20 * urgency
        + 0.10 * variety
        + 0.10 * discrimination_bonus
    )
