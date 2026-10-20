import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";
import type { Monitor, SummaryReport } from "../api";

const monitor: Monitor = {
  id: 1,
  name: "Core Router",
  target: "8.8.8.8",
  monitor_type: "icmp",
  interval_seconds: 300,
  timeout_seconds: 3,
  enabled: true,
  tags: ["core"],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  current_status: "up",
  last_checked_at: new Date().toISOString(),
  last_response_time_ms: 18,
  active_outage: false,
  availability_24h: 99.9
};

const summary: SummaryReport = {
  generated_at: new Date().toISOString(),
  total_monitors: 1,
  up: 1,
  degraded: 0,
  down: 0,
  unknown: 0,
  active_outages: 0,
  overall_availability_percent: 99.9,
  recent_outages: [],
  recent_alerts: [],
  periods: []
};

function jsonResponse(data: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/reports/summary")) return jsonResponse(summary);
        if (url.endsWith("/api/monitors")) return jsonResponse([monitor]);
        return jsonResponse({});
      })
    );
  });

  it("renders dashboard with mocked health data", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Network health at a glance")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Search monitors" })).toBeInTheDocument();
    expect(screen.getByText("Core Router")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("99.90%").length).toBeGreaterThan(0));
  });
});
