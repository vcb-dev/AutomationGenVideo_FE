'use client';

import Image from "next/image";
import React from 'react';
import { Activity, DollarSign, Trophy } from 'lucide-react';

interface RankingUser {
    rank: number;
    name: string;
    position?: string;
    avatar: string;
    value: string;
}

interface RankingViewProps {
    rankings?: {
        traffic: RankingUser[];
        revenue: RankingUser[];
    };
    dateRange: { start: Date; end: Date };
}

const formatPeriod = ({ start, end }: { start: Date; end: Date }): string => {
    const dayMonth = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
    const lastDayOfMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
    if (sameMonth && start.getDate() === 1 && end.getDate() === lastDayOfMonth) {
        return `Tháng ${start.getMonth() + 1}/${start.getFullYear()}`;
    }
    if (sameMonth && start.getDate() === end.getDate()) return `${dayMonth(start)}/${start.getFullYear()}`;
    return `${dayMonth(start)} – ${dayMonth(end)}/${end.getFullYear()}`;
};

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

const parseRawValue = (val: string): number =>
    parseInt(val.replace(/\D/g, ''), 10) || 0;

const formatGap = (gap: number): string => {
    if (gap >= 1_000_000) return `${(gap / 1_000_000).toFixed(1)}M`;
    if (gap >= 1_000) return `${Math.round(gap / 1_000)}K`;
    return gap.toLocaleString('vi-VN');
};

// Podium visual config: order [#2 left, #1 center, #3 right]
const PODIUM_CFG = [
    {
        avatarSize: 44,
        podiumH: 'h-[52px]',
        podiumGrad: 'from-slate-400 to-slate-300',
        podiumShadow: 'shadow-slate-300/50',
        borderColor: 'border-slate-300',
        ring: '',
        medal: '🥈',
        nameColor: 'text-slate-700',
        valColor: 'text-slate-500',
    },
    {
        avatarSize: 60,
        podiumH: 'h-[80px]',
        podiumGrad: 'from-amber-500 to-yellow-300',
        podiumShadow: 'shadow-amber-400/50',
        borderColor: 'border-amber-400',
        ring: 'ring-2 ring-amber-300/70 ring-offset-1',
        medal: '🥇',
        nameColor: 'text-slate-900',
        valColor: 'text-amber-600',
    },
    {
        avatarSize: 38,
        podiumH: 'h-[36px]',
        podiumGrad: 'from-orange-500 to-amber-300',
        podiumShadow: 'shadow-orange-300/50',
        borderColor: 'border-orange-400',
        ring: '',
        medal: '🥉',
        nameColor: 'text-slate-700',
        valColor: 'text-orange-600',
    },
];

// indices into users array: [#2, #1, #3]
const PODIUM_ORDER = [1, 0, 2];

const AvatarImg = ({ src, name, size, className = '' }: { src: string; name: string; size: number; className?: string }) => (
    <Image
        src={getAvatarUrl(src, name)}
        alt={name}
        width={size}
        height={size}
        className={`object-cover ${className}`}
        unoptimized
        onError={(e) => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        }}
    />
);

