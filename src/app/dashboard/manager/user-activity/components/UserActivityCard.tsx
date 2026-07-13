'use client';

import Image from "next/image";
import React from 'react';
import { AlertCircle, Target, CheckCircle2, Users, CalendarDays, TrendingUp, Sun, MousePointerClick, CircleDollarSign, CheckCircle2Icon, User } from 'lucide-react';

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
            card: `border-red-400 border-2 bg-gradient-to-b from-red-50/90 to-red-100/60 ${canClick ? 'hover:from-red-50 hover:to-red-100/80 transition-all shadow-[0_8px_30px_rgba(239,68,68,0.12)]' : ''}`,
            avatar: 'ring-[3px] ring-red-400/70',
            icon: 'text-slate-500',
            badge: 'bg-slate-600 text-white',
            text: 'text-slate-800',
            doneRow: 'text-slate-800',
            glow: canClick ? 'hover:shadow-red-300/50' : '',
            accent: 'bg-red-50/80 border-red-200/60',
            metricText: 'text-rose-600',
            progressGrad: 'bg-gradient-to-r from-red-400 to-rose-500',
        },
        completed: {
            card: `border-emerald-400 border-2 bg-gradient-to-b from-emerald-50/90 to-emerald-100/70 ${canClick ? 'hover:from-emerald-50 hover:to-emerald-100/90 transition-all shadow-[0_8px_30px_rgba(16,185,129,0.12)]' : ''}`,
            avatar: 'ring-[3px] ring-emerald-400/70',
            icon: 'text-emerald-500',
            badge: 'bg-emerald-600 text-white',
            text: 'text-emerald-600',
            doneRow: 'text-emerald-700',
            glow: canClick ? 'hover:shadow-emerald-300/50' : '',
            accent: 'bg-emerald-50/80 border-emerald-200/60',
            metricText: 'text-emerald-600',
            progressGrad: 'bg-gradient-to-r from-emerald-400 to-teal-500',
        },
        exceeded: {
            card: `border-emerald-400 border-2 bg-gradient-to-b from-emerald-50/90 to-emerald-100/70 ${canClick ? 'hover:from-emerald-50 hover:to-emerald-100/90 transition-all shadow-[0_8px_30px_rgba(16,185,129,0.12)]' : ''}`,
            avatar: 'ring-[3px] ring-purple-400/70',
            icon: 'text-emerald-600',
            badge: 'bg-emerald-600 text-white',
            text: 'text-emerald-700',
            doneRow: 'text-purple-700',
            glow: canClick ? 'hover:shadow-emerald-300/50' : '',
            accent: 'bg-emerald-50/80 border-emerald-200/60',
            metricText: 'text-purple-600',
            progressGrad: 'bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500',
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

    return (
        <div
            onClick={canClick ? onClick : undefined}
            style={{ width: 'calc(100% - 7px)', margin: '0 auto' }}
            className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${canClick ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-default'} ${style.card} ${isActive
                ? 'ring-4 ring-blue-500/20 shadow-2xl scale-[1.02] z-10 border-blue-500'
                : `${style.glow}`
                }`}>

            {/* Corner Flag Background */}
            <div className="absolute top-0 left-0 pointer-events-none z-10" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))' }}>
                <div
                    style={{
                        width: '130px',
                        height: '100px',
                        backgroundImage: `url(${flagBg})`,
                        backgroundSize: '130px 85px',
                        backgroundPosition: '-30px 75px',
                        clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                        opacity: 0.45,
                        filter: 'blur(0.4px)',
                    }}
                />
            </div>

            <div className="px-5 pt-6 pb-6 flex flex-col items-center relative z-10 gap-3">

                {/* Top-Right Status Badge */}
                <div className="absolute top-3 right-3 z-20">
                    {statusType === 'exceeded' ? (
                        <div className="bg-purple-100 p-1.5 rounded-xl border border-purple-200 shadow-sm animate-pulse-slow">
                            <Target className="w-5 h-5 text-purple-600" />
                        </div>
                    ) : statusType === 'completed' ? (
                        <div className="bg-white p-1 rounded-full border-2 border-emerald-500 shadow-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                    ) : (
                        <div className="bg-white p-1 rounded-full border-2 border-red-500 shadow-sm">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                    )}
                </div>

                {/* Profile Info Row */}
                <div className="flex items-center justify-center gap-4 w-full mt-1 relative z-20">
                    <div className={`w-[68px] h-[68px] rounded-full ${style.avatar} bg-white overflow-hidden shadow-md flex-shrink-0`}>
                        <Image
                            src={getAvatarUrl(data.avatar, data.name)}
                            alt={data.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`;
                            }}
                            width={64}
                            height={64}
                            unoptimized
                        />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h4 className="text-[18px] font-black text-slate-800 tracking-tight leading-tight mb-1.5 truncate max-w-[180px]">
                            {data.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                            {data.position && (
                                <span className="text-[11px] font-black px-2 py-0.5 rounded-lg border bg-white text-slate-500 border-slate-200 uppercase tracking-widest shadow-xs flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {data.position?.toUpperCase()}
                                </span>
                            )}
                            <span className="text-[11px] font-black text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-xs flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {data.team}
                                {data.team?.toLowerCase().includes('thái lan') && (
                                    <Image src="/thailand-flag.png" alt="TH" className="w-3.5 h-2.5 object-contain filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" width={14} height={10} unoptimized />
                                )}
                                {data.team?.toLowerCase().includes('global - indo') && (
                                    <Image src="/indo-flag.png" alt="INDO" className="w-3.5 h-2.5 object-contain filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" width={14} height={10} unoptimized />
                                )}
                                {data.team?.toLowerCase().includes('việt nam') && (
                                    <Image src="/vn-flag.png" alt="VN" className="w-3.5 h-2.5 object-contain filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" width={14} height={10} unoptimized />
                                )}
                                {(data.team?.toLowerCase().includes('jp') || data.team?.toLowerCase().includes('nhật bản')) && (
                                    <Image src="/japan-flag.png" alt="JP" className="w-3.5 h-2.5 object-contain border border-gray-100 filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" width={14} height={10} unoptimized />
                                )}
                                {data.team?.toLowerCase().includes('đài loan') && (
                                    <Image src="/taiwan-flag.png" alt="TW" className="w-4 h-3 object-contain filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" width={16} height={12} unoptimized />
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full border-t border-dashed border-slate-200/60" />

                {/* Metrics — 3 mini stat cards */}
                <div className="w-full grid grid-cols-3 gap-2 px-0.5">
                    <div className={`flex flex-col items-center py-2.5 px-1 rounded-xl border ${style.accent}`}>
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400 mb-1" />
                        <span className={`text-[20px] font-black leading-none ${style.metricText}`}>{data.kpi_month ?? 0}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 text-center leading-tight">MT Tháng</span>
                    </div>
                    <div className={`flex flex-col items-center py-2.5 px-1 rounded-xl border ${style.accent}`}>
                        <Sun className="w-3.5 h-3.5 text-slate-400 mb-1" />
                        <span className={`text-[20px] font-black leading-none ${style.metricText}`}>{dailyGoal}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 text-center leading-tight">MT Ngày</span>
                    </div>
                    <div className={`flex flex-col items-center py-2.5 px-1 rounded-xl border ${style.accent}`}>
                        <CheckCircle2Icon className="w-3.5 h-3.5 text-slate-400 mb-1" />
                        <span className={`text-[20px] font-black leading-none ${
                            statusType === 'exceeded' ? 'text-purple-600' : style.metricText
                        }`}>{done}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 text-center leading-tight">Đã Xong</span>
                    </div>
                </div>

                {/* Monthly Progress */}
                <div className="w-full px-0.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Tiến độ tháng
                        </span>
                        <span className={`text-[13px] font-black ${
                            statusType === 'neutral' ? 'text-rose-600'
                            : statusType === 'exceeded' ? 'text-purple-600'
                            : 'text-emerald-600'
                        }`}>{data.monthlyProgress}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${style.progressGrad}`}
                            style={{ width: `${Math.min(data.monthlyProgress, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Traffic & Revenue Footer */}
                <div className="grid grid-cols-2 w-full gap-2.5 px-0.5">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/80 p-3 rounded-2xl border border-blue-200/60 shadow-sm text-center">
                        <span className="flex items-center justify-center gap-1 text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">
                            <MousePointerClick className="w-3.5 h-3.5" />
                            TRAFFIC
                        </span>
                        <div className="text-[17px] font-black text-blue-800 truncate leading-none">{data.traffic}</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/80 p-3 rounded-2xl border border-emerald-200/60 shadow-sm text-center">
                        <span className="flex items-center justify-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">
                            <CircleDollarSign className="w-3.5 h-3.5" />
                            DOANH THU
                        </span>
                        <div className="text-[17px] font-black text-emerald-800 truncate leading-none">{data.revenue}</div>
                    </div>
                </div>

                {/* Report Status Banner — bottom */}
                <div className="w-full px-0.5">
                    <div className={`w-full py-2 rounded-xl text-[12px] font-black uppercase tracking-widest shadow-sm text-center flex items-center justify-center gap-2 transition-all border-l-4 ${
                        isReportedOnTime
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 border-l-emerald-500'
                            : 'bg-red-50 text-red-600 border border-red-200 border-l-red-500'
                    }`}>
                        {isReportedOnTime
                            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            : <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse" />
                        }
                        {data.reportStatus || 'Chưa báo cáo'}
                    </div>
                </div>

            </div>
        </div>
    );

});

export default UserActivityCard;
export type { UserActivity };
