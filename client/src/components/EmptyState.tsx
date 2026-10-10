import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white px-6 text-center">
    <span className="mb-4 rounded-xl bg-slate-100 p-3 text-slate-500"><Inbox size={22} /></span>
    <h3 className="font-semibold text-ink">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-muted">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>;
}
