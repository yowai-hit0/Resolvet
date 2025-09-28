// app/(agent)/tickets/[id]/page.js
"use client";
export const runtime = 'edge';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TicketsAPI, AgentAPI, api } from "@/lib/api";
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

export default function AgentTicketDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const showToast = useToastStore((s) => s.show);
  const [allTags, setAllTags] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [editData, setEditData] = useState({
    status: "",
    priority_id: "",
    tag_ids: []
  });

  const load = async () => {
    setLoading(true);
    try {
      const d = await TicketsAPI.get(id);
      const ticketData = d?.data?.ticket || d?.ticket || d;
      setTicket(ticketData);
      setEditData({
        status: ticketData.status,
        priority_id: ticketData.priority?.id || ticketData.priority_id,
        tag_ids: (ticketData.tags || []).map(t => t.id)
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
    
    // Load available tags
    api.get("/tags")
      .then((r) => {
        const payload = r.data;
        const candidates = [payload?.data?.tags, payload?.data, payload?.tags, payload];
        const list = candidates.find((v) => Array.isArray(v)) || [];
        setAllTags(list);
      })
      .catch(() => setAllTags([]));
    
    // Load priorities
    api.get("/tickets/priorities")
      .then((r) => {
        const payload = r.data;
        const candidates = [payload?.data?.priorities, payload?.data, payload?.priorities, payload];
        const list = candidates.find((v) => Array.isArray(v)) || [];
        setPriorities(list);
      })
      .catch(() => setPriorities([]));
  }, [id]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to current ticket values
      setEditData({
        status: ticket.status,
        priority_id: ticket.priority?.id || ticket.priority_id,
        tag_ids: (ticket.tags || []).map(t => t.id)
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update status if changed
      if (editData.status !== ticket.status) {
        await AgentAPI.setStatus(id, editData.status);
      }

      // Update priority if changed
      if (editData.priority_id !== (ticket.priority?.id || ticket.priority_id)) {
        await AgentAPI.setPriority(id, Number(editData.priority_id));
      }
      
      // Update tags if changed - get current tag IDs from ticket
      const currentTagIds = (ticket.tags || []).map(tag => tag.id);
      if (JSON.stringify(editData.tag_ids.sort()) !== JSON.stringify(currentTagIds.sort())) {
        await api.put(`/tickets/${id}`, { tag_ids: editData.tag_ids });
      }

      showToast("Ticket updated successfully", "success");
      await load(); // Reload to get fresh data
      setIsEditing(false);
    } catch (error) {
      showToast("Failed to update ticket", "error");
      console.error("Update error:", error);
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

  const addComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await api.post(`/tickets/${id}/comments`, { content: comment, is_internal: false });
      setComment("");
      await load();
      showToast("Comment added", "success");
    } catch {
      showToast("Failed to add comment", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !ticket) return <div className="flex items-center justify-center p-8">Loading...</div>;

  const displayedComments = showAllComments ? ticket.comments || [] : (ticket.comments || []).slice(0, 3);
  const hasMoreComments = (ticket.comments || []).length > 3;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Ticket Details</h1>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button 
                className="btn btn-secondary" 
                onClick={handleEditToggle}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={handleEditToggle}
            >
              Edit Ticket
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header flex justify-between items-center">
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
                  {isEditing ? (
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
                    <div className={`chip ${STATUS_OPTIONS.find(s => s.value === ticket.status)?.class || ''}`}>
                      {ticket.status}
                    </div>
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
                  {isEditing ? (
                    <select
                      className="select"
                      value={editData.priority_id}
                      onChange={(e) => handleFieldChange("priority_id", e.target.value)}
                      disabled={saving}
                    >
                      <option value="">Select Priority</option>
                      {priorities.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="chip">
                      {ticket.priority?.name || `Priority ${ticket.priority_id}`}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Assignee</label>
                  <div className="chip">{ticket.assignee?.email || "Unassigned"}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Categories</label>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <label key={tag.id} className="chip cursor-pointer">
                        <input
                          type="checkbox"
                          className="mr-1"
                          checked={(editData.tag_ids || []).includes(tag.id)}
                          onChange={() => toggleTag(tag.id)}
                          disabled={saving}
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {ticket.tags?.length > 0 ? (
                      ticket.tags.map((tag) => (
                        <span key={tag.id} className="chip">{tag.name}</span>
                      ))
                    ) : (
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
                    <div key={c.id} className="border rounded-lg p-3 bg-white border-gray-200">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>{c.author?.email} • {new Date(c.created_at).toLocaleString()}</span>
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
                <div className="flex justify-end">
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
                mode={(user?.role === 'admin' || user?.role === 'agent' || user?.role === 'super_admin') ? 'edit' : 'view'}
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