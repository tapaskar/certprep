"""Readiness score calculation — weighted composite of concept mastery."""

from dataclasses import dataclass


@dataclass
class ReadinessScore:
    overall_readiness_pct: int
    domain_readiness: dict[str, float]
    pass_probability_pct: int
    weakest_domain: str
    strongest_domain: str
    concepts_mastered: int
    concepts_total: int


def calculate_readiness(
    concept_masteries: list[dict],
) -> ReadinessScore:
    """Calculate readiness from concept mastery data.

    concept_masteries: list of dicts with keys:
        concept_id, domain_id, mastery, exam_weight
    """
    if not concept_masteries:
        return ReadinessScore(
            overall_readiness_pct=0,
            domain_readiness={},
            pass_probability_pct=0,
            weakest_domain="",
            strongest_domain="",
            concepts_mastered=0,
            concepts_total=0,
        )

    weighted_mastery = 0.0
    total_weight = 0.0
    domain_scores: dict[str, dict[str, float]] = {}
    mastered_count = 0

    for cm in concept_masteries:
        mastery = cm["mastery"]
        weight = cm["exam_weight"]
        domain_id = cm["domain_id"]

        weighted_mastery += mastery * weight
        total_weight += weight

        if domain_id not in domain_scores:
            domain_scores[domain_id] = {"sum": 0.0, "weight": 0.0}
        domain_scores[domain_id]["sum"] += mastery * weight
        domain_scores[domain_id]["weight"] += weight

        if mastery >= 0.9:
            mastered_count += 1

    overall = (weighted_mastery / max(total_weight, 1e-10)) * 100

    domain_readiness = {
        d: round((v["sum"] / max(v["weight"], 1e-10)) * 100, 1)
        for d, v in domain_scores.items()
    }

    # Heuristic pass probability (pre-ML model)
    min_domain = min(domain_readiness.values()) if domain_readiness else 0
    if overall >= 80 and min_domain >= 60:
        pass_prob = min(95, int(overall * 1.1))
    elif overall >= 60:
        pass_prob = int(overall * 0.8)
    else:
        pass_prob = int(overall * 0.5)

    weakest = min(domain_readiness, key=domain_readiness.get) if domain_readiness else ""
    strongest = max(domain_readiness, key=domain_readiness.get) if domain_readiness else ""

    return ReadinessScore(
        overall_readiness_pct=round(overall),
        domain_readiness=domain_readiness,
        pass_probability_pct=pass_prob,
        weakest_domain=weakest,
        strongest_domain=strongest,
        concepts_mastered=mastered_count,
        concepts_total=len(concept_masteries),
    )
