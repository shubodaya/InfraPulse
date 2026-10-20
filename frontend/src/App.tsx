import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, BarChart3, CirclePlus, LayoutDashboard, Menu, Siren, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "./api";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/monitors/new", label: "Add Monitor", icon: CirclePlus },
  { to: "/outages", label: "Outages & Incidents", icon: Siren },
  { to: "/reports", label: "SLA & Reports", icon: BarChart3 }
];

const pageTitles: Record<string, { title: string; eyebrow: string }> = {
  "/": { title: "Network overview", eyebrow: "Operations centre" },
  "/monitors/new": { title: "Add monitor", eyebrow: "Monitor management" },
  "/outages": { title: "Outages & incidents", eyebrow: "Incident intelligence" },
  "/reports": { title: "SLA & reports", eyebrow: "Availability reporting" }
};

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const { pathname } = useLocation();
  const page = pathname.startsWith("/monitors/") && pathname !== "/monitors/new" ? { title: "Monitor detail", eyebrow: "Monitor management" } : pageTitles[pathname] ?? pageTitles["/"];
  useEffect(() => {
    let active = true;
    async function checkConnectivity() {
      try {
        await api.getHealth();
        if (active) setApiStatus("online");
      } catch {
        if (active) setApiStatus("offline");
      }
    }
    void checkConnectivity();
    const intervalId = window.setInterval(() => void checkConnectivity(), 30_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-950 px-4 py-5 text-slate-300 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Primary navigation">
        <div className="flex items-center justify-between px-2"><NavLink to="/" className="focus-ring flex items-center gap-3 rounded-lg" onClick={() => setMenuOpen(false)}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 text-slate-950"><Activity className="h-5 w-5" /></span><span><span className="block text-base font-bold tracking-tight text-white">InfraPulse</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">NOC console</span></span></NavLink><button className="focus-ring rounded-md p-2 text-slate-400 hover:bg-slate-800 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button></div>
        <nav className="mt-10 space-y-1"><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</p>{navItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-teal-400 text-slate-950 shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><Icon className="h-[18px] w-[18px]" aria-hidden />{label}</NavLink>)}</nav>
        <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><span className="h-2 w-2 rounded-full bg-emerald-400" />Monitoring service</div><p className="mt-1 text-xs leading-5 text-slate-500">Live health and outage intelligence.</p></div>
      </aside>
      {menuOpen && <button className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation overlay" />}
      <div className="min-h-screen lg:pl-72"><header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 backdrop-blur"><div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8"><button className="focus-ring rounded-md p-2 text-slate-600 hover:bg-slate-200 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">{page.eyebrow}</p><h1 className="truncate text-lg font-bold tracking-tight text-slate-950">{page.title}</h1></div><div className="ml-auto hidden items-center gap-2 text-xs font-semibold text-slate-500 sm:flex" aria-live="polite"><span className={`h-2 w-2 rounded-full ${apiStatus === "online" ? "bg-emerald-500" : apiStatus === "offline" ? "bg-rose-500" : "bg-amber-400"}`} />{apiStatus === "online" ? "API connected" : apiStatus === "offline" ? "API unavailable" : "Checking API"}</div></div></header><main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main></div>
    </div>
  );
}

