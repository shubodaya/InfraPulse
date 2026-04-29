import { Link } from "react-router-dom";
import { Activity, ExternalLink } from "lucide-react";
import type { Monitor } from "../api";
import { formatDate } from "../api";
import { StatusBadge } from "./StatusBadge";

type Props = {
  monitors: Monitor[];
};

export function MonitorTable({ monitors }: Props) {
  if (monitors.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <Activity className="mx-auto h-8 w-8 text-stone-400" />
        <p className="mt-3 font-medium text-stone-900">No monitors configured</p>
        <p className="mt-1 text-sm text-stone-500">Add a monitor to begin collecting availability data.</p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Monitor</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">24h SLA</th>
              <th className="px-4 py-3">Latency</th>
              <th className="px-4 py-3">Last check</th>
              <th className="px-4 py-3" aria-label="Open details" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {monitors.map((monitor) => (
              <tr key={monitor.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link className="font-semibold text-stone-950 hover:text-teal-700" to={`/monitors/${monitor.id}`}>
                    {monitor.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {monitor.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-stone-600">
                  {monitor.target}
                </td>
                <td className="px-4 py-3 uppercase text-stone-700">{monitor.monitor_type}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={monitor.current_status} />
                </td>
                <td className="px-4 py-3 font-medium text-stone-900">
                  {monitor.availability_24h == null ? "n/a" : `${monitor.availability_24h.toFixed(2)}%`}
                </td>
                <td className="px-4 py-3 text-stone-700">
                  {monitor.last_response_time_ms == null ? "n/a" : `${monitor.last_response_time_ms.toFixed(1)} ms`}
                </td>
                <td className="px-4 py-3 text-stone-500">{formatDate(monitor.last_checked_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-teal-700"
                    to={`/monitors/${monitor.id}`}
                    aria-label={`Open ${monitor.name}`}
                    title={`Open ${monitor.name}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

