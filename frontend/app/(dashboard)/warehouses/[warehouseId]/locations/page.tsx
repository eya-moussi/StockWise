"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
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
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-8 shadow-sm">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-[#eef0f7]" />
          <div className="h-6 w-48 animate-pulse rounded bg-[#eef0f7]" />
          <p className="mt-5 text-sm text-[#9298b4]">Loading locations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="mb-2 text-sm font-medium text-red-700">Error</div>

          <p className="text-sm text-red-600">Failed to load locations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
          <MapPin size={17} />
          Warehouse
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
          Warehouse Locations
        </h1>

        <p className="mt-2 text-sm text-[#6b7194]">
          View the storage locations available in this warehouse.
        </p>
      </div>

      {/* Content */}
      {!locations || locations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9dcef] bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0efff] text-[#6d5ef0]">
            <MapPin size={22} />
          </div>

          <h2 className="text-base font-semibold text-[#0f1535]">
            No locations found
          </h2>

          <p className="mt-2 text-sm text-[#6b7194]">
            This warehouse does not have any registered locations yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e9ebf5] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e9ebf5] px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[#0f1535]">
                Storage Locations
              </h2>

              <p className="mt-1 text-xs text-[#9298b4]">
                {locations.length}{" "}
                {locations.length === 1 ? "location" : "locations"}
              </p>
            </div>

            <div className="rounded-full bg-[#f0efff] px-3 py-1 text-xs font-medium text-[#6d5ef0]">
              Active
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8f8fd]">
                <tr className="border-b border-[#e9ebf5] text-left text-xs font-semibold uppercase tracking-wide text-[#9298b4]">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Description</th>
                </tr>
              </thead>

              <tbody>
                {locations.map((location) => (
                  <tr
                    key={location.id}
                    className="border-b border-[#f0f1f8] last:border-0 hover:bg-[#fafaff]"
                  >
                    <td className="px-6 py-4 text-sm text-[#9298b4]">
                      #{location.id}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-md bg-[#f0efff] px-2.5 py-1 text-xs font-semibold text-[#6d5ef0]">
                        {location.code}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#0f1535]">
                      {location.name}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#6b7194]">
                      {location.description || (
                        <span className="text-[#9298b4]">No description</span>
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
  );
}
