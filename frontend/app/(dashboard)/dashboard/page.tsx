
"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Tags,
  Warehouse,
  ArrowLeftRight,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

import {
  getDashboardProducts,
  getDashboardCategories,
  getDashboardWarehouses,
  getDashboardMovements,
} from "@/lib/api";

// Types des données reçues du backend
interface ProductResponse {
  data: unknown[];
  total: number;
}

interface StockMovement {
  id: number;
  type: string;
  quantity: number;
  createdAt: string;
  product?: {
    name?: string;
  };
  warehouse?: {
    name?: string;
  };
}

interface DashboardStats {
  products: number;
  categories: number;
  warehouses: number;
  movements: number;
}

function formatDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date inconnue";
  }

  return parsedDate.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getMovementLabel(type: string): string {
  switch (type) {
    case "IN":
      return "Entrée";
    case "OUT":
      return "Sortie";
    case "TRANSFER":
      return "Transfert";
    case "CORRECTION":
      return "Correction";
    default:
      return type;
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        // Récupération des données depuis lib/api.ts
        const [
          productsResponse,
          categoriesResponse,
          warehousesResponse,
          movementsResponse,
        ] = await Promise.all([
          getDashboardProducts(),
          getDashboardCategories(),
          getDashboardWarehouses(),
          getDashboardMovements(),
        ]);

        if (!active) return;

        // Nombre total de produits (et non la taille de la page)
        const productsData = productsResponse as ProductResponse;
        const productsTotal = productsData.total ?? 0;

        // Vérification des tableaux reçus
        const categories = Array.isArray(categoriesResponse)
          ? categoriesResponse
          : [];

        const warehouses = Array.isArray(warehousesResponse)
          ? warehousesResponse
          : [];

        const movements = Array.isArray(movementsResponse)
          ? movementsResponse
          : [];

        // Mise à jour des statistiques
        setStats({
          products: productsTotal,
          categories: categories.length,
          warehouses: warehouses.length,
          movements: movements.length,
        });

        // Les mouvements sont triés du plus récent au plus ancien
        setRecentMovements(movements.slice(0, 5));
      } catch (err) {
        console.error("Erreur chargement dashboard :", err);

        if (active) {
          setError(
            "Impossible de récupérer les données. Vérifiez la connexion au backend et votre authentification."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Définition des cartes statistiques
  const summaryCards = [
    {
      title: "Total des produits",
      value: stats?.products,
      description: "Produits enregistrés",
      icon: Package,
    },
    {
      title: "Catégories",
      value: stats?.categories,
      description: "Catégories disponibles",
      icon: Tags,
    },
    {
      title: "Entrepôts",
      value: stats?.warehouses,
      description: "Entrepôts enregistrés",
      icon: Warehouse,
    },
    {
      title: "Mouvements",
      value: stats?.movements,
      description: "Entrées et sorties",
      icon: ArrowLeftRight,
    },
  ];

  return (
    <div className="space-y-8">

      {/* Welcome section */}
      <section>
        <h1 className="text-2xl font-bold text-[#0f1535]">
          Vue d&apos;ensemble
        </h1>

        <p className="mt-2 text-sm text-[#6b7194]">
          Retrouvez ici les principales informations de votre gestion de stock.
        </p>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-2xl border border-[#e9ebf5] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#6b7194]">
                  {card.title}
                </p>

                <div className="rounded-xl bg-[#eeedfc] p-3 text-[#6d5ef0]">
                  <Icon size={21} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-bold text-[#0f1535]">
                {loading ? "..." : stats ? card.value : "—"}
              </p>

              <p className="mt-2 text-xs text-[#9a9db5]">
                {card.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Error message */}
      {error && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>

          <button
            onClick={() => setRefreshKey((previous) => previous + 1)}
            className="mt-3 flex items-center gap-2 text-sm font-medium text-red-700 hover:underline"
          >
            <RefreshCw size={15} />
            Réessayer
          </button>
        </section>
      )}

      {/* Activity section */}
      <section className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm">

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#eeedfc] p-3 text-[#6d5ef0]">
              <TrendingUp size={22} />
            </div>

            <div>
              <h2 className="font-semibold text-[#0f1535]">
                Activité du stock
              </h2>

              <p className="mt-1 text-sm text-[#6b7194]">
                Les cinq derniers mouvements enregistrés.
              </p>
            </div>
          </div>

          <button
            onClick={() => setRefreshKey((previous) => previous + 1)}
            disabled={loading}
            title="Actualiser les données"
            className="rounded-xl p-2 text-[#6d5ef0] transition hover:bg-[#eeedfc] disabled:opacity-50"
          >
            <RefreshCw
              size={19}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>

        <div className="mt-6">

          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <p className="text-sm text-[#9a9db5]">
                Chargement des données...
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-40 items-center justify-center">
              <p className="text-sm text-[#9a9db5]">
                Activité indisponible pour le moment.
              </p>
            </div>
          ) : recentMovements.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-[#e9ebf5] bg-[#fafaff]">
              <p className="text-sm text-[#9a9db5]">
                Aucun mouvement de stock enregistré.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e9ebf5]">
              {recentMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#0f1535]">
                      {movement.product?.name ??
                        `Produit #${movement.id}`}
                    </p>

                    <p className="mt-1 text-xs text-[#9a9db5]">
                      {movement.warehouse?.name ??
                        "Entrepôt non renseigné"}
                      {" · "}
                      {formatDate(movement.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#6d5ef0]">
                      {getMovementLabel(movement.type)}
                    </p>

                    <p className="mt-1 text-xs text-[#6b7194]">
                      Quantité : {movement.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
