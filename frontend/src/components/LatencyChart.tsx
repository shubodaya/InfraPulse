import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { CheckResult } from "../api";

type Props = {
  checks: CheckResult[];
};

export function LatencyChart({ checks }: Props) {
  const points = checks
    .filter((check) => check.response_time_ms != null)
    .slice()
    .reverse()
    .map((check) => ({
      time: new Date(check.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      latency: Number(check.response_time_ms?.toFixed(2)),
      status: check.status
    }));

  if (points.length === 0) {
    return <div className="panel p-6 text-sm text-stone-500">No latency samples are available for this monitor.</div>;
  }

  return (
    <div className="panel h-80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-stone-950">Latency Trend</h2>
        <span className="text-xs font-medium uppercase tracking-wide text-stone-500">ms</span>
      </div>
      <ResponsiveContainer width="100%" height="86%">
        <LineChart data={points}>
          <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fill: "#78716c", fontSize: 12 }} minTickGap={24} />
          <YAxis tick={{ fill: "#78716c", fontSize: 12 }} width={48} />
          <Tooltip
            contentStyle={{ borderRadius: 8, borderColor: "#d6d3d1" }}
            labelStyle={{ color: "#292524" }}
          />
          <Line type="monotone" dataKey="latency" stroke="#0f766e" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

