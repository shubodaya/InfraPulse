import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsPage } from "./ReportsPage";

function jsonResponse(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } }));
}

describe("ReportsPage", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("explains an unavailable API and retries the report requests", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ReportsPage />);

    expect(await screen.findByRole("heading", { name: "Reporting data is unavailable" })).toBeInTheDocument();
    expect(screen.getByText("Unable to reach the InfraPulse API. Check that the backend is running and try again.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  });

  it("renders real report responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/reports/availability")) return jsonResponse([]);
        if (url.endsWith("/api/reports/summary")) {
          return jsonResponse({ generated_at: "2026-01-01T00:00:00Z", total_monitors: 0, up: 0, degraded: 0, down: 0, unknown: 0, active_outages: 0, overall_availability_percent: 100, recent_outages: [], recent_alerts: [], periods: [] });
        }
        return jsonResponse({});
      })
    );

    render(<ReportsPage />);

    expect(await screen.findByText("30-day overall availability is 100.000% with 0 active outage(s).")).toBeInTheDocument();
    expect(screen.getByText("No SLA data is available yet.")).toBeInTheDocument();
  });
});
