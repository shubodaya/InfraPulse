import { BellRing } from "lucide-react";
import type { AlertEvent } from "../api";
import { formatDate } from "../api";

type Props = {
  alerts: AlertEvent[];
};

export function AlertHistory({ alerts }: Props) {
  if (alerts.length === 0) {
    return <div className="panel p-6 text-sm text-stone-500">No alert events have been recorded.</div>;
  }

  return (
    <div className="panel divide-y divide-stone-100">
      {alerts.map((alert) => (
        <div key={alert.id} className="flex gap-3 p-4">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <BellRing className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-stone-950">{alert.title}</p>
              <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-semibold uppercase text-stone-600">
                {alert.severity}
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-600">{alert.message}</p>
            <p className="mt-2 text-xs text-stone-500">
              {alert.monitor_name ?? `Monitor ${alert.monitor_id}`} - {formatDate(alert.timestamp)} - {alert.channel}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
