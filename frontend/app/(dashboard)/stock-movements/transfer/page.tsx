
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";

import { productsService } from "@/services/products";
import { warehousesService } from "@/services/warehouses";
import { stockMovementsService } from "@/services/stock-movements";

export default function TransferStockPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [formError, setFormError] = useState("");

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsService.getAll({ limit: 100 }),
  });

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehousesService.getAll,
  });

  const mutation = useMutation({
    mutationFn: () =>
      stockMovementsService.transfer({
        productId: Number(productId),
        fromWarehouseId: Number(fromWarehouseId),
        toWarehouseId: Number(toWarehouseId),
        quantity: Number(quantity),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
      }),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-movements"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);

      router.push("/stock-movements");
    },

    onError: (error) => {
      console.error("Erreur transfert :", error);
      setFormError(
        "Impossible d'effectuer le transfert. Vérifiez le stock disponible, les données et vos droits."
      );
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const productNumber = Number(productId);
    const sourceNumber = Number(fromWarehouseId);
    const destinationNumber = Number(toWarehouseId);
    const quantityNumber = Number(quantity);

    if (!productId || !fromWarehouseId || !toWarehouseId) {
      setFormError("Veuillez sélectionner le produit et les deux entrepôts.");
      return;
    }

    if (
      !Number.isInteger(productNumber) ||
      productNumber < 1 ||
      !Number.isInteger(sourceNumber) ||
      sourceNumber < 1 ||
      !Number.isInteger(destinationNumber) ||
      destinationNumber < 1
    ) {
      setFormError("Veuillez sélectionner des valeurs valides.");
      return;
    }

    if (sourceNumber === destinationNumber) {
      setFormError("L'entrepôt source et l'entrepôt destination doivent être différents.");
      return;
    }

    if (!Number.isInteger(quantityNumber) || quantityNumber <= 0) {
      setFormError("La quantité doit être un entier strictement positif.");
      return;
    }

    mutation.mutate();
  }

  const products = productsData?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/stock-movements"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6b7194] transition hover:text-[#6d5ef0]"
      >
        <ArrowLeft size={17} />
        Retour à l&apos;historique
      </Link>

      <div className="mb-8">
        <p className="mb-2 text-sm text-[#6b7194]">Gestion du stock</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
          Transfert de stock
        </h1>
        <p className="mt-2 text-sm text-[#6b7194]">
          Déplacez une quantité de produits d&apos;un entrepôt vers un autre.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-7 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <span className="rounded-lg bg-blue-100 p-2 text-blue-700">
            <ArrowLeftRight size={21} />
          </span>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Transfert entre entrepôts
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Le stock sera diminué à la source et augmenté à destination.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-[#343b60]">
              Produit *
            </label>
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              disabled={productsLoading}
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0] disabled:opacity-60"
              required
            >
              <option value="">
                {productsLoading ? "Chargement..." : "Sélectionner un produit"}
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.reference} — {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#343b60]">
              Entrepôt source *
            </label>
            <select
              value={fromWarehouseId}
              onChange={(event) => setFromWarehouseId(event.target.value)}
              disabled={warehousesLoading}
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0] disabled:opacity-60"
              required
            >
              <option value="">
                {warehousesLoading ? "Chargement..." : "Choisir la source"}
              </option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#343b60]">
              Entrepôt destination *
            </label>
            <select
              value={toWarehouseId}
              onChange={(event) => setToWarehouseId(event.target.value)}
              disabled={warehousesLoading}
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0] disabled:opacity-60"
              required
            >
              <option value="">
                {warehousesLoading ? "Chargement..." : "Choisir la destination"}
              </option>
              {warehouses
                .filter((warehouse) => String(warehouse.id) !== fromWarehouseId)
                .map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#343b60]">
              Quantité *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0]"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#343b60]">
              Référence (facultatif)
            </label>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ex. : TRANS-001"
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0]"
            />
          </div>
        </div>

        {formError && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-[#e9ebf5] pt-6">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-xl bg-[#6d5ef0] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5b4ce0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? "Transfert en cours..." : "Confirmer le transfert"}
          </button>

          <Link
            href="/stock-movements"
            className="rounded-xl border border-[#e9ebf5] px-6 py-3 text-sm font-medium text-[#343b60] transition hover:bg-[#f3f4fb]"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
