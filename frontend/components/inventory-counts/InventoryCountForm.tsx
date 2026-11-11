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

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-4">
        Create Inventory Count
      </h2>

      {/* Warehouse */}
      <input
        type="number"
        min="1"
        className="border p-2 mb-4 w-full"
        placeholder="Warehouse ID"
        value={warehouseId}
        onChange={(e) => setWarehouseId(e.target.value)}
      />

      {/* Product + Quantity */}
      <div className="flex gap-2 mb-3">
        <input
          type="number"
          min="1"
          className="border p-2 flex-1"
          placeholder="Product ID"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        />

        <input
          type="number"
          min="0"
          className="border p-2 flex-1"
          placeholder="Counted Quantity"
          value={countedQty}
          onChange={(e) => setCountedQty(e.target.value)}
        />

        <button
          type="button"
          className="border px-3"
          onClick={addLine}
        >
          Add
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-500 mb-3">
          {error}
        </p>
      )}

      {/* Lines */}
      <div className="mb-4">
        {lines.map((line, index) => (
          <p key={index}>
            Product {line.productId} : {line.countedQty}
          </p>
        ))}
      </div>

      {/* Create */}
      <button
        type="button"
        className="bg-black text-white px-4 py-2 rounded"
        onClick={submit}
      >
        Create Count
      </button>
    </div>
  );
}