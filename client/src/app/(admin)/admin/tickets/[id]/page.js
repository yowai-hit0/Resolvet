// app/(admin)/tickets/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TicketsAPI, UsersAPI, api } from "@/lib/api";
import { useToastStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import Attachments from "@/components/Attachments";

const STATUS_OPTIONS = [
  { value: "New", label: "New", class: "status-new" },
  { value: "Assigned", label: "Assigned", class: "status-open" },
  { value: "In_Progress", label: "In Progress", class: "status-open" },
  { value: "On_Hold", label: "On Hold", class: "status-open" },
  { value: "Resolved", label: "Resolved", class: "status-resolved" },
  { value: "Closed", label: "Closed", class: "status-closed" },
  { value: "Reopened", label: "Reopened", class: "status-open" },
];

export default function TicketDetail() {
  const params = useParams();
  const id = params?.id;
  const [ticket, setTicket] = useState();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState();
  const [message, setMessage] = useState();
  const showToast = useToastStore((s) => s.show);
  const { user } = useAuthStore();
  const [editMode, setEditMode] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [editData, setEditData] = useState({
    status: "",
    priority_id: "",
    assignee_id: "",
    tag_ids: []
  });

  const load = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const d = await TicketsAPI.get(id);
      const t = d?.data?.ticket || d?.ticket || d;
      setTicket(t);
      // Initialize edit data with current values
      setEditData({
        status: t.status,
        priority_id: t.priority?.id || t.priority_id || "",
        assignee_id: t.assignee?.id || t.assignee_id || "",
        tag_ids: (t.tags || []).map(tag => tag.id)
      });
    } catch (e) {
      setError("Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  useEffect(() => {
    UsersAPI.list({ role: "agent", page: 1, limit: 100 })
      .then((d) => setAgents(d?.data?.users || d?.users || []))
      .catch(() => {});
    
    // Load priorities
    api.get("/tickets/priorities")
      .then((r) => {
        const payload = r.data;
        const candidates = [payload?.data?.priorities, payload?.data, payload?.priorities, payload];
        const list = candidates.find((v) => Array.isArray(v)) || [];
        setPriorities(list);
      })
      .catch(() => setPriorities([]));
      
    api.get("/tags").then((r) => {
      const payload = r.data;
      const candidates = [payload?.data?.tags, payload?.data, payload?.tags, payload];
      const list = candidates.find((v) => Array.isArray(v)) || [];
      setAllTags(list);
    }).catch(() => setAllTags([]));
  }, []);

  const saveChanges = async () => {
    setSaving(true);
    setMessage(undefined);
    setError(undefined);
    try {
      // Enforce comment when closing
      if (editData.status === "Closed") {
        const hasComment = (ticket?.comments || []).length > 0 || comment.trim().length > 0;
        if (!hasComment) {
          setError("Add a comment before closing the ticket");
          setSaving(false);
          return;
        }
      }

      const r = await api.put(`/tickets/${id}`, editData);
      await load();
      // const t = r.data?.data?.ticket || r.data?.ticket || r.data;
      // console.log(r);
      // If API doesn't echo, reload
      // if (!t) await load();
      // else setTicket((prev) => ({ ...prev, ...t }));
      
      showToast("Updated", "success");
      setEditMode(false);
    } catch (e) {
      setError(e?.response?.data?.message || "Update failed");
      showToast("Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleTag = (tagId) => {
    setEditData(prev => ({
      ...prev,
      tag_ids: (prev.tag_ids || []).includes(tagId)
        ? (prev.tag_ids || []).filter(id => id !== tagId)
        : [...(prev.tag_ids || []), tagId]
    }));
  };

  const cancelEdit = () => {
    // Reset edit data to current ticket values
    setEditData({
      status: ticket.status,
      priority_id: ticket.priority?.id || ticket.priority_id || "",
      assignee_id: ticket.assignee?.id || ticket.assignee_id || "",
      tag_ids: (ticket.tags || []).map(tag => tag.id)
    });
    setEditMode(false);
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    setMessage(undefined);
    setError(undefined);
    try {
      await api.post(`/tickets/${id}/comments`, { content: comment, is_internal: isInternal });
      setComment("");
      setIsInternal(false);
      await load();
      showToast("Comment added", "success");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add comment");
      showToast("Failed to add comment", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Loading...</div>;
  if (!ticket) return <div className="flex items-center justify-center p-8">Ticket not found</div>;

  const displayedComments = showAllComments ? ticket.comments || [] : (ticket.comments || []).slice(0, 3);
  const hasMoreComments = (ticket.comments || []).length > 3;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Ticket Details</h1>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button 
                className="btn btn-secondary"
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={saveChanges}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button 
              className="btn btn-secondary"
              onClick={() => setEditMode(true)}
            >
              Edit Ticket
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {error && <div className="card bg-red-50 border-red-200"><div className="card-body text-red-700">{error}</div></div>}
          {message && <div className="card bg-green-50 border-green-200"><div className="card-body text-green-700">{message}</div></div>}
          
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Ticket Information</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Ticket Code</label>
                  <div className="font-mono text-primary font-medium">{ticket.ticket_code || ticket.code || ticket.id}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Status</label>
                  {editMode ? (
                    <select
                      className="select"
                      value={editData.status}
                      onChange={(e) => handleFieldChange("status", e.target.value)}
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`status-badge ${STATUS_OPTIONS.find(s => s.value === ticket.status)?.class || 'status-new'}`}>
                      {ticket.status}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Subject</label>
                <div className="font-medium text-lg">{ticket.subject}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Priority</label>
                  {editMode ? (
                    <select
                      className="select"
                      value={editData.priority_id}
                      onChange={(e) => handleFieldChange("priority_id", e.target.value ? Number(e.target.value) : null)}
                      disabled={saving}
                    >
                      <option value="">Select Priority</option>
                      {priorities.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="chip">{ticket.priority?.name || ticket.priority_id || "Not set"}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Assignee</label>
                  {editMode ? (
                    <select
                      className="select"
                      value={editData.assignee_id}
                      onChange={(e) => handleFieldChange("assignee_id", e.target.value ? Number(e.target.value) : null)}
                      disabled={saving}
                    >
                      <option value="">Unassigned</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.email}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="chip">{ticket.assignee?.email || "Unassigned"}</div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Categories</label>
                {editMode ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(allTags) && allTags.map((t) => (
                      <label key={t.id} className="chip cursor-pointer">
                        <input
                          type="checkbox"
                          className="mr-1"
                          checked={(editData.tag_ids || []).includes(t.id)}
                          onChange={() => toggleTag(t.id)}
                          disabled={saving}
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(ticket.tags || []).map((t) => (
                      <span key={t.id} className="chip">{t.name}</span>
                    ))}
                    {(ticket.tags || []).length === 0 && (
                      <span className="text-muted-foreground">No categories</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Requester Information</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Name</label>
                  <div>{ticket.requester_name || "Not provided"}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Email</label>
                  <div>{ticket.requester_email || "Not provided"}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Phone</label>
                  <div>{ticket.requester_phone || "Not provided"}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Location</label>
                  <div>{ticket.location || "Not provided"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Description</h2>
            </div>
            <div className="card-body">
              <div className="prose prose-sm max-w-none">
                {ticket.description ? (
                  <p className="whitespace-pre-wrap">{ticket.description}</p>
                ) : (
                  <p className="text-muted-foreground">No description provided</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Comments</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {displayedComments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No comments yet</p>
                ) : (
                  displayedComments.map((c) => (
                    <div key={c.id} className={`border rounded-lg p-3 ${c.is_internal ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>
                          {c.author?.email} • {new Date(c.created_at).toLocaleString()}
                          {c.is_internal && " • Internal"}
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{c.content}</div>
                    </div>
                  ))
                )}
              </div>

              {hasMoreComments && !showAllComments && (
                <button
                  className="btn btn-ghost w-full text-sm"
                  onClick={() => setShowAllComments(true)}
                >
                  Show all {(ticket.comments || []).length} comments
                </button>
              )}

              {showAllComments && hasMoreComments && (
                <button
                  className="btn btn-ghost w-full text-sm"
                  onClick={() => setShowAllComments(false)}
                >
                  Show fewer comments
                </button>
              )}

              <div className="space-y-3 pt-4 border-t">
                <textarea
                  className="textarea"
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    Internal note
                  </label>
                  <button
                    className="btn btn-primary"
                    disabled={saving || !comment.trim()}
                    onClick={addComment}
                  >
                    {saving ? "Adding..." : "Add Comment"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Attachments</h2>
            </div>
            <div className="card-body">
              <Attachments
                ticketId={id}
                items={ticket.attachments || []}
                onUploaded={load}
                onDeleted={load}
                mode={(user?.role === 'admin' || user?.role === 'agent') ? 'edit' : 'view'}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Activity</h2>
            </div>
            <div className="card-body">
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(ticket.ticket_events || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No activity yet</p>
                ) : (
                  (ticket.ticket_events || []).sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map((ev) => (
                    <div key={ev.id} className="text-sm">
                      <div className="text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString()} • {ev.user ? `${ev.user.first_name} ${ev.user.last_name}` : 'System'}
                      </div>
                      <div>
                        {ev.change_type.replace(/_/g, ' ')} {ev.old_value ? `(${ev.old_value} → ${ev.new_value ?? ''})` : ev.new_value}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}