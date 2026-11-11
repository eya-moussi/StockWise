"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tags } from "lucide-react";
import api from "@/lib/api";

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCategory = async () => {
      try {
        const response = await api.get(`/product-categories/${id}`);
        setName(response.data.name);
      } catch (err) {
        console.error("Failed to load category:", err);
        setError("Failed to load category.");
      } finally {
        setLoading(false);
      }
    };

    void loadCategory();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await api.patch(`/product-categories/${id}`, {
        name: name.trim(),
      });
      router.push("/categories");
    } catch (err) {
      console.error("Update category error:", err);
      setError("Failed to update category.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-8 shadow-sm">
          <div className="h-6 w-40 animate-pulse rounded bg-[#eef0f7]" />
          <p className="mt-4 text-sm text-[#9298b4]">Loading category...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
          <Tags size={17} />
          Gestion du stock
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
          Edit Category
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="category-name"
            className="mb-2 block text-sm font-medium text-[#343b60]"
          >
            Category Name
          </label>

          <input
            id="category-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none focus:border-[#6d5ef0]"
            placeholder="Category name"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-3 border-t border-[#e9ebf5] pt-5">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#6d5ef0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b4ce0] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/categories")}
            className="rounded-xl border border-[#e9ebf5] px-5 py-2.5 text-sm font-medium text-[#343b60] transition hover:bg-[#f3f4fb]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
