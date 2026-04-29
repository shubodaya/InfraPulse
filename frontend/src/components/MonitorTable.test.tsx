import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Monitor } from "../api";
import { MonitorTable } from "./MonitorTable";

const monitors: Monitor[] = [
  {
    id: 1,
    name: "DNS Resolver",
    target: "cloudflare.com",
    monitor_type: "dns",
    interval_seconds: 300,
    timeout_seconds: 4,
    enabled: true,
    tags: ["dns"],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    current_status: "up",
    last_checked_at: "2026-01-01T00:00:00Z",
    last_response_time_ms: 22,
    active_outage: false,
    availability_24h: 100
  }
];

describe("MonitorTable", () => {
  it("renders monitor rows", () => {
    render(
      <MemoryRouter>
        <MonitorTable monitors={monitors} />
      </MemoryRouter>
    );

    expect(screen.getByText("DNS Resolver")).toBeInTheDocument();
    expect(screen.getByText("cloudflare.com")).toBeInTheDocument();
    expect(screen.getByText("100.00%")).toBeInTheDocument();
  });
});

