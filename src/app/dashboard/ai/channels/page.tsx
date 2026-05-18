"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
    RefreshCw, Youtube, Instagram, Facebook, Globe, Loader2,
    Eye, Heart, MessageSquare, Share2, Video, TrendingUp, Users, ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.05a8.16 8.16 0 0 0 4.77 1.52V7.12a4.85 4.85 0 0 1-1-.43z"/>
    </svg>
);

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; light: string; text: string }> = {
    all:       { label: "Tất cả",    color: "#7c3aed", icon: <Globe size={15}/>,     light: "bg-violet-50 border-violet-200",  text: "text-violet-700" },
    facebook:  { label: "Facebook",  color: "#1877f2", icon: <Facebook size={15}/>,  light: "bg-blue-50 border-blue-200",       text: "text-blue-700" },
    instagram: { label: "Instagram", color: "#e1306c", icon: <Instagram size={15}/>, light: "bg-pink-50 border-pink-200",        text: "text-pink-700" },
    tiktok:    { label: "TikTok",    color: "#111827", icon: <TikTokIcon/>,           light: "bg-gray-100 border-gray-300",       text: "text-gray-800" },
    youtube:   { label: "YouTube",   color: "#dc2626", icon: <Youtube size={15}/>,   light: "bg-red-50 border-red-200",          text: "text-red-700" },
};

const CHART_COLORS = ["#7c3aed","#1877f2","#e1306c","#dc2626","#059669","#d97706","#0ea5e9"];

function fmt(n: any): string {
    const v = Number(n) || 0;
    if (v >= 1_000_000) return (v/1_000_000).toFixed(1)+"M";
    if (v >= 1_000)     return (v/1_000).toFixed(1)+"K";
    return String(v);
}

function KpiCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub?: string }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "15", color }}>
                    {icon}
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-0.5">{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-violet-500"/>
            <h3 className="text-sm font-semibold text-gray-700">{children}</h3>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color }} className="font-medium">{fmt(p.value)}</p>
            ))}
        </div>
    );
};

