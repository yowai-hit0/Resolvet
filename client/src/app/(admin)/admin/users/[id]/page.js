"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/ui";

export default function UserDetail() {
  const params = useParams();
  const id = params?.id;
  const [user, setUser] = useState();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/users/${id}`);
      setUser(r.data?.data?.user || r.data?.user || r.data);
    } catch {
      showToast("Failed to load user", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  const toggleStatus = async () => {
    setSaving(true);
    try {
      const next = !user?.is_active;
      await api.patch(`/users/${id}/status`, { is_active: next });
      await load();
      showToast(next ? "Activated" : "Deactivated", "success");
    } catch {
      showToast("Failed to update status", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <div>Loading...</div>;

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="card-body">
          <div className="font-medium mb-2">{user.first_name} {user.last_name}</div>
          <div className="text-sm">{user.email}</div>
          <div className="text-sm">Role: {user.role}</div>
          <div className="text-sm">Active: {String(user.is_active)}</div>
          <div className="mt-3 flex gap-2">
            <button className="btn" onClick={toggleStatus} disabled={saving}>{saving ? "Saving..." : (user.is_active ? "Deactivate" : "Activate")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}


