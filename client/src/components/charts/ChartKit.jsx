"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

export function NoData({ message = "No data" }) {
  return <div className="text-sm opacity-70 p-4 text-center">{message}</div>;
}

export function LineSimple({ data, xKey, yKey }) {
  if (!Array.isArray(data) || data.length === 0) return <NoData />;
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} stroke="#111" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarSimple({ data, xKey, yKey }) {
  if (!Array.isArray(data) || data.length === 0) return <NoData />;
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey={yKey} fill="#111" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const COLORS = ["#111827", "#4338ca", "#059669", "#dc2626", "#d97706", "#4b5563"]; 

export function PieSimple({ data, nameKey, valueKey }) {
  if (!Array.isArray(data) || data.length === 0) return <NoData />;
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} outerRadius={100} fill="#111">
            {data.map((_, i) => (
              <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


