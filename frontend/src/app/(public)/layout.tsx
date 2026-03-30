"use client";

import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-stone-100 px-4 py-12">
      <Link href="/" className="mb-8 text-2xl font-bold">
        <span className="text-stone-900">Cert</span>
        <span className="text-amber-500">Prep</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
