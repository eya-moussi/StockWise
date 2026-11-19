"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getUserRoleSnapshot,
  subscribeToAuthChanges,
  type UserRole,
} from "@/lib/auth";

function getAllowedRoles(pathname: string): readonly UserRole[] | null {
  const adminOnly: readonly UserRole[] = ["ADMIN"];
  const managers: readonly UserRole[] = ["ADMIN", "STOCK_MANAGER"];

  if (
    pathname === "/audit-logs" ||
    pathname.startsWith("/audit-logs/")
  ) {
    return adminOnly;
  }

  const restrictedPaths = [
    "/products/create",
    "/categories/create",
    "/warehouses/create",
    "/inventory-counts/create",
    "/stock-movements/create",
    "/stock-movements/transfer",
    "/stock-movements/return",
  ];

  if (
    restrictedPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    ) ||
    /^\/categories\/[^/]+\/edit\/?$/.test(pathname)
  ) {
    return managers;
  }

  return null;
}

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const role = useSyncExternalStore(
    subscribeToAuthChanges,
    getUserRoleSnapshot,
    () => null
  );

  const [authorizedKey, setAuthorizedKey] = useState("");

  useEffect(() => {
    if (!role) {
      router.replace("/login");
      return;
    }

    const allowedRoles = getAllowedRoles(pathname);

    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace("/dashboard");
      return;
    }

    setAuthorizedKey(`${pathname}:${role}`);
  }, [pathname, role, router]);

  if (!role || authorizedKey !== `${pathname}:${role}`) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4fb]">
        <p className="text-sm text-[#6b7194]">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
