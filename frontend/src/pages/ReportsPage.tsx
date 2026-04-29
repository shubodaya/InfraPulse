import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api, type ReportPeriod, type SummaryReport } from "../api";
import { SLAReport } from "../components/SLAReport";

export function ReportsPage() {
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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
    }
    void load();
  }, []);

  if (loading) return <div className="panel p-8 text-sm text-stone-500">Loading SLA report...</div>;
  if (error) return <div className="panel border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>;

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

      <SLAReport periods={periods} />
    </div>
  );
}

