"use client";

import {
  Lightbulb,
  AlertTriangle,
  FileText,
  ExternalLink,
  ArrowRight,
  Check,
  Star,
  Play,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConceptDetail } from "@/lib/api-types";
import { CheatSheet } from "./cheat-sheet";
import { BloomsBadge } from "./blooms-badge";
import { AudioTutor } from "./audio-tutor";

// --- Curated YouTube videos per concept (all URLs verified) ---
interface VideoResource {
  title: string;
  channel: string;
  url: string;
  segment: string;
  description: string;
}

const conceptVideos: Record<string, VideoResource[]> = {
  "aws-sap-vpc-fundamentals": [
    { title: "AWS VPC Beginner to Pro - Virtual Private Cloud Tutorial", channel: "freeCodeCamp.org", url: "https://www.youtube.com/watch?v=g2JOHLHh4rI", segment: "Full video (21 chapters)", description: "CIDR blocks, subnets, internet gateways, NAT gateways, security groups, route tables" },
  ],
  "aws-sap-vpc-peering": [
    { title: "VPC Peering in AWS | Hands-On Tutorial", channel: "Tiny Technical Tutorials", url: "https://www.youtube.com/watch?v=ZFe70EZqU18", segment: "Full video (7 chapters)", description: "What VPC peering is, creating EC2 instances in each VPC, testing connectivity" },
  ],
  "aws-sap-transit-gateway": [
    { title: "A Deep Dive into AWS Transit Gateway", channel: "LearnCantrill", url: "https://www.youtube.com/watch?v=a55Iud-66q0", segment: "Full video (5 chapters)", description: "Transit Gateway internals, typical architecture, TGW peering" },
  ],
  "aws-sap-direct-connect": [
    { title: "AWS Direct Connect - What is it and how it works?", channel: "AWS with Chetan", url: "https://www.youtube.com/watch?v=V75f8Vs13Uo", segment: "Full video (6 chapters)", description: "DX locations, logical connectivity, public/private VIFs" },
  ],
  "aws-sap-site-to-site-vpn": [
    { title: "Setup an AWS Site-to-Site VPN", channel: "Digital Cloud Training", url: "https://www.youtube.com/watch?v=7tTrN8WXMlg", segment: "Full video (10 chapters)", description: "Route tables, EC2 instances, virtual private gateways, customer gateways" },
  ],
  "aws-sap-privatelink": [
    { title: "AWS PrivateLink", channel: "Amazon Web Services", url: "https://www.youtube.com/watch?v=_mHLkFeTuFo", segment: "Full video", description: "Official AWS video on private connectivity between VPCs and services" },
  ],
  "aws-sap-security-groups": [
    { title: "Security Groups vs NACLs: What's the Difference?", channel: "Tiny Technical Tutorials", url: "https://www.youtube.com/watch?v=JWoNu2Mtpdg", segment: "Full video (3 chapters)", description: "Stateful vs stateless, allow vs deny rules, network access control" },
  ],
  "aws-sap-nacls": [
    { title: "Security Groups vs NACLs: What's the Difference?", channel: "Tiny Technical Tutorials", url: "https://www.youtube.com/watch?v=JWoNu2Mtpdg", segment: "Full video (3 chapters)", description: "NACLs compared to Security Groups — stateless rules, rule numbering" },
  ],
  "aws-sap-organizations": [
    { title: "Create AWS Service Control Policy (SCP)", channel: "Digital Cloud Training", url: "https://www.youtube.com/watch?v=FR36p7iiRkU", segment: "Full video (7 chapters)", description: "Creating SCPs, testing permissions, service control policies hands-on" },
  ],
  "aws-sap-control-tower": [
    { title: "AWS Control Tower Overview and Landing Zone Hands-On", channel: "Digital Cloud Training", url: "https://www.youtube.com/watch?v=3-aaw-B1j8Y", segment: "Full video (12 chapters)", description: "Landing Zone setup, detective guardrails, configuration walkthrough" },
  ],
  "aws-sap-iam-advanced": [
    { title: "AWS IAM Permissions Boundary", channel: "Digital Cloud Training", url: "https://www.youtube.com/watch?v=t8P8ffqWrsY", segment: "Full video (5 chapters)", description: "Permission boundaries, evaluation logic, privilege escalation prevention" },
  ],
  "aws-sap-lambda": [
    { title: "Create Your First AWS Lambda Function", channel: "Tiny Technical Tutorials", url: "https://www.youtube.com/watch?v=e1tkFsFOBHA", segment: "Full video (14 chapters)", description: "Serverless computing, Lambda scenarios, creating and testing functions" },
  ],
  "aws-sap-ecs-fargate": [
    { title: "AWS ECS Full Tutorial | EC2, EKS, Fargate, Load Balancers", channel: "KodeKloud", url: "https://www.youtube.com/watch?v=esISkPlnxL0", segment: "Full video (17 chapters)", description: "ECS vs other services, EC2 vs Fargate, task definitions, Docker deployment" },
  ],
  "aws-sap-s3-storage-classes": [
    { title: "Amazon S3 Storage Classes", channel: "Digital Cloud Training", url: "https://www.youtube.com/watch?v=EqqtzKqewaA", segment: "Full video (5 chapters)", description: "Durability, availability, Standard, IA, One Zone-IA, Glacier tiers" },
  ],
  "aws-sap-s3-lifecycle": [
    { title: "Understanding Amazon S3 Lifecycle Management", channel: "Amazon Web Services", url: "https://www.youtube.com/watch?v=c5PKWc_n2Kc", segment: "Full video (4 chapters + demo)", description: "Official AWS tutorial on lifecycle policies for cost-effective storage management" },
  ],
  "aws-sap-rds-aurora": [
    { title: "AWS MySQL Aurora Vs RDS - Which one?", channel: "Johnny Chivers", url: "https://www.youtube.com/watch?v=yHCwjAbwS6M", segment: "Full video (8 chapters)", description: "Architecture differences, performance, costs, and when to choose each" },
  ],
  "aws-sap-dynamodb": [
    { title: "AWS DynamoDB Tutorial For Beginners", channel: "Be A Better Dev", url: "https://www.youtube.com/watch?v=2k2GINpO308", segment: "Full video", description: "Tables, items, partition keys, sort keys, queries, scans — 450K+ views" },
  ],
  "aws-sap-migration-strategies": [
    { title: "Cloud Migration Strategies | Understanding the 7Rs", channel: "Cloud Simplified", url: "https://www.youtube.com/watch?v=suU08PO33Mo", segment: "Full video", description: "Rehost, Replatform, Repurchase, Refactor, Retire, Retain, Relocate" },
  ],
  "aws-sap-dms": [
    { title: "Migrating Databases with AWS DMS - Demo", channel: "Hands-on AWS", url: "https://www.youtube.com/watch?v=JTSLF42bv9Y", segment: "Full video (14 chapters)", description: "Replication instances, endpoints, migration tasks — hands-on demo" },
  ],
  "aws-sap-cost-optimization": [
    { title: "Compute Savings Plan vs Reserved Instances", channel: "Unus AWS", url: "https://www.youtube.com/watch?v=DZzsrKKK1_I", segment: "Full video (3 chapters)", description: "Standard RI vs Convertible RI vs Instance Savings Plans vs Compute Savings Plans" },
  ],
};

