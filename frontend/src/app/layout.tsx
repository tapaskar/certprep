import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SparkUpCloud — AI-Powered Cloud Certification Exam Prep",
    template: "%s | SparkUpCloud",
  },
  description:
    "Master 36+ AWS, Azure, and Google Cloud certifications with AI-powered adaptive learning, spaced repetition, concept tutorials, practice questions, video lessons, and hands-on labs. 85% pass rate.",
  keywords: [
    "AWS certification",
    "Azure certification",
    "Google Cloud certification",
    "GCP certification",
    "cloud certification",
    "exam prep",
    "AWS Solutions Architect",
    "Azure Administrator",
    "GCP Cloud Architect",
    "practice questions",
    "study guide",
    "AI learning",
  ],
  metadataBase: new URL("https://www.sparkupcloud.com"),
  openGraph: {
    title: "SparkUpCloud — Master Your Cloud Certification",
    description:
      "AI-powered exam prep for 36+ AWS, Azure, and Google Cloud certifications. Adaptive learning, practice questions, video tutorials, and hands-on labs.",
    url: "https://www.sparkupcloud.com",
    siteName: "SparkUpCloud",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SparkUpCloud — AI-Powered Cloud Certification Prep",
    description:
      "Master 36+ AWS, Azure, and Google Cloud certifications with adaptive learning and practice questions.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "Yie--gyH-JTjcM1URDOUskfB1ndrn0Z2LIYQuSy4mIU",
  },
  alternates: {
    canonical: "https://www.sparkupcloud.com",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen bg-stone-100 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
