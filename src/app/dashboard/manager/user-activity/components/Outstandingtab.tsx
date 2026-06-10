"use client";

import React from "react";
import {
    ClipboardList, FileText, Check, X,
    Clock, AlertCircle, CheckCircle2,
} from "lucide-react";

const normalize = (str: any) => (str || "").toString().toLowerCase().trim().replace(/\s+/g, "");

interface OutstandingTabProps {
    filteredChecklistReports: any[];
    isAdminUser: boolean;
    isLeaderUser: boolean;
    userTeam: string | null;
    handleUpdateStatus: (id: string, status: string) => void;
}

export const OutstandingTab = ({
    filteredChecklistReports,
    isAdminUser,
    isLeaderUser,
    userTeam,
    handleUpdateStatus,
}: OutstandingTabProps) => {
    if (filteredChecklistReports.length === 0) {
        return (
            <div className="col-span-full py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                    <FileText className="w-10 h-10 text-slate-200" />
                </div>
                <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">
                    Không tìm thấy báo cáo nào
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-8 mt-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-400/20">
                        <ClipboardList className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-4">
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                Vấn đề nổi bật & Video Win
                            </h3>
                            {isAdminUser ? (
                                <span className="px-3 py-1.5 rounded-xl bg-violet-100 border border-violet-200 text-violet-700 text-xs font-black uppercase tracking-widest shadow-sm">
                                    Toàn công ty
                                </span>
                            ) : isLeaderUser ? (
                                <span className="px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 text-xs font-black uppercase tracking-widest shadow-sm">
                                    Team: {userTeam || "Của tôi"}
                                </span>
                            ) : (
                                <span className="px-3 py-1.5 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-widest shadow-sm">
                                    Cá nhân
                                </span>
                            )}
                        </div>
                        <p className="text-base text-slate-500 font-bold italic mt-1">
                            Tổng quát các vấn đề cần lưu ý và thành tích trong ngày
                        </p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl shadow-blue-500/5 overflow-hidden">
                <div className="max-h-[800px] overflow-y-auto scrollbar-thin">
                    <table className="w-full border-collapse text-left">
                        <thead className="sticky top-0 z-20 bg-gradient-to-r from-blue-700 to-indigo-800 shadow-lg">
                            <tr>
                                {["Chức danh", "Nhân viên", "Phân loại", "Nội dung", "Thao tác / Trạng thái"].map(
                                    (h, i) => (
                                        <th
                                            key={h}
                                            className={`px-6 py-3 text-[13px] font-black uppercase text-blue-50 tracking-widest bg-transparent border-b border-white/10 ${i === 0 || i === 2 || i === 4 ? "text-center" : "text-left"} ${i === 1 || i === 3 ? "px-8" : ""}`}
                                        >
                                            {h}
                                        </th>
                                    ),
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredChecklistReports.map((r, idx) => (
                                <OutstandingRow
                                    key={r.id || idx}
                                    r={r}
                                    isAdminUser={isAdminUser}
                                    isLeaderUser={isLeaderUser}
                                    userTeam={userTeam}
                                    handleUpdateStatus={handleUpdateStatus}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ── Row sub-component ──────────────────────────────────────────────────────────
const OutstandingRow = ({
    r,
    isAdminUser,
    isLeaderUser,
    userTeam,
    handleUpdateStatus,
}: {
    r: any;
    isAdminUser: boolean;
    isLeaderUser: boolean;
    userTeam: string | null;
    handleUpdateStatus: (id: string, status: string) => void;
}) => {
    const statusText = (r.approval_status || "").toLowerCase();

    const isLegacyApproved = statusText === "đã duyệt" || statusText === "duyệt";
    const isLegacyRejected = statusText === "từ chối" || statusText === "không duyệt";

    const isLeaderApproved = statusText.includes("leader đã duyệt");
    const isLeaderRejected = statusText.includes("leader từ chối");

    const isAdminApproved = statusText.includes("admin đã duyệt") || isLegacyApproved;
    const isAdminRejected = statusText.includes("admin từ chối") || isLegacyRejected;
    const isAdminHandled = isAdminApproved || isAdminRejected;

    const isReportFromLeader =
        (r.role || "").toLowerCase().includes("leader") ||
        (r.position || "").toLowerCase().includes("leader");

    let isExpired = false;
    if (r.date) {
        let rDateObj = new Date(r.date);
        if (r.date.includes("/")) {
            const parts = r.date.split("/");
            if (parts.length === 3) {
                rDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }
        if (!isNaN(rDateObj.getTime())) {
            if (new Date().getTime() - rDateObj.getTime() > 24 * 60 * 60 * 1000) isExpired = true;
        }
    }

    const _lUtParts = (userTeam || "").split(",").map((p: string) => normalize(p.trim())).filter(Boolean);
    const _lRtParts = (r.team || "").split(",").map((p: string) => normalize(p.trim())).filter(Boolean);
    const _isLeaderTeamMatch = _lUtParts.length > 0 && _lRtParts.some((rp: string) => _lUtParts.includes(rp));

    const canLeaderAction =
        !isExpired &&
        isLeaderUser &&
        !isAdminUser &&
        r.team &&
        r.team.trim() !== "" &&
        _isLeaderTeamMatch &&
        !isAdminHandled &&
        !isReportFromLeader;

    const canAdminAction = !isExpired && isAdminUser;
    const isAutoRejected = isExpired && !isAdminHandled;

    const waitLabel =
        isReportFromLeader || !r.team || r.team.trim() === "" || normalize(r.team) === "khac"
            ? "Chờ Admin duyệt"
            : "Chờ Leader duyệt";

    return (
        <tr className="hover:bg-blue-50/40 transition-all group">
            {/* Chức danh */}
            <td className="px-6 py-3 border-r border-slate-50 text-center">
                <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-[12px] font-black uppercase tracking-widest shadow-sm">
                    {r.role || "Member"}
                </span>
            </td>

            {/* Nhân viên */}
            <td className="px-8 py-3 border-r border-slate-50">
                <div className="font-black text-slate-900 text-[18px] mb-1">{r.name}</div>
                <div className="flex items-center gap-2 text-[12px] text-blue-700 font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100">{r.team}</span>
                    <span className="text-slate-400 font-medium italic">{r.date}</span>
                </div>
            </td>

            {/* Phân loại */}
            <td className="px-6 py-3 border-r border-slate-50 text-center">
                <span
                    className={`px-3 py-2 rounded-xl text-[12px] font-black uppercase tracking-tight ${
                        r.category?.toLowerCase().includes("win")
                            ? "bg-purple-100 text-purple-800 border-2 border-purple-200 shadow-sm shadow-purple-100"
                            : "bg-amber-100 text-amber-800 border-2 border-amber-200 shadow-sm shadow-amber-100"
                    }`}
                >
                    {r.category || "-"}
                </span>
            </td>

            {/* Nội dung */}
            <td className="px-8 py-3 border-r border-slate-50">
                <div className="text-[17px] text-slate-900 font-bold leading-relaxed max-w-[800px]">
                    {r.content || "Không có nội dung"}
                </div>
            </td>

            {/* Thao tác */}
            <td className="px-6 py-3.5 text-center">
                <div className="flex justify-center flex-col gap-2 relative">
                    {/* Status badges */}
                    <div className="flex items-center justify-center gap-2">
                        {/* Member view */}
                        {!isAdminUser && !isLeaderUser && (
                            <>
                                {isAdminApproved ? (
                                    <StatusBadge color="blue" icon={CheckCircle2} label="Đã duyệt" />
                                ) : isAdminRejected ? (
                                    <StatusBadge color="red" icon={AlertCircle} label="Đã từ chối" />
                                ) : isLeaderRejected ? (
                                    <StatusBadge color="red" icon={AlertCircle} label="Leader từ chối" />
                                ) : isAutoRejected ? (
                                    <StatusBadge color="slate" icon={AlertCircle} label="Không được duyệt" />
                                ) : isLeaderApproved ? (
                                    <StatusBadge color="emerald" icon={CheckCircle2} label="Leader đã duyệt (Chờ duyệt)" />
                                ) : (
                                    <StatusBadge color="slate" icon={Clock} label={waitLabel} />
                                )}
                            </>
                        )}

                        {/* Leader view */}
                        {isLeaderUser && !isAdminUser && (
                            <>
                                {isAdminApproved ? (
                                    <StatusBadge color="blue" icon={CheckCircle2} label="Đã duyệt" />
                                ) : isAdminRejected ? (
                                    <StatusBadge color="red" icon={AlertCircle} label="Đã từ chối" />
                                ) : !canLeaderAction && _isLeaderTeamMatch && !isAdminHandled ? (
                                    isLeaderApproved ? (
                                        <StatusBadge color="slate" icon={CheckCircle2} label="Đã duyệt (Đã khóa)" />
                                    ) : isLeaderRejected ? (
                                        <StatusBadge color="slate" icon={AlertCircle} label="Đã từ chối (Đã khóa)" />
                                    ) : isReportFromLeader || !r.team || r.team.trim() === "" || normalize(r.team) === "khac" ? (
                                        <StatusBadge color="slate" icon={Clock} label="Chờ Admin duyệt" />
                                    ) : (
                                        <StatusBadge color="slate" icon={AlertCircle} label="Không được duyệt (Quá hạn)" />
                                    )
                                ) : null}
                            </>
                        )}

                        {/* Admin view */}
                        {isAdminUser && (
                            <>
                                {isLeaderApproved && (
                                    <StatusBadge
                                        color={isExpired ? "slate" : "emerald"}
                                        icon={CheckCircle2}
                                        label={`Leader đã duyệt${isExpired ? " (Khóa)" : ""}`}
                                    />
                                )}
                                {isLeaderRejected && (
                                    <StatusBadge
                                        color={isExpired ? "slate" : "red"}
                                        icon={AlertCircle}
                                        label={`Leader từ chối${isExpired ? " (Khóa)" : ""}`}
                                    />
                                )}
                            </>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-center flex-wrap gap-2 mt-1">
                        {canLeaderAction && (
                            <>
                                <ActionButton
                                    active={isLeaderApproved}
                                    activeColor="slate"
                                    inactiveColor="emerald"
                                    activeLabel="Hủy duyệt"
                                    inactiveLabel="Duyệt"
                                    icon={Check}
                                    onClick={() =>
                                        handleUpdateStatus(r.id, isLeaderApproved ? "Chưa duyệt" : "Leader đã duyệt")
                                    }
                                />
                                <ActionButton
                                    active={isLeaderRejected}
                                    activeColor="slate"
                                    inactiveColor="red"
                                    activeLabel="Hủy từ chối"
                                    inactiveLabel="Từ chối"
                                    icon={X}
                                    onClick={() =>
                                        handleUpdateStatus(r.id, isLeaderRejected ? "Chưa duyệt" : "Leader từ chối")
                                    }
                                />
                            </>
                        )}

                        {canAdminAction && (
                            <>
                                <ActionButton
                                    active={isAdminApproved}
                                    activeColor="slate"
                                    inactiveColor="blue"
                                    activeLabel="Hủy duyệt"
                                    inactiveLabel="Duyệt"
                                    icon={Check}
                                    onClick={() =>
                                        handleUpdateStatus(
                                            r.id,
                                            isAdminApproved
                                                ? isLeaderApproved ? "Leader đã duyệt" : isLeaderRejected ? "Leader từ chối" : "Chưa duyệt"
                                                : `Admin đã duyệt | ${isLeaderApproved ? "Leader đã duyệt" : isLeaderRejected ? "Leader từ chối" : ""}`,
                                        )
                                    }
                                />
                                <ActionButton
                                    active={isAdminRejected}
                                    activeColor="slate"
                                    inactiveColor="red"
                                    activeLabel="Hủy từ chối"
                                    inactiveLabel="Từ chối"
                                    icon={X}
                                    onClick={() =>
                                        handleUpdateStatus(
                                            r.id,
                                            isAdminRejected
                                                ? isLeaderApproved ? "Leader đã duyệt" : isLeaderRejected ? "Leader từ chối" : "Chưa duyệt"
                                                : `Admin từ chối | ${isLeaderApproved ? "Leader đã duyệt" : isLeaderRejected ? "Leader từ chối" : ""}`,
                                        )
                                    }
                                />
                            </>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
};

// ── Tiny reusable atoms ────────────────────────────────────────────────────────
type Color = "blue" | "red" | "emerald" | "slate";

const colorMap: Record<Color, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    red: "bg-red-50 text-red-700 border-red-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    slate: "bg-slate-50 text-slate-500 border-slate-200",
};

const actionColorMap: Record<string, string> = {
    slate: "bg-slate-200 text-slate-700",
    emerald: "bg-emerald-600 text-white shadow-emerald-200/50",
    blue: "bg-blue-600 text-white shadow-blue-200/50",
    red: "bg-red-600 text-white shadow-red-200/50",
};

const StatusBadge = ({
    color,
    icon: Icon,
    label,
}: {
    color: Color;
    icon: React.ElementType;
    label: string;
}) => (
    <span
        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border flex items-center gap-1 ${colorMap[color]}`}
    >
        <Icon className="w-3.5 h-3.5" /> {label}
    </span>
);

const ActionButton = ({
    active,
    activeColor,
    inactiveColor,
    activeLabel,
    inactiveLabel,
    icon: Icon,
    onClick,
}: {
    active: boolean;
    activeColor: string;
    inactiveColor: string;
    activeLabel: string;
    inactiveLabel: string;
    icon: React.ElementType;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase flex items-center gap-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 ${
            active ? actionColorMap[activeColor] : actionColorMap[inactiveColor]
        }`}
    >
        <Icon className="w-3.5 h-3.5" strokeWidth={4} />
        {active ? activeLabel : inactiveLabel}
    </button>
);