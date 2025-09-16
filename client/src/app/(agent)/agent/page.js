"use client";

import { useEffect, useState } from "react";
import { AgentAPI } from "@/lib/api";

export default function AgentHome() {
  const [data, setData] = useState();
  useEffect(() => {
    AgentAPI.dashboard().then((d) => setData(d?.data || d)).catch(() => {});
  }, []);
  const ov = data?.dashboard?.overview || {};
  const perf = data?.dashboard?.performance || {};
  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="card"><div className="card-body"><div className="text-xs opacity-70">Assigned</div><div className="text-2xl font-semibold">{ov.total_assigned || 0}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs opacity-70">Open now</div><div className="text-2xl font-semibold">{ov.currently_open || 0}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs opacity-70">Resolved (30d)</div><div className="text-2xl font-semibold">{ov.recently_resolved || 0}</div></div></div>
      </div>
      <div className="card"><div className="card-body"><div className="font-medium mb-2">Performance (30d)</div><pre className="text-xs">{JSON.stringify(perf, null, 2)}</pre></div></div>
    </div>
  );
}


