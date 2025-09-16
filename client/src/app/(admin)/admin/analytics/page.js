"use client";

import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api";

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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="border rounded p-4">
        <h2 className="font-medium mb-2">System</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(system, null, 2)}</pre>
      </div>
      <div className="border rounded p-4">
        <h2 className="font-medium mb-2">Agent Performance</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(agents, null, 2)}</pre>
      </div>
    </div>
  );
}