// --- Curated hands-on labs per concept ---
interface LabResource {
  title: string;
  platform: string;
  url: string;
  free: boolean;
  duration: string;
  description: string;
}

const conceptLabs: Record<string, LabResource[]> = {
  "aws-sap-vpc-fundamentals": [
    { title: "Build Your First VPC", platform: "AWS Skill Builder", url: "https://explore.skillbuilder.aws/learn/course/external/view/elearning/409/build-your-first-amazon-virtual-private-cloud-amazon-vpc", free: true, duration: "30 min", description: "Create a VPC with subnets, route tables, and internet gateway" },
    { title: "VPC Networking Workshop", platform: "AWS Workshops", url: "https://catalog.workshops.aws/networking/en-US", free: true, duration: "2 hours", description: "Comprehensive VPC networking hands-on" },
  ],
  "aws-sap-vpc-peering": [
    { title: "VPC Peering Lab", platform: "AWS Workshops", url: "https://catalog.workshops.aws/networking/en-US", free: true, duration: "45 min", description: "Set up VPC peering between two VPCs with route table configuration" },
  ],
  "aws-sap-transit-gateway": [
    { title: "Transit Gateway Lab", platform: "AWS Workshops", url: "https://catalog.workshops.aws/networking/en-US/beginner/lab1/030-tgw", free: true, duration: "2 hours", description: "Build hub-and-spoke with Transit Gateway across multiple VPCs" },
    { title: "TGW Terraform Module", platform: "GitHub", url: "https://github.com/terraform-aws-modules/terraform-aws-transit-gateway", free: true, duration: "1 hour", description: "Deploy Transit Gateway with Terraform in your Free Tier account" },
  ],
  "aws-sap-direct-connect": [
    { title: "Hybrid Networking Workshop", platform: "AWS Workshops", url: "https://catalog.workshops.aws/networking/en-US", free: true, duration: "2 hours", description: "Simulated Direct Connect setup with Transit Gateway" },
  ],
  "aws-sap-organizations": [
    { title: "SCP Examples Repository", platform: "GitHub", url: "https://github.com/aws-samples/service-control-policy-examples", free: true, duration: "30 min", description: "Real-world SCP policies you can deploy and test" },
  ],
  "aws-sap-control-tower": [
    { title: "Control Tower Immersion Day", platform: "AWS Workshops", url: "https://catalog.workshops.aws/control-tower/en-US", free: true, duration: "3 hours", description: "Set up Control Tower, guardrails, and Account Factory" },
  ],
  "aws-sap-lambda": [
    { title: "Serverless Patterns Workshop", platform: "AWS Workshops", url: "https://catalog.workshops.aws/serverless-patterns/en-US", free: true, duration: "2 hours", description: "Build a serverless app with Lambda, API Gateway, DynamoDB" },
    { title: "Lambda Playground", platform: "KodeKloud", url: "https://kodekloud.com/cloud-playgrounds/aws-free", free: true, duration: "30 min", description: "Experiment with Lambda in a free sandbox (no AWS account needed)" },
  ],
  "aws-sap-ecs-fargate": [
    { title: "ECS Immersion Day", platform: "AWS Workshops", url: "https://catalog.workshops.aws/ecs-immersion-day/en-US", free: true, duration: "3 hours", description: "Deploy containers with ECS, Fargate, and CI/CD pipeline" },
  ],
  "aws-sap-s3-storage-classes": [
    { title: "S3 Hands-on Lab", platform: "AWS Skill Builder", url: "https://explore.skillbuilder.aws/", free: true, duration: "45 min", description: "Create S3 buckets, configure storage classes and lifecycle policies" },
  ],
  "aws-sap-rds-aurora": [
    { title: "RDS Hands-on Lab", platform: "AWS Workshops", url: "https://catalog.workshops.aws/general-immersionday/en-US/basic-modules/50-rds/rds", free: true, duration: "1 hour", description: "Deploy RDS MySQL instance, connect and query in a guided lab" },
  ],
  "aws-sap-dynamodb": [
    { title: "DynamoDB Workshop", platform: "AWS Workshops", url: "https://catalog.workshops.aws/dynamodb-labs/en-US", free: true, duration: "2 hours", description: "Single-table design, GSIs, Streams, and DAX caching" },
  ],
  "aws-sap-dms": [
    { title: "DMS Migration Lab", platform: "AWS Workshops", url: "https://catalog.workshops.aws/databasemigration/", free: true, duration: "2 hours", description: "Migrate a database with DMS and Schema Conversion Tool" },
  ],
  "aws-sap-cost-optimization": [
    { title: "Cost Optimization Lab", platform: "Well-Architected Labs", url: "https://www.wellarchitectedlabs.com/cost/", free: true, duration: "1 hour", description: "Analyze spending with Cost Explorer, set up Budgets and alerts" },
  ],
};

