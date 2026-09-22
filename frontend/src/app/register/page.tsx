"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import en from "@/messages/en.json";
import bn from "@/messages/bn.json";
import { registerUser, type RegisterPayload } from "@/services/auth.service";
import { useLanguage } from "@/context/LanguageContext";

export default function RegisterPage(){
 const router=useRouter(); const {language}=useLanguage(); const t=language==="en"?en.auth:bn.auth;
 const [form,setForm]=useState<RegisterPayload>({name:"",email:"",password:"",phoneNumber:""}); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
 const set=(key:keyof RegisterPayload,value:string)=>setForm(x=>({...x,[key]:value}));
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setError("");try{await registerUser(form);router.push("/login")}catch(e){setError(e instanceof Error?e.message:t.registrationFailed)}finally{setLoading(false)}}
 return <div className="bg-[#f7f0e8] px-4 py-16"><div className="mx-auto max-w-xl rounded-xl border border-[#e3c8a7] bg-white p-7 shadow-lg"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#a15e2b]">{t.registerBadge}</p><h1 className="mt-2 text-3xl font-semibold">{t.registerTitle}</h1><p className="mt-2 text-sm leading-6 text-[#6d5442]">{t.registerDescription}</p><form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">{t.fullName}<input required value={form.name} onChange={e=>set("name",e.target.value)} className="rounded-lg border border-[#d9be9b] px-4 py-3"/></label><label className="grid gap-2 text-sm">{t.email}<input required type="email" value={form.email} onChange={e=>set("email",e.target.value)} className="rounded-lg border border-[#d9be9b] px-4 py-3"/></label><label className="grid gap-2 text-sm">{t.password}<input required type="password" value={form.password} onChange={e=>set("password",e.target.value)} className="rounded-lg border border-[#d9be9b] px-4 py-3"/></label><label className="grid gap-2 text-sm">{t.phoneNumber}<input required type="tel" value={form.phoneNumber} onChange={e=>set("phoneNumber",e.target.value)} className="rounded-lg border border-[#d9be9b] px-4 py-3"/></label>{error&&<p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="sm:col-span-2 rounded-lg bg-[#9b5528] px-4 py-3 font-semibold text-white disabled:opacity-60">{loading?t.creating:t.createAccount}</button></form><p className="mt-5 text-center text-sm">{t.alreadyRegistered} <Link href="/login" className="font-semibold text-[#9b5528]">{t.login}</Link></p></div></div>;
}
