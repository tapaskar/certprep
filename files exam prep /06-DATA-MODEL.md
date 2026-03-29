# Layer 6 — Data Model

Complete PostgreSQL schema. All timestamps in UTC. UUIDs for primary keys. JSONB for flexible nested data.

---

## 6.1 Core tables

### users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id VARCHAR(255) UNIQUE NOT NULL,       -- Clerk external ID
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Subscription
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'none',  -- none, trialing, active, past_due, canceled
    trial_ends_at TIMESTAMPTZ,
    
    -- Team (nullable for solo users)
    team_id UUID REFERENCES teams(id),
    team_role VARCHAR(20),  -- admin, member
    
    -- Preferences
    daily_study_target_minutes INT DEFAULT 30,
    preferred_session_length INT DEFAULT 30,       -- 15, 30, or 60
    notification_preferences JSONB DEFAULT '{"push": true, "email": true, "sms": false}',
    nudge_time TIME DEFAULT '08:00',               -- Learned from behavior over time
    
    -- Referral
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),
    referral_credits_usd DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ                         -- Soft delete for GDPR
);

CREATE INDEX idx_users_clerk ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_team ON users(team_id);
CREATE INDEX idx_users_plan ON users(plan);
```

### teams

```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    admin_user_id UUID NOT NULL REFERENCES users(id),
    stripe_subscription_id VARCHAR(255),
    max_seats INT DEFAULT 10,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6.2 Content tables

### exams

```sql
CREATE TABLE exams (
    id VARCHAR(50) PRIMARY KEY,                    -- e.g., 'aws-sap-c02'
    provider VARCHAR(50) NOT NULL,                 -- 'aws', 'azure', 'gcp'
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20),                              -- e.g., 'SAP-C02'
    description TEXT,
    total_questions INT NOT NULL,                   -- 75 for AWS SA Pro
    time_limit_minutes INT NOT NULL,               -- 180
    passing_score_pct INT NOT NULL,                -- 75
    
    domains JSONB NOT NULL,                        -- [{id, name, weight_pct}]
    exam_guide_url TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### concepts

```sql
CREATE TABLE concepts (
    id VARCHAR(100) PRIMARY KEY,                   -- e.g., 'aws-sap-vpc-peering'
    exam_id VARCHAR(50) NOT NULL REFERENCES exams(id),
    domain_id VARCHAR(100) NOT NULL,
    topic_id VARCHAR(100) NOT NULL,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    exam_weight DECIMAL(5,4) NOT NULL,             -- 0.0800 = 8%
    difficulty_tier INT CHECK (difficulty_tier BETWEEN 1 AND 5),
    
    key_facts JSONB DEFAULT '[]',                  -- ["fact1", "fact2"]
    common_misconceptions JSONB DEFAULT '[]',
    aws_services JSONB DEFAULT '[]',               -- ["VPC", "Route Tables"]
    
    -- Graph edges (stored denormalized for fast lookup)
    prerequisites JSONB DEFAULT '[]',              -- ["concept-id-1", "concept-id-2"]
    lateral_relations JSONB DEFAULT '[]',           -- [{"concept_id": "...", "transfer_weight": 0.3}]
    
    decision_tree_node_id VARCHAR(100),
    mind_map_node_id VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_concepts_exam ON concepts(exam_id);
CREATE INDEX idx_concepts_domain ON concepts(exam_id, domain_id);
CREATE INDEX idx_concepts_topic ON concepts(exam_id, domain_id, topic_id);
```

### concept_edges (normalized graph for complex queries)

```sql
CREATE TABLE concept_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_concept_id VARCHAR(100) NOT NULL REFERENCES concepts(id),
    target_concept_id VARCHAR(100) NOT NULL REFERENCES concepts(id),
    edge_type VARCHAR(20) NOT NULL CHECK (edge_type IN ('prerequisite', 'lateral', 'contrasts_with')),
    weight DECIMAL(3,2) DEFAULT 1.0,               -- 0.0-1.0 for lateral, always 1.0 for prerequisite
    
    UNIQUE(source_concept_id, target_concept_id, edge_type)
);

