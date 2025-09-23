"use client";
import { useEffect, useState } from "react";
import { InvitesAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function InvitationsPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const isSuperAdmin = user?.role === "super_admin";

  const load = async () => {
    setLoading(true);
    try {
      const res = await InvitesAPI.list({ page, pageSize });
      const data = res?.data?.items || res?.items || [];
      const t = res?.data?.total || res?.total || 0;
      setItems(data);
      setTotal(t);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [page, pageSize]);

  // Auto-refresh when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => load(), 10000); // every 10s
    return () => clearInterval(id);
  }, [autoRefresh]);

  // Refresh when tab gains focus
  useEffect(() => {
    const onFocus = () => load();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
    };
  }, []);

  const createInvite = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payloadRole = role === 'clerk' ? 'admin' : role;
      await InvitesAPI.create({ email, role: payloadRole });
      setEmail("");
      setRole("admin");
      setOpenModal(false);
      load();
    } catch {} finally { setSubmitting(false); }
  };

  const resend = async (id) => { try { setActionId(id); await InvitesAPI.resend(id); load(); } catch {} finally { setActionId(null); } };
  const revoke = async (id) => { try { setActionId(id); await InvitesAPI.revoke(id); load(); } catch {} finally { setActionId(null); } };

  if (!isSuperAdmin) return <div className="p-6">Access denied</div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Invitations</h1>
          <span className="chip">{items.length} total</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={autoRefresh} onChange={(e)=>setAutoRefresh(e.target.checked)} />
            Auto refresh
          </label>
          <button className="btn btn-primary" onClick={()=>setOpenModal(true)}>Invite User</button>
        </div>
      </div>

      {/* Card Table */}
      <div className="card">
        <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 1fr 1.5fr 1fr'}}>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Expires</div>
          <div>Actions</div>
        </div>
        <div className="card-body p-0">
          {loading && (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          )}
          {!loading && items.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No invites yet. Send your first invite.</div>
          )}
          <div>
            {items.map((inv)=> (
              <div key={inv.id} className="table-row" style={{gridTemplateColumns:'2fr 1fr 1fr 1.5fr 1fr'}}>
                <div className="truncate">{inv.email}</div>
                <div className="uppercase">{inv.role}</div>
                <div>
                  <span className="chip {inv.status==='PENDING' ? 'chip-primary' : ''}">{inv.status}</span>
                </div>
                <div>{inv.expires_at ? new Date(inv.expires_at).toLocaleString() : ''}</div>
                <div className="flex gap-2">
                  <button disabled={actionId===inv.id} onClick={()=>resend(inv.id)} className="btn btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">{actionId===inv.id? 'Resending...' : 'Resend'}</button>
                  {inv.status === 'PENDING' && (
                    <button disabled={actionId===inv.id} onClick={()=>revoke(inv.id)} className="btn btn-ghost text-sm px-3 py-1.5 disabled:opacity-50">{actionId===inv.id? 'Revoking...' : 'Revoke'}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} results
          </div>
          <div className="flex items-center gap-2">
            <select className="select max-w-32" value={pageSize} onChange={(e)=> { setPage(1); setPageSize(Number(e.target.value)); }}>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button className="btn btn-secondary" disabled={page === 1} onClick={()=> setPage((p)=> Math.max(1, p-1))}>Previous</button>
            {Array.from({ length: Math.max(1, Math.ceil(total / pageSize)) }).slice(0,5).map((_, i) => (
              <button key={i} className={`btn btn-ghost min-w-[40px] ${page === i+1 ? 'bg-primary text-primary-foreground' : ''}`} onClick={()=> setPage(i+1)}>{i+1}</button>
            ))}
            <button className="btn btn-secondary" disabled={page >= Math.ceil(total / pageSize)} onClick={()=> setPage((p)=> p+1)}>Next</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {openModal && (
        <div className="preview-modal" role="dialog" aria-modal="true">
          <div className="preview-content max-w-lg">
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-lg font-semibold">Invite User</h2>
                <button className="btn btn-ghost" onClick={()=>setOpenModal(false)}>Close</button>
              </div>
              <div className="card-body">
                <form onSubmit={createInvite} className="space-y-4">
                  <div>
                    <label className="text-sm">Email</label>
                    <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required className="input" placeholder="user@example.com" />
                  </div>
                  <div>
                    <label className="text-sm">Role</label>
                    <select value={role} onChange={(e)=>setRole(e.target.value)} className="select">
                      <option value="admin">Clerk</option>
                      <option value="agent">Agent</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" className="btn btn-ghost" onClick={()=>setOpenModal(false)} disabled={submitting}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Sending...' : 'Send Invite'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


