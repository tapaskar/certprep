# Layer 2 — AI Personalization Engine

The AI engine transforms static content into a personalized learning experience. It has four subsystems: mastery tracking, question selection, concept graph propagation, and contextual explanation generation.

---

## 2.1 Mastery tracking — Bayesian Knowledge Tracing (BKT)

### Core model
Each user-concept pair maintains a mastery probability P(M) ∈ [0, 1], updated after every interaction using Bayesian inference.

### Update equations

**After a correct answer:**
```
P(M | correct) = P(correct | mastered) × P(M) / P(correct)

where:
  P(correct | mastered)    = 1 - P(slip)
  P(correct | not_mastered) = P(guess)
  P(correct) = P(correct|M) × P(M) + P(correct|¬M) × (1 - P(M))
```

**After a wrong answer:**
```
P(M | wrong) = P(wrong | mastered) × P(M) / P(wrong)

where:
  P(wrong | mastered) = P(slip)
  P(wrong | not_mastered) = 1 - P(guess)
  P(wrong) = P(slip) × P(M) + (1 - P(guess)) × (1 - P(M))
```

**Learning transition (applied after Bayesian update):**
```
P(M_new) = P(M | observation) + (1 - P(M | observation)) × P(transit)
```

P(transit) represents the probability of transitioning from unmastered to mastered on this particular interaction. Only applied on correct answers.

### BKT parameters by question type

| Question type | P(guess) | P(slip) | P(transit) | Rationale |
|---------------|----------|---------|------------|-----------|
| Scenario (multi-paragraph) | 0.05 | 0.08 | 0.15 | Hard to guess, strong signal |
| Comparison | 0.10 | 0.10 | 0.12 | Moderate guess rate (2 options highlighted) |
| Factual recall | 0.20 | 0.15 | 0.10 | 1-in-4/5 guess rate, weaker signal |
| Troubleshooting | 0.08 | 0.12 | 0.13 | Low guess, moderate slip (tricky) |

### Signal enrichment — beyond binary correct/wrong

The raw BKT is enriched with two additional signals that adjust the update magnitude:

**Response time modifier:**
```python
def time_modifier(response_time_seconds, expected_time_seconds):
    ratio = response_time_seconds / expected_time_seconds
    if ratio < 0.5:   # Very fast
        return 1.3     # Amplify signal (confident knowledge or dangerous guess)
    elif ratio < 1.0:  # Normal speed
        return 1.0     # Standard update
    elif ratio < 2.0:  # Slow
        return 0.7     # Dampen signal (uncertain but working through it)
    else:              # Very slow
        return 0.5     # Weak signal (likely looked something up or guessed after deliberation)
```

**Applied as:**
```
effective_P_transit = P(transit) × time_modifier × confidence_modifier
```

**Confidence self-report modifier:**
After answering, user rates confidence: Low (1), Medium (2), High (3).

| Outcome | Confidence | Modifier | Interpretation |
|---------|------------|----------|---------------|
| Correct | High | 1.2 | Solid mastery — boost |
| Correct | Low | 0.8 | Lucky guess or unsure — dampen |
| Wrong | High | triggers re-teach | Dangerous misconception — needs targeted intervention, not just more questions |
| Wrong | Low | 1.0 | Expected gap — standard remediation |

### Time decay — knowledge fades

```python
def decayed_mastery(last_mastery, days_since_review, decay_rate):
    return last_mastery * math.exp(-decay_rate * days_since_review)
```

**Decay rate calibration:**
| Condition | λ (decay rate) | Half-life (days) |
|-----------|---------------|-----------------|
| First correct review | 0.08 | ~8.7 days |
| 2 correct reviews | 0.05 | ~13.9 days |
| 3+ correct reviews | 0.03 | ~23.1 days |
| High-mastery (P(M) > 0.85) | 0.02 | ~34.7 days |

### Mastery thresholds

