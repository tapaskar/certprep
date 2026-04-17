/**
 * Architecture Scenarios — curated "design this system" prompts with a
 * 3D node graph and a guided answer.
 *
 * Each node has a unique `id` (within the scenario). Edges reference these
 * IDs — this lets you place multiple instances of the same service (e.g.
 * 2 EC2 nodes for AZ-1 and AZ-2) and wire them independently.
 */

export interface ScenarioNode {
  id: string; // UNIQUE within scenario; used by edges
  serviceId: string; // Reference to the AWS service (color/icon/shape lookup)
  label?: string; // Optional override for the displayed label
  position: [number, number, number];
}

export interface ScenarioEdge {
  from: string; // node id
  to: string; // node id
  label?: string;
}

export interface Scenario {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  certs: string[];
  domains: string[];
  scenario: string;
  keyConstraints: string[];
  architecture: {
    nodes: ScenarioNode[];
    edges: ScenarioEdge[];
  };
  solution: {
    title: string;
    steps: string[];
    heuristicsApplied: string[];
  };
  commonTraps: string[];
}

export const scenarios: Scenario[] = [
  // ════════════════════════════════════════════════════════════════
  // 1. 3-Tier Web App with HA
  // ════════════════════════════════════════════════════════════════
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
      "MySQL database (RDS)",
      "Auto-scaling based on CPU",
    ],
    architecture: {
      nodes: [
        { id: "dns", serviceId: "route53", position: [0, 3, 0] },
        { id: "cdn", serviceId: "cloudfront", position: [0, 1.8, 0] },
        { id: "lb", serviceId: "alb", label: "ALB (public subnets)", position: [0, 0.5, 0] },
        { id: "app1", serviceId: "ec2", label: "App AZ-1a", position: [-2.5, -0.8, 0] },
        { id: "app2", serviceId: "ec2", label: "App AZ-1b", position: [2.5, -0.8, 0] },
        { id: "cache", serviceId: "elasticache", label: "Redis (sessions)", position: [0, -0.8, 1.5] },
        { id: "db", serviceId: "rds", label: "RDS MySQL Multi-AZ", position: [0, -2.5, 0] },
        { id: "assets", serviceId: "s3", label: "Static assets", position: [-3.5, 1.8, 0] },
      ],
      edges: [
        { from: "dns", to: "cdn", label: "ALIAS" },
        { from: "cdn", to: "lb", label: "Origin" },
        { from: "cdn", to: "assets", label: "Static cache" },
        { from: "lb", to: "app1", label: "Health-checked" },
        { from: "lb", to: "app2", label: "Health-checked" },
        { from: "app1", to: "cache", label: "Sessions" },
        { from: "app2", to: "cache", label: "Sessions" },
        { from: "app1", to: "db", label: "Read/write" },
        { from: "app2", to: "db", label: "Read/write" },
      ],
    },
    solution: {
      title: "Reference Architecture",
      steps: [
        "Route 53 ALIAS → CloudFront for global edge caching, free TLS, and Shield Standard DDoS protection.",
        "ALB in public subnets across two AZs distributes traffic to EC2 in private subnets.",
        "Auto Scaling Group spans both AZs; instances are stateless (sessions in ElastiCache).",
        "ElastiCache (Redis) for session store and hot DB query results.",
        "RDS MySQL with Multi-AZ enabled — synchronous replica in second AZ, automatic failover (~60s).",
        "Static assets served from S3 directly via CloudFront (offloads app servers).",
        "CloudWatch alarms → ASG scaling policies on CPU > 70%.",
      ],
      heuristicsApplied: [
        "multi-az-always",
        "stateless-servers",
        "elasticache-hot-data",
        "health-checks-routing",
        "vpc-private-subnets",
      ],
    },
    commonTraps: [
      "Single-AZ deployment (kills HA on AZ failure)",
      "Sticky sessions on ALB (couples user to instance, breaks scaling)",
      "RDS without Multi-AZ (cannot survive AZ failure, no automatic failover)",
      "Skipping CloudFront for a 'simple' app (misses free DDoS + TLS termination)",
      "EC2 in public subnets (unnecessary attack surface)",
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 2. Serverless REST API
  // ════════════════════════════════════════════════════════════════
  {
    id: "serverless-api",
    title: "Serverless REST API — Pay Per Use",
    difficulty: "easy",
    certs: ["SAA", "DVA"],
    domains: ["Architecture", "Cost"],
    scenario:
      "A startup wants a REST API that costs $0 when idle and scales to thousands of requests/sec without ops overhead. They store JSON documents and need sub-50ms reads.",
    keyConstraints: [
      "Serverless — no servers to manage",
      "Pay-per-request pricing",
      "JSON document storage",
      "Sub-50ms read latency",
    ],
    architecture: {
      nodes: [
        { id: "dns", serviceId: "route53", position: [0, 3, 0] },
        { id: "cdn", serviceId: "cloudfront", position: [0, 1.8, 0] },
        { id: "assets", serviceId: "s3", label: "Static SPA assets", position: [-3.5, 1.8, 0] },
        { id: "api", serviceId: "apigateway", label: "REST API", position: [0, 0.5, 0] },
        { id: "fn-get", serviceId: "lambda", label: "GET /items", position: [-2.5, -0.8, 0] },
        { id: "fn-post", serviceId: "lambda", label: "POST /items", position: [2.5, -0.8, 0] },
        { id: "table", serviceId: "dynamodb", label: "Items table", position: [0, -2.5, 0] },
      ],
      edges: [
        { from: "dns", to: "cdn", label: "ALIAS" },
        { from: "cdn", to: "assets", label: "/static/*" },
        { from: "cdn", to: "api", label: "/api/*" },
        { from: "api", to: "fn-get", label: "GET" },
        { from: "api", to: "fn-post", label: "POST" },
        { from: "fn-get", to: "table", label: "Query" },
        { from: "fn-post", to: "table", label: "PutItem" },
      ],
    },
    solution: {
      title: "Fully Serverless Reference",
      steps: [
        "Route 53 → CloudFront with two origins: S3 for static SPA, API Gateway for /api/*.",
        "Lambda function per route (better security boundaries and per-route metrics).",
        "DynamoDB on-demand mode = zero capacity planning, pays per request.",
        "Add DAX in front of DynamoDB if you need sub-5ms reads at scale.",
        "Use a Lambda authorizer or Cognito authorizer at API Gateway — not in Lambda code.",
        "CloudWatch Logs for each Lambda; X-Ray for end-to-end tracing.",
      ],
      heuristicsApplied: [
        "dynamodb-scaling",
        "partition-key-design",
        "no-hardcoded-secrets",
      ],
    },
    commonTraps: [
      "Provisioned DynamoDB capacity for unknown traffic (overpay or throttle on bursts)",
      "Status-based partition key like `status='active'` (creates a hot partition)",
      "Authentication in Lambda code instead of API Gateway authorizers (auth runs per cold start)",
      "Connecting Lambda to RDS without RDS Proxy (connection-pool exhaustion)",
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 3. Multi-Region Active-Passive DR
  // ════════════════════════════════════════════════════════════════
  {
    id: "multi-region-dr",
    title: "Multi-Region Active-Passive DR",
    difficulty: "hard",
    certs: ["SAP"],
    domains: ["HA/DR"],
    scenario:
      "A healthcare company has a 5-minute RTO and 1-minute RPO for their core application. They run in us-east-1 today. Design the DR architecture for region failure.",
    keyConstraints: [
      "RTO: 5 minutes",
      "RPO: 1 minute",
      "Regulated (HIPAA) — encryption mandatory",
      "Must survive entire region failure",
    ],
    architecture: {
      nodes: [
        { id: "dns", serviceId: "route53", label: "Failover routing + health checks", position: [0, 3, 0] },
        // us-east-1 (active)
        { id: "alb-east", serviceId: "alb", label: "ALB us-east-1", position: [-3, 1, 0] },
        { id: "asg-east", serviceId: "ec2", label: "ASG (active)", position: [-3, -0.5, 0] },
        { id: "aurora-east", serviceId: "aurora", label: "Aurora primary (us-east-1)", position: [-3, -2, 0] },
        { id: "s3-east", serviceId: "s3", label: "Bucket us-east-1", position: [-3, -3.3, 0] },
        // us-west-2 (warm standby)
        { id: "alb-west", serviceId: "alb", label: "ALB us-west-2", position: [3, 1, 0] },
        { id: "asg-west", serviceId: "ec2", label: "ASG (warm, scaled down)", position: [3, -0.5, 0] },
        { id: "aurora-west", serviceId: "aurora", label: "Aurora replica (us-west-2)", position: [3, -2, 0] },
        { id: "s3-west", serviceId: "s3", label: "Bucket us-west-2", position: [3, -3.3, 0] },
        // shared/global
        { id: "kms", serviceId: "kms", label: "Multi-Region CMK", position: [0, 1, 2] },
      ],
      edges: [
        { from: "dns", to: "alb-east", label: "Primary" },
        { from: "dns", to: "alb-west", label: "Failover" },
        { from: "alb-east", to: "asg-east" },
        { from: "alb-west", to: "asg-west" },
        { from: "asg-east", to: "aurora-east", label: "Read/write" },
        { from: "asg-west", to: "aurora-west", label: "Read-only (until promoted)" },
        { from: "aurora-east", to: "aurora-west", label: "Aurora Global ~1s lag" },
        { from: "s3-east", to: "s3-west", label: "Cross-Region Replication" },
        { from: "kms", to: "aurora-east", label: "Encrypt" },
        { from: "kms", to: "aurora-west", label: "Encrypt" },
        { from: "kms", to: "s3-east", label: "Encrypt" },
        { from: "kms", to: "s3-west", label: "Encrypt" },
      ],
    },
    solution: {
      title: "Warm Standby with Aurora Global Database",
      steps: [
        "Aurora Global Database: writes in us-east-1, replicated to us-west-2 in under 1 second (meets RPO).",
        "Route 53 failover routing with health checks on the primary ALB.",
        "us-west-2 runs a 'warm' copy: minimal EC2 instances pre-provisioned (faster than pilot-light).",
        "On region failure: Route 53 fails over (~30-60s), ASG scales us-west-2 up, Aurora promotes the secondary region → total RTO under 5 min.",
        "S3 Cross-Region Replication keeps static assets and backups in both regions.",
        "KMS multi-region keys so the same key ID encrypts/decrypts data in both regions.",
        "CloudFormation StackSets keep both regions in config sync (drift = silent DR failure).",
      ],
      heuristicsApplied: [
        "multi-region-rto",
        "health-checks-routing",
        "kms-cmk-for-compliance",
        "encryption-everywhere",
      ],
    },
    commonTraps: [
      "Pilot-light (cold standby) — can't meet 5-min RTO; warming up takes 10+ min",
      "Cross-Region Read Replica instead of Aurora Global — no fast failover, async replication can lag minutes",
      "Single-region KMS key — encrypted data in DR region is unusable",
      "Letting Route 53 default TTL (300s) cache stale answers and block failover",
      "Manual ASG scale-up — automate it via Lambda triggered by Route 53 health-check alarm",
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 4. Real-Time Clickstream Analytics
  // ════════════════════════════════════════════════════════════════
  {
    id: "streaming-analytics",
    title: "Real-Time Clickstream Analytics",
    difficulty: "medium",
    certs: ["SAP", "DEA"],
    domains: ["Architecture", "Analytics"],
    scenario:
      "An e-commerce site needs to ingest 100K clicks/sec, enrich each event with user context, feed both a real-time dashboard (5-second latency) and a daily warehouse for BI.",
    keyConstraints: [
      "100K events/sec ingest",
      "Real-time dashboard (<5s latency)",
      "Daily batch to warehouse",
      "Store raw events for 1 year",
    ],
    architecture: {
      nodes: [
        { id: "raw-stream", serviceId: "kinesis", label: "Raw stream (~100 shards)", position: [-4, 1.5, 0] },
        { id: "enricher", serviceId: "lambda", label: "Enricher", position: [-1.5, 1.5, 0] },
        { id: "users", serviceId: "dynamodb", label: "User context table", position: [-1.5, 3, 0] },
        { id: "enriched-stream", serviceId: "kinesis", label: "Enriched stream", position: [1.5, 1.5, 0] },
        { id: "dashboard-fn", serviceId: "lambda", label: "Dashboard aggregator", position: [4, 1.5, 0] },
        { id: "dashboard-table", serviceId: "dynamodb", label: "Dashboard table", position: [4, 3, 0] },
        { id: "firehose", serviceId: "kinesis", label: "Kinesis Firehose", position: [-4, -0.5, 0] },
        { id: "raw-s3", serviceId: "s3", label: "Raw events (1yr lifecycle)", position: [-1.5, -1.5, 0] },
        { id: "warehouse", serviceId: "redshift", label: "Redshift warehouse", position: [2, -1.5, 0] },
      ],
      edges: [
        { from: "raw-stream", to: "enricher", label: "Trigger" },
        { from: "enricher", to: "users", label: "Lookup" },
        { from: "enricher", to: "enriched-stream", label: "Write enriched" },
        { from: "enriched-stream", to: "dashboard-fn", label: "Trigger" },
        { from: "dashboard-fn", to: "dashboard-table", label: "Aggregate" },
        { from: "raw-stream", to: "firehose", label: "Tee" },
        { from: "firehose", to: "raw-s3", label: "Buffer + write" },
        { from: "raw-s3", to: "warehouse", label: "Nightly COPY" },
      ],
    },
    solution: {
      title: "Lambda Architecture with Kinesis",
      steps: [
        "Kinesis Data Streams ingests raw events (100K/sec ≈ 100 shards at 1MB/sec each).",
        "Lambda consumer enriches each batch by looking up DynamoDB for user context.",
        "Enriched events go to a second Kinesis stream — separates concerns and enables fan-out.",
        "Kinesis Data Firehose tees raw events to S3, partitioned by date (year=/month=/day=).",
        "S3 lifecycle: Standard (30d) → Standard-IA (90d) → Glacier (until 1yr expiry).",
        "Dashboard Lambda aggregates from enriched stream into a low-latency DynamoDB table.",
        "Nightly: AWS Glue or Redshift COPY pulls partitioned S3 data into Redshift for BI.",
      ],
      heuristicsApplied: [
        "s3-lifecycle",
        "partition-key-design",
        "dynamodb-scaling",
      ],
    },
    commonTraps: [
      "Using SQS instead of Kinesis (loses ordering, no replay, can't fan out to multiple consumers)",
      "Writing each event directly to DynamoDB or RDS (throttles the database under burst)",
      "Not partitioning S3 by date (Athena/Redshift queries scan terabytes unnecessarily)",
      "Sizing shards based on average traffic — peak hour matters, not average",
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 5. Multi-Tenant SaaS — Tenant Isolation
  // ════════════════════════════════════════════════════════════════
  {
    id: "secure-multi-tenant",
    title: "Multi-Tenant SaaS — Tenant Isolation",
    difficulty: "hard",
    certs: ["SAP", "SCS"],
    domains: ["Security", "Architecture"],
    scenario:
      "A healthcare SaaS serves 500+ clinics. Each clinic's data must be fully isolated; a data leak between tenants would trigger HIPAA liability. Design the isolation model that's still cost-efficient.",
    keyConstraints: [
      "Strict tenant isolation (HIPAA)",
      "500+ tenants — must be cost-efficient",
      "Per-tenant key revocation required",
      "Premium tenants may need dedicated infrastructure",
    ],
    architecture: {
      nodes: [
        { id: "cdn", serviceId: "cloudfront", position: [0, 3, 0] },
        { id: "waf", serviceId: "waf", label: "WAF (rate limit + OWASP)", position: [0, 2, 0] },
        { id: "api", serviceId: "apigateway", label: "API + JWT authorizer", position: [0, 1, 0] },
        { id: "fn", serviceId: "lambda", label: "Pool tier (shared)", position: [0, -0.3, 0] },
        { id: "iam", serviceId: "iam", label: "STS AssumeRole (tenant-scoped)", position: [-3, -0.3, 0] },
        { id: "ddb", serviceId: "dynamodb", label: "PK = tenantId#... (LeadingKeys)", position: [3, -0.3, 0] },
        { id: "s3", serviceId: "s3", label: "Per-tenant prefix", position: [-3, -1.8, 0] },
        { id: "kms", serviceId: "kms", label: "Per-tenant CMK", position: [3, -1.8, 0] },
      ],
      edges: [
        { from: "cdn", to: "waf" },
        { from: "waf", to: "api" },
        { from: "api", to: "fn", label: "Inject tenantId" },
        { from: "fn", to: "iam", label: "Assume scoped role" },
        { from: "fn", to: "ddb", label: "LeadingKeys=tenantId" },
        { from: "fn", to: "s3", label: "prefix=tenant-{id}/" },
        { from: "fn", to: "kms", label: "Encrypt with tenant CMK" },
      ],
    },
    solution: {
      title: "Silo-Pool Hybrid with IAM-Scoped Pool",
      steps: [
        "Pool tier: shared Lambda + DynamoDB + S3, with IAM condition keys scoped to tenantId.",
        "DynamoDB partition key = `tenantId#entityId`; IAM uses `dynamodb:LeadingKeys` to enforce.",
        "S3: per-tenant prefix `s3://bucket/tenant-{id}/...` with IAM `Resource` scoping.",
        "KMS Customer-Managed Key per tenant — granular audit + instant revocation = legal kill-switch.",
        "API Gateway JWT authorizer extracts tenantId; Lambda assumes a tenant-scoped IAM role via STS before touching data.",
        "Premium tenants needing extra isolation get a silo deployment (own VPC, dedicated DB).",
        "Audit: CloudTrail + GuardDuty + Macie for PHI exposure detection.",
      ],
      heuristicsApplied: [
        "least-privilege",
        "encryption-everywhere",
        "kms-cmk-for-compliance",
        "iam-roles-over-keys",
      ],
    },
    commonTraps: [
      "Trusting Lambda code to filter by tenantId (one bug = full cross-tenant data leak)",
      "Single KMS key for all tenants (can't revoke one tenant's access independently)",
      "Database-per-tenant for 500+ tenants (RDS sprawl, unaffordable, ops nightmare)",
      "Shared S3 bucket without prefix-scoped IAM (`Resource: arn:.../bucket/*` allows any tenant)",
      "Logging tenantId only at API edge — log it on every DB call too for auditability",
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 6. Cost-Optimize Dev/Test
  // ════════════════════════════════════════════════════════════════
  {
    id: "cost-opt-dev-env",
    title: "Cost-Optimize Dev/Test Environments",
    difficulty: "easy",
    certs: ["SAA", "SAP", "SOA"],
    domains: ["Cost"],
    scenario:
      "An engineering team has 15 dev environments running 24/7, costing $4K/month. They're only actively used during business hours (9-5, Mon-Fri). Cut the cost without losing data.",
    keyConstraints: [
      "Dev envs only used 9-5 Mon-Fri (~24% of week)",
      "Must be quick to start up (under 5 min)",
      "Data must persist between stops",
      "No impact on prod — opt-in via tag",
    ],
    architecture: {
      nodes: [
        { id: "cron", serviceId: "eventbridge", label: "EventBridge cron rules", position: [-3, 2, 0] },
        { id: "scheduler", serviceId: "lambda", label: "Start/Stop Lambda", position: [0, 2, 0] },
        { id: "ec2", serviceId: "ec2", label: "Dev EC2 (tagged Env=dev)", position: [-2.5, 0, 0] },
        { id: "rds", serviceId: "rds", label: "Dev RDS (tagged Env=dev)", position: [2.5, 0, 0] },
        { id: "ebs", serviceId: "ebs", label: "EBS persists when stopped", position: [-2.5, -1.8, 0] },
        { id: "sns", serviceId: "sns", label: "Cost alerts", position: [3, 2, 0] },
        { id: "snapshots", serviceId: "s3", label: "Snapshots / backups", position: [2.5, -1.8, 0] },
      ],
      edges: [
        { from: "cron", to: "scheduler", label: "7pm + 8am wkdy" },
        { from: "scheduler", to: "ec2", label: "Start/Stop tagged" },
        { from: "scheduler", to: "rds", label: "Start/Stop tagged" },
        { from: "ec2", to: "ebs", label: "Persistent" },
        { from: "rds", to: "snapshots", label: "Auto-snapshot" },
        { from: "scheduler", to: "sns", label: "Errors → alert" },
      ],
    },
    solution: {
      title: "Scheduled Start/Stop + Right-Sizing",
      steps: [
        "EventBridge cron: 7 PM weekdays → trigger Lambda to STOP all EC2/RDS tagged `Env=dev`.",
        "EventBridge cron: 8 AM weekdays → START them again.",
        "Lambda only acts on resources with the `Env=dev` tag (prevents accidentally stopping prod).",
        "EBS volumes persist while EC2 is stopped — no data loss, but EBS cost still applies.",
        "RDS automatic backups provide recovery if anyone tampers.",
        "Expected saving: ~70% of compute cost (40 of 168 hours running).",
        "Convert stateless services to Fargate Spot for additional 70% savings on those.",
        "AWS Budgets + SNS alert if monthly spend spikes — guards against scheduler bugs.",
      ],
      heuristicsApplied: ["right-sizing-first", "spot-for-batch"],
    },
    commonTraps: [
      "RDS stop has a 7-day auto-restart limit — forgetting to restart it weekly causes failures",
      "Not tagging resources (scheduler hits prod or misses dev)",
      "Reserved Instances for dev (commits to 24/7 cost; defeats the purpose)",
      "Using NAT Gateway in dev VPCs ($32/month each, unused at night) — use VPC endpoints",
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 7. Decoupled Image Processing
  // ════════════════════════════════════════════════════════════════
  {
    id: "decoupled-image-processing",
    title: "Decoupled Image Processing Pipeline",
    difficulty: "medium",
    certs: ["SAA", "DVA"],
    domains: ["Architecture"],
    scenario:
      "Users upload photos to your site. Each photo needs: thumbnail generation, content moderation, EXIF extraction, and ML tagging. Upload API must respond in under 1 second.",
    keyConstraints: [
      "Upload API response < 1s",
      "4 independent processing steps per photo",
      "Handle 10× spikes (marketing campaigns)",
      "Failed steps must retry independently",
    ],
    architecture: {
      nodes: [
        { id: "api", serviceId: "apigateway", label: "Upload API", position: [0, 3, 0] },
        { id: "bucket", serviceId: "s3", label: "Upload bucket", position: [0, 1.5, 0] },
        { id: "topic", serviceId: "sns", label: "photo-uploaded topic", position: [0, 0, 0] },
        // Four parallel pipelines
        { id: "q-thumb", serviceId: "sqs", label: "thumbnail Q", position: [-4.5, -1.3, 0] },
        { id: "q-mod", serviceId: "sqs", label: "moderation Q", position: [-1.5, -1.3, 0] },
        { id: "q-exif", serviceId: "sqs", label: "exif Q", position: [1.5, -1.3, 0] },
        { id: "q-tag", serviceId: "sqs", label: "ml-tag Q", position: [4.5, -1.3, 0] },
        { id: "fn-thumb", serviceId: "lambda", label: "Thumbnail", position: [-4.5, -2.6, 0] },
        { id: "fn-mod", serviceId: "lambda", label: "Moderator", position: [-1.5, -2.6, 0] },
        { id: "fn-exif", serviceId: "lambda", label: "EXIF parser", position: [1.5, -2.6, 0] },
        { id: "fn-tag", serviceId: "lambda", label: "ML Tagger", position: [4.5, -2.6, 0] },
        { id: "results", serviceId: "dynamodb", label: "Results table (photoId)", position: [0, -4, 0] },
      ],
      edges: [
        { from: "api", to: "bucket", label: "Pre-signed URL" },
        { from: "bucket", to: "topic", label: "ObjectCreated" },
        // SNS fan-out
        { from: "topic", to: "q-thumb" },
        { from: "topic", to: "q-mod" },
        { from: "topic", to: "q-exif" },
        { from: "topic", to: "q-tag" },
        // Each queue → its own Lambda
        { from: "q-thumb", to: "fn-thumb" },
        { from: "q-mod", to: "fn-mod" },
        { from: "q-exif", to: "fn-exif" },
        { from: "q-tag", to: "fn-tag" },
        // Aggregated results
        { from: "fn-thumb", to: "results" },
        { from: "fn-mod", to: "results" },
        { from: "fn-exif", to: "results" },
        { from: "fn-tag", to: "results" },
      ],
    },
    solution: {
      title: "SNS Fan-out → 4 SQS Queues → 4 Lambdas",
      steps: [
        "API Gateway returns a pre-signed S3 URL (response time < 1s — no payload through API).",
        "Client uploads directly to S3 — server never sees the bytes.",
        "S3 ObjectCreated event → SNS topic.",
        "SNS fans out to 4 SQS queues (one per processing step).",
        "Each Lambda consumer scales independently and retries on failure (DLQ after 3 attempts).",
        "Spike handling: queues absorb the burst; Lambdas scale 0 → 1000 concurrency automatically.",
        "All four write results to DynamoDB keyed by photoId — caller polls or gets a webhook when complete.",
      ],
      heuristicsApplied: ["fanout-sns-sqs", "sqs-for-decoupling"],
    },
    commonTraps: [
      "S3 → Lambda direct (no retry semantics, no DLQ — failures vanish)",
      "Synchronous processing in the upload API (breaks the <1s SLA)",
      "One queue for all 4 steps (can't scale or fail independently)",
      "Skipping the SNS layer between S3 and queues (S3 → Lambda has only 2 retries)",
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 8. Hybrid — Connect On-Prem DC to AWS  (REBUILT)
  // ════════════════════════════════════════════════════════════════
  {
    id: "hybrid-direct-connect",
    title: "Hybrid — Connect On-Prem DC to AWS",
    difficulty: "hard",
    certs: ["SAP", "ANS"],
    domains: ["Network"],
    scenario:
      "A bank needs to connect its on-prem datacenter (Mumbai) to AWS ap-south-1 with dedicated bandwidth, low predictable latency, encrypted traffic, and HA across two physical paths. They have multiple VPCs that need to reach on-prem.",
    keyConstraints: [
      "Dedicated bandwidth (1 Gbps minimum)",
      "Low, predictable latency",
      "HA — no single point of failure",
      "Encryption in transit",
      "Multiple VPCs need on-prem reachability",
    ],
    architecture: {
      nodes: [
        { id: "onprem", serviceId: "on_prem", label: "Mumbai DC (corporate)", position: [-4.5, 0, 0] },
        // Two DX circuits at different DC locations for HA
        { id: "dx1", serviceId: "direct_connect", label: "DX 1 Gbps (location A)", position: [-2, 1.2, 0] },
        { id: "dx2", serviceId: "direct_connect", label: "DX 1 Gbps (location B)", position: [-2, -1.2, 0] },
        // VPN as tertiary backup
        { id: "vpn", serviceId: "vpn", label: "Site-to-Site VPN (backup)", position: [-2, -2.8, 0] },
        // Hub
        { id: "tgw", serviceId: "transit_gateway", label: "Transit Gateway", position: [1, 0, 0] },
        // Spokes — multiple VPCs
        { id: "vpc-app", serviceId: "vpc", label: "App VPC", position: [4, 1.5, 0] },
        { id: "vpc-data", serviceId: "vpc", label: "Data VPC", position: [4, 0, 0] },
        { id: "vpc-shared", serviceId: "vpc", label: "Shared services VPC", position: [4, -1.5, 0] },
      ],
      edges: [
        { from: "onprem", to: "dx1", label: "Primary path" },
        { from: "onprem", to: "dx2", label: "Secondary path" },
        { from: "onprem", to: "vpn", label: "Tertiary (internet)" },
        { from: "dx1", to: "tgw", label: "BGP + MACsec/IPsec" },
        { from: "dx2", to: "tgw", label: "BGP + MACsec/IPsec" },
        { from: "vpn", to: "tgw", label: "BGP over IPsec" },
        { from: "tgw", to: "vpc-app", label: "Attachment" },
        { from: "tgw", to: "vpc-data", label: "Attachment" },
        { from: "tgw", to: "vpc-shared", label: "Attachment" },
      ],
    },
    solution: {
      title: "Dual Direct Connect + VPN Backup via Transit Gateway",
      steps: [
        "Two Direct Connect 1 Gbps dedicated circuits at different DX locations (no single point of failure).",
        "Site-to-Site VPN as a tertiary backup over the public internet — auto-failover via BGP.",
        "Transit Gateway as the hub: attaches to both DX circuits, the VPN, and all VPCs.",
        "Multiple VPCs (App, Data, Shared) attach to the TGW once — full mesh without VPC peering sprawl.",
        "BGP for dynamic routing — failover between paths is automatic and sub-second.",
        "MACsec or IPsec over Direct Connect for in-transit encryption (banks require this).",
        "Direct Connect Gateway in front of TGW if multiple AWS regions need access via the same DX.",
      ],
      heuristicsApplied: ["encryption-everywhere", "health-checks-routing"],
    },
    commonTraps: [
      "Single DX circuit (not HA — circuit cut = full outage)",
      "Only VPN, no DX (bandwidth/latency unreliable for a bank's clearing systems)",
      "DX without Transit Gateway (VPC-to-VPC peering doesn't scale past ~5 VPCs)",
      "Forgetting MACsec/IPsec (DX is private but not encrypted by default)",
      "Misaligned BGP weights — failover doesn't trigger because the secondary is preferred",
    ],
  },
];

export const getScenario = (id: string) => scenarios.find((s) => s.id === id);

export const scenariosByCert = (cert: string) =>
  scenarios.filter((s) => s.certs.includes(cert));

export const scenariosByDifficulty = (diff: Scenario["difficulty"]) =>
  scenarios.filter((s) => s.difficulty === diff);
