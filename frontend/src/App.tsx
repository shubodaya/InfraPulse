import { NavLink, Outlet } from "react-router-dom";
import { Activity, BarChart3, Plus, Radar, Siren } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: Radar },
  { to: "/monitors/new", label: "Add Monitor", icon: Plus },
  { to: "/outages", label: "Outages", icon: Siren },
  { to: "/reports", label: "Reports", icon: BarChart3 }
];

export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-950 text-teal-300">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-stone-950">InfraPulse</p>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">NOC monitoring console</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    `focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                      isActive
                        ? "bg-teal-700 text-white"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                    }`
                  }
                  to={item.to}
                  end={item.to === "/"}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

