import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteAnalytics } from "@/components/analytics/site-analytics";
import { ExitIntentPopup } from "@/components/landing/exit-intent-popup";
import {
  JsonLd,
  organizationSchema,
  websiteSchema,
} from "@/components/seo/json-ld";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SparkUpCloud — AI-Powered Cloud Certification Exam Prep",
    template: "%s | SparkUpCloud",
  },
  // Meta description capped at ~157 chars so Google doesn't truncate
  // it in the SERP snippet (was 217 chars previously). Leads with the
  // benefit + key proof point, lists provider breadth, ends with the
  // friction-killing "free to start" hook.
  description:
    "AI-powered exam prep for 76+ AWS, Azure, GCP, CompTIA, NVIDIA & Red Hat certs. Adaptive practice + a 1-on-1 AI tutor. 85% pass rate. Free to start.",
  keywords: [
    "AWS certification",
    "Azure certification",
    "Google Cloud certification",
    "GCP certification",
    "CompTIA certification",
    "CompTIA Security+",
    "CompTIA A+",
    "CompTIA Network+",
    "NVIDIA certification",
    "NVIDIA AI certification",
    "cloud certification",
    "exam prep",
    "AWS Solutions Architect",
    "Azure Administrator",
    "GCP Cloud Architect",
    "practice questions",
    "study guide",
    "AI learning",
    "flashcards",
    "spaced repetition",
  ],
  metadataBase: new URL("https://www.sparkupcloud.com"),
  openGraph: {
    title: "SparkUpCloud — Master Your Cloud Certification",
    description:
      "AI-powered exam prep for 76+ AWS, Azure, Google Cloud, CompTIA, NVIDIA, and Red Hat certifications. Adaptive learning, practice questions, flashcards, and hands-on labs.",
    url: "https://www.sparkupcloud.com",
    siteName: "SparkUpCloud",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SparkUpCloud — AI-Powered Cloud Certification Prep",
    description:
      "Master 76+ AWS, Azure, Google Cloud, CompTIA, NVIDIA, and Red Hat certifications with adaptive learning and practice questions.",
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
    other: { "msvalidate.01": "C2229EE7DEBC7B1A894243C9CD44EC27" },
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
      <head>
        {/* Site-wide structured data — emitted on every page so crawlers
            always see the Organization + WebSite identity. */}
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
      </head>
      <body className="min-h-screen bg-stone-100 text-stone-900 antialiased">
        {children}
        <ExitIntentPopup />
        <SiteAnalytics />
      </body>
    </html>
  );
}
