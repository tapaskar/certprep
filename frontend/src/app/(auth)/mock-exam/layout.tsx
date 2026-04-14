import { Suspense } from "react";

export default function MockExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" /></div>}>{children}</Suspense>;
}
