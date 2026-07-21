const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  new: { bg: "rgba(91,141,239,0.15)", fg: "#5b8def", label: "new" },
  open: { bg: "rgba(139,124,246,0.15)", fg: "#8b7cf6", label: "open" },
  pending: { bg: "rgba(232,163,61,0.15)", fg: "#e8a33d", label: "pending" },
  hold: { bg: "rgba(232,163,61,0.15)", fg: "#e8a33d", label: "hold" },
  solved: { bg: "rgba(52,199,142,0.15)", fg: "#34c78e", label: "solved" },
  closed: { bg: "rgba(139,147,163,0.15)", fg: "#8b93a3", label: "closed" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.closed;
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {style.label}
    </span>
  );
}

export function DaysBadge({ days }: { days: number }) {
  let bg = "rgba(52,199,142,0.15)";
  let fg = "#34c78e";
  if (days >= 7) {
    bg = "rgba(227,93,93,0.15)";
    fg = "#e35d5d";
  } else if (days >= 3) {
    bg = "rgba(232,163,61,0.15)";
    fg = "#e8a33d";
  }
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: bg, color: fg }}
    >
      {days}d
    </span>
  );
}
