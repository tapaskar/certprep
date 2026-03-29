"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, BarChart3, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Study", href: "/study", icon: BookOpen },
  { label: "Progress", href: "/progress", icon: BarChart3 },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Top nav */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-lg font-bold text-stone-900">
            Cert<span className="text-amber-500">Prep</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-amber-600"
                    : "text-stone-500 hover:text-stone-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {pathname === item.href && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-amber-500" />
                )}
              </Link>
            ))}
          </nav>

          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-500 transition-colors hover:text-stone-900"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Link>
        </div>

        {/* Mobile bottom nav */}
        <nav className="flex justify-around border-t border-stone-200 sm:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
                pathname === item.href
                  ? "text-amber-500"
                  : "text-stone-400"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
