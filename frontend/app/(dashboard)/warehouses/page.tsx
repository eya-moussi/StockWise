
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Warehouse as WarehouseIcon,
} from "lucide-react";

import {
  warehousesService,
  Warehouse,
  WarehouseType,
} from "@/services/warehouses";

type WarehouseForm = {
  name: string;
  type: WarehouseType;
  description: string;
};

const initialForm: WarehouseForm = {
  name: "",
  type: "PRINCIPAL",
  description: "",
};

const warehouseTypes: { value: WarehouseType; label: string }[] = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "PRODUCTION", label: "Production" },
  { value: "DISTRIBUTION", label: "Distribution" },
  { value: "RETOUR", label: "Retour" },
  { value: "REBUT", label: "Rebut" },
];

function getTypeLabel(type: WarehouseType) {
  return warehouseTypes.find((item) => item.value === type)?.label ?? type;
}

export default function WarehousesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [editingWarehouse, setEditingWarehouse] =
    useState<Warehouse | null>(null);
  const [form, setForm] = useState<WarehouseForm>(initialForm);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    data: warehouses = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehousesService.getAll,
  });

  const filteredWarehouses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return warehouses;

    return warehouses.filter(
      (warehouse) =>
        warehouse.name.toLowerCase().includes(normalizedSearch) ||
        getTypeLabel(warehouse.type).toLowerCase().includes(normalizedSearch) ||
        (warehouse.description ?? "")
          .toLowerCase()
          .includes(normalizedSearch)
    );
  }, [warehouses, search]);

  function openEdit(warehouse: Warehouse) {
    setEditingWarehouse(warehouse);
    setForm({
      name: warehouse.name,
      type: warehouse.type,
      description: warehouse.description ?? "",
    });
    setFormError("");
    setPageError("");
  }

  function closeEdit() {
    setEditingWarehouse(null);
    setForm(initialForm);
    setFormError("");
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingWarehouse) return;

    if (!form.name.trim()) {
      setFormError("Veuillez saisir le nom de l'entrepôt.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await warehousesService.update(editingWarehouse.id, {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim() || undefined,
      });

      await queryClient.invalidateQueries({
        queryKey: ["warehouses"],
      });

      closeEdit();
    } catch (error) {
      console.error("Erreur modification entrepôt :", error);
      setFormError(
        "Impossible de modifier l'entrepôt. Vérifiez les données et vos droits."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(warehouse: Warehouse) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer l'entrepôt « ${warehouse.name} » ?\n\nAttention : cette opération peut être refusée si l'entrepôt possède des stocks, des mouvements ou des inventaires associés.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(warehouse.id);
      setPageError("");

      await warehousesService.remove(warehouse.id);

      await queryClient.invalidateQueries({
        queryKey: ["warehouses"],
      });
    } catch (error) {
      console.error("Erreur suppression entrepôt :", error);
      setPageError(
        "Suppression impossible. Cet entrepôt possède peut-être des stocks, des mouvements ou des inventaires associés. Vérifiez également vos droits."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="py-10 text-center text-[#6b7194]">
        Chargement des entrepôts...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Impossible de charger les entrepôts. Vérifiez la connexion au backend
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
            <WarehouseIcon size={17} />
            Gestion du stock
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
            Entrepôts
          </h1>

          <p className="mt-2 text-sm text-[#6b7194]">
            Consultez et gérez les différents entrepôts.
          </p>
        </div>

        <Link
          href="/warehouses/create"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6d5ef0] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b4ce0]"
        >
          <Plus size={18} />
          Ajouter un entrepôt
        </Link>
      </div>

      {/* Formulaire de modification */}
      {editingWarehouse && (
        <form
          onSubmit={handleUpdate}
          className="mb-6 rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0f1535]">
                Modifier l&apos;entrepôt
              </h2>
              <p className="mt-1 text-sm text-[#6b7194]">
                Modifiez les informations de l&apos;entrepôt sélectionné.
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
                Nom de l&apos;entrepôt
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
                Type d&apos;entrepôt
              </label>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    type: event.target.value as WarehouseType,
                  })
                }
                className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0]"
                required
              >
                {warehouseTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[#343b60]">
                Description (facultative)
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                rows={3}
                className="w-full resize-y rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0]"
              />
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
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un entrepôt..."
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
          <table className="w-full min-w-[760px]">
            <thead className="bg-[#f8f8fd]">
              <tr className="border-b border-[#e9ebf5] text-left text-xs font-semibold uppercase tracking-wide text-[#9298b4]">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nom</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Création</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredWarehouses.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-[#9298b4]"
                  >
                    Aucun entrepôt trouvé.
                  </td>
                </tr>
              ) : (
                filteredWarehouses.map((warehouse) => (
                  <tr
                    key={warehouse.id}
                    className="border-b border-[#f0f1f8] last:border-0 hover:bg-[#fafaff]"
                  >
                    <td className="px-6 py-4 text-sm text-[#9298b4]">
                      #{warehouse.id}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#0f1535]">
                      {warehouse.name}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#6d5ef0]">
                      {getTypeLabel(warehouse.type)}
                    </td>

                    <td className="max-w-xs truncate px-6 py-4 text-sm text-[#6b7194]">
                      {warehouse.description || "—"}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#6b7194]">
                      {new Date(warehouse.createdAt).toLocaleDateString(
                        "fr-FR"
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(warehouse)}
                          title="Modifier"
                          className="rounded-lg p-2 text-[#6d5ef0] transition hover:bg-[#f0efff]"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          disabled={deletingId === warehouse.id}
                          onClick={() => handleDelete(warehouse)}
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

      {/* Nombre de résultats */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-[#6b7194]">
          {filteredWarehouses.length} entrepôt(s) affiché(s)
          {search.trim() && ` sur ${warehouses.length}`}
        </p>
      </div>
    </div>
  );
}
