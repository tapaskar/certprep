# Layer 1 — Content Foundation

The content layer is the defensible moat. Anyone can wrap AI around generic questions — but exam-specific, weighted, cross-referenced content authored by certified professionals is hard to replicate and expensive to create.

---

## 1.1 Exam knowledge graph

### Structure
Each exam is modeled as a directed acyclic graph (with lateral edges) of concepts:

```
Exam
 └── Domain (e.g., "Design for Organizational Complexity" — 26% weight)
      └── Topic (e.g., "Multi-account strategies")
           └── Concept (e.g., "AWS Organizations SCPs")
                ├── prerequisite → Concept ("IAM policy evaluation logic")
                ├── lateral → Concept ("AWS Control Tower guardrails")
                └── tagged_questions → [Question, Question, ...]
```

### Concept node schema
```json
{
  "id": "aws-sap-vpc-peering",
  "exam_id": "aws-sap-c02",
  "domain_id": "design-org-complexity",
  "topic_id": "hybrid-connectivity",
  "name": "VPC Peering",
  "description": "Non-transitive networking connection between two VPCs",
  "exam_weight": 0.08,
  "difficulty_tier": 2,
  "prerequisites": ["aws-sap-vpc-fundamentals", "aws-sap-route-tables"],
  "lateral_relations": [
    {"concept_id": "aws-sap-transit-gateway", "transfer_weight": 0.3},
    {"concept_id": "aws-sap-privatelink", "transfer_weight": 0.2}
  ],
  "key_facts": [
    "Non-transitive: if A peers with B and B peers with C, A cannot reach C",
    "Cannot have overlapping CIDR blocks",
    "Cross-region peering supported but with bandwidth considerations",
    "Security groups can reference peered VPC security groups (same region)"
  ],
  "common_misconceptions": [
    "VPC peering is transitive (it is not)",
    "Peering works with overlapping CIDRs (it does not)",
    "Peering automatically updates route tables (manual route entry required)"
  ],
  "aws_services": ["VPC", "Route Tables", "Security Groups"],
  "decision_tree_node_id": "dt-networking-connectivity-choice"
}
```

### Edge types and weights
| Edge type | Direction | Weight range | Meaning |
|-----------|-----------|-------------|---------|
| prerequisite | directed | 1.0 (binary) | Must understand A before B makes sense |
| lateral | bidirectional | 0.1 – 0.4 | Mastering A gives partial insight into B |
| contrasts_with | bidirectional | 0.0 (no transfer) | A and B are easily confused; link for comparison |

### AWS SA Pro — domain breakdown (target concept counts)

| Domain | Weight | Topics | Concepts (target) |
|--------|--------|--------|-------------------|
| Design for organizational complexity | 26% | 8 | 45 |
| Design for new solutions | 29% | 10 | 55 |
| Migration planning | 15% | 6 | 30 |
| Cost control | 12% | 5 | 25 |
| Continuous improvement | 18% | 7 | 35 |
| **Total** | **100%** | **36** | **190** |

---

## 1.2 Decision trees

Decision trees are the "choose the right service" frameworks that map real exam question patterns. They're the most valuable study artifact because they mirror how the exam tests you.

### Structure
Each decision tree covers a common exam decision pattern:

```json
{
  "id": "dt-networking-connectivity",
  "exam_id": "aws-sap-c02",
  "domain_id": "design-org-complexity",
  "title": "Choosing a VPC connectivity method",
  "trigger_pattern": "Connect VPCs / on-premises to AWS",
  "root_node": {
    "question": "How many VPCs need to connect?",
    "options": [
      {
        "label": "2 VPCs",
        "next": {
          "question": "Same region or cross-region?",
          "options": [
            {"label": "Same region", "answer": "VPC Peering", "concept_id": "aws-sap-vpc-peering"},
            {"label": "Cross-region", "answer": "VPC Peering (cross-region) or Transit Gateway", "concept_id": "aws-sap-vpc-peering"}
          ]
        }
      },
      {
        "label": "3+ VPCs (hub-and-spoke)",
        "answer": "Transit Gateway",
        "concept_id": "aws-sap-transit-gateway"
      },
      {
        "label": "VPC to on-premises",
        "next": {
          "question": "Bandwidth and latency requirements?",
          "options": [
            {"label": "Low bandwidth, quick setup", "answer": "Site-to-Site VPN", "concept_id": "aws-sap-site-to-site-vpn"},
            {"label": "High bandwidth, consistent latency", "answer": "Direct Connect", "concept_id": "aws-sap-direct-connect"},
            {"label": "High bandwidth + encryption", "answer": "Direct Connect + VPN", "concept_id": "aws-sap-dx-vpn-combo"}
          ]
        }
      }
    ]
  }
}
```

### Target decision trees per exam

| Category | Examples | Count |
|----------|----------|-------|
| Networking | VPC connectivity, DNS routing, load balancing | 5 |
| Compute | EC2 vs Lambda vs ECS vs Fargate | 4 |
| Storage | S3 tiers, EBS vs EFS vs FSx, backup strategy | 5 |
| Database | RDS vs DynamoDB vs Aurora vs Redshift | 4 |
| Security | Encryption at rest, in transit, key management | 4 |
| Migration | 7 Rs decision, database migration path | 3 |
| Cost | Reserved vs Savings Plans vs Spot | 3 |
| **Total** | | **28** |

