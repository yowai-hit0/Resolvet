"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UsersAPI } from "@/lib/api";
import { useToastStore } from "@/store/ui";

export default function UsersList() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const load = async () => {
    setLoading(true);
    try {
      const r = await UsersAPI.list({ search: search || undefined, role: role || undefined, page: 1, limit: 20 });
      setItems(r?.data?.users || r?.users || []);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, role]);

  return (
    <div>
      <div className="toolbar">
        <input className="input max-w-xs" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select max-w-40" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Any role</option>
          <option value="admin">admin</option>
          <option value="agent">agent</option>
          <option value="customer">customer</option>
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
    </div>
  );
}


