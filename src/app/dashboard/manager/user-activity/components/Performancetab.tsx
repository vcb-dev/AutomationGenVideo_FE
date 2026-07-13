"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { CardSkeleton } from "./Cardskeleton";
import UserActivityCard from "./UserActivityCard";

const normalize = (str: any) => (str || "").toString().toLowerCase().trim().replace(/\s+/g, "");

interface PerformanceTabProps {
    loading: boolean;
    filteredReports: any[];
    visibleCount: number;
    loadMoreRef: React.RefObject<HTMLDivElement>;
    timeType: string;
    user: any;
    userTeam: string | null;
    isAdminUser: boolean;
    isLeaderUser: boolean;
    onCardClick: (report: any) => void;
}

const PerformanceTab = ({
    loading,
    filteredReports,
    visibleCount,
    loadMoreRef,
    timeType,
    user,
    userTeam,
    isAdminUser,
    isLeaderUser,
    onCardClick,
}: PerformanceTabProps) => {
    if (loading) {
      
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-7">
                {Array.from({ length: 10 }).map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-7">
                {filteredReports.slice(0, visibleCount).map((report, idx) => {
                    const isOwnName =
                        report.name && user?.full_name &&
                        normalize(report.name) === normalize(user.full_name);
                    const isOwnEmail =
                        report.email && user?.email &&
                        normalize(report.email) === normalize(user.email);
                    const isOwnCard = isOwnName || isOwnEmail;

                    const _utParts = (userTeam || "").split(",").map((p: string) => normalize(p.trim())).filter(Boolean);
                    const _rtParts = (report.team || "").split(",").map((p: string) => normalize(p.trim())).filter(Boolean);
                    const isReportMyTeam = _utParts.length > 0 && _rtParts.some((rp: string) => _utParts.includes(rp));
                    const canClickCard = isAdminUser || (isLeaderUser && isReportMyTeam) || isOwnCard;

                    return (
                        <div
                            key={report.id || idx}
                            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                            style={{
                                animationDelay: `${Math.min(idx, 9) * 50}ms`,
                                animationFillMode: "backwards",
                            }}
                        >
                            <UserActivityCard
                                data={report}
                                timeType={timeType}
                                canClick={canClickCard}
                                onClick={() => onCardClick(report)}
                            />
                        </div>
                    );
                })}
            </div>

            {visibleCount < filteredReports.length && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                    <div className="flex items-center gap-2 text-sm text-slate-400 font-bold">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Đang tải thêm...
                    </div>
                </div>
            )}
        </>
    );
};
export default PerformanceTab;