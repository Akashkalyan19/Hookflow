import { useEffect, useState } from "react";
import { Activity, ArrowRight, CheckCircle2, Radio, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import type { DashboardStats, DeliverySummary } from "../types/api";
import { DeliveryTable } from "../components/DeliveryTable";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";

interface DashboardData { stats: DashboardStats; recentDeliveries: DeliverySummary[] }

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<DashboardData>("/dashboard/stats").then(setData).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not load dashboard."));
  }, []);

  if (error) return <div role="alert" className="notice-error">{error}</div>;
  if (!data) return <LoadingState />;
  const cards = [
    { label: "Total endpoints", value: data.stats.totalEndpoints, note: `${data.stats.enabledEndpoints} enabled`, icon: Radio, color: "text-indigo-600 bg-indigo-50" },
    { label: "Total deliveries", value: data.stats.totalDeliveries, note: "Events accepted", icon: Activity, color: "text-sky-700 bg-sky-50" },
    { label: "Successful", value: data.stats.succeeded, note: data.stats.totalDeliveries ? `${Math.round(data.stats.succeeded / data.stats.totalDeliveries * 100)}% of deliveries` : "No deliveries yet", icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50" },
    { label: "Failed", value: data.stats.failed, note: data.stats.failed ? "Needs a closer look" : "Nothing to fix", icon: TrendingDown, color: "text-rose-700 bg-rose-50" },
  ];
  return <div className="space-y-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-muted">Here’s what’s happening across your endpoints.</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Overview</h2></div><Link to="/endpoints?create=1" className="btn-primary"><Radio size={16} /> Add endpoint</Link></div>
    <section aria-label="Delivery statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, note, icon: Icon, color }) => <article key={label} className="rounded-2xl border border-line bg-white p-5 shadow-card"><div className="flex items-start justify-between"><div><p className="text-sm text-muted">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p></div><span className={`rounded-xl p-2.5 ${color}`}><Icon size={19} /></span></div><p className="mt-4 text-xs text-muted">{note}</p></article>)}</section>
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card"><div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h3 className="font-semibold text-ink">Recent activity</h3><p className="mt-0.5 text-xs text-muted">The latest webhook delivery attempts</p></div><Link to="/deliveries" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-indigo-700">All deliveries <ArrowRight size={15} /></Link></div>
      {data.recentDeliveries.length ? <DeliveryTable deliveries={data.recentDeliveries} /> : <div className="p-5"><EmptyState title="Nothing delivered yet" description="Create an endpoint and send a test event to see its delivery appear here." action={<Link to="/endpoints" className="btn-secondary">Set up an endpoint</Link>} /></div>}
    </section>
  </div>;
}
