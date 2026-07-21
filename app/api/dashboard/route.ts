import { NextResponse } from "next/server";
import {
  fetchFilteredTickets,
  fetchSatisfactionRatings,
  fetchUserNames,
  type ZendeskTicket,
} from "@/lib/zendesk";

export const dynamic = "force-dynamic";

const ASSIGNEE_EMAIL = process.env.ZENDESK_TARGET_ASSIGNEE_EMAIL || "karina@op.workada.co";
const ASSIGNEE_LABEL = "Karina Estacuy";

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_STATUSES = new Set(["new", "open", "pending", "hold"]);
const CLOSED_STATUSES = new Set(["solved", "closed"]);

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS);
}

function isWithinDays(dateStr: string, days: number): boolean {
  return daysSince(dateStr) <= days;
}

export async function GET() {
  try {
    const { tickets, issueTypeField } = await fetchFilteredTickets(ASSIGNEE_EMAIL);

    const requesterIds = tickets.map((t) => t.requester_id);
    const assigneeIds = tickets.map((t) => t.assignee_id).filter((v): v is number => v !== null);
    const userNames = await fetchUserNames([...requesterIds, ...assigneeIds]);

    const ticketIds = new Set(tickets.map((t) => t.id));
    const ratings = await fetchSatisfactionRatings(ticketIds);
    const ticketById = new Map<number, ZendeskTicket>(tickets.map((t) => [t.id, t]));

    const positive = ratings
      .filter((r) => (r.score === "good" || r.score === "good_with_comment") && r.comment)
      .map((r) => ({
        ticketId: r.ticket_id,
        subject: ticketById.get(r.ticket_id)?.subject ?? `Ticket #${r.ticket_id}`,
        comment: r.comment,
        createdAt: r.created_at,
      }));

    const negative = ratings
      .filter((r) => (r.score === "bad" || r.score === "bad_with_comment") && r.comment)
      .map((r) => ({
        ticketId: r.ticket_id,
        subject: ticketById.get(r.ticket_id)?.subject ?? `Ticket #${r.ticket_id}`,
        comment: r.comment,
        createdAt: r.created_at,
      }));

    const statusCounts: Record<string, number> = {
      new: 0,
      open: 0,
      pending: 0,
      hold: 0,
      solved: 0,
      closed: 0,
    };
    for (const t of tickets) {
      statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
    }

    const openedThisWeek = tickets.filter((t) => isWithinDays(t.created_at, 7)).length;
    const solvedClosedThisWeek = tickets.filter(
      (t) => CLOSED_STATUSES.has(t.status) && isWithinDays(t.updated_at, 7)
    ).length;

    const openTickets = tickets.filter((t) => OPEN_STATUSES.has(t.status));
    const avgDaysOpen =
      openTickets.length > 0
        ? Math.round(
            openTickets.reduce((sum, t) => sum + daysSince(t.created_at), 0) / openTickets.length
          )
        : 0;

    const oldestUnresolved = openTickets
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        requester: userNames.get(t.requester_id) ?? `User ${t.requester_id}`,
        subject: t.subject,
        status: t.status,
        daysOpen: daysSince(t.created_at),
        createdAt: t.created_at,
      }));

    const karinaTickets = tickets.filter((t) => {
      const name = t.assignee_id ? userNames.get(t.assignee_id) : null;
      return name?.toLowerCase().includes("karina");
    });

    // Breakdown: how many matched tickets fall under each "Issue Type" value,
    // e.g. Payment: 40, Login Issues: 5, Uncategorized: 3 — total/open/closed/this week each.
    interface BreakdownRow {
      issueType: string;
      total: number;
      open: number;
      closed: number;
      thisWeek: number;
    }
    const breakdownMap = new Map<string, BreakdownRow>();
    for (const t of tickets) {
      let label = "Uncategorized";
      if (issueTypeField) {
        const cf = t.custom_fields.find((f) => f.id === issueTypeField.fieldId);
        if (cf?.value) {
          label = issueTypeField.labelsByValue.get(cf.value) ?? cf.value;
        }
      }
      const row = breakdownMap.get(label) ?? { issueType: label, total: 0, open: 0, closed: 0, thisWeek: 0 };
      row.total += 1;
      if (OPEN_STATUSES.has(t.status)) row.open += 1;
      if (CLOSED_STATUSES.has(t.status)) row.closed += 1;
      if (isWithinDays(t.created_at, 7)) row.thisWeek += 1;
      breakdownMap.set(label, row);
    }
    const issueTypeBreakdown = Array.from(breakdownMap.values()).sort((a, b) => b.total - a.total);

    const recentTickets = tickets.slice(0, 25).map((t) => ({
      id: t.id,
      subject: t.subject,
      description: t.description?.slice(0, 160) ?? "",
      status: t.status,
      requester: userNames.get(t.requester_id) ?? `User ${t.requester_id}`,
      assignee: t.assignee_id ? userNames.get(t.assignee_id) ?? null : null,
      createdAt: t.created_at,
      daysOpen: daysSince(t.created_at),
      tags: t.tags,
    }));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      assigneeLabel: ASSIGNEE_LABEL,
      stats: {
        total: tickets.length,
        openedThisWeek,
        solvedClosedThisWeek,
        avgDaysOpen,
        statusCounts,
        karinaTotal: karinaTickets.length,
      },
      recentTickets,
      oldestUnresolved,
      issueTypeBreakdown,
      satisfaction: { positive, negative },
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
