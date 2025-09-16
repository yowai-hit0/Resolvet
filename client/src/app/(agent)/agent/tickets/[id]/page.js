"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TicketsAPI, AgentAPI, api } from "@/lib/api";
import { useToastStore } from "@/store/ui";
import Attachments from "@/components/Attachments";

const STATUS_OPTIONS = ["new", "open", "resolved", "closed"];

export default function AgentTicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const addComment = async (content) => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.post(`/tickets/${id}/comments`, { content, is_internal: false });
      await load();
      showToast("Comment added", "success");
    } catch {
      showToast("Failed to add comment", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !ticket) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body space-y-3">
          <div className="font-medium">{ticket.subject}</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs opacity-70 mb-1">Status</div>
              <select className="select" value={ticket.status} onChange={(e) => setStatus(e.target.value)} disabled={saving}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs opacity-70 mb-1">Priority ID</div>
              <input className="input" defaultValue={ticket.priority?.id || ticket.priority_id || ""} onBlur={(e) => e.target.value && setPriority(e.target.value)} disabled={saving} />
            </div>
          </div>
          <div className="text-sm">Requester: {ticket.requester_name} • {ticket.requester_email}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-body space-y-2">
          <div className="font-medium">Comments</div>
          <div className="space-y-2 max-h-80 overflow-auto">
            {(ticket.comments || []).map((c) => (
              <div key={c.id} className="border rounded p-2 text-sm">
                <div className="opacity-70 text-xs mb-1">
                  {c.author?.email} • {new Date(c.created_at).toLocaleString()}
                </div>
                <div>{c.content}</div>
              </div>
            ))}
          </div>
          <AgentCommentBox onSubmit={addComment} submitting={saving} />
        </div>
      </div>
      <div className="card">
        <div className="card-body space-y-2">
          <div className="font-medium">Attachments</div>
          <Attachments ticketId={id} items={ticket.attachments || []} onUploaded={load} onDeleted={load} />
        </div>
      </div>
    </div>
  );
}

function AgentCommentBox({ onSubmit, submitting }) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-2">
      <textarea className="input min-h-24" placeholder="Add a comment" value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={submitting || !value.trim()} onClick={() => onSubmit(value)}>
          {submitting ? "Sending..." : "Comment"}
        </button>
      </div>
    </div>
  );
}


