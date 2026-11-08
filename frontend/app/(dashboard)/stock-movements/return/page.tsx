
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  RotateCcw,
  PackageCheck,
  Truck,
} from "lucide-react";

import { productsService } from "@/services/products";
import { warehousesService } from "@/services/warehouses";
import { stockMovementsService } from "@/services/stock-movements";

type ReturnType = "RETURN_CLIENT" | "RETURN_SUPPLIER";

export default function CreateReturnPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [type, setType] = useState<ReturnType>("RETURN_CLIENT");
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
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
      stockMovementsService.createReturn({
        type,
        productId: Number(productId),
        warehouseId: Number(warehouseId),
        quantity: Number(quantity),
        ...(reference.trim()
          ? { reference: reference.trim() }
          : {}),
      }),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["stock-movements"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["products"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        }),
      ]);

      router.push("/stock-movements");
    },

    onError: (error) => {
      console.error("Erreur création retour :", error);
      setFormError(
        "Impossible d'enregistrer le retour. Vérifiez les données et la disponibilité du stock."
      );
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const productNumber = Number(productId);
    const warehouseNumber = Number(warehouseId);
    const quantityNumber = Number(quantity);

    if (!productId || !warehouseId) {
      setFormError("Veuillez sélectionner un produit et un entrepôt.");
      return;
    }

    if (
      !Number.isInteger(productNumber) ||
      productNumber < 1 ||
      !Number.isInteger(warehouseNumber) ||
      warehouseNumber < 1
    ) {
      setFormError("Veuillez sélectionner des données valides.");
      return;
    }

    if (!Number.isInteger(quantityNumber) || quantityNumber <= 0) {
      setFormError(
        "La quantité doit être un entier strictement positif."
      );
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
        <p className="mb-2 text-sm text-[#6b7194]">
          Gestion du stock
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
          Enregistrer un retour
        </h1>
        <p className="mt-2 text-sm text-[#6b7194]">
          Enregistrez le retour d&apos;un produit vers ou depuis un entrepôt.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-7">
          <label className="mb-3 block text-sm font-semibold text-[#343b60]">
            Type de retour
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setType("RETURN_CLIENT")}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                type === "RETURN_CLIENT"
                  ? "border-green-300 bg-green-50 ring-1 ring-green-200"
                  : "border-[#e9ebf5] hover:bg-[#fafaff]"
              }`}
            >
              <span className="rounded-lg bg-green-100 p-2 text-green-700">
                <PackageCheck size={20} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#0f1535]">
                  Retour client
                </span>
                <span className="mt-1 block text-xs text-[#6b7194]">
                  Ajouter les produits retournés au stock
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setType("RETURN_SUPPLIER")}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                type === "RETURN_SUPPLIER"
                  ? "border-orange-300 bg-orange-50 ring-1 ring-orange-200"
                  : "border-[#e9ebf5] hover:bg-[#fafaff]"
              }`}
            >
              <span className="rounded-lg bg-orange-100 p-2 text-orange-700">
                <Truck size={20} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#0f1535]">
                  Retour fournisseur
                </span>
                <span className="mt-1 block text-xs text-[#6b7194]">
                  Retirer les produits du stock
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
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
                {productsLoading
                  ? "Chargement..."
                  : "Sélectionner un produit"}
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
              Entrepôt *
            </label>
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              disabled={warehousesLoading}
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0] disabled:opacity-60"
              required
            >
              <option value="">
                {warehousesLoading
                  ? "Chargement..."
                  : "Sélectionner un entrepôt"}
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
              placeholder="Ex. : RET-001"
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0]"
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#e9ebf5] bg-[#fafaff] p-4">
          <p className="text-sm font-medium text-[#343b60]">
            <RotateCcw size={16} className="mr-2 inline" />
            Impact sur le stock
          </p>
          <p className="mt-1 text-sm text-[#6b7194]">
            {type === "RETURN_CLIENT"
              ? "Le retour client augmente la quantité disponible dans l'entrepôt."
              : "Le retour fournisseur diminue la quantité disponible dans l'entrepôt."}
          </p>
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
            {mutation.isPending
              ? "Enregistrement..."
              : "Enregistrer le retour"}
          </button>

          <Link
            href="/stock-movements"
            className="rounded-xl border border-[#e9ebf5] px-6 py-3 text-sm font-medium text-[#343b60] transition hover:bg-[#f3f4fb]"
          >
            Annuler
          </Link>
        </div>
      </form>

      <p className="mt-4 text-xs text-[#9298b4]">
        * Champs obligatoires. Un retour fournisseur ne peut pas dépasser le stock disponible.
      </p>
    </div>
  );
}
