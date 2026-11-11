"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import {
  getInventoryCount,
  validateInventoryCount,
} from "@/lib/api";
import InventoryCountLines, {
  type InventoryCountLine,
} from "@/components/inventory-counts/InventoryCountLines";
import DiscrepancyReport from "@/components/inventory-counts/DiscrepancyReport";

interface JwtPayload {
  role?: string;
}

interface InventoryCount {
  id: number;
  warehouseId: number;
  status: string;
  createdAt: string;
  validatedAt: string | null;
  warehouse?: {
    id: number;
    name: string;
  } | null;
  lines: InventoryCountLine[];
}

export default function InventoryCountDetailsPage() {
  const params = useParams();
  const countId = Number(params.id);

  const [count, setCount] = useState<InventoryCount | null>(null);
  const [role, setRole] = useState("");

  const load = useCallback(async () => {
    const data = await getInventoryCount(countId);

    console.log(
      "INVENTORY COUNT JSON:",
      JSON.stringify(data, null, 2)
    );

    setCount(data as InventoryCount);
  }, [countId]);

  const validate = async () => {
    await validateInventoryCount(countId);
    await load();
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      const decoded = jwtDecode<JwtPayload>(token);

      if (decoded.role) {
        setTimeout(() => {
          setRole(decoded.role ?? "");
        }, 0);
      }
    }

    const fetchCount = async () => {
      try {
        const data = await getInventoryCount(countId);

        console.log(
          "INVENTORY COUNT JSON:",
          JSON.stringify(data, null, 2)
        );

        setCount(data as InventoryCount);
      } catch (error) {
        console.error(
          "Failed to load inventory count:",
          error
        );
      }
    };

    void fetchCount();
  }, [countId]);

  if (!count) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8">
            <div className="h-6 w-52 animate-pulse rounded bg-zinc-800" />
            <div className="mt-4 h-4 w-72 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  const isValidated = count.status === "VALIDATED";

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            Inventory
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Inventory Count #{count.id}
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                Review counted quantities and identify stock discrepancies.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
                isValidated
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
              }`}
            >
              {count.status}
            </span>
          </div>
        </div>

        {/* Information */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Warehouse
            </p>

            <p className="mt-2 text-base font-semibold text-zinc-200">
              {count.warehouse?.name || `Warehouse #${count.warehouseId}`}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Validation
            </p>

            <p className="mt-2 text-base font-semibold text-zinc-200">
              {count.validatedAt
                ? new Date(count.validatedAt).toLocaleDateString()
                : "Not validated yet"}
            </p>
          </div>
        </div>

        {/* Validation Action */}
        {(role === "ADMIN" || role === "STOCK_MANAGER") &&
          count.status !== "VALIDATED" && (
            <div className="mb-6 flex flex-col gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">
                  Ready to validate?
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Validation will confirm the inventory count.
                </p>
              </div>

              <button
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                onClick={validate}
              >
                Validate Count
              </button>
            </div>
          )}

        {/* Count Lines */}
        <div className="mb-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          <div className="border-b border-zinc-800 px-6 py-5">
            <h2 className="text-lg font-semibold text-zinc-100">
              Count Lines
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Products and quantities recorded during the inventory count.
            </p>
          </div>

          <div className="p-6">
            <InventoryCountLines
              lines={count.lines}
              refresh={load}
            />
          </div>
        </div>

        {/* Discrepancy Report */}
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          <div className="border-b border-zinc-800 px-6 py-5">
            <h2 className="text-lg font-semibold text-zinc-100">
              Discrepancy Report
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Differences between expected and counted stock.
            </p>
          </div>

          <div className="p-6">
            <DiscrepancyReport lines={count.lines} />
          </div>
        </div>
      </div>
    </div>
  );
}