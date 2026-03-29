"""Tests for readiness score calculation."""

from app.services.analytics.readiness import calculate_readiness


def test_empty_concepts():
    result = calculate_readiness([])
    assert result.overall_readiness_pct == 0
    assert result.concepts_mastered == 0


def test_full_mastery():
    concepts = [
        {"concept_id": "c1", "domain_id": "d1", "mastery": 0.95, "exam_weight": 0.5},
        {"concept_id": "c2", "domain_id": "d1", "mastery": 0.92, "exam_weight": 0.5},
    ]
    result = calculate_readiness(concepts)
    assert result.overall_readiness_pct >= 90
    assert result.concepts_mastered == 2


def test_mixed_mastery():
    concepts = [
        {"concept_id": "c1", "domain_id": "d1", "mastery": 0.8, "exam_weight": 0.3},
        {"concept_id": "c2", "domain_id": "d1", "mastery": 0.2, "exam_weight": 0.3},
        {"concept_id": "c3", "domain_id": "d2", "mastery": 0.5, "exam_weight": 0.4},
    ]
    result = calculate_readiness(concepts)
    assert 0 < result.overall_readiness_pct < 100
    assert len(result.domain_readiness) == 2
    assert result.weakest_domain != ""
    assert result.strongest_domain != ""


def test_domain_readiness():
    concepts = [
        {"concept_id": "c1", "domain_id": "d1", "mastery": 0.9, "exam_weight": 0.5},
        {"concept_id": "c2", "domain_id": "d2", "mastery": 0.3, "exam_weight": 0.5},
    ]
    result = calculate_readiness(concepts)
    assert result.domain_readiness["d1"] > result.domain_readiness["d2"]
    assert result.weakest_domain == "d2"
    assert result.strongest_domain == "d1"
