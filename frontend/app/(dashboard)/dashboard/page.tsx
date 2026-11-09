
import {
  Package,
  Tags,
  Warehouse,
  ArrowLeftRight,
  TrendingUp,
} from "lucide-react";

const summaryCards = [
  {
    title: "Total des produits",
    value: "—",
    description: "Produits enregistrés",
    icon: Package,
  },
  {
    title: "Catégories",
    value: "—",
    description: "Catégories disponibles",
    icon: Tags,
  },
  {
    title: "Entrepôts",
    value: "—",
    description: "Entrepôts enregistrés",
    icon: Warehouse,
  },
  {
    title: "Mouvements",
    value: "—",
    description: "Entrées et sorties",
    icon: ArrowLeftRight,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">

      {/* Welcome section */}
      <section>
        <h1 className="text-2xl font-bold text-[#0f1535]">
            Vue d&apos;ensemble
        </h1>

        <p className="mt-2 text-sm text-[#6b7194]">
          Retrouvez ici les principales informations de votre gestion de stock.
        </p>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-2xl border border-[#e9ebf5] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#6b7194]">
                  {card.title}
                </p>

                <div className="rounded-xl bg-[#eeedfc] p-3 text-[#6d5ef0]">
                  <Icon size={21} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-bold text-[#0f1535]">
                {card.value}
              </p>

              <p className="mt-2 text-xs text-[#9a9db5]">
                {card.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Activity section */}
      <section className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#eeedfc] p-3 text-[#6d5ef0]">
            <TrendingUp size={22} />
          </div>

          <div>
            <h2 className="font-semibold text-[#0f1535]">
              Activité du stock
            </h2>

            <p className="mt-1 text-sm text-[#6b7194]">
              Les statistiques et les mouvements récents seront affichés ici.
            </p>
          </div>
        </div>

        <div className="mt-6 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-[#e9ebf5] bg-[#fafaff]">
          <p className="text-sm text-[#9a9db5]">
            En attente de connexion aux données
          </p>
        </div>
      </section>

    </div>
  );
}
