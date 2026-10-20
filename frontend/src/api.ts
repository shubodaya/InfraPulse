// Vite proxies relative requests during local development. An absolute value can
// still be provided by Docker or a deployed environment.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export class ApiConnectionError extends Error {
  constructor() {
    super("Unable to reach the InfraPulse API. Check that the backend is running and try again.");
    this.name = "ApiConnectionError";
  }
}

export type Status = "up" | "degraded" | "down" | "unknown";

export type Monitor = {
  id: number;
  name: string;
  target: string;
  monitor_type: "icmp" | "http" | "dns" | "tcp";
  interval_seconds: number;
  timeout_seconds: number;
  expected_status_code?: number | null;
  expected_dns_result?: string | null;
  enabled: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  current_status: Status;
  last_checked_at?: string | null;
  last_response_time_ms?: number | null;
  active_outage: boolean;
  availability_24h?: number | null;
};

export type CheckResult = {
  id: number;
  monitor_id: number;
  timestamp: string;
  status: Status;
  response_time_ms?: number | null;
  packet_loss_percent?: number | null;
  error_message?: string | null;
  check_type: string;
  raw_result?: string | null;
};

export type Outage = {
  id: number;
  monitor_id: number;
  monitor_name?: string | null;
  monitor_target?: string | null;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  severity: string;
  status: string;
  root_cause_hint: string;
  failed_check_count: number;
};

export type AlertEvent = {
  id: number;
  monitor_id: number;
  outage_id?: number | null;
  monitor_name?: string | null;
  timestamp: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  channel: string;
  delivered: boolean;
};

export type MonitorAvailability = {
  monitor_id: number;
  name: string;
  target: string;
  monitor_type: string;
  availability_percent: number;
  average_latency_ms?: number | null;
  outage_count: number;
  total_downtime_seconds: number;
  total_checks: number;
  up_checks: number;
  degraded_checks: number;
  down_checks: number;
  current_status: Status;
};

export type ReportPeriod = {
  period: string;
  since: string;
  until: string;
  overall_availability_percent: number;
  active_outages: number;
  monitor_count: number;
  monitors: MonitorAvailability[];
};

export type SummaryReport = {
  generated_at: string;
  total_monitors: number;
  up: number;
  degraded: number;
  down: number;
  unknown: number;
  active_outages: number;
  overall_availability_percent: number;
  recent_outages: Outage[];
  recent_alerts: AlertEvent[];
  periods: ReportPeriod[];
};

export type NewMonitorPayload = {
  name: string;
  target: string;
  monitor_type: Monitor["monitor_type"];
  interval_seconds: number;
  timeout_seconds: number;
  expected_status_code?: number | null;
  expected_dns_result?: string | null;
  enabled: boolean;
  tags: string[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      ...init
    });
  } catch {
    throw new ApiConnectionError();
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getHealth: () => request<{ status: string; service: string }>("/health"),
  listMonitors: () => request<Monitor[]>("/api/monitors"),
  createMonitor: (payload: NewMonitorPayload) =>
    request<Monitor>("/api/monitors", { method: "POST", body: JSON.stringify(payload) }),
  getMonitor: (id: string | number) => request<Monitor>(`/api/monitors/${id}`),
  getMonitorChecks: (id: string | number) =>
    request<CheckResult[]>(`/api/monitors/${id}/checks?limit=200`),
  checkNow: (id: string | number) =>
    request<CheckResult>(`/api/monitors/${id}/check-now`, { method: "POST" }),
  listOutages: (params = "") => request<Outage[]>(`/api/outages${params}`),
  getSummary: () => request<SummaryReport>("/api/reports/summary"),
  getAvailability: () => request<ReportPeriod[]>("/api/reports/availability"),
  getAlerts: () => request<AlertEvent[]>("/api/reports/alerts"),
  reportDownloadUrl: () => `${API_BASE_URL}/api/reports/availability/download`
};

export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "0m";
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

