
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import {
  categoriesService,
  Category,
} from "@/services/categories";

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");

  const {
    data: categories = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesService.getAll,
  });

  function openEdit(category: Category) {
    setEditingCategory(category);
    setName(category.name);
    setFormError("");
    setPageError("");
  }

  function closeEdit() {
    setEditingCategory(null);
    setName("");
    setFormError("");
  }

  async function handleUpdate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingCategory || !name.trim()) {
      setFormError("Le nom de la catégorie est obligatoire.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await categoriesService.update(editingCategory.id, {
        name: name.trim(),
      });

      await queryClient.invalidateQueries({
        queryKey: ["categories"],
      });

      closeEdit();
    } catch (error) {
      console.error("Erreur modification catégorie :", error);
      setFormError(
        "Impossible de modifier la catégorie. Vérifiez son nom et vos droits."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la catégorie « ${category.name} » ?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(category.id);
      setPageError("");

      await categoriesService.remove(category.id);

      await queryClient.invalidateQueries({
        queryKey: ["categories"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    } catch (error) {
      console.error("Erreur suppression catégorie :", error);
      setPageError(
        "Suppression impossible. Cette catégorie est peut-être utilisée par des produits."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="py-10 text-center text-[#6b7194]">
        Chargement des catégories...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Impossible de charger les catégories. Vérifiez la connexion au backend et votre authentification.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
            <Tags size={17} />
            Gestion du stock
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
            Catégories
          </h1>

          <p className="mt-2 text-sm text-[#6b7194]">
            Organisez vos produits par catégories.
          </p>
        </div>

        <Link
          href="/categories/create"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6d5ef0] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b4ce0]"
        >
          <Plus size={18} />
          Ajouter une catégorie
        </Link>
      </div>

      {editingCategory && (
        <form
          onSubmit={handleUpdate}
          className="mb-6 rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0f1535]">
                Modifier la catégorie
              </h2>
              <p className="mt-1 text-sm text-[#6b7194]">
                Modifiez le nom de la catégorie sélectionnée.
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

          <label
            htmlFor="edit-category-name"
            className="mb-2 block text-sm font-medium text-[#343b60]"
          >
            Nom de la catégorie
          </label>

          <input
            id="edit-category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0]"
            required
          />

          {formError && (
            <p className="mt-3 text-sm text-red-600">
              {formError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3 border-t border-[#e9ebf5] pt-5">
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

      {pageError && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {pageError}
        </p>
      )}

      <div className="mb-5 flex items-center justify-between rounded-xl border border-[#e9ebf5] bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-[#343b60]">
            Nombre de catégories
          </p>
          <p className="mt-1 text-2xl font-bold text-[#0f1535]">
            {categories.length}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0efff] text-[#6d5ef0]">
          <Tags size={22} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e9ebf5] bg-white shadow-sm">
        {categories.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Tags size={32} className="mx-auto mb-3 text-[#9298b4]" />
            <p className="text-sm text-[#6b7194]">
              Aucune catégorie trouvée.
            </p>
            <Link
              href="/categories/create"
              className="mt-4 inline-block text-sm font-semibold text-[#6d5ef0] hover:underline"
            >
              Ajouter votre première catégorie
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-[#f8f8fd]">
                <tr className="border-b border-[#e9ebf5] text-left text-xs font-semibold uppercase tracking-wide text-[#9298b4]">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Nom de la catégorie</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-[#f0f1f8] last:border-0 hover:bg-[#fafaff]"
                  >
                    <td className="px-6 py-4 text-sm text-[#9298b4]">
                      #{category.id}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#0f1535]">
                      {category.name}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          title="Modifier"
                          className="rounded-lg p-2 text-[#6d5ef0] transition hover:bg-[#f0efff]"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          disabled={deletingId === category.id}
                          onClick={() => handleDelete(category)}
                          title="Supprimer"
                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
