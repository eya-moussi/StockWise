"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { getInventoryCounts } from "@/lib/api";

interface InventoryCount {
  id: number;
  status: string;
  warehouse?: {
    id: number;
    name: string;
  };
}

function getStatusStyle(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-amber-50 text-amber-600";
    case "VALIDATED":
      return "bg-emerald-50 text-emerald-600";
    default:
      return "bg-[#f0f1f8] text-[#6b7194]";
  }
}

export default function InventoryCountsPage() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadCounts() {
      try {
        setLoading(true);
        setError(false);

        const data = await getInventoryCounts();
        setCounts(data as InventoryCount[]);
      } catch (err) {
        console.error("Failed to load inventory counts:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    void loadCounts();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm">
          <div className="h-4 w-40 animate-pulse rounded bg-[#eef0f7]" />
          <div className="mt-3 h-4 w-64 animate-pulse rounded bg-[#eef0f7]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Failed to load inventory counts.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
            <ClipboardList size={17} />
            Inventory control
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
            Inventory Counts
          </h1>

          <p className="mt-2 text-sm text-[#6b7194]">
            Compare counted stock with recorded inventory.
          </p>
        </div>

        <Link
          href="/inventory-counts/create"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6d5ef0] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b4ce0]"
        >
          <Plus size={18} />
          Create Count
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6b7194]">Total counts</p>
          <p className="mt-2 text-2xl font-bold text-[#0f1535]">
            {counts.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6b7194]">Draft</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {counts.filter((count) => count.status === "DRAFT").length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6b7194]">Validated</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {counts.filter((count) => count.status === "VALIDATED").length}
          </p>
        </div>
      </div>

      {counts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9dcef] bg-white p-12 text-center">
          <ClipboardList size={32} className="mx-auto mb-3 text-[#9298b4]" />
          <p className="text-sm text-[#6b7194]">No inventory counts found.</p>
          <p className="mt-2 text-sm text-[#9298b4]">
            Create your first inventory count to begin.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e9ebf5] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead className="bg-[#f8f8fd]">
                <tr className="border-b border-[#e9ebf5] text-left text-xs font-semibold uppercase tracking-wide text-[#9298b4]">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Warehouse</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {counts.map((count) => (
                  <tr
                    key={count.id}
                    className="border-b border-[#f0f1f8] last:border-0 hover:bg-[#fafaff]"
                  >
                    <td className="px-6 py-4 text-sm text-[#9298b4]">
                      #{count.id}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#0f1535]">
                      {count.warehouse?.name ?? "—"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                          count.status
                        )}`}
                      >
                        {count.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/inventory-counts/${count.id}`}
                        className="text-sm font-semibold text-[#6d5ef0] transition hover:text-[#5b4ce0]"
                      >
                        Open →
                      </Link>
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
