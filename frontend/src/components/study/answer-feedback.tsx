"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, ArrowRight, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Question, AnswerResult, ConceptDetail } from "@/lib/api-types";

// ---------------------------------------------------------------------------
// Dynamic documentation link generator
// Maps concept IDs → official docs for AWS, Azure, GCP, CompTIA & NVIDIA
// ---------------------------------------------------------------------------

type DocLink = { label: string; url: string };

// AWS service keyword → documentation URL mappings
const AWS_DOCS: Record<string, DocLink> = {
  // Compute
  "ec2":          { label: "EC2 User Guide", url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html" },
  "lambda":       { label: "Lambda Developer Guide", url: "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html" },
  "ecs":          { label: "ECS Developer Guide", url: "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html" },
  "fargate":      { label: "Fargate User Guide", url: "https://docs.aws.amazon.com/AmazonECS/latest/userguide/what-is-fargate.html" },
  "eks":          { label: "EKS User Guide", url: "https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html" },
  "beanstalk":    { label: "Elastic Beanstalk Guide", url: "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html" },
  "batch":        { label: "AWS Batch Guide", url: "https://docs.aws.amazon.com/batch/latest/userguide/what-is-batch.html" },
  "auto-scaling": { label: "Auto Scaling Guide", url: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html" },
  "autoscaling":  { label: "Auto Scaling Guide", url: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html" },
  // Storage
  "s3":           { label: "S3 User Guide", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html" },
  "ebs":          { label: "EBS User Guide", url: "https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html" },
  "efs":          { label: "EFS User Guide", url: "https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html" },
  "glacier":      { label: "S3 Glacier Guide", url: "https://docs.aws.amazon.com/amazonglacier/latest/dev/introduction.html" },
  "fsx":          { label: "FSx User Guide", url: "https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html" },
  "storage":      { label: "AWS Storage Overview", url: "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/storage-services.html" },
  // Database
  "rds":          { label: "RDS User Guide", url: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html" },
  "aurora":       { label: "Aurora User Guide", url: "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html" },
  "dynamodb":     { label: "DynamoDB Developer Guide", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html" },
  "elasticache":  { label: "ElastiCache Guide", url: "https://docs.aws.amazon.com/AmazonElastiCache/latest/UserGuide/WhatIs.html" },
  "redshift":     { label: "Redshift Guide", url: "https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html" },
  "neptune":      { label: "Neptune User Guide", url: "https://docs.aws.amazon.com/neptune/latest/userguide/intro.html" },
  "documentdb":   { label: "DocumentDB Guide", url: "https://docs.aws.amazon.com/documentdb/latest/developerguide/what-is.html" },
  "dms":          { label: "DMS User Guide", url: "https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html" },
  // Networking
  "vpc":          { label: "VPC User Guide", url: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html" },
  "cloudfront":   { label: "CloudFront Guide", url: "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html" },
  "route53":      { label: "Route 53 Guide", url: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html" },
  "elb":          { label: "Elastic Load Balancing", url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html" },
  "apigateway":   { label: "API Gateway Guide", url: "https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html" },
  "api-gateway":  { label: "API Gateway Guide", url: "https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html" },
  "transit":      { label: "Transit Gateway Guide", url: "https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html" },
  "direct-connect": { label: "Direct Connect Guide", url: "https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html" },
  "privatelink":  { label: "PrivateLink Guide", url: "https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html" },
  "vpn":          { label: "Site-to-Site VPN Guide", url: "https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html" },
  "global-accelerator": { label: "Global Accelerator Guide", url: "https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html" },
  "nacl":         { label: "Network ACLs", url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html" },
  "security-group": { label: "Security Groups", url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html" },
  "network-firewall": { label: "Network Firewall Guide", url: "https://docs.aws.amazon.com/network-firewall/latest/developerguide/what-is-aws-network-firewall.html" },
  "flow-log":     { label: "VPC Flow Logs", url: "https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html" },
  "cloud-wan":    { label: "Cloud WAN Guide", url: "https://docs.aws.amazon.com/vpc/latest/cloudwan/what-is-cloudwan.html" },
  // Security & Identity
  "iam":          { label: "IAM User Guide", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html" },
  "kms":          { label: "KMS Developer Guide", url: "https://docs.aws.amazon.com/kms/latest/developerguide/overview.html" },
  "cognito":      { label: "Cognito Developer Guide", url: "https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html" },
  "waf":          { label: "WAF Developer Guide", url: "https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html" },
  "shield":       { label: "Shield Advanced Guide", url: "https://docs.aws.amazon.com/waf/latest/developerguide/shield-chapter.html" },
  "guardduty":    { label: "GuardDuty User Guide", url: "https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html" },
  "inspector":    { label: "Inspector User Guide", url: "https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html" },
  "macie":        { label: "Macie User Guide", url: "https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html" },
  "secrets":      { label: "Secrets Manager Guide", url: "https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html" },
  "acm":          { label: "ACM User Guide", url: "https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html" },
  "sso":          { label: "IAM Identity Center", url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html" },
  "security-hub": { label: "Security Hub Guide", url: "https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html" },
  "encryption":   { label: "KMS Encryption Guide", url: "https://docs.aws.amazon.com/kms/latest/developerguide/overview.html" },
  "ddos":         { label: "DDoS Resilience Guide", url: "https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/aws-best-practices-ddos-resiliency.html" },
  // Management
  "cloudformation": { label: "CloudFormation Guide", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html" },
  "cloudwatch":   { label: "CloudWatch User Guide", url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html" },
  "cloudtrail":   { label: "CloudTrail User Guide", url: "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html" },
  "config":       { label: "AWS Config Guide", url: "https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html" },
  "systems-manager": { label: "Systems Manager Guide", url: "https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html" },
  "organizations": { label: "Organizations Guide", url: "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html" },
  "control-tower": { label: "Control Tower Guide", url: "https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html" },
  "trusted-advisor": { label: "Trusted Advisor Guide", url: "https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html" },
  "cost":         { label: "Cost Management Guide", url: "https://docs.aws.amazon.com/cost-management/latest/userguide/what-is-costmanagement.html" },
  "budget":       { label: "AWS Budgets Guide", url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html" },
  // Integration & Messaging
  "sqs":          { label: "SQS Developer Guide", url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html" },
  "sns":          { label: "SNS Developer Guide", url: "https://docs.aws.amazon.com/sns/latest/dg/welcome.html" },
  "eventbridge":  { label: "EventBridge Guide", url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html" },
  "step-functions": { label: "Step Functions Guide", url: "https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html" },
  "kinesis":      { label: "Kinesis Developer Guide", url: "https://docs.aws.amazon.com/streams/latest/dev/introduction.html" },
  // AI/ML
  "sagemaker":    { label: "SageMaker Guide", url: "https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html" },
  "bedrock":      { label: "Bedrock User Guide", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html" },
  "rekognition":  { label: "Rekognition Guide", url: "https://docs.aws.amazon.com/rekognition/latest/dg/what-is.html" },
  "comprehend":   { label: "Comprehend Guide", url: "https://docs.aws.amazon.com/comprehend/latest/dg/what-is.html" },
  "textract":     { label: "Textract Guide", url: "https://docs.aws.amazon.com/textract/latest/dg/what-is.html" },
  "polly":        { label: "Polly Developer Guide", url: "https://docs.aws.amazon.com/polly/latest/dg/what-is.html" },
  "lex":          { label: "Lex Developer Guide", url: "https://docs.aws.amazon.com/lexv2/latest/dg/what-is.html" },
  "transcribe":   { label: "Transcribe Guide", url: "https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html" },
  "personalize":  { label: "Personalize Guide", url: "https://docs.aws.amazon.com/personalize/latest/dg/what-is-personalize.html" },
  "forecast":     { label: "Forecast Guide", url: "https://docs.aws.amazon.com/forecast/latest/dg/what-is-forecast.html" },
  "foundation-model": { label: "Bedrock Models", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html" },
  "guardrails":   { label: "Bedrock Guardrails", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html" },
  "prompt":       { label: "Bedrock Prompt Guide", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management.html" },
  "rag":          { label: "Bedrock Knowledge Bases", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html" },
  "agents":       { label: "Bedrock Agents", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html" },
  "fine-tuning":  { label: "Bedrock Fine-tuning", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/custom-models.html" },
  "ml-types":     { label: "ML Concepts", url: "https://docs.aws.amazon.com/machine-learning/latest/dg/types-of-ml-models.html" },
  "neural":       { label: "SageMaker Deep Learning", url: "https://docs.aws.amazon.com/sagemaker/latest/dg/deep-learning.html" },
  "bias":         { label: "SageMaker Clarify", url: "https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-detect-post-training-bias.html" },
  "explainability": { label: "SageMaker Clarify", url: "https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-shapley-values.html" },
  "embeddings":   { label: "Bedrock Embeddings", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/embeddings.html" },
  // Analytics
  "athena":       { label: "Athena User Guide", url: "https://docs.aws.amazon.com/athena/latest/ug/what-is.html" },
  "glue":         { label: "Glue Developer Guide", url: "https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html" },
  "emr":          { label: "EMR Guide", url: "https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-what-is-emr.html" },
  "quicksight":   { label: "QuickSight Guide", url: "https://docs.aws.amazon.com/quicksight/latest/user/welcome.html" },
  "opensearch":   { label: "OpenSearch Guide", url: "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html" },
  "lake-formation": { label: "Lake Formation Guide", url: "https://docs.aws.amazon.com/lake-formation/latest/dg/what-is-lake-formation.html" },
  "data-pipeline": { label: "Data Pipeline Guide", url: "https://docs.aws.amazon.com/datapipeline/latest/DeveloperGuide/what-is-datapipeline.html" },
  // Migration
  "migration":    { label: "Migration Guide", url: "https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/welcome.html" },
  "snow":         { label: "Snow Family Guide", url: "https://docs.aws.amazon.com/snowball/latest/developer-guide/whatisedge.html" },
  "datasync":     { label: "DataSync Guide", url: "https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html" },
  // DevOps
  "codepipeline": { label: "CodePipeline Guide", url: "https://docs.aws.amazon.com/codepipeline/latest/userguide/welcome.html" },
  "codebuild":    { label: "CodeBuild Guide", url: "https://docs.aws.amazon.com/codebuild/latest/userguide/welcome.html" },
  "codedeploy":   { label: "CodeDeploy Guide", url: "https://docs.aws.amazon.com/codedeploy/latest/userguide/welcome.html" },
  "codecommit":   { label: "CodeCommit Guide", url: "https://docs.aws.amazon.com/codecommit/latest/userguide/welcome.html" },
  "cdk":          { label: "CDK Developer Guide", url: "https://docs.aws.amazon.com/cdk/v2/guide/home.html" },
  // Misc
  "multi-az":     { label: "High Availability Guide", url: "https://docs.aws.amazon.com/whitepapers/latest/real-time-communication-on-aws/high-availability-and-scalability-on-aws.html" },
  "ha":           { label: "High Availability Guide", url: "https://docs.aws.amazon.com/whitepapers/latest/real-time-communication-on-aws/high-availability-and-scalability-on-aws.html" },
  "well-architected": { label: "Well-Architected Framework", url: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html" },
  "reserved":     { label: "Reserved Instances", url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html" },
  "spot":         { label: "Spot Instances Guide", url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html" },
  "right-sizing": { label: "Right Sizing Guide", url: "https://docs.aws.amazon.com/cost-management/latest/userguide/ce-rightsizing.html" },
  "replication":  { label: "S3 Replication", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html" },
  "lifecycle":    { label: "S3 Lifecycle Rules", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html" },
  "failover":     { label: "Route 53 Failover", url: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html" },
  "shared-responsibility": { label: "Shared Responsibility", url: "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/security-and-compliance.html" },
  "support-plans": { label: "AWS Support Plans", url: "https://docs.aws.amazon.com/awssupport/latest/user/getting-started.html" },
  "pricing":      { label: "AWS Pricing Guide", url: "https://docs.aws.amazon.com/whitepapers/latest/how-aws-pricing-works/welcome.html" },
  "ipv6":         { label: "IPv6 on AWS", url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6.html" },
  "bgp":          { label: "Direct Connect BGP", url: "https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithConnections.html" },
  "hybrid-dns":   { label: "Route 53 Resolver", url: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html" },
  "x-ray":        { label: "X-Ray Developer Guide", url: "https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html" },
  "sam":          { label: "SAM Developer Guide", url: "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html" },
  "appsync":      { label: "AppSync Guide", url: "https://docs.aws.amazon.com/appsync/latest/devguide/what-is-appsync.html" },
  "container":    { label: "ECS Developer Guide", url: "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html" },
};

// Azure service keyword → documentation URL mappings
const AZURE_DOCS: Record<string, DocLink> = {
  "vnet":         { label: "Azure VNet Docs", url: "https://learn.microsoft.com/azure/virtual-network/virtual-networks-overview" },
  "vm":           { label: "Azure VM Docs", url: "https://learn.microsoft.com/azure/virtual-machines/overview" },
  "blob":         { label: "Blob Storage Docs", url: "https://learn.microsoft.com/azure/storage/blobs/storage-blobs-overview" },
  "storage":      { label: "Azure Storage Docs", url: "https://learn.microsoft.com/azure/storage/common/storage-introduction" },
  "sql":          { label: "Azure SQL Docs", url: "https://learn.microsoft.com/azure/azure-sql/database/sql-database-paas-overview" },
  "cosmos":       { label: "Cosmos DB Docs", url: "https://learn.microsoft.com/azure/cosmos-db/introduction" },
  "aks":          { label: "AKS Docs", url: "https://learn.microsoft.com/azure/aks/intro-kubernetes" },
  "functions":    { label: "Azure Functions Docs", url: "https://learn.microsoft.com/azure/azure-functions/functions-overview" },
  "app-service":  { label: "App Service Docs", url: "https://learn.microsoft.com/azure/app-service/overview" },
  "ad":           { label: "Entra ID Docs", url: "https://learn.microsoft.com/entra/fundamentals/whatis" },
  "entra":        { label: "Entra ID Docs", url: "https://learn.microsoft.com/entra/fundamentals/whatis" },
  "rbac":         { label: "Azure RBAC Docs", url: "https://learn.microsoft.com/azure/role-based-access-control/overview" },
  "monitor":      { label: "Azure Monitor Docs", url: "https://learn.microsoft.com/azure/azure-monitor/overview" },
  "devops":       { label: "Azure DevOps Docs", url: "https://learn.microsoft.com/azure/devops/user-guide/what-is-azure-devops" },
  "pipeline":     { label: "Azure Pipelines", url: "https://learn.microsoft.com/azure/devops/pipelines/get-started/what-is-azure-pipelines" },
  "key-vault":    { label: "Key Vault Docs", url: "https://learn.microsoft.com/azure/key-vault/general/overview" },
  "nsg":          { label: "NSG Docs", url: "https://learn.microsoft.com/azure/virtual-network/network-security-groups-overview" },
  "firewall":     { label: "Azure Firewall Docs", url: "https://learn.microsoft.com/azure/firewall/overview" },
  "sentinel":     { label: "Microsoft Sentinel", url: "https://learn.microsoft.com/azure/sentinel/overview" },
  "defender":     { label: "Defender for Cloud", url: "https://learn.microsoft.com/azure/defender-for-cloud/defender-for-cloud-introduction" },
  "policy":       { label: "Azure Policy Docs", url: "https://learn.microsoft.com/azure/governance/policy/overview" },
  "arm":          { label: "ARM Templates", url: "https://learn.microsoft.com/azure/azure-resource-manager/management/overview" },
  "bicep":        { label: "Bicep Docs", url: "https://learn.microsoft.com/azure/azure-resource-manager/bicep/overview" },
  "load-balancer": { label: "Load Balancer Docs", url: "https://learn.microsoft.com/azure/load-balancer/load-balancer-overview" },
  "front-door":   { label: "Front Door Docs", url: "https://learn.microsoft.com/azure/frontdoor/front-door-overview" },
  "synapse":      { label: "Synapse Analytics", url: "https://learn.microsoft.com/azure/synapse-analytics/overview-what-is" },
  "data-factory": { label: "Data Factory Docs", url: "https://learn.microsoft.com/azure/data-factory/introduction" },
  "databricks":   { label: "Databricks on Azure", url: "https://learn.microsoft.com/azure/databricks/introduction/" },
  "cognitive":    { label: "Azure AI Services", url: "https://learn.microsoft.com/azure/ai-services/what-are-ai-services" },
  "openai":       { label: "Azure OpenAI Docs", url: "https://learn.microsoft.com/azure/ai-services/openai/overview" },
  "ai-search":    { label: "Azure AI Search", url: "https://learn.microsoft.com/azure/search/search-what-is-azure-search" },
  "computer-vision": { label: "Computer Vision Docs", url: "https://learn.microsoft.com/azure/ai-services/computer-vision/overview" },
  "custom-vision": { label: "Custom Vision Docs", url: "https://learn.microsoft.com/azure/ai-services/custom-vision-service/overview" },
  "language":     { label: "Language Service Docs", url: "https://learn.microsoft.com/azure/ai-services/language-service/overview" },
  "speech":       { label: "Speech Service Docs", url: "https://learn.microsoft.com/azure/ai-services/speech-service/overview" },
  "translator":   { label: "Translator Docs", url: "https://learn.microsoft.com/azure/ai-services/translator/translator-overview" },
  "document-intelligence": { label: "Document Intelligence", url: "https://learn.microsoft.com/azure/ai-services/document-intelligence/overview" },
  "content-safety": { label: "Content Safety Docs", url: "https://learn.microsoft.com/azure/ai-services/content-safety/overview" },
  "responsible-ai": { label: "Responsible AI", url: "https://learn.microsoft.com/azure/machine-learning/concept-responsible-ai" },
  "ml":           { label: "Azure ML Docs", url: "https://learn.microsoft.com/azure/machine-learning/overview-what-is-azure-machine-learning" },
  "bot":          { label: "Bot Service Docs", url: "https://learn.microsoft.com/azure/bot-service/bot-service-overview" },
  "conversational": { label: "Bot Service Docs", url: "https://learn.microsoft.com/azure/bot-service/bot-service-overview" },
  "generative-ai": { label: "Azure OpenAI Docs", url: "https://learn.microsoft.com/azure/ai-services/openai/overview" },
  "nlp":          { label: "Language Service", url: "https://learn.microsoft.com/azure/ai-services/language-service/overview" },
  "event-hub":    { label: "Event Hubs Docs", url: "https://learn.microsoft.com/azure/event-hubs/event-hubs-about" },
  "service-bus":  { label: "Service Bus Docs", url: "https://learn.microsoft.com/azure/service-bus-messaging/service-bus-messaging-overview" },
  "logic-app":    { label: "Logic Apps Docs", url: "https://learn.microsoft.com/azure/logic-apps/logic-apps-overview" },
  "container-instance": { label: "Container Instances", url: "https://learn.microsoft.com/azure/container-instances/container-instances-overview" },
  "container-registry": { label: "Container Registry", url: "https://learn.microsoft.com/azure/container-registry/container-registry-intro" },
  "availability":  { label: "Availability Zones", url: "https://learn.microsoft.com/azure/reliability/availability-zones-overview" },
  "backup":       { label: "Azure Backup Docs", url: "https://learn.microsoft.com/azure/backup/backup-overview" },
  "site-recovery": { label: "Site Recovery Docs", url: "https://learn.microsoft.com/azure/site-recovery/site-recovery-overview" },
  "express-route": { label: "ExpressRoute Docs", url: "https://learn.microsoft.com/azure/expressroute/expressroute-introduction" },
  "vpn-gateway":  { label: "VPN Gateway Docs", url: "https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-about-vpngateways" },
  "dns":          { label: "Azure DNS Docs", url: "https://learn.microsoft.com/azure/dns/dns-overview" },
  "compliance":   { label: "Azure Compliance", url: "https://learn.microsoft.com/azure/compliance/" },
  "purview":      { label: "Microsoft Purview", url: "https://learn.microsoft.com/azure/purview/overview" },
  "stream-analytics": { label: "Stream Analytics", url: "https://learn.microsoft.com/azure/stream-analytics/stream-analytics-introduction" },
  "hdinsight":    { label: "HDInsight Docs", url: "https://learn.microsoft.com/azure/hdinsight/hdinsight-overview" },
  "power-bi":     { label: "Power BI Docs", url: "https://learn.microsoft.com/power-bi/fundamentals/power-bi-overview" },
  "prompt-engineering": { label: "Prompt Engineering", url: "https://learn.microsoft.com/azure/ai-services/openai/concepts/prompt-engineering" },
  "rag-pattern":  { label: "RAG on Azure", url: "https://learn.microsoft.com/azure/search/retrieval-augmented-generation-overview" },
  "luis":         { label: "CLU Documentation", url: "https://learn.microsoft.com/azure/ai-services/language-service/conversational-language-understanding/overview" },
  "clu":          { label: "CLU Documentation", url: "https://learn.microsoft.com/azure/ai-services/language-service/conversational-language-understanding/overview" },
};

// GCP service keyword → documentation URL mappings
const GCP_DOCS: Record<string, DocLink> = {
  "compute":      { label: "Compute Engine Docs", url: "https://cloud.google.com/compute/docs/overview" },
  "compute-engine": { label: "Compute Engine Docs", url: "https://cloud.google.com/compute/docs/overview" },
  "gke":          { label: "GKE Docs", url: "https://cloud.google.com/kubernetes-engine/docs/concepts/kubernetes-engine-overview" },
  "cloud-run":    { label: "Cloud Run Docs", url: "https://cloud.google.com/run/docs/overview/what-is-cloud-run" },
  "app-engine":   { label: "App Engine Docs", url: "https://cloud.google.com/appengine/docs/overview" },
  "cloud-functions": { label: "Cloud Functions Docs", url: "https://cloud.google.com/functions/docs/concepts/overview" },
  "cloud-storage": { label: "Cloud Storage Docs", url: "https://cloud.google.com/storage/docs/introduction" },
  "cloud-sql":    { label: "Cloud SQL Docs", url: "https://cloud.google.com/sql/docs/introduction" },
  "bigquery":     { label: "BigQuery Docs", url: "https://cloud.google.com/bigquery/docs/introduction" },
  "spanner":      { label: "Spanner Docs", url: "https://cloud.google.com/spanner/docs/overview" },
  "firestore":    { label: "Firestore Docs", url: "https://cloud.google.com/firestore/docs/overview" },
  "bigtable":     { label: "Bigtable Docs", url: "https://cloud.google.com/bigtable/docs/overview" },
  "memorystore":  { label: "Memorystore Docs", url: "https://cloud.google.com/memorystore/docs/redis/redis-overview" },
  "vpc":          { label: "VPC Network Docs", url: "https://cloud.google.com/vpc/docs/overview" },
  "vpc-networking": { label: "VPC Network Docs", url: "https://cloud.google.com/vpc/docs/overview" },
  "load-balancing": { label: "Load Balancing Docs", url: "https://cloud.google.com/load-balancing/docs/load-balancing-overview" },
  "cloud-cdn":    { label: "Cloud CDN Docs", url: "https://cloud.google.com/cdn/docs/overview" },
  "cloud-dns":    { label: "Cloud DNS Docs", url: "https://cloud.google.com/dns/docs/overview" },
  "iam":          { label: "IAM Docs", url: "https://cloud.google.com/iam/docs/overview" },
  "iam-roles":    { label: "IAM Roles", url: "https://cloud.google.com/iam/docs/understanding-roles" },
  "org-policies": { label: "Org Policies", url: "https://cloud.google.com/resource-manager/docs/organization-policy/overview" },
  "monitoring":   { label: "Cloud Monitoring", url: "https://cloud.google.com/monitoring/docs/monitoring-overview" },
  "logging":      { label: "Cloud Logging", url: "https://cloud.google.com/logging/docs/overview" },
  "monitoring-logging": { label: "Cloud Operations", url: "https://cloud.google.com/products/operations" },
  "dataflow":     { label: "Dataflow Docs", url: "https://cloud.google.com/dataflow/docs/overview" },
  "dataproc":     { label: "Dataproc Docs", url: "https://cloud.google.com/dataproc/docs/overview" },
  "pub-sub":      { label: "Pub/Sub Docs", url: "https://cloud.google.com/pubsub/docs/overview" },
  "pubsub":       { label: "Pub/Sub Docs", url: "https://cloud.google.com/pubsub/docs/overview" },
  "cloud-build":  { label: "Cloud Build Docs", url: "https://cloud.google.com/build/docs/overview" },
  "artifact":     { label: "Artifact Registry Docs", url: "https://cloud.google.com/artifact-registry/docs/overview" },
  "terraform":    { label: "Terraform on GCP", url: "https://cloud.google.com/docs/terraform" },
  "billing":      { label: "Billing Docs", url: "https://cloud.google.com/billing/docs/concepts" },
  "gcloud":       { label: "gcloud CLI Reference", url: "https://cloud.google.com/sdk/gcloud/reference" },
  "gcloud-cli":   { label: "gcloud CLI Reference", url: "https://cloud.google.com/sdk/gcloud/reference" },
  "migs":         { label: "Managed Instance Groups", url: "https://cloud.google.com/compute/docs/instance-groups" },
  "autoscaling":  { label: "Autoscaler Docs", url: "https://cloud.google.com/compute/docs/autoscaler" },
  "vertex":       { label: "Vertex AI Docs", url: "https://cloud.google.com/vertex-ai/docs/start/introduction-unified-platform" },
  "automl":       { label: "AutoML Docs", url: "https://cloud.google.com/vertex-ai/docs/training/automl-api" },
  "ai-platform":  { label: "Vertex AI Docs", url: "https://cloud.google.com/vertex-ai/docs/start/introduction-unified-platform" },
  "ml-engine":    { label: "Vertex AI Training", url: "https://cloud.google.com/vertex-ai/docs/training/overview" },
  "data-catalog": { label: "Data Catalog Docs", url: "https://cloud.google.com/data-catalog/docs/concepts/overview" },
  "composer":     { label: "Cloud Composer Docs", url: "https://cloud.google.com/composer/docs/concepts/overview" },
  "looker":       { label: "Looker Docs", url: "https://cloud.google.com/looker/docs/intro" },
  "data-fusion":  { label: "Data Fusion Docs", url: "https://cloud.google.com/data-fusion/docs/concepts/overview" },
  "network-security": { label: "Network Security", url: "https://cloud.google.com/security/overview/whitepaper" },
  "interconnect": { label: "Cloud Interconnect", url: "https://cloud.google.com/network-connectivity/docs/interconnect/concepts/overview" },
  "armor":        { label: "Cloud Armor Docs", url: "https://cloud.google.com/armor/docs/cloud-armor-overview" },
};

// CompTIA topic → resource URL mappings
const COMPTIA_DOCS: Record<string, DocLink> = {
  "network":      { label: "CompTIA Network+ Resources", url: "https://www.comptia.org/certifications/network" },
  "security":     { label: "CompTIA Security+ Resources", url: "https://www.comptia.org/certifications/security" },
  "cryptography": { label: "Cryptography Guide", url: "https://www.comptia.org/blog/what-is-cryptography" },
  "firewall":     { label: "Firewall Guide", url: "https://www.comptia.org/content/guides/what-is-a-firewall" },
  "malware":      { label: "Malware Guide", url: "https://www.comptia.org/content/guides/what-is-malware" },
  "linux":        { label: "CompTIA Linux+ Resources", url: "https://www.comptia.org/certifications/linux" },
  "cloud":        { label: "CompTIA Cloud+ Resources", url: "https://www.comptia.org/certifications/cloud" },
  "pentest":      { label: "CompTIA PenTest+ Resources", url: "https://www.comptia.org/certifications/pentest" },
  "hardware":     { label: "CompTIA A+ Resources", url: "https://www.comptia.org/certifications/a" },
  "troubleshoot": { label: "CompTIA A+ Resources", url: "https://www.comptia.org/certifications/a" },
  "virtualization": { label: "Virtualization Guide", url: "https://www.comptia.org/content/guides/what-is-virtualization" },
  "identity":     { label: "IAM Guide", url: "https://www.comptia.org/content/guides/what-is-identity-and-access-management" },
  "incident":     { label: "Incident Response Guide", url: "https://www.comptia.org/content/guides/what-is-incident-response" },
  "vulnerability": { label: "Vulnerability Mgmt", url: "https://www.comptia.org/content/guides/what-is-vulnerability-management" },
  "wireless":     { label: "Wireless Guide", url: "https://www.comptia.org/content/guides/wireless-networking" },
  "dns":          { label: "DNS Guide", url: "https://www.comptia.org/content/guides/what-is-dns" },
  "tcp":          { label: "TCP/IP Guide", url: "https://www.comptia.org/content/guides/what-is-a-network-protocol" },
  "subnetting":   { label: "Subnetting Guide", url: "https://www.comptia.org/content/guides/what-is-subnetting" },
  "risk":         { label: "Risk Mgmt Guide", url: "https://www.comptia.org/content/guides/what-is-cybersecurity-risk-management" },
  "compliance":   { label: "Compliance Guide", url: "https://www.comptia.org/content/guides/a-guide-to-compliance" },
  "forensics":    { label: "Digital Forensics", url: "https://www.comptia.org/content/guides/what-is-computer-forensics" },
  "social-engineering": { label: "Social Engineering", url: "https://www.comptia.org/content/guides/what-is-social-engineering" },
  "pki":          { label: "PKI Guide", url: "https://www.comptia.org/content/guides/what-is-pki" },
  "osi":          { label: "OSI Model Guide", url: "https://www.comptia.org/content/guides/what-is-the-osi-model" },
  "permissions":  { label: "Linux Permissions", url: "https://www.comptia.org/content/guides/linux-file-permissions" },
  "bash":         { label: "Bash Scripting", url: "https://www.comptia.org/content/guides/bash-scripting-basics" },
  "kernel":       { label: "Linux Kernel Guide", url: "https://www.comptia.org/content/guides/what-is-a-linux-kernel" },
  "process":      { label: "Linux Processes", url: "https://www.comptia.org/content/guides/managing-linux-processes" },
  "package":      { label: "Package Management", url: "https://www.comptia.org/content/guides/linux-package-management" },
  "storage":      { label: "Linux Storage", url: "https://www.comptia.org/content/guides/linux-storage-management" },
  "siem":         { label: "SIEM Guide", url: "https://www.comptia.org/content/guides/what-is-siem" },
  "ids":          { label: "IDS/IPS Guide", url: "https://www.comptia.org/content/guides/what-is-an-intrusion-detection-system" },
  "exploit":      { label: "Exploit Guide", url: "https://www.comptia.org/content/guides/what-is-an-exploit" },
  "recon":        { label: "Reconnaissance Guide", url: "https://www.comptia.org/content/guides/what-is-network-reconnaissance" },
};

// NVIDIA topic → resource URL mappings
const NVIDIA_DOCS: Record<string, DocLink> = {
  "gpu":          { label: "NVIDIA GPU Docs", url: "https://docs.nvidia.com/datacenter/tesla/index.html" },
  "cuda":         { label: "CUDA Toolkit Docs", url: "https://docs.nvidia.com/cuda/" },
  "tensorrt":     { label: "TensorRT Docs", url: "https://docs.nvidia.com/deeplearning/tensorrt/developer-guide/" },
  "triton":       { label: "Triton Server Docs", url: "https://docs.nvidia.com/deeplearning/triton-inference-server/" },
  "nemo":         { label: "NeMo Framework", url: "https://docs.nvidia.com/nemo-framework/user-guide/latest/overview.html" },
  "riva":         { label: "Riva Docs", url: "https://docs.nvidia.com/deeplearning/riva/user-guide/docs/overview.html" },
  "tao":          { label: "TAO Toolkit Docs", url: "https://docs.nvidia.com/tao/tao-toolkit/index.html" },
  "dali":         { label: "DALI Docs", url: "https://docs.nvidia.com/deeplearning/dali/user-guide/docs/" },
  "rapids":       { label: "RAPIDS Docs", url: "https://docs.rapids.ai/" },
  "dgx":          { label: "DGX Docs", url: "https://docs.nvidia.com/dgx/" },
  "networking":   { label: "NVIDIA Networking", url: "https://docs.nvidia.com/networking/" },
  "infiniband":   { label: "InfiniBand Docs", url: "https://docs.nvidia.com/networking/display/infiniband" },
  "spectrum":     { label: "Spectrum Docs", url: "https://docs.nvidia.com/networking/display/spectrum" },
  "bluefield":    { label: "BlueField DPU Docs", url: "https://docs.nvidia.com/networking/display/bluefield" },
  "nccl":         { label: "NCCL Docs", url: "https://docs.nvidia.com/deeplearning/nccl/" },
  "openusd":      { label: "OpenUSD Docs", url: "https://docs.omniverse.nvidia.com/usd/latest/index.html" },
  "omniverse":    { label: "Omniverse Docs", url: "https://docs.omniverse.nvidia.com/" },
  "genai":        { label: "NVIDIA Generative AI", url: "https://docs.nvidia.com/nemo-framework/user-guide/latest/overview.html" },
  "llm":          { label: "NeMo LLM Guide", url: "https://docs.nvidia.com/nemo-framework/user-guide/latest/llms/index.html" },
  "multimodal":   { label: "NeMo Multimodal", url: "https://docs.nvidia.com/nemo-framework/user-guide/latest/multimodal/index.html" },
  "inference":    { label: "Inference Guide", url: "https://docs.nvidia.com/deeplearning/triton-inference-server/" },
  "training":     { label: "DL Training Guide", url: "https://docs.nvidia.com/deeplearning/performance/index.html" },
  "data-science": { label: "RAPIDS Data Science", url: "https://docs.rapids.ai/" },
  "agentic":      { label: "NVIDIA AI Agents", url: "https://developer.nvidia.com/nemo-microservices" },
  "ai-ops":       { label: "NVIDIA AI Ops", url: "https://docs.nvidia.com/ai-enterprise/latest/index.html" },
  "ai-infra":     { label: "AI Infrastructure", url: "https://docs.nvidia.com/ai-enterprise/latest/index.html" },
};

/**
 * Detect the cloud provider from a concept ID.
 * Patterns: aws-saa-xxx, az104-xxx, ace-xxx (GCP), comptia-sec-xxx, nvidia-ncp-xxx
 */
function detectProvider(conceptId: string): "aws" | "azure" | "gcp" | "comptia" | "nvidia" | null {
  if (conceptId.startsWith("aws-")) return "aws";
  if (conceptId.startsWith("az") || conceptId.startsWith("dp") || conceptId.startsWith("sc") || conceptId.startsWith("ai")) {
    // Azure exams: az104, az204, az305, az400, az500, az900, dp203, dp300, dp900, sc900, ai102, ai900
    const prefix = conceptId.split("-")[0];
    if (/^(az|dp|sc|ai)\d+$/.test(prefix)) return "azure";
  }
  if (conceptId.startsWith("ace-") || conceptId.startsWith("pca-") || conceptId.startsWith("pcd") ||
      conceptId.startsWith("pcne-") || conceptId.startsWith("pcse-") || conceptId.startsWith("pde-") ||
      conceptId.startsWith("pmle-") || conceptId.startsWith("cdl-")) return "gcp";
  if (conceptId.startsWith("comptia-")) return "comptia";
  if (conceptId.startsWith("nvidia-")) return "nvidia";
  return null;
}

/**
 * Extract service/topic keywords from a concept ID.
 * e.g. "aws-saa-kms-encryption" → ["kms", "encryption", "kms-encryption"]
 *      "az104-vnet-peering" → ["vnet", "peering", "vnet-peering"]
 */
function extractKeywords(conceptId: string): string[] {
  const parts = conceptId.split("-");
  const keywords: string[] = [];

  // Skip provider and exam prefixes
  let startIdx = 0;
  if (parts[0] === "aws" || parts[0] === "comptia" || parts[0] === "nvidia") {
    startIdx = 2; // skip "aws-saa" or "comptia-sec" or "nvidia-ncp"
    if (parts[0] === "nvidia") startIdx = 3; // skip "nvidia-ncp-xxx" → start at topic
  } else {
    startIdx = 1; // skip "az104" or "ace" or "pca"
  }

  const topicParts = parts.slice(startIdx);
  if (topicParts.length === 0) return [];

  // Add individual keywords
  for (const p of topicParts) {
    if (p.length > 1) keywords.push(p);
  }

  // Add compound keywords (e.g., "kms-encryption", "multi-az")
  if (topicParts.length >= 2) {
    keywords.push(topicParts.join("-"));
    // Also try first two parts as compound
    keywords.push(topicParts.slice(0, 2).join("-"));
  }

  return keywords;
}

/**
 * Dynamically generate documentation links for any concept ID.
 */
function generateDocLinks(conceptId: string): DocLink[] {
  const provider = detectProvider(conceptId);
  if (!provider) return [];

  const keywords = extractKeywords(conceptId);
  if (keywords.length === 0) return [];

  const docsMap = {
    aws: AWS_DOCS,
    azure: AZURE_DOCS,
    gcp: GCP_DOCS,
    comptia: COMPTIA_DOCS,
    nvidia: NVIDIA_DOCS,
  }[provider];

  const links: DocLink[] = [];
  const seenUrls = new Set<string>();

  // Try compound keywords first (more specific), then individual
  for (const keyword of keywords) {
    const doc = docsMap[keyword];
    if (doc && !seenUrls.has(doc.url)) {
      seenUrls.add(doc.url);
      links.push(doc);
    }
  }

  // Limit to 3 most relevant links
  return links.slice(0, 3);
}

function getDocLinksForQuestion(question: Question): DocLink[] {
  const links: DocLink[] = [];
  const seen = new Set<string>();
  for (const conceptId of question.concept_ids || []) {
    for (const link of generateDocLinks(conceptId)) {
      if (!seen.has(link.url)) {
        seen.add(link.url);
        links.push(link);
      }
    }
  }
  // Cap at 4 links per question
  return links.slice(0, 4);
}

/** Human-friendly provider label for the doc links section header */
function getProviderLabel(question: Question): string {
  const firstConcept = question.concept_ids?.[0] || "";
  const provider = detectProvider(firstConcept);
  switch (provider) {
    case "aws": return "AWS Documentation";
    case "azure": return "Azure Documentation";
    case "gcp": return "Google Cloud Documentation";
    case "comptia": return "CompTIA Resources";
    case "nvidia": return "NVIDIA Documentation";
    default: return "Documentation";
  }
}

interface AnswerFeedbackProps {
  question: Question;
  selectedOption: string;
  result: AnswerResult;
  onNext: () => void;
}

export function AnswerFeedback({
  question,
  selectedOption,
  result,
  onNext,
}: AnswerFeedbackProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const handleToggleExplanation = async () => {
    if (!showExplanation && !explanationText) {
      setLoadingExplanation(true);
      try {
        const data = await api.getExplanation(question.id);
        setExplanationText(data.explanation.text || data.explanation.why_correct || "");
      } catch {
        setExplanationText("Could not load explanation.");
      }
      setLoadingExplanation(false);
    }
    setShowExplanation(!showExplanation);
  };

  const mu = result.mastery_update;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Result banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl p-4",
          result.correct
            ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700"
            : "bg-gradient-to-r from-red-50 to-rose-50 text-red-700"
        )}
      >
        {result.correct ? <Check className="h-8 w-8" /> : <X className="h-8 w-8" />}
        <span className="text-xl font-bold">
          {result.correct ? "Correct!" : "Incorrect"}
        </span>
        {result.misconception_detected && (
          <span className="ml-auto rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600">
            Misconception detected
          </span>
        )}
      </div>

      {/* Question with highlighted options */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
        <p className="mb-4 text-base leading-relaxed text-stone-800">{question.stem}</p>
        <div className="space-y-2">
          {question.options.map((option) => {
            const isCorrect = option.id === result.correct_option;
            const isSelected = option.id === selectedOption;
            const isWrong = isSelected && !result.correct;

            return (
              <div
                key={option.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  isCorrect
                    ? "border-green-300 bg-green-50"
                    : isWrong
                      ? "border-red-300 bg-red-50"
                      : "border-stone-200 bg-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold",
                    isCorrect
                      ? "bg-green-600 text-white"
                      : isWrong
                        ? "bg-red-600 text-white"
                        : "bg-stone-200 text-stone-500"
                  )}
                >
                  {option.id}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isCorrect ? "text-green-700" : isWrong ? "text-red-700" : "text-stone-500"
                  )}
                >
                  {option.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mastery update */}
      {mu && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-2 text-base">
            <span className="font-medium text-stone-800">{mu.concept_name}</span>
            <span
              className={cn(
                "font-mono",
                mu.mastery_after > mu.mastery_before ? "text-green-600" : "text-red-600"
              )}
            >
              {Math.round(mu.mastery_before * 100)}% → {Math.round(mu.mastery_after * 100)}%
              {mu.mastery_after > mu.mastery_before ? " ↑" : " ↓"}
            </span>
          </div>
          {result.propagation_updates.map((p) => (
            <div
              key={p.concept_id}
              className="flex items-center justify-between rounded-lg bg-stone-100 px-4 py-1 text-xs text-amber-600"
            >
              <span>{p.concept_id}</span>
              <span>+{(p.mastery_delta * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Misconception warning */}
      {result.misconception_detected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-700">
            <AlertTriangle className="h-6 w-6" />
            Misconception Detected
          </div>
          <p className="text-base text-amber-600">
            You answered quickly with high confidence but got it wrong.
            This suggests a common misconception. Review the explanation carefully.
          </p>
        </div>
      )}

      {/* Explanation toggle */}
      <button
        onClick={handleToggleExplanation}
        className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:border-amber-500"
      >
        {loadingExplanation ? "Loading..." : "Show Explanation"}
        {showExplanation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {showExplanation && explanationText && (
        <div className="space-y-3">
          <div className="rounded-lg border border-stone-200 bg-stone-100 px-4 py-3 text-sm leading-6 text-stone-700">
            {explanationText}
          </div>

          {/* Documentation Links */}
          {getDocLinksForQuestion(question).length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-400">
                {getProviderLabel(question)}
              </p>
              <div className="flex flex-wrap gap-2">
                {getDocLinksForQuestion(question).map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-amber-600 transition-all hover:border-amber-400 hover:shadow-sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Next button */}
      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-bold text-white hover:scale-[1.02] transition-all duration-200"
      >
        Next Question
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
