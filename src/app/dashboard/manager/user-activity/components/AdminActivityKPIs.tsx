'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Lightbulb, ClipboardList, ArrowRight } from 'lucide-react';

interface Report {
    id: string;
    name: string;
    status: string;
    questions?: { question: string; answer: string }[];
}

interface AdminActivityKPIsProps {
    reports: Report[];
    loading?: boolean;
    onViewDifficulties?: () => void;
}

const AVATAR_COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
    'bg-teal-500', 'bg-pink-500',
];

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function isDifficulty(question: string, answer: string): boolean {
    if (!answer || answer.trim() === '' || answer.toLowerCase() === 'không có' || answer.toLowerCase() === 'không') return false;
    const ql = question.toLowerCase();
    if (!ql.includes('khó khăn') && !ql.includes('hỗ trợ') && !ql.includes('deadline') && !ql.includes('trễ')) return false;
    return true;
}

function isSuggestion(question: string, answer: string): boolean {
    if (!answer || answer.trim() === '' || answer.toLowerCase() === 'không có' || answer.toLowerCase() === 'không') return false;
    const ql = question.toLowerCase();
    if (!ql.includes('ý tưởng') && !ql.includes('đề xuất')) return false;
    return true;
}

const AdminActivityKPIs = ({ reports, loading, onViewDifficulties }: AdminActivityKPIsProps) => {
    const stats = React.useMemo(() => {
        const total = reports.length;
        let submitted = 0, late = 0, unreported = 0;
        const difficultyReports: { name: string; text: string }[] = [];
        const suggestionReports: { name: string }[] = [];

        for (const r of reports) {
            const s = (r.status || '').toUpperCase();
            if (s === 'ĐÃ BÁO CÁO ĐỦ' || s === 'SUBMITTED' || s === 'ĐÚNG HẠN' || s === 'ĐÃ NỘP') submitted++;
            else if (s.includes('TRỄ') || s.includes('LATE')) late++;
            else unreported++;

            if (r.questions) {
                for (const q of r.questions) {
                    if (isDifficulty(q.question, q.answer)) {
                        difficultyReports.push({ name: r.name, text: q.answer });
                        break;
                    }
                }
                for (const q of r.questions) {
                    if (isSuggestion(q.question, q.answer)) {
                        suggestionReports.push({ name: r.name });
                        break;
                    }
                }
            }
        }

        const reportedPct = total > 0 ? Math.round(((submitted + late) / total) * 100) : 0;
        const sugPct = total > 0 ? Math.round((suggestionReports.length / total) * 100) : 0;

        return { total, submitted, late, unreported, difficultyReports, suggestionReports, reportedPct, sugPct };
    }, [reports]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse h-[190px]">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex-shrink-0" />
                            <div className="h-3 w-32 bg-slate-100 rounded" />
                        </div>
                        <div className="h-10 w-24 bg-slate-100 rounded mb-3" />
                        <div className="h-2 bg-slate-50 rounded-full" />
                    </div>
                ))}
            </div>
        );
    }

    const previewDiff = stats.difficultyReports.slice(0, 2);
    const extraDiff = stats.difficultyReports.length - previewDiff.length;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* ── Card 1: Tổng thành viên ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-tight">
                        Tổng thành viên<br />cần báo cáo
                    </span>
                </div>

                {/* Number */}
                <div className="text-[48px] font-black text-slate-900 leading-none tracking-tight">
                    {stats.total}
                </div>

                {/* Breakdown */}
                <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
                    <span className="text-emerald-600 font-bold">{stats.submitted} đúng hạn</span>
                    {' · '}
                    <span className="text-red-500 font-bold">{stats.unreported} chưa nộp</span>
                </p>

                {/* Progress */}
                <div className="flex items-center gap-2 mt-auto pt-1">
                    <div className="flex-1 h-[6px] bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full w-full" />
                    </div>
                    <span className="text-[11px] font-black text-blue-500 flex-shrink-0">100%</span>
                </div>
            </div>

            {/* ── Card 2: Đã nộp đầy đủ ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-tight">
                        Đã nộp<br />đầy đủ
                    </span>
                </div>

                {/* Number */}
                <div className="text-[48px] font-black text-slate-900 leading-none tracking-tight">
                    {stats.submitted}
                    <span className="text-[24px] text-slate-300 font-bold"> /{stats.total}</span>
                </div>

                {/* Sub text */}
                <p className="text-[11px] font-semibold text-slate-400">
                    {stats.reportedPct}% hoàn thành hôm nay
                </p>

                {/* Progress */}
                <div className="flex items-center gap-2 mt-auto pt-1">
                    <div className="flex-1 h-[6px] bg-emerald-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${stats.reportedPct}%` }}
                        />
                    </div>
                    <span className="text-[11px] font-black text-emerald-500 flex-shrink-0">{stats.reportedPct}%</span>
                </div>
            </div>

            {/* ── Card 3: Khó khăn cần hỗ trợ ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                    </div>
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-tight">
                        Khó khăn<br />cần hỗ trợ
                    </span>
                </div>

                {/* Number */}
                <div className="text-[48px] font-black text-slate-900 leading-none tracking-tight">
                    {stats.difficultyReports.length}
                </div>

                {/* List preview */}
                {stats.difficultyReports.length === 0 ? (
                    <p className="text-[11px] font-semibold text-slate-400">
                        Không có khó khăn báo cáo hôm nay</p>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {previewDiff.map((d, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-[9px] font-black text-white ${getAvatarColor(d.name)}`}>
                                    {getInitials(d.name)}
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">{d.text}</p>
                            </div>
                        ))}
                        {extraDiff > 0 && (
                            <p className="text-[10px] text-slate-400 font-bold">
                                +{extraDiff} khó khăn khác
                            </p>
                        )}
                    </div>
                )}

                {/* CTA */}
                {onViewDifficulties && stats.difficultyReports.length > 0 && (
                    <button
                        onClick={onViewDifficulties}
                        className="mt-auto pt-1 flex items-center gap-1 text-[10px] font-black text-rose-500 hover:text-rose-600 transition-colors"
                    >
                        Xem tất cả <ArrowRight className="w-3 h-3" />
                    </button>
                )}

                {stats.difficultyReports.length === 0 && (
                    <div className="flex items-center gap-2 mt-auto pt-1">
                        <div className="flex-1 h-[6px] bg-rose-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-400 rounded-full" style={{ width: '0%' }} />
                        </div>
                        <span className="text-[11px] font-black text-rose-400 flex-shrink-0">0%</span>
                    </div>
                )}
            </div>

            {/* ── Card 4: Đề xuất & ý tưởng ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-5 h-5 text-violet-500" />
                    </div>
                    <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest leading-tight">
                        Đề xuất<br />&amp; ý tưởng
                    </span>
                </div>

                {/* Number */}
                <div className="text-[48px] font-black text-slate-900 leading-none tracking-tight">
                    {stats.suggestionReports.length}
                </div>

                {/* Sub text */}
                <p className="text-[11px] font-semibold text-slate-400">
                    {stats.suggestionReports.length > 0
                        ? `${stats.suggestionReports.length} thành viên có đề xuất mới`
                        : 'Chưa có đề xuất nào hôm nay'}
                </p>

                {/* Progress */}
                <div className="flex items-center gap-2 mt-auto pt-1">
                    <div className="flex-1 h-[6px] bg-violet-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-violet-500 rounded-full transition-all duration-700"
                            style={{ width: `${stats.sugPct}%` }}
                        />
                    </div>
                    <span className="text-[11px] font-black text-violet-500 flex-shrink-0">{stats.sugPct}%</span>
                </div>
            </div>

        </div>
    );
};

export default AdminActivityKPIs;