const RankingCard = ({
    title,
    subtitle,
    icon: Icon,
    users,
    unit,
    iconBg,
    barColorClass,
    periodLabel,
}: {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    users: RankingUser[];
    unit: string;
    iconBg: string;
    barColorClass: (rank: number) => string;
    periodLabel: string;
}) => {
    // Bục chỉ dựng khi đủ 3 người có số > 0 (danh sách đã sắp giảm dần) — không đưa người số 0 lên bục.
    const hasPodium = users.length >= 3 && parseRawValue(users[2].value) > 0;
    const podiumUsers = hasPodium ? PODIUM_ORDER.map(i => users[i]) : [];
    const listUsers = users.slice(hasPodium ? 3 : 0);

    const maxVal = Math.max(...users.map(u => parseRawValue(u.value)), 1);
    const top1Val = parseRawValue(users[0]?.value || '0');

    return (
        <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-md flex flex-col">

            {/* Dark competitive header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-[14px] font-black text-white tracking-wide uppercase">{title}</h3>
                                <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            </div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{subtitle}</p>
                        </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300 bg-slate-700/50 border border-slate-600/50 rounded-lg px-2.5 py-1 flex-shrink-0">
                        {periodLabel}
                    </span>
                </div>
            </div>

            {users.length === 0 && (
                <div className="flex-1 bg-white px-5 py-10 text-center">
                    <Icon className="w-8 h-8 mx-auto mb-3 text-slate-300" aria-hidden />
                    <p className="text-sm font-semibold text-slate-600">Không có thành viên nào để xếp hạng {unit}</p>
                    <p className="text-xs text-slate-500 mt-1">Team đang lọc chưa có thành viên đang hoạt động — chọn team khác.</p>
                </div>
            )}

            {/* Podium — top 3 */}
            {hasPodium && (
                <div className="bg-gradient-to-b from-slate-100/90 to-slate-50/30 px-5 pt-6 pb-0">
                    <div className="flex items-end justify-center gap-3">
                        {podiumUsers.map((user, pi) => {
                            const cfg = PODIUM_CFG[pi];
                            const isCenter = pi === 1;

                            return (
                                <div key={user.rank} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                                    {/* Crown for #1 */}
                                    {isCenter ? (
                                        <span className="text-xl leading-none mb-0.5 drop-shadow-sm">👑</span>
                                    ) : (
                                        <div className="h-6" />
                                    )}

                                    {/* Avatar */}
                                    <div
                                        style={{ width: cfg.avatarSize, height: cfg.avatarSize }}
                                        className={`rounded-full overflow-hidden border-2 ${cfg.borderColor} ${cfg.ring} bg-white shadow-sm flex-shrink-0`}
                                    >
                                        <AvatarImg
                                            src={user.avatar}
                                            name={user.name}
                                            size={cfg.avatarSize}
                                            className="w-full h-full rounded-full"
                                        />
                                    </div>

                                    {/* Name */}
                                    <p className={`text-center leading-tight px-0.5 truncate w-full text-[10px] font-black ${cfg.nameColor}`}>
                                        {user.name.split(' ').slice(-2).join(' ')}
                                    </p>

                                    {/* Value */}
                                    <p className={`text-[11px] font-black leading-none ${cfg.valColor}`}>
                                        {user.value}
                                    </p>

                                    {/* Podium column */}
                                    <div className={`w-full ${cfg.podiumH} bg-gradient-to-t ${cfg.podiumGrad} rounded-t-xl flex items-end justify-center pb-2 shadow-inner ${cfg.podiumShadow}`}>
                                        <span className="text-base leading-none drop-shadow">{cfg.medal}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {listUsers.length > 0 && (
                <div className="p-4 space-y-2 flex-1 bg-white max-h-[640px] overflow-y-auto">
                    {listUsers.map((user) => {
                        const rawVal = parseRawValue(user.value);
                        const barPct = Math.round((rawVal / maxVal) * 100);
                        const gap = top1Val - rawVal;

                        return (
                            <div
                                key={user.rank}
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/60 transition-all"
                            >
                                {/* Rank badge */}
                                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center text-[11px] font-black flex-shrink-0">
                                    {user.rank}
                                </div>

                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                                    <AvatarImg src={user.avatar} name={user.name} size={36} className="w-full h-full rounded-full" />
                                </div>

                                {/* Name + bar */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-slate-700 truncate leading-tight">{user.name}</p>
                                    <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${barColorClass(user.rank)}`}
                                            style={{ width: `${barPct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Value + gap */}
                                <div className="text-right flex-shrink-0 min-w-[60px]">
                                    <span className="block text-[13px] font-black text-slate-700 tabular-nums">{user.value}</span>
                                    {top1Val > 0 && gap > 0 && rawVal > 0 && (
                                        <span className="block text-[9px] font-semibold text-rose-400 mt-0.5">
                                            -{formatGap(gap)} vs #1
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
};

const RankingView = ({ rankings, dateRange }: RankingViewProps) => {
    const periodLabel = formatPeriod(dateRange);

    const trafficRanking = rankings?.traffic ?? [];
    const revenueRanking = rankings?.revenue ?? [];

    const trafficBarColor = (rank: number) => {
        if (rank === 1) return 'bg-gradient-to-r from-amber-400 to-yellow-400';
        if (rank === 2) return 'bg-gradient-to-r from-slate-300 to-slate-400';
        if (rank === 3) return 'bg-gradient-to-r from-orange-300 to-amber-400';
        return 'bg-blue-300';
    };

    const revenueBarColor = (rank: number) => {
        if (rank === 1) return 'bg-gradient-to-r from-amber-400 to-yellow-400';
        if (rank === 2) return 'bg-gradient-to-r from-slate-300 to-slate-400';
        if (rank === 3) return 'bg-gradient-to-r from-orange-300 to-amber-400';
        return 'bg-emerald-300';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RankingCard
                title="BXH TRAFFIC"
                subtitle={`${trafficRanking.length} thành viên · chưa báo cáo tính 0`}
                icon={Activity}
                users={trafficRanking}
                unit="traffic"
                iconBg="bg-blue-500/20 text-blue-400 border border-blue-400/30"
                barColorClass={trafficBarColor}
                periodLabel={periodLabel}
            />
            <RankingCard
                title="BXH DOANH THU"
                subtitle={`${revenueRanking.length} thành viên · chưa báo cáo tính 0`}
                icon={DollarSign}
                users={revenueRanking}
                unit="doanh thu"
                iconBg="bg-emerald-500/20 text-emerald-400 border border-emerald-400/30"
                barColorClass={revenueBarColor}
                periodLabel={periodLabel}
            />
        </div>
    );
};

export default RankingView;
