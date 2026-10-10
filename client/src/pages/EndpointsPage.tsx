import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Copy, ExternalLink, Pencil, Plus, Radio, Send, Trash2, X } from "lucide-react";
import { api, jsonBody } from "../services/api";
import { useToast } from "../context/ToastContext";
import type { Endpoint } from "../types/api";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";

interface EndpointResult { endpoint: Endpoint; signingSecret?: string }

export function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Endpoint | null>(null);
  const [secret, setSecret] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await api<{ endpoints: Endpoint[] }>("/endpoints"); setEndpoints(result.endpoints); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load endpoints."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (searchParams.get("create")) { setModalOpen(true); setSearchParams({}, { replace: true }); } }, [searchParams, setSearchParams]);

  async function saveEndpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { name: String(form.get("name")), url: String(form.get("url")) };
    try {
      if (editing) {
        await api<EndpointResult>(`/endpoints/${editing.id}`, { method: "PATCH", body: jsonBody(body) });
        notify("Endpoint updated.");
      } else {
        const result = await api<EndpointResult>("/endpoints", { method: "POST", body: jsonBody(body) });
        setSecret(result.signingSecret ?? "");
        notify("Endpoint created.");
      }
      setModalOpen(false); setEditing(null); await load();
    } catch (caught) { notify(caught instanceof Error ? caught.message : "Could not save endpoint.", "error"); }
  }

  async function toggleEndpoint(endpoint: Endpoint) {
    try {
      await api<EndpointResult>(`/endpoints/${endpoint.id}`, { method: "PATCH", body: jsonBody({ enabled: !endpoint.enabled }) });
      notify(endpoint.enabled ? "Endpoint disabled." : "Endpoint enabled."); await load();
    } catch (caught) { notify(caught instanceof Error ? caught.message : "Could not update endpoint.", "error"); }
  }

  async function removeEndpoint(endpoint: Endpoint) {
    if (!window.confirm(`Delete “${endpoint.name}”? Existing delivery history will remain.`)) return;
    try { await api<{ deleted: boolean }>(`/endpoints/${endpoint.id}`, { method: "DELETE" }); notify("Endpoint deleted."); await load(); }
    catch (caught) { notify(caught instanceof Error ? caught.message : "Could not delete endpoint.", "error"); }
  }

  async function sendTest(endpoint: Endpoint) {
    try { await api<{ deliveryId: string }>(`/endpoints/${endpoint.id}/test`, { method: "POST", body: "{}" }); notify("Test event queued for delivery."); }
    catch (caught) { notify(caught instanceof Error ? caught.message : "Could not queue test event.", "error"); }
  }

  async function copySecret() {
    await navigator.clipboard.writeText(secret);
    notify("Signing secret copied.");
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-muted">Destinations that receive your signed events.</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Endpoints <span className="ml-1 text-base font-normal text-muted">{endpoints.length}</span></h2></div><button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><Plus size={16} /> Create endpoint</button></div>
    {error ? <div role="alert" className="notice-error">{error}<button onClick={() => void load()} className="ml-2 underline">Retry</button></div> : null}
    {loading ? <LoadingState label="Loading endpoints…" /> : error ? null : endpoints.length === 0 ? <EmptyState title="No endpoints yet" description="Add a destination URL to start sending signed webhook events." action={<button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={16} /> Create endpoint</button>} /> : <div className="grid gap-4 xl:grid-cols-2">{endpoints.map((endpoint) => <article key={endpoint.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><Radio size={18} /></span><div className="min-w-0"><div className="flex items-center gap-2"><Link to={`/endpoints/${endpoint.id}`} className="truncate font-semibold text-ink hover:text-accent">{endpoint.name}</Link><span className={`h-2 w-2 rounded-full ${endpoint.enabled ? "bg-emerald-500" : "bg-slate-300"}`} title={endpoint.enabled ? "Enabled" : "Disabled"} /></div><p className="mt-1 truncate font-mono text-xs text-muted">{endpoint.url}</p></div></div><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${endpoint.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{endpoint.enabled ? "Enabled" : "Disabled"}</span></div>
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4"><Link to={`/endpoints/${endpoint.id}`} className="btn-secondary !px-3 !py-2"><ExternalLink size={14} /> Details</Link><button onClick={() => void sendTest(endpoint)} disabled={!endpoint.enabled} className="btn-secondary !px-3 !py-2 disabled:cursor-not-allowed disabled:opacity-50"><Send size={14} /> Send test</button><button onClick={() => { setEditing(endpoint); setModalOpen(true); }} className="icon-button" aria-label={`Edit ${endpoint.name}`}><Pencil size={15} /></button><button onClick={() => void toggleEndpoint(endpoint)} className="icon-button" aria-label={`${endpoint.enabled ? "Disable" : "Enable"} ${endpoint.name}`}>{endpoint.enabled ? <X size={15} /> : <Check size={15} />}</button><button onClick={() => void removeEndpoint(endpoint)} className="icon-button text-rose-600 hover:bg-rose-50" aria-label={`Delete ${endpoint.name}`}><Trash2 size={15} /></button></div>
    </article>)}</div>}

    {modalOpen ? <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><div role="dialog" aria-modal="true" aria-labelledby="endpoint-form-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-start justify-between"><div><h3 id="endpoint-form-title" className="text-lg font-semibold text-ink">{editing ? "Edit endpoint" : "Create endpoint"}</h3><p className="mt-1 text-sm text-muted">Name this destination and enter its public URL.</p></div><button onClick={() => setModalOpen(false)} aria-label="Close" className="icon-button"><X size={17} /></button></div><form onSubmit={(event) => void saveEndpoint(event)} className="space-y-4"><label className="block text-sm font-medium text-slate-700">Endpoint name<input name="name" required minLength={2} maxLength={80} defaultValue={editing?.name} className="field mt-1.5" placeholder="Order service" /></label><label className="block text-sm font-medium text-slate-700">Destination URL<input name="url" type="url" required defaultValue={editing?.url} className="field mt-1.5" placeholder="https://api.example.com/hooks" /><span className="mt-1 block text-xs text-muted">HTTP and HTTPS are supported. Local and private network addresses are blocked.</span></label><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editing ? "Save changes" : "Create endpoint"}</button></div></form></div></div> : null}

    {secret ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div role="dialog" aria-modal="true" aria-labelledby="secret-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="mb-4 flex items-start justify-between"><div><h3 id="secret-title" className="text-lg font-semibold text-ink">Copy your signing secret</h3><p className="mt-1 text-sm text-muted">This secret is shown once. Save it somewhere safe.</p></div><button onClick={() => setSecret("")} aria-label="Close" className="icon-button"><X size={17} /></button></div><div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"><code className="min-w-0 flex-1 break-all font-mono text-sm text-amber-950">{secret}</code><button onClick={() => void copySecret()} className="btn-secondary shrink-0"><Copy size={14} /> Copy</button></div><button onClick={() => setSecret("")} className="btn-primary mt-5 w-full justify-center">I’ve saved it</button></div></div> : null}
  </div>;
}
