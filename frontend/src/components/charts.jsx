"use client"

import { Bar, BarChart, Line, LineChart, Pie, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Area, AreaChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBar, RadialBarChart, Legend, ComposedChart } from "recharts"

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

const chartStyle = {
  bg: "#0f172a",
  border: "#1e293b",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  grid: "#334155"
}

const tooltipStyle = {
  backgroundColor: chartStyle.bg,
  border: `1px solid ${chartStyle.border}`,
  borderRadius: "8px",
  color: chartStyle.text
}

export function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
        <XAxis dataKey="label" stroke={chartStyle.textMuted} fontSize={12} tickLine={false} />
        <YAxis stroke={chartStyle.textMuted} fontSize={12} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${v.toLocaleString('es-CO')}`, 'Ingresos']} />
        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function IncomeLineChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
        <XAxis dataKey="label" stroke={chartStyle.textMuted} fontSize={12} tickLine={false} />
        <YAxis stroke={chartStyle.textMuted} fontSize={12} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${v.toLocaleString('es-CO')}`, 'Ingresos']} />
        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function IncomeAreaChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
        <XAxis dataKey="label" stroke={chartStyle.textMuted} fontSize={12} tickLine={false} />
        <YAxis stroke={chartStyle.textMuted} fontSize={12} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${v.toLocaleString('es-CO')}`, 'Ingresos']} />
        <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ShopsPieChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="income"
          nameKey="shop"
          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${Number(v).toLocaleString('es-CO')}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function SimpleBarChart({ data, dataKey = "value", nameKey = "name", color = "#10b981" }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
        <XAxis type="number" stroke={chartStyle.textMuted} fontSize={12} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <YAxis dataKey={nameKey} type="category" stroke={chartStyle.textMuted} fontSize={12} tickLine={false} width={120} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${v.toLocaleString('es-CO')}`} />
        <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function RadarChartSimple({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke={chartStyle.grid} />
        <PolarAngleAxis dataKey="subject" stroke={chartStyle.textMuted} fontSize={12} />
        <PolarRadiusAxis stroke={chartStyle.textMuted} fontSize={10} />
        <Radar name="Métricas" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function RadialBarChartSimple({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  const dataWithBg = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length]
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" barSize={20} data={dataWithBg}>
        <RadialBar background dataKey="value" label={{ fill: '#e2e8f0', position: 'insideStart', fontSize: 12 }} />
        <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadialBarChart>
    </ResponsiveContainer>
  )
}

export function ComposedChartSimple({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
        <XAxis dataKey="name" stroke={chartStyle.textMuted} fontSize={12} tickLine={false} />
        <YAxis stroke={chartStyle.textMuted} fontSize={12} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="barbers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="clients" stroke="#10b981" strokeWidth={2} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function StackedBarChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
        <XAxis dataKey="name" stroke={chartStyle.textMuted} fontSize={12} tickLine={false} />
        <YAxis stroke={chartStyle.textMuted} fontSize={12} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Bar dataKey="suscripciones" stackId="a" fill="#10b981" />
        <Bar dataKey="occasionales" stackId="a" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MultiLineChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
        <XAxis dataKey="name" stroke={chartStyle.textMuted} fontSize={12} tickLine={false} />
        <YAxis stroke={chartStyle.textMuted} fontSize={12} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} />
        <Line type="monotone" dataKey="citas" stroke="#3b82f6" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function DonutChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-500">No hay datos disponibles</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}