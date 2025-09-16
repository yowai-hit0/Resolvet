"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { TicketsAPI, UsersAPI, api } from "@/lib/api";
import { useToastStore } from "@/store/ui";
import Attachments from "./attachments";
import { useAuthStore } from "@/store/auth";

const STATUS_OPTIONS = ["new", "open", "resolved", "closed"];

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
      await load();
      showToast("Comment added", "success");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add comment");
      showToast("Failed to add comment", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!ticket) return <div>Not found</div>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        {error && <div className="text-sm text-red-600">{error}</div>}
        {message && <div className="text-sm text-green-700">{message}</div>}
        <div className="card">
          <div className="card-body space-y-3">
            <div>
              <div className="text-xs opacity-70">Code</div>
              <div className="font-medium">{ticket.ticket_code || ticket.code || ticket.id}</div>
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="text-xs opacity-70">Subject</div>
                <div className="font-medium">{ticket.subject}</div>
              </div>
              <button className="btn" onClick={() => setEditMode((v) => !v)}>{editMode ? "Done" : "Edit"}</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs opacity-70 mb-1">Status</div>
                {editMode ? (
                  <select
                    className="select"
                    value={ticket.status}
                    onChange={(e) => updateField({ status: e.target.value })}
                    disabled={saving || (user?.role !== 'admin' && user?.role !== 'agent')}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <div className="chip capitalize">{ticket.status}</div>
                )}
              </div>
              <div>
                <div className="text-xs opacity-70 mb-1">Priority</div>
                {editMode ? (
                  <input
                    className="input"
                    defaultValue={ticket.priority?.id || ticket.priority_id || ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v) updateField({ priority_id: Number(v) });
                    }}
                    placeholder="e.g. 1"
                    disabled={saving || (user?.role !== 'admin' && user?.role !== 'agent')}
                  />
                ) : (
                  <div className="chip">{ticket.priority?.name || ticket.priority_id}</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70 mb-1">Assignee</div>
              {editMode ? (
                <select
                  className="select"
                  value={ticket.assignee?.id || ticket.assignee_id || ""}
                  onChange={(e) => updateField({ assignee_id: e.target.value ? Number(e.target.value) : null })}
                  disabled={saving || user?.role !== 'admin'}
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
            <div>
              <div className="text-xs opacity-70 mb-1">Tags</div>
              {editMode ? (
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(allTags) && allTags.map((t) => (
                    <label key={t.id} className="chip cursor-pointer">
                      <input
                        type="checkbox"
                        className="mr-1"
                        checked={selectedTagIds.has(t.id)}
                        onChange={(e) => toggleTag(t.id, e.target.checked)}
                        disabled={saving || user?.role !== 'admin'}
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
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-xs opacity-70 mb-2">Requester</div>
            <div className="text-sm">{ticket.requester_name} • {ticket.requester_email}</div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="card">
          <div className="card-body space-y-3">
            <div className="font-medium">Comments</div>
            <div className="space-y-2 max-h-80 overflow-auto">
              {(ticket.comments || []).map((c) => (
                <div key={c.id} className="border rounded p-2 text-sm">
                  <div className="opacity-70 text-xs mb-1">
                    {c.author?.email} • {new Date(c.created_at).toLocaleString()} {c.is_internal ? "• internal" : ""}
                  </div>
                  <div>{c.content}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <textarea
                className="input min-h-24"
                placeholder="Add a comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <label className="text-sm flex items-center gap-2">
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                  Internal note
                </label>
                <button className="btn btn-primary" disabled={saving || !comment.trim()} onClick={addComment}>
                  {saving ? "Saving..." : "Add comment"}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="font-medium mb-2">Activity</div>
            <div className="text-xs opacity-70">Activity feed UI not implemented yet.</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body space-y-2">
            <div className="font-medium">Attachments</div>
            <Attachments
              ticketId={id}
              items={ticket.attachments || []}
              onUploaded={load}
              onDeleted={load}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


