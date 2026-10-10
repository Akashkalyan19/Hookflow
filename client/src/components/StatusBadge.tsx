import type { DeliveryStatus } from "../types/api";

const labels: Record<DeliveryStatus, string> = {
  pending: "Pending", processing: "Sending", retry_scheduled: "Retry scheduled", succeeded: "Succeeded", failed: "Failed",
};

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  const color = status === "succeeded" ? "bg-emerald-50 text-emerald-700" : status === "failed" ? "bg-rose-50 text-rose-700" : status === "processing" ? "bg-blue-50 text-blue-700" : status === "retry_scheduled" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{labels[status]}</span>;
}
