
"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Bell, UserRound, LogOut } from "lucide-react";
import {
  getUserRoleSnapshot,
  getServerUserRoleSnapshot,
  subscribeToAuthChanges,
  logout,
  UserRole,
} from "@/lib/auth";

const pageInfo: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Vue d'ensemble de votre activité",
  },
  "/products": {
    title: "Produits",
    description: "Gérez votre catalogue de produits",
  },
  "/categories": {
    title: "Catégories",
    description: "Organisez vos produits par catégorie",
  },
  "/warehouses": {
    title: "Entrepôts",
    description: "Consultez et gérez vos entrepôts",
  },
  "/stock-movements": {
    title: "Mouvements de stock",
    description: "Suivez les entrées et sorties de stock",
  },
  "/inventory-counts": {
    title: "Inventaires",
    description: "Comparez le stock compté au stock enregistré",
  },
  "/audit-logs": {
    title: "Journaux d'audit",
    description: "Consultez l'activité du système et des utilisateurs",
  },
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrateur",
  STOCK_MANAGER: "Gestionnaire de stock",
  VIEWER: "Opérateur de stock",
};

export default function Header() {
  const pathname = usePathname();

  const role = useSyncExternalStore(
    subscribeToAuthChanges,
    getUserRoleSnapshot,
    getServerUserRoleSnapshot
  );

  const currentPage =
    pageInfo[pathname] ??
    Object.entries(pageInfo).find(([href]) =>
      pathname.startsWith(`${href}/`)
    )?.[1] ?? {
      title: "StockWise",
      description: "Gestion intelligente de votre stock",
    };

  return (
    <header className="flex min-h-20 items-center justify-between border-b border-[#e9ebf5] bg-white px-8 py-4">

      {/* Informations de la page */}
      <div>
        <h2 className="text-xl font-bold text-[#0f1535]">
          {currentPage.title}
        </h2>

        <p className="mt-1 text-sm text-[#6b7194]">
          {currentPage.description}
        </p>
      </div>

      {/* Actions utilisateur */}
      <div className="flex items-center gap-5">

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-xl p-2 text-[#6b7194] transition-colors hover:bg-[#f3f4fb] hover:text-[#6d5ef0]"
        >
          <Bell size={21} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#6d5ef0]" />
        </button>

        {/* Profil et déconnexion */}
        <div className="flex items-center gap-3">

          {/* Profil */}
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeedfc] text-[#6d5ef0]">
              <UserRound size={21} />
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-[#0f1535]">
                Bienvenue
              </p>

              <p className="text-xs text-[#6b7194]">
                {role ? roleLabels[role] : "Utilisateur"}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border border-[#e9ebf5] px-3 py-2 text-sm font-medium text-[#6b7194] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={17} />
            <span className="hidden sm:inline">Logout</span>
          </button>

        </div>
      </div>
    </header>
  );
}
