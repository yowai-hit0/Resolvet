// app/(agent)/tickets/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TicketsAPI, AgentAPI, api } from "@/lib/api";
import { useToastStore } from "@/store/ui";
import Attachments from "@/components/Attachments";

const STATUS_OPTIONS = [
  { value: "new", label: "New", class: "status-new" },
  { value: "open", label: "Open", class: "status-open" },
  { value: "resolved", label: "Resolved", class: "status-resolved" },
  { value: "closed", label: "Closed", class: "status-closed" },
];

export default function AgentTicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const load = async () => {
    setLoading(true);
    try {
      const d = await TicketsAPI.get(id);
      setTicket(d?.data?.ticket || d?.ticket || d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const setStatus = async (status) => {
    setSaving(true);
    const prev = ticket;
    setTicket({ ...ticket, status });
    try {
      await AgentAPI.setStatus(id, status);
      showToast("Status updated", "success");
    } catch {
      setTicket(prev);
      showToast("Failed to update status", "error");
    } finally {
      setSaving(false);
    }
  };

  const setPriority = async (priority_id) => {
    setSaving(true);
    const prev = ticket;
    setTicket({ ...ticket, priority_id });
    try {
      await AgentAPI.setPriority(id, Number(priority_id));
      showToast("Priority updated", "success");
    } catch {
      setTicket(prev);
      showToast("Failed to update priority", "error");
    } finally {
      setSaving(false);
    }
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
      <h1 className="text-2xl font-bold text-foreground">Ticket Details</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
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
                  <select
                    className="select"
                    value={ticket.status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={saving}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Subject</label>
                <div className="font-medium text-lg">{ticket.subject}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Priority</label>
                  <input
                    className="input"
                    defaultValue={ticket.priority?.id || ticket.priority_id || ""}
                    onBlur={(e) => e.target.value && setPriority(e.target.value)}
                    disabled={saving}
                    placeholder="Priority ID"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Assignee</label>
                  <div className="chip">{ticket.assignee?.email || "Unassigned"}</div>
                </div>
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