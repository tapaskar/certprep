import { ImageResponse } from "next/og";

/**
 * Per-exam Open Graph image. Renders a card with the cert code in
 * large type + provider color band + the cert name + a "free practice
 * exam" tagline. Replaces the generic site-wide OG image so every
 * exam URL shared on social/Slack/email gets a unique, on-brand
 * preview tile.
 *
 * Generated on-demand at the edge (no images stored). Next caches
 * the response so it's effectively static after the first hit.
 */

export const runtime = "edge";
export const alt = "Practice exam — SparkUpCloud";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface ExamSummary {
  id: string;
  provider: string;
  name: string;
  code: string;
}

const providerLabel: Record<string, string> = {
  aws: "AWS",
  azure: "Microsoft Azure",
  gcp: "Google Cloud",
  comptia: "CompTIA",
  nvidia: "NVIDIA",
  redhat: "Red Hat",
};

const providerColor: Record<string, string> = {
  aws: "#FF9900",
  azure: "#0078D4",
  gcp: "#34A853",
  comptia: "#C8202F",
  nvidia: "#76B900",
  redhat: "#EE0000",
};

async function getExam(examId: string): Promise<ExamSummary | null> {
  try {
    const res = await fetch(`${API_URL}/content/exams`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const list = (await res.json()) as ExamSummary[];
    return list.find((e) => e.id === examId) ?? null;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: { examId: string };
}) {
  const exam = await getExam(params.examId);

  // Fall back to a generic card if the exam isn't found rather than
  // 500ing the OG endpoint — broken share previews are worse than
  // generic ones.
  const code = exam?.code ?? "Practice Exam";
  const name = exam?.name ?? "Cloud Certification";
  const provider = exam?.provider ?? "aws";
  const accent = providerColor[provider] ?? "#f59e0b";
  const providerName = providerLabel[provider] ?? "Cloud";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0e27 0%, #0f1535 50%, #050818 100%)",
          fontFamily: "system-ui, sans-serif",
          color: "white",
        }}
      >
        {/* Top color band — provider brand color, signals "this is X's exam at a glance" */}
        <div
          style={{
            height: "12px",
            width: "100%",
            background: accent,
          }}
        />

        {/* Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 80px",
            flex: 1,
          }}
        >
          {/* Provider tag */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                background: accent,
                color: "white",
                padding: "6px 16px",
                borderRadius: "999px",
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "0.05em",
              }}
            >
              {providerName.toUpperCase()}
            </div>
            <div style={{ fontSize: "20px", color: "#cbd5e1" }}>
              · Free Practice Exam
            </div>
          </div>

          {/* Cert code — the headline */}
          <div
            style={{
              fontSize: "120px",
              fontWeight: 900,
              lineHeight: 1,
              color: accent,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
            }}
          >
            {code}
          </div>

          {/* Cert name */}
          <div
            style={{
              fontSize: "40px",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "white",
              marginBottom: "40px",
              maxWidth: "1000px",
            }}
          >
            {name}
          </div>

          {/* Footer strip — branding + tagline */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "auto",
              paddingTop: "30px",
              borderTop: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "26px",
                fontWeight: 800,
              }}
            >
              <span style={{ color: "white" }}>Spark</span>
              <span style={{ color: "#f59e0b" }}>Up</span>
              <span style={{ color: "white" }}>Cloud</span>
            </div>
            <div
              style={{
                fontSize: "20px",
                color: "#94a3b8",
              }}
            >
              Practice questions · mock exams · AI tutor
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
