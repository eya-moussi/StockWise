"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { productsService } from "@/services/products";
import { useRouter } from "next/navigation";

const productSchema = z.object({
  reference: z.string().min(2, "Reference is required"),
  name: z.string().min(2, "Name is required"),
  minStock: z.coerce
    .number()
    .min(0, "Minimum stock cannot be negative"),
  categoryId: z.coerce
    .number()
    .min(1, "Category ID must be at least 1"),
});

type ProductFormInput = z.input<typeof productSchema>;
type ProductFormData = z.output<typeof productSchema>;

export default function CreateProductPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput, undefined, ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const onSubmit = async (data: ProductFormData) => {
    console.log("FORM DATA:", data);

    try {
      const result = await productsService.create(data);

      console.log("CREATED PRODUCT:", result);

      router.push("/products");
    } catch (error) {
      console.log("CREATE ERROR:", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
            Product Management
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Create Product
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Add a new product to your inventory.
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-7 shadow-xl shadow-black/20"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Reference */}
            <div>
              <label
                htmlFor="reference"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Reference
              </label>

              <input
                id="reference"
                {...register("reference")}
                placeholder="e.g. PRD-001"
                className={`w-full rounded-lg border bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 ${
                  errors.reference
                    ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                }`}
              />

              {errors.reference?.message && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.reference.message}
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Product name
              </label>

              <input
                id="name"
                {...register("name")}
                placeholder="e.g. Wireless Mouse"
                className={`w-full rounded-lg border bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 ${
                  errors.name
                    ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                }`}
              />

              {errors.name?.message && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Minimum Stock */}
            <div>
              <label
                htmlFor="minStock"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Minimum stock
              </label>

              <input
                id="minStock"
                type="number"
                min="0"
                {...register("minStock")}
                placeholder="0"
                className={`w-full rounded-lg border bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 ${
                  errors.minStock
                    ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-zinc-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                }`}
              />

              <p className="mt-2 text-xs text-zinc-500">
                Alert threshold for low stock.
              </p>

              {errors.minStock?.message && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.minStock.message}
                </p>
              )}
            </div>

            {/* Category ID */}
            <div>
              <label
                htmlFor="categoryId"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Category ID
              </label>

              <input
                id="categoryId"
                type="number"
                min="1"
                {...register("categoryId")}
                placeholder="e.g. 1"
                className={`w-full rounded-lg border bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 ${
                  errors.categoryId
                    ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                }`}
              />

              <p className="mt-2 text-xs text-zinc-500">
                Enter the ID of an existing category.
              </p>

              {errors.categoryId?.message && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.categoryId.message}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/products")}
              className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500"
            >
              Create Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}