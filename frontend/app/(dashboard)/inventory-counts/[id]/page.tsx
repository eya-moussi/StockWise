"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { ClipboardList } from "lucide-react";
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
        setCount(data as InventoryCount);
      } catch (error) {
        console.error("Failed to load inventory count:", error);
      }
    };

    void fetchCount();
  }, [countId]);

  if (!count) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-8 shadow-sm">
          <div className="h-6 w-52 animate-pulse rounded bg-[#eef0f7]" />
          <div className="mt-4 h-4 w-72 animate-pulse rounded bg-[#eef0f7]" />
        </div>
      </div>
    );
  }

  const isValidated = count.status === "VALIDATED";

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
          <ClipboardList size={17} />
          Inventory
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
              Inventory Count #{count.id}
            </h1>

            <p className="mt-2 text-sm text-[#6b7194]">
              Review counted quantities and identify stock discrepancies.
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
              isValidated
                ? "bg-emerald-50 text-emerald-600"
                : "bg-amber-50 text-amber-600"
            }`}
          >
            {count.status}
          </span>
        </div>
      </div>

      {/* Information */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9298b4]">
            Warehouse
          </p>

          <p className="mt-2 text-base font-semibold text-[#0f1535]">
            {count.warehouse?.name || `Warehouse #${count.warehouseId}`}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9298b4]">
            Validation
          </p>

          <p className="mt-2 text-base font-semibold text-[#0f1535]">
            {count.validatedAt
              ? new Date(count.validatedAt).toLocaleDateString()
              : "Not validated yet"}
          </p>
        </div>
      </div>

      {/* Validation Action */}
      {(role === "ADMIN" || role === "STOCK_MANAGER") &&
        count.status !== "VALIDATED" && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#0f1535]">
                Ready to validate?
              </h2>

              <p className="mt-1 text-xs text-[#6b7194]">
                Validation will confirm the inventory count.
              </p>
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#6d5ef0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b4ce0]"
              onClick={validate}
            >
              Validate Count
            </button>
          </div>
        )}

      {/* Count Lines */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-[#e9ebf5] bg-white shadow-sm">
        <div className="border-b border-[#e9ebf5] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#0f1535]">
            Count Lines
          </h2>

          <p className="mt-1 text-sm text-[#6b7194]">
            Products and quantities recorded during the inventory count.
          </p>
        </div>

        <div className="p-6">
          <InventoryCountLines lines={count.lines} refresh={load} />
        </div>
      </div>

      {/* Discrepancy Report */}
      <div className="overflow-hidden rounded-2xl border border-[#e9ebf5] bg-white shadow-sm">
        <div className="border-b border-[#e9ebf5] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#0f1535]">
            Discrepancy Report
          </h2>

          <p className="mt-1 text-sm text-[#6b7194]">
            Differences between expected and counted stock.
          </p>
        </div>

        <div className="p-6">
          <DiscrepancyReport lines={count.lines} />
        </div>
      </div>
    </div>
  );
}
