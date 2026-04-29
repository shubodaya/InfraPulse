import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { api, formatDate, type CheckResult, type Monitor, type Outage } from "../api";
import { LatencyChart } from "../components/LatencyChart";
import { OutageTimeline } from "../components/OutageTimeline";
import { StatusBadge } from "../components/StatusBadge";

export function MonitorDetailPage() {
  const { id } = useParams();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [monitorData, checksData, outagesData] = await Promise.all([
        api.getMonitor(id),
        api.getMonitorChecks(id),
        api.listOutages(`?monitor_id=${id}`)
      ]);
      setMonitor(monitorData);
      setChecks(checksData);
      setOutages(outagesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load monitor");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const averageLatency = useMemo(() => {
    const values = checks.map((check) => check.response_time_ms).filter((value): value is number => value != null);
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [checks]);

  async function checkNow() {
    if (!id) return;
    setChecking(true);
    setError(null);
    try {
      await api.checkNow(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setChecking(false);
    }
  }

  if (loading) return <div className="panel p-8 text-sm text-stone-500">Loading monitor detail...</div>;
  if (error || !monitor) {
    return <div className="panel border-rose-200 bg-rose-50 p-6 text-rose-700">{error ?? "Monitor not found."}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900" to="/">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-stone-950">{monitor.name}</h1>
            <StatusBadge status={monitor.current_status} />
          </div>
          <p className="mt-2 font-mono text-sm text-stone-600">{monitor.target}</p>
        </div>
        <button
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={checking}
          onClick={() => void checkNow()}
        >
          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking..." : "Check Now"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="panel p-4">
          <p className="text-sm text-stone-500">Type</p>
          <p className="mt-2 text-xl font-semibold uppercase text-stone-950">{monitor.monitor_type}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-stone-500">24h availability</p>
          <p className="mt-2 text-xl font-semibold text-stone-950">
            {monitor.availability_24h == null ? "n/a" : `${monitor.availability_24h.toFixed(2)}%`}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-stone-500">Average latency</p>
          <p className="mt-2 text-xl font-semibold text-stone-950">
            {averageLatency == null ? "n/a" : `${averageLatency.toFixed(1)} ms`}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-stone-500">Last check</p>
          <p className="mt-2 text-xl font-semibold text-stone-950">{formatDate(monitor.last_checked_at)}</p>
        </div>
      </div>

      <LatencyChart checks={checks} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-950">Check History</h2>
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Packet loss</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {checks.slice(0, 20).map((check) => (
                  <tr key={check.id}>
                    <td className="px-4 py-3 text-stone-600">{formatDate(check.timestamp)}</td>
                    <td className="px-4 py-3"><StatusBadge status={check.status} /></td>
                    <td className="px-4 py-3 text-stone-700">
                      {check.response_time_ms == null ? "n/a" : `${check.response_time_ms.toFixed(1)} ms`}
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {check.packet_loss_percent == null ? "n/a" : `${check.packet_loss_percent}%`}
                    </td>
                    <td className="max-w-[420px] truncate px-4 py-3 text-stone-600">
                      {check.error_message ?? check.raw_result ?? "OK"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-950">Outage Timeline</h2>
        <OutageTimeline outages={outages} />
      </section>
    </div>
  );
}

