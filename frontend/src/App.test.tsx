import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<div>Overview content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("App", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows live backend connectivity when health checks succeed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "ok", service: "infrapulse-api" }), { status: 200 })));

    renderApp();

    expect(await screen.findByText("API connected")).toBeInTheDocument();
  });

  it("shows an unavailable state when the backend cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    renderApp();

    expect(await screen.findByText("API unavailable")).toBeInTheDocument();
  });
});
