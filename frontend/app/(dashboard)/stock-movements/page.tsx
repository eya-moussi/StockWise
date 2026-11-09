
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RotateCcw,
  Search,
  Plus,
  Package,
  Truck,
} from "lucide-react";

import { stockMovementsService, StockMovement } from "@/services/stock-movements";
import { productsService } from "@/services/products";
import { warehousesService } from "@/services/warehouses";

const movementLabels: Record<string, string> = {
  IN: "Entrée",
  OUT: "Sortie",
  TRANSFER: "Transfert",
  RETURN_CLIENT: "Retour client",
  RETURN_SUPPLIER: "Retour fournisseur",
  CORRECTION: "Correction",
};

function getMovementStyle(type: string) {
  switch (type) {
    case "IN":
      return "bg-green-50 text-green-700";
    case "OUT":
      return "bg-red-50 text-red-700";
    case "TRANSFER":
      return "bg-blue-50 text-blue-700";
    case "RETURN_CLIENT":
    case "RETURN_SUPPLIER":
      return "bg-orange-50 text-orange-700";
    default:
      return "bg-purple-50 text-purple-700";
  }
}

function getMovementIcon(type: string) {
  switch (type) {
    case "IN":
      return <ArrowDownLeft size={16} />;
    case "OUT":
      return <ArrowUpRight size={16} />;
    case "TRANSFER":
      return <ArrowLeftRight size={16} />;
    default:
      return <RotateCcw size={16} />;
  }
}

export default function StockMovementsPage() {
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");

  const {
    data: movements = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["stock-movements", productId, warehouseId],
    queryFn: () =>
      stockMovementsService.getAll({
        productId: productId ? Number(productId) : undefined,
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
      }),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsService.getAll({ limit: 100 }),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehousesService.getAll,
  });

  const products = productsData?.data ?? [];

  const filteredMovements = movements.filter((movement) => {
    const searchText = search.toLowerCase();

    return (
      movement.product?.name?.toLowerCase().includes(searchText) ||
      movement.product?.reference?.toLowerCase().includes(searchText) ||
      movement.reference?.toLowerCase().includes(searchText) ||
      movement.warehouse?.name?.toLowerCase().includes(searchText)
    );
  });

  function formatDate(date: string) {
    return new Date(date).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return (
    <div className="mx-auto max-w-7xl">
      
{/* En-tête */}
<div className="mb-8 flex flex-col gap-5">
  <div>
    <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
      <Package size={17} />
      Gestion du stock
    </div>

    <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
      Mouvements de stock
    </h1>

    <p className="mt-2 text-sm text-[#6b7194]">
      Consultez l&apos;historique des entrées, sorties, transferts et retours.
    </p>
  </div>

  <div className="flex flex-wrap gap-3">
    <Link
      href="/stock-movements/create"
      className="inline-flex items-center gap-2 rounded-xl bg-[#6d5ef0] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b4ce0]"
    >
      <Plus size={18} />
      Nouveau mouvement
    </Link>

    <Link
      href="/stock-movements/transfer"
      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
    >
      <ArrowLeftRight size={18} />
      Transfert
    </Link>

    <Link
      href="/stock-movements/return"
      className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
    >
      <Truck size={18} />
      Retour
    </Link>
  </div>
</div>


      {/* Filtres */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-[#e9ebf5] bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="shrink-0 text-[#9298b4]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-transparent text-sm text-[#0f1535] outline-none placeholder:text-[#9298b4]"
          />
        </div>

        <select
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          className="rounded-xl border border-[#e9ebf5] bg-white px-4 py-3 text-sm text-[#343b60] outline-none focus:border-[#6d5ef0]"
        >
          <option value="">Tous les produits</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>

        <select
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
          className="rounded-xl border border-[#e9ebf5] bg-white px-4 py-3 text-sm text-[#343b60] outline-none focus:border-[#6d5ef0]"
        >
          <option value="">Tous les entrepôts</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </div>

      {/* Erreur */}
      {isError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Impossible de charger les mouvements. Vérifiez la connexion au backend et votre authentification.
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-hidden rounded-2xl border border-[#e9ebf5] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px]">
            <thead className="bg-[#f8f8fd]">
              <tr className="border-b border-[#e9ebf5] text-left text-xs font-semibold uppercase tracking-wide text-[#9298b4]">
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Produit</th>
                <th className="px-5 py-4">Quantité</th>
                <th className="px-5 py-4">Entrepôt</th>
                <th className="px-5 py-4">Emplacement</th>
                <th className="px-5 py-4">Référence</th>
                <th className="px-5 py-4">Date</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#6b7194]">
                    Chargement des mouvements...
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#9298b4]">
                    Aucun mouvement trouvé.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement: StockMovement) => (
                  <tr
                    key={movement.id}
                    className="border-b border-[#f0f1f8] last:border-0 hover:bg-[#fafaff]"
                  >
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${getMovementStyle(movement.type)}`}>
                        {getMovementIcon(movement.type)}
                        {movementLabels[movement.type] ?? movement.type}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#0f1535]">
                        {movement.product?.name ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-[#9298b4]">
                        {movement.product?.reference ?? "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#343b60]">
                      {movement.quantity}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#343b60]">
                      {movement.warehouse?.name ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#6b7194]">
                      {movement.location?.code ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#6b7194]">
                      {movement.reference ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#6b7194]">
                      {formatDate(movement.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-5 text-sm text-[#6b7194]">
        {filteredMovements.length} mouvement(s) affiché(s)
      </p>
    </div>
  );
}
