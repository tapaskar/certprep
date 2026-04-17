/**
 * Heuristics — battle-tested "always / never / prefer" rules for cert exams.
 * Anti-patterns — explicit design choices you should NEVER pick on an exam.
 */

export type Severity = "always" | "prefer" | "avoid" | "never";

export interface Heuristic {
  id: string;
  title: string;
  severity: Severity;
  certs: string[]; // cert codes — e.g., ["SAA", "SAP"]
  category: string; // "HA/DR", "Security", "Cost", "Performance"
  rule: string; // The rule itself
  reasoning: string; // Why this rule exists
  example?: string; // Concrete example
  antiPattern?: string; // What NOT to do
}

export const heuristics: Heuristic[] = [
  // ── Resilience / HA ─────────────────────────────────────────
  {
    id: "multi-az-always",
    title: "Multi-AZ ALWAYS for HA",
    severity: "always",
    certs: ["SAA", "SAP", "SOA", "DVA"],
    category: "HA/DR",
    rule: "For any production workload requiring high availability, deploy across at least two Availability Zones.",
    reasoning:
      "Single-AZ deployments fail when the AZ fails. Multi-AZ is the cheapest path to HA within a region.",
    example:
      "RDS Multi-AZ, ALB with targets in 2+ AZs, Auto Scaling across AZs",
    antiPattern:
      "Deploying 2 EC2 instances in the same AZ behind a load balancer.",
  },
  {
    id: "stateless-servers",
    title: "Keep app servers stateless",
    severity: "prefer",
    certs: ["SAA", "SAP", "DVA"],
    category: "HA/DR",
    rule: "Store session and state outside compute (ElastiCache, DynamoDB, S3), not on EC2 local disk.",
    reasoning:
      "Stateless servers can scale horizontally and be replaced freely. Local state couples scaling to state loss.",
    example: "Session data in ElastiCache Redis with TTL",
    antiPattern: "Sticky sessions tied to a specific EC2 instance.",
  },
  {
    id: "multi-region-rto",
    title: "Multi-Region only when RTO/RPO requires it",
    severity: "prefer",
    certs: ["SAP", "SAA"],
    category: "HA/DR",
    rule: "Do NOT default to multi-region. Only add it when RPO/RTO requirements cannot be met by multi-AZ.",
    reasoning:
      "Multi-region is 3-10x the cost and complexity of multi-AZ. Most workloads don't need it.",
    example: "RTO of minutes = Route 53 failover to warm standby",
  },
  {
    id: "health-checks-routing",
    title: "Use health checks for routing",
    severity: "always",
    certs: ["SAA", "SOA"],
    category: "HA/DR",
    rule: "Route 53 and ALB should route using health checks, not TTL-only routing.",
    reasoning: "Failover should be automatic and near-instant, not DNS-cached.",
    example: "Route 53 failover routing policy with health checks",
  },

  // ── Security ─────────────────────────────────────────────────
  {
    id: "no-hardcoded-secrets",
    title: "Never hardcode secrets",
    severity: "never",
    certs: ["SAA", "SAP", "DVA", "SCS"],
    category: "Security",
    rule: "Secrets NEVER in code, environment variables, or Git. Use Secrets Manager or Parameter Store.",
    reasoning:
      "Hardcoded secrets = compromised on first leak, rotation impossible, audit trail missing.",
    example: "Secrets Manager with automatic RDS password rotation",
    antiPattern:
      "AWS_SECRET_ACCESS_KEY in Lambda environment variable or .env file in Git.",
  },
  {
    id: "iam-roles-over-keys",
    title: "Prefer IAM roles over access keys",
    severity: "prefer",
    certs: ["SAA", "SAP", "DVA", "SCS"],
    category: "Security",
    rule: "Use IAM roles for AWS service-to-service access. Reserve access keys for external integrations only.",
    reasoning:
      "Roles are auto-rotated by STS. Long-lived access keys are the #1 credential compromise vector.",
    example: "EC2 instance profile with IAM role, NOT access keys on disk",
    antiPattern: "Storing aws_access_key_id in ~/.aws/credentials on EC2.",
  },
  {
    id: "least-privilege",
    title: "Least privilege, always",
    severity: "always",
    certs: ["SAA", "SAP", "SCS"],
    category: "Security",
    rule: "Grant only the permissions required, nothing more. Start restrictive and loosen as needed.",
    reasoning:
      "Over-permissive policies expose the blast radius if credentials leak.",
    antiPattern: '`"Action": "*"` or `"Resource": "*"` in production IAM policies.',
  },
  {
    id: "encryption-everywhere",
    title: "Encrypt at rest and in transit",
    severity: "always",
    certs: ["SAA", "SAP", "SCS"],
    category: "Security",
    rule: "Enable encryption on every data store. Use TLS/SSL for every in-flight connection.",
    reasoning:
      "Compliance (HIPAA, PCI, GDPR) requires it, and it's free with AWS-managed keys.",
    example: "S3 default encryption, RDS encryption, ALB HTTPS listeners only",
  },
  {
    id: "vpc-private-subnets",
    title: "Databases in private subnets only",
    severity: "always",
    certs: ["SAA", "SAP", "SCS"],
    category: "Security",
    rule: "Databases and internal services live in PRIVATE subnets. Only LBs and bastions are in public subnets.",
    reasoning: "Public databases = public attack surface. Period.",
    antiPattern: "RDS instance with a public IP and 0.0.0.0/0 security group.",
  },
  {
    id: "kms-cmk-for-compliance",
    title: "Use Customer-Managed Keys when compliance requires",
    severity: "prefer",
    certs: ["SAP", "SCS"],
    category: "Security",
    rule: "For HIPAA, PCI, or regulated workloads, use CMKs — not AWS-managed keys.",
    reasoning:
      "CMKs give you key rotation control and full CloudTrail auditing. AWS-managed keys are fine otherwise.",
  },

  // ── Cost ─────────────────────────────────────────────────────
  {
    id: "right-sizing-first",
    title: "Right-size before reserving",
    severity: "prefer",
    certs: ["SAA", "SAP", "SOA"],
    category: "Cost",
    rule: "Reserved Instances and Savings Plans only AFTER workloads are right-sized. Don't reserve oversized capacity.",
    reasoning: "Savings Plans compound your oversizing mistakes.",
  },
  {
    id: "spot-for-batch",
    title: "Spot for batch & fault-tolerant",
    severity: "prefer",
    certs: ["SAA", "SAP", "SOA"],
    category: "Cost",
    rule: "Batch, CI/CD, and fault-tolerant workloads = Spot. Stateful databases and user-facing APIs = NOT Spot.",
    reasoning:
      "Spot can save 70-90%. Interruptions are tolerable for batch but deadly for stateful services.",
  },
  {
    id: "s3-lifecycle",
    title: "S3 lifecycle policies from day one",
    severity: "prefer",
    certs: ["SAA", "SAP", "SOA"],
    category: "Cost",
    rule: "Every S3 bucket needs a lifecycle policy: transition cold data to Glacier, delete expired data.",
    reasoning: "Storage costs compound. S3 Standard → Glacier is ~95% cheaper.",
    example:
      "Logs: Standard (30d) → Standard-IA (90d) → Glacier (1yr) → Delete",
  },
  {
    id: "nat-gateway-endpoints",
    title: "Use VPC endpoints instead of NAT Gateway",
    severity: "prefer",
    certs: ["SAA", "SAP", "ANS"],
    category: "Cost",
    rule: "For AWS service traffic from private subnets, use VPC endpoints — NOT NAT Gateway.",
    reasoning:
      "NAT Gateway: $0.045/hr + data charges. Gateway endpoints (S3, DynamoDB) are FREE.",
  },

  // ── Performance ──────────────────────────────────────────────
  {
    id: "cloudfront-for-global",
    title: "CloudFront for global audiences",
    severity: "always",
    certs: ["SAA", "SAP"],
    category: "Performance",
    rule: "Global users → CloudFront in front of origin. Static + dynamic, both benefit.",
    reasoning:
      "Edge caching + persistent HTTPS + DDoS protection (Shield Standard) — all free with CF.",
  },
  {
    id: "elasticache-hot-data",
    title: "ElastiCache for hot data",
    severity: "prefer",
    certs: ["SAA", "SAP", "DVA"],
    category: "Performance",
    rule: "Read-heavy databases (session lookups, product catalog reads) → put ElastiCache in front.",
    reasoning:
      "Sub-ms latency vs 5-10ms RDS. Dramatically reduces DB CPU and cost.",
  },
  {
    id: "dynamodb-scaling",
    title: "DynamoDB: on-demand unless predictable",
    severity: "prefer",
    certs: ["SAA", "SAP", "DVA"],
    category: "Performance",
    rule: "On-demand mode for unknown/bursty traffic. Provisioned + auto-scaling for predictable, high-throughput.",
    reasoning:
      "On-demand = zero tuning, pays for actual usage. Provisioned is cheaper at sustained high TPS.",
  },
  {
    id: "partition-key-design",
    title: "Design DynamoDB partition keys for uniform distribution",
    severity: "always",
    certs: ["DVA", "SAA", "SAP"],
    category: "Performance",
    rule: "High-cardinality, evenly-distributed partition keys. Hot partitions throttle everything.",
    reasoning: "Exam loves this — hot partition = bad design = exam trap.",
    antiPattern: "Using timestamp or status='active' as partition key.",
  },

  // ── Decoupling ───────────────────────────────────────────────
  {
    id: "sqs-for-decoupling",
    title: "SQS between producers and consumers",
    severity: "always",
    certs: ["SAA", "SAP", "DVA"],
    category: "Architecture",
    rule: "Asynchronous processing = SQS queue between them. Don't couple them directly.",
    reasoning:
      "Decoupling absorbs spikes, enables retries, and lets consumers scale independently.",
  },
  {
    id: "fanout-sns-sqs",
    title: "Fan-out = SNS + multiple SQS",
    severity: "prefer",
    certs: ["SAA", "SAP", "DVA"],
    category: "Architecture",
    rule: "One event, N consumers = SNS topic with N SQS subscriptions. Each consumer gets its own queue.",
    reasoning:
      "Each consumer can fail, retry, and scale independently. Much better than SNS-direct-to-Lambda for most cases.",
  },
];

export const antiPatternsOnly = heuristics.filter(
  (h) => h.severity === "never" || h.antiPattern
);

export const heuristicsByCategory = () => {
  const grouped: Record<string, Heuristic[]> = {};
  for (const h of heuristics) {
    if (!grouped[h.category]) grouped[h.category] = [];
    grouped[h.category].push(h);
  }
  return grouped;
};
