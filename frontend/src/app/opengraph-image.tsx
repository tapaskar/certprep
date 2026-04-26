import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SparkUpCloud — AI-Powered Cloud Certification Exam Prep";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #f5f3ff 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 60px",
            maxWidth: "900px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                color: "#1c1917",
              }}
            >
              Spark
            </div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                color: "#f59e0b",
              }}
            >
              Up
            </div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                color: "#1c1917",
              }}
            >
              Cloud
            </div>
          </div>
          <div
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "#1c1917",
              lineHeight: 1.2,
              marginBottom: "20px",
            }}
          >
            Master Your Certification Exam
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#78716c",
              lineHeight: 1.5,
              marginBottom: "32px",
            }}
          >
            AI-powered adaptive learning for 76+ AWS, Azure, Google Cloud, CompTIA, NVIDIA, and Red Hat certifications
          </div>
          <div
            style={{
              display: "flex",
              gap: "24px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#a8a29e",
            }}
          >
            <span>76+ Certifications</span>
            <span>500+ Questions</span>
            <span>85% Pass Rate</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