interface ConceptLearnProps {
  concept: ConceptDetail;
  factsChecked: Set<number>;
  onFactCheck: (index: number) => void;
  onReady: () => void;
  onSkip: () => void;
}

const serviceSlugMap: Record<string, string> = {
  VPC: "vpc",
  S3: "s3",
  Lambda: "lambda",
  DynamoDB: "dynamodb",
  RDS: "rds",
  "Transit Gateway": "transit-gateway",
  "Direct Connect": "directconnect",
  "Route Tables": "vpc",
  "Security Groups": "vpc",
  IAM: "iam",
  Organizations: "organizations",
  "Control Tower": "controltower",
  ECS: "ecs",
  Fargate: "fargate",
  ECR: "ecr",
  DMS: "dms",
  CloudWatch: "cloudwatch",
  "Cost Explorer": "cost-management",
  CloudFront: "cloudfront",
  SNS: "sns",
  SQS: "sqs",
  "API Gateway": "apigateway",
  "Step Functions": "step-functions",
  KMS: "kms",
  "Secrets Manager": "secretsmanager",
  EBS: "ebs",
  EFS: "efs",
  Redshift: "redshift",
  Athena: "athena",
  Glue: "glue",
  Kinesis: "kinesis",
  SageMaker: "sagemaker",
  "Elastic Beanstalk": "elasticbeanstalk",
  "CloudFormation": "cloudformation",
  "Systems Manager": "systems-manager",
  "Config": "config",
  "CloudTrail": "cloudtrail",
  "GuardDuty": "guardduty",
  "WAF": "waf",
  "Shield": "shield",
  "Inspector": "inspector",
  "Macie": "macie",
  "EventBridge": "eventbridge",
  "AppSync": "appsync",
  "Aurora": "rds",
  "ElastiCache": "elasticache",
  "Global Accelerator": "global-accelerator",
  "Route 53": "route53",
  "Storage Gateway": "storagegateway",
  "DataSync": "datasync",
  "Transfer Family": "aws-transfer-family",
  "Backup": "backup",
};

