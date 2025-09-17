"use client";

import { useEffect, useState } from "react";
import { AdminAPI, api } from "@/lib/api";
import { LineSimple, BarSimple } from "@/components/charts/ChartKit";

export default function AdminHome() {
  const [system, setSystem] = useState();
  const [stats, setStats] = useState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      AdminAPI.systemAnalytics().catch(() => undefined),
      api.get("/tickets/stats").then((r) => r.data).catch(() => undefined),
    ]).then(([sys, s]) => {
      setSystem(sys?.data || sys);
      setStats(s?.data || s);
    }).finally(() => setLoading(false));
  }, []);

  const byStatus = stats?.stats?.byStatus || {};
  const total = stats?.stats?.total || 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="card"><div className="card-body"><div className="text-xs opacity-70">Open</div><div className="text-2xl font-semibold">{byStatus.open || 0}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs opacity-70">Resolved</div><div className="text-2xl font-semibold">{byStatus.resolved || 0}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs opacity-70">Closed</div><div className="text-2xl font-semibold">{byStatus.closed || 0}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs opacity-70">Total</div><div className="text-2xl font-semibold">{total}</div></div></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card"><div className="card-body"><div className="font-medium mb-2">Tickets per day (last 30d)</div><LineSimple data={system?.analytics?.ticket_trends || system?.charts?.tickets_by_day || []} xKey="date" yKey="count" /></div></div>
        <div className="card"><div className="card-body"><div className="font-medium mb-2">Tickets per agent</div><BarSimple data={(system?.analytics?.busiest_agents || system?.charts?.tickets_by_agent || []).map((a) => ({ name: a.agent?.email, count: a.ticket_count }))} xKey="name" yKey="count" /></div></div>
      </div>
    </div>
  );
}


