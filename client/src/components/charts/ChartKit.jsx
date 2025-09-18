// components/charts/ChartKit.jsx
"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

export function NoData({ message = "No data" }) {
  return <div className="text-sm opacity-70 p-4 text-center">{message}</div>;
}

// Helper function to calculate Y-axis domain and tick interval
const getYAxisConfig = (data, yKey) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { domain: [0, 10], ticks: [0, 2, 4, 6, 8, 10] };
  }

  const maxValue = Math.max(...data.map(item => item[yKey] || 0));
  
  // Calculate appropriate domain and tick interval based on max value
  let domainMax = 10;
  let tickInterval = 2;
  
  if (maxValue > 0) {
    // Calculate appropriate maximum for domain
    domainMax = Math.ceil(maxValue * 1.1); // Add 10% padding
    
    // Calculate tick interval based on the max value
    if (domainMax <= 10) {
      tickInterval = 2;
    } else if (domainMax <= 20) {
      tickInterval = 4;
    } else if (domainMax <= 50) {
      tickInterval = 10;
    } else if (domainMax <= 100) {
      tickInterval = 20;
    } else if (domainMax <= 200) {
      tickInterval = 40;
    } else if (domainMax <= 500) {
      tickInterval = 100;
    } else {
      tickInterval = Math.ceil(domainMax / 5);
    }
    
    // Ensure domainMax is a multiple of tickInterval for clean ticks
    domainMax = Math.ceil(domainMax / tickInterval) * tickInterval;
  }

  // Generate ticks array
  const ticks = [];
  for (let i = 0; i <= domainMax; i += tickInterval) {
    ticks.push(i);
  }

  return { domain: [0, domainMax], ticks };
};

// Custom YAxis tick formatter to ensure no decimals
const CustomYAxisTick = ({ x, y, payload }) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="#6b7280" fontSize={12}>
        {Math.round(payload.value)}
      </text>
    </g>
  );
};

export function LineSimple({ data, xKey, yKey }) {
  if (!Array.isArray(data) || data.length === 0) return <NoData />;
  
  const yAxisConfig = getYAxisConfig(data, yKey);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#6b7280" />
          <YAxis 
            domain={yAxisConfig.domain}
            ticks={yAxisConfig.ticks}
            tick={<CustomYAxisTick />}
            stroke="#6b7280" 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }} 
            formatter={(value) => [Math.round(value), yKey]}
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
  
  const yAxisConfig = getYAxisConfig(data, yKey);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#6b7280" />
          <YAxis 
            domain={yAxisConfig.domain}
            ticks={yAxisConfig.ticks}
            tick={<CustomYAxisTick />}
            stroke="#6b7280" 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }} 
            formatter={(value) => [Math.round(value), yKey]}
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
            formatter={(value) => [Math.round(value), valueKey]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}