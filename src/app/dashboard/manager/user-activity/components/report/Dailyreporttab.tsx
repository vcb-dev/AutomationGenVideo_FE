"use client";

import React from "react";
import dynamic from "next/dynamic";
import { FileText, User, ShieldCheck, ChevronDown } from "lucide-react";
import { MonthlyReportComingSoon } from "./MonthlyReportComingSoon";

const ChecklistContainer = dynamic(
    () => import("@/components/checklist/ChecklistContainer"),
    { ssr: false },
);

interface DailyReportTabProps {
    reportType: "select" | "daily" | "monthly";
    typeParam: string | null;
    reportMode: "select" | "member" | "leader";
    setReportMode: React.Dispatch<React.SetStateAction<"select" | "member" | "leader">>;
    isAdminUser: boolean;
    isLeaderUser: boolean;
    fetchReports: (force?: boolean) => void;
}

export const DailyReportTab = ({
    reportType,
    typeParam,
    reportMode,
    setReportMode,
    isAdminUser,
    isLeaderUser,
    fetchReports,
}: DailyReportTabProps) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {reportType === "monthly" ? (
                <MonthlyReportComingSoon />
            ) : typeParam === "traffic" ? (
                <div className="space-y-6">
                    <div className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-8 border border-slate-100 shadow-inner">
                        <ChecklistContainer
                            key="traffic"
                            mode="member"
                            showOnlyTraffic={true}
                            onSuccess={() => fetchReports(false)}
                        />
                    </div>
                </div>
            ) : typeParam === "task" || typeParam === "tasks" ? (
                <TaskReportSection
                    reportMode={reportMode}
                    setReportMode={setReportMode}
                    isAdminUser={isAdminUser}
                    isLeaderUser={isLeaderUser}
                    fetchReports={fetchReports}
                />
            ) : (
                <div className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-20 border border-slate-100 shadow-inner text-center">
                    <FileText className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <p className="text-slate-400 mt-2 text-sm">Vui lòng chọn loại báo cáo từ menu.</p>
                </div>
            )}
        </div>
    );
};

// ── Task report sub-section ────────────────────────────────────────────────────
const TaskReportSection = ({
    reportMode,
    setReportMode,
    isAdminUser,
    isLeaderUser,
    fetchReports,
}: {
    reportMode: "select" | "member" | "leader";
    setReportMode: React.Dispatch<React.SetStateAction<"select" | "member" | "leader">>;
    isAdminUser: boolean;
    isLeaderUser: boolean;
    fetchReports: (force?: boolean) => void;
}) => {
    if (reportMode !== "select") {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <button
                        type="button"
                        onClick={() => setReportMode("select")}
                        className="relative z-[500] flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100/80 text-slate-700 hover:bg-slate-200 font-bold transition-all group border border-slate-200 shadow-sm cursor-pointer"
                    >
                        <ChevronDown className="rotate-90 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Quay lại chọn Đối tượng
                    </button>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-8 border border-slate-100 shadow-inner">
                    <ChecklistContainer
                        key="work"
                        mode={reportMode}
                        showOnlyWork={true}
                        onSuccess={() => fetchReports(false)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {(isAdminUser || !isLeaderUser) && (
                    <RoleCard
                        icon={<User className="w-8 h-8 text-blue-400" />}
                        hoverBg="group-hover:bg-blue-600 group-hover:border-blue-500"
                        glowClass="hover:shadow-blue-500/10"
                        blobClass="bg-blue-950/30 group-hover:bg-blue-900/40"
                        accentClass="text-blue-500"
                        title="Báo cáo Member"
                        desc="Dành cho Editor & Content báo cáo tiến độ checklist và khó khăn hàng ngày."
                        cta="Bắt đầu báo cáo"
                        onClick={() => setReportMode("member")}
                    />
                )}
                {(isAdminUser || isLeaderUser) && (
                    <RoleCard
                        icon={<ShieldCheck className="w-8 h-8 text-indigo-400" />}
                        hoverBg="group-hover:bg-indigo-600 group-hover:border-indigo-500"
                        glowClass="hover:shadow-indigo-500/10"
                        blobClass="bg-indigo-950/30 group-hover:bg-indigo-900/40"
                        accentClass="text-indigo-500"
                        title="Báo cáo Leader"
                        desc="Dành cho Team Leader đánh giá chất lượng và quản lý nhân sự hàng ngày."
                        cta="Bắt đầu đánh giá"
                        onClick={() => setReportMode("leader")}
                    />
                )}
            </div>
        </div>
    );
};

const RoleCard = ({
    icon,
    hoverBg,
    glowClass,
    blobClass,
    accentClass,
    title,
    desc,
    cta,
    onClick,
}: {
    icon: React.ReactNode;
    hoverBg: string;
    glowClass: string;
    blobClass: string;
    accentClass: string;
    title: string;
    desc: string;
    cta: string;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={`group relative bg-slate-950 p-8 rounded-[3rem] border border-slate-800 shadow-2xl ${glowClass} hover:-translate-y-2 transition-all duration-500 overflow-hidden text-left`}
    >
        <div
            className={`absolute top-0 right-0 w-32 h-32 ${blobClass} rounded-full -mr-16 -mt-16 blur-2xl transition-colors`}
        />
        <div
            className={`bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 ${hoverBg} transition-all duration-500 shadow-inner`}
        >
            {icon}
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{title}</h3>
        <p className="text-sm text-slate-400 font-medium leading-relaxed">{desc}</p>
        <div className={`mt-8 flex items-center gap-2 ${accentClass} font-black text-xs uppercase tracking-widest`}>
            {cta} <ChevronDown className="-rotate-90 w-3 h-3 stroke-[3]" />
        </div>
    </button>
);