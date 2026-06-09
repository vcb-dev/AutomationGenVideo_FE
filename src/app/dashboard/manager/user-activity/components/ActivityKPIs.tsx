'use client';

import Image from "next/image";
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Globe } from 'lucide-react';

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
        global: { videos: number, traffic: number, revenue: number, channels: number, videoPct: number, trafficPct: number, revenuePct: number, channelPct: number };
        vn: { videos: number, traffic: number, revenue: number, channels: number, videoPct: number, trafficPct: number, revenuePct: number, channelPct: number };
    } | null;
}

const ActivityKPIs = ({ summary, teamContributions, groupContributions }: ActivityKPIsProps) => {
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const calculatePercentage = (current: number, target: number) => {
        if (!target) return 0;
        return Math.round((current / target) * 100);
    };

    const kpis = [
        {
            title: 'MỤC TIÊU VIDEO',
            value: formatNumber(summary?.totalVideoCompleted || 0),
            total: `${formatNumber(summary?.totalVideoTarget || 0)} Video`,
            percentage: calculatePercentage(summary?.totalVideoCompleted || 0, summary?.totalVideoTarget || 0),
            groupKey: 'videos',
            pctKey: 'videoPct'
        },
        {
            title: 'TỔNG TRAFFIC',
            value: formatNumber(summary?.totalTrafficCompleted || 0),
            total: formatNumber(summary?.totalTrafficTarget || 0),
            percentage: calculatePercentage(summary?.totalTrafficCompleted || 0, summary?.totalTrafficTarget || 0),
            groupKey: 'traffic',
            pctKey: 'trafficPct'
        },
        {
            title: 'TỔNG DOANH THU',
            value: formatNumber(summary?.totalRevenueCompleted || 0),
            total: formatNumber(summary?.totalRevenueTarget || 0),
            percentage: calculatePercentage(summary?.totalRevenueCompleted || 0, summary?.totalRevenueTarget || 0),
            groupKey: 'revenue',
            pctKey: 'revenuePct'
        },
        {
            title: 'SỐ KÊNH ĐANG HOẠT ĐỘNG',
            value: formatNumber(summary?.totalChannels || 0),
            total: `Kênh`,
            percentage: 100,
            groupKey: 'channels',
            pctKey: 'channelPct'
        }
    ];

    const hasAnyKpi = (summary?.totalVideoTarget || 0) + (summary?.totalVideoCompleted || 0) +
        (summary?.totalTrafficTarget || 0) + (summary?.totalTrafficCompleted || 0) +
        (summary?.totalRevenueTarget || 0) + (summary?.totalRevenueCompleted || 0) +
        (summary?.totalChannels || 0) > 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => (
                <Card
                    key={idx}
                    className="relative bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-xl transition-all duration-300"
                >
                    {/* Top accent bar */}
                    <div className={`h-[3px] w-full ${kpi.percentage >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                    <CardContent className="p-5">

                        {/* Header: title + value + ring */}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                                    {kpi.title}
                                </p>
                                <p className="text-[32px] font-semibold text-slate-900 leading-none tracking-tight">
                                    {kpi.value}
                                </p>
                            </div>

                            {kpi.groupKey !== 'channels' ? (
                                <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                                        <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="4.5"
                                            fill="transparent" className="text-slate-100" />
                                        <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="4.5"
                                            fill="transparent"
                                            strokeDasharray={138.2}
                                            strokeDashoffset={138.2 * (1 - kpi.percentage / 100)}
                                            strokeLinecap="round"
                                            className={`transition-all duration-1000 ${kpi.percentage >= 100 ? 'text-emerald-500' : 'text-blue-500'}`}
                                        />
                                    </svg>
                                    <span className="absolute text-[12px] font-medium text-slate-700">
                                        {kpi.percentage}%
                                    </span>
                                </div>
                            ) : (
                                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <Target className="w-5 h-5 text-slate-400" />
                                </div>
                            )}
                        </div>

                        {/* Target row */}
                        {kpi.groupKey !== 'channels' && (
                            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                <Target className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span className="text-[12px] text-slate-500">
                                    Mục tiêu: <span className="font-semibold text-slate-700">{kpi.total}</span>
                                </span>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="border-t border-slate-100 mb-4" />

                        {/* Global / VN breakdown */}
                        <div className="grid grid-cols-2 gap-2.5">

                            {/* Global */}
                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Globe className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[10px] font-medium text-amber-700 uppercase tracking-wide">
                                        Global
                                    </span>
                                </div>
                                <p className="text-[20px] font-semibold text-slate-800 leading-none mb-1">
                                    {formatNumber(groupContributions?.global?.[kpi.groupKey as keyof typeof groupContributions.global] || 0)}
                                </p>
                                {kpi.groupKey !== 'channels' && (
                                    <p className="text-[12px] font-medium text-amber-600">
                                        {groupContributions?.global?.[kpi.pctKey as keyof typeof groupContributions.global] || 0}%
                                    </p>
                                )}
                            </div>

                            {/* VN */}
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Image src="/vn-flag.png" alt="VN"
                                        className="w-[18px] h-3 rounded-sm object-cover"
                                        width={18} height={12} unoptimized
                                    />
                                    <span className="text-[10px] font-medium text-blue-700 uppercase tracking-wide">
                                        Vietnam
                                    </span>
                                </div>
                                <p className="text-[20px] font-semibold text-slate-800 leading-none mb-1">
                                    {formatNumber(groupContributions?.vn?.[kpi.groupKey as keyof typeof groupContributions.vn] || 0)}
                                </p>
                                {kpi.groupKey !== 'channels' && (
                                    <p className="text-[12px] font-medium text-blue-600">
                                        {groupContributions?.vn?.[kpi.pctKey as keyof typeof groupContributions.vn] || 0}%
                                    </p>
                                )}
                            </div>

                        </div>
                    </CardContent>
                </Card>
            ))}
            {!hasAnyKpi && summary && (
                <p className="col-span-full text-center text-xs text-slate-500 mt-2">
                    Nếu toàn bộ số liệu là 0: kiểm tra đã đồng bộ KPI từ Lark chưa và tháng đang chọn có dữ liệu trong Lark.
                </p>
            )}
        </div>
    );
};

export default ActivityKPIs;
