import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SparkUpCloud — AI-Powered AWS Certification Exam Prep",
    template: "%s | SparkUpCloud",
  },
  description:
    "Master all 15 AWS certifications with AI-powered adaptive learning, spaced repetition, concept tutorials, practice questions, video lessons, and hands-on labs. 85% pass rate.",
  keywords: [
    "AWS certification",
    "cloud certification",
    "exam prep",
    "AWS Solutions Architect",
    "AWS Developer",
    "AWS DevOps",
    "cloud practitioner",
    "practice questions",
    "study guide",
    "AI learning",
  ],
  metadataBase: new URL("https://sparkupcloud.com"),
  openGraph: {
    title: "SparkUpCloud — Master Your AWS Certification",
    description:
      "AI-powered exam prep for all 15 AWS certifications. Adaptive learning, practice questions, video tutorials, and hands-on labs.",
    url: "https://sparkupcloud.com",
    siteName: "SparkUpCloud",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SparkUpCloud — AI-Powered AWS Certification Prep",
    description:
      "Master all 15 AWS certifications with adaptive learning and practice questions.",
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
    google: "fMWv6tW3hL13XD0csK9PbORizzh5c9M0L_GXC5YMVSg",
  },
  alternates: {
    canonical: "https://sparkupcloud.com",
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
