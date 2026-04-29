import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { api, type Monitor, type Outage } from "../api";
import { OutageTimeline } from "../components/OutageTimeline";

export function OutagesPage() {
  const [outages, setOutages] = useState<Outage[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [monitorId, setMonitorId] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const query = new URLSearchParams();
    if (monitorId) query.set("monitor_id", monitorId);
    if (severity) query.set("severity", severity);
    if (status) query.set("status", status);
    const value = query.toString();
    return value ? `?${value}` : "";
  }, [monitorId, severity, status]);

  useEffect(() => {
    async function loadMonitors() {
      try {
        setMonitors(await api.listMonitors());
      } catch {
        setMonitors([]);
      }
    }
    void loadMonitors();
  }, []);

  useEffect(() => {
    async function loadOutages() {
      setLoading(true);
      setError(null);
      try {
        setOutages(await api.listOutages(params));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load outages");
      } finally {
        setLoading(false);
      }
    }
    void loadOutages();
  }, [params]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Outage intelligence</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Outages</h1>
      </div>

      <div className="panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 font-semibold text-stone-700">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <select className="focus-ring rounded-md border border-stone-300 px-3 py-2" value={monitorId} onChange={(event) => setMonitorId(event.target.value)}>
          <option value="">All monitors</option>
          {monitors.map((monitor) => (
            <option key={monitor.id} value={monitor.id}>{monitor.name}</option>
          ))}
        </select>
        <select className="focus-ring rounded-md border border-stone-300 px-3 py-2" value={severity} onChange={(event) => setSeverity(event.target.value)}>
          <option value="">All severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select className="focus-ring rounded-md border border-stone-300 px-3 py-2" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Active and resolved</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading && <div className="panel p-8 text-sm text-stone-500">Loading outage timeline...</div>}
      {error && <div className="panel border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>}
      {!loading && !error && <OutageTimeline outages={outages} />}
    </div>
  );
}

