// app/(admin)/tickets/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TicketsAPI, UsersAPI, AdminAPI, api, PrioritiesAPI } from "@/lib/api";
import { useToastStore } from "@/store/ui";
import FiltersBar from "@/components/FiltersBar";
import { TableSkeleton } from "@/components/Loader";

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUSES = [
  { value: "new", label: "New", class: "status-new" },
  { value: "open", label: "Open", class: "status-open" },
  { value: "resolved", label: "Resolved", class: "status-resolved" },
  { value: "closed", label: "Closed", class: "status-closed" },
];

// Mobile Ticket Card Component
function MobileTicketCard({ ticket, isSelected, onSelect }) {
  const statusClass = STATUSES.find(s => s.value === ticket.status)?.class || "status-new";
  
  return (
    <Link href={`/admin/tickets/${ticket.id}`} className="card hover:shadow-md transition-shadow block">
      <div className="card-body space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(ticket.id, e.target.checked)}
              className="mt-1"
              onClick={(e) => e.stopPropagation()}
            />
            <div>
              <div className="font-mono text-sm text-primary font-medium">
                {ticket.ticket_code || ticket.code || `#${ticket.id}`}
              </div>
              <div className="text-xs text-muted-foreground">
                {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}
              </div>
            </div>
          </div>
          <span className={`status-badge ${statusClass}`}>
            {ticket.status}
          </span>
        </div>
        
        <div className="font-medium text-foreground line-clamp-2">{ticket.subject}</div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Priority</div>
              <div>{ticket.priority?.name || ticket.priority_id || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Assignee</div>
              <div className="max-w-[80px] truncate">{ticket.assignee?.email?.split('@')[0] || 'Unassigned'}</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Updated</div>
            <div>{ticket.updated_at ? formatSince(ticket.updated_at) : 'N/A'} ago</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Mobile Filter Sheet Component
function MobileFilterSheet({ isOpen, onClose, filters, onFilterChange, agents, priorities }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Filters</h3>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <input
              className="input"
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <select 
              className="select" 
              value={filters.status} 
              onChange={(e) => onFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Priority</label>
            <select 
              className="select" 
              value={filters.priorityId} 
              onChange={(e) => onFilterChange('priorityId', e.target.value)}
            >
              <option value="">All Priorities</option>
              {priorities.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Assignee</label>
            <select 
              className="select" 
              value={filters.assigneeId} 
              onChange={(e) => onFilterChange('assigneeId', e.target.value)}
            >
              <option value="">Any Assignee</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Items per page</label>
            <select 
              className="select" 
              value={filters.limit} 
              onChange={(e) => onFilterChange('limit', Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-primary w-full mt-6"
            onClick={onClose}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileView, setMobileView] = useState('cards');

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
      showToast('Uploaded successfully', 'success');
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
    showToast(`Status updated to ${newStatus}`, "success");
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
      showToast("Ticket created successfully", "success");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Ticket Management</h1>
        <button 
          className="btn btn-primary mobile-only"
          onClick={() => setShowCreate(true)}
        >
          + Create
        </button>
        <button 
          className="btn btn-primary desktop-only"
          onClick={() => setShowCreate(true)}
        >
          + Create Ticket
        </button>
      </div>

      {/* Mobile View Toggle and Filters Button */}
      <div className="mobile-only flex items-center gap-2 mb-4">
        <button 
          className={`btn btn-ghost ${mobileView === 'cards' ? 'bg-accent' : ''}`}
          onClick={() => setMobileView('cards')}
        >
          Cards
        </button>
        <button 
          className={`btn btn-ghost ${mobileView === 'table' ? 'bg-accent' : ''}`}
          onClick={() => setMobileView('table')}
        >
          Table
        </button>
        <button 
          className="btn btn-secondary ml-auto"
          onClick={() => setMobileFiltersOpen(true)}
        >
          Filters
        </button>
      </div>

      {/* Filters Bar - Desktop */}
      <div className="desktop-only">
        <FiltersBar
          right={
            <div className="flex items-center gap-2 flex-wrap">
              <select 
                className="select max-w-40" 
                value={assigneeId} 
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Assign to...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.email}</option>
                ))}
              </select>
              <button 
                className="btn" 
                onClick={bulkAssign} 
                disabled={selectedIds.size === 0 || !assigneeId}
              >
                Bulk Assign
              </button>
              <div className="flex items-center gap-1">
                <button 
                  className="btn" 
                  onClick={() => bulkStatus("open")} 
                  disabled={selectedIds.size === 0}
                >
                  Open
                </button>
                <button 
                  className="btn" 
                  onClick={() => bulkStatus("resolved")} 
                  disabled={selectedIds.size === 0}
                >
                  Resolve
                </button>
                <button 
                  className="btn" 
                  onClick={() => bulkStatus("closed")} 
                  disabled={selectedIds.size === 0}
                >
                  Close
                </button>
              </div>
              <button className="btn" onClick={exportCsv}>
                Export CSV
              </button>
            </div>
          }
        >
          <div className="flex items-center gap-2 w-full flex-wrap">
            <input
              className="input flex-1 min-w-[200px]"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            />
            <select 
              className="select max-w-32" 
              value={status} 
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            >
              <option value="">All Status</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select 
              className="select max-w-40" 
              value={priorityId} 
              onChange={(e) => { setPage(1); setPriorityId(e.target.value); }}
            >
              <option value="">All Priorities</option>
              {priorities.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select 
              className="select max-w-48" 
              value={assigneeId} 
              onChange={(e) => { setPage(1); setAssigneeId(e.target.value); }}
            >
              <option value="">Any Assignee</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
            <select 
              className="select max-w-32" 
              value={limit} 
              onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </div>
        </FiltersBar>
      </div>

      {/* Mobile Filter Bottom Sheet */}
      <MobileFilterSheet
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filters={{ search, status, priorityId, assigneeId, limit }}
        onFilterChange={(key, value) => {
          setPage(1);
          if (key === 'search') setSearch(value);
          if (key === 'status') setStatus(value);
          if (key === 'priorityId') setPriorityId(value);
          if (key === 'assigneeId') setAssigneeId(value);
          if (key === 'limit') setLimit(value);
        }}
        agents={agents}
        priorities={priorities}
      />

      {/* Mobile Card View */}
      {mobileView === 'cards' && (
        <div className="mobile-only space-y-4">
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card">
              <div className="card-body space-y-3">
                <div className="skeleton h-4 w-1/3"></div>
                <div className="skeleton h-6 w-full"></div>
                <div className="skeleton h-4 w-2/3"></div>
              </div>
            </div>
          ))}
          
          {!loading && items.length === 0 && (
            <div className="card-body text-center py-12">
              <div className="text-muted-foreground">No tickets found</div>
              <button 
                className="btn btn-primary mt-4"
                onClick={() => setShowCreate(true)}
              >
                Create Your First Ticket
              </button>
            </div>
          )}
          
          {!loading && items.map((ticket) => (
            <MobileTicketCard
              key={ticket.id}
              ticket={ticket}
              isSelected={selectedIds.has(ticket.id)}
              onSelect={toggleSelected}
            />
          ))}
        </div>
      )}

      {/* Table View (hidden on mobile when in card view) */}
      <div className={`${mobileView === 'table' ? 'mobile-only' : 'mobile-only hidden'} desktop-only`}>
        <div className="card overflow-x-auto">
          <div className="table-head grid-cols-8">
            <div>
              <input 
                type="checkbox" 
                onChange={(e) => {
                  if (e.target.checked) setSelectedIds(new Set(items.map((t) => t.id)));
                  else setSelectedIds(new Set());
                }} 
              />
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
            <div className="card-body text-center py-12">
              <div className="text-muted-foreground">No tickets found</div>
              <button 
                className="btn btn-primary mt-4"
                onClick={() => setShowCreate(true)}
              >
                Create Your First Ticket
              </button>
            </div>
          )}
          
          {!loading && items.map((t) => {
            const statusClass = STATUSES.find(s => s.value === t.status)?.class || "status-new";
            
            return (
              <Link 
                key={t.id} 
                href={`/admin/tickets/${t.id}`} 
                className="table-row grid-cols-8"
              >
                <div>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={(e) => toggleSelected(t.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="hidden sm:block font-mono text-xs">
                  {t.ticket_code || t.code || t.id}
                </div>
                <div className="truncate font-medium">{t.subject}</div>
                <div className="truncate hidden md:block text-sm">
                  {t.requester_email || "-"}
                </div>
                <div className="truncate hidden lg:block text-sm">
                  {t.assignee?.email || "Unassigned"}
                </div>
                <div className="hidden sm:block">
                  {t.priority?.name || t.priority_id}
                </div>
                <div>
                  <span className={`status-badge ${statusClass}`}>
                    {t.status}
                  </span>
                </div>
                <div className="hidden sm:block text-xs text-muted-foreground">
                  {t.created_at ? new Date(t.created_at).toLocaleDateString() : ""}
                  {t.created_at && (
                    <div className="text-xs mt-1">{formatSince(t.created_at)} ago</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.totalCount)} of {pagination.totalCount} results
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="btn btn-secondary" 
              disabled={!pagination?.hasPrev} 
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={`btn btn-ghost min-w-[40px] ${page === pageNum ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {pagination.totalPages > 5 && <span className="px-2">...</span>}
            </div>
            <button 
              className="btn btn-secondary" 
              disabled={!pagination?.hasNext} 
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={createTicket} className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Create New Ticket</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Subject *</label>
                  <input 
                    className="input" 
                    value={form.subject} 
                    onChange={(e) => setForm({ ...form, subject: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Requester Email *</label>
                  <input 
                    type="email" 
                    className="input" 
                    value={form.requester_email} 
                    onChange={(e) => setForm({ ...form, requester_email: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Requester Name *</label>
                  <input 
                    className="input" 
                    value={form.requester_name} 
                    onChange={(e) => setForm({ ...form, requester_name: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority *</label>
                  <select 
                    className="select" 
                    value={form.priority_id} 
                    onChange={(e) => setForm({ ...form, priority_id: e.target.value })} 
                    required
                  >
                    <option value="">Select priority</option>
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Assignee</label>
                  <select 
                    className="select" 
                    value={form.assignee_id} 
                    onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.email}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea 
                  className="textarea" 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  placeholder="Describe the issue in detail..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Attachments</label>
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={onTempUpload} 
                    disabled={fileUploading} 
                    className="hidden" 
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload" 
                    className="btn btn-secondary cursor-pointer"
                  >
                    {fileUploading ? 'Uploading...' : 'Choose Files'}
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {fileUploading ? 'Uploading images...' : 'PNG, JPG, GIF up to 10MB'}
                  </span>
                </div>
                {tempUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {tempUrls.map((url) => (
                      <div key={url} className="relative group border rounded-md overflow-hidden">
                        <img src={url} alt="preview" className="w-full h-20 object-cover" />
                        <button 
                          type="button" 
                          className="absolute top-1 right-1 btn btn-destructive btn-sm rounded-full p-1"
                          onClick={() => setTempUrls((u) => u.filter((x) => x !== url))}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="card-footer flex justify-end gap-3">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Ticket"}
              </button>
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