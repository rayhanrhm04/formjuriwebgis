"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-request";
import type { Judge } from "@/types";
import { AdminHeading } from "./admin-shell";
import { EmptyState, SkeletonCards, Toast } from "@/components/ui";

export function JudgeManager() {
  const [rows, setRows] = useState<Judge[] | null>(null);
  const [editing, setEditing] = useState<Judge | "new" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function load() {
    const { judges } = await adminRequest<{ judges: Judge[] }>("/api/admin/judges");
    setRows(judges);
  }

  useEffect(() => {
    void adminRequest<{ judges: Judge[] }>("/api/admin/judges")
      .then(({ judges }) => setRows(judges))
      .catch(value => {
        setRows([]);
        setToast({ tone: "error", text: value instanceof Error ? value.message : "Unable to load judges." });
      });
  }, []);

  function open(row?: Judge) {
    setEditing(row ?? "new");
    setName(row?.name ?? "");
    setEmail(row?.email ?? "");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const payload = { name, email: email || null };
    try {
      await adminRequest("/api/admin/judges", {
        method: editing === "new" ? "POST" : "PATCH",
        body: JSON.stringify({ ...payload, ...(editing === "new" ? {} : { id: editing.id }) }),
      });
      setEditing(null);
      setToast({ tone: "success", text: "Judge saved successfully." });
      await load();
    } catch (value) {
      setToast({ tone: "error", text: value instanceof Error ? value.message : "Unable to save the judge." });
    }
  }

  async function remove(row: Judge) {
    if (!window.confirm(`Delete ${row.name}?`)) return;
    try {
      await adminRequest("/api/admin/judges", { method: "DELETE", body: JSON.stringify({ id: row.id }) });
      setToast({ tone: "success", text: "Judge deleted." });
      await load();
    } catch (value) {
      setToast({ tone: "error", text: value instanceof Error ? value.message : "Unable to delete the judge." });
    }
  }

  return <>
    <AdminHeading title="Judges" description="Manage competition judge profiles." action={<button className="button gradient-button" onClick={() => open()}><Plus size={17} /> Add judge</button>} />
    {rows === null ? <SkeletonCards /> : rows.length ?
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 12 }}>
        {rows.map((row, index) => <article className="card" key={row.id} style={{ padding: 19 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: "#252b4b", color: "#aeb7ff", fontWeight: 850 }}>{index + 1}</div>
          <h2 style={{ fontSize: 17, margin: "15px 0 5px" }}>{row.name}</h2>
          <p className="muted" style={{ fontSize: 12, margin: "0 0 17px" }}>{row.email || "Email not provided"}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="button button-secondary" onClick={() => open(row)}><Pencil size={15} /> Edit</button>
            <button className="button button-secondary" aria-label={`Delete ${row.name}`} onClick={() => remove(row)} style={{ color: "#ff746c", paddingInline: 13 }}><Trash2 size={15} /></button>
          </div>
        </article>)}
      </div> : <EmptyState title="No judges" description="Add a judge to start the competition." />}
    {editing && <div style={{ position: "fixed", zIndex: 60, inset: 0, background: "rgba(2,4,10,.72)", display: "grid", placeItems: "center", padding: 16 }}>
      <form onSubmit={save} className="card" style={{ width: "min(100%,440px)", padding: 24 }}>
        <button type="button" aria-label="Close" onClick={() => setEditing(null)} style={{ float: "right", width: 44, height: 44, border: 0, borderRadius: 12 }}><X size={18} /></button>
        <h2 style={{ margin: "8px 0 24px" }}>{editing === "new" ? "Add judge" : "Edit judge"}</h2>
        <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 750, marginBottom: 13 }}>Name<input className="input" required value={name} onChange={event => setName(event.target.value)} /></label>
        <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 750, marginBottom: 18 }}>Email (optional)<input className="input" type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <button className="button gradient-button" style={{ width: "100%" }}>Save judge</button>
      </form>
    </div>}
    {toast && <Toast tone={toast.tone}>{toast.text}</Toast>}
  </>;
}
