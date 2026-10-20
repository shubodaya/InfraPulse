import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw, Search } from "lucide-react";
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
  const [query, setQuery] = useState("");

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

  const visibleMonitors = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? monitors.filter((monitor) => `${monitor.name} ${monitor.target} ${monitor.monitor_type}`.toLowerCase().includes(term)) : monitors;
  }, [monitors, query]);

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
        <div><h2 className="text-2xl font-bold tracking-tight text-slate-950">Network health at a glance</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Live availability, monitor status, and recent outage intelligence across your monitored estate.</p></div>
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
          <h2 className="section-heading">Monitored targets</h2>
          <span className="text-sm text-slate-500">{visibleMonitors.length} of {monitors.length}</span>
        </div>
        <label className="relative block sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Search monitors" value={query} onChange={(event) => setQuery(event.target.value)} className="focus-ring w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400" placeholder="Search monitors by name, target, or type" /></label>
        <MonitorTable monitors={visibleMonitors} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="space-y-3">
          <h2 className="section-heading">Recent outages</h2>
          <OutageTimeline outages={summary.recent_outages.slice(0, 5)} />
        </section>
        <section className="space-y-3">
          <h2 className="section-heading">Recent alerts</h2>
          <AlertHistory alerts={summary.recent_alerts.slice(0, 5)} />
        </section>
      </div>
    </div>
  );
}

