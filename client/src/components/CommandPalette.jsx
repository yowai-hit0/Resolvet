"use client";

import { useEffect, useMemo, useState } from "react";
import { TicketsAPI } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      TicketsAPI.list({ search: q, page: 1, limit: 8 })
        .then((d) => setItems(d?.data?.tickets || d?.tickets || []))
        .catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [open, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
      <div className="card w-full max-w-xl mx-auto mt-24" onClick={(e) => e.stopPropagation()}>
        <div className="card-body space-y-2">
          <input className="input" placeholder="Search tickets by code or subject" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="border rounded max-h-80 overflow-auto">
            {items.map((t) => (
              <button key={t.id} className="w-full text-left px-3 py-2 border-t first:border-t-0 hover:bg-black/5" onClick={() => { setOpen(false); router.push(`/admin/tickets/${t.id}`); }}>
                <div className="text-sm font-medium">{t.subject}</div>
                <div className="text-xs opacity-70">{t.ticket_code || t.id}</div>
              </button>
            ))}
            {items.length === 0 && <div className="px-3 py-2 text-sm opacity-70">No results</div>}
          </div>
        </div>
      </div>
    </div>
  );
}


