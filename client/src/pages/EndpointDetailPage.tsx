import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, Send } from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import type { DeliveryStatus, Endpoint } from "../types/api";
import { LoadingState } from "../components/LoadingState";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";

interface RecentItem { id: string; eventId: string; eventType: string; status: DeliveryStatus; attempts: Array<unknown>; lastStatusCode?: number; createdAt: string }
interface EndpointDetail { endpoint: Endpoint; recentDeliveries: RecentItem[] }

export function EndpointDetailPage() {
  const { endpointId = "" } = useParams();
  const { notify } = useToast();
  const [data, setData] = useState<EndpointDetail | null>(null);
  const [error, setError] = useState("");
  const [eventType, setEventType] = useState("order.created");
  const [payload, setPayload] = useState('{\n  "orderId": "ord_123",\n  "amount": 4999,\n  "currency": "INR"\n}');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const result = await api<EndpointDetail>(`/endpoints/${endpointId}`); setData(result); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load endpoint."); }
  }, [endpointId]);
  useEffect(() => { void load(); }, [load]);

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let parsed: unknown;
    try { parsed = JSON.parse(payload) as unknown; }
    catch { notify("Payload must be valid JSON.", "error"); return; }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) { notify("Payload must be a JSON object.", "error"); return; }
    setBusy(true);
    try {
      await api<{ eventId: string }>(`/endpoints/${endpointId}/events`, { method: "POST", body: JSON.stringify({ eventType, payload: parsed }) });
      notify("Event accepted and queued for delivery.");
      await load();
    } catch (caught) { notify(caught instanceof Error ? caught.message : "Could not send event.", "error"); }
    finally { setBusy(false); }
  }

  if (error) return <div className="space-y-4"><Link to="/endpoints" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> Back to endpoints</Link><div role="alert" className="notice-error">{error}</div></div>;
  if (!data) return <LoadingState label="Loading endpoint…" />;
  return <div className="space-y-6">
    <Link to="/endpoints" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} /> All endpoints</Link>
    <div><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold tracking-tight text-ink">{data.endpoint.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${data.endpoint.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{data.endpoint.enabled ? "Enabled" : "Disabled"}</span></div><p className="mt-2 break-all font-mono text-sm text-muted">{data.endpoint.url}</p></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card"><div className="mb-5"><h3 className="font-semibold text-ink">Send an event</h3><p className="mt-1 text-sm text-muted">HookFlow will queue it and sign the exact JSON body.</p></div>
        <form onSubmit={(event) => void submitEvent(event)} className="space-y-4"><label className="block text-sm font-medium text-slate-700">Event type<input value={eventType} onChange={(event) => setEventType(event.target.value)} required maxLength={120} pattern="[A-Za-z0-9_.-]+" className="field mt-1.5" /></label><label className="block text-sm font-medium text-slate-700">JSON payload<textarea value={payload} onChange={(event) => setPayload(event.target.value)} required rows={9} spellCheck={false} className="field mt-1.5 min-h-48 resize-y font-mono text-xs leading-5" /></label><p className="text-xs text-muted">Payload limit: 60 KB. Your receiver will get an envelope with the event ID, type, and data.</p><button type="submit" disabled={busy || !data.endpoint.enabled} className="btn-primary disabled:opacity-50"><Send size={15} />{busy ? "Queueing…" : data.endpoint.enabled ? "Queue event" : "Enable endpoint to send"}</button></form>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold text-ink">Recent deliveries</h3><p className="mt-1 text-sm text-muted">Latest events for this endpoint</p></div><Clock3 size={17} className="text-muted" /></div>
        {data.recentDeliveries.length ? <div className="divide-y divide-line">{data.recentDeliveries.map((delivery) => <Link key={delivery.id} to={`/deliveries/${delivery.id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{delivery.eventType}</p><p className="mt-1 truncate font-mono text-[11px] text-muted">{delivery.eventId}</p><p className="mt-1 text-xs text-muted">{new Date(delivery.createdAt).toLocaleString()}</p></div><div className="shrink-0 text-right"><StatusBadge status={delivery.status} /><p className="mt-1 text-xs text-muted">{delivery.attempts.length} attempt{delivery.attempts.length === 1 ? "" : "s"}{delivery.lastStatusCode ? ` · ${delivery.lastStatusCode}` : ""}</p></div></Link>)}</div> : <EmptyState title="No events yet" description="Send an event with the form to see delivery history here." />}
      </section>
    </div>
  </div>;
}
