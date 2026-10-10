import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { DeliverySummary } from "../types/api";

export function DeliveryTable({ deliveries }: { deliveries: DeliverySummary[] }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[680px] text-left text-sm">
      <thead><tr className="border-b border-line text-xs font-medium uppercase tracking-wider text-muted">
        <th className="px-5 py-3">Event</th><th className="px-4 py-3">Endpoint</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">HTTP</th><th className="px-4 py-3">Attempts</th><th className="px-4 py-3">Time</th><th className="px-4 py-3" />
      </tr></thead>
      <tbody className="divide-y divide-line">
        {deliveries.map((delivery) => <tr key={delivery.id} className="group hover:bg-slate-50/70">
          <td className="px-5 py-4"><p className="font-medium text-ink">{delivery.eventType}</p><p className="mt-1 font-mono text-xs text-muted">{delivery.eventId}</p></td>
          <td className="px-4 py-4 text-slate-600">{delivery.endpointName}</td>
          <td className="px-4 py-4"><StatusBadge status={delivery.status} /></td>
          <td className="px-4 py-4 font-mono text-xs text-slate-600">{delivery.lastStatusCode ?? "—"}</td>
          <td className="px-4 py-4 tabular-nums text-slate-600">{delivery.attempts}</td>
          <td className="px-4 py-4 text-slate-500">{new Date(delivery.createdAt).toLocaleString()}</td>
          <td className="px-4 py-4"><Link to={`/deliveries/${delivery.id}`} aria-label={`View ${delivery.eventType}`} className="rounded-lg p-2 text-muted opacity-70 hover:bg-slate-100 hover:text-ink group-hover:opacity-100"><ArrowUpRight size={16} /></Link></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