function getServiceSlug(service: string): string {
  // Check exact match first
  if (serviceSlugMap[service]) return serviceSlugMap[service];
  // Check case-insensitive
  const key = Object.keys(serviceSlugMap).find(
    (k) => k.toLowerCase() === service.toLowerCase()
  );
  if (key) return serviceSlugMap[key];
  // Fallback: lowercase, replace spaces with hyphens
  return service.toLowerCase().replace(/\s+/g, "-");
}

export function ConceptLearn({
  concept,
  factsChecked,
  onFactCheck,
  onReady,
  onSkip,
}: ConceptLearnProps) {
  const { key_facts, common_misconceptions, aws_services, difficulty_tier } =
    concept.concept;

  const totalFacts = key_facts.length;
  const checkedCount = factsChecked.size;
  const halfChecked = checkedCount >= Math.ceil(totalFacts / 2);

  // Difficulty stars
  const difficultyLevel = difficulty_tier ?? 3;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Top section */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
        <h2 className="text-2xl font-bold text-stone-900">
          {concept.concept.name}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {concept.concept.domain_id && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium uppercase text-amber-600">
              {concept.concept.domain_id.replace(/-/g, " ")}
            </span>
          )}
          {/* Bloom's Taxonomy badge */}
          <BloomsBadge difficultyTier={difficulty_tier} />
          {/* Difficulty stars */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-5 w-5",
                  star <= difficultyLevel
                    ? "fill-amber-500 text-amber-500"
                    : "text-stone-300"
                )}
              />
            ))}
          </div>
        </div>

        {/* AWS service tags */}
        {aws_services.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {aws_services.map((service) => (
              <span
                key={service}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600"
              >
                {service}
              </span>
            ))}
          </div>
        )}

        {concept.concept.description && (
          <p className="mt-4 text-sm leading-relaxed text-stone-700">
            {concept.concept.description}
          </p>
        )}
      </div>

      {/* Audio Tutor */}
      <AudioTutor
        title={concept.concept.name}
        sections={[
          ...(concept.concept.description
            ? [{ heading: "Overview", body: concept.concept.description }]
            : []),
          ...(key_facts.length > 0
            ? [{ heading: "Key facts", body: key_facts.join(". ") }]
            : []),
          ...(common_misconceptions.length > 0
            ? [
                {
                  heading: "Common misconceptions",
                  body: common_misconceptions.join(". "),
                },
              ]
            : []),
        ]}
      />

      {/* Key Facts */}
      {key_facts.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-amber-500" />
              <h3 className="font-bold text-stone-900">Key Facts</h3>
            </div>
            <span className="text-sm text-stone-500">
              {checkedCount} of {totalFacts} reviewed
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${(factsChecked.size / concept.concept.key_facts.length) * 100}%` }} />
          </div>
          <div className="mt-4 space-y-2">
            {key_facts.map((fact, i) => {
              const checked = factsChecked.has(i);
              return (
                <button
                  key={i}
                  onClick={() => onFactCheck(i)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    checked
                      ? "border-green-200 bg-green-50/50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      checked
                        ? "border-green-500 bg-green-500"
                        : "border-stone-300"
                    )}
                  >
                    {checked && <Check className="h-3 w-3 text-white animate-scaleIn" />}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      checked
                        ? "text-stone-400 line-through"
                        : "text-stone-700"
                    )}
                  >
                    {fact}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Common Misconceptions */}
      {common_misconceptions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-stone-900">Watch Out!</h3>
          </div>
          <div className="space-y-3">
            {common_misconceptions.map((misconception, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-4"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm text-stone-700">{misconception}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cheat Sheet */}
      <CheatSheet concept={concept} />

      {/* Study Links */}
      {aws_services.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
          <div className="mb-4 flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-stone-900">Further Reading</h3>
          </div>
          <div className="space-y-2">
            {aws_services.map((service) => {
              const slug = getServiceSlug(service);
              return (
                <a
                  key={service}
                  href={`https://aws.amazon.com/${slug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-base text-amber-600 underline hover:text-amber-700"
                >
                  AWS {service} Documentation
                  <ArrowRight className="h-3 w-3" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* YouTube Videos */}
      {conceptVideos[concept.concept.id] && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
              <Play className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="font-bold text-stone-900">Video Tutorials</h3>
          </div>
          <div className="space-y-3">
            {conceptVideos[concept.concept.id].map((video, i) => (
              <a
                key={i}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-stone-200 p-4 transition-all duration-200 hover:border-amber-400 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <Play className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900">{video.title}</p>
                    <p className="mt-0.5 text-sm text-stone-500">{video.channel}</p>
                    <p className="mt-1 text-sm text-stone-600">{video.description}</p>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      ▶ {video.segment}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hands-on Labs */}
      {conceptLabs[concept.concept.id] && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
              <FlaskConical className="h-4 w-4 text-green-600" />
            </div>
            <h3 className="font-bold text-stone-900">Hands-on Labs</h3>
          </div>
          <div className="space-y-3">
            {conceptLabs[concept.concept.id].map((lab, i) => (
              <a
                key={i}
                href={lab.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-stone-200 p-4 transition-all duration-200 hover:border-green-400 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
                    <FlaskConical className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-stone-900">{lab.title}</p>
                      {lab.free && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                          FREE
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {lab.platform} · {lab.duration}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">{lab.description}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="space-y-2">
        <button
          onClick={onReady}
          disabled={!halfChecked}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-bold text-white transition-colors",
            halfChecked
              ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:scale-[1.02] transition-all duration-200"
              : "cursor-not-allowed bg-stone-300"
          )}
        >
          Ready to Test
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2 text-center text-sm text-stone-400 hover:text-stone-500"
        >
          Skip to Quiz
        </button>
      </div>
    </div>
  );
}
