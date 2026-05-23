"use client";

import React from "react";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiThreads, SiYoutube } from "react-icons/si";

interface TrafficToday {
    fb: number;
    ig: number;
    tiktok: number;
    yt: number;
    thread: number;
    lemon8: number;
    zalo: number;
    twitter: number;
    total: number;
    details?: {
        id: string;
        value: string;
        channel: string;
        platform?: string;
        evidences?: { url: string; name: string; token: string }[];
    }[];
}

interface EmployeeReport {
    id: string;
    name: string;
    position?: string;
    team: string;
    avatar: string;
    status: string;
    submittedAt?: string;
    time?: string;
    checklist: {
        fb: boolean;
        ig: boolean;
        captionHashtag: boolean;
        tiktok: boolean;
        youtube: boolean;
        zalo: boolean;
        lark: boolean;
        reportLink: boolean;
    };
    videoCount: number;
    trafficToday?: TrafficToday | null;
    needsTraffic?: boolean;
    isMock?: boolean;
    questions: {
        question: string;
        answer: string;
    }[];
}

const AVATAR_COLORS = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-orange-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-amber-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-pink-500",
];

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const formatTrafficNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toLocaleString("vi-VN");
};

function formatSubmitTime(submittedAt?: string, time?: string): string | null {
    if (time) return time;
    if (!submittedAt) return null;
    try {
        const d = new Date(submittedAt);
        if (isNaN(d.getTime())) return submittedAt;
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `Hôm nay, ${hh}:${mm}`;
    } catch {
        return submittedAt;
    }
}

const PLATFORM_CONFIGS = [
    { key: "tiktok" as const, label: "TikTok", icon: SiTiktok, color: "#000000" },
    { key: "fb" as const, label: "Facebook", icon: SiFacebook, color: "#1877F2" },
    { key: "ig" as const, label: "Instagram", icon: SiInstagram, color: "#E1306C" },
    { key: "yt" as const, label: "YouTube", icon: SiYoutube, color: "#FF0000" },
    { key: "thread" as const, label: "Threads", icon: SiThreads, color: "#64748b" },
];

const TrafficBar = ({ value, max }: { value: number; max: number }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="mt-1 h-0.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-400 rounded-full" style={{ width: `${pct}%` }} />
        </div>
    );
};

const checkIsDifficulty = (question: string, answer: string | null | undefined): boolean => {
    if (!answer) return false;
    const qLower = question.toLowerCase();
    const isDiffQ = qLower.includes("khó khăn") || qLower.includes("deadline") || qLower.includes("trễ");
    if (!isDiffQ) return false;

    const ansClean = answer.toLowerCase().trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]/g, ""); // keep only alphanumeric

    const negativeKeywords = [
        "khong",
        "khongco",
        "none",
        "no",
        "binhthuong",
        "ok"
    ];

    const isNegative = negativeKeywords.some(kw => 
        ansClean === kw || 
        ansClean.startsWith(kw) || 
        ansClean === "khongconha" || 
        ansClean === "khongcoa" ||
        ansClean === "khongcoghia" ||
        ansClean === "khongcogica"
    );
    return !isNegative;
};

const checkIsSuggestion = (question: string, answer: string | null | undefined): boolean => {
    if (!answer) return false;
    const qLower = question.toLowerCase();
    const isSugQ = qLower.includes("ý tưởng") || qLower.includes("đề xuất") || qLower.includes("y tuong") || qLower.includes("de xuat");
    if (!isSugQ) return false;

    const ansClean = answer.toLowerCase().trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]/g, ""); // keep only alphanumeric

    const negativeKeywords = [
        "khong",
        "khongco",
        "none",
        "no",
        "binhthuong",
        "ok"
    ];

    const isNegative = negativeKeywords.some(kw => 
        ansClean === kw || 
        ansClean.startsWith(kw) || 
        ansClean === "khongconha" || 
        ansClean === "khongcoa" ||
        ansClean === "khongcoghia" ||
        ansClean === "khongcogica"
    );
    return !isNegative;
};

