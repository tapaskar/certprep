/**
 * Architecture Scenarios — curated "design this system" prompts with a
 * 3D-ish node graph and a guided answer.
 *
 * Each scenario maps to one or more exam domains and shows a reference
 * architecture using IDs from aws-services-data.
 */

export interface ScenarioNode {
  serviceId: string;
  label?: string;
  position: [number, number, number];
}

export interface ScenarioEdge {
  from: string; // serviceId
  to: string;
  label?: string;
}

export interface Scenario {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  certs: string[];
  domains: string[];
  scenario: string; // The prompt
  keyConstraints: string[];
  architecture: {
    nodes: ScenarioNode[];
    edges: ScenarioEdge[];
  };
  solution: {
    title: string;
    steps: string[];
    heuristicsApplied: string[]; // IDs from heuristics-data
  };
  commonTraps: string[];
}

export const scenarios: Scenario[] = [
  {
    id: "3tier-ha",
    title: "3-Tier Web App with HA",
    difficulty: "easy",
    certs: ["SAA"],
    domains: ["HA/DR", "Architecture"],
    scenario:
      "A retail company is migrating its on-prem PHP web app to AWS. They want HA with sub-minute failover, stateless scaling, and MySQL backend. What does the architecture look like?",
    keyConstraints: [
      "Multi-AZ required",
      "Stateless app servers",
      "MySQL database",
      "Auto-scaling based on CPU",
    ],
    architecture: {
      nodes: [
        { serviceId: "route53", position: [0, 3, 0] },
        { serviceId: "cloudfront", position: [0, 2, 0] },
        { serviceId: "alb", position: [0, 1, 0] },
        { serviceId: "ec2", label: "App AZ-1", position: [-2, 0, 0] },
        { serviceId: "ec2", label: "App AZ-2", position: [2, 0, 0] },
        { serviceId: "rds", label: "Primary", position: [-2, -2, 0] },
        { serviceId: "rds", label: "Standby", position: [2, -2, 0] },
        { serviceId: "elasticache", position: [0, -1, 0] },
      ],
      edges: [
        { from: "route53", to: "cloudfront" },
        { from: "cloudfront", to: "alb" },
        { from: "alb", to: "ec2", label: "AZ-1" },
        { from: "alb", to: "ec2", label: "AZ-2" },
        { from: "ec2", to: "elasticache" },
        { from: "ec2", to: "rds" },
        { from: "rds", to: "rds", label: "Sync replication" },
      ],
    },
    solution: {
      title: "Reference Architecture",
      steps: [
        "Route 53 → CloudFront for global edge caching and DDoS protection.",
        "ALB distributes to Auto Scaling Group spanning 2+ AZs.",
        "EC2 instances are stateless — no session on local disk.",
        "ElastiCache (Redis) holds sessions and hot DB query results.",
        "RDS Multi-AZ provides synchronous standby in a different AZ.",
        "CloudWatch alarms → ASG scaling policies on CPU > 70%.",
      ],
      heuristicsApplied: [
        "multi-az-always",
        "stateless-servers",
        "elasticache-hot-data",
        "health-checks-routing",
      ],
    },
    commonTraps: [
      "Single-AZ deployment (kills HA)",
      "Sticky sessions on ALB (couples user to instance)",
      "RDS without Multi-AZ (can't survive AZ failure)",
      "Skipping CloudFront for a 'simple' app (misses free DDoS + TLS)",
    ],
  },
  {
    id: "serverless-api",
    title: "Serverless REST API — Pay Per Use",
    difficulty: "easy",
    certs: ["SAA", "DVA"],
    domains: ["Architecture", "Cost"],
    scenario:
      "A startup wants a REST API that costs $0 when idle and scales to thousands of requests/sec without ops overhead. They have JSON documents as core data and need sub-50ms reads.",
    keyConstraints: [
      "Serverless — no servers to manage",
      "Pay-per-request pricing",
      "JSON document storage",
      "Sub-50ms read latency",
    ],
    architecture: {
      nodes: [
        { serviceId: "route53", position: [0, 3, 0] },
        { serviceId: "cloudfront", position: [0, 2, 0] },
        { serviceId: "apigateway", position: [0, 1, 0] },
        { serviceId: "lambda", label: "GET /items", position: [-2, 0, 0] },
        { serviceId: "lambda", label: "POST /items", position: [2, 0, 0] },
        { serviceId: "dynamodb", position: [0, -2, 0] },
        { serviceId: "s3", label: "Static assets", position: [-3, 2, 0] },
      ],
      edges: [
        { from: "route53", to: "cloudfront" },
        { from: "cloudfront", to: "apigateway" },
        { from: "cloudfront", to: "s3" },
        { from: "apigateway", to: "lambda", label: "GET" },
        { from: "apigateway", to: "lambda", label: "POST" },
        { from: "lambda", to: "dynamodb" },
      ],
    },
    solution: {
      title: "Fully Serverless Reference",
      steps: [
        "Route 53 → CloudFront → API Gateway for the API.",
        "CloudFront also serves static assets directly from S3.",
        "Lambda functions per route (better security and scaling).",
        "DynamoDB on-demand mode = zero capacity planning, pay per request.",
        "DAX (DynamoDB Accelerator) if you need sub-5ms reads at scale.",
        "CloudWatch Logs for observability; X-Ray for tracing.",
      ],
      heuristicsApplied: [
        "dynamodb-scaling",
        "partition-key-design",
        "no-hardcoded-secrets",
      ],
    },
    commonTraps: [
      "Provisioned DynamoDB for unknown traffic (overpay or throttle)",
      "Status-based partition key (hot partition)",
      "API Gateway authentication in Lambda code instead of authorizers",
    ],
  },
  {
    id: "multi-region-dr",
    title: "Multi-Region Active-Passive DR",
    difficulty: "hard",
    certs: ["SAP"],
    domains: ["HA/DR"],
    scenario:
      "A healthcare company has a 5-minute RTO and 1-minute RPO for their core application. They run in us-east-1 today. Design the DR architecture.",
    keyConstraints: [
      "RTO: 5 minutes",
      "RPO: 1 minute",
      "Regulated (HIPAA)",
      "Must survive entire region failure",
    ],
    architecture: {
      nodes: [
        { serviceId: "route53", position: [0, 3, 0] },
        { serviceId: "alb", label: "us-east-1", position: [-3, 1, 0] },
        { serviceId: "alb", label: "us-west-2", position: [3, 1, 0] },
        { serviceId: "ec2", label: "Active", position: [-3, 0, 0] },
        { serviceId: "ec2", label: "Warm", position: [3, 0, 0] },
        { serviceId: "aurora", label: "Primary", position: [-3, -1, 0] },
        { serviceId: "aurora", label: "Global replica", position: [3, -1, 0] },
        { serviceId: "s3", label: "CRR bucket", position: [0, -2, 0] },
        { serviceId: "kms", position: [0, 4, 0] },
      ],
      edges: [
        { from: "route53", to: "alb", label: "Primary → us-east-1" },
        { from: "route53", to: "alb", label: "Failover → us-west-2" },
        { from: "alb", to: "ec2", label: "us-east-1" },
        { from: "alb", to: "ec2", label: "us-west-2" },
        { from: "ec2", to: "aurora" },
        { from: "aurora", to: "aurora", label: "Global DB (~1s lag)" },
        { from: "s3", to: "s3", label: "Cross-Region Replication" },
      ],
    },
    solution: {
      title: "Warm Standby with Aurora Global Database",
      steps: [
        "Aurora Global Database: writes in us-east-1, replicated to us-west-2 in under 1 second (meets RPO).",
        "Route 53 failover routing with health checks on the primary ALB.",
        "us-west-2 runs a scaled-down 'warm' copy: minimal EC2 instances, pre-provisioned.",
        "On failure: Route 53 fails over, ASG scales us-west-2 up, Aurora promotes the replica.",
        "S3 Cross-Region Replication for static assets and backups.",
        "KMS multi-region keys for encrypted data across regions.",
        "CloudFormation StackSets to keep both regions in config sync.",
      ],
      heuristicsApplied: [
        "multi-region-rto",
        "health-checks-routing",
        "kms-cmk-for-compliance",
        "encryption-everywhere",
      ],
    },
    commonTraps: [
      "Pilot-light (cold standby) — can't meet 5-min RTO",
      "Cross-Region Read Replica (not Global DB) — too slow, no fast failover",
      "Single KMS key region (encrypted data unusable in DR region)",
      "Letting Route 53 default TTL (300s) block failover",
    ],
  },
  {
    id: "streaming-analytics",
    title: "Real-Time Clickstream Analytics",
    difficulty: "medium",
    certs: ["SAP", "DEA"],
    domains: ["Architecture", "Analytics"],
    scenario:
      "An e-commerce site needs to ingest 100K clicks/sec, enrich each event with user context, and feed both a real-time dashboard (5-second latency) and a daily warehouse for BI.",
    keyConstraints: [
      "100K events/sec ingest",
      "Real-time dashboard (<5s latency)",
      "Daily batch to warehouse",
      "Store raw events for 1 year",
    ],
    architecture: {
      nodes: [
        { serviceId: "kinesis", label: "Raw stream", position: [-3, 1, 0] },
        { serviceId: "lambda", label: "Enricher", position: [0, 1, 0] },
        { serviceId: "kinesis", label: "Enriched stream", position: [3, 1, 0] },
        { serviceId: "dynamodb", label: "User context", position: [0, 2, 0] },
        { serviceId: "s3", label: "Raw (1yr lifecycle)", position: [3, -1, 0] },
        { serviceId: "redshift", position: [0, -2, 0] },
        { serviceId: "lambda", label: "Dashboard agg", position: [-3, -1, 0] },
      ],
      edges: [
        { from: "kinesis", to: "lambda", label: "Triggers" },
        { from: "lambda", to: "dynamodb", label: "Lookup" },
        { from: "lambda", to: "kinesis", label: "Write enriched" },
        { from: "kinesis", to: "s3", label: "Firehose" },
        { from: "s3", to: "redshift", label: "Nightly COPY" },
        { from: "kinesis", to: "lambda", label: "Dashboard" },
      ],
    },
    solution: {
      title: "Lambda Architecture with Kinesis",
      steps: [
        "Kinesis Data Streams ingests raw events (100K/sec = ~100 shards).",
        "Lambda consumer enriches each event by looking up DynamoDB for user context.",
        "Enriched events go to a second Kinesis stream for fan-out.",
        "Kinesis Data Firehose writes raw events to S3 with partitioning by date.",
        "S3 lifecycle: Standard (30d) → Standard-IA (90d) → Glacier.",
        "Another Lambda aggregates from enriched stream to a DynamoDB dashboard table.",
        "Nightly: AWS Glue/Redshift COPY from S3 to Redshift for BI.",
      ],
      heuristicsApplied: [
        "s3-lifecycle",
        "partition-key-design",
        "dynamodb-scaling",
      ],
    },
    commonTraps: [
      "Using SQS instead of Kinesis (loses ordering + replay)",
      "Direct DB writes from each event (throttles the DB)",
      "Not partitioning S3 by date (expensive to query later)",
    ],
  },
  {
    id: "secure-multi-tenant",
    title: "Multi-Tenant SaaS — Tenant Isolation",
    difficulty: "hard",
    certs: ["SAP", "SCS"],
    domains: ["Security", "Architecture"],
    scenario:
      "A healthcare SaaS serves 500+ clinics. Each clinic's data must be fully isolated; a data leak between tenants would trigger HIPAA liability. Design the isolation model.",
    keyConstraints: [
      "Strict tenant isolation",
      "500+ tenants (cost-efficient)",
      "HIPAA compliance",
      "Some tenants have VPC peering requirements",
    ],
    architecture: {
      nodes: [
        { serviceId: "cloudfront", position: [0, 3, 0] },
        { serviceId: "waf", position: [0, 2, 0] },
        { serviceId: "apigateway", position: [0, 1, 0] },
        { serviceId: "iam", label: "STS AssumeRole", position: [-3, 1, 0] },
        { serviceId: "lambda", label: "Per-tenant scoped", position: [0, 0, 0] },
        { serviceId: "dynamodb", label: "Row-level isolation", position: [3, 0, 0] },
        { serviceId: "s3", label: "Per-tenant prefix", position: [-3, -1, 0] },
        { serviceId: "kms", label: "Per-tenant CMK", position: [3, -1, 0] },
      ],
      edges: [
        { from: "cloudfront", to: "waf" },
        { from: "waf", to: "apigateway" },
        { from: "apigateway", to: "lambda" },
        { from: "lambda", to: "iam", label: "Scoped role" },
        { from: "lambda", to: "dynamodb", label: "LeadingKey=tenantId" },
        { from: "lambda", to: "s3", label: "prefix=tenantId/" },
        { from: "lambda", to: "kms", label: "Tenant key" },
      ],
    },
    solution: {
      title: "Silo-Pool Hybrid with IAM Scoping",
      steps: [
        "Shared infra (Lambda, DynamoDB, S3) with IAM condition keys scoped to tenantId.",
        "DynamoDB: partition key starts with tenantId; IAM policy uses `dynamodb:LeadingKeys`.",
        "S3: per-tenant prefix (`s3://bucket/tenant-123/...`) with IAM `Resource` scoping.",
        "KMS: per-tenant Customer-Managed Keys — granular audit and revocation.",
        "API Gateway + Lambda authorizer verifies JWT and injects tenantId into context.",
        "Lambda assumes a tenant-scoped role via STS before touching data.",
        "Premium tenants (needing VPC peering) get a dedicated silo deployment.",
      ],
      heuristicsApplied: [
        "least-privilege",
        "encryption-everywhere",
        "kms-cmk-for-compliance",
        "iam-roles-over-keys",
      ],
    },
    commonTraps: [
      "Trusting Lambda code to filter by tenantId (one bug = full data leak)",
      "Single KMS key for all tenants (can't revoke one tenant's access)",
      "Database-per-tenant for 500 tenants (RDS sprawl, unaffordable)",
      "Shared S3 bucket without prefix-scoped IAM (cross-tenant read risk)",
    ],
  },
  {
    id: "cost-opt-dev-env",
    title: "Cost-Optimize Dev/Test Environments",
    difficulty: "easy",
    certs: ["SAA", "SAP", "SOA"],
    domains: ["Cost"],
    scenario:
      "An engineering team has 15 dev environments running 24/7, costing $4K/month. They're only actively used during business hours (9-5, Mon-Fri). Cut the cost.",
    keyConstraints: [
      "Dev envs only used 9-5 Mon-Fri (~25% of week)",
      "Must be quick to start up when needed",
      "Data shouldn't be lost",
    ],
    architecture: {
      nodes: [
        { serviceId: "lambda", label: "Scheduler", position: [0, 2, 0] },
        { serviceId: "eventbridge", label: "Cron", position: [-2, 2, 0] },
        { serviceId: "ec2", label: "Dev EC2 (stopped)", position: [0, 0, 0] },
        { serviceId: "rds", label: "Snapshot on stop", position: [2, 0, 0] },
        { serviceId: "s3", label: "State/backups", position: [-2, 0, 0] },
      ],
      edges: [
        { from: "eventbridge", to: "lambda", label: "7pm daily" },
        { from: "eventbridge", to: "lambda", label: "8am weekday" },
        { from: "lambda", to: "ec2", label: "Start/Stop" },
        { from: "lambda", to: "rds", label: "Start/Stop" },
      ],
    },
    solution: {
      title: "Scheduled Start/Stop + Spot for Batch",
      steps: [
        "EventBridge cron: at 7pm, trigger Lambda to stop EC2 + RDS.",
        "EventBridge cron: at 8am weekdays, trigger Lambda to start them.",
        "Tag resources with 'Environment=dev' — Lambda only affects tagged instances.",
        "Expected saving: ~70% of compute cost (running 40/168 hours).",
        "Convert stateless tier to Fargate Spot for additional 70% savings.",
        "Use Budgets + SNS to alert if monthly cost spikes.",
      ],
      heuristicsApplied: ["right-sizing-first", "spot-for-batch"],
    },
    commonTraps: [
      "Leaving RDS running (can't stop via instance_state API without config)",
      "Not tagging resources (scheduler affects prod)",
      "Reserved Instances for dev (commits to 24/7)",
    ],
  },
  {
    id: "decoupled-image-processing",
    title: "Decoupled Image Processing Pipeline",
    difficulty: "medium",
    certs: ["SAA", "DVA"],
    domains: ["Architecture"],
    scenario:
      "Users upload photos to your site. Each photo needs: thumbnail generation, content moderation, EXIF extraction, and ML tagging. Upload must return in under 1 second.",
    keyConstraints: [
      "Upload API response < 1s",
      "4 independent processing steps per photo",
      "Handle spikes (marketing campaigns = 10x load)",
      "Failed steps must retry",
    ],
    architecture: {
      nodes: [
        { serviceId: "apigateway", position: [0, 3, 0] },
        { serviceId: "s3", label: "Upload bucket", position: [0, 2, 0] },
        { serviceId: "sns", label: "photo-uploaded", position: [0, 1, 0] },
        { serviceId: "sqs", label: "thumbnail Q", position: [-3, 0, 0] },
        { serviceId: "sqs", label: "moderation Q", position: [-1, 0, 0] },
        { serviceId: "sqs", label: "exif Q", position: [1, 0, 0] },
        { serviceId: "sqs", label: "ml-tag Q", position: [3, 0, 0] },
        { serviceId: "lambda", label: "Thumb", position: [-3, -1, 0] },
        { serviceId: "lambda", label: "Moderator", position: [-1, -1, 0] },
        { serviceId: "lambda", label: "EXIF", position: [1, -1, 0] },
        { serviceId: "lambda", label: "ML Tagger", position: [3, -1, 0] },
      ],
      edges: [
        { from: "apigateway", to: "s3", label: "Presigned URL" },
        { from: "s3", to: "sns", label: "ObjectCreated" },
        { from: "sns", to: "sqs", label: "Fanout" },
        { from: "sqs", to: "lambda" },
      ],
    },
    solution: {
      title: "SNS Fan-out to 4 SQS Queues",
      steps: [
        "API Gateway returns a pre-signed S3 URL (upload response < 1s).",
        "Client uploads directly to S3 — server never sees the bytes.",
        "S3 ObjectCreated event → SNS topic.",
        "SNS fans out to 4 SQS queues (one per processing step).",
        "Each Lambda consumer scales independently, retries on failure, writes to DLQ after 3 attempts.",
        "Spikes: each queue absorbs the burst; Lambdas scale 0→1000 concurrency.",
        "Results aggregated in DynamoDB keyed by photo ID.",
      ],
      heuristicsApplied: ["fanout-sns-sqs", "sqs-for-decoupling"],
    },
    commonTraps: [
      "S3 → Lambda direct (no retry semantics, no DLQ)",
      "Synchronous processing in the upload API (breaks <1s latency)",
      "One queue for all 4 steps (can't scale or fail independently)",
    ],
  },
  {
    id: "hybrid-direct-connect",
    title: "Hybrid — Connect On-Prem DC to AWS",
    difficulty: "hard",
    certs: ["SAP", "ANS"],
    domains: ["Network"],
    scenario:
      "A bank needs to connect its on-prem data center (in Mumbai) to AWS ap-south-1 with dedicated bandwidth, low latency, encrypted traffic, and HA across two physical paths.",
    keyConstraints: [
      "Dedicated bandwidth (1 Gbps)",
      "Low, predictable latency",
      "HA — no single point of failure",
      "Encryption in transit",
    ],
    architecture: {
      nodes: [
        { serviceId: "vpc", position: [0, 0, 0] },
        { serviceId: "route53", position: [0, 2, 0] },
      ],
      edges: [],
    },
    solution: {
      title: "Direct Connect + VPN Backup",
      steps: [
        "Primary: Direct Connect 1 Gbps dedicated circuit, Mumbai DC → AWS Direct Connect location.",
        "Secondary: Second Direct Connect at a different DC location (redundant provider).",
        "Backup backup: Site-to-Site VPN as a tertiary path (uses public internet).",
        "Direct Connect Gateway + Transit Gateway for multi-VPC/multi-region reach.",
        "MACsec or IPsec over DX for encryption in transit.",
        "BGP for dynamic routing — failover is automatic.",
      ],
      heuristicsApplied: ["encryption-everywhere"],
    },
    commonTraps: [
      "Single DX circuit (not HA)",
      "Only VPN, no DX (bandwidth/latency unreliable for bank)",
      "DX without Transit Gateway (VPC-to-VPC doesn't scale)",
    ],
  },
];

export const getScenario = (id: string) => scenarios.find((s) => s.id === id);

export const scenariosByCert = (cert: string) =>
  scenarios.filter((s) => s.certs.includes(cert));

export const scenariosByDifficulty = (diff: Scenario["difficulty"]) =>
  scenarios.filter((s) => s.difficulty === diff);
