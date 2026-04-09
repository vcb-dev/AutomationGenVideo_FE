"use client";

import Image from "next/image";
import React from "react";
import { Check, PieChart as PieIcon, AlertCircle, ChevronRight } from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiThreads } from "react-icons/si";

import { motion, AnimatePresence } from "framer-motion";

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
    isMock?: boolean;
    questions: {
        question: string;
        answer: string;
    }[];
}

const getAvatarUrl = (url: string | null, name: string) => {
    if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    if (url.includes("drive.google.com")) {
        const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
        }
    }
    if (url.includes("googleusercontent.com")) {
        try {
            const urlObj = new URL(url);
            urlObj.searchParams.delete("authuser");
            urlObj.searchParams.delete("sz");
            return urlObj.toString().replace(/=[sw]\d+(-[sw]\d+)*(?=[?#]|$)/, "=w200");
        } catch {
            return url;
        }
    }
    return url;
};

const formatTrafficNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toLocaleString("vi-VN");
};

const ProgressBar = ({ label, value, max, color, icon: Icon }: { label: string, value: number, max: number, color: string, icon: React.ElementType }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="flex items-center gap-4 group">
            <div className="flex items-center gap-2 w-24">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-[11px] font-bold text-slate-800 transition-colors capitalize">{label}</span>
            </div>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className="h-full transition-all duration-1000 ease-out" 
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-[11px] font-black text-slate-600 w-16 text-right">
                {formatTrafficNumber(value)}
            </span>
        </div>
    );
};

const ReportCard = ({ report, isSmall = false }: { report: EmployeeReport; isSmall?: boolean }) => {
    const [showQuestions, setShowQuestions] = React.useState(false);
    const avatarSrc = getAvatarUrl(report.avatar, report.name);

    const statusRaw = (report.status || "").toString().toUpperCase();
    const isCompleted = statusRaw === "ĐÃ BÁO CÁO ĐỦ" || statusRaw === "SUBMITTED" || statusRaw === "ĐÚNG HẠN";
    const isLate = statusRaw.includes("TRỄ") || statusRaw.includes("LATE");
    const isUnreported = statusRaw === "CHƯA BÁO CÁO" || statusRaw === "" || statusRaw === "PENDING" || statusRaw === "CHƯA NỘP";
    const isOnTime = isCompleted && !isLate;
    
    // Determine the max traffic for scale
    const trafficData = report.trafficToday;
    const tiktokVal = trafficData?.tiktok || 0;
    const fbVal = trafficData?.fb || 0;
    const igVal = trafficData?.ig || 0;
    const threadVal = trafficData?.thread || 0;
    const maxVal = Math.max(tiktokVal, fbVal, igVal, threadVal, 1000); // at least 1000 for scale

    return (
        <div 
            className={`group relative bg-white rounded-[2rem] border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 flex flex-col overflow-hidden
                ${isOnTime ? "border-emerald-50 shadow-emerald-500/5 shadow-xl" : 
                  isUnreported ? "border-red-50 shadow-red-500/5 shadow-xl" : "border-slate-50 shadow-slate-500/5 shadow-xl"}
            `}
        >
            {/* Top Pattern Decoration */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br transition-opacity duration-500 blur-3xl -mr-16 -mt-16 opacity-20
                ${isOnTime ? "from-emerald-400" : isUnreported ? "from-red-400" : "from-blue-400"}
            `} />

            <div className="p-6 relative z-10 flex flex-col h-full">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <img
                                src={avatarSrc}
                                alt={report.name}
                                className="w-16 h-16 rounded-[1.25rem] object-cover border-2 border-white shadow-xl ring-4 ring-slate-50/50"
                                onError={(e) => {
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(report.name)}&background=random`;
                                }}
                            />
                            {isOnTime && (
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                                    <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-black text-slate-900 text-[18px] uppercase tracking-tight">{report.name}</h3>
                                {report.position && (
                                    <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest leading-none">
                                        {report.position}
                                    </span>
                                )}
                            </div>
                            <p className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">{report.team}</p>
                        </div>
                    </div>

                    <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] shadow-sm border
                        ${isOnTime ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                          isLate ? "bg-amber-50 text-amber-600 border-amber-100" : 
                          isUnreported ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-50 text-slate-600 border-slate-100"}
                    `}>
                        {isOnTime ? "ĐÚNG HẠN" : isLate ? "TRỄ HẠN" : isUnreported ? "CHƯA NỘP" : report.status}
                    </span>
                </div>

                {/* Body Content */}
                <div className="flex-1">
                    {isUnreported ? (
                        <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100 flex items-center gap-3 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            </div>
                            <p className="text-[13px] font-bold text-red-700 uppercase tracking-tight">Chưa gửi báo cáo hôm nay</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Traffic Section */}
                            <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 shadow-inner">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-[13px] font-black text-black uppercase tracking-[0.1em] flex items-center gap-2">
                                        <PieIcon className="w-4 h-4" /> Traffic hôm qua
                                    </h4>
                                    <span className="text-[18px] font-black text-slate-900">
                                        {formatTrafficNumber(report.trafficToday?.total || 0)}
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <ProgressBar label="TikTok" value={tiktokVal} max={maxVal} color="#1f2937" icon={SiTiktok} />
                                    <ProgressBar label="Facebook" value={fbVal} max={maxVal} color="#3b82f6" icon={SiFacebook} />
                                    <ProgressBar label="Instagram" value={igVal} max={maxVal} color="#ec4899" icon={SiInstagram} />
                                    <ProgressBar label="Threads" value={threadVal} max={maxVal} color="#64748b" icon={SiThreads} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Questions Section (Expandable) */}
                    <AnimatePresence>
                        {showQuestions && !isUnreported && report.questions && report.questions.length > 0 && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                                className="overflow-hidden"
                            >
                                <div className="mt-6 pt-6 border-t-2 border-slate-50 space-y-5">
                                    {report.questions.map((q, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex items-start gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-700 mt-1.5 shrink-0" />
                                                <p className="text-[13px] font-black text-black uppercase tracking-wide leading-relaxed">
                                                    {q.question}
                                                </p>
                                            </div>
                                            <div className="pl-3.5 border-l-2 border-slate-50 ml-0.5">
                                                <p className="text-[13px] font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                    {q.answer}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Section */}
                {!isUnreported && report.questions && report.questions.length > 0 && (
                    <button 
                        onClick={() => setShowQuestions(!showQuestions)}
                        className={`mt-8 group/btn w-full py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 border 
                            ${showQuestions ? "bg-slate-900 border-slate-900 shadow-xl shadow-slate-200" : "bg-slate-50 border-slate-100 hover:bg-slate-100"}
                        `}
                    >
                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors
                            ${showQuestions ? "text-white" : "text-slate-700 group-hover/btn:text-slate-950"}
                        `}>
                            {showQuestions ? "Thu gọn báo cáo" : `Xem thêm ${report.questions.length} câu hỏi`}
                        </span>
                        <ChevronRight className={`w-4 h-4 transition-all duration-500
                            ${showQuestions ? "text-white -rotate-90" : "text-slate-400 group-hover/btn:translate-x-1"}
                        `} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ReportCard;
