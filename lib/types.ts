export interface DashboardTicket {
  id: number;
  subject: string;
  description: string;
  status: "new" | "open" | "pending" | "hold" | "solved" | "closed";
  requester: string;
  assignee: string | null;
  createdAt: string;
  daysOpen: number;
  tags: string[];
}

export interface OldestUnresolvedTicket {
  id: number;
  requester: string;
  subject: string;
  status: string;
  daysOpen: number;
  createdAt: string;
}

export interface SatisfactionComment {
  ticketId: number;
  subject: string;
  comment: string | null;
  createdAt: string;
}

export interface DashboardData {
  generatedAt: string;
  assigneeLabel: string;
  stats: {
    total: number;
    openedThisWeek: number;
    solvedClosedThisWeek: number;
    avgDaysOpen: number;
    statusCounts: Record<string, number>;
    karinaTotal: number;
  };
  recentTickets: DashboardTicket[];
  oldestUnresolved: OldestUnresolvedTicket[];
  satisfaction: {
    positive: SatisfactionComment[];
    negative: SatisfactionComment[];
  };
}
