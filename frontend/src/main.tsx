import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App } from "./App";
import { AddMonitorPage } from "./pages/AddMonitorPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MonitorDetailPage } from "./pages/MonitorDetailPage";
import { OutagesPage } from "./pages/OutagesPage";
import { ReportsPage } from "./pages/ReportsPage";
import "./styles/index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "monitors/new", element: <AddMonitorPage /> },
      { path: "monitors/:id", element: <MonitorDetailPage /> },
      { path: "outages", element: <OutagesPage /> },
      { path: "reports", element: <ReportsPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

