"use client";

import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api";
import { LineSimple, BarSimple, PieSimple, NoData } from "@/components/charts/ChartKit";

export default function AnalyticsPage() {
  const [system, setSystem] = useState();
  const [agents, setAgents] = useState();

  useEffect(() => {
    let ignore = false;
    Promise.all([AdminAPI.systemAnalytics(), AdminAPI.agentPerformance()])
      .then(([s, a]) => {
        if (!ignore) {
          setSystem(s?.data || s);
          setAgents(a?.data || a);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const trends = system?.analytics?.ticket_trends || system?.charts?.tickets_by_day || [];
  const busiest = system?.analytics?.busiest_agents || system?.charts?.tickets_by_agent || [];
  const pieData = (system?.analytics?.common_tags || []).map((t) => ({ name: t.tag?.name, value: t.usage_count }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card">
        <div className="card-body">
          <div className="font-medium mb-2">Tickets per day</div>
          <LineSimple data={trends} xKey="date" yKey="count" />
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="font-medium mb-2">Tickets per agent</div>
          <BarSimple data={busiest.map((b) => ({ name: b.agent?.email, count: b.ticket_count }))} xKey="name" yKey="count" />
        </div>
      </div>
      <div className="card md:col-span-2">
        <div className="card-body">
          <div className="font-medium mb-2">Common tags</div>
          <PieSimple data={pieData} nameKey="name" valueKey="value" />
        </div>
      </div>
    </div>
  );
}


