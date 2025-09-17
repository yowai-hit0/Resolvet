// components/charts/ChartKit.jsx
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#6b7280" />
          <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }} 
          />
          <Line 
            type="monotone" 
            dataKey={yKey} 
            stroke="#f34d11" 
            strokeWidth={2} 
            dot={{ fill: '#f34d11', strokeWidth: 2, r: 4 }} 
            activeDot={{ r: 6, fill: '#e0440f' }}
          />
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#6b7280" />
          <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }} 
          />
          <Bar 
            dataKey={yKey} 
            fill="#f34d11" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const COLORS = ["#f34d11", "#4338ca", "#059669", "#dc2626", "#d97706", "#4b5563", "#7c3aed", "#0891b2"]; 

export function PieSimple({ data, nameKey, valueKey }) {
  if (!Array.isArray(data) || data.length === 0) return <NoData />;
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie 
            data={data} 
            dataKey={valueKey} 
            nameKey={nameKey} 
            outerRadius={80} 
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {data.map((_, i) => (
              <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }} 
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}