'use client';

import Image from "next/image";
import React from 'react';
import { Activity, DollarSign } from 'lucide-react';

interface RankingUser {
    rank: number;
    name: string;
    position?: string;
    avatar: string;
    value: string;
}

const getAvatarUrl = (url: string | null, name: string) => {
    if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    if (url.includes('drive.google.com')) {
        const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
        }
    }
    return url;
};

interface RankingViewProps {
    rankings?: {
        traffic: RankingUser[];
        revenue: RankingUser[];
    };
}

const AVATAR_COLORS = [
    "bg-blue-600 text-white",
    "bg-violet-600 text-white",
    "bg-emerald-600 text-white",
    "bg-orange-500 text-white",
    "bg-teal-600 text-white",
];

const getInitials = (name: string) =>
    name.split(" ").slice(-2).map((n) => n[0]).join("").toUpperCase();

const RANK_STYLES = [
    // #1 — gold
    {
        row: "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/80",
        rank: "bg-amber-400 text-white",
        name: "text-amber-900",
        value: "text-amber-700",
        bar: "bg-amber-400",
        ring: "ring-2 ring-amber-300 ring-offset-1",
    },
    // #2 — silver
    {
        row: "bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200",
        rank: "bg-slate-400 text-white",
        name: "text-slate-800",
        value: "text-slate-600",
        bar: "bg-slate-400",
        ring: "ring-2 ring-slate-300 ring-offset-1",
    },
    // #3 — bronze
    {
        row: "bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80",
        rank: "bg-orange-400 text-white",
        name: "text-orange-900",
        value: "text-orange-700",
        bar: "bg-orange-400",
        ring: "ring-2 ring-orange-300 ring-offset-1",
    },
    // #4+
    {
        row: "bg-white border border-slate-100 hover:bg-slate-50/60",
        rank: "bg-slate-100 text-slate-400",
        name: "text-slate-700",
        value: "text-slate-500",
        bar: "bg-slate-200",
        ring: "",
    },
    {
        row: "bg-white border border-slate-100 hover:bg-slate-50/60",
        rank: "bg-slate-100 text-slate-400",
        name: "text-slate-700",
        value: "text-slate-500",
        bar: "bg-slate-200",
        ring: "",
    },
];

const MEDALS = ["🥇", "🥈", "🥉"];

