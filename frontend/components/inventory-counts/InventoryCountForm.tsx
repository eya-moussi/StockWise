"use client";

import { useState } from "react";
import { createInventoryCount } from "@/lib/api";
import { useRouter } from "next/navigation";

interface InventoryCountLineInput {
  productId: number;
  countedQty: number;
}

export default function InventoryCountForm() {
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [countedQty, setCountedQty] = useState("");
  const [lines, setLines] = useState<InventoryCountLineInput[]>([]);
  const [error, setError] = useState("");

  function addLine() {
    setError("");

    const warehouse = Number(warehouseId);
    const product = Number(productId);
    const quantity = Number(countedQty);

    if (!warehouseId || warehouse < 1) {
      setError("Warehouse ID must be at least 1.");
      return;
    }

    if (!productId || product < 1) {
      setError("Product ID must be at least 1.");
      return;
    }

    if (countedQty === "" || quantity < 0) {
      setError("Counted quantity cannot be negative.");
      return;
    }

    setLines([
      ...lines,
      {
        productId: product,
        countedQty: quantity,
      },
    ]);

    setProductId("");
    setCountedQty("");
  }

  async function submit() {
    setError("");

    const warehouse = Number(warehouseId);
    const product = Number(productId);
    const quantity = Number(countedQty);

    if (!warehouseId || warehouse < 1) {
      setError("Warehouse ID must be at least 1.");
      return;
    }

    // If a line was already added, use it.
    // Otherwise, automatically use the current product fields.
    const finalLines =
      lines.length > 0
        ? lines
        : productId &&
          product >= 1 &&
          countedQty !== "" &&
          quantity >= 0
        ? [
            {
              productId: product,
              countedQty: quantity,
            },
          ]
        : [];

    if (finalLines.length === 0) {
      setError("Please enter a product and counted quantity.");
      return;
    }

    try {
      await createInventoryCount({
        warehouseId: warehouse,
        lines: finalLines,
      });

      router.push("/inventory-counts");
    } catch (error) {
      console.error("CREATE INVENTORY COUNT ERROR:", error);
      setError("Unable to create inventory count. Please check your data.");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-3 text-sm text-[#0f1535] outline-none transition placeholder:text-[#9298b4] focus:border-[#6d5ef0]";

  return (
    <div className="max-w-lg">
      <h2 className="mb-5 text-lg font-semibold text-[#0f1535]">
        Create Inventory Count
      </h2>

      {/* Warehouse */}
      <label
        htmlFor="warehouse-id"
        className="mb-2 block text-sm font-medium text-[#343b60]"
      >
        Warehouse ID
      </label>

      <input
        id="warehouse-id"
        type="number"
        min="1"
        className={`${inputClass} mb-4`}
        placeholder="Warehouse ID"
        value={warehouseId}
        onChange={(e) => setWarehouseId(e.target.value)}
      />

      {/* Product + Quantity */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          min="1"
          className={`${inputClass} sm:flex-1`}
          placeholder="Product ID"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        />

        <input
          type="number"
          min="0"
          className={`${inputClass} sm:flex-1`}
          placeholder="Counted Quantity"
          value={countedQty}
          onChange={(e) => setCountedQty(e.target.value)}
        />

        <button
          type="button"
          className="rounded-xl border border-[#e9ebf5] px-5 py-3 text-sm font-medium text-[#343b60] transition hover:bg-[#f3f4fb]"
          onClick={addLine}
        >
          Add
        </button>
      </div>

      {/* Error */}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {/* Lines */}
      <div className="mb-4 space-y-2">
        {lines.map((line, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-4 py-2.5 text-sm text-[#343b60]"
          >
            <span>Product #{line.productId}</span>
            <span className="font-semibold text-[#0f1535]">
              {line.countedQty}
            </span>
          </div>
        ))}
      </div>

      {/* Create */}
      <button
        type="button"
        className="rounded-xl bg-[#6d5ef0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b4ce0]"
        onClick={submit}
      >
        Create Count
      </button>
    </div>
  );
}
