import { Activity, AlertTriangle, Gauge, Server, ShieldCheck, WifiOff } from "lucide-react";
import type { SummaryReport } from "../api";

const cardBase = "panel p-4";

type Props = {
  summary: SummaryReport;
};

export function HealthSummaryCards({ summary }: Props) {
  const cards = [
    { label: "Total monitors", value: summary.total_monitors, icon: Server, tone: "text-stone-700" },
    { label: "Up", value: summary.up, icon: ShieldCheck, tone: "text-emerald-600" },
    { label: "Degraded", value: summary.degraded, icon: AlertTriangle, tone: "text-amber-600" },
    { label: "Down", value: summary.down, icon: WifiOff, tone: "text-rose-600" },
    {
      label: "Availability",
      value: `${summary.overall_availability_percent.toFixed(2)}%`,
      icon: Gauge,
      tone: "text-teal-600"
    },
    { label: "Active outages", value: summary.active_outages, icon: Activity, tone: "text-cyan-700" }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={cardBase}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-stone-500">{card.label}</p>
              <Icon aria-hidden className={`h-5 w-5 ${card.tone}`} />
            </div>
            <p className="mt-3 text-2xl font-semibold text-stone-950">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}

