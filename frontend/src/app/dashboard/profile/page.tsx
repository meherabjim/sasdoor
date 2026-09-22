"use client";

import { FormEvent, useEffect, useState } from "react";
import en from "@/messages/en.json";
import bn from "@/messages/bn.json";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/lib/api";

export default function ProfilePage() {
  const { user, updateLocalUser } = useAuth();
  const { language } = useLanguage();
  const t = language === "en" ? en.account : bn.account;
  const L = (e: string, b: string) => (language === "en" ? e : b);
  const [form, setForm] = useState({ name: "", address: "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setForm({ name: String(user?.name ?? ""), address: String(user?.address ?? "") }); }, [user]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg(null);
    try { await apiRequest("/api/auth/me", { method: "PATCH", body: JSON.stringify(form) }); updateLocalUser(form); setMsg({ ok: true, text: L("Saved", "সেভ হয়েছে") }); }
    catch (x) { setMsg({ ok: false, text: x instanceof Error ? x.message : "Error" }); }
  }
  async function changePw(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPwMsg(null);
    try { await apiRequest("/api/auth/change-password", { method: "POST", body: JSON.stringify(pw) }); setPw({ currentPassword: "", newPassword: "" }); setPwMsg({ ok: true, text: L("Password changed", "পাসওয়ার্ড বদলানো হয়েছে") }); }
    catch (x) { setPwMsg({ ok: false, text: x instanceof Error ? x.message : "Error" }); }
  }
  const inp = "rounded-lg border border-[#d9be9b] px-4 py-3 outline-none focus:border-[#9b5528]";
  const note = (m: { ok: boolean; text: string } | null) => m && <p className={`rounded-lg p-3 text-sm ${m.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{m.text}</p>;
  return <>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a15e2b]">{t.accountSettings}</p>
    <h1 className="mt-2 text-3xl font-semibold">{t.profile}</h1>
    <div className="mt-7 grid gap-8 lg:grid-cols-2">
      <form onSubmit={submit} className="grid h-fit gap-4">
        <label className="grid gap-2 text-sm">{t.fullName}<input id="up-name" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></label>
        <label className="grid gap-2 text-sm">{t.phoneNumber}<input id="up-phone" value={String(user?.phone ?? "")} disabled className={`${inp} bg-[#faf3ea]`} /></label>
        <label className="grid gap-2 text-sm">{L("Address", "ঠিকানা")}<input id="up-addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inp} /></label>
        {note(msg)}
        <button className="rounded-lg bg-[#9b5528] px-5 py-3 font-semibold text-white hover:bg-[#7e4320]">{t.saveChanges}</button>
      </form>
      <form onSubmit={changePw} className="grid h-fit gap-4">
        <h2 className="text-lg font-semibold">{L("Change password", "পাসওয়ার্ড বদলান")}</h2>
        <label className="grid gap-2 text-sm">{L("Current password", "বর্তমান পাসওয়ার্ড")}<input id="up-cur" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} className={inp} /></label>
        <label className="grid gap-2 text-sm">{L("New password", "নতুন পাসওয়ার্ড")}<input id="up-new" type="password" required minLength={6} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} className={inp} /></label>
        {note(pwMsg)}
        <button className="rounded-lg border border-[#9b5528] px-5 py-3 font-semibold text-[#9b5528] hover:bg-[#faf3ea]">{L("Change password", "পাসওয়ার্ড বদলান")}</button>
      </form>
    </div>
  </>;
}
