'use client';

import Image from "next/image";
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Globe, Video, TrendingUp, DollarSign, Tv2, Flame, CheckCircle2 } from 'lucide-react';

interface ActivityKPIsProps {
    summary?: {
        totalVideoTarget: number;
        totalVideoCompleted: number;
        totalTrafficTarget: number;
        totalTrafficCompleted: number;
        totalRevenueTarget: number;
        totalRevenueCompleted: number;
        totalChannels: number;
    };
    teamContributions?: any[];
    groupContributions?: {
        global: { videos: number; traffic: number; revenue: number; channels: number; videoPct: number; trafficPct: number; revenuePct: number; channelPct: number };
        vn: { videos: number; traffic: number; revenue: number; channels: number; videoPct: number; trafficPct: number; revenuePct: number; channelPct: number };
    } | null;
}

const ActivityKPIs = ({ summary, teamContributions, groupContributions }: ActivityKPIsProps) => {
    const formatNumber = (num: number) =>
        new Intl.NumberFormat('vi-VN').format(num);

    const calculatePercentage = (current: number, target: number) => {
        if (!target) return 0;
        return Math.round((current / target) * 100);
    };

    const kpis = [
        {
            title: 'Video đóng góp',
            value: formatNumber(summary?.totalVideoCompleted || 0),
            target: formatNumber(summary?.totalVideoTarget || 0),
            targetUnit: 'video',
            percentage: calculatePercentage(summary?.totalVideoCompleted || 0, summary?.totalVideoTarget || 0),
            icon: Video,
            accent: 'blue',
            groupKey: 'videos',
            pctKey: 'videoPct',
            isChannel: false,
        },
        {
            title: 'Tổng traffic',
            value: formatNumber(summary?.totalTrafficCompleted || 0),
            target: formatNumber(summary?.totalTrafficTarget || 0),
            targetUnit: 'lượt xem',
            percentage: calculatePercentage(summary?.totalTrafficCompleted || 0, summary?.totalTrafficTarget || 0),
            icon: TrendingUp,
            accent: 'violet',
            groupKey: 'traffic',
            pctKey: 'trafficPct',
            isChannel: false,
        },
        {
            title: 'Doanh thu',
            value: formatNumber(summary?.totalRevenueCompleted || 0),
            target: formatNumber(summary?.totalRevenueTarget || 0),
            targetUnit: 'VNĐ',
            percentage: calculatePercentage(summary?.totalRevenueCompleted || 0, summary?.totalRevenueTarget || 0),
            icon: DollarSign,
            accent: 'emerald',
            groupKey: 'revenue',
            pctKey: 'revenuePct',
            isChannel: false,
        },
        {
            title: 'Kênh hoạt động',
            value: formatNumber(summary?.totalChannels || 0),
            target: null,
            targetUnit: null,
            percentage: 100,
            icon: Tv2,
            accent: 'orange',
            groupKey: 'channels',
            pctKey: 'channelPct',
            isChannel: true,
        },
    ];

    type AccentKey = 'blue' | 'violet' | 'emerald' | 'orange';

    const accentMap: Record<AccentKey, {
        gradient: string;
        iconBg: string;
        iconColor: string;
        ringTrack: string;
        ringFill: string;
        barBg: string;
        barFill: string;
        cardBg: string;
        cardBorder: string;
    }> = {
        blue: {
            gradient: 'from-blue-500 to-blue-600',
            iconBg: 'bg-blue-50 border-blue-100',
            iconColor: 'text-blue-500',
            ringTrack: '#dbeafe',
            ringFill: '#3b82f6',
            barBg: 'bg-blue-100',
            barFill: 'bg-gradient-to-r from-blue-400 to-blue-600',
            cardBg: 'from-blue-50/40 to-white',
            cardBorder: 'border-blue-100',
        },
        violet: {
            gradient: 'from-violet-500 to-purple-600',
            iconBg: 'bg-violet-50 border-violet-100',
            iconColor: 'text-violet-500',
            ringTrack: '#ede9fe',
            ringFill: '#8b5cf6',
            barBg: 'bg-violet-100',
            barFill: 'bg-gradient-to-r from-violet-400 to-purple-600',
            cardBg: 'from-violet-50/40 to-white',
            cardBorder: 'border-violet-100',
        },
        emerald: {
            gradient: 'from-emerald-500 to-teal-600',
            iconBg: 'bg-emerald-50 border-emerald-100',
            iconColor: 'text-emerald-500',
            ringTrack: '#d1fae5',
            ringFill: '#10b981',
            barBg: 'bg-emerald-100',
            barFill: 'bg-gradient-to-r from-emerald-400 to-teal-500',
            cardBg: 'from-emerald-50/40 to-white',
            cardBorder: 'border-emerald-100',
        },
        orange: {
            gradient: 'from-orange-400 to-amber-500',
            iconBg: 'bg-orange-50 border-orange-100',
            iconColor: 'text-orange-500',
            ringTrack: '#ffedd5',
            ringFill: '#f97316',
            barBg: 'bg-orange-100',
            barFill: 'bg-gradient-to-r from-orange-400 to-amber-500',
            cardBg: 'from-orange-50/40 to-white',
            cardBorder: 'border-orange-100',
        },
    };

    const hasAnyKpi =
        (summary?.totalVideoTarget || 0) +
        (summary?.totalVideoCompleted || 0) +
        (summary?.totalTrafficTarget || 0) +
        (summary?.totalTrafficCompleted || 0) +
        (summary?.totalRevenueTarget || 0) +
        (summary?.totalRevenueCompleted || 0) +
        (summary?.totalChannels || 0) > 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {kpis.map((kpi, idx) => {
                const a = accentMap[kpi.accent as AccentKey];
                const Icon = kpi.icon;
                const isDone = kpi.percentage >= 100;
                const isHot = kpi.percentage >= 75 && kpi.percentage < 100;
                const clampedPct = Math.min(kpi.percentage, 100);

                const globalVal = (groupContributions?.global?.[kpi.groupKey as keyof typeof groupContributions.global] as number) || 0;
                const vnVal = (groupContributions?.vn?.[kpi.groupKey as keyof typeof groupContributions.vn] as number) || 0;
                const globalPct = (groupContributions?.global?.[kpi.pctKey as keyof typeof groupContributions.global] as number) || 0;
                const vnPct = (groupContributions?.vn?.[kpi.pctKey as keyof typeof groupContributions.vn] as number) || 0;

                const ringR = 24;
                const ringCirc = 2 * Math.PI * ringR;
                const ringOffset = ringCirc * (1 - clampedPct / 100);
                const ringColor = isDone ? '#10b981' : a.ringFill;
                const ringTrack = isDone ? '#d1fae5' : a.ringTrack;

                return (
                    <Card
                        key={idx}
                        className={`relative bg-gradient-to-b ${a.cardBg} border ${a.cardBorder} rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col`}
                    >
                        {/* Colored gradient top stripe */}
                        <div className={`h-[3px] w-full bg-gradient-to-r ${a.gradient} flex-shrink-0`} />

                        <CardContent className="p-0 flex flex-col flex-1">

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 pt-4 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-2 rounded-xl border ${a.iconBg} flex-shrink-0`}>
                                        <Icon className={`w-4 h-4 ${a.iconColor}`} />
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
                                        {kpi.title}
                                    </p>
                                </div>

                                {/* Status badge */}
                                {!kpi.isChannel && (
                                    isDone ? (
                                        <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-600">
                                            <CheckCircle2 className="w-3 h-3" /> DONE
                                        </span>
                                    ) : isHot ? (
                                        <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-600">
                                            <Flame className="w-3 h-3" /> HOT
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-500">
                                            {kpi.percentage}%
                                        </span>
                                    )
                                )}
                            </div>

                            {/* Main value + ring */}
                            <div className="flex items-center justify-between px-5 pb-3 gap-3">
                                <div className="min-w-0">
                                    <p className="text-[30px] font-extrabold text-slate-900 leading-none tracking-tight tabular-nums truncate">
                                        {kpi.value}
                                    </p>
                                    <div className={`mt-2 flex items-center gap-1 ${kpi.isChannel ? 'invisible' : ''}`}>
                                        <Target className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                        <p className="text-[11px] text-slate-400 leading-tight">
                                            Mục tiêu:&nbsp;
                                            <span className="font-semibold text-slate-600">
                                                {kpi.target} <span className="text-slate-400 font-normal">{kpi.targetUnit}</span>
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* Ring with % inside */}
                                <div className={`flex-shrink-0 ${kpi.isChannel ? 'invisible' : ''}`}>
                                    <svg width="64" height="64" viewBox="0 0 64 64">
                                        <circle
                                            cx="32" cy="32" r={ringR}
                                            fill="none"
                                            stroke={ringTrack}
                                            strokeWidth="6"
                                        />
                                        <circle
                                            cx="32" cy="32" r={ringR}
                                            fill="none"
                                            stroke={ringColor}
                                            strokeWidth="6"
                                            strokeDasharray={ringCirc}
                                            strokeDashoffset={ringOffset}
                                            strokeLinecap="round"
                                            transform="rotate(-90 32 32)"
                                            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)' }}
                                        />
                                        <text
                                            x="32" y="37"
                                            textAnchor="middle"
                                            fontSize="12"
                                            fontWeight="800"
                                            fill={ringColor}
                                        >
                                            {isDone ? '✓' : `${clampedPct}%`}
                                        </text>
                                    </svg>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="px-5 pb-4">
                                {kpi.isChannel ? (
                                    <div className="h-2" />
                                ) : (
                                    <div className={`w-full h-2 rounded-full ${a.barBg} overflow-hidden shadow-inner`}>
                                        <div
                                            className={`h-full rounded-full ${isDone ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : a.barFill} transition-all duration-700`}
                                            style={{ width: `${clampedPct}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="mx-5 h-px bg-slate-100" />

                            {/* Global / VN breakdown */}
                            <div className="grid grid-cols-2 gap-2 p-4">
                                <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                        <Globe className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                        <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Global</span>
                                    </div>
                                    <p className="text-[16px] font-bold text-slate-800 leading-none tabular-nums">
                                        {formatNumber(globalVal)}
                                    </p>
                                    <p className={`text-[10px] font-semibold text-amber-500 leading-none ${kpi.isChannel ? 'invisible' : ''}`}>
                                        {globalPct}%
                                    </p>
                                </div>

                                <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                        <Image src="/vn-flag.png" alt="VN"
                                            className="w-[14px] h-[10px] rounded-[2px] object-cover flex-shrink-0"
                                            width={14} height={10} unoptimized
                                        />
                                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Vietnam</span>
                                    </div>
                                    <p className="text-[16px] font-bold text-slate-800 leading-none tabular-nums">
                                        {formatNumber(vnVal)}
                                    </p>
                                    <p className={`text-[10px] font-semibold text-blue-500 leading-none ${kpi.isChannel ? 'invisible' : ''}`}>
                                        {vnPct}%
                                    </p>
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                );
            })}

            {!hasAnyKpi && summary && (
                <p className="col-span-full text-center text-xs text-slate-400 mt-2">
                    Toàn bộ số liệu đang là 0 — kiểm tra đã đồng bộ KPI từ Lark chưa và tháng đang chọn có dữ liệu chưa.
                </p>
            )}
        </div>
    );
};

export default ActivityKPIs;
