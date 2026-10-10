export function LoadingState({ label = "Loading your workspace…" }: { label?: string }) {
  return <div className="flex min-h-48 items-center justify-center text-sm text-muted" role="status"><span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-accent" />{label}</div>;
}
