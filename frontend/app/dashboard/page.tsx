"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";

interface Product {
  id: number;
  reference?: string;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
  type?: string;
}

interface StockLevel {
  id?: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  product?: Product;
  warehouse?: Warehouse;
}

interface LowStockItem {
  id?: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  minStock?: number;
  product?: Product;
  warehouse?: Warehouse;
}

interface Movement {
  id: number;
  type: string;
  quantity: number;
  reference?: string;
  createdAt: string;
  product?: Product;
  warehouse?: Warehouse;
  sourceWarehouse?: Warehouse;
  destinationWarehouse?: Warehouse;
}

interface InventoryCount {
  id: number;
  status: string;
  warehouseId: number;
  createdAt: string;
}

interface DashboardData {
  products: Product[];
  categories: Category[];
  warehouses: Warehouse[];
  stockLevels: StockLevel[];
  lowStock: LowStockItem[];
  movements: Movement[];
  inventoryCounts: InventoryCount[];
}

function Icon({
  name,
  size = 20,
}: {
  name:
    | "package"
    | "layers"
    | "warehouse"
    | "move"
    | "alert"
    | "check"
    | "arrow"
    | "box"
    | "clipboard"
    | "audit"
    | "download"
    | "activity"
    | "plus";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "package":
      return (
        <svg {...common}>
          <path d="m16.5 9.4-9-5.05" />
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
        </svg>
      );

    case "layers":
      return (
        <svg {...common}>
          <path d="m12 2 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 17 9 5 9-5" />
        </svg>
      );

    case "warehouse":
      return (
        <svg {...common}>
          <path d="M3 21V8l9-5 9 5v13" />
          <path d="M7 21v-8h4v8" />
          <path d="M13 21v-8h4v8" />
          <path d="M3 21h18" />
        </svg>
      );

    case "move":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
          <path d="M5 7v10" />
        </svg>
      );

    case "alert":
      return (
        <svg {...common}>
          <path d="M10.3 3.8 2.2 18a2 2 0 0 0 1.73 3h16.14a2 2 0 0 0 1.73-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "box":
      return (
        <svg {...common}>
          <path d="M21 16V8l-9-5-9 5v8l9 5 9-5Z" />
          <path d="m3.3 7.5 8.7 5 8.7-5" />
          <path d="M12 12.5V21" />
        </svg>
      );

    case "clipboard":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4V2h6v2" />
          <path d="M9 10h6" />
          <path d="M9 14h6" />
        </svg>
      );

    case "audit":
      return (
        <svg {...common}>
          <path d="M4 4h16v16H4z" />
          <path d="M8 8h8" />
          <path d="M8 12h5" />
          <path d="M8 16h3" />
        </svg>
      );

    case "download":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 21h16" />
        </svg>
      );

    case "activity":
      return (
        <svg {...common}>
          <path d="M3 12h4l2-7 5 14 2-7h5" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    default:
      return null;
  }
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
  href,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  tone: "cyan" | "violet" | "lime" | "orange";
  href: string;
}) {
  const tones = {
    cyan: {
      icon: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
      number: "text-cyan-200",
      line: "bg-cyan-400",
    },
    violet: {
      icon: "text-violet-300 bg-violet-400/10 border-violet-400/20",
      number: "text-violet-200",
      line: "bg-violet-400",
    },
    lime: {
      icon: "text-lime-300 bg-lime-400/10 border-lime-400/20",
      number: "text-lime-200",
      line: "bg-lime-400",
    },
    orange: {
      icon: "text-orange-300 bg-orange-400/10 border-orange-400/20",
      number: "text-orange-200",
      line: "bg-orange-400",
    },
  };

  const colors = tones[tone];

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111315] p-5"
    >
      <div
        className={`absolute left-0 top-0 h-full w-1 ${colors.line}`}
      />

      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colors.icon}`}
        >
          {icon}
        </div>

        <span className="text-white/20">
          <Icon name="arrow" size={17} />
        </span>
      </div>

      <div className={`mt-5 text-3xl font-semibold ${colors.number}`}>
        {value}
      </div>

      <div className="mt-1 text-sm font-medium text-white/75">
        {label}
      </div>

      <div className="mt-1 text-xs text-white/35">{detail}</div>
    </Link>
  );
}

function Section({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111315]">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-xs text-white/35">{subtitle}</p>
          )}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function StockGauge({ value }: { value: number }) {
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative h-36 w-36">
      <svg
        className="-rotate-90"
        width="144"
        height="144"
        viewBox="0 0 144 144"
      >
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
        />

        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke="#a3e635"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{value}%</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
          healthy
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    products: [],
    categories: [],
    warehouses: [],
    stockLevels: [],
    lowStock: [],
    movements: [],
    inventoryCounts: [],
  });

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [
          productsResponse,
          categoriesResponse,
          warehousesResponse,
          stockLevelsResponse,
          lowStockResponse,
          movementsResponse,
          inventoryCountsResponse,
        ] = await Promise.all([
          api.get("/products?page=1&limit=1000"),
          api.get("/product-categories"),
          api.get("/warehouses"),
          api.get("/stock-levels"),
          api.get("/stock-levels/low-stock"),
          api.get("/stock-movements"),
          api.get("/inventory-counts"),
        ]);

        const productsData =
          productsResponse.data?.data ??
          productsResponse.data?.items ??
          productsResponse.data ??
          [];

        setData({
          products: Array.isArray(productsData) ? productsData : [],
          categories: Array.isArray(categoriesResponse.data)
            ? categoriesResponse.data
            : categoriesResponse.data?.data ?? [],
          warehouses: Array.isArray(warehousesResponse.data)
            ? warehousesResponse.data
            : warehousesResponse.data?.data ?? [],
          stockLevels: Array.isArray(stockLevelsResponse.data)
            ? stockLevelsResponse.data
            : stockLevelsResponse.data?.data ?? [],
          lowStock: Array.isArray(lowStockResponse.data)
            ? lowStockResponse.data
            : lowStockResponse.data?.data ?? [],
          movements: Array.isArray(movementsResponse.data)
            ? movementsResponse.data
            : movementsResponse.data?.data ?? [],
          inventoryCounts: Array.isArray(inventoryCountsResponse.data)
            ? inventoryCountsResponse.data
            : inventoryCountsResponse.data?.data ?? [],
        });
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const totalUnits = useMemo(
    () =>
      data.stockLevels.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      ),
    [data.stockLevels],
  );

  const outOfStockCount = useMemo(
    () =>
      data.stockLevels.filter(
        (item) => Number(item.quantity || 0) === 0,
      ).length,
    [data.stockLevels],
  );

  const stockHealth = useMemo(() => {
    if (data.stockLevels.length === 0) return 100;

    const healthy = data.stockLevels.filter(
      (item) => Number(item.quantity || 0) > 0,
    ).length;

    return Math.round((healthy / data.stockLevels.length) * 100);
  }, [data.stockLevels]);

  const recentMovements = useMemo(
    () =>
      [...data.movements]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        )
        .slice(0, 6),
    [data.movements],
  );

  const warehouseStock = useMemo(() => {
    return data.warehouses
      .map((warehouse) => {
        const quantity = data.stockLevels
          .filter((item) => item.warehouseId === warehouse.id)
          .reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0,
          );

        return {
          warehouse,
          quantity,
        };
      })
      .filter((item) => item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);
  }, [data.warehouses, data.stockLevels]);

  const maxWarehouseStock = useMemo(
    () =>
      Math.max(
        ...warehouseStock.map((item) => item.quantity),
        1,
      ),
    [warehouseStock],
  );

  const movementTrend = useMemo(() => {
    const result: {
      key: string;
      label: string;
      quantity: number;
      inQuantity: number;
      outQuantity: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      const dayMovements = data.movements.filter((movement) => {
        const movementDate = new Date(movement.createdAt);

        const movementKey = [
          movementDate.getFullYear(),
          String(movementDate.getMonth() + 1).padStart(2, "0"),
          String(movementDate.getDate()).padStart(2, "0"),
        ].join("-");

        return movementKey === key;
      });

      const inQuantity = dayMovements
        .filter((movement) =>
          ["IN", "RETURN_SUPPLIER"].includes(movement.type),
        )
        .reduce(
          (sum, movement) => sum + Number(movement.quantity || 0),
          0,
        );

      const outQuantity = dayMovements
        .filter((movement) =>
          ["OUT", "RETURN_CLIENT"].includes(movement.type),
        )
        .reduce(
          (sum, movement) => sum + Number(movement.quantity || 0),
          0,
        );

      result.push({
        key,
        label: date.toLocaleDateString("en-US", {
          weekday: "short",
        }),
        quantity: dayMovements.reduce(
          (sum, movement) =>
            sum + Number(movement.quantity || 0),
          0,
        ),
        inQuantity,
        outQuantity,
      });
    }

    return result;
  }, [data.movements]);

  const maxMovementQuantity = useMemo(
    () =>
      Math.max(
        ...movementTrend.map((day) => day.quantity),
        1,
      ),
    [movementTrend],
  );

  const pendingInventoryCounts = useMemo(
    () =>
      data.inventoryCounts.filter(
        (count) => count.status !== "VALIDATED",
      ).length,
    [data.inventoryCounts],
  );

  const handleExportStock = async () => {
    try {
      setExporting(true);

      const response = await api.get("/stock-levels/export", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "stock-export.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Stock export failed:", error);
      alert("Unable to export stock data.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-[#0b0d0e] px-6 py-8 text-white md:px-10">
          <div className="mx-auto max-w-7xl animate-pulse space-y-6">
            <div className="h-8 w-64 rounded bg-white/10" />
            <div className="h-20 rounded-2xl bg-white/5" />

            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 rounded-2xl bg-white/5"
                />
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="h-80 rounded-2xl bg-white/5" />
              <div className="h-80 rounded-2xl bg-white/5" />
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0b0d0e] px-5 py-7 text-white md:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#151819] px-6 py-7 md:px-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/5 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-violet-400/5 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-lime-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-lime-300">
                    Inventory control
                  </span>
                </div>

                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Command Center
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                  A complete overview of products, warehouse stock,
                  movements and inventory activity.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/stock-movements/create"
                  className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black"
                >
                  <Icon name="plus" size={17} />
                  New movement
                </Link>

                <button
                  type="button"
                  onClick={handleExportStock}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 disabled:opacity-50"
                >
                  <Icon name="download" size={17} />
                  {exporting ? "Exporting..." : "Export stock"}
                </button>
              </div>
            </div>
          </header>

          {/* Main KPI / health area */}
          <div className="grid gap-5 lg:grid-cols-[1.1fr_1.9fr]">
            <div className="relative overflow-hidden rounded-2xl border border-lime-400/20 bg-[#171b16] p-6">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-lime-400/5 blur-3xl" />

              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-300/70">
                      Stock health
                    </p>

                    <h2 className="mt-2 text-xl font-semibold">
                      Inventory condition
                    </h2>
                  </div>

                  <div className="rounded-xl border border-lime-400/15 bg-lime-400/5 p-2.5 text-lime-300">
                    <Icon name="activity" size={20} />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-7">
                  <StockGauge value={stockHealth} />

                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-semibold">
                        {totalUnits.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/35">
                        units currently tracked
                      </div>
                    </div>

                    <div className="flex gap-6">
                      <div>
                        <div className="text-sm font-semibold text-orange-300">
                          {data.lowStock.length}
                        </div>
                        <div className="text-[11px] text-white/35">
                          low stock
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-rose-300">
                          {outOfStockCount}
                        </div>
                        <div className="text-[11px] text-white/35">
                          out of stock
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <MetricCard
                label="Products"
                value={data.products.length}
                detail="Registered products"
                href="/products"
                tone="cyan"
                icon={<Icon name="package" size={20} />}
              />

              <MetricCard
                label="Categories"
                value={data.categories.length}
                detail="Product categories"
                href="/categories"
                tone="violet"
                icon={<Icon name="layers" size={20} />}
              />

              <MetricCard
                label="Warehouses"
                value={data.warehouses.length}
                detail="Storage locations"
                href="/warehouses"
                tone="lime"
                icon={<Icon name="warehouse" size={20} />}
              />

              <MetricCard
                label="Movements"
                value={data.movements.length}
                detail="Recorded operations"
                href="/stock-movements"
                tone="orange"
                icon={<Icon name="move" size={20} />}
              />
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <Section
              title="Stock movement"
              subtitle="Quantity moved during the last 7 days"
              action={
                <Link
                  href="/stock-movements"
                  className="text-xs font-medium text-cyan-300"
                >
                  View activity
                </Link>
              }
            >
              <div className="p-5">
                <div className="relative h-64">
                  <div className="absolute inset-x-0 top-0 border-t border-white/5" />
                  <div className="absolute inset-x-0 top-1/4 border-t border-white/5" />
                  <div className="absolute inset-x-0 top-1/2 border-t border-white/5" />
                  <div className="absolute inset-x-0 top-3/4 border-t border-white/5" />

                  <div className="absolute inset-0 flex items-end justify-between gap-2 pt-5">
                    {movementTrend.map((day) => {
                      const height =
                        day.quantity === 0
                          ? 2
                          : Math.max(
                              8,
                              (day.quantity /
                                maxMovementQuantity) *
                                82,
                            );

                      return (
                        <div
                          key={day.key}
                          className="flex h-full flex-1 flex-col items-center justify-end"
                        >
                          <div className="mb-2 text-[10px] text-white/35">
                            {day.quantity > 0
                              ? day.quantity.toLocaleString()
                              : ""}
                          </div>

                          <div
                            className="w-full max-w-12 rounded-t-lg bg-cyan-400/75"
                            style={{
                              height: `${height}%`,
                            }}
                          />

                          <span className="mt-3 text-[10px] font-medium text-white/35">
                            {day.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-5 border-t border-white/8 pt-4 text-xs">
                  <div className="flex items-center gap-2 text-white/45">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    Total movement
                  </div>

                  <div className="flex items-center gap-2 text-white/45">
                    <span className="h-2 w-2 rounded-full bg-lime-400" />
                    Incoming
                  </div>

                  <div className="flex items-center gap-2 text-white/45">
                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                    Outgoing
                  </div>
                </div>
              </div>
            </Section>

            <Section
              title="Warehouse distribution"
              subtitle="Units currently stored by warehouse"
              action={
                <Link
                  href="/warehouses"
                  className="text-xs font-medium text-violet-300"
                >
                  Manage
                </Link>
              }
            >
              <div className="space-y-5 p-5">
                {warehouseStock.length === 0 ? (
                  <div className="flex h-56 items-center justify-center text-sm text-white/30">
                    No stock distribution available.
                  </div>
                ) : (
                  warehouseStock.slice(0, 6).map((item, index) => {
                    const percentage = Math.round(
                      (item.quantity / maxWarehouseStock) * 100,
                    );

                    const barColors = [
                      "bg-violet-400",
                      "bg-cyan-400",
                      "bg-lime-400",
                      "bg-orange-400",
                      "bg-rose-400",
                      "bg-sky-400",
                    ];

                    return (
                      <div key={item.warehouse.id}>
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white/80">
                              {item.warehouse.name}
                            </div>

                            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/25">
                              {item.warehouse.type || "warehouse"}
                            </div>
                          </div>

                          <span className="text-xs font-semibold text-white/60">
                            {item.quantity.toLocaleString()}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full ${barColors[index % barColors.length]}`}
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Section>
          </div>

          {/* Alerts + recent activity */}
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.5fr]">
            <Section
              title="Stock alerts"
              subtitle="Items requiring attention"
              action={
                <span className="rounded-full bg-orange-400/10 px-2.5 py-1 text-[10px] font-semibold text-orange-300">
                  {data.lowStock.length} alerts
                </span>
              }
            >
              <div className="divide-y divide-white/6">
                {data.lowStock.length === 0 ? (
                  <div className="flex h-52 flex-col items-center justify-center px-5 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-lime-400/10 text-lime-300">
                      <Icon name="check" size={22} />
                    </div>

                    <p className="text-sm font-medium text-white/70">
                      Inventory is healthy
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      No low-stock alerts detected.
                    </p>
                  </div>
                ) : (
                  data.lowStock.slice(0, 5).map((item, index) => (
                    <div
                      key={`${item.productId}-${item.warehouseId}-${index}`}
                      className="flex items-center gap-3 px-5 py-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-400/10 text-orange-300">
                        <Icon name="alert" size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white/80">
                          {item.product?.name ||
                            `Product #${item.productId}`}
                        </div>

                        <div className="mt-1 truncate text-xs text-white/30">
                          {item.warehouse?.name ||
                            `Warehouse #${item.warehouseId}`}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-orange-300">
                          {item.quantity}
                        </div>

                        <div className="text-[10px] text-white/25">
                          remaining
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section
              title="Recent activity"
              subtitle="Latest stock operations"
              action={
                <Link
                  href="/stock-movements"
                  className="text-xs font-medium text-cyan-300"
                >
                  View all
                </Link>
              }
            >
              <div className="overflow-x-auto">
                {recentMovements.length === 0 ? (
                  <div className="flex h-52 items-center justify-center text-sm text-white/30">
                    No stock movement activity recorded.
                  </div>
                ) : (
                  <table className="w-full min-w-[650px]">
                    <thead>
                      <tr className="border-b border-white/6 text-left">
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                          Type
                        </th>
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                          Product
                        </th>
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                          Warehouse
                        </th>
                        <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-white/25">
                          Quantity
                        </th>
                        <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-white/25">
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentMovements.map((movement) => {
                        const isIncoming = [
                          "IN",
                          "RETURN_SUPPLIER",
                        ].includes(movement.type);

                        const isOutgoing = [
                          "OUT",
                          "RETURN_CLIENT",
                        ].includes(movement.type);

                        const typeClass = isIncoming
                          ? "bg-lime-400/10 text-lime-300"
                          : isOutgoing
                            ? "bg-orange-400/10 text-orange-300"
                            : "bg-cyan-400/10 text-cyan-300";

                        return (
                          <tr
                            key={movement.id}
                            className="border-b border-white/5"
                          >
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${typeClass}`}
                              >
                                {movement.type}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="text-sm font-medium text-white/75">
                                {movement.product?.name ||
                                  `Product #${movement.product?.id ?? "-"}`}
                              </div>

                              {movement.reference && (
                                <div className="mt-1 text-[10px] text-white/25">
                                  {movement.reference}
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs text-white/40">
                              {movement.warehouse?.name ||
                                movement.destinationWarehouse?.name ||
                                "-"}
                            </td>

                            <td
                              className={`px-5 py-4 text-right text-sm font-semibold ${
                                isIncoming
                                  ? "text-lime-300"
                                  : isOutgoing
                                    ? "text-orange-300"
                                    : "text-cyan-300"
                              }`}
                            >
                              {isOutgoing ? "-" : "+"}
                              {Number(
                                movement.quantity || 0,
                              ).toLocaleString()}
                            </td>

                            <td className="px-5 py-4 text-right text-xs text-white/30">
                              {new Date(
                                movement.createdAt,
                              ).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </Section>
          </div>

          {/* Current stock */}
          <Section
            title="Current stock"
            subtitle="Live stock levels across your warehouses"
            action={
              <Link
                href="/stock-levels"
                className="text-xs font-medium text-lime-300"
              >
                Full stock view
              </Link>
            }
          >
            <div className="overflow-x-auto">
              {data.stockLevels.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-white/30">
                  No stock records available.
                </div>
              ) : (
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/6 text-left">
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                        Product
                      </th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                        Reference
                      </th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                        Warehouse
                      </th>
                      <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-white/25">
                        Quantity
                      </th>
                      <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-white/25">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.stockLevels.slice(0, 10).map((stock, index) => {
                      const quantity = Number(stock.quantity || 0);

                      const low = data.lowStock.some(
                        (item) =>
                          item.productId === stock.productId &&
                          item.warehouseId === stock.warehouseId,
                      );

                      const status =
                        quantity === 0
                          ? "OUT"
                          : low
                            ? "LOW"
                            : "HEALTHY";

                      const statusClass =
                        status === "OUT"
                          ? "bg-rose-400/10 text-rose-300"
                          : status === "LOW"
                            ? "bg-orange-400/10 text-orange-300"
                            : "bg-lime-400/10 text-lime-300";

                      return (
                        <tr
                          key={`${stock.productId}-${stock.warehouseId}-${index}`}
                          className="border-b border-white/5"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40">
                                <Icon name="box" size={16} />
                              </div>

                              <span className="text-sm font-medium text-white/75">
                                {stock.product?.name ||
                                  `Product #${stock.productId}`}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs text-white/35">
                            {stock.product?.reference || "-"}
                          </td>

                          <td className="px-5 py-4 text-xs text-white/45">
                            {stock.warehouse?.name ||
                              `Warehouse #${stock.warehouseId}`}
                          </td>

                          <td className="px-5 py-4 text-right text-sm font-semibold text-white/80">
                            {quantity.toLocaleString()}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Section>

          {/* Operational modules */}
          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
                  Operations
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Management modules
                </h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href="/inventory-counts"
                className="flex items-center gap-4 rounded-2xl border border-violet-400/15 bg-[#15131a] p-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                  <Icon name="clipboard" size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white/80">
                    Inventory counts
                  </div>

                  <div className="mt-1 text-xs text-white/30">
                    {pendingInventoryCounts} pending validation
                  </div>
                </div>

                <Icon
                  name="arrow"
                  size={17}
                />
              </Link>

              <Link
                href="/audit-logs"
                className="flex items-center gap-4 rounded-2xl border border-sky-400/15 bg-[#11171a] p-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
                  <Icon name="audit" size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white/80">
                    Audit logs
                  </div>

                  <div className="mt-1 text-xs text-white/30">
                    Review system activity
                  </div>
                </div>

                <Icon
                  name="arrow"
                  size={17}
                />
              </Link>

              <Link
                href="/warehouses"
                className="flex items-center gap-4 rounded-2xl border border-orange-400/15 bg-[#191511] p-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
                  <Icon name="warehouse" size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white/80">
                    Warehouse control
                  </div>

                  <div className="mt-1 text-xs text-white/30">
                    {data.warehouses.length} storage locations
                  </div>
                </div>

                <Icon
                  name="arrow"
                  size={17}
                />
              </Link>
            </div>
          </div>

          <footer className="border-t border-white/6 py-5 text-center text-[10px] uppercase tracking-[0.2em] text-white/20">
            ERP Stock Management · Inventory Command Center
          </footer>
        </div>
      </main>
    </>
  );
}