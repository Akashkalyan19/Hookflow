import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, RotateCcw } from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import type { Delivery } from "../types/api";
import { LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";

export function DeliveryDetailPage() {
  const { deliveryId = "" } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const result = await api<{ delivery: Delivery }>(`/deliveries/${deliveryId}`); setDelivery(result.delivery); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load delivery."); }
  }, [deliveryId]);
  useEffect(() => { void load(); }, [load]);

  async function replay() {
    try {
      const result = await api<{ deliveryId: string }>(`/deliveries/${deliveryId}/replay`, { method: "POST" });
      notify("Replay queued. It has a new delivery record.");
      navigate(`/deliveries/${result.deliveryId}`);
    } catch (caught) { notify(caught instanceof Error ? caught.message : "Could not replay delivery.", "error"); }
  }

  async function copyEventId() { if (!delivery) return; await navigator.clipboard.writeText(delivery.eventId); notify("Event ID copied."); }

  if (error) return <div className="space-y-4"><Link to="/deliveries" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> Back to deliveries</Link><div role="alert" className="notice-error">{error}</div></div>;
  if (!delivery) return <LoadingState label="Loading delivery…" />;
  return <div className="space-y-6"><Link to="/deliveries" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} /> All deliveries</Link>
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card md:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold tracking-tight text-ink">{delivery.eventType}</h2><StatusBadge status={delivery.status} /></div><p className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">{delivery.eventId}<button onClick={() => void copyEventId()} aria-label="Copy event ID" className="text-slate-400 hover:text-accent"><Copy size={13} /></button></p><p className="mt-2 text-sm text-muted">{delivery.endpointName} · {new Date(delivery.createdAt).toLocaleString()}</p></div><button onClick={() => void replay()} className="btn-secondary shrink-0"><RotateCcw size={15} /> Replay event</button></div>
      {delivery.replayOf ? <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">Replay of delivery <Link to={`/deliveries/${delivery.replayOf}`} className="font-mono underline">{delivery.replayOf}</Link>. Event ID is preserved; this delivery has a new ID and its own attempts.</p> : null}
      {delivery.lastError ? <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{delivery.lastError}</p> : null}
      {delivery.nextRetryAt ? <p className="mt-3 text-sm text-amber-800">Next retry: {new Date(delivery.nextRetryAt).toLocaleString()}</p> : null}
    </section>
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]"><section className="rounded-2xl border border-line bg-white p-5 shadow-card"><h3 className="font-semibold text-ink">Event payload</h3><p className="mt-1 text-sm text-muted">JSON data submitted with this event</p><pre className="mt-4 max-h-[480px] overflow-auto rounded-xl bg-[#17212f] p-4 font-mono text-xs leading-5 text-slate-100">{JSON.stringify(delivery.payload, null, 2)}</pre></section>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card"><h3 className="font-semibold text-ink">Attempt history</h3><p className="mt-1 text-sm text-muted">Each retry is recorded separately.</p>{delivery.attempts.length ? <div className="mt-4 space-y-3">{delivery.attempts.map((attempt) => <article key={attempt.attemptNumber} className="rounded-xl border border-line p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-ink">Attempt {attempt.attemptNumber}</p><p className="mt-1 text-xs text-muted">{new Date(attempt.attemptedAt).toLocaleString()}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${attempt.succeeded ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{attempt.succeeded ? "Success" : "Failed"}</span></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600"><span>HTTP {attempt.statusCode ?? "—"}</span><span>{attempt.durationMs} ms</span></div>{attempt.error ? <p className="mt-2 text-xs text-rose-700">{attempt.error}</p> : null}{attempt.responsePreview ? <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-[11px] text-slate-600">{attempt.responsePreview}</pre> : null}</article>)}</div> : <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-muted">No attempts recorded yet. The worker will pick this delivery up shortly.</div>}</section></div>
  </div>;
}
