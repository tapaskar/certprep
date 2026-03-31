"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  awsCertifications,
  azureCertifications,
  gcpCertifications,
} from "@/app/page";
import type { CertCard } from "@/app/page";

type Provider = "aws" | "azure" | "gcp";

const providers: { key: Provider; label: string; color: string; activeColor: string }[] = [
  { key: "aws", label: "AWS", color: "text-amber-600", activeColor: "bg-amber-500 text-white" },
  { key: "azure", label: "Azure", color: "text-blue-600", activeColor: "bg-blue-500 text-white" },
  { key: "gcp", label: "Google Cloud", color: "text-green-600", activeColor: "bg-green-500 text-white" },
];

const certData: Record<Provider, Record<string, CertCard[]>> = {
  aws: awsCertifications,
  azure: azureCertifications,
  gcp: gcpCertifications,
};

const levelColors: Record<string, string> = {
  Foundational: "text-sky-600",
  Fundamentals: "text-sky-600",
  Associate: "text-amber-600",
  Professional: "text-violet-600",
  Specialty: "text-red-600",
  Expert: "text-violet-600",
};

const sectionTitles: Record<Provider, string> = {
  aws: "AWS Certifications",
  azure: "Microsoft Azure Certifications",
  gcp: "Google Cloud Certifications",
};

const sectionSubtitles: Record<Provider, string> = {
  aws: "From Cloud Practitioner to Professional and Specialty — 14 certifications.",
  azure: "From Azure Fundamentals to Expert — 12 certifications.",
  gcp: "From Cloud Digital Leader to Professional — 10 certifications.",
};

export function CertTabs() {
  const [active, setActive] = useState<Provider>("aws");
  const certs = certData[active];

  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          All Cloud Certifications
        </h2>
        <p className="mt-3 text-base text-stone-500">
          AWS, Azure, and Google Cloud — 36+ certifications in one platform.
        </p>
      </div>

      {/* Provider tabs */}
      <div className="mb-10 flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-xl bg-stone-100 p-1">
          {providers.map((p) => (
            <button
              key={p.key}
              onClick={() => setActive(p.key)}
              className={cn(
                "rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
                active === p.key
                  ? p.activeColor + " shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section heading */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-stone-900">
          {sectionTitles[active]}
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          {sectionSubtitles[active]}
        </p>
      </div>

      {/* Level groups */}
      {Object.entries(certs).map(([level, items]) => (
        <div key={level} className="mb-10">
          <h4
            className={cn(
              "mb-4 text-sm font-bold uppercase tracking-widest",
              levelColors[level] || "text-stone-600"
            )}
          >
            {level}
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((cert) => (
              <Link
                key={cert.code}
                href="/register"
                className={cn(
                  "group rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
                  cert.borderColor
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      cert.color.split(" ")[0]
                    )}
                  >
                    <cert.icon
                      className={cn("h-5 w-5", cert.color.split(" ")[1])}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{cert.shortName}</p>
                    <p className="text-xs text-stone-400">{cert.code}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-stone-500">
                  <span>{cert.questions} Qs</span>
                  <span>{cert.time} min</span>
                  <span>{cert.passingPct}% pass</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
