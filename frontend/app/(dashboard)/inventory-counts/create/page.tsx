import InventoryCountForm from "@/components/inventory-counts/InventoryCountForm";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            Inventory
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Inventory Count
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Create a physical inventory count and record the quantities found.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/20">
          <InventoryCountForm />
        </div>
      </div>
    </div>
  );
}