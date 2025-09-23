// app/(admin)/page.js
"use client";

import { useEffect, useState } from "react";
import { AdminAPI, api } from "@/lib/api";
import { LineSimple, BarSimple } from "@/components/charts/ChartKit";
import { CardSkeleton } from "@/components/Loader";

export default function AdminHome() {
  const [system, setSystem] = useState();
  const [stats, setStats] = useState();
  const [loading, setLoading] = useState(true);

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
  const openTickets = (byStatus.In_Progress || 0) + (byStatus.Assigned || 0) + (byStatus.On_Hold || 0) + (byStatus.New || 0) + (byStatus.Reopened || 0);
  const closedTickets = (byStatus.Resolved || 0) + (byStatus.Closed || 0);

  const statCards = [
    { 
      label: "Active Tickets", 
      value: openTickets, 
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      borderColor: "border-yellow-200"
    },
    { 
      label: "Completed Tickets", 
      value: closedTickets, 
      color: "text-green-600",
      bgColor: "bg-green-100",
      borderColor: "border-green-200"
    },
    { 
      label: "Total Tickets", 
      value: total, 
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20"
    },
    { 
      label: "New Today", 
      value: system?.analytics?.today_tickets || 0, 
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      borderColor: "border-blue-200"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card">
              <CardSkeleton lines={2} />
            </div>
          ))
        ) : (
          statCards.map((stat, index) => (
            <div key={index} className={`card border-2 ${stat.borderColor} hover:shadow-md transition-shadow`}>
              <div className="card-body text-center">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Open vs Closed Comparison Card */}
      {!loading && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-foreground">Ticket Status Distribution</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Open Tickets</span>
                  <span className="text-yellow-600 font-bold">{openTickets}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${total > 0 ? (openTickets / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Closed Tickets</span>
                  <span className="text-green-600 font-bold">{closedTickets}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${total > 0 ? (closedTickets / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-foreground">Tickets per Day (Last 30 Days)</h3>
          </div>
          <div className="card-body pt-0">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <LineSimple 
                data={system?.analytics?.ticket_trends || system?.charts?.tickets_by_day || []} 
                xKey="date" 
                yKey="count" 
              />
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-foreground">Tickets per Agent</h3>
          </div>
          <div className="card-body pt-0">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <BarSimple 
                data={(system?.analytics?.busiest_agents || system?.charts?.tickets_by_agent || []).map((a) => ({ 
                  name: a.agent?.email?.split('@')[0] || 'Unassigned', 
                  count: a.ticket_count 
                }))} 
                xKey="name" 
                yKey="count" 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}