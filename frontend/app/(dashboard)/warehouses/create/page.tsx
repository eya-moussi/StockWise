
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Warehouse as WarehouseIcon } from "lucide-react";

import {
  warehousesService,
  WarehouseType,
} from "@/services/warehouses";

const warehouseTypes: { value: WarehouseType; label: string }[] = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "PRODUCTION", label: "Production" },
  { value: "DISTRIBUTION", label: "Distribution" },
  { value: "RETOUR", label: "Retour" },
  { value: "REBUT", label: "Rebut" },
];

export default function CreateWarehousePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [type, setType] = useState<WarehouseType>("PRINCIPAL");
  const [description, setDescription] = useState("");

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setFormError("Veuillez saisir le nom de l'entrepôt.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await warehousesService.create({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
      });

      await queryClient.invalidateQueries({
        queryKey: ["warehouses"],
      });

      router.push("/warehouses");
    } catch (error) {
      console.error("Erreur création entrepôt :", error);

      setFormError(
        "Impossible de créer l'entrepôt. Vérifiez les données, la connexion au backend et vos droits."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Retour */}
      <Link
        href="/warehouses"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6b7194] transition hover:text-[#6d5ef0]"
      >
        <ArrowLeft size={17} />
        Retour aux entrepôts
      </Link>

      {/* En-tête */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
          <WarehouseIcon size={17} />
          Gestion du stock
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
          Ajouter un entrepôt
        </h1>

        <p className="mt-2 text-sm text-[#6b7194]">
          Renseignez les informations du nouvel entrepôt.
        </p>
      </div>

      {/* Formulaire */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#0f1535]">
            Informations de l&apos;entrepôt
          </h2>

          <p className="mt-1 text-sm text-[#6b7194]">
            Les champs marqués d&apos;un astérisque sont obligatoires.
          </p>
        </div>

        <div className="space-y-5">
          {/* Nom */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-[#343b60]"
            >
              Nom de l&apos;entrepôt *
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Exemple : Entrepôt central"
              required
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none transition focus:border-[#6d5ef0]"
            />
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="mb-2 block text-sm font-medium text-[#343b60]"
            >
              Type d&apos;entrepôt *
            </label>

            <select
              id="type"
              value={type}
              onChange={(event) =>
                setType(event.target.value as WarehouseType)
              }
              required
              className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none transition focus:border-[#6d5ef0]"
            >
              {warehouseTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-[#343b60]"
            >
              Description
              <span className="ml-1 font-normal text-[#9298b4]">
                (facultative)
              </span>
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Décrivez brièvement cet entrepôt..."
              rows={4}
              className="w-full resize-y rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none transition focus:border-[#6d5ef0]"
            />
          </div>
        </div>

        {/* Erreur */}
        {formError && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        {/* Boutons */}
        <div className="mt-8 flex flex-wrap gap-3 border-t border-[#e9ebf5] pt-6">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#6d5ef0] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b4ce0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Création en cours..." : "Créer l'entrepôt"}
          </button>

          <Link
            href="/warehouses"
            className="rounded-xl border border-[#e9ebf5] px-6 py-3 text-sm font-medium text-[#343b60] transition hover:bg-[#f3f4fb]"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
