"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PackagePlus } from "lucide-react";

import { productsService, CreateProductDto } from "@/services/products";
import { categoriesService } from "@/services/categories";

export default function CreateProductPage() {
  const router = useRouter();

  const [reference, setReference] = useState("");
  const [name, setName] = useState("");
  const [minStock, setMinStock] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    data: categories = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesService.getAll,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const stockValue = Number(minStock);
    const selectedCategory = Number(categoryId);

    if (!reference.trim() || !name.trim() || !categoryId) {
      setErrorMessage("Veuillez remplir tous les champs.");
      return;
    }

    if (!Number.isInteger(stockValue) || stockValue < 0) {
      setErrorMessage("Le stock minimum doit être un entier positif ou nul.");
      return;
    }

    if (!Number.isInteger(selectedCategory) || selectedCategory < 1) {
      setErrorMessage("Veuillez sélectionner une catégorie valide.");
      return;
    }

    const productData: CreateProductDto = {
      reference: reference.trim(),
      name: name.trim(),
      minStock: stockValue,
      categoryId: selectedCategory,
    };

    try {
      setSaving(true);
      setErrorMessage("");

      await productsService.create(productData);

      router.push("/products");
      router.refresh();
    } catch (error) {
      console.error("Erreur création produit :", error);
      setErrorMessage(
        "Impossible de créer le produit. Vérifiez les informations et vos droits."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6b7194] transition hover:text-[#6d5ef0]"
      >
        <ArrowLeft size={17} />
        Retour aux produits
      </Link>

      <div className="mb-7">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0efff] text-[#6d5ef0]">
          <PackagePlus size={24} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
          Ajouter un produit
        </h1>

        <p className="mt-2 text-sm text-[#6b7194]">
          Renseignez les informations du nouveau produit.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="reference"
              className="mb-2 block text-sm font-medium text-[#343b60]"
            >
              Référence
            </label>

            <input
              id="reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ex. PRD-001"
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none transition focus:border-[#6d5ef0]"
              required
            />
          </div>

          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-[#343b60]"
            >
              Nom du produit
            </label>

            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Clavier sans fil"
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none transition focus:border-[#6d5ef0]"
              required
            />
          </div>

          <div>
            <label
              htmlFor="minStock"
              className="mb-2 block text-sm font-medium text-[#343b60]"
            >
              Stock minimum
            </label>

            <input
              id="minStock"
              type="number"
              min="0"
              step="1"
              value={minStock}
              onChange={(event) => setMinStock(event.target.value)}
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none transition focus:border-[#6d5ef0]"
              required
            />

            <p className="mt-2 text-xs text-[#9298b4]">
              Seuil utilisé pour repérer les stocks faibles.
            </p>
          </div>

          <div>
            <label
              htmlFor="categoryId"
              className="mb-2 block text-sm font-medium text-[#343b60]"
            >
              Catégorie
            </label>

            <select
              id="categoryId"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={isLoading || isError || categories.length === 0}
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none transition focus:border-[#6d5ef0] disabled:opacity-60"
              required
            >
              <option value="">
                {isLoading
                  ? "Chargement des catégories..."
                  : "Sélectionner une catégorie"}
              </option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {isError && (
              <p className="mt-2 text-xs text-red-600">
                Impossible de charger les catégories.
              </p>
            )}

            {!isLoading && !isError && categories.length === 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Aucune catégorie disponible. Créez d&apos;abord une catégorie.
              </p>
            )}
          </div>
        </div>

        {errorMessage && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-[#e9ebf5] pt-6">
          <Link
            href="/products"
            className="rounded-xl border border-[#e9ebf5] px-5 py-3 text-sm font-medium text-[#343b60] transition hover:bg-[#f8f8fd]"
          >
            Annuler
          </Link>

          <button
            type="submit"
            disabled={saving || isLoading || categories.length === 0}
            className="rounded-xl bg-[#6d5ef0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5b4ce0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Création..." : "Créer le produit"}
          </button>
        </div>
      </form>
    </div>
  );
}