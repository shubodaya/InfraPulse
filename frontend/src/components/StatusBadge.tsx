import type { Status } from "../api";

const styles: Record<Status, string> = {
  up: "border-emerald-200 bg-emerald-50 text-emerald-700",
  degraded: "border-amber-200 bg-amber-50 text-amber-700",
  down: "border-rose-200 bg-rose-50 text-rose-700",
  unknown: "border-stone-200 bg-stone-100 text-stone-600"
};

export function StatusBadge({ status }: { status: Status | string }) {
  const normalized = (status || "unknown") as Status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
        styles[normalized] ?? styles.unknown
      }`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {normalized}
    </span>
  );
}

