"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, ArrowRight, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Question, AnswerResult, ConceptDetail } from "@/lib/api-types";

// Map concept IDs to relevant AWS doc links
const conceptDocLinks: Record<string, { label: string; url: string }[]> = {
  "aws-sap-vpc-peering": [
    { label: "VPC Peering Guide", url: "https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html" },
  ],
  "aws-sap-transit-gateway": [
    { label: "Transit Gateway Guide", url: "https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html" },
    { label: "TGW Network Manager", url: "https://docs.aws.amazon.com/network-manager/latest/tgwnm/what-are-global-networks.html" },
  ],
  "aws-sap-direct-connect": [
    { label: "Direct Connect Guide", url: "https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html" },
  ],
  "aws-sap-site-to-site-vpn": [
    { label: "Site-to-Site VPN Guide", url: "https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html" },
  ],
  "aws-sap-privatelink": [
    { label: "PrivateLink Guide", url: "https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html" },
  ],
  "aws-sap-vpc-fundamentals": [
    { label: "VPC User Guide", url: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html" },
  ],
  "aws-sap-security-groups": [
    { label: "Security Groups for VPC", url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html" },
  ],
  "aws-sap-nacls": [
    { label: "Network ACLs", url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html" },
  ],
  "aws-sap-organizations": [
    { label: "AWS Organizations Guide", url: "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html" },
    { label: "SCP Documentation", url: "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html" },
  ],
  "aws-sap-control-tower": [
    { label: "Control Tower Guide", url: "https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html" },
  ],
  "aws-sap-iam-advanced": [
    { label: "IAM Policy Evaluation", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html" },
    { label: "Permission Boundaries", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html" },
  ],
  "aws-sap-lambda": [
    { label: "Lambda Developer Guide", url: "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html" },
  ],
  "aws-sap-ecs-fargate": [
    { label: "ECS Developer Guide", url: "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html" },
    { label: "Fargate User Guide", url: "https://docs.aws.amazon.com/AmazonECS/latest/userguide/what-is-fargate.html" },
  ],
  "aws-sap-s3-storage-classes": [
    { label: "S3 Storage Classes", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html" },
  ],
  "aws-sap-s3-lifecycle": [
    { label: "S3 Lifecycle Configuration", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html" },
  ],
  "aws-sap-rds-aurora": [
    { label: "Aurora User Guide", url: "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html" },
    { label: "RDS User Guide", url: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html" },
  ],
  "aws-sap-dynamodb": [
    { label: "DynamoDB Developer Guide", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html" },
  ],
  "aws-sap-migration-strategies": [
    { label: "Migration Strategies", url: "https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html" },
  ],
  "aws-sap-dms": [
    { label: "DMS User Guide", url: "https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html" },
    { label: "Schema Conversion Tool", url: "https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Welcome.html" },
  ],
  "aws-sap-cost-optimization": [
    { label: "Savings Plans Guide", url: "https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html" },
    { label: "EC2 Pricing", url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-purchasing-options.html" },
  ],
};

function getDocLinksForQuestion(question: Question): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const conceptId of question.concept_ids || []) {
    for (const link of conceptDocLinks[conceptId] || []) {
      if (!seen.has(link.url)) {
        seen.add(link.url);
        links.push(link);
      }
    }
  }
  return links;
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

          {/* AWS Documentation Links */}
          {getDocLinksForQuestion(question).length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-400">
                AWS Documentation
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
