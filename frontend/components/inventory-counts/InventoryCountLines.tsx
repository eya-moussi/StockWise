"use client";

import { useState } from "react";
import { updateCountLine } from "@/lib/api";

export interface InventoryCountLine {
  id: number;
  inventoryCountId: number;
  productId: number;
  systemQty: number;
  expectedQty: number;
  countedQty: number | null;
  discrepancy: number;
  justification: string | null;
  product?: {
    id: number;
    name: string;
  } | null;
}

interface InventoryCountLinesProps {
  lines: InventoryCountLine[];
  refresh: () => Promise<void>;
}

export default function InventoryCountLines({
  lines,
  refresh,
}: InventoryCountLinesProps) {
  return (
    <div className="space-y-4">
      {lines.map((line) => (
        <LineItem key={line.id} line={line} refresh={refresh} />
      ))}
    </div>
  );
}

function LineItem({
  line,
  refresh,
}: {
  line: InventoryCountLine;
  refresh: () => Promise<void>;
}) {
  const [qty, setQty] = useState<number | "">(line.countedQty ?? "");
  const [justification, setJustification] = useState("");

  async function save() {
    await updateCountLine(line.id, {
      countedQty: Number(qty),
      justification,
    });
    await refresh();
  }

  const inputClass =
    "w-full rounded-xl border border-[#e9ebf5] bg-white px-3 py-2 text-sm text-[#0f1535] outline-none transition placeholder:text-[#9298b4] focus:border-[#6d5ef0]";

  return (
    <div className="rounded-xl border border-[#e9ebf5] bg-[#fafaff] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0f1535]">
          {line.product?.name ?? `Product #${line.productId}`}
        </p>

        <p className="text-sm text-[#6b7194]">
          Expected:{" "}
          <span className="font-medium text-[#343b60]">
            {line.expectedQty}
          </span>
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          className={`${inputClass} sm:flex-1`}
          type="number"
          value={qty}
          onChange={(e) => {
            const value = e.target.value;
            setQty(value === "" ? "" : Number(value));
          }}
          placeholder="Counted quantity"
        />

        <input
          className={`${inputClass} sm:flex-1`}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Justification"
        />

        <button
          type="button"
          className="rounded-xl bg-[#6d5ef0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b4ce0]"
          onClick={save}
        >
          Save
        </button>
      </div>
    </div>
  );
}