---

## 1.3 Mind maps

Mind maps provide the "big picture" view of each domain. They're interactive (built with React Flow) and zoomable. Each node links to its concept detail page and relevant decision trees.

### Mind map node schema
```json
{
  "id": "mm-node-vpc",
  "mind_map_id": "mm-networking",
  "label": "VPC",
  "parent_id": "mm-node-networking-root",
  "concept_id": "aws-sap-vpc-fundamentals",
  "children": ["mm-node-subnets", "mm-node-route-tables", "mm-node-nacls", "mm-node-security-groups"],
  "position": {"x": 400, "y": 200},
  "style": {"color": "#185FA5", "size": "medium"},
  "collapse_by_default": false
}
```

### Per-exam mind map targets
- 1 master mind map (all domains, collapsed by default)
- 1 mind map per domain (expanded, all topics visible)
- Total: ~6–7 mind maps per exam

---

## 1.4 Question bank

### Question schema
```json
{
  "id": "q-sap-net-042",
  "exam_id": "aws-sap-c02",
  "concept_ids": ["aws-sap-transit-gateway", "aws-sap-vpc-peering"],
  "domain_id": "design-org-complexity",
  "type": "scenario",
  "difficulty": 3,
  "irt_discrimination": null,
  "irt_difficulty": null,
  "stem": "A company has 15 VPCs across 3 AWS regions. They need full mesh connectivity with centralized network monitoring. The solution must support inter-region traffic with encryption in transit. Which architecture meets these requirements with the LEAST operational overhead?",
  "options": [
    {
      "id": "A",
      "text": "Create VPC peering connections between all VPCs with VPN overlays for encryption",
      "is_correct": false
    },
    {
      "id": "B",
      "text": "Deploy Transit Gateway in each region with inter-region peering and enable encryption",
      "is_correct": true
    },
    {
      "id": "C",
      "text": "Use AWS PrivateLink endpoints in each VPC connected to a central monitoring VPC",
      "is_correct": false
    },
    {
      "id": "D",
      "text": "Establish Site-to-Site VPN connections from each VPC to a central hub VPC",
      "is_correct": false
    }
  ],
  "correct_answer": "B",
  "explanation": {
    "why_correct": "Transit Gateway supports hub-and-spoke at regional level. Inter-region TGW peering provides cross-region connectivity. TGW supports encryption in transit natively. Centralized monitoring via TGW flow logs and Network Manager.",
    "why_not_A": "15 VPCs = 105 peering connections (n*(n-1)/2). Massive operational overhead. VPC peering doesn't support transitive routing, so full mesh is the only option. VPN overlay adds even more complexity.",
    "why_not_C": "PrivateLink is for service-level access, not VPC-to-VPC connectivity. Cannot provide full mesh networking between VPCs.",
    "why_not_D": "VPN connections to a hub create a single point of failure and don't scale well. VPN throughput is limited to ~1.25 Gbps per connection."
  },
  "related_concepts": ["aws-sap-network-manager", "aws-sap-tgw-flow-logs"],
  "decision_tree_id": "dt-networking-connectivity",
  "tags": ["multi-region", "hub-and-spoke", "encryption", "operational-overhead"],
  "estimated_time_seconds": 120,
  "source": "original",
  "review_status": "approved",
  "created_at": "2026-03-15T00:00:00Z"
}
```

### Question types and targets

| Type | Description | Target per exam | IRT params |
|------|-------------|-----------------|------------|
| Scenario | Multi-paragraph, pick best architecture | 120 | P(guess)=0.05, P(slip)=0.08 |
| Factual | Direct knowledge recall | 80 | P(guess)=0.20, P(slip)=0.15 |
| Comparison | "Which is better: A or B for X?" | 40 | P(guess)=0.10, P(slip)=0.10 |
| Troubleshooting | Given symptoms, identify root cause | 30 | P(guess)=0.08, P(slip)=0.12 |
| **Total per exam** | | **270** | |

### Question quality standards
1. Every question must map to 1–3 concepts in the knowledge graph
2. Every wrong answer must have a specific, educational explanation
3. Scenario questions must be 3+ sentences with realistic constraints
4. No trick questions — the challenge is in understanding, not in ambiguous wording
5. Difficulty calibrated: Level 1 (foundational recall) through Level 5 (complex multi-service scenario)
6. Each concept should have at least 3 questions across different difficulty levels
7. Questions should be reviewed by at least one AWS-certified professional

---

## 1.5 Content creation workflow

### Initial content pipeline
1. Domain expert creates knowledge graph skeleton (domains → topics → concepts)
2. Expert fills concept nodes with key facts, misconceptions, service mappings
3. Expert builds decision trees from common exam question patterns
4. Question writers create questions tagged to concepts
5. Reviewer validates accuracy, difficulty calibration, and explanation quality
6. Questions deployed to staging for IRT parameter estimation via beta users

### Ongoing content maintenance
- AWS service updates → trigger concept review + question updates
- Exam guide changes → restructure knowledge graph weights
- User confusion signals (high wrong-answer rate on specific questions) → flag for review
- IRT parameters recalibrated monthly from accumulated response data

### Content format
All content stored as JSON in PostgreSQL (JSONB columns for flexibility) with full-text search via pg_trgm. Decision trees and mind maps also exported as static JSON for CDN caching and offline access in the PWA.
