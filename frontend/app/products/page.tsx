'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productsService, Product } from '@/services/products';

type ProductForm = {
  reference: string;
  name: string;
  minStock: string;
  categoryId: string;
};

export default function ProductsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>({
    reference: '',
    name: '',
    minStock: '0',
    categoryId: '',
  });

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () =>
      productsService.getAll({
        page,
        limit: 10,
        search,
      }),
  });

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      reference: product.reference,
      name: product.name,
      minStock: String(product.minStock),
      categoryId: String(product.categoryId),
    });
    setFormError('');
  }

  function closeEdit() {
    setEditingProduct(null);
    setFormError('');
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingProduct) return;

    if (
      !form.reference.trim() ||
      !form.name.trim() ||
      !form.categoryId.trim()
    ) {
      setFormError('Reference, name and category ID are required.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      await productsService.update(editingProduct.id, {
        reference: form.reference.trim(),
        name: form.name.trim(),
        minStock: Number(form.minStock),
        categoryId: Number(form.categoryId),
      });

      await queryClient.invalidateQueries({
        queryKey: ['products'],
      });

      closeEdit();
    } catch (error) {
      console.error('Update product error:', error);
      setFormError('Failed to update product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(product.id);

      await productsService.remove(product.id);

      await queryClient.invalidateQueries({
        queryKey: ['products'],
      });
    } catch (error) {
      console.error('Delete product error:', error);
      alert('Failed to delete product. It may have related stock movements.');
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0f172a] p-8 text-slate-100">
        <p className="text-slate-400">Loading products...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0f172a] p-8 text-slate-100">
        <p className="text-red-300">Failed to load products.</p>
      </main>
    );
  }

  const products = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <main className="min-h-screen bg-[#0f172a] p-6 text-slate-100 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Products
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Keep track of your products and stock limits.
            </p>
          </div>

          <Link
            href="/products/create"
            className="inline-flex w-fit items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            + Create Product
          </Link>
        </div>

        {editingProduct && (
          <form
            onSubmit={handleUpdate}
            className="mb-6 rounded-xl border border-slate-700 bg-[#1e293b] p-5"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Edit product
                </h2>
                <p className="text-sm text-slate-400">
                  Update the product information below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="text-xl text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-slate-300">
                  Reference
                </label>
                <input
                  value={form.reference}
                  onChange={(event) =>
                    setForm({ ...form, reference: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-300">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-300">
                  Minimum stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(event) =>
                    setForm({ ...form, minStock: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-300">
                  Category ID
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm({ ...form, categoryId: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {formError && (
              <p className="mt-4 text-sm text-red-300">{formError}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>

              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mb-5">
          <input
            className="w-full max-w-sm rounded-lg border border-slate-700 bg-[#1e293b] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
            placeholder="Search products..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#1e293b]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-700 bg-slate-800/70">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Reference
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Name
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Min Stock
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-sm text-slate-400"
                    >
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-slate-700/70 last:border-0 hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 text-sm text-slate-300">
                        {product.reference}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-white">
                        {product.name}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {product.minStock}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === product.id}
                            onClick={() => handleDelete(product)}
                            className="rounded-md bg-red-500/15 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                          >
                            {deletingId === product.id
                              ? 'Deleting...'
                              : 'Delete'}
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

        <div className="mt-5 flex items-center gap-4 text-sm">
          <button
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>

          <span className="text-slate-400">
            Page <span className="text-white">{page}</span> of{' '}
            <span className="text-white">{totalPages}</span>
          </span>

          <button
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}