export default function ChannelAnalyticsPage() {
    const [platform, setPlatform] = useState("all");
    const [channels, setChannels] = useState<any[]>([]);
    const [stats, setStats]       = useState<any>(null);
    const [loading, setLoading]   = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [search, setSearch]     = useState("");

    const today = new Date();
    const [year]  = useState(today.getFullYear());
    const [month] = useState(today.getMonth() + 1);

    const loadChannels = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/ai/channels?platform=${platform === "all" ? "" : platform}&limit=200`);
            setChannels(Array.isArray(data) ? data : []);
        } catch { setChannels([]); }
        finally { setLoading(false); }
    }, [platform]);

    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const { data } = await apiClient.get(`/ai/social-stats?year=${year}&month=${month}&platform=${platform === "all" ? "" : platform}`);
            setStats(data);
        } catch { setStats(null); }
        finally { setStatsLoading(false); }
    }, [platform, year, month]);

    useEffect(() => { loadChannels(); loadStats(); }, [loadChannels, loadStats]);

    const filtered = channels.filter(c => {
        const p = (c.platform || "").toLowerCase();
        const matchP = platform === "all" || p.includes(platform);
        const matchS = !search || c.display_name?.toLowerCase().includes(search.toLowerCase())
                                || c.owner_name?.toLowerCase().includes(search.toLowerCase());
        const status = (c.status || "").toUpperCase().trim();
        const isActive = status === "ON" || status === "ĐANG HOẠT ĐỘNG" || status === "";
        const name = (c.display_name || "").trim();
        const hasValidName = name !== "" && name.toUpperCase() !== "N/A";
        return matchP && matchS && isActive && hasValidName;
    });

    const platformStats = Object.entries(
        channels.reduce((acc: Record<string,number>, ch) => {
            const p = (ch.platform||"Other").split(" ")[0];
            acc[p] = (acc[p]||0)+1; return acc;
        }, {})
    ).map(([name,value]) => ({name, value})).sort((a,b) => b.value-a.value);

    const summary = stats?.summary || {};
    const byTeam  = (stats?.by_team || []).slice(0, 8).map((t: any) => ({ team: t.team || 'N/A', views: Number(t.views)||0 }));
    const byPlatform = (stats?.by_platform || []).map((p: any) => ({ name: p.platform, views: Number(p.views)||0 }));
    const hasStats = Number(summary.total_videos) > 0;

    const isLoading = loading || statsLoading;

    return (
        <div className="min-h-screen bg-gray-50 p-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kênh Viễn Chí Bảo</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Thống kê tháng <span className="font-semibold text-violet-600">{month}/{year}</span>
                    </p>
                </div>
                <button onClick={() => { loadChannels(); loadStats(); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium shadow-sm transition-all hover:shadow">
                    <RefreshCw size={14} className={isLoading ? "animate-spin text-violet-500" : ""}/>
                    Làm mới
                </button>
            </div>

            {/* ── Platform Tabs ── */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => setPlatform(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                            platform === key
                                ? `${cfg.light} ${cfg.text} shadow-sm`
                                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}>
                        {cfg.icon}{cfg.label}
                    </button>
                ))}
            </div>

            {/* ── Traffic KPIs ── */}
            {statsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {Array.from({length:6}).map((_,i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-pulse">
                            <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"/>
                            <div className="h-8 bg-gray-100 rounded w-1/2"/>
                        </div>
                    ))}
                </div>
            ) : hasStats ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                        <KpiCard icon={<Eye size={16}/>}          label="Tổng Views"    value={fmt(summary.total_views)}    color="#7c3aed"/>
                        <KpiCard icon={<Heart size={16}/>}        label="Tổng Likes"    value={fmt(summary.total_likes)}    color="#e1306c"/>
                        <KpiCard icon={<MessageSquare size={16}/>}label="Comments"      value={fmt(summary.total_comments)} color="#0ea5e9"/>
                        <KpiCard icon={<Share2 size={16}/>}       label="Shares"        value={fmt(summary.total_shares)}   color="#059669"/>
                        <KpiCard icon={<Video size={16}/>}        label="Videos"        value={fmt(summary.total_videos)}   color="#d97706"/>
                        <KpiCard icon={<Users size={16}/>}        label="Kênh có data"  value={fmt(summary.channels)}       color="#7c3aed"/>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <SectionTitle>Views theo nền tảng</SectionTitle>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={byPlatform} margin={{top:4,right:8,left:-10,bottom:0}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                                    <XAxis dataKey="name" tick={{fill:"#6b7280",fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis tick={{fill:"#6b7280",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmt}/>
                                    <Tooltip content={<CustomTooltip/>}/>
                                    <Bar dataKey="views" radius={[6,6,0,0]}>
                                        {byPlatform.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <SectionTitle>Views theo team (top 8)</SectionTitle>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={byTeam} layout="vertical" margin={{top:4,right:20,left:4,bottom:0}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
                                    <XAxis type="number" tick={{fill:"#6b7280",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmt}/>
                                    <YAxis type="category" dataKey="team" tick={{fill:"#374151",fontSize:10}} width={70} axisLine={false} tickLine={false}/>
                                    <Tooltip content={<CustomTooltip/>}/>
                                    <Bar dataKey="views" fill="#7c3aed" radius={[0,6,6,0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top 10 videos */}
                    {(stats?.top_views||[]).length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
                            <SectionTitle>Top 10 video Views cao nhất — tháng {month}/{year}</SectionTitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            {["#","Tên video","Kênh","Team","Views","Likes","Cmt","Ngày đăng"].map(h =>
                                                <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(stats?.top_views||[]).map((v:any, i:number) => (
                                            <tr key={i} className={`border-b border-gray-100 hover:bg-violet-50/30 transition-colors ${i%2===0?"bg-gray-50/50":""}`}>
                                                <td className="py-2.5 px-3 text-gray-400 font-mono text-xs">{i+1}</td>
                                                <td className="py-2.5 px-3 max-w-[200px]">
                                                    {v.video_url
                                                        ? <a href={v.video_url} target="_blank" className="text-gray-800 hover:text-violet-600 flex items-center gap-1 font-medium truncate">
                                                            <span className="truncate">{v.title||"(no title)"}</span>
                                                            <ExternalLink size={10} className="shrink-0 opacity-50"/>
                                                          </a>
                                                        : <span className="text-gray-700 font-medium truncate block">{v.title||"(no title)"}</span>
                                                    }
                                                </td>
                                                <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap text-xs">{v.channel_name}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-md font-medium">{v.team||"—"}</span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="text-violet-700 font-bold text-sm">{fmt(v.views)}</span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="text-pink-600 font-semibold">{fmt(v.likes)}</span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="text-blue-600 font-semibold">{fmt(v.comments)}</span>
                                                </td>
                                                <td className="py-2.5 px-3 text-gray-400 text-xs whitespace-nowrap">{(v.published_at||"").slice(0,10)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 mb-6 text-center">
                    <Video size={32} className="text-gray-300 mx-auto mb-3"/>
                    <p className="text-gray-500 text-sm">Chưa có dữ liệu traffic tháng {month}/{year}</p>
                    <p className="text-gray-400 text-xs mt-1">Chạy script crawl để có dữ liệu</p>
                </div>
            )}

            {/* ── Channel summary KPIs ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { label: "Tổng kênh",  value: fmt(filtered.length), color: "#7c3aed", icon: <Globe size={16}/> },
                    { label: "Facebook",   value: fmt(channels.filter(c=>(c.platform||"").toLowerCase().includes("facebook")).length), color: "#1877f2", icon: <Facebook size={16}/> },
                    { label: "TikTok",     value: fmt(channels.filter(c=>(c.platform||"").toLowerCase().includes("tiktok")).length), color: "#111827", icon: <TikTokIcon/> },
                    { label: "YouTube",    value: fmt(channels.filter(c=>(c.platform||"").toLowerCase().includes("youtube")).length), color: "#dc2626", icon: <Youtube size={16}/> },
                ].map((k,i) => <KpiCard key={i} icon={k.icon} label={k.label} value={k.value} color={k.color}/>)}
            </div>

            {/* ── Channel charts ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <SectionTitle>Số kênh theo nền tảng</SectionTitle>
                    {loading ? (
                        <div className="h-44 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-violet-400"/></div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={platformStats} margin={{top:4,right:8,left:-10,bottom:0}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                                <XAxis dataKey="name" tick={{fill:"#6b7280",fontSize:11}} axisLine={false} tickLine={false}/>
                                <YAxis tick={{fill:"#6b7280",fontSize:10}} axisLine={false} tickLine={false}/>
                                <Tooltip content={<CustomTooltip/>}/>
                                <Bar dataKey="value" radius={[6,6,0,0]}>
                                    {platformStats.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <SectionTitle>Phân bổ kênh theo nền tảng</SectionTitle>
                    {loading ? (
                        <div className="h-44 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-violet-400"/></div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie data={platformStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={25}
                                    label={({name,percent}) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`} labelLine={true}>
                                    {platformStats.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                                </Pie>
                                <Tooltip content={<CustomTooltip/>}/>
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Channel list ── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <SectionTitle>Danh sách kênh ({filtered.length})</SectionTitle>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm kênh..."
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 w-48 transition-all"/>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-violet-400"/></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Không tìm thấy kênh nào</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    {["Tên kênh","Nền tảng","Owner","Team"].map(h =>
                                        <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.slice(0,100).map((ch,i) => {
                                    const p = (ch.platform||"").toLowerCase();
                                    const cfg = Object.entries(PLATFORM_CONFIG).find(([k]) => k !== 'all' && p.includes(k))?.[1] ?? PLATFORM_CONFIG.all;
                                    return (
                                        <tr key={i} className={`border-b border-gray-100 hover:bg-violet-50/30 transition-colors ${i%2===0?"":"bg-gray-50/30"}`}>
                                            <td className="py-3 px-3 font-medium text-gray-800">{(ch.display_name||"").trim() || "—"}</td>
                                            <td className="py-3 px-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${cfg.light} ${cfg.text}`}>
                                                    {cfg.icon}<span>{ch.platform}</span>
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-gray-600">{ch.owner_name||"—"}</td>
                                            <td className="py-3 px-3">
                                                {ch.team
                                                    ? <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-1 rounded-md font-medium">{ch.team}</span>
                                                    : <span className="text-xs text-gray-400">—</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length > 100 && (
                            <p className="text-center text-xs text-gray-400 mt-4 py-2 border-t border-gray-100">
                                Hiển thị 100 / {filtered.length} kênh
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
