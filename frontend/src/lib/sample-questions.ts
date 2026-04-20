/**
 * Curated sample questions shown publicly on /try-questions before login.
 * Hand-picked to give a fair taste of difficulty across providers.
 * The full bank (8,800+) is gated behind registration.
 */

export interface SampleOption {
  id: string;
  text: string;
}

export interface SampleQuestion {
  id: string;
  cert: string; // Display label e.g. "AWS SAA-C03"
  certCode: string; // Used to look up the cert badge
  provider: "aws" | "azure" | "gcp" | "comptia" | "nvidia";
  difficulty: 1 | 2 | 3 | 4 | 5;
  stem: string;
  options: SampleOption[];
  correct: string; // option id
  explanation: string;
  whyOthersWrong: Record<string, string>;
}

export const sampleQuestions: SampleQuestion[] = [
  // ── 1. AWS SAA — easy/medium ─────────────────────────────
  {
    id: "sample-saa-1",
    cert: "AWS Solutions Architect Associate",
    certCode: "SAA-C03",
    provider: "aws",
    difficulty: 2,
    stem:
      "A company stores sensitive customer data in Amazon S3. They need to ensure all objects are encrypted at rest using keys they manage, with the ability to audit key usage. Which encryption approach meets these requirements?",
    options: [
      { id: "A", text: "Enable SSE-S3 default encryption on the bucket" },
      {
        id: "B",
        text: "Enable SSE-KMS with a customer-managed key and enable CloudTrail logging",
      },
      { id: "C", text: "Use client-side encryption with self-managed keys" },
      { id: "D", text: "Enable bucket versioning and MFA Delete" },
    ],
    correct: "B",
    explanation:
      "SSE-KMS with a Customer-Managed Key (CMK) gives the customer full control over key rotation, revocation, and access policies. CloudTrail logs every key-use event, which provides the required audit trail. AWS-managed keys (SSE-S3) don't meet the 'customer manages' requirement.",
    whyOthersWrong: {
      A: "SSE-S3 uses keys AWS manages — you can't audit individual key usage and you don't control rotation.",
      C: "Client-side encryption works but is operationally heavy. CloudTrail can't audit it because the encryption happens before the data reaches AWS.",
      D: "Versioning + MFA Delete protects against accidental deletion, not encryption.",
    },
  },

  // ── 2. AWS SAA — medium ──────────────────────────────────
  {
    id: "sample-saa-2",
    cert: "AWS Solutions Architect Associate",
    certCode: "SAA-C03",
    provider: "aws",
    difficulty: 3,
    stem:
      "A company runs a critical web application. They need the application to automatically recover from an AZ failure with minimal downtime. The application uses an RDS MySQL database. Which architecture achieves this?",
    options: [
      {
        id: "A",
        text: "Deploy EC2 instances in a single AZ with automated snapshots; RDS with Read Replicas",
      },
      {
        id: "B",
        text: "Deploy EC2 instances across multiple AZs behind an ALB with Auto Scaling, and RDS Multi-AZ",
      },
      {
        id: "C",
        text: "Use a single large EC2 instance with EBS snapshots and a daily RDS backup",
      },
      {
        id: "D",
        text: "Deploy in two regions with Route 53 latency routing and Aurora Global Database",
      },
    ],
    correct: "B",
    explanation:
      "Multi-AZ ALB + Auto Scaling EC2 + RDS Multi-AZ is the canonical 'survives AZ failure' pattern. Failover is automatic and takes ~60 seconds for RDS Multi-AZ. Choice D is multi-region (overkill — and meant for region failure, not AZ failure).",
    whyOthersWrong: {
      A: "Read Replicas are for scaling reads, not for HA failover. Single-AZ EC2 dies with the AZ.",
      C: "Daily backups means up to 24 hours of data loss — not 'minimal downtime'.",
      D: "Multi-region is correct but expensive; the question only asks about AZ failure, not region failure.",
    },
  },

  // ── 3. AWS Lambda design ─────────────────────────────────
  {
    id: "sample-lambda",
    cert: "AWS Developer Associate",
    certCode: "DVA-C02",
    provider: "aws",
    difficulty: 3,
    stem:
      "An AWS Lambda function processes events from an Amazon S3 bucket. Occasionally the function fails due to malformed events. Failed events should be sent to a separate location for manual review without losing them. What should the developer configure?",
    options: [
      { id: "A", text: "Increase the Lambda timeout to 15 minutes" },
      { id: "B", text: "Configure a Dead Letter Queue (DLQ) using Amazon SQS" },
      { id: "C", text: "Add try/catch in the Lambda code and log to CloudWatch" },
      { id: "D", text: "Enable Provisioned Concurrency on the function" },
    ],
    correct: "B",
    explanation:
      "Dead Letter Queues capture events that fail all retry attempts so they can be inspected and replayed. SQS is the standard DLQ target for Lambda. CloudWatch Logs alone (option C) doesn't preserve the original event payload in a re-processable format.",
    whyOthersWrong: {
      A: "A longer timeout doesn't help with malformed events — they'll still fail.",
      C: "Logging the error to CloudWatch records the failure but doesn't preserve the event for replay.",
      D: "Provisioned Concurrency improves cold-start latency. Unrelated to error handling.",
    },
  },

  // ── 4. Azure ─────────────────────────────────────────────
  {
    id: "sample-az-104",
    cert: "Microsoft Azure Administrator",
    certCode: "AZ-104",
    provider: "azure",
    difficulty: 2,
    stem:
      "You need to ensure that an Azure Storage Account can only be accessed from a specific virtual network. Which feature should you configure?",
    options: [
      { id: "A", text: "Azure Private Link with a Private Endpoint" },
      { id: "B", text: "Storage Account access keys rotation" },
      { id: "C", text: "Shared Access Signature (SAS) tokens" },
      { id: "D", text: "Storage firewall with public IP allowlist" },
    ],
    correct: "A",
    explanation:
      "Private Endpoints expose the storage account on a private IP inside your VNet, eliminating internet exposure entirely. Storage firewall allows access from specific public IPs (option D) but doesn't restrict to a VNet only.",
    whyOthersWrong: {
      B: "Key rotation is a credential hygiene practice, not network restriction.",
      C: "SAS tokens authorize per-request access but don't restrict the network path.",
      D: "Firewall with IP allowlist restricts public IPs but the connection still traverses the public internet — and exposes the storage account publicly to those IPs.",
    },
  },

  // ── 5. GCP ───────────────────────────────────────────────
  {
    id: "sample-gcp-ace",
    cert: "Google Cloud Associate Cloud Engineer",
    certCode: "ACE",
    provider: "gcp",
    difficulty: 2,
    stem:
      "Your team needs to grant the data analytics team read-only access to a single BigQuery dataset, without giving them access to other datasets in the same project. What should you do?",
    options: [
      {
        id: "A",
        text: "Grant the BigQuery Data Viewer role at the project level",
      },
      {
        id: "B",
        text: "Grant the BigQuery Data Viewer role at the dataset level",
      },
      {
        id: "C",
        text: "Grant the Owner role on the project",
      },
      {
        id: "D",
        text: "Create a service account with editor permissions",
      },
    ],
    correct: "B",
    explanation:
      "GCP IAM follows the principle of least privilege. Granting BigQuery Data Viewer at the dataset level scopes the read-only access to exactly that dataset. Granting at the project level (A) would expose every dataset.",
    whyOthersWrong: {
      A: "Project-level grants apply to all datasets — too broad.",
      C: "Owner is full control, the opposite of read-only.",
      D: "A service account is for non-human access; the request is for the analytics team (human users).",
    },
  },
];

export function getSampleQuestion(id: string): SampleQuestion | null {
  return sampleQuestions.find((q) => q.id === id) ?? null;
}
