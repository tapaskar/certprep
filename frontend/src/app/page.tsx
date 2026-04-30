import Link from "next/link";
import { Brain, Clock, TrendingUp, Shield, Cloud, Database, Code, Network, Bot, BarChart3, Server, Lock, Cpu, Globe, KeyRound, FileText, Workflow, Container, Activity, HardDrive, BookOpen, Zap, Target, Star, Layers, Monitor, Wifi, HardHat, Lightbulb, Palette } from "lucide-react";
import { HomepageFAQ } from "@/components/landing/homepage-faq";
import { MobileNav } from "@/components/landing/mobile-nav";
import { AuthCTA } from "@/components/landing/auth-cta";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { ProviderTrustStrip } from "@/components/landing/provider-trust-strip";
import { StatsBanner } from "@/components/landing/stats-banner";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { ArchitectureFlowBanner } from "@/components/landing/architecture-flow-banner";
import { PopularCertsPreview } from "@/components/landing/popular-certs-preview";
import { ComparisonTable } from "@/components/landing/comparison-table";
import { HomeNav } from "@/components/landing/home-nav";
import { SiteFooter } from "@/components/landing/site-footer";


const testimonials = [
  {
    quote: "I passed the AWS Solutions Architect Professional exam on my first try. The adaptive learning and mock exams made all the difference.",
    name: "Sarah K.",
    role: "AWS Solutions Architect Professional",
  },
  {
    quote: "The spaced repetition system helped me retain complex Azure networking concepts. Passed AZ-104 with a score well above the passing threshold.",
    name: "James R.",
    role: "Azure Administrator",
  },
  {
    quote: "SparkUpCloud's concept-first approach helped me understand why answers were correct, not just memorize them. Passed GCP Cloud Architect first attempt.",
    name: "Priya M.",
    role: "Google Cloud Professional Architect",
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

export const comptiaCertifications: Record<string, CertCard[]> = {
  Entry: [
    { code: "220-1201", name: "CompTIA A+ Core 1", shortName: "A+ Core 1", icon: Monitor, questions: 90, time: 90, passingPct: 75, color: "bg-green-50 text-green-700", borderColor: "hover:border-green-400" },
    { code: "220-1202", name: "CompTIA A+ Core 2", shortName: "A+ Core 2", icon: Monitor, questions: 90, time: 90, passingPct: 75, color: "bg-green-50 text-green-700", borderColor: "hover:border-green-400" },
  ],
  Intermediate: [
    { code: "N10-009", name: "CompTIA Network+", shortName: "Network+", icon: Wifi, questions: 90, time: 90, passingPct: 72, color: "bg-blue-50 text-blue-700", borderColor: "hover:border-blue-400" },
    { code: "SY0-701", name: "CompTIA Security+", shortName: "Security+", icon: Shield, questions: 90, time: 90, passingPct: 75, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "XK0-005", name: "CompTIA Linux+", shortName: "Linux+", icon: Code, questions: 90, time: 90, passingPct: 72, color: "bg-orange-50 text-orange-700", borderColor: "hover:border-orange-400" },
    { code: "CV0-004", name: "CompTIA Cloud+", shortName: "Cloud+", icon: Cloud, questions: 90, time: 90, passingPct: 75, color: "bg-sky-50 text-sky-700", borderColor: "hover:border-sky-400" },
    { code: "CS0-003", name: "CompTIA CySA+", shortName: "CySA+", icon: Lock, questions: 85, time: 165, passingPct: 75, color: "bg-violet-50 text-violet-700", borderColor: "hover:border-violet-400" },
    { code: "PT0-003", name: "CompTIA PenTest+", shortName: "PenTest+", icon: Target, questions: 85, time: 165, passingPct: 75, color: "bg-rose-50 text-rose-700", borderColor: "hover:border-rose-400" },
  ],
  Advanced: [
    { code: "CAS-005", name: "CompTIA SecurityX (CASP+)", shortName: "SecurityX", icon: Shield, questions: 90, time: 165, passingPct: 75, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
  ],
};

export const redhatCertifications: Record<string, CertCard[]> = {
  Foundational: [
    { code: "EX180", name: "Red Hat Certified Specialist in Containers (Foundations)", shortName: "Containers Foundations", icon: Container, questions: 0, time: 180, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "EX188", name: "Red Hat Certified Specialist in Containers", shortName: "Containers (Podman)", icon: Container, questions: 0, time: 180, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
  ],
  Associate: [
    { code: "EX200", name: "Red Hat Certified System Administrator (RHCSA)", shortName: "RHCSA", icon: Server, questions: 0, time: 180, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
  ],
  Professional: [
    { code: "EX294", name: "Red Hat Certified Engineer (RHCE) — Ansible Automation", shortName: "RHCE (Ansible)", icon: Workflow, questions: 0, time: 240, passingPct: 70, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "EX280", name: "Red Hat Certified OpenShift Administrator", shortName: "OpenShift Admin", icon: Container, questions: 0, time: 180, passingPct: 60, color: "bg-orange-50 text-orange-700", borderColor: "hover:border-orange-400" },
    { code: "EX288", name: "Red Hat Certified Specialist in OpenShift Application Development", shortName: "OpenShift App Dev", icon: Code, questions: 0, time: 180, passingPct: 60, color: "bg-orange-50 text-orange-700", borderColor: "hover:border-orange-400" },
    { code: "EX316", name: "Red Hat Certified Specialist in Containerized Application Development", shortName: "Containerized App Dev", icon: Code, questions: 0, time: 180, passingPct: 60, color: "bg-orange-50 text-orange-700", borderColor: "hover:border-orange-400" },
    { code: "EX318", name: "Red Hat Certified Specialist in OpenShift Virtualization", shortName: "OpenShift Virt", icon: Server, questions: 0, time: 240, passingPct: 60, color: "bg-amber-50 text-amber-700", borderColor: "hover:border-amber-400" },
    { code: "EX328", name: "Red Hat Certified Specialist in Building Resilient Microservices", shortName: "Resilient Microservices", icon: Network, questions: 0, time: 180, passingPct: 60, color: "bg-orange-50 text-orange-700", borderColor: "hover:border-orange-400" },
    { code: "EX358", name: "Red Hat Certified Specialist in Services Management & Automation", shortName: "Services & Automation", icon: Activity, questions: 0, time: 240, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "EX362", name: "Red Hat Certified Specialist in Identity Management", shortName: "Identity Mgmt", icon: Lock, questions: 0, time: 240, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "EX370", name: "Red Hat Certified Specialist in OpenShift Data Foundation", shortName: "Data Foundation", icon: HardDrive, questions: 0, time: 180, passingPct: 60, color: "bg-emerald-50 text-emerald-700", borderColor: "hover:border-emerald-400" },
    { code: "EX374", name: "Red Hat Certified Specialist in Ansible Automation Platform Development", shortName: "AAP Development", icon: Workflow, questions: 0, time: 240, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "EX380", name: "Red Hat Certified Specialist in Multicluster Management", shortName: "Multicluster Mgmt", icon: Network, questions: 0, time: 180, passingPct: 60, color: "bg-violet-50 text-violet-700", borderColor: "hover:border-violet-400" },
    { code: "EX415", name: "Red Hat Certified Specialist in Security: Linux", shortName: "Linux Security", icon: Shield, questions: 0, time: 240, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "EX436", name: "Red Hat Certified Specialist in High Availability Clustering", shortName: "HA Clustering", icon: Activity, questions: 0, time: 240, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "EX440", name: "Red Hat Certified Specialist in Messaging Administration", shortName: "Messaging (AMQ)", icon: Workflow, questions: 0, time: 180, passingPct: 60, color: "bg-amber-50 text-amber-700", borderColor: "hover:border-amber-400" },
    { code: "EX442", name: "Red Hat Certified Specialist in Linux Performance Tuning", shortName: "Performance Tuning", icon: BarChart3, questions: 0, time: 240, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "EX447", name: "Red Hat Certified Specialist in Advanced Automation: Ansible Best Practices", shortName: "Advanced Ansible", icon: Workflow, questions: 0, time: 240, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "EX457", name: "Red Hat Certified Specialist in Ansible Network Automation", shortName: "Ansible Network", icon: Network, questions: 0, time: 240, passingPct: 60, color: "bg-red-50 text-red-700", borderColor: "hover:border-red-400" },
    { code: "EX467", name: "Red Hat Certified Specialist in Managing API Traffic with 3scale", shortName: "API Traffic (3scale)", icon: Globe, questions: 0, time: 180, passingPct: 60, color: "bg-amber-50 text-amber-700", borderColor: "hover:border-amber-400" },
  ],
};

export const nvidiaCertifications: Record<string, CertCard[]> = {
  Associate: [
    { code: "NCA-GENL", name: "NVIDIA Certified Associate: GenAI LLMs", shortName: "GenAI LLMs", icon: Bot, questions: 50, time: 60, passingPct: 70, color: "bg-green-50 text-green-700", borderColor: "hover:border-green-400" },
    { code: "NCA-GENM", name: "NVIDIA Certified Associate: GenAI Multimodal", shortName: "GenAI Multimodal", icon: Palette, questions: 50, time: 60, passingPct: 70, color: "bg-violet-50 text-violet-700", borderColor: "hover:border-violet-400" },
    { code: "NCA-AIIO", name: "NVIDIA Certified Associate: AI Infra & Ops", shortName: "AI Infra & Ops", icon: Server, questions: 50, time: 60, passingPct: 70, color: "bg-cyan-50 text-cyan-700", borderColor: "hover:border-cyan-400" },
  ],
  Professional: [
    { code: "NCP-AAI", name: "NVIDIA Certified Professional: Agentic AI", shortName: "Agentic AI", icon: Bot, questions: 50, time: 120, passingPct: 70, color: "bg-green-50 text-green-700", borderColor: "hover:border-green-400" },
    { code: "NCP-GENL", name: "NVIDIA Certified Professional: GenAI LLMs", shortName: "GenAI LLMs Pro", icon: Brain, questions: 50, time: 120, passingPct: 70, color: "bg-purple-50 text-purple-700", borderColor: "hover:border-purple-400" },
    { code: "NCP-AII", name: "NVIDIA Certified Professional: AI Infrastructure", shortName: "AI Infrastructure", icon: Server, questions: 50, time: 120, passingPct: 70, color: "bg-blue-50 text-blue-700", borderColor: "hover:border-blue-400" },
    { code: "NCP-ADS", name: "NVIDIA Certified Professional: Data Science", shortName: "Data Science", icon: BarChart3, questions: 50, time: 120, passingPct: 70, color: "bg-orange-50 text-orange-700", borderColor: "hover:border-orange-400" },
    { code: "NCP-AIO", name: "NVIDIA Certified Professional: AI Operations", shortName: "AI Operations", icon: Activity, questions: 50, time: 120, passingPct: 70, color: "bg-teal-50 text-teal-700", borderColor: "hover:border-teal-400" },
    { code: "NCP-AIN", name: "NVIDIA Certified Professional: AI Networking", shortName: "AI Networking", icon: Network, questions: 50, time: 120, passingPct: 70, color: "bg-indigo-50 text-indigo-700", borderColor: "hover:border-indigo-400" },
    { code: "NCP-OUSD", name: "NVIDIA Certified Professional: OpenUSD Dev", shortName: "OpenUSD Dev", icon: Lightbulb, questions: 50, time: 120, passingPct: 70, color: "bg-amber-50 text-amber-700", borderColor: "hover:border-amber-400" },
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SparkUpCloud",
  url: "https://www.sparkupcloud.com",
  description:
    "AI-powered certification exam preparation platform for AWS, Azure, Google Cloud, CompTIA, and NVIDIA certifications",
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

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does SparkUpCloud's adaptive learning work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SparkUpCloud uses Bayesian Knowledge Tracing and a multi-armed bandit algorithm to identify your weakest concepts. Questions are selected to maximize your learning at the edge of your knowledge. As you improve, the system adapts in real time.",
      },
    },
    {
      "@type": "Question",
      name: "What certifications are available on SparkUpCloud?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SparkUpCloud covers 76+ certifications across AWS (14 certs), Microsoft Azure (12 certs), Google Cloud (10 certs), CompTIA (9 certs including Security+, Network+, A+), NVIDIA AI (10 certs including Agentic AI, GenAI LLMs, and AI Infrastructure), and Red Hat (21 certs including RHCSA, RHCE, OpenShift, Ansible).",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free plan for SparkUpCloud?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The free plan gives you access to 50% of the content for one certification exam, up to 10 practice questions per day, basic progress tracking, and a free readiness assessment. You can upgrade at any time to unlock full access.",
      },
    },
    {
      "@type": "Question",
      name: "How is SparkUpCloud different from other exam prep platforms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SparkUpCloud combines concept-first learning with AI-powered question selection and spaced repetition. Instead of just drilling questions, you learn the underlying concepts first, then practice. The system tracks mastery at the concept level and schedules reviews at optimal intervals based on cognitive science research.",
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-violet-50/30">
      {/* Navigation Header — scroll-responsive */}
      <HomeNav />

      {/* Hero — split layout with mockup */}
      <section className="relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-violet-50/50 -z-10" />
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #57534e 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />

        <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="grid gap-12 lg:gap-16 lg:grid-cols-[1.1fr_1fr] items-center">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 mb-6">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                New: Coach AI Tutor + Guided Learning Paths
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05]">
                Pass your cert exam — with{" "}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
                    a real coach
                  </span>
                  <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 opacity-60" />
                </span>{" "}
                next to you.
              </h1>
              <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg leading-relaxed text-stone-600">
                AI-powered adaptive practice + a stateful 1-on-1 tutor that
                knows your weak topics, watches your progress, and steps in
                when you start to struggle. AWS, Azure, GCP, CompTIA, NVIDIA,
                Red Hat — all 76+ certs in one place.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <AuthCTA variant="hero" />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-stone-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Free plan: 10 questions/day
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Pass-or-refund on Pro
                </span>
              </div>
            </div>

            {/* Right: mockup */}
            <div className="relative">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Provider trust strip */}
      <ProviderTrustStrip />

      {/* Stats banner */}
      <StatsBanner />

      {/* Animated cloud architecture flow — moved up to act as the
          strongest visual hook below the hero. Narrates a real request
          lifecycle (edge → DNS → ALB → compute → data → messaging) so
          visitors can see in 15 seconds what we mean by "architecture
          mastery". Pure SVG, ~6KB, 60fps on mobile, click-to-learn
          popovers + AWS/Azure/GCP toggle. */}
      <ArchitectureFlowBanner />

      {/* Compact 5-card feature grid — replaces the old FeatureSections
          which was 5 alternating left-right deep-dives spanning ~3000px.
          The detail moved to the dedicated routes each card links to. */}
      <FeatureGrid />


      {/* 6 popular certs + "View all 76+ →" — replaces the full
          76-card CertTabs that previously rendered every cert on the
          homepage. The full catalog still lives at /exams. */}
      <PopularCertsPreview />

      {/* Honest comparison vs competitors */}
      <ComparisonTable />


      {/* Testimonials moved to /pricing — they work harder near the
          buy decision than on the homepage where the visitor isn't
          ready to convert yet. */}

      {/* FAQ */}
      <HomepageFAQ />

      {/* Pricing teaser — surfaces the actual price before the bottom
          CTA so visitors don't have to navigate to /pricing to learn
          if it's $5 or $500. */}
      <section className="mx-auto max-w-4xl px-6 pt-4 pb-2 text-center">
        <p className="text-sm text-stone-600">
          Free forever ·{" "}
          <Link
            href="/pricing"
            className="font-semibold text-amber-700 underline-offset-4 hover:underline"
          >
            Pro from $12.50/mo
          </Link>{" "}
          · Pass-or-refund guarantee
        </p>
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
            <AuthCTA variant="cta-banner" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
    </>
  );
}
