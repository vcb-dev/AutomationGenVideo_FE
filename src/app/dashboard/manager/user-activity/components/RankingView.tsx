'use client';

import Image from "next/image";
import React from 'react';
import { Users, DollarSign } from 'lucide-react';

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
        // Extract ID from various Drive formats
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
   
    const getRankBackground = (rank: number) => {
    if (rank === 1) return "bg-amber-50 border border-amber-200";
    if (rank === 2) return "bg-slate-50 border border-slate-200";
    if (rank === 3) return "bg-orange-50 border border-orange-200";
    return "bg-white border border-slate-100";
    };

    const getRankValueColor = (rank: number) => {
    if (rank === 1) return "text-amber-800";
    if (rank === 2) return "text-slate-600";
    if (rank === 3) return "text-orange-800";
    return "text-slate-700";
    };

    const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
    };

    const AVATAR_COLORS = [
    "bg-blue-600 text-blue-50",
    "bg-green-700 text-green-50",
    "bg-orange-700 text-orange-50",
    "bg-violet-700 text-violet-50",
    "bg-teal-700 text-teal-50",
    ];

    const getInitials = (name: string) =>
    name
        .split(" ")
        .slice(-2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    const RankingCard = ({
    title,
    icon: Icon,
    users,
    }: {
    title: string;
    icon: any;
    users: RankingUser[];
    }) => {
    const isTraffic = title.toUpperCase().includes("TRAFFIC");

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
            <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                isTraffic ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-700"
                }`}
            >
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
                Top 5 bùng nổ nhất
                </p>
            </div>
            </div>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1">
            Tháng 2/2026
            </span>
        </div>

        <div className="h-px bg-slate-100 mb-4" />

        {/* Rows */}
        <div className="space-y-2">
            {users.map((user) => {
            const isTop3 = user.rank <= 3;
            const medal = getMedalEmoji(user.rank);
            const avatarColor = AVATAR_COLORS[(user.rank - 1) % AVATAR_COLORS.length];

            return (
                <div
                key={user.rank}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 hover:brightness-95 ${getRankBackground(user.rank)}`}
                >
                {/* Rank */}
                <div className="w-7 flex-shrink-0 flex items-center justify-center">
                    {medal ? (
                    <span className="text-lg leading-none">{medal}</span>
                    ) : (
                    <span className="text-xs font-semibold text-slate-300">
                        0{user.rank}
                    </span>
                    )}
                </div>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    {user.avatar ? (
                    <Image
                        src={getAvatarUrl(user.avatar, user.name)}
                        alt={user.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        width={40}
                        height={40}
                        sizes="40px"
                        unoptimized
                        onError={(e) => {
                        e.currentTarget.style.display = "none";
                        }}
                    />
                    ) : (
                    <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-semibold ${avatarColor}`}
                    >
                        {getInitials(user.name)}
                    </div>
                    )}
                    {user.rank === 1 && (
                    <span className="absolute -top-1.5 -right-1.5 text-xs leading-none">
                        👑
                    </span>
                    )}
                </div>

                {/* Name + position */}
                <div className="flex-1 min-w-0">
                    <p
                    className={`text-sm font-semibold truncate ${
                        isTop3 ? "text-slate-800" : "text-slate-600"
                    }`}
                    >
                    {user.name}
                    </p>
                    <span className="inline-block text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-px mt-0.5 uppercase tracking-wide">
                    {user.position || "Member"}
                    </span>
                </div>

                {/* Value */}
                <div className="text-right flex-shrink-0">
                    <span
                    className={`block text-sm font-semibold leading-tight ${getRankValueColor(user.rank)}`}
                    >
                    {user.value}
                    </span>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                    {isTraffic ? "Lượt xem" : "VND"}
                    </span>
                </div>
                </div>
            );
            })}
        </div>
        </div>
    );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingCard title="BXH TRAFFIC" icon={Users} users={trafficRanking} />
            <RankingCard title="BXH DOANH THU" icon={DollarSign} users={revenueRanking} />
        </div>
    );
};

export default RankingView;