CREATE INDEX idx_edges_source ON concept_edges(source_concept_id);
CREATE INDEX idx_edges_target ON concept_edges(target_concept_id);
```

### questions

```sql
CREATE TABLE questions (
    id VARCHAR(50) PRIMARY KEY,                    -- e.g., 'q-sap-net-042'
    exam_id VARCHAR(50) NOT NULL REFERENCES exams(id),
    domain_id VARCHAR(100) NOT NULL,
    
    type VARCHAR(20) NOT NULL CHECK (type IN ('scenario', 'factual', 'comparison', 'troubleshooting')),
    difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
    
    stem TEXT NOT NULL,
    options JSONB NOT NULL,                        -- [{"id": "A", "text": "...", "is_correct": false}]
    correct_answer VARCHAR(5) NOT NULL,
    
    explanation JSONB NOT NULL,                    -- {"why_correct": "...", "why_not_A": "...", ...}
    
    -- Concept mappings
    concept_ids JSONB NOT NULL DEFAULT '[]',       -- ["concept-1", "concept-2"]
    decision_tree_id VARCHAR(100),
    tags JSONB DEFAULT '[]',
    
    -- IRT parameters (calibrated from user data)
    irt_discrimination DECIMAL(5,3),               -- 'a' parameter, NULL until calibrated
    irt_difficulty DECIMAL(5,3),                    -- 'b' parameter, NULL until calibrated
    irt_responses_count INT DEFAULT 0,             -- Number of responses used for calibration
    
    -- BKT parameters (per question type defaults, can be overridden)
    bkt_p_guess DECIMAL(4,3),
    bkt_p_slip DECIMAL(4,3),
    bkt_p_transit DECIMAL(4,3),
    
    estimated_time_seconds INT DEFAULT 90,
    source VARCHAR(20) DEFAULT 'original',
    review_status VARCHAR(20) DEFAULT 'draft' CHECK (review_status IN ('draft', 'review', 'approved', 'retired')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_questions_domain ON questions(exam_id, domain_id);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_status ON questions(review_status);
CREATE INDEX idx_questions_concepts ON questions USING GIN (concept_ids);
```

### decision_trees

```sql
CREATE TABLE decision_trees (
    id VARCHAR(100) PRIMARY KEY,
    exam_id VARCHAR(50) NOT NULL REFERENCES exams(id),
    domain_id VARCHAR(100) NOT NULL,
    
    title VARCHAR(200) NOT NULL,
    trigger_pattern TEXT,                          -- "Connect VPCs / on-premises to AWS"
    tree_data JSONB NOT NULL,                      -- Full tree structure (recursive nodes)
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### mind_maps

```sql
CREATE TABLE mind_maps (
    id VARCHAR(100) PRIMARY KEY,
    exam_id VARCHAR(50) NOT NULL REFERENCES exams(id),
    domain_id VARCHAR(100),                        -- NULL for master mind map
    
    title VARCHAR(200) NOT NULL,
    nodes JSONB NOT NULL,                          -- [{id, label, parent_id, concept_id, position, style}]
    edges JSONB NOT NULL,                          -- [{source, target, label}]
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6.3 User progress tables

### user_exam_enrollment

```sql
CREATE TABLE user_exam_enrollment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id VARCHAR(50) NOT NULL REFERENCES exams(id),
    
    exam_date DATE,                                -- User's planned exam date
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Diagnostic results
    diagnostic_completed BOOLEAN DEFAULT FALSE,
    diagnostic_score DECIMAL(5,2),
    diagnostic_completed_at TIMESTAMPTZ,
    
    -- Aggregated progress (denormalized for fast dashboard)
    overall_readiness_pct DECIMAL(5,2) DEFAULT 0,
    domain_readiness JSONB DEFAULT '{}',           -- {"domain-1": 45.2, "domain-2": 67.8}
    pass_probability_pct DECIMAL(5,2),
    concepts_mastered INT DEFAULT 0,
    concepts_total INT DEFAULT 0,
    
    -- Streak
    current_streak_days INT DEFAULT 0,
    longest_streak_days INT DEFAULT 0,
    streak_freezes_remaining INT DEFAULT 1,
    last_active_date DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(user_id, exam_id)
);

CREATE INDEX idx_enrollment_user ON user_exam_enrollment(user_id);
CREATE INDEX idx_enrollment_exam ON user_exam_enrollment(exam_id);
CREATE INDEX idx_enrollment_active ON user_exam_enrollment(user_id, is_active);
```

### user_concept_mastery

```sql
CREATE TABLE user_concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concept_id VARCHAR(100) NOT NULL REFERENCES concepts(id),
    
    -- BKT state
    mastery_probability DECIMAL(5,4) DEFAULT 0.0,  -- P(M), 0.0000 to 1.0000
    mastery_level VARCHAR(20) DEFAULT 'not_started', -- not_started, weak, familiar, proficient, mastered
    
    -- SM-2 spaced repetition state
    easiness_factor DECIMAL(4,2) DEFAULT 2.50,
    interval_days DECIMAL(6,2) DEFAULT 1.00,
    repetition_count INT DEFAULT 0,
    next_review_date DATE,
    last_review_date DATE,
    
    -- Decay tracking
    decay_rate DECIMAL(5,4) DEFAULT 0.0800,
    last_mastery_update_at TIMESTAMPTZ,
    
    -- Performance stats
    total_attempts INT DEFAULT 0,
    correct_attempts INT DEFAULT 0,
    misconception_count INT DEFAULT 0,             -- Times flagged as misconception
    avg_response_time_seconds DECIMAL(6,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, concept_id)
);

CREATE INDEX idx_mastery_user ON user_concept_mastery(user_id);
CREATE INDEX idx_mastery_concept ON user_concept_mastery(concept_id);
CREATE INDEX idx_mastery_review ON user_concept_mastery(user_id, next_review_date);
CREATE INDEX idx_mastery_level ON user_concept_mastery(user_id, mastery_level);
```

### user_answers (partitioned by month)

```sql
CREATE TABLE user_answers (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(50) NOT NULL REFERENCES questions(id),
    session_id UUID REFERENCES study_sessions(id),
    
    selected_option VARCHAR(5) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    response_time_seconds DECIMAL(6,2),
    confidence_rating INT CHECK (confidence_rating BETWEEN 1 AND 3),
    
    -- Mastery impact (snapshot for analytics)
    mastery_before DECIMAL(5,4),
    mastery_after DECIMAL(5,4),
    quality_score INT CHECK (quality_score BETWEEN 0 AND 5),  -- SM-2 quality
    
    -- Flags
    was_misconception BOOLEAN DEFAULT FALSE,
    explanation_viewed BOOLEAN DEFAULT FALSE,
    explanation_source VARCHAR(20),                 -- 'cached', 'ai_generated', NULL
    
    answered_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (answered_at);

-- Create monthly partitions (automate via cron or pg_partman)
CREATE TABLE user_answers_2026_03 PARTITION OF user_answers
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE user_answers_2026_04 PARTITION OF user_answers
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE INDEX idx_answers_user ON user_answers(user_id, answered_at);
CREATE INDEX idx_answers_question ON user_answers(question_id);
CREATE INDEX idx_answers_session ON user_answers(session_id);
```

### study_sessions

```sql
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id VARCHAR(50) NOT NULL REFERENCES exams(id),
    
    session_type VARCHAR(30) NOT NULL,             -- 'daily_briefing', 'focused_15', 'focused_30', 'focused_60', 'smart_review', 'mock_exam'
    
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    
    -- Plan (what was intended)
    plan JSONB,                                    -- {"review_cards": 5, "questions": 8, ...}
    
    -- Results
    questions_answered INT DEFAULT 0,
    questions_correct INT DEFAULT 0,
    review_cards_completed INT DEFAULT 0,
    concepts_explored INT DEFAULT 0,
    
    -- Readiness impact
    readiness_before DECIMAL(5,2),
    readiness_after DECIMAL(5,2),
    
    -- Session quality
    completed BOOLEAN DEFAULT FALSE,               -- Did user finish the planned session?
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON study_sessions(user_id, started_at);
CREATE INDEX idx_sessions_exam ON study_sessions(exam_id);
```

---

## 6.4 Engagement tables

### streak_history

```sql
CREATE TABLE streak_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id VARCHAR(50) NOT NULL REFERENCES exams(id),
    
    streak_date DATE NOT NULL,
    activity_type VARCHAR(30) NOT NULL,            -- 'questions', 'review', 'session'
    activity_count INT DEFAULT 0,
    freeze_used BOOLEAN DEFAULT FALSE,
    
    UNIQUE(user_id, exam_id, streak_date)
);

CREATE INDEX idx_streak_user ON streak_history(user_id, exam_id, streak_date DESC);
```

### notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    channel VARCHAR(10) NOT NULL CHECK (channel IN ('push', 'email', 'sms', 'in_app')),
    notification_type VARCHAR(30) NOT NULL,        -- 'streak_reminder', 'weekly_report', 'reengagement', etc.
    
    title VARCHAR(200),
    body TEXT,
    cta_url TEXT,
    
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'delivered', 'opened', 'clicked', 'failed')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, scheduled_for);
CREATE INDEX idx_notifications_status ON notifications(status, scheduled_for);
```

### explanation_cache

```sql
CREATE TABLE explanation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    cache_key VARCHAR(200) UNIQUE NOT NULL,        -- 'explain:{question_id}:{wrong_option}' or 'personal:{user_id}:{question_id}'
    cache_level VARCHAR(20) NOT NULL,              -- 'generic', 'misconception', 'personalized'
    
    explanation_text TEXT NOT NULL,
    model_used VARCHAR(50),
    input_tokens INT,
    output_tokens INT,
    cost_usd DECIMAL(8,5),
    
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cache_key ON explanation_cache(cache_key);
CREATE INDEX idx_cache_expiry ON explanation_cache(expires_at);
```

---

## 6.5 Analytics tables

### analytics_events (partitioned by day)

```sql
CREATE TABLE analytics_events (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID,
    
    event_type VARCHAR(50) NOT NULL,               -- 'page_view', 'question_answered', 'session_started', etc.
    event_data JSONB DEFAULT '{}',
    
    source VARCHAR(20),                            -- 'web', 'pwa', 'api'
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_events_user ON analytics_events(user_id, created_at);
CREATE INDEX idx_events_type ON analytics_events(event_type, created_at);
```

### weekly_reports (materialized, generated every Sunday)

```sql
CREATE TABLE weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id VARCHAR(50) NOT NULL REFERENCES exams(id),
    
    week_start DATE NOT NULL,
    
    study_minutes INT,
    questions_answered INT,
    accuracy_pct DECIMAL(5,2),
    readiness_score DECIMAL(5,2),
    readiness_delta DECIMAL(5,2),
    streak_days INT,
    concepts_mastered_count INT,
    goals_met INT,
    goals_total INT,
    cohort_percentile INT,
    pass_probability_pct DECIMAL(5,2),
    
    domain_breakdown JSONB,                        -- {"domain-1": {"score": 72, "delta": +3, "questions": 15}}
    
    report_data JSONB,                             -- Full report JSON for rendering
    email_sent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, exam_id, week_start)
);

CREATE INDEX idx_reports_user ON weekly_reports(user_id, week_start DESC);
```

---

## 6.6 Migration strategy

Use Alembic for schema migrations. Key principles:

1. All migrations must be reversible (include downgrade)
2. No destructive migrations without explicit approval
3. Large data migrations run as background tasks, not blocking migrations
4. New columns added as nullable first, then backfilled, then constraint added
5. Partition management automated via pg_partman or scheduled Lambda

### Initial seed data

1. Exam definitions (exams table)
2. Knowledge graph (concepts + concept_edges)
3. Decision trees (decision_trees)
4. Mind maps (mind_maps)
5. Question bank (questions)
6. BKT default parameters per question type

Seed data stored as JSON fixtures in `/data/seed/` and loaded via management command:
```bash
python manage.py seed --exam aws-sap-c02 --data-dir data/seed/aws-sap/
```
