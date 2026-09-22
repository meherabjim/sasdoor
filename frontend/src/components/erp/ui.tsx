"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X, LoaderCircle, Inbox } from "lucide-react";
import { api, errMsg } from "@/lib/erp";

/* ---------- data hook ---------- */
export function useLoad<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState("");
  /**
   * Which request is the current one.
   *
   * Type "01" then "017" quickly and two requests are in the air. If the first is slower it
   * lands last and the table fills with the wrong customers while the box reads 017. Each
   * request takes a number on the way out and only the newest is allowed to write.
   */
  const seq = useRef(0);
  const reload = useCallback(async () => {
    if (!path) return;
    const mine = ++seq.current;
    setLoading(true); setError("");
    try {
      const r = await api.get<T>(path);
      if (mine === seq.current) setData(r);
    } catch (e) {
      if (mine === seq.current) setError(errMsg(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload, setData };
}

/* ---------- toast ---------- */
type Toast = { id: number; text: string; bad?: boolean };
const ToastCtx = createContext<(text: string, bad?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, bad?: boolean) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, bad }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col gap-2 print:hidden">
        {items.map((t) => (
          <div key={t.id} role="status" className={`max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg ${t.bad ? "bg-red-600 text-white" : "bg-[#1f1712] text-white"}`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Run an API action with toast + busy state */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>, okText?: string) => {
    setBusy(true);
    try {
      const r = await fn();
      const msg = okText ?? (r && typeof r === "object" && "message" in (r as object) ? String((r as { message?: string }).message ?? "") : "");
      if (msg) toast(msg);
      return r;
    } catch (e) { toast(errMsg(e), true); return undefined; } finally { setBusy(false); }
  }, [toast]);
  return { busy, run };
}

/* ---------- layout pieces ---------- */
export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f1712]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-[#7a6a5d]">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", title, actions }: { children: React.ReactNode; className?: string; title?: string; actions?: React.ReactNode }) {
  return (
    <section className={`rounded-xl border border-[#e8e0d6] bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-[#efe8df] px-5 py-3.5">
          {title && <h2 className="text-[15px] font-semibold text-[#1f1712]">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft"; busy?: boolean; size?: "sm" | "md" };
export function Button({ variant = "primary", busy, size = "md", className = "", children, disabled, ...p }: BtnProps) {
  const v = {
    primary: "bg-[#1f1712] text-white hover:bg-[#3a2a20]",
    soft: "bg-[#f3ece3] text-[#1f1712] hover:bg-[#eadfd1]",
    ghost: "border border-[#e0d6ca] bg-white text-[#1f1712] hover:bg-[#faf7f3]",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
  }[variant];
  const s = size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2.5 text-sm";
  return (
    <button {...p} disabled={disabled || busy} className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8963e] disabled:opacity-50 ${v} ${s} ${className}`}>
      {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{children}
    </button>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[#9a8b7e]">{hint}</span>}
    </label>
  );
}
const inputCls = "w-full rounded-lg border border-[#e0d6ca] bg-white px-3 py-2.5 text-sm text-[#1f1712] outline-none transition placeholder:text-[#b3a597] focus:border-[#c8963e] focus:ring-2 focus:ring-[#c8963e]/20 disabled:bg-[#f6f2ed]";
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${inputCls} ${p.className ?? ""}`} />;
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${inputCls} ${p.className ?? ""}`} />;
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`${inputCls} ${p.className ?? ""}`} />;

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-sm text-[#1f1712]" aria-pressed={checked}>
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[#c8963e]" : "bg-[#d9cfc3]"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

const TONES = {
  gray: "bg-stone-100 text-stone-700", blue: "bg-sky-50 text-sky-700", amber: "bg-amber-50 text-amber-800",
  violet: "bg-violet-50 text-violet-700", green: "bg-emerald-50 text-emerald-700", red: "bg-red-50 text-red-700",
};
export const Badge = ({ tone = "gray", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) =>
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 print:hidden" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className={`w-full ${wide ? "max-w-4xl" : "max-w-lg"} rounded-xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-[#efe8df] px-5 py-4">
          <h3 className="text-base font-semibold text-[#1f1712]">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[#7a6a5d] hover:bg-[#f3ece3]"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Confirmation for destructive actions.
 *
 * Deleting a payment or cancelling an order used to go through the browser's own
 * confirm() - a grey system box with "localhost:3000 says", no styling and no way to
 * name the button. Built on the same Modal every other dialog here uses.
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete payment?", message: "...", danger: true })) ...
 */
type ConfirmOpts = { title: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean };

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  return ctx;
}

const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ o: ConfirmOpts; resolve: (v: boolean) => void } | null>(null);

  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ o, resolve })), []);
  const done = (v: boolean) => { state?.resolve(v); setState(null); };

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal open={!!state} onClose={() => done(false)} title={state?.o.title ?? ""}>
        <p className="text-sm leading-relaxed text-[#4a3d33]">{state?.o.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => done(false)}>{state?.o.cancelText ?? "Cancel"}</Button>
          <Button variant={state?.o.danger ? "danger" : "primary"} onClick={() => done(true)}>{state?.o.confirmText ?? "Yes"}</Button>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#e8e0d6] bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-[#faf7f3] text-left text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#f1ebe3] [font-variant-numeric:tabular-nums]">{children}</tbody>
      </table>
      {empty && <Empty />}
    </div>
  );
}
export const Td = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => <td className={`px-4 py-3 align-middle text-[#2b211b] ${className}`}>{children}</td>;

export const Empty = ({ text = "Nothing here yet" }: { text?: string }) => (
  <div className="flex flex-col items-center gap-2 py-12 text-sm text-[#9a8b7e]"><Inbox className="h-8 w-8" />{text}</div>
);
export const Loading = () => <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#7a6a5d]"><LoaderCircle className="h-5 w-5 animate-spin" />Loading…</div>;
export const ErrorBox = ({ text, retry }: { text: string; retry?: () => void }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{text} {retry && <button onClick={retry} className="ml-2 font-semibold underline">Try again</button>}</div>
);

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-[#e8e0d6] bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-[#7a6a5d]">{label}</div>
      <div className={`mt-1 text-xl font-semibold [font-variant-numeric:tabular-nums] ${tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-[#1f1712]"}`}>{value}</div>
    </div>
  );
}
