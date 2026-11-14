
"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  getUserRoleSnapshot,
  getServerUserRoleSnapshot,
  subscribeToAuthChanges,
  UserRole,
} from "@/lib/auth";
import {
  LayoutDashboard,
  Package,
  Tags,
  Boxes,
  Warehouse,
  ArrowLeftRight,
  ClipboardList,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

const navigation: {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "STOCK_MANAGER", "VIEWER"],
  },
  {
    label: "Produits",
    href: "/products",
    icon: Package,
    roles: ["ADMIN", "STOCK_MANAGER", "VIEWER"],
  },
  {
    label: "Catégories",
    href: "/categories",
    icon: Tags,
    roles: ["ADMIN", "STOCK_MANAGER", "VIEWER"],
  },
  {
    label: "Entrepôts",
    href: "/warehouses",
    icon: Warehouse,
    roles: ["ADMIN", "STOCK_MANAGER", "VIEWER"],
  },
  {
    label: "Mouvements de stock",
    href: "/stock-movements",
    icon: ArrowLeftRight,
    roles: ["ADMIN", "STOCK_MANAGER", "VIEWER"],
  },
  {
    label: "Inventaires",
    href: "/inventory-counts",
    icon: ClipboardList,
    roles: ["ADMIN", "STOCK_MANAGER", "VIEWER"],
  },
  {
    label: "Journaux d'audit",
    href: "/audit-logs",
    icon: ScrollText,
    roles: ["ADMIN"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const role = useSyncExternalStore(
    subscribeToAuthChanges,
    getUserRoleSnapshot,
    getServerUserRoleSnapshot
  );

  const visibleNavigation = navigation.filter(
    (item) => role !== null && item.roles.includes(role)
  );

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-[#e9ebf5] bg-[#f7f8fd] px-4 py-6">

      {/* Logo */}
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6d5ef0] text-white">
          <Boxes size={23} />
        </div>

        <div>
          <h1 className="text-xl font-bold text-[#0f1535]">
            StockWise
          </h1>
          <p className="text-xs text-[#6b7194]">
            Smart Inventory
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[#9a9db5]">
          Menu principal
        </p>

        <div className="space-y-1">
          {visibleNavigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#6d5ef0] text-white shadow-sm"
                    : "text-[#6b7194] hover:bg-[#eeedfc] hover:text-[#6d5ef0]"
                }`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#e9ebf5] px-3 pt-4">
        <p className="text-xs text-[#9a9db5]">
          StockWise © 2026
        </p>
      </div>
    </aside>
  );
}
