import type { ReportPeriod } from "../api";
import { formatDuration } from "../api";
import { StatusBadge } from "./StatusBadge";

type Props = {
  periods: ReportPeriod[];
};

export function SLAReport({ periods }: Props) {
  if (periods.length === 0) {
    return <div className="panel p-6 text-sm text-stone-500">No SLA data is available yet.</div>;
  }

  return (
    <div className="space-y-4">
      {periods.map((period) => (
        <section key={period.period} className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-950">{period.period} SLA</h2>
              <p className="text-sm text-stone-500">{period.monitor_count} monitored targets</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-teal-700">
                {period.overall_availability_percent.toFixed(3)}%
              </p>
              <p className="text-xs uppercase tracking-wide text-stone-500">overall availability</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Monitor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Avg latency</th>
                  <th className="px-4 py-3">Outages</th>
                  <th className="px-4 py-3">Downtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {period.monitors.map((monitor) => (
                  <tr key={`${period.period}-${monitor.monitor_id}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-950">{monitor.name}</p>
                      <p className="font-mono text-xs text-stone-500">{monitor.target}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={monitor.current_status} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-950">
                      {monitor.availability_percent.toFixed(3)}%
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {monitor.average_latency_ms == null ? "n/a" : `${monitor.average_latency_ms.toFixed(1)} ms`}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{monitor.outage_count}</td>
                    <td className="px-4 py-3 text-stone-700">
                      {formatDuration(monitor.total_downtime_seconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

