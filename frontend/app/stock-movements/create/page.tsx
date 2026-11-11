import StockMovementForm from "@/components/stock/StockMovementForm";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
            Inventory
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Stock Movement
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Record an incoming, outgoing, transfer, or stock adjustment.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/20">
          <StockMovementForm />
        </div>
      </div>
    </div>
  );
}