| Level | P(M) range | Label | UI color | Behavior |
|-------|-----------|-------|----------|----------|
| 0 | 0.0 | Not started | Gray | Concept not yet encountered |
| 1 | 0.01 – 0.39 | Weak | Red | High priority for remediation |
| 2 | 0.40 – 0.69 | Familiar | Amber | Active learning zone — highest ROI |
| 3 | 0.70 – 0.89 | Proficient | Blue | Reinforcement via spaced repetition |
| 4 | 0.90 – 1.0 | Mastered | Green | Maintenance reviews only |

---

## 2.2 Concept graph propagation

When a user answers a question, mastery updates propagate through the knowledge graph along two edge types.

### Prerequisite propagation (downward check)
When a user gets an advanced concept wrong, the algorithm checks prerequisites:

```python
def check_prerequisites(user_id, concept_id):
    concept = get_concept(concept_id)
    weak_prereqs = []
    for prereq_id in concept.prerequisites:
        mastery = get_user_mastery(user_id, prereq_id)
        if mastery < PREREQ_THRESHOLD:  # 0.35
            weak_prereqs.append(prereq_id)
    
    if weak_prereqs:
        # Demote advanced concept and schedule prerequisite review
        return ScheduleAction(
            demote_concept=concept_id,
            prioritize_concepts=weak_prereqs,
            reason="prerequisite_gap"
        )
```

### Lateral transfer (sideways boost)
When a user masters a concept, related concepts get a small mastery bump:

```python
def propagate_lateral(user_id, concept_id, was_correct):
    if not was_correct:
        return  # Only propagate on correct answers
    
    concept = get_concept(concept_id)
    for relation in concept.lateral_relations:
        related_mastery = get_user_mastery(user_id, relation.concept_id)
        boost = relation.transfer_weight * LATERAL_BOOST_FACTOR  # 0.03 base
        new_mastery = min(0.99, related_mastery + boost)
        update_user_mastery(user_id, relation.concept_id, new_mastery)
```

**Transfer weight guidelines:**
| Relationship strength | Weight | Example |
|----------------------|--------|---------|
| Strong overlap | 0.3 – 0.4 | S3 lifecycle → S3 Intelligent-Tiering |
| Moderate overlap | 0.15 – 0.25 | VPC peering → Transit Gateway |
| Weak overlap | 0.05 – 0.1 | IAM policies → S3 bucket policies |

### Misconception detection

The "wrong + high confidence + fast" pattern triggers a special flow:

```python
def detect_misconception(answer_record):
    if (not answer_record.correct 
        and answer_record.confidence == 3  # High
        and answer_record.time_ratio < 0.6):  # Fast
        
        return MisconceptionEvent(
            concept_id=answer_record.concept_id,
            wrong_answer=answer_record.selected_option,
            action="re_teach",  # Not just repeat — explain the specific error
            priority="critical"
        )
```

When a misconception is detected, the next interaction for that concept is NOT another question — it's an AI-generated explanation that:
1. States what the user likely believes (inferred from wrong answer)
2. Explains why that belief is incorrect
3. Provides the correct mental model
4. Then tests with a different question on the same concept

---

## 2.3 Question selection — multi-armed bandit

### The three arms

Each question selection is a choice between three strategies, balanced via Thompson Sampling:

**Arm 1 — Remediate (fix weak spots)**
```python
def remediation_score(concept):
    # Highest value: concepts in the "learning zone" with recent failures
    if concept.mastery < 0.3:
        return 0.3  # Too weak — might need prerequisites first
    elif concept.mastery < 0.7:
        learning_value = 1.0 - abs(concept.mastery - 0.5) * 2  # Peak at 0.5
        recency_boost = 1.5 if concept.last_wrong_within(days=3) else 1.0
        return learning_value * recency_boost * concept.exam_weight
    else:
        return 0.1  # Already proficient
```

