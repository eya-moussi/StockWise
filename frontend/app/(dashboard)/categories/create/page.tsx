"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Tags } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { categoriesService } from "@/services/categories";

export default function CreateCategoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setErrorMessage("Le nom de la catégorie est obligatoire.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      await categoriesService.create({
        name: name.trim(),
      });
      await queryClient.invalidateQueries({
        queryKey: ["categories"],
      });
      router.push("/categories");
      router.refresh();
    } catch (error) {
      console.error("Erreur création catégorie :", error);
      setErrorMessage(
        "Impossible de créer la catégorie. Ce nom existe peut-être déjà ou vous ne disposez pas des droits nécessaires."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/categories"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6b7194] transition hover:text-[#6d5ef0]"
      >
        <ArrowLeft size={17} />
        Retour aux catégories
      </Link>

      <div className="mb-7">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0efff] text-[#6d5ef0]">
          <Tags size={24} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
          Ajouter une catégorie
        </h1>

        <p className="mt-2 text-sm text-[#6b7194]">
          Créez une catégorie pour organiser vos produits.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <label
            htmlFor="categoryName"
            className="mb-2 block text-sm font-medium text-[#343b60]"
          >
            Nom de la catégorie
          </label>

          <input
            id="categoryName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex. Informatique"
            className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none transition focus:border-[#6d5ef0]"
            required
          />
        </div>

        {errorMessage && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-[#e9ebf5] pt-6">
          <Link
            href="/categories"
            className="rounded-xl border border-[#e9ebf5] px-5 py-3 text-sm font-medium text-[#343b60] transition hover:bg-[#f8f8fd]"
          >
            Annuler
          </Link>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-xl bg-[#6d5ef0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5b4ce0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Création..." : "Créer la catégorie"}
          </button>
        </div>
      </form>
    </div>
  );
}