const RankingCard = ({
    title,
    subtitle,
    icon: Icon,
    users,
    unit,
    accentClass,
    iconBg,
    barColorClass,
}: {
    title: string;
    subtitle: string;
    icon: any;
    users: RankingUser[];
    unit: string;
    accentClass: string;
    iconBg: string;
    barColorClass: (rank: number) => string;
}) => {
    const maxVal = Math.max(...users.map(u => parseFloat(u.value.replace(/[^0-9]/g, '')) || 0), 1);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col">

            {/* Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-bold text-slate-800 tracking-wide">{title}</h3>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{subtitle}</p>
                    </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                    Tháng 2/2026
                </span>
            </div>

            {/* Rows */}
            <div className="p-4 space-y-2.5 flex-1">
                {users.map((user, i) => {
                    const s = RANK_STYLES[Math.min(i, RANK_STYLES.length - 1)];
                    const medal = MEDALS[i];
                    const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    const rawVal = parseFloat(user.value.replace(/[^0-9]/g, '')) || 0;
                    const barPct = Math.round((rawVal / maxVal) * 100);

                    return (
                        <div
                            key={user.rank}
                            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 ${s.row}`}
                        >
                            {/* Rank badge */}
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${s.rank}`}>
                                {medal ? (
                                    <span className="text-base leading-none">{medal}</span>
                                ) : (
                                    <span>{user.rank}</span>
                                )}
                            </div>

                            {/* Avatar — larger */}
                            <div className={`relative flex-shrink-0 rounded-xl overflow-hidden ${s.ring}`}>
                                <div className="w-12 h-12">
                                    <Image
                                        src={getAvatarUrl(user.avatar, user.name)}
                                        alt={user.name}
                                        className="w-12 h-12 rounded-xl object-cover"
                                        width={48}
                                        height={48}
                                        sizes="48px"
                                        unoptimized
                                        onError={(e) => {
                                            const parent = e.currentTarget.parentElement;
                                            if (parent) {
                                                e.currentTarget.style.display = "none";
                                                parent.innerHTML = `<div class="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${avatarColor}">${getInitials(user.name)}</div>`;
                                            }
                                        }}
                                    />
                                </div>
                                {i === 0 && (
                                    <span className="absolute -top-1 -right-1 text-sm leading-none">👑</span>
                                )}
                            </div>

                            {/* Name + bar */}
                            <div className="flex-1 min-w-0">
                                <p className={`text-[13px] font-semibold truncate leading-tight ${s.name}`}>
                                    {user.name}
                                </p>
                                <span className="inline-block text-[9px] font-semibold uppercase tracking-wider text-slate-400 bg-white/80 border border-slate-200 rounded px-1.5 py-0.5 mt-1">
                                    {user.position || "Member"}
                                </span>
                                {/* Mini bar */}
                                <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden w-full">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${barColorClass(user.rank)}`}
                                        style={{ width: `${barPct}%` }}
                                    />
                                </div>
                            </div>

                            {/* Value */}
                            <div className="text-right flex-shrink-0 min-w-[64px]">
                                <span className={`block text-[14px] font-bold leading-tight tabular-nums ${s.value}`}>
                                    {user.value}
                                </span>
                                <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">
                                    {unit}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const RankingView = ({ rankings }: RankingViewProps) => {
    const defaultTraffic: RankingUser[] = [
        { rank: 1, name: 'Quang Đạt', avatar: 'https://i.pravatar.cc/150?u=r1', value: '580,266' },
        { rank: 2, name: 'Nguyễn Toàn', avatar: 'https://i.pravatar.cc/150?u=r2', value: '222,026' },
        { rank: 3, name: 'Nguyễn Phương Thảo', avatar: 'https://i.pravatar.cc/150?u=r3', value: '159,988' },
        { rank: 4, name: 'Nguyễn Quốc Huy', avatar: 'https://i.pravatar.cc/150?u=r4', value: '50,749' },
        { rank: 5, name: 'Nguyễn Văn Đạt', avatar: 'https://i.pravatar.cc/150?u=r5', value: '11,552' },
    ];

    const defaultRevenue: RankingUser[] = [
        { rank: 1, name: 'Nguyễn Phương Thảo', avatar: 'https://i.pravatar.cc/150?u=r3', value: '0' },
        { rank: 2, name: 'Nguyễn Quốc Huy', avatar: 'https://i.pravatar.cc/150?u=r4', value: '0' },
        { rank: 3, name: 'Nguyễn Toàn', avatar: 'https://i.pravatar.cc/150?u=r2', value: '0' },
        { rank: 4, name: 'Nguyễn Văn Đạt', avatar: 'https://i.pravatar.cc/150?u=r5', value: '0' },
        { rank: 5, name: 'Quang Đạt', avatar: 'https://i.pravatar.cc/150?u=r1', value: '0' },
    ];

    const trafficRanking = rankings?.traffic || defaultTraffic;
    const revenueRanking = rankings?.revenue || defaultRevenue;

    const trafficBarColor = (rank: number) => {
        if (rank === 1) return 'bg-gradient-to-r from-amber-400 to-yellow-400';
        if (rank === 2) return 'bg-gradient-to-r from-slate-300 to-slate-400';
        if (rank === 3) return 'bg-gradient-to-r from-orange-300 to-amber-400';
        return 'bg-blue-200';
    };

    const revenueBarColor = (rank: number) => {
        if (rank === 1) return 'bg-gradient-to-r from-amber-400 to-yellow-400';
        if (rank === 2) return 'bg-gradient-to-r from-slate-300 to-slate-400';
        if (rank === 3) return 'bg-gradient-to-r from-orange-300 to-amber-400';
        return 'bg-emerald-200';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RankingCard
                title="BXH TRAFFIC"
                subtitle="Top 5 bùng nổ nhất"
                icon={Activity}
                users={trafficRanking}
                unit="Lượt xem"
                accentClass="text-blue-600"
                iconBg="bg-blue-50 text-blue-600 border border-blue-100"
                barColorClass={trafficBarColor}
            />
            <RankingCard
                title="BXH DOANH THU"
                subtitle="Top 5 bùng nổ nhất"
                icon={DollarSign}
                users={revenueRanking}
                unit="VNĐ"
                accentClass="text-emerald-600"
                iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100"
                barColorClass={revenueBarColor}
            />
        </div>
    );
};

export default RankingView;