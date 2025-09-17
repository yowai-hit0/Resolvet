"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TicketsAPI, UsersAPI, AdminAPI, api, PrioritiesAPI } from "@/lib/api";
import { useToastStore } from "@/store/ui";
import FiltersBar from "@/components/FiltersBar";
import { TableSkeleton } from "@/components/Loader";

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUSES = ["new", "open", "resolved", "closed"];

export default function AdminTickets() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [agents, setAgents] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pagination, setPagination] = useState();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", requester_email: "", requester_name: "", priority_id: "", assignee_id: "", tag_ids: [] });
  const [files, setFiles] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [tempUrls, setTempUrls] = useState([]);
  const showToast = useToastStore((s) => s.show);
  const STORAGE_KEY = "admin_tickets_state";
  const SAVED_VIEWS_KEY = "admin_tickets_saved_views";
  const [savedViews, setSavedViews] = useState([]);
  const [newViewName, setNewViewName] = useState("");

  // load persisted state
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
        setAssigneeId(s.assigneeId || "");
      }
    } catch {}
  }, []);

  const queryParams = useMemo(() => ({
    page,
    limit,
    search: search || undefined,
    status: status || undefined,
    priority_id: priorityId || undefined,
    assignee_id: assigneeId || undefined,
    sort_by: "created_at",
    sort_order: "desc",
  }), [page, limit, search, status, priorityId, assigneeId]);

  useEffect(() => {
    // persist state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ page, limit, search, status, priorityId, assigneeId }));
    } catch {}

    let ignore = false;
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      TicketsAPI.list(queryParams)
        .then((d) => {
          const rows = d?.data?.tickets || d?.tickets || [];
          const p = d?.pagination || d?.data?.pagination;
          if (!ignore) {
            setItems(rows);
            setPagination(p);
            setSelectedIds(new Set());
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300); // debounced
    return () => {
      ignore = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [queryParams, page, limit, search, status, priorityId, assigneeId]);

  useEffect(() => {
    // load agents for dropdown
    UsersAPI.list({ role: "agent", page: 1, limit: 50 })
      .then((d) => {
        const users = d?.data?.users || d?.users || [];
        setAgents(users);
      })
      .catch(() => {});
    // load priorities
    PrioritiesAPI.list()
      .then((r) => {
        const payload = r;
        const candidates = [payload?.data?.priorities, payload?.data, payload?.priorities, payload];
        const list = candidates.find((v) => Array.isArray(v)) || [];
        setPriorities(list);
      })
      .catch(() => setPriorities([]));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_VIEWS_KEY);
      if (raw) setSavedViews(JSON.parse(raw));
    } catch {}
  }, []);

  const persistViews = (views) => {
    setSavedViews(views);
    try { localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views)); } catch {}
  };

  const onTempUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setFileUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const r = await api.post('/tickets/attachments/temp/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const urls = r?.data?.data?.urls || r?.data?.urls || [];
      setTempUrls((prev) => Array.from(new Set([...(prev || []), ...urls])));
      showToast('Uploaded', 'success');
    } catch (err) {
      showToast('Upload failed', 'error');
    } finally {
      setFileUploading(false);
    }
  };

  const saveCurrentAsView = () => {
    if (!newViewName.trim()) return;
    const view = { name: newViewName.trim(), params: { status, priorityId, assigneeId, search, limit } };
    const next = [...savedViews.filter(v => v.name !== view.name), view];
    persistViews(next);
    setNewViewName("");
    showToast("View saved", "success");
  };

  const applyView = (v) => {
    setStatus(v.params.status || "");
    setPriorityId(v.params.priorityId || "");
    setAssigneeId(v.params.assigneeId || "");
    setSearch(v.params.search || "");
    setLimit(v.params.limit || 10);
    setPage(1);
  };

  const deleteView = (name) => {
    persistViews(savedViews.filter(v => v.name !== name));
  };

  const exportCsv = () => {
    const headers = ["id","ticket_code","subject","requester_email","assignee_email","priority","status","created_at"];
    const rows = items.map((t) => [
      t.id,
      t.ticket_code || t.code || "",
      JSON.stringify(t.subject || ""),
      t.requester_email || "",
      (t.assignee && t.assignee.email) || "",
      (t.priority && t.priority.name) || t.priority_id || "",
      t.status || "",
      t.created_at || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelected = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const bulkAssign = async () => {
    const ticket_ids = Array.from(selectedIds);
    if (ticket_ids.length === 0 || !assigneeId) return;
    await AdminAPI.bulkAssign({ ticket_ids, assignee_id: Number(assigneeId) });
    showToast("Assigned successfully", "success");
    // reload
    TicketsAPI.list(queryParams).then((d) => {
      const rows = d?.data?.tickets || d?.tickets || [];
      setItems(rows);
      setSelectedIds(new Set());
    });
  };

  const bulkStatus = async (newStatus) => {
    const ticket_ids = Array.from(selectedIds);
    if (ticket_ids.length === 0) return;
    await AdminAPI.bulkStatus({ ticket_ids, status: newStatus });
    showToast(`Status -> ${newStatus}`, "success");
    TicketsAPI.list(queryParams).then((d) => {
      const rows = d?.data?.tickets || d?.tickets || [];
      setItems(rows);
      setSelectedIds(new Set());
    });
  };

  const createTicket = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        subject: form.subject,
        description: form.description,
        requester_email: form.requester_email,
        requester_name: form.requester_name,
        priority_id: Number(form.priority_id),
        assignee_id: form.assignee_id ? Number(form.assignee_id) : undefined,
        tag_ids: form.tag_ids,
      };
      const created = await api.post("/tickets", { ...payload, image_urls: tempUrls });
      const ticketId = created?.data?.data?.ticket?.id || created?.data?.ticket?.id;
      showToast("Ticket created", "success");
      setShowCreate(false);
      setForm({ subject: "", description: "", requester_email: "", requester_name: "", priority_id: "", assignee_id: "", tag_ids: [] });
      setFiles([]);
      setTempUrls([]);
      TicketsAPI.list(queryParams).then((d) => {
        const rows = d?.data?.tickets || d?.tickets || [];
        setItems(rows);
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <FiltersBar
        right={<>
          <div className="hidden md:flex items-center gap-2">
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Ticket</button>
            <select className="select max-w-56" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Assign to...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
            <button className="btn" onClick={bulkAssign} disabled={selectedIds.size === 0 || !assigneeId}>Bulk assign</button>
            <div className="flex items-center gap-1">
              <button className="btn" onClick={() => bulkStatus("open")} disabled={selectedIds.size === 0}>Open</button>
              <button className="btn" onClick={() => bulkStatus("resolved")} disabled={selectedIds.size === 0}>Resolve</button>
              <button className="btn" onClick={() => bulkStatus("closed")} disabled={selectedIds.size === 0}>Close</button>
            </div>
            <button className="btn" onClick={exportCsv}>Export CSV</button>
          </div>
          <div className="md:hidden relative">
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create</button>
            <MobileActions
              agents={agents}
              assigneeId={assigneeId}
              setAssigneeId={setAssigneeId}
              bulkAssign={bulkAssign}
              bulkStatus={bulkStatus}
              canBulk={selectedIds.size > 0}
              exportCsv={exportCsv}
            />
          </div>
        </>}
      >
        <div className="flex items-center gap-2 w-full flex-wrap">
        <input
          className="input max-w-xs focus-visible:outline-2 focus-visible:outline-black"
          placeholder="Search code, subject, requester... (Cmd/Ctrl+K)"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        />
        <select className="select max-w-40" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          className="input max-w-40"
          placeholder="Priority ID"
          value={priorityId}
          onChange={(e) => { setPage(1); setPriorityId(e.target.value); }}
        />
        <select className="select max-w-56" value={assigneeId} onChange={(e) => { setPage(1); setAssigneeId(e.target.value); }}>
          <option value="">Any assignee</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.email}</option>
          ))}
        </select>
        <select className="select max-w-32" value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <select className="select max-w-56" onChange={(e) => { const v = savedViews.find(sv => sv.name === e.target.value); if (v) applyView(v); }}>
            <option value="">Saved views</option>
            {savedViews.map((v) => (
              <option key={v.name} value={v.name}>{v.name}</option>
            ))}
          </select>
          <input className="input max-w-40" placeholder="Save as…" value={newViewName} onChange={(e) => setNewViewName(e.target.value)} />
          <button className="btn" onClick={saveCurrentAsView}>Save</button>
          {savedViews.length > 0 && (
            <button className="btn" onClick={() => deleteView(savedViews[savedViews.length-1].name)}>Delete Last</button>
          )}
        </div>
        </div>
      </FiltersBar>

      <div className="card overflow-x-auto">
        <div className="table-head grid-cols-8 text-xs md:text-sm">
          <div>
            <input type="checkbox" onChange={(e) => {
              if (e.target.checked) setSelectedIds(new Set(items.map((t) => t.id)));
              else setSelectedIds(new Set());
            }} />
          </div>
          <div className="hidden sm:block">Code</div>
          <div>Subject</div>
          <div className="hidden md:block">Requester</div>
          <div className="hidden lg:block">Assignee</div>
          <div className="hidden sm:block">Priority</div>
          <div>Status</div>
          <div className="hidden sm:block">Created</div>
        </div>
        {loading && <TableSkeleton rows={5} cols={8} />}
        {!loading && items.length === 0 && (
          <div className="card-body text-sm">No tickets</div>
        )}
        {!loading && items.map((t) => (
          <Link key={t.id} href={`/admin/tickets/${t.id}`} className="table-row grid-cols-8 text-xs md:text-sm">
            <div>
              <input
                type="checkbox"
                checked={selectedIds.has(t.id)}
                onChange={(e) => toggleSelected(t.id, e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="hidden sm:block">{t.ticket_code || t.code || t.id}</div>
            <div className="truncate">{t.subject}</div>
            <div className="truncate hidden md:block">{t.requester_email || "-"}</div>
            <div className="truncate hidden lg:block">{t.assignee?.email || "Unassigned"}</div>
            <div className="hidden sm:block">{t.priority?.name || t.priority_id}</div>
            <div className="capitalize">{t.status}</div>
            <div className="hidden sm:block">
              {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
              {t.created_at && (
                <span className="ml-2 chip">{formatSince(t.created_at)}</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div>
          {pagination ? (
            <span>
              Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} results
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" disabled={!pagination?.hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <button className="btn" disabled={!pagination?.hasNext} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <form onSubmit={createTicket} className="card w-full max-w-2xl">
            <div className="card-body space-y-3">
              <div className="text-lg font-semibold">New Ticket</div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Subject</label>
                  <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm">Requester Email</label>
                  <input type="email" className="input" value={form.requester_email} onChange={(e) => setForm({ ...form, requester_email: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm">Requester Name</label>
                  <input className="input" value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm">Priority</label>
                  <select className="select" value={form.priority_id} onChange={(e) => setForm({ ...form, priority_id: e.target.value })} required>
                    <option value="">Select priority</option>
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Assignee</label>
                  <select className="select" value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.email}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm">Description</label>
                <textarea className="input min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">Attachments (optional, images)</label>
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" multiple onChange={onTempUpload} disabled={fileUploading} />
                  <button type="button" className="btn" onClick={() => document.querySelector('input[type=file]')?.click()} disabled={fileUploading}>{fileUploading ? 'Uploading…' : 'Choose files'}</button>
                </div>
                <div className="text-xs opacity-70 mt-1">Previews below are saved on create; duplicates are removed.</div>
                {tempUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {tempUrls.map((url) => (
                      <div key={url} className="relative group border rounded overflow-hidden">
                        <img src={url} alt="preview" className="w-full h-24 object-cover" />
                        <button type="button" className="absolute top-1 right-1 hidden group-hover:block btn" onClick={() => setTempUrls((u) => u.filter((x) => x !== url))}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? "Creating..." : "Create"}</button>
              </div>
            </div>
          </form>
        </div>
      )}
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

function MobileActions({ agents, assigneeId, setAssigneeId, bulkAssign, bulkStatus, canBulk, exportCsv }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-block">
      <button className="btn ml-2" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>Actions ▾</button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 card">
          <div className="card-body space-y-2">
            <div>
              <div className="text-xs opacity-70 mb-1">Assign to</div>
              <select className="select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Pick agent…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.email}</option>
                ))}
              </select>
              <button className="btn w-full mt-2" onClick={() => { bulkAssign(); setOpen(false); }} disabled={!canBulk || !assigneeId}>Bulk assign</button>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn flex-1" onClick={() => { bulkStatus('open'); setOpen(false); }} disabled={!canBulk}>Open</button>
              <button className="btn flex-1" onClick={() => { bulkStatus('resolved'); setOpen(false); }} disabled={!canBulk}>Resolve</button>
              <button className="btn flex-1" onClick={() => { bulkStatus('closed'); setOpen(false); }} disabled={!canBulk}>Close</button>
            </div>
            <button className="btn w-full" onClick={() => { exportCsv(); setOpen(false); }}>Export CSV</button>
          </div>
        </div>
      )}
    </div>
  );
}


