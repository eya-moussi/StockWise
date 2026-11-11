"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface Product {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface StockMovement {
  id: number;
  type: string;
  quantity: number;
  reference?: string | null;
  createdAt: string;
  product?: Product;
  warehouse?: Warehouse;
}

function getTypeStyle(type: string) {
  switch (type) {
    case "IN":
      return "bg-emerald-500/15 text-emerald-400";
    case "OUT":
      return "bg-red-500/15 text-red-400";
    case "TRANSFER":
      return "bg-blue-500/15 text-blue-400";
    case "RETURN_CLIENT":
    case "RETURN_SUPPLIER":
      return "bg-amber-500/15 text-amber-400";
    case "CORRECTION":
      return "bg-purple-500/15 text-purple-400";
    default:
      return "bg-slate-500/15 text-slate-300";
  }
}

export default function StockMovementsPage() {
  const {
    data: movements,
    isLoading,
    error,
  } = useQuery<StockMovement[]>({
    queryKey: ["stock-movements"],
    queryFn: async () => {
      const response = await api.get("/stock-movements");
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0b1120] p-6 text-slate-200 md:p-8">
        <div className="animate-pulse text-sm text-slate-400">
          Loading stock movements...
        </div>
      </main>
    );
  }

  if (error) {
    console.error("Stock movements error:", error);

    return (
      <main className="min-h-screen bg-[#0b1120] p-6 md:p-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
          Failed to load stock movements.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1120] p-6 text-slate-200 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-400">
              Inventory activity
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Stock Movements
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Track all incoming, outgoing, and transferred stock.
            </p>
          </div>

          <Link
            href="/stock-movements/create"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            + Create Movement
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
            <p className="text-sm text-slate-400">Total movements</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {movements?.length ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
            <p className="text-sm text-slate-400">Incoming</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-400">
              {movements?.filter((movement) => movement.type === "IN").length ??
                0}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
            <p className="text-sm text-slate-400">Outgoing</p>
            <p className="mt-2 text-2xl font-semibold text-red-400">
              {movements?.filter((movement) => movement.type === "OUT").length ??
                0}
            </p>
          </div>
        </div>

        {!movements || movements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-[#111827] p-10 text-center">
            <p className="text-slate-300">No stock movements found.</p>
            <p className="mt-2 text-sm text-slate-500">
              Create your first movement to see it here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-[#0f172a] text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-4">ID</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Warehouse</th>
                    <th className="px-5 py-4">Quantity</th>
                    <th className="px-5 py-4">Reference</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="transition hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 text-slate-500">
                        #{movement.id}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getTypeStyle(
                            movement.type
                          )}`}
                        >
                          {movement.type.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-200">
                        {movement.product?.name ?? "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {movement.warehouse?.name ?? "-"}
                      </td>

                      <td className="px-5 py-4 font-semibold text-white">
                        {movement.quantity}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {movement.reference || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {new Date(movement.createdAt).toLocaleDateString()}
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