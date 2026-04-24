"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, BarChart3, User, LogOut, Shield, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const baseNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Study", href: "/study", icon: BookOpen },
  { label: "Coach", href: "/tutor", icon: GraduationCap },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Profile", href: "/profile", icon: User },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, loadUser, logout, _hasHydrated } = useAuthStore();

  // After Zustand hydrates persisted state, re-validate the token with the backend.
  // The user sees the app immediately (no flash to login) because hydration restores
  // isAuthenticated=true from localStorage. If the token turns out to be expired,
  // loadUser() will set isAuthenticated=false and the redirect fires.
  useEffect(() => {
    if (_hasHydrated) {
      loadUser();
    }
  }, [_hasHydrated, loadUser]);

  useEffect(() => {
    // Only redirect AFTER hydration is complete — never during SSR or before
    // the persisted state has been restored from localStorage.
    if (_hasHydrated && !isLoading && !isAuthenticated) {
      const redirect = pathname !== "/dashboard" ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.push(`/login${redirect}`);
    }
  }, [_hasHydrated, isLoading, isAuthenticated, router, pathname]);

  const navItems = user?.is_admin
    ? [...baseNavItems, { label: "Admin", href: "/admin", icon: Shield }]
    : baseNavItems;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Show loading while hydrating persisted state or validating token
  if (!_hasHydrated || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Top nav */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-stone-900">
            <img src="/logo.svg" alt="SparkUpCloud" className="h-10 w-auto" />
            SparkUp<span className="text-amber-500">Cloud</span>
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

          <div className="flex items-center gap-3">
            {user && (
              <Link
                href="/profile"
                className="hidden text-sm text-stone-500 transition-colors hover:text-stone-900 sm:inline"
              >
                {user.display_name || user.email}
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-500 transition-colors hover:text-stone-900"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
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
