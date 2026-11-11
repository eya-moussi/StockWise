"use client";

import { useCallback, useEffect, useState } from "react";
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
      return "bg-blue-500/15 text-blue-400";
    case "POST":
      return "bg-emerald-500/15 text-emerald-400";
    case "PATCH":
      return "bg-amber-500/15 text-amber-400";
    case "DELETE":
      return "bg-red-500/15 text-red-400";
    default:
      return "bg-slate-500/15 text-slate-300";
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
    "w-full rounded-lg border border-slate-700 bg-[#0f172a] px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-blue-500";

  return (
    <main className="min-h-screen bg-[#0b1120] p-6 text-slate-200 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-blue-400">
            System activity
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Audit Logs
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Review system actions and user activity.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-slate-800 bg-[#111827] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Filters</h2>
            <span className="text-sm text-slate-500">
              {logs.length} result{logs.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
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
              <label className="mb-1.5 block text-sm text-slate-400">
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
              <label className="mb-1.5 block text-sm text-slate-400">
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
              <label className="mb-1.5 block text-sm text-slate-400">
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
              <label className="mb-1.5 block text-sm text-slate-400">
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
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Apply Filters
            </button>

            <button
              onClick={clearFilters}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 text-sm text-slate-400">
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-[#111827] p-10 text-center">
            <p className="text-slate-300">No audit logs found.</p>
            <p className="mt-2 text-sm text-slate-500">
              Try changing or clearing the filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-[#0f172a] text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Action</th>
                    <th className="px-5 py-4">Entity</th>
                    <th className="px-5 py-4">Entity ID</th>
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getActionStyle(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-200">
                        {log.entity}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {log.entityId ?? "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {log.userEmail ?? "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
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
    </main>
  );
}