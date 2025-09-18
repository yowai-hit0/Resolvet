// app/(admin)/tickets/[id]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { TicketsAPI, UsersAPI, api } from "@/lib/api";
import { useToastStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import Attachments from "@/components/Attachments";

const STATUS_OPTIONS = [
  { value: "new", label: "New", class: "status-new" },
  { value: "open", label: "Open", class: "status-open" },
  { value: "resolved", label: "Resolved", class: "status-resolved" },
  { value: "closed", label: "Closed", class: "status-closed" },
];

export default function TicketDetail() {
  const params = useParams();
  const id = params?.id;
  const [ticket, setTicket] = useState();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState();
  const [message, setMessage] = useState();
  const showToast = useToastStore((s) => s.show);
  const { user } = useAuthStore();
  const [editMode, setEditMode] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  const selectedTagIds = useMemo(() => new Set((ticket?.tags || []).map((t) => t.id)), [ticket]);

  const load = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const d = await TicketsAPI.get(id);
      const t = d?.data?.ticket || d?.ticket || d;
      setTicket(t);
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
    api.get("/tags").then((r) => {
      const payload = r.data;
      const candidates = [payload?.data?.tags, payload?.data, payload?.tags, payload];
      const list = candidates.find((v) => Array.isArray(v)) || [];
      setAllTags(list);
    }).catch(() => setAllTags([]));
  }, []);

  let prevTicketForRollback = ticket;
  const updateField = async (data) => {
    setSaving(true);
    setMessage(undefined);
    setError(undefined);
    try {
      // Enforce comment when closing
      if (data.status === "closed") {
        const hasComment = (ticket?.comments || []).length > 0 || comment.trim().length > 0;
        if (!hasComment) {
          setError("Add a comment before closing the ticket");
          setSaving(false);
          return;
        }
      }
      prevTicketForRollback = ticket;
      // optimistic update
      setTicket((prevT) => ({ ...prevT, ...data }));
      const r = await api.put(`/tickets/${id}`, data);
      const t = r.data?.data?.ticket || r.data?.ticket || r.data;
      // If API doesn't echo, reload
      if (!t) await load();
      else setTicket((prev) => ({ ...prev, ...t }));
      showToast("Updated", "success");
    } catch (e) {
      // rollback
      setTicket(prevTicketForRollback);
      setError(e?.response?.data?.message || "Update failed");
      showToast("Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = async (tagId, checked) => {
    const tag_ids = Array.from(selectedTagIds);
    const next = checked ? Array.from(new Set([...tag_ids, tagId])) : tag_ids.filter((id) => id !== tagId);
    await updateField({ tag_ids: next });
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
        <button 
          className="btn btn-secondary"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? "Done Editing" : "Edit Ticket"}
        </button>
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
                      value={ticket.status}
                      onChange={(e) => updateField({ status: e.target.value })}
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
                    <input
                      className="input"
                      defaultValue={ticket.priority?.id || ticket.priority_id || ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v) updateField({ priority_id: Number(v) });
                      }}
                      placeholder="Priority ID"
                      disabled={saving}
                    />
                  ) : (
                    <div className="chip">{ticket.priority?.name || ticket.priority_id || "Not set"}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Assignee</label>
                  {editMode ? (
                    <select
                      className="select"
                      value={ticket.assignee?.id || ticket.assignee_id || ""}
                      onChange={(e) => updateField({ assignee_id: e.target.value ? Number(e.target.value) : null })}
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
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Tags</label>
                {editMode ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(allTags) && allTags.map((t) => (
                      <label key={t.id} className="chip cursor-pointer">
                        <input
                          type="checkbox"
                          className="mr-1"
                          checked={selectedTagIds.has(t.id)}
                          onChange={(e) => toggleTag(t.id, e.target.checked)}
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
                      <span className="text-muted-foreground">No tags</span>
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
                  <div>{ticket.requester_email}</div>
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
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Activity</h2>
            </div>
            <div className="card-body">
              <div className="text-sm text-muted-foreground">
                <div>Created: {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'Unknown'}</div>
                <div>Updated: {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'Unknown'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}