**Arm 2 — Reinforce (prevent decay)**
```python
def reinforcement_score(concept):
    if concept.mastery < 0.7:
        return 0.0  # Not ready for reinforcement
    
    days_until_due = concept.next_review_date - today()
    if days_until_due <= 0:
        return 1.0 * concept.exam_weight  # Overdue — high priority
    elif days_until_due <= 2:
        return 0.6 * concept.exam_weight  # Coming due
    else:
        return 0.1  # Can wait
```

**Arm 3 — Explore (cover new ground)**
```python
def exploration_score(concept):
    if concept.mastery > 0.1:
        return 0.0  # Already started — not exploration
    
    # Check prerequisites
    prereqs_met = all(
        get_mastery(p) >= PREREQ_THRESHOLD 
        for p in concept.prerequisites
    )
    if not prereqs_met:
        return 0.0  # Can't explore yet
    
    return concept.exam_weight * 0.8  # Weighted by exam importance
```

### Budget allocation (shifts with exam proximity)

| Days to exam | Remediate | Reinforce | Explore |
|-------------|-----------|-----------|---------|
| 60+ | 35% | 25% | 40% |
| 30–60 | 45% | 30% | 25% |
| 14–30 | 55% | 35% | 10% |
| 7–14 | 60% | 35% | 5% |
| < 7 | 50% | 45% | 5% |

### Question scoring formula (within selected arm)

```python
def score_question(question, user, arm):
    concept = get_primary_concept(question)
    mastery = get_user_mastery(user.id, concept.id)
    
    # Learning value: questions near mastery edge teach most (IRT zone of proximal development)
    learning_value = 1.0 - abs(mastery - question.difficulty_normalized) 
    
    # Exam weight: high-weight domains get priority
    exam_importance = concept.exam_weight
    
    # Urgency: approaching review deadline
    urgency = max(0, 1.0 - (concept.days_until_review / 7))
    
    # Variety: penalize same domain 3x in a row
    variety = 0.0 if user.last_3_domains_same(concept.domain_id) else 0.2
    
    # Recency: don't repeat questions seen in last 48 hours
    if question.last_seen_within(hours=48):
        return -1.0  # Skip
    
    # IRT discrimination: prefer high-discrimination questions
    discrimination_bonus = (question.irt_discrimination or 1.0) * 0.1
    
    return (
        0.35 * learning_value +
        0.25 * exam_importance +
        0.20 * urgency +
        0.10 * variety +
        0.10 * discrimination_bonus
    )
```

### Cold start — diagnostic assessment

New users take a 15-question diagnostic that initializes mastery estimates across all concept clusters:

```python
DIAGNOSTIC_CONFIG = {
    "total_questions": 15,
    "per_domain": 3,  # 5 domains × 3 = 15
    "difficulty_spread": [1, 3, 5],  # Easy, medium, hard per domain
    "time_limit_per_question": 90,  # seconds
    "concepts_per_question": 1,  # Single-concept for clean signal
}

def initialize_from_diagnostic(user_id, results):
    for domain_id, domain_results in results.group_by_domain():
        # Simple heuristic: map score to initial mastery
        score = domain_results.correct_count / domain_results.total
        difficulty_adjusted = score * avg_difficulty_weight(domain_results)
        
        # Set all concepts in this domain to initial estimate
        for concept in get_domain_concepts(domain_id):
            initial_mastery = difficulty_adjusted * 0.7  # Conservative
            set_user_mastery(user_id, concept.id, initial_mastery)
    
    # Refine using concept relationships
    propagate_initial_estimates(user_id)
```

---

## 2.4 Contextual explanation generation (Claude API)

When a user gets a question wrong (or requests an explanation), the system generates a personalized explanation using Claude.

### Explanation prompt template

