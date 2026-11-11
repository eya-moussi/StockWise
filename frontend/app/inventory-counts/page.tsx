"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
      return "bg-amber-500/15 text-amber-400";
    case "VALIDATED":
      return "bg-emerald-500/15 text-emerald-400";
    default:
      return "bg-slate-500/15 text-slate-300";
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
      <main className="min-h-screen bg-[#0b1120] p-6 text-slate-200 md:p-8">
        <p className="animate-pulse text-sm text-slate-400">
          Loading inventory counts...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0b1120] p-6 text-slate-200 md:p-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
          Failed to load inventory counts.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1120] p-6 text-slate-200 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-400">
              Inventory control
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Inventory Counts
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Compare counted stock with recorded inventory.
            </p>
          </div>

          <Link
            href="/inventory-counts/create"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            + Create Count
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
            <p className="text-sm text-slate-400">Total counts</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {counts.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
            <p className="text-sm text-slate-400">Draft</p>
            <p className="mt-2 text-2xl font-semibold text-amber-400">
              {counts.filter((count) => count.status === "DRAFT").length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
            <p className="text-sm text-slate-400">Validated</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-400">
              {counts.filter((count) => count.status === "VALIDATED").length}
            </p>
          </div>
        </div>

        {counts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-[#111827] p-10 text-center">
            <p className="text-slate-300">No inventory counts found.</p>
            <p className="mt-2 text-sm text-slate-500">
              Create your first inventory count to begin.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-[#0f172a] text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-4">ID</th>
                    <th className="px-5 py-4">Warehouse</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {counts.map((count) => (
                    <tr
                      key={count.id}
                      className="transition hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 text-slate-500">
                        #{count.id}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-200">
                        {count.warehouse?.name ?? "-"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                            count.status
                          )}`}
                        >
                          {count.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/inventory-counts/${count.id}`}
                          className="font-medium text-blue-400 transition hover:text-blue-300"
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
    </main>
  );
}