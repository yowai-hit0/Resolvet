"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UsersAPI } from "@/lib/api";
import { useToastStore } from "@/store/ui";

export default function UsersList() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState();
  const showToast = useToastStore((s) => s.show);

  const load = async () => {
    setLoading(true);
    try {
      const r = await UsersAPI.list({ search: search || undefined, role: role || undefined, page, limit });
      const rows = r?.data?.users || r?.users || [];
      const p = r?.pagination || r?.data?.pagination;
      setItems(rows);
      if (p) setPagination(p);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, role, page, limit]);

  return (
    <div>
      <div className="toolbar">
        <input className="input max-w-xs" placeholder="Search" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        <select className="select max-w-40" value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }}>
          <option value="">Any role</option>
          <option value="admin">admin</option>
          <option value="agent">agent</option>
          <option value="customer">customer</option>
        </select>
        <select className="select max-w-32" value={limit} onChange={(e)=> { setPage(1); setLimit(Number(e.target.value)); }}>
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>
      <div className="card">
        <div className="table-head grid-cols-5">
          <div>ID</div>
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Actions</div>
        </div>
        {loading && <div className="card-body text-sm">Loading...</div>}
        {!loading && items.map((u) => (
          <Link key={u.id} href={`/admin/users/${u.id}`} className="table-row grid-cols-5">
            <div>{u.id}</div>
            <div className="truncate">{u.first_name} {u.last_name}</div>
            <div className="truncate">{u.email}</div>
            <div className="truncate">{u.role}</div>
            <div className="truncate">View</div>
          </Link>
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.currentPage - 1) * pagination.limit + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} results
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary" disabled={!pagination.hasPrev} onClick={()=> setPage((p)=> Math.max(1, p-1))}>Previous</button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => (
              <button key={i} className={`btn btn-ghost min-w-[40px] ${page === i+1 ? 'bg-primary text-primary-foreground' : ''}`} onClick={()=> setPage(i+1)}>{i+1}</button>
            ))}
            <button className="btn btn-secondary" disabled={!pagination.hasNext} onClick={()=> setPage((p)=> p+1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}