```python
EXPLANATION_PROMPT = """You are an AWS Solutions Architect exam tutor. A student just answered a question incorrectly.

QUESTION:
{question_stem}

STUDENT'S ANSWER: {selected_option} — "{selected_text}"
CORRECT ANSWER: {correct_option} — "{correct_text}"

STUDENT'S MASTERY CONTEXT:
- Current mastery of {primary_concept}: {mastery_level} ({mastery_pct}%)
- Related concept mastery: {related_mastery_summary}
- This is their {attempt_number}th attempt at questions on this concept
- Confidence self-report: {confidence_level}
{misconception_flag}

CURATED EXPLANATION (use as ground truth, rephrase for the student):
Why correct: {why_correct}
Why their answer is wrong: {why_selected}

INSTRUCTIONS:
1. Start with what they likely thought (based on their wrong answer)
2. Explain the specific gap in their reasoning (1-2 sentences)
3. Give the correct mental model (2-3 sentences)
4. If misconception detected: be direct that this is a common trap
5. End with a connecting insight to a related concept they DO understand
6. Keep total response under 150 words
7. Use concrete AWS terminology, not abstract language
"""
```

### Explanation triggers and caching

| Trigger | Response type | Cache? |
|---------|--------------|--------|
| Wrong answer (first time on concept) | Full explanation | Yes (per question) |
| Wrong answer (repeat on concept) | Shorter, more direct | No (personalized) |
| Misconception detected | Re-teach flow | No (personalized) |
| User clicks "Explain" on correct answer | Reinforcement explanation | Yes (per question) |
| User asks follow-up | Conversational | No |

### API usage optimization
- Cache generic explanations per question (covers ~60% of cases)
- Only call Claude API for personalized explanations (misconceptions, repeat errors, follow-ups)
- Use `claude-sonnet-4-20250514` for explanations (cost-effective, fast)
- Batch explanation pre-generation for common wrong-answer patterns
- Estimated API cost: ~$0.02 per personalized explanation, ~$0.50/user/month

---

## 2.5 Readiness score

The overall readiness score is a weighted composite:

```python
def calculate_readiness(user_id, exam_id):
    concepts = get_exam_concepts(exam_id)
    
    weighted_mastery = 0.0
    total_weight = 0.0
    domain_scores = {}
    
    for concept in concepts:
        mastery = get_decayed_mastery(user_id, concept.id)  # Apply time decay
        weighted_mastery += mastery * concept.exam_weight
        total_weight += concept.exam_weight
        
        # Aggregate by domain
        if concept.domain_id not in domain_scores:
            domain_scores[concept.domain_id] = {"sum": 0, "weight": 0}
        domain_scores[concept.domain_id]["sum"] += mastery * concept.exam_weight
        domain_scores[concept.domain_id]["weight"] += concept.exam_weight
    
    overall = (weighted_mastery / total_weight) * 100
    
    # Domain-level scores for radar chart
    domain_readiness = {
        d: (v["sum"] / v["weight"]) * 100 
        for d, v in domain_scores.items()
    }
    
    # Pass probability (logistic regression, trained on historical data)
    pass_probability = predict_pass_probability(
        overall_readiness=overall,
        domain_scores=domain_readiness,
        study_consistency=get_study_consistency(user_id),
        days_until_exam=get_days_until_exam(user_id, exam_id)
    )
    
    return {
        "overall_readiness_pct": round(overall),
        "domain_readiness": domain_readiness,
        "pass_probability_pct": round(pass_probability * 100),
        "weakest_domain": min(domain_readiness, key=domain_readiness.get),
        "strongest_domain": max(domain_readiness, key=domain_readiness.get),
        "concepts_mastered": sum(1 for c in concepts if get_mastery(user_id, c.id) >= 0.9),
        "concepts_total": len(concepts),
    }
```

### Pass probability model (trained post-launch)
Initially, use a heuristic: readiness > 80% with no domain below 60% → likely pass. Post-launch, train a logistic regression on actual pass/fail outcomes reported by users:

Features: overall_readiness, min_domain_score, study_days, avg_session_length, question_accuracy_last_7_days, mock_exam_score.
