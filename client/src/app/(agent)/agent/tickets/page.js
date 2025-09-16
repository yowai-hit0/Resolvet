"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AgentAPI } from "@/lib/api";
import { useToastStore } from "@/store/ui";
import FiltersBar from "@/components/FiltersBar";
import { TableSkeleton } from "@/components/Loader";

export default function MyTickets() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [pagination, setPagination] = useState();
  const showToast = useToastStore((s) => s.show);
  const STORAGE_KEY = "agent_tickets_state";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setPage(s.page || 1);
        setLimit(s.limit || 10);
        setSearch(s.search || "");
        setStatus(s.status || "");
        setPriorityId(s.priorityId || "");
      }
    } catch {}
  }, []);

  const queryParams = useMemo(() => ({
    page,
    limit,
    search: search || undefined,
    status: status || undefined,
    priority_id: priorityId || undefined,
  }), [page, limit, search, status, priorityId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ page, limit, search, status, priorityId }));
    } catch {}
    let ignore = false;
    setLoading(true);
    const timer = setTimeout(() => {
      AgentAPI.myTickets(queryParams)
        .then((d) => {
          const rows = d?.data?.tickets || d?.tickets || [];
          const p = d?.pagination || d?.data?.pagination;
          if (!ignore) {
            setItems(rows);
            setPagination(p);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => { ignore = true; clearTimeout(timer); };
  }, [queryParams, page, limit, search, status, priorityId]);

  return (
    <div>
      <h1 className="text-lg font-semibold mb-3">My Tickets</h1>
      <FiltersBar>
        <input className="input max-w-xs" placeholder="Search" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        <select className="select max-w-40" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All status</option>
          {['new','open','resolved','closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="input max-w-40" placeholder="Priority ID" value={priorityId} onChange={(e) => { setPage(1); setPriorityId(e.target.value); }} />
        <select className="select max-w-32" value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}>
          {[10,20,50].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </FiltersBar>

      <div className="card overflow-x-auto">
        <div className="table-head grid-cols-5 text-xs md:text-sm">
          <div className="hidden sm:block">Code</div>
          <div>Subject</div>
          <div className="hidden sm:block">Priority</div>
          <div>Status</div>
          <div className="hidden sm:block">Updated</div>
        </div>
        {loading && <TableSkeleton rows={5} cols={5} />}
        {!loading && items.length === 0 && (
          <div className="card-body text-sm">No tickets</div>
        )}
        {!loading && items.map((t) => (
          <Link key={t.id} href={`/agent/tickets/${t.id}`} className="table-row grid-cols-5 text-xs md:text-sm">
            <div className="hidden sm:block">{t.ticket_code || t.code || t.id}</div>
            <div className="truncate">{t.subject}</div>
            <div className="hidden sm:block">{t.priority?.name || t.priority_id}</div>
            <div className="capitalize">{t.status}</div>
            <div className="hidden sm:block">
              {t.updated_at ? new Date(t.updated_at).toLocaleString() : ""}
              {t.updated_at && (
                <span className="ml-2 chip">{formatSince(t.updated_at)}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <div>
          {pagination ? (
            <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} results</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" disabled={!pagination?.hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <button className="btn" disabled={!pagination?.hasNext} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

function formatSince(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}


