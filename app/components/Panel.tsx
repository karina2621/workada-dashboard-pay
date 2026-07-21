export function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border ${className}`}
      style={{ backgroundColor: "var(--panel)", borderColor: "var(--panel-border)" }}
    >
      <div
        className="border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide"
        style={{ borderColor: "var(--panel-border)", color: "var(--text-faint)" }}
      >
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
