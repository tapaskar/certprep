import VisualizerLoader from "@/components/visualizer/visualizer-loader";
import { SiteFooter } from "@/components/landing/site-footer";
import { UpgradeBanner } from "@/components/landing/upgrade-banner";

export const metadata = {
  title: "3D AWS Network Visualizer — SparkUpCloud",
  description:
    "Interactive 3D visualization of AWS services and their connections. Rotate, zoom, and click nodes to learn the relationships between 30+ AWS services.",
  alternates: {
    canonical: "https://www.sparkupcloud.com/visualizer",
  },
};

export default function VisualizerPage() {
  return (
    <>
      <UpgradeBanner
        toolId="visualizer"
        message="Loving the 3D visualizer? Get the full prep platform — practice questions, AI tutor, mock exams."
      />
      <VisualizerLoader />
      <SiteFooter />
    </>
  );
}
