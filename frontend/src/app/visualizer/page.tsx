import VisualizerLoader from "@/components/visualizer/visualizer-loader";

export const metadata = {
  title: "3D AWS Network Visualizer — SparkUpCloud",
  description:
    "Interactive 3D visualization of AWS services and their connections. Rotate, zoom, and click nodes to learn the relationships between 30+ AWS services.",
  alternates: {
    canonical: "https://www.sparkupcloud.com/visualizer",
  },
};

export default function VisualizerPage() {
  return <VisualizerLoader />;
}
