"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AgentAPI } from "@/lib/api";
import { useToastStore } from "@/store/ui";
import FiltersBar from "@/components/FiltersBar";
import { TableSkeleton } from "@/components/Loader";

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUSES = [
  { value: "New", label: "New", class: "status-new" },
  { value: "Assigned", label: "Assigned", class: "status-open" },
  { value: "In_Progress", label: "In Progress", class: "status-open" },
  { value: "On_Hold", label: "On Hold", class: "status-open" },
  { value: "Resolved", label: "Resolved", class: "status-resolved" },
  { value: "Closed", label: "Closed", class: "status-closed" },
  { value: "Reopened", label: "Reopened", class: "status-open" },
];

// Mobile Ticket Card Component
function MobileTicketCard({ ticket }) {
  const statusClass = STATUSES.find(s => s.value === ticket.status)?.class || "status-new";
  
  return (
    <Link href={`/agent/tickets/${ticket.id}`} className="card hover:shadow-md transition-shadow block">
      <div className="card-body space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
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
          <div>
            <div className="text-xs text-muted-foreground">Priority</div>
            <div>{ticket.priority?.name || ticket.priority_id || 'N/A'}</div>
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
function MobileFilterSheet({ isOpen, onClose, filters, onFilterChange, priorities }) {
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

export default function MyTickets() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [pagination, setPagination] = useState();
  const [priorities, setPriorities] = useState([]);
  const showToast = useToastStore((s) => s.show);
  const STORAGE_KEY = "agent_tickets_state";
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileView, setMobileView] = useState('cards');

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

  // Load priorities
  useEffect(() => {
    AgentAPI.getPriorities()
      .then((response) => {
        const data = response?.data;
        const prioritiesList = data?.priorities || data?.data?.priorities || data || [];
        setPriorities(Array.isArray(prioritiesList) ? prioritiesList : []);
      })
      .catch(() => {
        setPriorities([]);
      });
  }, []);

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit,
    };
    
    if (search && search.trim()) {
      params.search = search.trim();
    }
    
    if (status && status.trim()) {
      params.status = status.trim();
    }
    
    if (priorityId && priorityId.trim()) {
      const priorityNum = parseInt(priorityId, 10);
      if (!isNaN(priorityNum) && priorityNum > 0) {
        params.priority_id = priorityNum;
      }
    }
    
    return params;
  }, [page, limit, search, status, priorityId]);

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
  }, [queryParams]);

  const exportCsv = () => {
    const headers = ["id","ticket_code","subject","priority","status","created_at"];
    const rows = items.map((t) => [
      t.id,
      t.ticket_code || t.code || "",
      JSON.stringify(t.subject || ""),
      (t.priority && t.priority.name) || t.priority_id || "",
      t.status || "",
      t.created_at || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my_tickets_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Tickets</h1>
        {/* <button className="btn btn-primary desktop-only" onClick={exportCsv}>
          Export CSV
        </button> */}
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
        <button className="btn btn-primary" onClick={exportCsv}>
          Export
        </button>
      </div>

      {/* Filters Bar - Desktop */}
      <div className="desktop-only">
        <FiltersBar
          right={
            <button className="btn" onClick={exportCsv}>
              Export CSV
            </button>
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
        filters={{ search, status, priorityId, limit }}
        onFilterChange={(key, value) => {
          setPage(1);
          if (key === 'search') setSearch(value);
          if (key === 'status') setStatus(value);
          if (key === 'priorityId') setPriorityId(value);
          if (key === 'limit') setLimit(value);
        }}
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
            </div>
          )}
          
          {!loading && items.map((ticket) => (
            <MobileTicketCard
              key={ticket.id}
              ticket={ticket}
            />
          ))}
        </div>
      )}

      {/* Table View (hidden on mobile when in card view) */}
      <div className={`${mobileView === 'table' ? 'mobile-only' : 'mobile-only hidden'} desktop-only`}>
        <div className="card overflow-x-auto">
          <div className="table-head grid-cols-4 text-sm">
            <div>Subject</div>
            <div className="hidden sm:block">Priority</div>
            <div>Status</div>
            <div className="hidden sm:block">Updated</div>
          </div>
          
          {loading && <TableSkeleton rows={5} cols={4} />}
          
          {!loading && items.length === 0 && (
            <div className="card-body text-center py-12">
              <div className="text-muted-foreground">No tickets found</div>
            </div>
          )}
          
          {!loading && items.map((t) => {
            const statusClass = STATUSES.find(s => s.value === t.status)?.class || "status-new";
            
            return (
              <Link 
                key={t.id} 
                href={`/agent/tickets/${t.id}`} 
                className="table-row grid-cols-4 text-sm"
              >
                <div className="truncate font-medium">{t.subject}</div>
                <div className="hidden sm:block">
                  {t.priority?.name || t.priority_id}
                </div>
                <div>
                  <span className={`status-badge ${statusClass}`}>
                    {t.status}
                  </span>
                </div>
                <div className="hidden sm:block text-xs text-muted-foreground">
                  {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : ""}
                  {t.updated_at && (
                    <div className="text-xs mt-1">{formatSince(t.updated_at)} ago</div>
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