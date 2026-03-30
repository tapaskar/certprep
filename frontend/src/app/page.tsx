import Link from "next/link";
import { Brain, Clock, TrendingUp, Shield, Cloud, Database, Code, Network, Bot, BarChart3, Server, Lock } from "lucide-react";

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

const certifications: Record<string, CertCard[]> = {
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

const levelColors: Record<string, string> = {
  Foundational: "text-sky-600",
  Associate: "text-amber-600",
  Professional: "text-violet-600",
  Specialty: "text-red-600",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-violet-50/30">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-24 text-center">
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
          AI-powered adaptive learning for all 15 AWS certifications.
          Concept tutorials, practice questions, and hands-on labs — all in one place.
        </p>
        <Link
          href="/register"
          className="mt-10 inline-flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-base font-bold text-white shadow-md shadow-stone-200/60 hover:scale-105 transition-all"
        >
          Get Started Free
        </Link>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-stone-500 sm:gap-6">
          <span>15 Certifications</span>
          <span className="hidden sm:inline h-1 w-1 rounded-full bg-amber-400" />
          <span>500+ Questions</span>
          <span className="hidden sm:inline h-1 w-1 rounded-full bg-amber-400" />
          <span>Video Tutorials</span>
          <span className="hidden sm:inline h-1 w-1 rounded-full bg-amber-400" />
          <span>Hands-on Labs</span>
        </div>
      </section>

      {/* AWS Certifications */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            All AWS Certifications
          </h2>
          <p className="mt-3 text-base text-stone-500">
            From Cloud Practitioner to Professional and Specialty — we cover them all.
          </p>
        </div>

        {Object.entries(certifications).map(([level, certs]) => (
          <div key={level} className="mb-10">
            <h3 className={`mb-4 text-sm font-bold uppercase tracking-widest ${levelColors[level]}`}>
              {level}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {certs.map((cert) => (
                <Link
                  key={cert.code}
                  href="/register"
                  className={`group rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${cert.borderColor}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cert.color.split(" ")[0]}`}>
                      <cert.icon className={`h-5 w-5 ${cert.color.split(" ")[1]}`} />
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

      {/* Trust tagline */}
      <section className="pb-20 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
          Trusted by professionals preparing for AWS certifications worldwide
        </p>
      </section>
    </div>
  );
}
