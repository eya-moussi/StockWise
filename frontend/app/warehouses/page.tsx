'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type WarehouseType =
  | 'PRINCIPAL'
  | 'PRODUCTION'
  | 'DISTRIBUTION'
  | 'RETOUR'
  | 'REBUT';

type Warehouse = {
  id: number;
  name: string;
  type: WarehouseType;
  description?: string | null;
};

type WarehouseForm = {
  name: string;
  type: WarehouseType;
  description: string;
};

const warehouseTypes: WarehouseType[] = [
  'PRINCIPAL',
  'PRODUCTION',
  'DISTRIBUTION',
  'RETOUR',
  'REBUT',
];

export default function WarehousesPage() {
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] =
    useState<Warehouse | null>(null);

  const [form, setForm] = useState<WarehouseForm>({
    name: '',
    type: 'PRINCIPAL',
    description: '',
  });

  const [errorMessage, setErrorMessage] = useState('');

  const { data: warehouses = [], isLoading } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.get('/warehouses');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WarehouseForm) => {
      const response = await api.post('/warehouses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      closeForm();
    },
    onError: () => setErrorMessage('Unable to create warehouse.'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: WarehouseForm;
    }) => {
      const response = await api.patch(`/warehouses/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      closeForm();
    },
    onError: () => setErrorMessage('Unable to update warehouse.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/warehouses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: () =>
      setErrorMessage(
        'Unable to delete warehouse. It may contain related data.',
      ),
  });

  function openCreateForm() {
    setEditingWarehouse(null);
    setForm({
      name: '',
      type: 'PRINCIPAL',
      description: '',
    });
    setErrorMessage('');
    setIsFormOpen(true);
  }

  function openEditForm(warehouse: Warehouse) {
    setEditingWarehouse(warehouse);
    setForm({
      name: warehouse.name,
      type: warehouse.type,
      description: warehouse.description ?? '',
    });
    setErrorMessage('');
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingWarehouse(null);
    setErrorMessage('');
    setForm({
      name: '',
      type: 'PRINCIPAL',
      description: '',
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    if (!form.name.trim()) {
      setErrorMessage('Warehouse name is required.');
      return;
    }

    const data = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
    };

    if (editingWarehouse) {
      updateMutation.mutate({
        id: editingWarehouse.id,
        data,
      });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleDelete(warehouse: Warehouse) {
    if (window.confirm(`Delete "${warehouse.name}"?`)) {
      deleteMutation.mutate(warehouse.id);
    }
  }

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending;

  return (
    <main className="min-h-screen bg-[#0f172a] p-6 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Warehouses</h1>
            <p className="mt-1 text-slate-400">
              Manage your warehouses and storage locations.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500"
          >
            + Add Warehouse
          </button>
        </div>

        {isFormOpen && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-xl border border-slate-700 bg-[#1e293b] p-6 shadow-lg"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
              </h2>

              <button
                type="button"
                onClick={closeForm}
                className="text-2xl text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="warehouse-name"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Name
                </label>

                <input
                  id="warehouse-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter warehouse name"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="warehouse-type"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Type
                </label>

                <select
                  id="warehouse-type"
                  value={form.type}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      type: event.target.value as WarehouseType,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                >
                  {warehouseTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="warehouse-description"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Description
                </label>

                <textarea
                  id="warehouse-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Enter a description"
                  rows={3}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="mt-4 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
                {errorMessage}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Saving...'
                  : editingWarehouse
                    ? 'Update Warehouse'
                    : 'Create Warehouse'}
              </button>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-600 bg-slate-800 px-5 py-2 font-medium text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {errorMessage && !isFormOpen && (
          <p className="mb-5 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <div className="rounded-xl border border-slate-700 bg-[#1e293b] p-8 text-center text-slate-400">
            Loading warehouses...
          </div>
        ) : warehouses.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-[#1e293b] p-8 text-center text-slate-400">
            No warehouses found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#1e293b] shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Locations
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-700">
                  {warehouses.map((warehouse) => (
                    <tr
                      key={warehouse.id}
                      className="transition hover:bg-slate-800/60"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                        {warehouse.id}
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {warehouse.name}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-300">
                          {warehouse.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/warehouses/${warehouse.id}/locations`}
                          className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          View locations
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(warehouse)}
                            className="rounded-lg bg-amber-500/15 px-3 py-2 font-medium text-amber-300 hover:bg-amber-500/25"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(warehouse)}
                            disabled={deleteMutation.isPending}
                            className="rounded-lg bg-red-500/15 px-3 py-2 font-medium text-red-300 hover:bg-red-500/25 disabled:opacity-50"
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