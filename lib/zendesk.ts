// Server-side only. Never import this file from a Client Component.
// All requests are authenticated with an agent email + API token,
// read from environment variables that are set in Vercel (not in this file).

const SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN;
const EMAIL = process.env.ZENDESK_EMAIL;
const TOKEN = process.env.ZENDESK_API_TOKEN;

function assertConfigured() {
  if (!SUBDOMAIN || !EMAIL || !TOKEN) {
    throw new Error(
      "Missing Zendesk configuration. Set ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, and ZENDESK_API_TOKEN as environment variables."
    );
  }
}

function authHeader(): string {
  const encoded = Buffer.from(`${EMAIL}/token:${TOKEN}`).toString("base64");
  return `Basic ${encoded}`;
}

function baseUrl(): string {
  return `https://${SUBDOMAIN}.zendesk.com/api/v2`;
}

async function zendeskFetch<T>(path: string): Promise<T> {
  assertConfigured();
  const url = path.startsWith("http") ? path : `${baseUrl()}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    // Dashboard data can be a little stale; avoid hammering Zendesk on every load.
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Zendesk API error ${res.status} on ${path}: ${body.slice(0, 500)}`);
  }

  return res.json() as Promise<T>;
}

export interface ZendeskTicket {
  id: number;
  subject: string;
  description: string;
  status: "new" | "open" | "pending" | "hold" | "solved" | "closed";
  tags: string[];
  requester_id: number;
  assignee_id: number | null;
  created_at: string;
  updated_at: string;
  custom_fields: { id: number; value: string | null }[];
}

interface SearchResponse {
  results: ZendeskTicket[];
  next_page: string | null;
  count: number;
}

interface TicketFieldOption {
  name: string;
  value: string;
}

interface TicketField {
  id: number;
  title: string;
  custom_field_options?: TicketFieldOption[];
}

interface TicketFieldsResponse {
  ticket_fields: TicketField[];
}

interface UsersResponse {
  users: { id: number; name: string; email: string }[];
}

export interface SatisfactionRating {
  id: number;
  ticket_id: number;
  score: "good" | "bad" | "good_with_comment" | "bad_with_comment" | "offered" | "unoffered";
  comment: string | null;
  created_at: string;
}

interface SatisfactionRatingsResponse {
  satisfaction_ratings: SatisfactionRating[];
  next_page: string | null;
}

// Zendesk search query strings need spaces encoded and quoting for phrases.
async function searchTickets(query: string): Promise<ZendeskTicket[]> {
  const all: ZendeskTicket[] = [];
  let path: string | null = `/search.json?query=${encodeURIComponent(query)}&sort_by=created_at&sort_order=desc&per_page=100`;
  let pages = 0;

  while (path && pages < 10) {
    const data: SearchResponse = await zendeskFetch<SearchResponse>(path);
    all.push(...data.results.filter((r) => "status" in r));
    path = data.next_page
      ? data.next_page.replace(baseUrl(), "")
      : null;
    pages += 1;
  }

  return all;
}

// Resolves the ticket field id + option value for a given field title / option label,
// e.g. title "Issue Type", option label "Payment" -> { fieldId, value }
async function resolveCustomFieldOption(
  fieldTitleMatch: string,
  optionLabelMatch: string
): Promise<{ fieldId: number; value: string } | null> {
  const data = await zendeskFetch<TicketFieldsResponse>("/ticket_fields.json?per_page=100");
  const field = data.ticket_fields.find((f) =>
    f.title.toLowerCase().includes(fieldTitleMatch.toLowerCase())
  );
  if (!field || !field.custom_field_options) return null;

  const option = field.custom_field_options.find((o) =>
    o.name.toLowerCase().includes(optionLabelMatch.toLowerCase())
  );
  if (!option) return null;

  return { fieldId: field.id, value: option.value };
}

export async function fetchFilteredTickets(assigneeEmail: string): Promise<ZendeskTicket[]> {
  const queries: string[] = [
    "type:ticket tags:payment",
    `type:ticket assignee:${assigneeEmail}`,
  ];

  const issueTypeField = await resolveCustomFieldOption("issue type", "payment");
  if (issueTypeField) {
    queries.push(`type:ticket custom_field_${issueTypeField.fieldId}:${issueTypeField.value}`);
  }

  const resultSets = await Promise.all(queries.map((q) => searchTickets(q)));

  const merged = new Map<number, ZendeskTicket>();
  for (const set of resultSets) {
    for (const ticket of set) {
      merged.set(ticket.id, ticket);
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function fetchUserNames(ids: number[]): Promise<Map<number, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<number, string>();
  if (unique.length === 0) return map;

  // show_many supports up to 100 ids per call
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const data = await zendeskFetch<UsersResponse>(
      `/users/show_many.json?ids=${chunk.join(",")}`
    );
    for (const u of data.users) {
      map.set(u.id, u.name);
    }
  }
  return map;
}

export async function fetchSatisfactionRatings(
  ticketIds: Set<number>
): Promise<SatisfactionRating[]> {
  const all: SatisfactionRating[] = [];
  let path: string | null = "/satisfaction_ratings.json?per_page=100&sort_by=created_at&sort_order=desc";
  let pages = 0;

  while (path && pages < 10) {
    const data: SatisfactionRatingsResponse = await zendeskFetch<SatisfactionRatingsResponse>(path);
    all.push(...data.satisfaction_ratings.filter((r) => ticketIds.has(r.ticket_id)));
    path = data.next_page ? data.next_page.replace(baseUrl(), "") : null;
    pages += 1;
    // Once we've paged past the point where nothing new matches our ticket set for
    // a couple of pages in a row, it's not worth continuing to page through history.
  }

  return all;
}
