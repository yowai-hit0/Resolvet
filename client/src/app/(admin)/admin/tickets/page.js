// app/(admin)/tickets/page.js
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { TicketsAPI, UsersAPI, AdminAPI, api, PrioritiesAPI } from "@/lib/api";
import { useToastStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
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
function MobileFilterSheet({ isOpen, onClose, filters, onFilterChange, agents, admins, priorities, user }) {
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
              {/* Add current user as first option for filtering */}
              {user && (
                <option key={user.id} value={user.id}>
                  {user.email} ({user.role}) - Me
                </option>
              )}
              {/* Add other users, excluding current user to avoid duplicates */}
              {[...agents, ...admins]
                .filter(a => a.id !== user?.id)
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.email} ({a.role})</option>
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

function ImagePreview({ url, onRemove, showRemove = true }) {
  return (
    <div className="relative group">
      <Image 
        src={url} 
        alt="Preview" 
        width={80}
        height={80}
        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border"
      />
      {showRemove && (
        <button
          type="button"
          aria-label="Remove image"
          className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-black/80 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg ring-1 sm:ring-2 ring-white"
          onClick={() => onRemove(url)}
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function MediaPreview({ url, onRemove, showRemove = true }) {
  const getFileType = (url) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension)) return 'audio';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) return 'video';
    return 'unknown';
  };

  const fileType = getFileType(url);
  
  return (
    <div className="relative group">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded border flex items-center justify-center">
        {fileType === 'audio' ? (
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        ) : fileType === 'video' ? (
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      {showRemove && (
        <button
          type="button"
          aria-label="Remove media"
          className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-black/80 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg ring-1 sm:ring-2 ring-white"
          onClick={() => onRemove(url)}
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
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
  const [admins, setAdmins] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const { user } = useAuthStore();
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pagination, setPagination] = useState();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", requester_email: "", requester_name: "", requester_phone: "+250", location: "", priority_id: "", assignee_id: "", tag_ids: [] });
  const [phoneLocal, setPhoneLocal] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [showLocationList, setShowLocationList] = useState(false);
  const RW_DISTRICTS = [
    'Nyarugenge','Gasabo','Kicukiro','Musanze','Burera','Gakenke','Rubavu','Nyabihu','Rutsiro','Ngororero','Muhanga','Kamonyi','Ruhango','Nyanza','Huye','Gisagara','Nyaruguru','Nyamagabe','Karongi','Rusizi','Nyamasheke','Gicumbi','Rulindo','Bugesera','Ngoma','Kirehe','Kayonza','Rwamagana', 'Gatsibo', 'Nyagatare'
  ];
  const [files, setFiles] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [tempUrls, setTempUrls] = useState([]);
  const [tempMediaUrls, setTempMediaUrls] = useState([]);
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

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit,
      sort_by: "created_at",
      sort_order: "desc",
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
    
    if (assigneeId && assigneeId.trim()) {
      const assigneeNum = parseInt(assigneeId, 10);
      if (!isNaN(assigneeNum) && assigneeNum > 0) {
        params.assignee_id = assigneeNum;
      }
    }
    
    return params;
  }, [page, limit, search, status, priorityId, assigneeId]);

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
    
    // load admins and super_admins for dropdown
    Promise.all([
      UsersAPI.list({ role: "admin", page: 1, limit: 50 }),
      UsersAPI.list({ role: "super_admin", page: 1, limit: 50 })
    ])
      .then(([adminRes, superAdminRes]) => {
        const adminUsers = adminRes?.data?.users || adminRes?.users || [];
        const superAdminUsers = superAdminRes?.data?.users || superAdminRes?.users || [];
        setAdmins([...adminUsers, ...superAdminUsers]);
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
    // load tags for selection
    api.get("/tags")
      .then((r) => {
        const payload = r.data;
        const candidates = [payload?.data?.tags, payload?.data, payload?.tags, payload];
        const list = candidates.find((v) => Array.isArray(v)) || [];
        setAvailableTags(list);
      })
      .catch(() => setAvailableTags([]));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_VIEWS_KEY);
      if (raw) setSavedViews(JSON.parse(raw));
    } catch {}
  }, []);


  const handleCloseCreateModal = () => {
    const resetFormState = () => {
      setForm({ subject: "", description: "", requester_email: "", requester_name: "", requester_phone: "+250", location: "", priority_id: "", assignee_id: "", tag_ids: [] });
      setPhoneLocal("");
      setFiles([]);
      setTempUrls([]);
      setTempMediaUrls([]);
      // reset hidden file input if present
      try { const input = document.getElementById('file-upload'); if (input) input.value = ""; } catch {}
    };
    if (tempUrls.length > 0 || tempMediaUrls.length > 0) {
      // Always cleanup temporary uploads on cancel
      const allTempUrls = [...tempUrls, ...tempMediaUrls];
      cleanupTempFiles(allTempUrls).finally(() => {
        resetFormState();
        setShowCreate(false);
      });
    } else {
      resetFormState();
      setShowCreate(false);
    }
  };

  const persistViews = (views) => {
    setSavedViews(views);
    try { localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views)); } catch {}
  };

const onTempUpload = async (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;
  
  // Validate media files (images, audio, video)
  const mediaFiles = files.filter(file => 
    file.type.startsWith('image/') || 
    file.type.startsWith('audio/') || 
    file.type.startsWith('video/')
  );
  if (mediaFiles.length !== files.length) {
    showToast('Only image, audio, and video files are allowed', 'error');
    return;
  }
  
  // Check file size (5MB for images, 50MB for audio/video)
  const oversizedFiles = mediaFiles.filter(file => {
    const maxSize = file.type.startsWith('image/') ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    return file.size > maxSize;
  });
  if (oversizedFiles.length > 0) {
    showToast('Some files exceed the size limit (5MB for images, 50MB for audio/video)', 'error');
    return;
  }
  
  setFileUploading(true);
  try {
    const fd = new FormData();
    mediaFiles.forEach((f) => fd.append('media', f));
    
    const r = await api.post('/tickets/attachments/temp/media', fd, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    });
    
    const urls = r?.data?.data?.urls || r?.data?.urls || [];
    setTempMediaUrls((prev) => Array.from(new Set([...(prev || []), ...urls])));
    showToast('Media files uploaded successfully', 'success');
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

  const cleanupTempFiles = async (urls) => {
  try {
    // Use POST to avoid DELETE-with-body issues in some environments
    await api.post('/tickets/attachments/temp/delete', { urls });
  } catch (error) {
    console.error('Failed to cleanup temp files:', error);
  }
};

const removeTempImage = (urlToRemove) => {
  setTempUrls(prev => prev.filter(url => url !== urlToRemove));
  
  // Also delete from Cloudinary
  api.post('/tickets/attachments/temp/delete', { urls: [urlToRemove] })
    .catch(err => console.error('Failed to delete temp image:', err));
};

const removeTempMedia = (urlToRemove) => {
  setTempMediaUrls(prev => prev.filter(url => url !== urlToRemove));
  
  // Also delete from Cloudinary
  api.post('/tickets/attachments/temp/delete', { urls: [urlToRemove] })
    .catch(err => console.error('Failed to delete temp media:', err));
};

// Update the createTicket function to handle file cleanup
const createTicket = async (e) => {
  e.preventDefault();

  // Client-side validation mirroring backend Joi (see backend/validators/ticketValidators.js)
  const validate = () => {
    const email = (form.requester_email || '').trim();
    const subject = (form.subject || '').trim();
    const description = (form.description || '').trim();
    const requesterName = (form.requester_name || '').trim();
    const phone = `+250${phoneLocal}`;
    const priorityId = form.priority_id;
    const location = form.location;

    if (!subject || subject.length < 5) return 'Subject must be at least 5 characters long';
    if (!description || description.length < 10) return 'Description must be at least 10 characters long';
    if (requesterName && (requesterName.length < 2 || requesterName.length > 100)) return 'Requester name must be 2-100 characters';
    if (!/^\+?2507\d{8}$/.test(phone)) return 'Phone must be Rwanda format +2507XXXXXXXX';
    if (!priorityId) return 'Priority is required';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return 'Please provide a valid email address';
    if (location && !RW_DISTRICTS.includes(location)) return 'Location must be a valid Rwanda district';
    return null;
  };

  const validationError = validate();
  if (validationError) {
    showToast(validationError, 'error');
    return;
  }

  setCreating(true);
  
  try {
    const payload = {
      subject: form.subject,
      description: form.description,
      requester_email: form.requester_email,
      requester_name: form.requester_name || undefined,
      requester_phone: `+250${phoneLocal}`,
      location: form.location || undefined,
      priority_id: Number(form.priority_id),
      assignee_id: form.assignee_id ? Number(form.assignee_id) : undefined,
      tag_ids: form.tag_ids,
      image_urls: tempUrls, // This will attach the pre-uploaded images
      media_urls: tempMediaUrls // This will attach the pre-uploaded media files
    };
    
    const created = await api.post("/tickets", payload);
    showToast("Ticket created successfully", "success");
    
    // Reset form and clear temp URLs
    setForm({ subject: "", description: "", requester_email: "", requester_name: "", requester_phone: "+250", location: "", priority_id: "", assignee_id: "", tag_ids: [] });
    setTempUrls([]);
    setShowCreate(false);
    
    // Reload tickets list
    TicketsAPI.list(queryParams).then((d) => {
      const rows = d?.data?.tickets || d?.tickets || [];
      setItems(rows);
    });
  } catch (error) {
    showToast("Failed to create ticket", "error");
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
                {[...agents, ...admins].map((a) => (
                  <option key={a.id} value={a.id}>{a.email} ({a.role})</option>
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
                  onClick={() => bulkStatus("In_Progress")} 
                  disabled={selectedIds.size === 0}
                >
                  In Progress
                </button>
                <button 
                  className="btn" 
                  onClick={() => bulkStatus("Resolved")} 
                  disabled={selectedIds.size === 0}
                >
                  Resolve
                </button>
                <button 
                  className="btn" 
                  onClick={() => bulkStatus("Closed")} 
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
            {/* <select 
              className="select max-w-48" 
              value={assigneeId} 
              onChange={(e) => { setPage(1); setAssigneeId(e.target.value); }}
            >
              <option value="">Any Assignee</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select> */}
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
        admins={admins}
        priorities={priorities}
        user={user}
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
          <div className="table-head grid-cols-7">
            <div>
              <input 
                type="checkbox" 
                onChange={(e) => {
                  if (e.target.checked) setSelectedIds(new Set(items.map((t) => t.id)));
                  else setSelectedIds(new Set());
                }} 
              />
            </div>
            <div>Subject</div>
            <div className="hidden md:block">Requester</div>
            <div className="hidden lg:block">Assignee</div>
            <div className="hidden sm:block">Priority</div>
            <div>Status</div>
            <div className="hidden sm:block">Created</div>
          </div>
          
          {loading && <TableSkeleton rows={5} cols={7} />}
          
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
                className="table-row grid-cols-7"
              >
                <div>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={(e) => toggleSelected(t.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="truncate font-medium">{t.subject}</div>
                <div className="truncate hidden md:block text-sm">
                  {t.requester_phone || "-"}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
          <form onSubmit={createTicket} className="card w-full max-w-[95vw] md:max-w-2xl max-h-[95vh] flex flex-col mx-2 sm:mx-0">
            <div className="card-header sticky top-0 bg-white z-10 border-b border-gray-100 p-4 sm:p-6 pb-3">
              <h2 className="text-lg font-semibold">Create New Ticket</h2>
            </div>
            
            <div className="card-body space-y-4 p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Subject *</label>
                  <input 
                    className="input w-full" 
                    value={form.subject} 
                    onChange={(e) => setForm({ ...form, subject: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Requester Email</label>
                  <input 
                    type="email" 
                    className="input w-full" 
                    value={form.requester_email} 
                    onChange={(e) => setForm({ ...form, requester_email: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Requester Name</label>
                  <input 
                    className="input w-full" 
                    value={form.requester_name} 
                    onChange={(e) => setForm({ ...form, requester_name: e.target.value })} 
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Requester Phone (+250) *</label>
                  <div className="phone-field">
                    <span className="phone-prefix" aria-hidden>+250</span>
                    <input 
                      className="phone-number" 
                      type="text"
                      inputMode="numeric"
                      maxLength={9}
                      value={phoneLocal}
                      onKeyDown={(e) => {
                        const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'];
                        if (allowed.includes(e.key)) return;
                        if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                      }}
                      onPaste={(e) => {
                        const paste = (e.clipboardData.getData('text') || '').replace(/\D/g, '');
                        if (!paste) {
                          e.preventDefault();
                          return;
                        }
                        const current = (phoneLocal || '').replace(/\D/g, '');
                        const next = (current + paste).slice(0, 9);
                        e.preventDefault();
                        setPhoneLocal(next);
                      }}
                      onChange={(e) => {
                        const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 9);
                        setPhoneLocal(digits);
                      }}
                      onBlur={() => setPhoneLocal((v) => (v || '').replace(/\D/g, '').slice(0, 9))}
                      placeholder="7XXXXXXXX"
                      required
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Enter 9 digits after +250</div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Location (District)</label>
                  <div className="relative">
                    <input
                      className="input w-full"
                      value={form.location || ""}
                      onChange={(e) => { setForm({ ...form, location: e.target.value }); setShowLocationList(true); }}
                      onFocus={() => setShowLocationList(true)}
                      onBlur={() => setTimeout(() => setShowLocationList(false), 100)}
                      placeholder="Select location"
                    />
                    {showLocationList && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-md max-h-40 overflow-y-auto shadow-sm">
                        {RW_DISTRICTS.filter(d => d.toLowerCase().includes((form.location||'').toLowerCase()))
                          .map((d) => (
                            <div
                              role="button"
                              key={d}
                              className="px-3 py-2 hover:bg-muted cursor-pointer"
                              onMouseDown={() => { setForm((prev) => ({ ...prev, location: d })); setShowLocationList(false); }}
                            >
                              {d}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority *</label>
                  <select 
                    className="select w-full" 
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
                    className="select w-full" 
                    value={form.assignee_id} 
                    onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {/* Add current user as first option for self-assignment */}
                    {user && (
                      <option key={user.id} value={user.id}>
                        {user.email} ({user.role}) - Me
                      </option>
                    )}
                    {/* Add other users, excluding current user to avoid duplicates */}
                    {[...agents, ...admins]
                      .filter(a => a.id !== user?.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>{a.email} ({a.role})</option>
                      ))}
                  </select>
                </div>
              </div>
              
              {/* Tags selection with scroll and add */}
              <div>
                <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium block">Categories</label>
                  <button
                    type="button"
                    className="btn btn-ghost p-1 h-8 w-8 bg-gray-200 hover:bg-gray-200/90 rounded-full"
                    aria-label={showNewTag ? 'Close new tag' : 'Add new tag'}
                    onClick={() => setShowNewTag((v) => !v)}
                    title={showNewTag ? 'Close' : 'Add tag'}
                  >
                    {showNewTag ? '×' : '+'}
                  </button>
                </div>
                {showNewTag && (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      className="input"
                      placeholder="New tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        const name = (newTagName || '').trim();
                        if (!name) return;
                        try {
                          const res = await api.post('/tags', { name });
                          const tag = res?.data?.data?.tag || res?.data?.tag || res?.data?.data;
                          if (tag) {
                            setAvailableTags((prev) => [...prev, tag]);
                            setForm((f) => ({ ...f, tag_ids: [...(f.tag_ids||[]), tag.id] }));
                            setNewTagName('');
                            setShowNewTag(false);
                          }
                        } catch {}
                      }}
                    >
                      Add
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border border-border rounded-lg bg-input">
                  {availableTags.map((t) => {
                    const checked = (form.tag_ids || []).includes(t.id);
                    return (
                      <label key={t.id} className={`chip removable cursor-pointer select-none ${checked ? 'bg-primary text-primary-foreground' : ''}`}>
                        <input
                          type="checkbox"
                          className="mr-1"
                          checked={checked}
                          onChange={() => {
                            const current = new Set(form.tag_ids || []);
                            if (current.has(t.id)) current.delete(t.id);
                            else current.add(t.id);
                            setForm({ ...form, tag_ids: Array.from(current) });
                          }}
                        />
                        {t.name}
                        {checked && (
                          <button type="button" aria-label="Remove tag" onClick={() => {
                            const current = new Set(form.tag_ids || []);
                            current.delete(t.id);
                            setForm({ ...form, tag_ids: Array.from(current) });
                          }}>×</button>
                        )}
                      </label>
                    );
                  })}
                  {availableTags.length === 0 && (
                    <span className="text-sm text-muted-foreground p-2">No categories available</span>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea 
                  className="textarea w-full min-h-[120px]" 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  placeholder="Describe the issue in detail..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Attachments</label>
                
                {/* Media previews with scroll */}
                {(tempUrls.length > 0 || tempMediaUrls.length > 0) && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-2">
                      {tempUrls.length + tempMediaUrls.length} file{(tempUrls.length + tempMediaUrls.length) !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-muted rounded-lg">
                      {tempUrls.map((url) => (
                        <ImagePreview 
                          key={url} 
                          url={url} 
                          onRemove={removeTempImage}
                        />
                      ))}
                      {tempMediaUrls.map((url) => (
                        <MediaPreview 
                          key={url} 
                          url={url} 
                          onRemove={removeTempMedia}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <input 
                    type="file" 
                    accept="image/*,audio/*,video/*" 
                    multiple 
                    onChange={onTempUpload} 
                    disabled={fileUploading} 
                    className="hidden" 
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload" 
                    className="btn btn-secondary cursor-pointer text-sm py-2 px-3 sm:px-4 disabled:opacity-50"
                    disabled={fileUploading}
                  >
                    {fileUploading ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Uploading...
                      </span>
                    ) : 'Choose Media Files'}
                  </label>
                  <span className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-0">
                    {fileUploading ? 'Uploading media files...' : 'Images (5MB), Audio/Video (50MB)'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="card-footer flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 sticky bottom-0 bg-white border-t border-gray-100">
              <button 
                type="button" 
                className="btn btn-secondary order-2 sm:order-1 py-2 px-4" 
                onClick={handleCloseCreateModal}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary order-1 sm:order-2 py-2 px-4" 
                disabled={creating || fileUploading}
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Creating...
                  </span>
                ) : "Create Ticket"}
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