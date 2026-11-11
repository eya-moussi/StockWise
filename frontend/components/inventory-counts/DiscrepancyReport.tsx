"use client";

import type { InventoryCountLine } from "./InventoryCountLines";

interface DiscrepancyReportProps {
  lines: InventoryCountLine[];
}

export default function DiscrepancyReport({ lines }: DiscrepancyReportProps) {
  return (
    <div className="space-y-3">
      {lines.map((line) => (
        <div
          key={line.id}
          className="rounded-xl border border-[#e9ebf5] bg-[#fafaff] p-4"
        >
          <p className="text-sm font-semibold text-[#0f1535]">
            {line.product?.name ?? `Product #${line.productId}`}
          </p>

          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-[#9298b4]">System Quantity</dt>
              <dd className="font-medium text-[#343b60]">
                {line.systemQty}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-[#9298b4]">Counted Quantity</dt>
              <dd className="font-medium text-[#343b60]">
                {line.countedQty ?? "Not counted"}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-[#9298b4]">Difference</dt>
              <dd
                className={`font-semibold ${
                  line.discrepancy !== 0
                    ? "text-red-600"
                    : "text-[#343b60]"
                }`}
              >
                {line.discrepancy}
              </dd>
            </div>

            {line.justification && (
              <div>
                <dt className="text-xs text-[#9298b4]">Justification</dt>
                <dd className="font-medium text-[#343b60]">
                  {line.justification}
                </dd>
              </div>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}
