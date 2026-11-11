"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

const categorySchema = z.object({
  name: z.string().min(2, "Category name is required"),
});

type CategoryFormInput = z.input<typeof categorySchema>;
type CategoryFormData = z.output<typeof categorySchema>;

export default function CreateCategoryPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormInput, undefined, CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const onSubmit = async (data: CategoryFormData) => {
    console.log("FORM DATA:", data);

    try {
      const response = await api.post("/product-categories", data);

      console.log("CREATED CATEGORY:", response.data);

      router.push("/categories");
    } catch (error) {
      console.log("CREATE CATEGORY ERROR:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Categories
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Create Category
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Add a new category to organize your products.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Category name
            </label>

            <input
              id="name"
              {...register("name")}
              placeholder="e.g. Electronics"
              className={`w-full rounded-lg border bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 ${
                errors.name
                  ? "border-red-500"
                  : "border-zinc-700 focus:border-zinc-500"
              }`}
            />

            {errors.name?.message && (
              <p className="mt-2 text-sm text-red-400">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/categories")}
              className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}