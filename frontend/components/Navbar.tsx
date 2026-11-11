
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [role] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("role") || "";
  });

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.replace("/login");
  }

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const linkClass = (path: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive(path)
        ? "bg-white/15 text-white"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <nav className="border-b border-gray-800 bg-gray-950 text-white shadow-sm">
      <div className="mx-auto flex min-h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl shadow-lg shadow-blue-900/20">
            📦
          </div>

          <div className="hidden sm:block">
            <p className="text-base font-bold tracking-tight">
              StockFlow
            </p>
            <p className="text-xs text-gray-400">
              Inventory Management
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <Link
            href="/dashboard"
            className={linkClass("/dashboard")}
          >
            Dashboard
          </Link>

          {role === "ADMIN" && (
            <Link href="/users" className={linkClass("/users")}>
              Users
            </Link>
          )}

          {(role === "ADMIN" || role === "STOCK_MANAGER") && (
            <>
              <Link
                href="/stock-movements"
                className={linkClass("/stock-movements")}
              >
                Stock
              </Link>

              <Link
                href="/inventory-counts"
                className={linkClass("/inventory-counts")}
              >
                <span className="hidden sm:inline">
                  Inventory Counts
                </span>
                <span className="sm:hidden">Inventory</span>
              </Link>
            </>
          )}
        </div>

        {/* Account */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-xs text-gray-400">Signed in as</p>
            <p className="text-sm font-medium text-gray-200">
              {role || "User"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-400"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}