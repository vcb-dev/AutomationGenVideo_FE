"use client";

import React from "react";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import AdminActivityKPIs from "./AdminActivityKPIs";
import ReportCard from "./ReportCard";

interface ChecklistTabProps {
    isAdminUser: boolean;
    isCapturing: boolean;
    loading: boolean;
    checklistFilteredReports: any[];
    pagedChecklistReports: any[];
    checklistPage: number;
    totalChecklistPages: number;
    setChecklistPage: React.Dispatch<React.SetStateAction<number>>;
}

export const ChecklistTab = ({
    isAdminUser,
    isCapturing,
    loading,
    checklistFilteredReports,
    pagedChecklistReports,
    checklistPage,
    totalChecklistPages,
    setChecklistPage,
}: ChecklistTabProps) => {
    return (
        <div
            className={`space-y-6 animate-in fade-in duration-700 mx-auto transition-all duration-700 ${
                isCapturing ? "max-w-[1350px]" : "max-w-[1400px]"
            }`}
            style={{ zoom: isCapturing ? 1.4 : 1 }}
        >
            {/* Admin KPI bar */}
            {isAdminUser && (
                <AdminActivityKPIs
                    reports={checklistFilteredReports}
                    loading={loading}
                    onViewDifficulties={() => window.scrollTo({ top: 600, behavior: "smooth" })}
                />
            )}

            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center px-6 py-5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-tight">
                                Báo cáo ngày / Daily Checklist
                            </h3>
                            <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                                Theo dõi báo cáo hàng ngày của các thành viên trong team
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl border border-slate-200 h-[300px] animate-pulse"
                        >
                            <div className="p-5 space-y-4">
                                <div className="flex justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100" />
                                        <div className="space-y-2">
                                            <div className="h-4 w-24 bg-slate-100 rounded" />
                                            <div className="h-3 w-16 bg-slate-50 rounded" />
                                        </div>
                                    </div>
                                    <div className="h-7 w-20 bg-slate-100 rounded-full" />
                                </div>
                                <div className="h-12 bg-slate-50 rounded-xl" />
                                <div className="space-y-2">
                                    <div className="h-3 bg-slate-50 rounded" />
                                    <div className="h-3 bg-slate-50 rounded" />
                                    <div className="h-3 w-3/4 bg-slate-50 rounded" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : checklistFilteredReports.length > 0 ? (
                    pagedChecklistReports.map((report, idx) => (
                        <div
                            key={report.id || idx}
                            className="animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-both"
                            style={{ animationDelay: `${idx * 60}ms` }}
                        >
                            <ReportCard report={report} />
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-24 bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">
                            Không tìm thấy báo cáo nào
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && totalChecklistPages > 1 && (
                <div className="flex items-center justify-center gap-3 pb-6">
                    <button
                        onClick={() => setChecklistPage((p) => Math.max(1, p - 1))}
                        disabled={checklistPage === 1}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                            checklistPage === 1
                                ? "opacity-30 cursor-not-allowed border-slate-100 text-slate-300"
                                : "bg-white text-blue-600 border-slate-200 hover:border-blue-400 hover:shadow-md"
                        }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                        {(() => {
                            const pages: (number | string)[] = [];
                            for (let i = 1; i <= totalChecklistPages; i++) {
                                if (
                                    i === 1 ||
                                    i === totalChecklistPages ||
                                    (i >= checklistPage - 1 && i <= checklistPage + 1)
                                ) {
                                    pages.push(i);
                                } else if (i === checklistPage - 2 || i === checklistPage + 2) {
                                    pages.push("...");
                                }
                            }
                            return Array.from(new Set(pages)).map((p, idx) => {
                                if (p === "...")
                                    return (
                                        <span
                                            key={`dots-${idx}`}
                                            className="w-8 text-center text-slate-300 font-bold text-sm"
                                        >
                                            ...
                                        </span>
                                    );
                                const isCurrent = p === checklistPage;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setChecklistPage(p as number)}
                                        className={`w-9 h-9 rounded-lg font-black text-[12px] transition-all ${
                                            isCurrent
                                                ? "bg-blue-600 text-white shadow"
                                                : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                );
                            });
                        })()}
                    </div>

                    <button
                        onClick={() => setChecklistPage((p) => Math.min(totalChecklistPages, p + 1))}
                        disabled={checklistPage === totalChecklistPages}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                            checklistPage === totalChecklistPages
                                ? "opacity-30 cursor-not-allowed border-slate-100 text-slate-300"
                                : "bg-white text-blue-600 border-slate-200 hover:border-blue-400 hover:shadow-md"
                        }`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};