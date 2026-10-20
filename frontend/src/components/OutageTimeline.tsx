import type { Outage } from "../api";
import { formatDate, formatDuration } from "../api";
import { StatusBadge } from "./StatusBadge";

type Props = {
  outages: Outage[];
};

export function OutageTimeline({ outages }: Props) {
  if (outages.length === 0) {
    return <div className="panel p-6 text-sm text-stone-500">No outage events found for the selected scope.</div>;
  }

  return (
    <div className="panel divide-y divide-stone-100">
      {outages.map((outage) => (
        <div key={outage.id} className="grid gap-3 p-4 md:grid-cols-[180px_1fr_140px] md:items-center">
          <div>
            <p className="font-semibold text-stone-950">{outage.monitor_name ?? `Monitor ${outage.monitor_id}`}</p>
            <p className="mt-1 text-xs text-stone-500">{formatDate(outage.started_at)}</p>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={outage.status === "active" ? "down" : "up"} />
              <span className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${outage.severity === "critical" || outage.severity === "high" ? "bg-rose-50 text-rose-700" : outage.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {outage.severity}
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-600">{outage.root_cause_hint}</p>
          </div>
          <div className="text-sm md:text-right">
            <p className="font-semibold text-stone-950">{formatDuration(outage.duration_seconds)}</p>
            <p className="mt-1 text-stone-500">{outage.ended_at ? formatDate(outage.ended_at) : "Active"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

