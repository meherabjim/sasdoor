"use client";

import { useState } from "react";
import { api } from "@/lib/erp";
import { useAuth } from "@/context/AuthContext";
import { Button, Card, Field, Input, PageHeader, useAction } from "@/components/erp/ui";

export default function ProfilePage() {
  const { user, updateLocalUser } = useAuth();
  const [name, setName] = useState(String(user?.name ?? ""));
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const a = useAction(); const b = useAction();
  return (
    <>
      <PageHeader title="My Profile" sub={String(user?.email ?? "")} />
      <div className="grid max-w-4xl gap-5 md:grid-cols-2">
        <Card title="Name">
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); const r = await a.run(() => api.patch("/api/auth/me", { name })); if (r) updateLocalUser({ name }); }}>
            <Field label="Name"><Input id="pf-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Button busy={a.busy}>Save</Button>
          </form>
        </Card>
        <Card title="Change password">
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (pw.newPassword !== pw.confirm) return alert("New passwords do not match"); if (await b.run(() => api.post("/api/auth/change-password", pw))) setPw({ currentPassword: "", newPassword: "", confirm: "" }); }}>
            <Field label="Current password"><Input id="pf-cur" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
            <Field label="New password"><Input id="pf-new" type="password" required minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <Field label="Confirm new password"><Input id="pf-new2" type="password" required minLength={8} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            <Button busy={b.busy}>Change password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
