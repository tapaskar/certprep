import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SparkUpCloud",
  description: "SparkUpCloud — AI-powered certification exam preparation",
  verification: {
    google: "fMWv6tW3hL13XD0csK9PbORizzh5c9M0L_GXC5YMVSg",
  },
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
