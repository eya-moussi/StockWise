"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import api from "@/lib/api";

interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: number | null;
  userId: number | null;
  userEmail: string | null;
  createdAt: string;
}

interface AuditLogParams {
  action?: string;
  entity?: string;
  userId?: string;
  from?: string;
  to?: string;
}

function getActionStyle(action: string) {
  switch (action) {
    case "GET":
      return "bg-blue-50 text-blue-600";
    case "POST":
      return "bg-emerald-50 text-emerald-600";
    case "PATCH":
      return "bg-amber-50 text-amber-600";
    case "DELETE":
      return "bg-red-50 text-red-600";
    default:
      return "bg-[#f0f1f8] text-[#6b7194]";
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);

      const params: AuditLogParams = {};

      if (action) params.action = action;
      if (entity) params.entity = entity;
      if (userId) params.userId = userId;
      if (from) params.from = from;
      if (to) params.to = to;

      const response = await api.get<AuditLog[]>("/audit-logs", {
        params,
      });

      setLogs(response.data);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [action, entity, userId, from, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLogs();
  }, [loadLogs]);

  function clearFilters() {
    setAction("");
    setEntity("");
    setUserId("");
    setFrom("");
    setTo("");
  }

  const fieldClass =
    "w-full rounded-xl border border-[#e9ebf5] bg-[#fafaff] px-3 py-2.5 text-sm text-[#0f1535] outline-none transition placeholder:text-[#9298b4] focus:border-[#6d5ef0]";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-[#6b7194]">
          <ScrollText size={17} />
          System activity
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#0f1535]">
          Audit Logs
        </h1>

        <p className="mt-2 text-sm text-[#6b7194]">
          Review system actions and user activity.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#e9ebf5] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#0f1535]">Filters</h2>
          <span className="text-sm text-[#9298b4]">
            {logs.length} result{logs.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1.5 block text-sm text-[#343b60]">
              Action
            </label>

            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className={fieldClass}
            >
              <option value="">All actions</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-[#343b60]">
              Entity
            </label>

            <input
              type="text"
              placeholder="inventory-counts"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-[#343b60]">
              User ID
            </label>

            <input
              type="number"
              placeholder="1"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-[#343b60]">
              From
            </label>

            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-[#343b60]">
              To
            </label>

            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={loadLogs}
            className="rounded-xl bg-[#6d5ef0] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b4ce0]"
          >
            Apply Filters
          </button>

          <button
            onClick={clearFilters}
            className="rounded-xl border border-[#e9ebf5] px-4 py-2.5 text-sm font-medium text-[#343b60] transition hover:bg-[#f3f4fb]"
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#e9ebf5] bg-white p-6 text-sm text-[#6b7194] shadow-sm">
          Loading audit logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9dcef] bg-white p-12 text-center">
          <ScrollText size={32} className="mx-auto mb-3 text-[#9298b4]" />
          <p className="text-sm text-[#6b7194]">No audit logs found.</p>
          <p className="mt-2 text-sm text-[#9298b4]">
            Try changing or clearing the filters.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e9ebf5] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="bg-[#f8f8fd]">
                <tr className="border-b border-[#e9ebf5] text-left text-xs font-semibold uppercase tracking-wide text-[#9298b4]">
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Entity ID</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#f0f1f8] last:border-0 hover:bg-[#fafaff]"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getActionStyle(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#0f1535]">
                      {log.entity}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#6b7194]">
                      {log.entityId ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#6b7194]">
                      {log.userEmail ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#6b7194]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
