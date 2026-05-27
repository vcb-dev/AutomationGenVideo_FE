"use client";

import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"];

// Parse AI-formatted strings like "5.9M", "44.7K", "201.2K đ" → raw number for charts
function parseChartValue(v: unknown): number {
    if (typeof v === "number") return v;
    if (typeof v !== "string") return 0;
    const s = v.replace(/[đ\s,]/g, "").trim();
    const m = s.match(/^([\d.]+)([KkMmBbTt]?)$/);
    if (!m) return parseFloat(s) || 0;
    const n = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    if (unit === "K") return n * 1_000;
    if (unit === "M") return n * 1_000_000;
    if (unit === "B" || unit === "T") return n * 1_000_000_000;
    return n;
}

// Normalise chart data so yKey is always a number
function normaliseChartData(data: any[], yKey: string): any[] {
    return data.map((row) => ({ ...row, [yKey]: parseChartValue(row[yKey]) }));
}

// Format a raw number for tooltip display
function fmtNumber(v: number): string {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return v.toLocaleString();
}

interface Block {
    type: "kpi_card" | "bar" | "line" | "pie" | "table";
    title?: string;
    xKey?: string;
    yKey?: string;
    color?: string;
    columns?: string[];
    data: any[];
}

interface Dashboard {
    layout: "single" | "mixed";
    blocks: Block[];
}

function KpiCards({ data }: { data: { label: string; value: string; trend?: string; trendUp?: boolean }[] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1 font-medium">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                    {item.trend && !['n/a', 'null', 'undefined', '-'].includes(item.trend.toLowerCase()) && (
                        <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${item.trendUp ? "text-emerald-600" : item.trendUp === false ? "text-red-500" : "text-gray-400"}`}>
                            {item.trendUp === true ? <TrendingUp size={12} /> : item.trendUp === false ? <TrendingDown size={12} /> : <Minus size={12} />}
                            {item.trend}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function ChartWrapper({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            {title && <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>}
            {children}
        </div>
    );
}

function DataTable({ title, columns, data }: { title?: string; columns: string[]; data: any[] }) {
    return (
        <ChartWrapper title={title}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200">
                            {columns.map((col) => (
                                <th key={col} className="text-left py-2 px-3 text-gray-500 font-semibold text-xs uppercase tracking-wide">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                {columns.map((col) => (
                                    <td key={col} className="py-2.5 px-3 text-gray-700 text-sm">{row[col] ?? "—"}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ChartWrapper>
    );
}

function renderBlock(block: Block, idx: number) {
    switch (block.type) {
        case "kpi_card":
            return <KpiCards key={idx} data={block.data} />;

        case "bar": {
            const yKey = block.yKey ?? "value";
            const xKey = block.xKey ?? "name";
            const chartData = normaliseChartData(block.data, yKey);
            return (
                <ChartWrapper key={idx} title={block.title}>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey={xKey} tick={{ fill: "#6b7280", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={fmtNumber} />
                            <Tooltip
                                formatter={(v: unknown) => [fmtNumber(Number(v)), yKey]}
                                contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            />
                            <Bar dataKey={yKey} fill={block.color ?? "#8b5cf6"} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartWrapper>
            );
        }

        case "line": {
            const yKey = block.yKey ?? "value";
            const xKey = block.xKey ?? "date";
            const chartData = normaliseChartData(block.data, yKey);
            return (
                <ChartWrapper key={idx} title={block.title}>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey={xKey} tick={{ fill: "#6b7280", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={fmtNumber} />
                            <Tooltip
                                formatter={(v: unknown) => [fmtNumber(Number(v)), yKey]}
                                contentStyle={{ background: "#1e1e2e", border: "1px solid #ffffff20", borderRadius: 8 }}
                            />
                            <Line type="monotone" dataKey={yKey} stroke={block.color ?? "#06b6d4"} strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartWrapper>
            );
        }

        case "pie": {
            const pieData = block.data.map((d) => ({ ...d, value: parseChartValue(d.value) }));
            return (
                <ChartWrapper key={idx} title={block.title}>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: unknown) => fmtNumber(Number(v))} contentStyle={{ background: "#1e1e2e", border: "1px solid #ffffff20", borderRadius: 8 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartWrapper>
            );
        }

        case "table":
            return <DataTable key={idx} title={block.title} columns={block.columns ?? []} data={block.data} />;

        default:
            return null;
    }
}

export default function DynamicDashboard({ dashboard }: { dashboard: Dashboard }) {
    if (!dashboard?.blocks?.length) return null;

    return (
        <div className={`mt-3 flex flex-col gap-3 ${dashboard.layout === "mixed" ? "" : ""}`}>
            {dashboard.blocks.map((block, i) => renderBlock(block, i))}
        </div>
    );
}
