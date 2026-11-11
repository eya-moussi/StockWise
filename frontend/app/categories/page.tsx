'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';

interface Category {
  id: number;
  name: string;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  const [editingCategory, setEditingCategory] = useState<Category | null>(
    null,
  );
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<Category[]>('/product-categories');
      return response.data;
    },
  });

  function openEdit(category: Category) {
    setEditingCategory(category);
    setName(category.name);
    setErrorMessage('');
  }

  function closeEdit() {
    setEditingCategory(null);
    setName('');
    setErrorMessage('');
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingCategory || !name.trim()) {
      setErrorMessage('Category name is required.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');

      await api.patch(`/product-categories/${editingCategory.id}`, {
        name: name.trim(),
      });

      await queryClient.invalidateQueries({
        queryKey: ['categories'],
      });

      closeEdit();
    } catch (error) {
      console.error('Update category error:', error);
      setErrorMessage('Failed to update category.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/product-categories/${category.id}`);

      await queryClient.invalidateQueries({
        queryKey: ['categories'],
      });
    } catch (error) {
      console.error('Delete category error:', error);
      alert(
        'Failed to delete category. It may be used by existing products.',
      );
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0f172a] p-8 text-slate-100">
        <p className="text-slate-400">Loading categories...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0f172a] p-8 text-slate-100">
        <p className="text-red-300">Failed to load categories.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f172a] p-6 text-slate-100 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Categories
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Organize products into simple categories.
            </p>
          </div>

          <Link
            href="/categories/create"
            className="inline-flex w-fit items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            + Create Category
          </Link>
        </div>

        {editingCategory && (
          <form
            onSubmit={handleUpdate}
            className="mb-6 rounded-xl border border-slate-700 bg-[#1e293b] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Edit category
                </h2>
                <p className="text-sm text-slate-400">
                  Change the category name.
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

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Category name"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />

            {errorMessage && (
              <p className="mt-3 text-sm text-red-300">{errorMessage}</p>
            )}

            <div className="mt-4 flex gap-3">
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

        {categories.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-[#1e293b] p-8 text-center text-slate-400">
            No categories found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#1e293b]">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-slate-700 bg-slate-800/70">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      ID
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Name
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-b border-slate-700/70 last:border-0 hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 text-sm text-slate-400">
                        {category.id}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-white">
                        {category.name}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(category)}
                            className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            className="rounded-md bg-red-500/15 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/25"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}