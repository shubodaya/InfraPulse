import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReportPeriod } from "../api";
import { SLAReport } from "./SLAReport";

const periods: ReportPeriod[] = [
  {
    period: "24h",
    since: "2026-01-01T00:00:00Z",
    until: "2026-01-02T00:00:00Z",
    overall_availability_percent: 99.95,
    active_outages: 0,
    monitor_count: 1,
    monitors: [
      {
        monitor_id: 1,
        name: "Corporate Website",
        target: "https://example.com",
        monitor_type: "http",
        availability_percent: 99.95,
        average_latency_ms: 104,
        outage_count: 1,
        total_downtime_seconds: 180,
        total_checks: 100,
        up_checks: 99,
        degraded_checks: 1,
        down_checks: 0,
        current_status: "degraded"
      }
    ]
  }
];

describe("SLAReport", () => {
  it("renders report summary", () => {
    render(<SLAReport periods={periods} />);

    expect(screen.getByText("24h SLA")).toBeInTheDocument();
    expect(screen.getByText("Corporate Website")).toBeInTheDocument();
    expect(screen.getAllByText("99.950%")[0]).toBeInTheDocument();
  });
});

