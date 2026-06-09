'use client';

import Image from "next/image";
import React from 'react';
import { AlertCircle, Target, CheckCircle2, UserCircle, Users, Clock, CalendarDays, TrendingUp, Banknote, Circle } from 'lucide-react';

interface UserActivity {
    name: string;
    position?: string;
    team: string;
    avatar: string;
    time: string;
    dailyGoal: number;
    done: number;
    traffic: string;
    revenue: string;
    reportStatus: string;
    monthlyProgress: number;
    kpi_month?: number;
    completed_month?: number;
    task_progress?: {
        task_auto: number;
        task_new: number;
        kpi_status: string;
    } | null;
}

interface UserActivityCardProps {
    data: UserActivity;
    onClick?: () => void;
    canClick?: boolean;
    isActive?: boolean;
    timeType?: string;
}

const getAvatarUrl = (url: string | null, name: string) => {
    if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    if (url.includes('drive.google.com')) {
        const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
        }
    }
    // Strip auth params from Google user content URLs to avoid 403 Forbidden
    if (url.includes('googleusercontent.com')) {
        try {
            const urlObj = new URL(url);
            urlObj.searchParams.delete('authuser');
            urlObj.searchParams.delete('sz');
            return urlObj.toString().replace(/=[sw]\d+(-[sw]\d+)*(?=[?#]|$)/, '=w200');
        } catch {
            return url;
        }
    }
    return url;
};

const UserActivityCard = React.memo(({ data, onClick, canClick = true, isActive }: UserActivityCardProps) => {
    const dailyGoal = Number(data.dailyGoal) || 0;
    const done = Number(data.done) || 0;

    // KPI màu card: chỉ dựa trên Đã xong vs Mục tiêu ngày (không trộn với trạng thái báo cáo / traffic).
    let statusType: 'neutral' | 'completed' | 'exceeded' = 'neutral';
    if (dailyGoal > 0) {
        if (done > dailyGoal) statusType = 'exceeded';
        else if (done >= dailyGoal) statusType = 'completed';
        else statusType = 'neutral';
    }

    const statusStyles = {
        neutral: {
            card: `border-red-500 border-[3px] bg-red-100/40 ${canClick ? 'hover:bg-red-100/60 transition-all shadow-[0_8px_30px_rgba(239,68,68,0.08)]' : ''}`,
            avatar: 'border-slate-200 ring-2 ring-slate-100',
            icon: 'text-slate-500',
            badge: 'bg-slate-600 text-white',
            text: 'text-slate-800',
            doneRow: 'text-slate-800',
            glow: canClick ? 'hover:shadow-red-300/40' : '',
            accent: 'bg-red-100/60'
        },
        completed: {
            card: `border-emerald-500 border-[3px] bg-emerald-100/70 ${canClick ? 'hover:bg-emerald-100/90 transition-all shadow-[0_8px_30px_rgba(16,185,129,0.1)]' : ''}`,
            avatar: 'border-emerald-500 ring-4 ring-emerald-100',
            icon: 'text-emerald-500',
            badge: 'bg-emerald-600 text-white',
            text: 'text-emerald-600',
            doneRow: 'text-emerald-700',
            glow: canClick ? 'hover:shadow-emerald-300/40' : '',
            accent: 'bg-emerald-100'
        },
        exceeded: {
            // Vượt mục tiêu: cùng nền xanh với đạt mục tiêu (chỉ khác accent tím ở vài ô con)
            card: `border-emerald-500 border-[3px] bg-emerald-100/70 ${canClick ? 'hover:bg-emerald-100/90 transition-all shadow-[0_8px_30px_rgba(16,185,129,0.1)]' : ''}`,
            avatar: 'border-emerald-500 ring-4 ring-emerald-100',
            icon: 'text-emerald-600',
            badge: 'bg-emerald-600 text-white',
            text: 'text-emerald-700',
            doneRow: 'text-purple-700',
            glow: canClick ? 'hover:shadow-emerald-300/40' : '',
            accent: 'bg-emerald-100'
        }
    };

    const style = statusStyles[statusType];
    const isReportedOnTime = data.reportStatus === 'ĐÚNG HẠN' || data.reportStatus === 'ĐÃ XONG' || data.reportStatus === 'ĐÃ BÁO CÁO ĐỦ' || data.reportStatus === 'SUBMITTED';

    // Flag background - match exact team names from backend
    const getFlagBg = () => {
        const t = (data.team || '').toLowerCase();
        if (t.includes('indo')) return '/indo-flag.png';
        if (t.includes('- jp') || t.includes(' jp')) return '/japan-flag.png';
        if (t.includes('th') && t.includes('lan')) return '/thailand-flag.png';
        if (t.includes('loan') || t.includes('taiwan')) return '/taiwan-flag.png';
        return '/vn-flag.png';
    };
    const flagBg = getFlagBg();

    const valueColorClass = statusType === 'neutral' ? 'text-rose-600' : statusType === 'exceeded' ? 'text-purple-600' : 'text-emerald-600';

    return (
    <div
        onClick={canClick ? onClick : undefined}
        style={{ width: "calc(100% - 6px)", margin: "0 auto" }}
        className={`
        relative rounded-2xl overflow-hidden border transition-all duration-200
        ${canClick ? "cursor-pointer active:scale-[0.99]" : "cursor-default"}
        ${
            isActive
            ? "border-blue-300 shadow-md shadow-blue-100/60 scale-[1.005] z-10"
            : canClick
            ? "border-slate-200 hover:border-slate-300 hover:shadow-sm"
            : "border-slate-100"
        }
        bg-white
        `}
    >
        {/* Status color strip */}
        <div
        className={`absolute top-0 left-0 right-0 h-0.5 ${
            statusType === "exceeded"
            ? "bg-purple-400"
            : statusType === "completed"
            ? "bg-emerald-400"
            : "bg-rose-400"
        }`}
        />

        <div className="p-4 flex flex-col gap-3 pt-5">

        {/* ── TOP ROW ── */}
        <div className="flex items-start gap-3">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
            <div className="w-[52px] h-[52px] rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                <Image
                src={getAvatarUrl(data.avatar, data.name)}
                alt={data.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`;
                }}
                width={52}
                height={52}
                unoptimized
                />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
            <h4 className="text-[15px] font-semibold text-slate-800 leading-snug truncate">
                {data.name}
            </h4>
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {data.position && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                    <UserCircle className="w-2.5 h-2.5" />
                    {data.position}
                </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                <Users className="w-2.5 h-2.5 text-blue-400" />
                {data.team}
                {data.team?.toLowerCase().includes("thái lan") && (
                    <Image src="/thailand-flag.png" alt="TH" className="w-3 h-2 object-contain" width={12} height={8} unoptimized />
                )}
                {data.team?.toLowerCase().includes("global - indo") && (
                    <Image src="/indo-flag.png" alt="INDO" className="w-3 h-2 object-contain" width={12} height={8} unoptimized />
                )}
                {data.team?.toLowerCase().includes("việt nam") && (
                    <Image src="/vn-flag.png" alt="VN" className="w-3 h-2 object-contain" width={12} height={8} unoptimized />
                )}
                {(data.team?.toLowerCase().includes("jp") || data.team?.toLowerCase().includes("nhật bản")) && (
                    <Image src="/japan-flag.png" alt="JP" className="w-3 h-2 object-contain" width={12} height={8} unoptimized />
                )}
                {data.team?.toLowerCase().includes("đài loan") && (
                    <Image src="/taiwan-flag.png" alt="TW" className="w-3.5 h-2.5 object-contain" width={14} height={10} unoptimized />
                )}
                </span>
            </div>
            </div>

            {/* Status badge */}
            <div className="flex-shrink-0">
            {statusType === "exceeded" ? (
                <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-md border border-purple-200">
                <Target className="w-3 h-3 text-purple-600" />
                <span className="text-[10px] font-semibold text-purple-600 hidden sm:inline">Top</span>
                </div>
            ) : statusType === "completed" ? (
                <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span className="text-[10px] font-semibold text-emerald-600 hidden sm:inline">Done</span>
                </div>
            ) : (
                <div className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                <AlertCircle className="w-3 h-3 text-rose-500" />
                <span className="text-[10px] font-semibold text-rose-500 hidden sm:inline">Late</span>
                </div>
            )}
            </div>
        </div>

        {/* ── REPORT BANNER ── */}
        <div
            className={`w-full px-3 py-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 ${
            isReportedOnTime
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-600 border border-rose-200"
            }`}
        >
            {isReportedOnTime
            ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            }
            <span className="truncate">{data.reportStatus || "Chưa báo cáo"}</span>
        </div>

        {/* ── METRICS ── */}
        <div className="w-full rounded-xl overflow-hidden border border-slate-100 divide-y divide-slate-100">
            {[
            { icon: <CalendarDays className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />, label: "Mục tiêu tháng", value: data.kpi_month ?? 0 },
            { icon: <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />, label: "Mục tiêu ngày", value: dailyGoal },
            { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />, label: "Đã xong", value: done },
            ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center justify-between px-3 py-2 bg-white">
                <span className="flex items-center gap-2 text-[12px] text-slate-400">
                {icon}
                <span>{label}</span>
                </span>
                <span className={`text-[13px] font-semibold tabular-nums ${valueColorClass}`}>
                {value}
                </span>
            </div>
            ))}
        </div>

        {/* ── PROGRESS BAR ── */}
        <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-400 uppercase tracking-wide">Tiến độ tháng</span>
            <span
                className={`text-[12px] font-semibold tabular-nums ${
                statusType === "neutral"
                    ? "text-rose-500"
                    : statusType === "exceeded"
                    ? "text-purple-600"
                    : "text-emerald-600"
                }`}
            >
                {data.monthlyProgress}%
            </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ${
                statusType === "neutral"
                    ? "bg-rose-400"
                    : statusType === "exceeded"
                    ? "bg-purple-500"
                    : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(data.monthlyProgress, 100)}%` }}
            />
            </div>
        </div>

        {/* ── TRAFFIC & REVENUE ── */}
        <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="text-[10px] font-medium text-blue-500 uppercase tracking-wide">Traffic</span>
            </div>
            <div className="text-[18px] font-semibold text-blue-800 tabular-nums leading-none truncate">
                {data.traffic}
            </div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <div className="flex items-center gap-1.5 mb-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Doanh thu</span>
            </div>
            <div className="text-[18px] font-semibold text-emerald-800 tabular-nums leading-none truncate">
                {data.revenue}
            </div>
            </div>
        </div>

        </div>
    </div>
    );
});

UserActivityCard.displayName = 'UserActivityCard';

export default UserActivityCard;
export type { UserActivity };
