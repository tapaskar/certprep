import Link from "next/link";
import { Brain, Clock, TrendingUp, Shield, Cloud, Database, Code, Network, Bot, BarChart3, Server, Lock, Cpu, Globe, KeyRound, FileText, Workflow, Container, Activity, HardDrive, BookOpen, Zap, Target, Star, Layers, Monitor, Wifi, HardHat, Lightbulb, Palette } from "lucide-react";
import { CertTabs } from "@/components/landing/cert-tabs";
import { HomepageFAQ } from "@/components/landing/homepage-faq";
import { MobileNav } from "@/components/landing/mobile-nav";
import { AuthCTA } from "@/components/landing/auth-cta";

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
  {
    icon: BookOpen,
    title: "Exam & Learning Modes",
    description:
      "Switch between Learn & Practice mode for concept-first study, or Quick Quiz mode for timed exam simulation.",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: Target,
    title: "Free Readiness Assessment",
    description:
      "Take a free diagnostic quiz to identify your strengths and weaknesses before you start studying.",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-500",
  },
  {
    icon: Layers,
    title: "Flashcards",
    description:
      "Review key facts and common misconceptions with flip-card flashcards for every certification concept.",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
];

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
        text: "SparkUpCloud covers 55+ certifications across AWS (14 certs), Microsoft Azure (12 certs), Google Cloud (10 certs), CompTIA (9 certs including Security+, Network+, A+), and NVIDIA AI (10 certs including Agentic AI, GenAI LLMs, and AI Infrastructure).",
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

          {/* Desktop Nav Links + Auth */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/simulator"
              className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              Tools
            </Link>
            <Link
              href="/scenarios"
              className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              Scenarios
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              Blog
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              Pricing
            </Link>
            <div className="h-5 w-px bg-stone-200 mx-2" />
            <AuthCTA variant="nav-desktop" />
          </div>

          {/* Mobile Nav */}
          <MobileNav />
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
          AI-powered adaptive learning for AWS, Azure, Google Cloud, CompTIA, and NVIDIA certifications.
          Concept tutorials, practice questions, and hands-on labs — all in one place.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3">
          <AuthCTA variant="hero" />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-stone-500 sm:gap-6">
          <Link href="/exams" className="hover:text-amber-600 hover:underline transition-colors">
            55+ Certifications →
          </Link>
          <span className="hidden sm:inline h-1 w-1 rounded-full bg-amber-400" />
          <Link href="/try-questions" className="hover:text-amber-600 hover:underline transition-colors">
            8,800+ Questions →
          </Link>
          <span className="hidden sm:inline h-1 w-1 rounded-full bg-amber-400" />
          <span>Adaptive AI Study</span>
          <span className="hidden sm:inline h-1 w-1 rounded-full bg-amber-400" />
          <span>Free Mock Exams</span>
        </div>

        {/* Try Questions CTA — secondary action */}
        <div className="mt-4 text-sm">
          <Link
            href="/try-questions"
            className="inline-flex items-center gap-1 text-stone-500 hover:text-amber-600 transition-colors"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Try 5 free practice questions — no signup →
          </Link>
        </div>
      </section>

      {/* Free Interactive Tools */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center mb-10">
          <div className="inline-block text-xs font-bold uppercase tracking-wider text-violet-600 bg-violet-100 px-3 py-1 rounded-full mb-3">
            ✨ New — No Signup Required
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Free Interactive Tools
          </h2>
          <p className="mt-3 text-stone-600">
            Visual, hands-on AWS learning tools — free forever.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Link
            href="/tutor"
            className="group relative rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-white to-violet-50 p-6 shadow-md hover:border-violet-500 hover:shadow-xl transition-all overflow-hidden"
          >
            <span className="absolute top-2 right-2 inline-block text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-violet-500 to-amber-500 px-2 py-0.5 rounded-full">
              ✨ New
            </span>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-amber-500 text-3xl text-white shadow-md">
              🎓
            </div>
            <h3 className="text-lg font-semibold text-stone-900">
              Coach: 1-on-1 AI Tutor
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              A patient teacher that knows your progress and walks you through tough topics.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 group-hover:gap-2 transition-all">
              Chat with Coach →
            </span>
          </Link>

          <Link
            href="/visualizer"
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60 hover:border-amber-400 hover:shadow-xl transition-all"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-violet-100 text-3xl">
              🌐
            </div>
            <h3 className="text-lg font-semibold text-stone-900">
              3D Network Visualizer
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Explore 30+ AWS services and connections in interactive 3D.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:gap-2 transition-all">
              Try it →
            </span>
          </Link>

          <Link
            href="/simulator"
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60 hover:border-amber-400 hover:shadow-xl transition-all"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-amber-100 text-3xl">
              ⚡
            </div>
            <h3 className="text-lg font-semibold text-stone-900">
              Architecture Simulator
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Drag AWS services onto a canvas. See live cost &amp; latency impact.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:gap-2 transition-all">
              Build one →
            </span>
          </Link>

          <Link
            href="/scenarios"
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60 hover:border-amber-400 hover:shadow-xl transition-all"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-rose-100 text-3xl">
              🎯
            </div>
            <h3 className="text-lg font-semibold text-stone-900">
              Scenario Library
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Real-world AWS design challenges with 3D diagrams &amp; solutions.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:gap-2 transition-all">
              Browse →
            </span>
          </Link>

          <Link
            href="/study/heuristics"
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60 hover:border-amber-400 hover:shadow-xl transition-all"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-100 text-3xl">
              📘
            </div>
            <h3 className="text-lg font-semibold text-stone-900">
              Exam Heuristics
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              20+ decision rules that tell you the AWS-expected answer.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:gap-2 transition-all">
              Read rules →
            </span>
          </Link>
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

      {/* Testimonials */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Trusted by Certified Professionals
          </h2>
          <p className="mt-3 text-base text-stone-500">
            See what our users say about their certification journey.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-sm italic leading-relaxed text-stone-600">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-4 border-t border-stone-100 pt-4">
                <p className="text-sm font-bold text-stone-900">{t.name}</p>
                <p className="text-xs text-stone-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <HomepageFAQ />

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
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium">
            <Link href="/visualizer" className="text-stone-500 transition-colors hover:text-amber-600">
              3D Visualizer
            </Link>
            <Link href="/simulator" className="text-stone-500 transition-colors hover:text-amber-600">
              Simulator
            </Link>
            <Link href="/scenarios" className="text-stone-500 transition-colors hover:text-amber-600">
              Scenarios
            </Link>
            <Link href="/study/heuristics" className="text-stone-500 transition-colors hover:text-amber-600">
              Heuristics
            </Link>
            <Link href="/blog" className="text-stone-500 transition-colors hover:text-amber-600">
              Blog
            </Link>
            <Link href="/pricing" className="text-stone-500 transition-colors hover:text-amber-600">
              Pricing
            </Link>
            <Link href="/contact" className="text-stone-500 transition-colors hover:text-amber-600">
              Contact
            </Link>
            <Link href="/exams" className="text-stone-500 transition-colors hover:text-amber-600">
              All Exams
            </Link>
            <Link href="/try-questions" className="text-stone-500 transition-colors hover:text-amber-600">
              Try Questions
            </Link>
            <Link href="/terms" className="text-stone-400 transition-colors hover:text-amber-600">
              Terms
            </Link>
            <Link href="/privacy" className="text-stone-400 transition-colors hover:text-amber-600">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
