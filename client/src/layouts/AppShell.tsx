import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, Boxes, CircleHelp, Command, LogOut, Menu, Radio } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Overview", icon: Boxes, end: true },
  { to: "/endpoints", label: "Endpoints", icon: Radio },
  { to: "/deliveries", label: "Deliveries", icon: Activity },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const pageTitle = links.find((link) => link.to === location.pathname)?.label ?? (location.pathname.includes("deliveries/") ? "Delivery details" : location.pathname.includes("endpoints/") ? "Endpoint details" : "Workspace");
  const nav = <>
    <div className="flex h-[76px] items-center gap-3 px-6">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white"><Command size={19} strokeWidth={2.5} /></span>
      <div><p className="font-semibold tracking-tight text-white">HookFlow</p><p className="text-[11px] text-slate-400">LITE WORKSPACE</p></div>
    </div>
    <div className="px-4 pt-7"><p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
    <nav aria-label="Main navigation" className="space-y-1">{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end ?? false} onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${isActive ? "bg-slate-700/70 font-medium text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Icon size={17} />{label}</NavLink>)}</nav>
    </div>
    <div className="mt-auto p-4"><div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3"><div className="flex items-start gap-2.5"><CircleHelp size={16} className="mt-0.5 shrink-0 text-slate-400" /><div><p className="text-xs font-medium text-slate-200">Need a hand?</p><p className="mt-1 text-[11px] leading-4 text-slate-400">Read the project README for setup and signing details.</p></div></div></div></div>
  </>;

  return <div className="min-h-screen bg-canvas text-ink">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] flex-col bg-[#17212f] md:flex">{nav}</aside>
    {mobileOpen ? <div className="fixed inset-0 z-40 md:hidden"><button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/40" /><aside className="absolute inset-y-0 left-0 flex w-[270px] flex-col bg-[#17212f]">{nav}</aside></div> : null}
    <div className="md:pl-[238px]">
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-line bg-white/95 px-5 backdrop-blur md:px-9">
        <div className="flex items-center gap-3"><button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted hover:bg-slate-100 md:hidden"><Menu size={19} /></button><div><p className="text-xs text-muted">Workspace / <span className="text-slate-700">{pageTitle}</span></p><h1 className="mt-0.5 text-base font-semibold text-ink">{pageTitle}</h1></div></div>
        <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-medium text-ink">{user?.name}</p><p className="text-xs text-muted">{user?.email}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">{user?.name.slice(0, 1).toUpperCase()}</span><button onClick={logout} title="Sign out" className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-ink"><LogOut size={17} /></button></div>
      </header>
      <main className="mx-auto max-w-[1400px] p-5 md:p-9"><Outlet /></main>
    </div>
  </div>;
}
