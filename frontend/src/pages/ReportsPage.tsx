import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, TriangleAlert } from "lucide-react";
import { api, type ReportPeriod, type SummaryReport } from "../api";
import { SLAReport } from "../components/SLAReport";

export function ReportsPage() {
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [availability, summaryData] = await Promise.all([api.getAvailability(), api.getSummary()]);
      setPeriods(availability);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Availability reporting</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">SLA Reports</h1>
          {summary && (
            <p className="mt-2 text-stone-600">
              30-day overall availability is {summary.overall_availability_percent.toFixed(3)}% with {summary.active_outages} active outage(s).
            </p>
          )}
        </div>
        <a
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          href={api.reportDownloadUrl()}
        >
          <Download className="h-4 w-4" />
          Download Markdown
        </a>
      </div>

      {loading && <div className="panel p-8 text-sm text-slate-500">Loading SLA report...</div>}
      {error && !loading && (
        <section className="panel border-rose-200 bg-rose-50 p-6 sm:p-8" aria-live="polite">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700"><TriangleAlert className="h-5 w-5" aria-hidden /></span>
            <div>
              <h2 className="text-lg font-bold text-rose-950">Reporting data is unavailable</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-rose-800">{error}</p>
              <p className="mt-2 text-sm text-rose-700">The Reports page needs both the availability and summary endpoints. Once the API is available, retry the request.</p>
              <button className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Retry</button>
            </div>
          </div>
        </section>
      )}
      {!loading && !error && <SLAReport periods={periods} />}
    </div>
  );
}

