import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import { api, type Monitor, type SummaryReport } from "../api";
import { AlertHistory } from "../components/AlertHistory";
import { HealthSummaryCards } from "../components/HealthSummaryCards";
import { MonitorTable } from "../components/MonitorTable";
import { OutageTimeline } from "../components/OutageTimeline";

export function DashboardPage() {
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, monitorData] = await Promise.all([api.getSummary(), api.listMonitors()]);
      setSummary(summaryData);
      setMonitors(monitorData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <div className="panel p-8 text-sm text-stone-500">Loading network health data...</div>;
  }

  if (error || !summary) {
    return (
      <div className="panel border-rose-200 bg-rose-50 p-6 text-rose-700">
        {error ?? "Dashboard data is unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">InfraPulse</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">Network Monitoring Dashboard</h1>
          <p className="mt-2 max-w-3xl text-stone-600">
            Lightweight outage intelligence for network devices, servers, web endpoints, DNS, and internet links.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="focus-ring inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            onClick={() => void load()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            to="/monitors/new"
          >
            <Plus className="h-4 w-4" />
            Add Monitor
          </Link>
        </div>
      </div>

      <HealthSummaryCards summary={summary} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-950">Monitored Targets</h2>
          <span className="text-sm text-stone-500">{monitors.length} configured</span>
        </div>
        <MonitorTable monitors={monitors} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-950">Recent Outages</h2>
          <OutageTimeline outages={summary.recent_outages.slice(0, 5)} />
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-950">Alert History</h2>
          <AlertHistory alerts={summary.recent_alerts.slice(0, 5)} />
        </section>
      </div>
    </div>
  );
}

