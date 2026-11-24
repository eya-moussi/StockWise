"use client";

import { useSyncExternalStore } from "react";
import {
  getUserRoleSnapshot,
  getServerUserRoleSnapshot,
  subscribeToAuthChanges,
  type UserRole,
} from "@/lib/auth";

interface RoleGateProps {
  allowedRoles: readonly UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGate({
  allowedRoles,
  children,
  fallback = null,
}: RoleGateProps) {
  const role = useSyncExternalStore(
    subscribeToAuthChanges,
    getUserRoleSnapshot,
    getServerUserRoleSnapshot
  );

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
