"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface Location {
  id: number;
  code: string;
  name: string;
  description?: string;
  warehouseId: number;
}

export default function LocationsPage() {
  const params = useParams();
  const warehouseId = params.warehouseId;

  const {
    data: locations,
    isLoading,
    error,
  } = useQuery<Location[]>({
    queryKey: ["locations", warehouseId],
    queryFn: async () => {
      const response = await api.get(
        `/warehouses/${warehouseId}/locations`
      );

      return response.data;
    },
    enabled: !!warehouseId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8">
            <div className="mb-3 h-3 w-24 animate-pulse rounded bg-zinc-800" />
            <div className="h-6 w-48 animate-pulse rounded bg-zinc-800" />
            <p className="mt-5 text-sm text-zinc-500">
              Loading locations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
            <div className="mb-2 text-sm font-medium text-red-400">
              Error
            </div>

            <p className="text-sm text-red-300">
              Failed to load locations
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
            Warehouse
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Warehouse Locations
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            View the storage locations available in this warehouse.
          </p>
        </div>

        {/* Content */}
        {!locations || locations.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
              <span className="text-xl">⌂</span>
            </div>

            <h2 className="text-base font-semibold text-zinc-200">
              No locations found
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              This warehouse does not have any registered locations yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">
                  Storage Locations
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  {locations.length}{" "}
                  {locations.length === 1 ? "location" : "locations"}
                </p>
              </div>

              <div className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
                Active
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      ID
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Code
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Name
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Description
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-800">
                  {locations.map((location) => (
                    <tr
                      key={location.id}
                      className="transition hover:bg-zinc-800/40"
                    >
                      <td className="px-6 py-4 text-sm text-zinc-500">
                        #{location.id}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
                          {location.code}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-zinc-200">
                        {location.name}
                      </td>

                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {location.description || (
                          <span className="text-zinc-600">
                            No description
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}