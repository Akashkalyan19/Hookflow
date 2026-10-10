import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { api } from "../services/api";
import type { DeliveryStatus, DeliverySummary, Page } from "../types/api";
import { DeliveryTable } from "../components/DeliveryTable";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";

const statuses: Array<DeliveryStatus | "all"> = ["all", "pending", "processing", "retry_scheduled", "succeeded", "failed"];
interface DeliveryResponse { deliveries: DeliverySummary[]; pagination: Omit<Page<DeliverySummary>, "items"> }

export function DeliveriesPage() {
  const [status, setStatus] = useState<DeliveryStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DeliveryResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status !== "all") params.set("status", status);
    try { setData(await api<DeliveryResponse>(`/deliveries?${params.toString()}`)); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load deliveries."); }
    finally { setLoading(false); }
  }, [page, status]);
  useEffect(() => { void load(); }, [load]);

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-muted">Every event, attempt, and response.</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Deliveries</h2></div><label className="flex items-center gap-2 text-sm text-muted"><Filter size={15} /><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => { setStatus(event.target.value as DeliveryStatus | "all"); setPage(1); }} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent focus:ring-2 focus:ring-indigo-100"><option value="all">All statuses</option>{statuses.filter((item) => item !== "all").map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label></div>
    {error ? <div role="alert" className="notice-error">{error}<button onClick={() => void load()} className="ml-2 underline">Retry</button></div> : null}
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">{loading ? <LoadingState label="Loading deliveries…" /> : error ? null : data?.deliveries.length ? <><DeliveryTable deliveries={data.deliveries} /><div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted"><span>{data.pagination.total} delivery{data.pagination.total === 1 ? "" : "ies"} · Page {data.pagination.page} of {Math.max(1, data.pagination.pages)}</span><div className="flex gap-1"><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="icon-button disabled:opacity-40"><ChevronLeft size={16} /></button><button aria-label="Next page" disabled={page >= data.pagination.pages} onClick={() => setPage((current) => current + 1)} className="icon-button disabled:opacity-40"><ChevronRight size={16} /></button></div></div></> : <div className="p-5"><EmptyState title="No deliveries found" description={status === "all" ? "When you send an event, it will show up here." : "Try another status filter or send an event."} /></div>}</section>
  </div>;
}
