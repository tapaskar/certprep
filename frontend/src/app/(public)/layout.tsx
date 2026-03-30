"use client";

import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-stone-100 px-4 py-12">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2">
        <img src="/logo.svg" alt="SparkUpCloud" className="h-32 w-auto" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
