"use client";

import { useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import {
  getServerUserRoleSnapshot,
  getUserRoleSnapshot,
  subscribeToAuthChanges,
} from "@/lib/auth";
import {
  alertsService,
  type Alert,
  type AlertFilters,
  type AlertStatus,
  type ReviewStatus,
} from "@/services/alerts";

const statusLabels: Record<AlertStatus, string> = {
  TO_VERIFY: "À vérifier",
  CONFIRMED: "Confirmée",
  NORMAL: "Normale",
};

function statusClass(status: AlertStatus) {
  switch (status) {
    case "TO_VERIFY":
      return "bg-amber-50 text-amber-700";
    case "CONFIRMED":
      return "bg-red-50 text-red-600";
    default:
      return "bg-emerald-50 text-emerald-600";
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

export default function AlertsPage() {
  const role = useSyncExternalStore(
    subscribeToAuthChanges,
    getUserRoleSnapshot,
    getServerUserRoleSnapshot
  );

  const [status, setStatus] = useState<AlertStatus | "">("");
  const [productId, setProductId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [comments, setComments] = useState<Record<number, string>>({});

  const queryClient = useQueryClient();
  const parsedProductId = Number(productId);

  const filters: AlertFilters = {
    status: status || undefined,
    productId:
      productId && Number.isInteger(parsedProductId) && parsedProductId > 0
        ? parsedProductId
        : undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const { data: alerts = [], isLoading, isError } = useQuery({
    queryKey: ["alerts", filters],
    queryFn: () => alertsService.getAll(filters),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { status: ReviewStatus; comment: string };
    }) => alertsService.review(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const canReview = role === "ADMIN" || role === "STOCK_MANAGER";

  function submitReview(id: number, decision: ReviewStatus) {
    const comment = (comments[id] ?? "").trim();

    if (!comment) {
      return;
    }

    reviewMutation.mutate({ id, data: { status: decision, comment } });
  }

  function clearFilters() {
    setStatus("");
    setProductId("");
    setFrom("");
    setTo("");
  }

  const fieldClass =
    "w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-3 py-2.5 text-sm text-[#0f1535] outline-none transition placeholder:text-[#9298b4] focus:border-[#6d5ef0]";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
          <ShieldAlert size={17} />
          Détection des anomalies
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
          Alertes d&apos;anomalies
        </h1>

        <p className="mt-2 text-sm text-[#6b7194]">
          Mouvements signalés par le modèle, avec leur score et l&apos;historique
          du produit concerné.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#e9ebf5] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm text-[#343b60]">
              Statut
            </label>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AlertStatus | "")
              }
              className={fieldClass}
            >
              <option value="">Tous</option>
              <option value="TO_VERIFY">À vérifier</option>
              <option value="CONFIRMED">Confirmée</option>
              <option value="NORMAL">Normale</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-[#343b60]">
              ID produit
            </label>
            <input
              type="number"
              min={1}
              placeholder="Ex. 4"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-[#343b60]">
              Depuis
            </label>
            <input
              type="datetime-local"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-[#343b60]">
              Jusqu&apos;au
            </label>
            <input
              type="datetime-local"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={clearFilters}
            className="rounded-xl border border-[#e9ebf5] px-4 py-2.5 text-sm font-medium text-[#343b60] transition hover:bg-[#f3f4fb]"
          >
            Effacer les filtres
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-6 text-sm text-[#6b7194] shadow-sm">
          Chargement des alertes...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600 shadow-sm">
          Impossible de charger les alertes.
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9dcef] bg-white p-12 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-[#9298b4]" />
          <p className="text-sm text-[#6b7194]">Aucune alerte trouvée.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {alerts.map((alert: Alert) => (
            <article
              key={alert.id}
              className="rounded-2xl border border-[#e9ebf5] bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                        alert.status
                      )}`}
                    >
                      {statusLabels[alert.status]}
                    </span>
                    <span className="text-xs text-[#9298b4]">
                      Alerte #{alert.id}
                    </span>
                  </div>

                  <h2 className="text-lg font-semibold text-[#0f1535]">
                    {alert.movement.product.name} —{" "}
                    {alert.movement.type} de {alert.movement.quantity}
                  </h2>

                  <p className="mt-1 text-sm text-[#6b7194]">
                    {alert.movement.warehouse.name} · Détectée le{" "}
                    {formatDate(alert.createdAt)}
                  </p>
                </div>

                <div className="rounded-xl bg-[#f7f8fd] px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-wide text-[#9298b4]">
                    Score / seuil
                  </p>
                  <p className="text-lg font-bold text-[#0f1535]">
                    {alert.score.toFixed(4)} / {alert.threshold.toFixed(4)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 text-sm text-[#343b60] md:grid-cols-3">
                <div>
                  <p className="text-xs text-[#9298b4]">Produit</p>
                  <p className="font-medium">
                    {alert.movement.product.reference}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9298b4]">Auteur du mouvement</p>
                  <p className="font-medium">
                    {alert.movement.createdBy?.fullName ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9298b4]">Traité par</p>
                  <p className="font-medium">
                    {alert.processedBy?.fullName ?? "—"} ·{" "}
                    {formatDate(alert.processedAt)}
                  </p>
                </div>
              </div>

              {alert.comment ? (
                <div className="mt-4 rounded-xl bg-[#fafaff] p-4 text-sm text-[#343b60]">
                  <p className="mb-1 text-xs text-[#9298b4]">Commentaire</p>
                  {alert.comment}
                </div>
              ) : null}

              <details className="mt-5 rounded-xl border border-[#e9ebf5]">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-[#343b60]">
                  <ArrowLeftRight size={17} />
                  Historique du produit (
                  {alert.movement.product.stockMovements.length} mouvements)
                </summary>

                <div className="border-t border-[#e9ebf5] px-4 py-3">
                  {alert.movement.product.stockMovements.length === 0 ? (
                    <p className="text-sm text-[#9298b4]">
                      Aucun historique disponible.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {alert.movement.product.stockMovements.map((movement) => (
                        <li
                          key={movement.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#6b7194]"
                        >
                          <span className="font-medium text-[#343b60]">
                            {movement.type} · {movement.quantity}
                          </span>
                          <span>
                            {movement.warehouse.name} ·{" "}
                            {formatDate(movement.createdAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>

              {alert.status === "TO_VERIFY" && canReview ? (
                <div className="mt-5 border-t border-[#e9ebf5] pt-5">
                  <label className="mb-1.5 block text-sm text-[#343b60]">
                    Commentaire d&apos;examen
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="Expliquez votre décision"
                    value={comments[alert.id] ?? ""}
                    onChange={(event) =>
                      setComments((current) => ({
                        ...current,
                        [alert.id]: event.target.value,
                      }))
                    }
                    className={fieldClass}
                  />

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      onClick={() => submitReview(alert.id, "CONFIRMED")}
                      disabled={
                        !(comments[alert.id] ?? "").trim() ||
                        reviewMutation.isPending
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Confirmer l&apos;anomalie
                    </button>

                    <button
                      onClick={() => submitReview(alert.id, "NORMAL")}
                      disabled={
                        !(comments[alert.id] ?? "").trim() ||
                        reviewMutation.isPending
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      Classer comme normale
                    </button>
                  </div>

                  {reviewMutation.isError &&
                  reviewMutation.variables?.id === alert.id ? (
                    <p className="mt-3 flex items-center gap-2 text-sm text-red-600">
                      <Clock3 size={15} />
                      La décision n&apos;a pas pu être enregistrée.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
