import Link from "next/link";
import { Brain, Clock, TrendingUp, Shield, Cloud, Database, Code, Network, Bot, BarChart3, Server, Lock, Cpu, Globe, KeyRound, FileText, Workflow, Container, Activity, HardDrive, LogIn } from "lucide-react";
import { CertTabs } from "@/components/landing/cert-tabs";

const features = [
  {
    icon: Brain,
    title: "Adaptive Learning",
    description:
      "AI-powered question selection targets your weakest areas, maximizing every minute of study time.",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-500",
  },
  {
    icon: Clock,
    title: "Spaced Repetition",
    description:
      "Scientifically-timed reviews ensure concepts move from short-term to long-term memory.",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-500",
  },
  {
    icon: TrendingUp,
    title: "Real-time Progress",
    description:
      "Track mastery across every domain and concept with live readiness scores and pass predictions.",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
];

interface CertCard {
  code: string;
  name: string;
  shortName: string;
  icon: typeof Cloud;
  questions: number;
  time: number;
  passingPct: number;
  color: string;
  borderColor: string;
}

export type { CertCard };

export const awsCertifications: Record<string, CertCard[]> = {
  Foundational: [
    { code: "CLF-C02", name: "AWS Certified Cloud Practitioner", shortName: "Cloud Practitioner", icon: Cloud, questions: 65, time: 90, passingPct: 70, color: "bg-sky-50 text-sky-700", borderColor: "hover:border-sky-400" },
    { code: "AIF-C01", name: "AWS Certified AI Practitioner", shortName: "AI Practitioner", icon: Bot, questions: 65, time: 90, passingPct: 70, color: "bg-violet-50 text-violet-700", borderColor: "hover:border-violet-400" },
  ],
  Associate: [
    { code: "SAA-C03", name: "AWS Certified Solutions Architect - Associate", shortName: "Solutions Architect", icon: Server, questions: 65, time: 130, passingPct: 72, color: "bg-amber-50 text-amber-700", borderColor: "hover:border-amber-400" },
    { code: "DVA-C02", name: "AWS Certified Developer - Associate", shortName: "Developer", icon: Code, questions: 65, time: 130, passingPct: 72, color: "bg-blue-50 text-blue-700", borderColor: "hover:border-blue-400" },
    { code: "SOA-C02", name: "AWS Certified SysOps Administrator - Associate", shortName: "SysOps Admin", icon: BarChart3, questions: 65, time: 130, passingPct: 72, color: "bg-green-50 text-green-700", borderColor: "hover:border-green-400" },
    { code: "DEA-C01", name: "AWS Certified Data Engineer - Associate", shortName: "Data Engineer", icon: Database, questions: 65, time: 130, passingPct: 72, color: "bg-orange-50 text-orange-700", borderColor: "hover:border-orange-400" },
    { code: "MLA-C01", name: "AWS Certified ML Engineer - Associate", shortName: "ML Engineer", icon: Brain, questions: 65, time: 170, passingPct: 72, color: "bg-purple-50 text-purple-700", borderColor: "hover:border-purple-400" },
  ],
  Professional: [
    { code: "SAP-C02", name: "AWS Certified Solutions Architect - Professional", shortName: "SA Professional", icon: Server, questions: 75, time: 180, passingPct: 75, color: "bg-amber-50 text-amber-700", borderColor: "hover:border-amber-400" },
    { code: "DOP-C02", name: "AWS Certified DevOps Engineer - Professional", shortName: "DevOps Pro", icon: Code, questions: 75, time: 180, passingPct: 75, color: "bg-blue-50 text-blue-700", borderColor: "hover:border-blue-400" },
    { code: "AIP-C01", name: "AWS Certified GenAI Developer - Professional", shortName: "GenAI Developer", icon: Bot, questions: 75, time: 180, passingPct: 75, color: "bg-violet-50 text-violet-700", borderColor: "hover:border-violet-400" },
  ],
  Specialty: [
    { code: "SCS-C02", name: "AWS Certified Security - Specialty", shortName: "Security", icon: Lock, questions: 65, time: 170, passingPct: 75, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "DBS-C01", name: "AWS Certified Database - Specialty", shortName: "Database", icon: Database, questions: 65, time: 180, passingPct: 75, color: "bg-emerald-50 text-emerald-700", borderColor: "hover:border-emerald-400" },
    { code: "ANS-C01", name: "AWS Certified Advanced Networking - Specialty", shortName: "Networking", icon: Network, questions: 65, time: 170, passingPct: 75, color: "bg-cyan-50 text-cyan-700", borderColor: "hover:border-cyan-400" },
    { code: "MLS-C01", name: "AWS Certified Machine Learning - Specialty", shortName: "Machine Learning", icon: Brain, questions: 65, time: 170, passingPct: 75, color: "bg-purple-50 text-purple-700", borderColor: "hover:border-purple-400" },
  ],
};

export const azureCertifications: Record<string, CertCard[]> = {
  Fundamentals: [
    { code: "AZ-900", name: "Microsoft Azure Fundamentals", shortName: "Azure Fundamentals", icon: Cloud, questions: 45, time: 85, passingPct: 70, color: "bg-blue-50 text-blue-700", borderColor: "hover:border-blue-400" },
    { code: "AI-900", name: "Microsoft Azure AI Fundamentals", shortName: "AI Fundamentals", icon: Bot, questions: 45, time: 85, passingPct: 70, color: "bg-violet-50 text-violet-700", borderColor: "hover:border-violet-400" },
    { code: "DP-900", name: "Microsoft Azure Data Fundamentals", shortName: "Data Fundamentals", icon: Database, questions: 45, time: 85, passingPct: 70, color: "bg-cyan-50 text-cyan-700", borderColor: "hover:border-cyan-400" },
    { code: "SC-900", name: "Microsoft Security Fundamentals", shortName: "Security Fundamentals", icon: Shield, questions: 45, time: 85, passingPct: 70, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
  ],
  Associate: [
    { code: "AZ-104", name: "Microsoft Azure Administrator", shortName: "Administrator", icon: Server, questions: 50, time: 120, passingPct: 70, color: "bg-blue-50 text-blue-700", borderColor: "hover:border-blue-400" },
    { code: "AZ-204", name: "Microsoft Azure Developer", shortName: "Developer", icon: Code, questions: 50, time: 120, passingPct: 70, color: "bg-indigo-50 text-indigo-700", borderColor: "hover:border-indigo-400" },
    { code: "AZ-500", name: "Microsoft Azure Security Engineer", shortName: "Security Engineer", icon: Lock, questions: 50, time: 120, passingPct: 70, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "DP-300", name: "Microsoft Azure Database Administrator", shortName: "Database Admin", icon: Database, questions: 50, time: 120, passingPct: 70, color: "bg-emerald-50 text-emerald-700", borderColor: "hover:border-emerald-400" },
    { code: "AI-102", name: "Microsoft Azure AI Engineer", shortName: "AI Engineer", icon: Brain, questions: 50, time: 120, passingPct: 70, color: "bg-purple-50 text-purple-700", borderColor: "hover:border-purple-400" },
    { code: "DP-203", name: "Microsoft Azure Data Engineer", shortName: "Data Engineer", icon: Workflow, questions: 50, time: 120, passingPct: 70, color: "bg-orange-50 text-orange-700", borderColor: "hover:border-orange-400" },
  ],
  Expert: [
    { code: "AZ-305", name: "Microsoft Azure Solutions Architect Expert", shortName: "Solutions Architect", icon: Server, questions: 50, time: 120, passingPct: 70, color: "bg-blue-50 text-blue-700", borderColor: "hover:border-blue-400" },
    { code: "AZ-400", name: "Microsoft Azure DevOps Engineer Expert", shortName: "DevOps Engineer", icon: Container, questions: 50, time: 120, passingPct: 70, color: "bg-teal-50 text-teal-700", borderColor: "hover:border-teal-400" },
  ],
};

export const gcpCertifications: Record<string, CertCard[]> = {
  Foundational: [
    { code: "CDL", name: "Google Cloud Digital Leader", shortName: "Cloud Digital Leader", icon: Globe, questions: 50, time: 90, passingPct: 70, color: "bg-blue-50 text-blue-700", borderColor: "hover:border-blue-400" },
  ],
  Associate: [
    { code: "ACE", name: "Google Associate Cloud Engineer", shortName: "Cloud Engineer", icon: Server, questions: 50, time: 120, passingPct: 70, color: "bg-green-50 text-green-700", borderColor: "hover:border-green-400" },
  ],
  Professional: [
    { code: "PCA", name: "Google Professional Cloud Architect", shortName: "Cloud Architect", icon: Server, questions: 50, time: 120, passingPct: 70, color: "bg-blue-50 text-blue-700", borderColor: "hover:border-blue-400" },
    { code: "PCD", name: "Google Professional Cloud Developer", shortName: "Cloud Developer", icon: Code, questions: 50, time: 120, passingPct: 70, color: "bg-indigo-50 text-indigo-700", borderColor: "hover:border-indigo-400" },
    { code: "PDE", name: "Google Professional Data Engineer", shortName: "Data Engineer", icon: Database, questions: 50, time: 120, passingPct: 70, color: "bg-orange-50 text-orange-700", borderColor: "hover:border-orange-400" },
    { code: "PCSE", name: "Google Professional Cloud Security Engineer", shortName: "Security Engineer", icon: Lock, questions: 50, time: 120, passingPct: 70, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "PCNE", name: "Google Professional Cloud Network Engineer", shortName: "Network Engineer", icon: Network, questions: 50, time: 120, passingPct: 70, color: "bg-cyan-50 text-cyan-700", borderColor: "hover:border-cyan-400" },
    { code: "PCDE", name: "Google Professional Cloud Database Engineer", shortName: "Database Engineer", icon: HardDrive, questions: 50, time: 120, passingPct: 70, color: "bg-emerald-50 text-emerald-700", borderColor: "hover:border-emerald-400" },
    { code: "PMLE", name: "Google Professional ML Engineer", shortName: "ML Engineer", icon: Brain, questions: 50, time: 120, passingPct: 70, color: "bg-purple-50 text-purple-700", borderColor: "hover:border-purple-400" },
    { code: "PCDOE", name: "Google Professional Cloud DevOps Engineer", shortName: "DevOps Engineer", icon: Activity, questions: 50, time: 120, passingPct: 70, color: "bg-teal-50 text-teal-700", borderColor: "hover:border-teal-400" },
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SparkUpCloud",
  url: "https://sparkupcloud.com",
  description:
    "AI-powered certification exam preparation platform for AWS, Azure, and Google Cloud certifications",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier with 10 questions per day",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "150",
  },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-violet-50/30">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 border-b border-stone-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="SparkUpCloud" className="h-8 w-auto" />
            <span className="text-lg font-bold text-stone-900">
              Spark<span className="text-amber-500">Up</span>Cloud
            </span>
          </Link>

          {/* Auth Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:border-amber-400 hover:text-amber-600 hover:shadow-md"
            >
              <LogIn className="h-4 w-4" />
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:scale-105 hover:shadow-md"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-16 pb-24 text-center">
        <img src="/logo.svg" alt="SparkUpCloud" className="mb-10 h-40 w-auto" />
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-stone-900 sm:text-6xl lg:text-7xl">
          Master Your{" "}
          <span className="relative inline-block">
            Certification
            <span className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-amber-500" />
          </span>{" "}
          Exam
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-stone-600">
          AI-powered adaptive learning for AWS, Azure, and Google Cloud certifications.
          Concept tutorials, practice questions, and hands-on labs — all in one place.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-base font-bold text-white shadow-md shadow-stone-200/60 hover:scale-105 transition-all"
          >
            Get Started Free
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            View Pricing &rarr;
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-stone-500 sm:gap-6">
          <span>36+ Certifications</span>
          <span className="hidden sm:inline h-1 w-1 rounded-full bg-amber-400" />
          <span>500+ Questions</span>
          <span className="hidden sm:inline h-1 w-1 rounded-full bg-amber-400" />
          <span>Video Tutorials</span>
          <span className="hidden sm:inline h-1 w-1 rounded-full bg-amber-400" />
          <span>Hands-on Labs</span>
        </div>
      </section>

      {/* Certifications with Provider Tabs */}
      <CertTabs />

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            How It Works
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="animate-fadeInUp rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60"
              style={index > 0 ? { animationDelay: `${index * 0.1}s` } : undefined}
            >
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-lg ${feature.iconBg}`}>
                <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold text-stone-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-base leading-6 text-stone-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-12 text-center shadow-lg sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to ace your certification?
          </h2>
          <p className="mt-3 text-base text-amber-100">
            Join thousands of professionals preparing with AI-powered learning.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-base font-bold text-amber-600 shadow-md transition-all hover:scale-105"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 justify-center rounded-lg border-2 border-white/40 px-8 text-base font-semibold text-white transition-all hover:bg-white/10"
            >
              <LogIn className="h-4 w-4" />
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="SparkUpCloud" className="h-6 w-auto" />
            <span className="text-sm font-semibold text-stone-700">
              Spark<span className="text-amber-500">Up</span>Cloud
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Trusted by professionals preparing for cloud certifications worldwide
          </p>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/login" className="text-stone-500 transition-colors hover:text-amber-600">
              Log In
            </Link>
            <Link href="/register" className="text-stone-500 transition-colors hover:text-amber-600">
              Register
            </Link>
            <Link href="/contact" className="text-stone-500 transition-colors hover:text-amber-600">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
