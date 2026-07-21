"use client";

import { useEffect, useState, useCallback } from "react";
import type { DashboardData } from "@/lib/types";
import { StatusBadge, DaysBadge } from "./components/Badges";
import { StatCard } from "./components/StatCard";
import { Panel } from "./components/Panel";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard data");
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional initial data fetch + polling
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Payment Tickets & Karina Estacuy</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Tickets tagged <code>payment</code>, with issue type Payment, or assigned to{" "}
            {data?.assigneeLabel ?? "Karina Estacuy"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              Updated {timeAgo(data.generatedAt)}
            </span>
          )}
          <button
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="rounded border px-3 py-1.5 text-xs font-medium transition hover:bg-white/5"
            style={{ borderColor: "var(--panel-border)", color: "var(--text-primary)" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mb-6 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "var(--accent-red)", color: "var(--accent-red)", backgroundColor: "rgba(227,93,93,0.08)" }}
        >
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="py-24 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Loading ticket data from Zendesk…
        </div>
      )}

      {data && (
        <>
          {/* Status pill row */}
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(data.stats.statusCounts).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--panel-border)", backgroundColor: "var(--panel)" }}
              >
                <StatusBadge status={status} />
                <span style={{ color: "var(--text-muted)" }}>{count}</span>
              </div>
            ))}
          </div>

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard value={data.stats.openedThisWeek} label="Opened this week" color="var(--accent-blue)" />
            <StatCard value={data.stats.solvedClosedThisWeek} label="Solved / closed this week" color="var(--accent-green)" />
            <StatCard value={`${data.stats.avgDaysOpen}d`} label="Avg days open" color="var(--accent-orange)" />
            <StatCard value={data.stats.total} label="Total matching tickets" color="var(--text-primary)" />
            <StatCard value={data.stats.karinaTotal} label="Assigned to Karina" color="var(--accent-purple)" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Ticket feed */}
            <Panel title="Payment & Karina tickets" className="max-h-[520px] overflow-hidden">
              <div className="-m-4 max-h-[480px] overflow-y-auto p-4">
                <div className="space-y-2">
                  {data.recentTickets.length === 0 && (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      No matching tickets found.
                    </p>
                  )}
                  {data.recentTickets.map((t) => (
                    <div key={t.id} className="rounded border px-3 py-2.5" style={{ borderColor: "var(--panel-border)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{t.subject}</span>
                        <span className="shrink-0 text-xs" style={{ color: "var(--text-faint)" }}>
                          #{t.id}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        <StatusBadge status={t.status} />
                        <span>{t.requester}</span>
                        <span>·</span>
                        <span>
                          {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <DaysBadge days={t.daysOpen} />
                        {t.assignee && <span className="ml-auto rounded bg-white/5 px-2 py-0.5">{t.assignee}</span>}
                      </div>
                      {t.description && (
                        <p className="mt-1.5 truncate text-xs" style={{ color: "var(--text-faint)" }}>
                          {t.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            {/* Satisfaction survey */}
            <Panel title="Satisfaction survey comments" className="max-h-[520px] overflow-hidden">
              <div className="-m-4 max-h-[480px] overflow-y-auto p-4">
                <div className="mb-3">
                  <div className="mb-2 text-xs font-semibold" style={{ color: "var(--accent-green)" }}>
                    Positive ({data.satisfaction.positive.length})
                  </div>
                  <div className="space-y-2">
                    {data.satisfaction.positive.length === 0 && (
                      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        No positive comments yet.
                      </p>
                    )}
                    {data.satisfaction.positive.map((s, i) => (
                      <div
                        key={i}
                        className="rounded border px-3 py-2"
                        style={{ borderColor: "rgba(52,199,142,0.25)", backgroundColor: "rgba(52,199,142,0.06)" }}
                      >
                        <p className="text-xs" style={{ color: "var(--text-primary, #e8eaef)" }}>
                          &ldquo;{s.comment}&rdquo;
                        </p>
                        <p className="mt-1 text-[11px]" style={{ color: "var(--text-faint)" }}>
                          {s.subject} · #{s.ticketId}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold" style={{ color: "var(--accent-red)" }}>
                    Negative ({data.satisfaction.negative.length})
                  </div>
                  <div className="space-y-2">
                    {data.satisfaction.negative.length === 0 && (
                      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        No negative comments yet.
                      </p>
                    )}
                    {data.satisfaction.negative.map((s, i) => (
                      <div
                        key={i}
                        className="rounded border px-3 py-2"
                        style={{ borderColor: "rgba(227,93,93,0.25)", backgroundColor: "rgba(227,93,93,0.06)" }}
                      >
                        <p className="text-xs" style={{ color: "var(--text-primary, #e8eaef)" }}>
                          &ldquo;{s.comment}&rdquo;
                        </p>
                        <p className="mt-1 text-[11px]" style={{ color: "var(--text-faint)" }}>
                          {s.subject} · #{s.ticketId}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Oldest unresolved */}
          <Panel title="Oldest unresolved tickets — needs attention">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ color: "var(--text-faint)" }} className="text-xs uppercase">
                    <th className="pb-2 pr-4 font-medium">Requester</th>
                    <th className="pb-2 pr-4 font-medium">Subject</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Days open</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.oldestUnresolved.map((t) => (
                    <tr key={t.id} className="border-t" style={{ borderColor: "var(--panel-border)" }}>
                      <td className="py-2 pr-4">{t.requester}</td>
                      <td className="py-2 pr-4">{t.subject}</td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-2 pr-4">
                        <DaysBadge days={t.daysOpen} />
                      </td>
                      <td className="py-2" style={{ color: "var(--text-muted)" }}>
                        {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                  {data.oldestUnresolved.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                        Nothing unresolved 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