const ReportCard = ({ report }: { report: EmployeeReport }) => {
    const statusRaw = (report.status || "").toString().toUpperCase();
    const isCompleted =
        statusRaw === "ĐÃ BÁO CÁO ĐỦ" ||
        statusRaw === "SUBMITTED" ||
        statusRaw === "ĐÚNG HẠN" ||
        statusRaw === "ĐÃ NỘP";
    const isLate = statusRaw.includes("TRỄ") || statusRaw.includes("LATE");
    const isUnreported =
        statusRaw === "CHƯA BÁO CÁO" ||
        statusRaw === "" ||
        statusRaw === "PENDING" ||
        statusRaw === "CHƯA NỘP";

    const needsTraffic = report.needsTraffic !== false;
    const trafficData = report.trafficToday;
    const tiktokVal = trafficData?.tiktok || 0;
    const fbVal = trafficData?.fb || 0;
    const igVal = trafficData?.ig || 0;
    const ytVal = trafficData?.yt || 0;
    const threadVal = trafficData?.thread || 0;
    const hasTrafficData = tiktokVal + fbVal + igVal + ytVal + threadVal > 0;
    const maxVal = Math.max(tiktokVal, fbVal, igVal, ytVal, threadVal, 1);

    const initials = getInitials(report.name);
    const avatarColor = getAvatarColor(report.name);
    const submitTime = formatSubmitTime(report.submittedAt, report.time);

    const [showQuestions, setShowQuestions] = React.useState(true);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* Card Header */}
            <div className="p-6 pb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* Avatar with initials */}
                    <div
                        className={`w-16 h-16 rounded-[1.25rem] flex-shrink-0 flex items-center justify-center ${avatarColor} text-white font-black text-[19px] tracking-tight shadow-md`}
                    >
                        {initials}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-slate-900 text-[19px] uppercase tracking-tight">
                                {report.name}
                            </h3>
                            {report.position && (
                                <span className="px-3 py-1.5 rounded border border-amber-300 bg-amber-50 text-amber-700 text-[12px] font-black uppercase tracking-widest">
                                    {report.position}
                                </span>
                            )}
                        </div>
                        <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                            {report.team}
                        </p>
                    </div>
                </div>

                {/* Status + time */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span
                        className={`px-4 py-2 rounded-full text-[13px] font-black uppercase tracking-wider border
                            ${isCompleted && !isLate
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : isLate
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : isUnreported
                                ? "bg-red-50 text-red-600 border-red-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}
                    >
                        {isCompleted && !isLate
                            ? "ĐÃ NỘP"
                            : isLate
                            ? "TRỄ HẠN"
                            : isUnreported
                            ? "CHƯA NỘP"
                            : report.status}
                    </span>
                    {submitTime && !isUnreported && (
                        <span className="text-[13px] text-slate-400 font-medium">{submitTime}</span>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-6">
                {isUnreported ? (
                    <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
                        <AlertCircle className="w-6 h-6 text-slate-400 flex-shrink-0" />
                        <div>
                            <p className="text-[15.5px] font-bold text-slate-600">Chưa gửi báo cáo hôm nay</p>
                            <p className="text-[14px] text-slate-400 mt-1">
                                Báo cáo sẽ giúp team theo dõi và hỗ trợ bạn tốt hơn.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Traffic row */}
                        {(hasTrafficData || needsTraffic) && (
                            <div className="flex items-stretch gap-3 mb-5 border-t border-slate-50 pt-5">
                                {PLATFORM_CONFIGS.map(({ key, label, icon: Icon, color }) => {
                                    const val =
                                        key === "tiktok" ? tiktokVal
                                        : key === "fb" ? fbVal
                                        : key === "ig" ? igVal
                                        : key === "yt" ? ytVal
                                        : threadVal;
                                    return (
                                        <div key={key} className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Icon
                                                    className="w-4 h-4 flex-shrink-0"
                                                    style={{ color }}
                                                />
                                                <span className="text-[12px] font-bold text-slate-500 truncate">
                                                    {label}
                                                </span>
                                            </div>
                                            <p className="text-[14px] font-black text-slate-800 leading-tight">
                                                {formatTrafficNumber(val)}
                                            </p>
                                            <TrafficBar value={val} max={maxVal} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Q&A */}
                        {report.questions && report.questions.length > 0 && (
                            <div className="border-t border-slate-100 pt-4">
                                {showQuestions && (
                                    <div className="space-y-2.5">
                                        {report.questions.map((q, i) => {
                                            const isDifficulty = checkIsDifficulty(q.question, q.answer);
                                            const isSuggestion = checkIsSuggestion(q.question, q.answer);

                                            let textColorClass = "text-slate-500";
                                            let ansColorClass = "text-slate-800";
                                            let fontClass = "font-bold";
                                            let ansFontClass = "font-bold";

                                            if (isDifficulty) {
                                                textColorClass = "text-rose-600";
                                                ansColorClass = "text-rose-600";
                                                fontClass = "font-black";
                                                ansFontClass = "font-black";
                                            } else if (isSuggestion) {
                                                textColorClass = "text-emerald-600";
                                                ansColorClass = "text-emerald-600";
                                                fontClass = "font-black";
                                                ansFontClass = "font-black";
                                            }

                                            return (
                                                <div
                                                    key={i}
                                                    className="flex items-baseline gap-4 text-[14.5px] leading-relaxed"
                                                >
                                                    <span className={`${textColorClass} ${fontClass} uppercase tracking-wider text-[13.5px] flex-1 min-w-0`}>
                                                        {q.question}
                                                    </span>
                                                    <span className={`${ansColorClass} ${ansFontClass} text-right flex-shrink-0 max-w-[50%]`}>
                                                        {q.answer || (
                                                            <span className="text-slate-300 italic">—</span>
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {report.questions.length > 3 && (
                                    <button
                                        onClick={() => setShowQuestions((v) => !v)}
                                        className="mt-3 flex items-center gap-1 text-[13px] font-bold text-blue-500 hover:text-blue-700 transition-colors"
                                    >
                                        {showQuestions ? (
                                            <>
                                                <ChevronUp className="w-3.5 h-3.5" /> Thu gọn
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="w-3.5 h-3.5" /> Xem {report.questions.length} câu hỏi
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ReportCard;
