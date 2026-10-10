import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Command, LockKeyhole, Radio, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") await register(name, email, password);
      else await login(email, password);
      navigate("/", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1fr]">
    <section className="relative hidden overflow-hidden bg-[#17212f] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
      <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full border border-slate-500/20" /><div className="absolute -right-8 top-[29%] h-48 w-48 rounded-full border border-slate-500/20" />
      <Link to="/login" className="relative flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><Command size={20} /></span><span className="text-lg font-semibold">HookFlow <span className="text-slate-400">Lite</span></span></Link>
      <div className="relative max-w-xl py-12"><p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Webhooks, in the open</p><h1 className="text-4xl font-semibold leading-[1.15] tracking-tight xl:text-5xl">Know what happened to every event.</h1><p className="mt-6 max-w-lg text-base leading-7 text-slate-300">Send signed events, see every response, and retry with confidence. A clear view from your app to every endpoint.</p>
        <div className="mt-10 space-y-4">{["Signed with HMAC-SHA256", "Delivery history that tells the whole story", "Automatic retries when the network wobbles"].map((item) => <p key={item} className="flex items-center gap-3 text-sm text-slate-200"><span className="rounded-full bg-slate-700 p-1 text-emerald-300"><Check size={13} /></span>{item}</p>)}</div>
      </div>
      <p className="relative text-xs text-slate-500">HookFlow Lite · Developer webhook delivery</p>
    </section>
    <section className="flex items-center justify-center px-6 py-12 sm:px-12">
      <div className="w-full max-w-[390px]">
        <div className="mb-9 flex items-center gap-3 lg:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white"><Command size={18} /></span><span className="font-semibold">HookFlow Lite</span></div>
        <div className="mb-8"><p className="mb-2 text-sm font-medium text-accent">{mode === "register" ? "Get started" : "Welcome back"}</p><h2 className="text-3xl font-semibold tracking-tight text-ink">{mode === "register" ? "Create your account" : "Sign in to HookFlow"}</h2><p className="mt-2 text-sm text-muted">{mode === "register" ? "A clearer picture of every webhook." : "Pick up where you left off."}</p></div>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          {mode === "register" ? <label className="block text-sm font-medium text-slate-700">Name<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="field mt-2" placeholder="Alex Morgan" /></label> : null}
          <label className="block text-sm font-medium text-slate-700">Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="field mt-2" placeholder="you@company.com" /></label>
          <label className="block text-sm font-medium text-slate-700">Password<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={mode === "register" ? 10 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="field mt-2" placeholder={mode === "register" ? "At least 10 characters" : "Your password"} /></label>
          {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div> : null}
          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3">{submitting ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}<ArrowRight size={16} /></button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">{mode === "register" ? "Already have an account?" : "New to HookFlow?"} <Link className="font-semibold text-accent hover:text-indigo-700" to={mode === "register" ? "/login" : "/register"}>{mode === "register" ? "Sign in" : "Create an account"}</Link></p>
        <div className="mt-10 grid grid-cols-3 gap-2 border-t border-line pt-5 text-center text-[11px] text-muted"><span className="flex items-center justify-center gap-1"><Radio size={12} /> Endpoints</span><span className="flex items-center justify-center gap-1"><Zap size={12} /> Retries</span><span className="flex items-center justify-center gap-1"><LockKeyhole size={12} /> HMAC signed</span></div>
      </div>
    </section>
  </div>;
}
