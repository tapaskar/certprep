import { SimulatorClient } from "@/components/simulator/simulator-client";

export const metadata = {
  title: "AWS Architecture Simulator — Drag & Drop Cost Calculator",
  description:
    "Design AWS architectures visually. Drag services onto the canvas and see real-time cost, latency, reliability, and security impact. Free tool for certification exam prep.",
  alternates: {
    canonical: "https://www.sparkupcloud.com/simulator",
  },
  openGraph: {
    title: "AWS Architecture Simulator",
    description:
      "Drag-and-drop AWS architecture designer with live cost, latency, and reliability impact.",
  },
};

export default function SimulatorPage() {
  return <SimulatorClient />;
}
