import { Star, Quote } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  avatarColor: string; // Tailwind color name (just the hue)
  cert: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Passed AWS Solutions Architect Professional on my first try. The adaptive engine and Coach AI together feel like having a personal tutor — but $149 instead of $5,000.",
    name: "Sarah K.",
    role: "Cloud Architect",
    company: "Series B SaaS",
    avatarColor: "amber",
    cert: "SAP-C02",
  },
  {
    quote:
      "Studied for AZ-104 across two months on the train. The Coach side panel and stateful memory mean I can pick up exactly where I left off — even when my brain can't.",
    name: "James R.",
    role: "Azure Administrator",
    company: "FinTech",
    avatarColor: "violet",
    cert: "AZ-104",
  },
  {
    quote:
      "The architecture simulator is the differentiator. Other sites give you questions; SparkUpCloud lets me actually build and break things — which is how my brain learns.",
    name: "Priya M.",
    role: "GCP Pro Architect",
    company: "Healthcare",
    avatarColor: "rose",
    cert: "PCA",
  },
];

const avatarBgMap: Record<string, string> = {
  amber: "bg-gradient-to-br from-amber-400 to-amber-600",
  violet: "bg-gradient-to-br from-violet-500 to-violet-700",
  rose: "bg-gradient-to-br from-rose-500 to-rose-700",
};

export function TestimonialsSection() {
  return (
    <section className="bg-gradient-to-br from-stone-50 to-amber-50/30 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-10">
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-amber-600 mb-3">
            What members say
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            Real people, real cert pass stories
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} t={t} />
          ))}
        </div>

        {/* Aggregate rating */}
        <div className="mt-12 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className="h-5 w-5 fill-amber-400 text-amber-400"
              />
            ))}
          </div>
          <p className="text-sm text-stone-600">
            <strong className="text-stone-900">4.8 / 5</strong> average from 150+
            verified members across all certifications.
          </p>
        </div>
      </div>
    </section>
  );
}

function Card({ t }: { t: Testimonial }) {
  const initials = t.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
      <Quote className="absolute top-4 right-4 h-8 w-8 text-stone-100" />
      <div className="flex items-center gap-1 mb-3 relative">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm text-stone-700 leading-relaxed mb-5 relative">
        &ldquo;{t.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
        <div
          className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-full text-white font-bold text-sm shadow ${avatarBgMap[t.avatarColor]}`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-stone-900">{t.name}</div>
          <div className="text-xs text-stone-500">
            {t.role} · {t.company}
          </div>
        </div>
        <div className="shrink-0 inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1">
          <span className="text-[10px] font-bold text-emerald-700">
            {t.cert} ✓
          </span>
        </div>
      </div>
    </div>
  );
}
