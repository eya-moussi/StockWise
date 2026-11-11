"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2, X, Package } from "lucide-react";

import { productsService, Product } from "@/services/products";
import { categoriesService } from "@/services/categories";

type ProductForm = {
  reference: string;
  name: string;
  minStock: string;
  categoryId: string;
};

const initialForm: ProductForm = {
  reference: "",
  name: "",
  minStock: "0",
  categoryId: "",
};

export default function ProductsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pageError, setPageError] = useState("");

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["products", page, search],
    queryFn: () =>
      productsService.getAll({
        page,
        limit: 10,
        search,
      }),
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesService.getAll,
  });

  const products = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      reference: product.reference,
      name: product.name,
      minStock: String(product.minStock),
      categoryId: String(product.categoryId),
    });
    setFormError("");
    setPageError("");
  }

  function closeEdit() {
    setEditingProduct(null);
    setForm(initialForm);
    setFormError("");
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingProduct) return;

    if (
      !form.reference.trim() ||
      !form.name.trim() ||
      !form.categoryId
    ) {
      setFormError("Veuillez remplir tous les champs.");
      return;
    }

    const minStock = Number(form.minStock);
    const categoryId = Number(form.categoryId);

    if (!Number.isInteger(minStock) || minStock < 0) {
      setFormError("Le stock minimum doit être un entier positif ou nul.");
      return;
    }

    if (!Number.isInteger(categoryId) || categoryId < 1) {
      setFormError("Veuillez sélectionner une catégorie valide.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await productsService.update(editingProduct.id, {
        reference: form.reference.trim(),
        name: form.name.trim(),
        minStock,
        categoryId,
      });

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      closeEdit();
    } catch (error) {
      console.error("Erreur modification produit :", error);
      setFormError(
        "Impossible de modifier le produit. Vérifiez les données et vos droits."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le produit « ${product.name} » ?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(product.id);
      setPageError("");

      await productsService.remove(product.id);

      await queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      console.error("Erreur suppression produit :", error);
      setPageError(
        "Suppression impossible. Ce produit est peut-être lié à des mouvements ou à des données d'inventaire."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="py-10 text-center text-[#6b7194]">
        Chargement des produits...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Impossible de charger les produits. Vérifiez la connexion au backend
        et votre authentification.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* En-tête */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
            <Package size={17} />
            Gestion du stock
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
            Produits
          </h1>

          <p className="mt-2 text-sm text-[#6b7194]">
            Consultez et gérez les produits de votre inventaire.
          </p>
        </div>

        <Link
          href="/products/create"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6d5ef0] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b4ce0]"
        >
          <Plus size={18} />
          Ajouter un produit
        </Link>
      </div>

      {/* Formulaire de modification */}
      {editingProduct && (
        <form
          onSubmit={handleUpdate}
          className="mb-6 rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0f1535]">
                Modifier le produit
              </h2>
              <p className="mt-1 text-sm text-[#6b7194]">
                Modifiez les informations du produit sélectionné.
              </p>
            </div>

            <button
              type="button"
              onClick={closeEdit}
              aria-label="Fermer"
              className="rounded-lg p-2 text-[#6b7194] hover:bg-[#f3f4fb]"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#343b60]">
                Référence
              </label>
              <input
                value={form.reference}
                onChange={(event) =>
                  setForm({ ...form, reference: event.target.value })
                }
                className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#343b60]">
                Nom du produit
              </label>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#343b60]">
                Stock minimum
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.minStock}
                onChange={(event) =>
                  setForm({ ...form, minStock: event.target.value })
                }
                className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#343b60]">
                Catégorie
              </label>
              <select
                value={form.categoryId}
                onChange={(event) =>
                  setForm({ ...form, categoryId: event.target.value })
                }
                disabled={categoriesLoading || categories.length === 0}
                className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0] disabled:opacity-60"
                required
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <p className="mt-4 text-sm text-red-600">{formError}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-[#e9ebf5] pt-5">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#6d5ef0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5b4ce0] disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>

            <button
              type="button"
              onClick={closeEdit}
              className="rounded-xl border border-[#e9ebf5] px-5 py-2.5 text-sm font-medium text-[#343b60] hover:bg-[#f3f4fb]"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Recherche */}
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#e9ebf5] bg-white px-4 py-3 shadow-sm sm:max-w-md">
        <Search size={19} className="shrink-0 text-[#9298b4]" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Rechercher par référence ou nom..."
          className="w-full bg-transparent text-sm text-[#0f1535] outline-none placeholder:text-[#9298b4]"
        />
      </div>

      {pageError && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {pageError}
        </p>
      )}

      {/* Tableau */}
      <div className="overflow-hidden rounded-2xl border border-[#e9ebf5] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-[#f8f8fd]">
              <tr className="border-b border-[#e9ebf5] text-left text-xs font-semibold uppercase tracking-wide text-[#9298b4]">
                <th className="px-6 py-4">Référence</th>
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Stock minimum</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-[#9298b4]"
                  >
                    Aucun produit trouvé.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-[#f0f1f8] last:border-0 hover:bg-[#fafaff]"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-[#6d5ef0]">
                      {product.reference}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#0f1535]">
                      {product.name}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#6b7194]">
                      {product.category?.name ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#343b60]">
                      {product.minStock}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          title="Modifier"
                          className="rounded-lg p-2 text-[#6d5ef0] transition hover:bg-[#f0efff]"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          disabled={deletingId === product.id}
                          onClick={() => handleDelete(product)}
                          title="Supprimer"
                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#6b7194]">
          {data?.total ?? 0} produit(s) au total
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className="rounded-lg border border-[#e9ebf5] bg-white px-4 py-2 text-sm font-medium text-[#343b60] hover:bg-[#f8f8fd] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Précédent
          </button>

          <span className="text-sm text-[#6b7194]">
            Page <strong className="text-[#0f1535]">{page}</strong> sur{" "}
            <strong className="text-[#0f1535]">{totalPages}</strong>
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-[#e9ebf5] bg-white px-4 py-2 text-sm font-medium text-[#343b60] hover:bg-[#f8f8fd] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}