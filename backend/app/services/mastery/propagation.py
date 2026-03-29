"""Concept graph propagation — prerequisite checking and lateral transfer."""

from dataclasses import dataclass

PREREQ_THRESHOLD = 0.35
LATERAL_BOOST_FACTOR = 0.03


@dataclass
class PropagationUpdate:
    concept_id: str
    mastery_delta: float
    reason: str  # "lateral_transfer" or "prerequisite_gap"


@dataclass
class PrerequisiteGap:
    concept_id: str
    weak_prerequisites: list[str]


def check_prerequisites(
    concept_prerequisites: list[str],
    mastery_map: dict[str, float],
) -> list[str]:
    """Return list of prerequisite concept IDs that are below threshold."""
    return [
        prereq_id
        for prereq_id in concept_prerequisites
        if mastery_map.get(prereq_id, 0.0) < PREREQ_THRESHOLD
    ]


def compute_lateral_transfers(
    lateral_relations: list[dict],
    mastery_map: dict[str, float],
    was_correct: bool,
) -> list[PropagationUpdate]:
    """Compute mastery bumps for laterally related concepts on correct answer."""
    if not was_correct:
        return []

    updates = []
    for relation in lateral_relations:
        concept_id = relation["concept_id"]
        transfer_weight = relation.get("transfer_weight", 0.1)
        current_mastery = mastery_map.get(concept_id, 0.0)
        boost = transfer_weight * LATERAL_BOOST_FACTOR
        new_mastery = min(0.99, current_mastery + boost)

        if new_mastery > current_mastery:
            updates.append(
                PropagationUpdate(
                    concept_id=concept_id,
                    mastery_delta=round(new_mastery - current_mastery, 4),
                    reason="lateral_transfer",
                )
            )

    return updates
