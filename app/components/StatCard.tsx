export function StatCard({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div
      className="flex-1 rounded-lg border px-5 py-4"
      style={{ backgroundColor: "var(--panel)", borderColor: "var(--panel-border)" }}
    >
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        {label}
      </div>
    </div>
  );
}
