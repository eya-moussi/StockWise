import { ClipboardList } from "lucide-react";
import InventoryCountForm from "@/components/inventory-counts/InventoryCountForm";

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
          <ClipboardList size={17} />
          Inventory
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
          Inventory Count
        </h1>

        <p className="mt-2 text-sm text-[#6b7194]">
          Create a physical inventory count and record the quantities found.
        </p>
      </div>

      <div className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm">
        <InventoryCountForm />
      </div>
    </div>
  );
}
