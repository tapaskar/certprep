# CertPrep — AI-Powered Exam Preparation Platform

## Vision
Transform how professionals prepare for tough certification exams by combining curated, exam-specific content with AI-driven personalization and behavioral engagement — delivering a materially higher pass rate than self-study or static prep platforms.

## Product thesis
Static question banks (Tutorials Dojo, Whizlabs) provide content but no adaptivity. Generic AI tutors (ChatGPT) provide adaptivity but no curated, exam-weighted content. CertPrep combines both: a rigorously curated knowledge graph per exam, overlaid with a Bayesian adaptive learning engine that personalizes every session to the individual learner's gaps.

## Target market (launch)
- AWS Solutions Architect Professional (SAP-C02)
- AWS DevOps Engineer Professional (DOP-C02)
- AWS Solutions Architect Associate (SAA-C03)
- Azure Solutions Architect Expert (AZ-305)
- Google Cloud Professional Cloud Architect

## Expansion roadmap
Phase 1 (months 1–4): AWS SA Pro only (build + validate)
Phase 2 (months 5–8): All 5 launch exams
Phase 3 (months 9–12): Kubernetes (CKA/CKAD), Terraform Associate, Azure Administrator
Phase 4 (year 2): Non-tech certs (CFA, PMP, etc.) if model proves transferable

---

## Architecture layers

### Layer 1 — Content foundation (`01-CONTENT-LAYER.md`)
Curated exam knowledge graphs, decision trees, mind maps, and tagged question banks. This is the defensible moat.

### Layer 2 — AI personalization engine (`02-AI-ENGINE.md`)
Bayesian Knowledge Tracing, adaptive path planning, contextual explanations, concept graph propagation, and question selection via multi-armed bandit.

### Layer 3 — Engagement + accountability (`03-ENGAGEMENT-LAYER.md`)
Spaced repetition (modified SM-2), daily/weekly engagement loops, readiness scoring, nudge intelligence, and re-engagement flows.

### Layer 4 — Technical architecture (`04-TECH-STACK.md`)
Next.js frontend, FastAPI backend, PostgreSQL + Redis data layer, Claude API integration, AWS infrastructure, auth, and payments.

### Layer 5 — Monetization + growth (`05-MONETIZATION.md`)
Free/Pro/Team tiers, pricing strategy, referral engine, content marketing funnel, and unit economics.

### Data model (`06-DATA-MODEL.md`)
Complete database schema — users, exams, concepts, questions, user progress, spaced repetition state, sessions, and analytics.

### API specification (`07-API-SPEC.md`)
REST + WebSocket endpoints for the study experience, admin content management, and analytics.

---

## Key metrics

| Metric | Target (Year 1) |
|--------|-----------------|
| Registered users | 5,000 |
| Free → Pro conversion | 8% |
| Monthly churn (Pro) | 5% |
| Pass rate (users who complete 80%+ of plan) | 85% |
| DAU/MAU ratio | 40% |
| Avg session length | 22 min |
| ARR | $140K |

## Build order

### Sprint 1–3 (weeks 1–6): Content + Core
- [ ] AWS SA Pro knowledge graph (domains, topics, concepts, relationships)
- [ ] 250+ tagged questions with detailed explanations
- [ ] Mind map viewer (React Flow)
- [ ] Basic question engine (serve, score, track)
- [ ] User auth (Clerk) + onboarding flow
- [ ] Waitlist landing page

### Sprint 4–6 (weeks 7–12): AI Engine
- [ ] Bayesian Knowledge Tracing per concept
- [ ] Adaptive question selection (multi-armed bandit)
- [ ] Concept graph propagation (prerequisite + lateral)
- [ ] Contextual wrong-answer explanations (Claude API)
- [ ] Readiness score dashboard
- [ ] 15-question diagnostic for cold start

### Sprint 7–9 (weeks 13–18): Engagement
- [ ] Spaced repetition scheduler (modified SM-2)
- [ ] Daily briefing + session composer
- [ ] Streaks, milestones, weekly reports
- [ ] Nudge system (email + push)
- [ ] Exam countdown planner
- [ ] Second exam: AWS DevOps Pro

### Sprint 10–12 (weeks 19–24): Scale
- [ ] Azure + GCP exams
- [ ] Team tier + admin dashboard
- [ ] Mobile PWA
- [ ] Referral program
- [ ] Pass rate analytics + model tuning
