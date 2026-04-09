"use client";

import React, { Suspense, useEffect, useState, useCallback, useMemo, useDeferredValue } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import ActivityKPIs from "./components/ActivityKPIs";
import ActivityFilters from "./components/ActivityFilters";
import UserActivityCard from "./components/UserActivityCard";
import ReportCard from "./components/ReportCard";

const DashboardAnalytics = dynamic(() => import("./components/DashboardAnalytics"), { ssr: false });
const RankingView = dynamic(() => import("./components/RankingView"), { ssr: false });
const PersonalCharts = dynamic(() => import("./components/PersonalCharts"), { ssr: false });
const ChecklistContainer = dynamic(() => import("@/components/checklist/ChecklistContainer"), { ssr: false });
import {
    RefreshCw,
    Users,
    User,
    FileText,
    ClipboardList,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
    ShieldCheck,
    Calendar,
    BarChart3,
    Check,
    Clock,
    AlertCircle,
    CheckCircle2,
    LayoutDashboard,
    Layout,
    CheckSquare,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useSearchParams, useRouter } from "next/navigation";
import { UserRole } from "@/types/auth";
import { useActivityData } from "./hooks/useActivityData";
import { useActivityFilters, CARDS_PER_BATCH, CHECKLIST_PAGE_SIZE } from "./hooks/useActivityFilters";

const normalize = (str: any) => (str || "").toString().toLowerCase().trim().replace(/\s+/g, "");

type ActiveTab =
    | "dashboard"
    | "performance"
    | "ranking"
    | "personal"
    | "daily_checklist"
    | "daily_report"
    | "daily_outstanding";

const TAB_MAP: Record<string, ActiveTab> = {
    activity_performance: "performance",
    performance: "performance",
    activity_dashboard: "dashboard",
    dashboard: "dashboard",
    activity_ranking: "ranking",
    ranking: "ranking",
    activity_personal: "personal",
    personal: "personal",
    activity_checklist: "daily_checklist",
    daily_checklist: "daily_checklist",
    activity_report: "daily_report",
    daily_report: "daily_report",
    activity_outstanding: "daily_outstanding",
    daily_outstanding: "daily_outstanding",
};

const ACTIVE_TAB_IDS: ActiveTab[] = [
    "dashboard",
    "performance",
    "ranking",
    "personal",
    "daily_checklist",
    "daily_report",
    "daily_outstanding",
];

function activeTabFromSearchParam(tab: string | null): ActiveTab | null {
    if (!tab) return null;
    const key = tab.trim();
    if (TAB_MAP[key]) return TAB_MAP[key];
    if (ACTIVE_TAB_IDS.includes(key as ActiveTab)) return key as ActiveTab;
    return null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
    });
}

/** html-to-image không vẽ được ảnh cross-origin (Drive, Lark, …) → mất avatar; inline qua API same-origin. */
async function embedCrossOriginImagesForCapture(root: HTMLElement): Promise<() => void> {
    const imgs = Array.from(root.querySelectorAll("img"));
    const backup = imgs.map((img) => ({
        img,
        src: img.getAttribute("src"),
        srcset: img.getAttribute("srcset"),
    }));

    await Promise.all(
        imgs.map(async (img) => {
            const raw = img.currentSrc || img.src || "";
            if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return;

            let absolute: URL;
            try {
                absolute = new URL(raw, window.location.href);
            } catch {
                return;
            }

            if (absolute.origin === window.location.origin) return;

            const proxyUrl = `/api/capture-image?url=${encodeURIComponent(absolute.href)}`;
            try {
                const r = await fetch(proxyUrl);
                if (!r.ok) return;
                const dataUrl = await blobToDataUrl(await r.blob());
                img.src = dataUrl;
                img.removeAttribute("srcset");
                try {
                    await img.decode();
                } catch {
                    await new Promise((res) => setTimeout(res, 50));
                }
            } catch {
                /* giữ ảnh gốc */
            }
        }),
    );

    return () => {
        backup.forEach(({ img, src, srcset }) => {
            if (src != null) img.setAttribute("src", src);
            else img.removeAttribute("src");
            if (srcset != null) img.setAttribute("srcset", srcset);
            else img.removeAttribute("srcset");
        });
    };
}

const CardSkeleton = () => (
    <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-white animate-pulse">
        <div className="p-4 flex flex-col items-center">
            <div className="mt-2 mb-3">
                <div className="w-16 h-16 rounded-full bg-slate-200" />
            </div>
            <div className="text-center mb-4 w-full flex flex-col items-center">
                <div className="h-4 w-24 bg-slate-200 rounded mb-2" />
                <div className="flex gap-1.5">
                    <div className="h-4 w-14 bg-slate-100 rounded" />
                    <div className="h-4 w-16 bg-slate-100 rounded" />
                </div>
            </div>
            <div className="w-full space-y-1.5 mb-4 px-1">
                <div className="h-9 bg-slate-100 rounded-2xl" />
                <div className="h-9 bg-slate-100 rounded-2xl" />
                <div className="h-9 bg-slate-100 rounded-2xl" />
            </div>
            <div className="h-7 w-28 bg-slate-200 rounded-2xl mb-4" />
            <div className="w-full space-y-1.5 mb-4 px-1">
                <div className="flex justify-between">
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                    <div className="h-3 w-8 bg-slate-100 rounded" />
                </div>
                <div className="h-2 bg-slate-100 rounded-full" />
            </div>
            <div className="grid grid-cols-2 w-full gap-2 px-1">
                <div className="h-14 bg-slate-100 rounded-2xl" />
                <div className="h-14 bg-slate-100 rounded-2xl" />
            </div>
        </div>
    </div>
);

const UserActivityPageContent = () => {
    const user = useAuthStore(s => s.user);
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const reportParam = searchParams.get("report");

    const [activeTab, setActiveTab] = React.useState<ActiveTab>(
        () => activeTabFromSearchParam(tabParam) ?? "daily_checklist",
    );
    const [reportType, setReportType] = React.useState<"select" | "daily" | "monthly">(() => {
        const r = reportParam?.trim().toLowerCase();
        if (r === "daily") return "daily";
        if (r === "monthly") return "monthly";
        return "select";
    });
    const [dailySubtype, setDailySubtype] = React.useState<"select" | "traffic" | "work">("select");
    const [reportMode, setReportMode] = React.useState<"select" | "member" | "leader">("select");
    const [allowedMenuIds, setAllowedMenuIds] = React.useState<string[]>([]);
    const [isPersonalDetailed, setIsPersonalDetailed] = React.useState(false);
    const [showTabMenu, setShowTabMenu] = React.useState(false);
    const [isCapturing, setIsCapturing] = React.useState(false);

    const {
        activeTeam,
        setActiveTeam,
        selectedDate,
        setSelectedDate,
        searchName,
        setSearchName,
        dailyFilter,
        setDailyFilter,
        timeType,
        setTimeType,
        dateRange,
        setDateRange,
        visibleCount,
        setVisibleCount,
        checklistPage,
        setChecklistPage,
        checklistRoleFilter,
        setChecklistRoleFilter,
        loadMoreRef,
    } = useActivityFilters();

    // useDeferredValue: filter/sort chỉ chạy sau khi trình duyệt xử lý input xong
    const deferredSearchName = useDeferredValue(searchName);

    const {
        reports,
        summary,
        rankings,
        teamContributions,
        groupContributions,
        reportOutstandings,
        kpiMeta,
        loading,
        userRole,
        userTeam,
        personalHistory,
        fetchReports,
        fetchHistory,
        handleUpdateStatus,
    } = useActivityData({
        user,
        dateRange,
        activeTeam,
        timeType,
        searchName,
        activeTab,
    });

    // Đồng bộ ?tab= & ?report= từ URL (Sidebar và deep link)
    React.useEffect(() => {
        const next = activeTabFromSearchParam(tabParam);
        if (next) setActiveTab(next);
    }, [tabParam]);

    // Tab Tổng quan (dashboard) chỉ dành cho MANAGER — admin thuần không dùng được
    React.useEffect(() => {
        if (!user || tabParam !== "dashboard") return;
        const hasManagerRole = user.roles?.includes(UserRole.MANAGER) || userRole === "manager";
        if (!hasManagerRole) {
            router.replace("/dashboard/manager/user-activity?tab=performance");
        }
    }, [user, tabParam, userRole, router]);

    React.useEffect(() => {
        const r = reportParam?.trim().toLowerCase();
        if (r === "daily") setReportType("daily");
        else if (r === "monthly") setReportType("monthly");
    }, [reportParam]);

    React.useEffect(() => {
        const handleResetReport = (e: any) => {
            const detailType = e.detail?.type;
            if (detailType) {
                setReportType(detailType);
            }
            setActiveTab("daily_report");
            setDailySubtype("select");
            setReportMode("select");
        };
        window.addEventListener("resetUserActivityDailyReport", handleResetReport);
        return () => window.removeEventListener("resetUserActivityDailyReport", handleResetReport);
    }, []);

    // Infinite scroll: load more cards when sentinel enters viewport
    React.useEffect(() => {
        const el = loadMoreRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleCount((prev) => prev + CARDS_PER_BATCH);
                }
            },
            { rootMargin: "200px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [reports.length]);

    // Team categorization: accumulate known teams across fetches, then categorize
    // Split combined teams like "Team K1, Đồ Da" into individual entries
    const [allKnownTeams, setAllKnownTeams] = React.useState<string[]>([]);
    React.useEffect(() => {
        const hasContrib = teamContributions && teamContributions.length > 0;
        const hasReports = reports && reports.length > 0;
        if (!hasContrib && !hasReports) return;
        setAllKnownTeams((prev) => {
            const next = new Set(prev);
            let changed = false;
            const addTeamString = (t: string | null | undefined) => {
                if (!t || t === "Khác") return;
                const parts = t.includes(",") ? t.split(",").map((p: string) => p.trim()).filter(Boolean) : [t];
                for (const part of parts) {
                    if (part && part !== "Khác" && !next.has(part)) {
                        next.add(part);
                        changed = true;
                    }
                }
            };
            teamContributions?.forEach((item) => addTeamString(item.team));
            reports?.forEach((r) => addTeamString(r.team));
            return changed ? Array.from(next) : prev;
        });
    }, [teamContributions, reports]);

    const { globalTeams, vnTeams } = React.useMemo(() => {
        const globals: string[] = [];
        const vns: string[] = [];
        const GLOBAL_KEYWORDS = ["global", "jp", "thái lan", "đài loan", "indo"];
        allKnownTeams.forEach((teamName) => {
            const isGlobal = GLOBAL_KEYWORDS.some((kw) => teamName.toLowerCase().includes(kw));
            if (isGlobal && !globals.includes(teamName)) globals.push(teamName);
            else if (!isGlobal && !vns.includes(teamName)) vns.push(teamName);
        });
        return { globalTeams: globals.sort(), vnTeams: vns.sort() };
    }, [allKnownTeams]);

    const matchTeam = React.useCallback(
        (teamName: string | null | undefined): boolean => {
            if (activeTeam === "All") return true;

            const raw = teamName || "Khác";
            const parts = raw.includes(",") ? raw.split(",").map((p) => normalize(p.trim())) : [normalize(raw)];
            const safeActive = normalize(activeTeam);

            if (activeTeam === "All Global") return parts.some((p) => globalTeams.some((t) => normalize(t) === p));
            if (activeTeam === "All VN") return parts.some((p) => vnTeams.some((t) => normalize(t) === p));

            return parts.includes(safeActive);
        },
        [activeTeam, globalTeams, vnTeams],
    );

    // Stable ISO strings for DashboardAnalytics — prevents refetch storms from object identity changes
    const dashboardStartISO = useMemo(() => dateRange.start.toISOString(), [dateRange.start.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
    const dashboardEndISO = useMemo(() => dateRange.end.toISOString(), [dateRange.end.getTime()]);   // eslint-disable-line react-hooks/exhaustive-deps

    // Role helpers (memoized to avoid re-compute on every render)
    const sysRoles = useMemo(() => user?.roles ?? [], [user]);
    const isAdminUser = React.useMemo(
        () =>
            sysRoles.includes(UserRole.ADMIN) ||
            sysRoles.includes(UserRole.MANAGER) ||
            userRole === "admin" ||
            userRole === "manager",
        [userRole, sysRoles], // eslint-disable-line react-hooks/exhaustive-deps
    );
    const isLeaderUser = React.useMemo(
        () => sysRoles.includes(UserRole.LEADER) || userRole === "leader",
        [userRole, sysRoles], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const [initialTeamSet, setInitialTeamSet] = React.useState(false);

    // Filter Logic: If not Admin, handle team routing
    React.useEffect(() => {
        if (!isAdminUser && userTeam) {
            if (!initialTeamSet) {
                const firstTeam = userTeam.includes(",") ? userTeam.split(",")[0].trim() : userTeam;
                setActiveTeam(firstTeam);
                setInitialTeamSet(true);
            }
        }
    }, [isAdminUser, userTeam, initialTeamSet]);

    const handleCaptureFullPage = async () => {
        const container = document.getElementById("report-view-container");
        if (!container) return;

        const scrollY = window.scrollY;
        let revertImgs: (() => void) | undefined;

        setIsCapturing(true);

        try {
            const { toPng } = await import("html-to-image");
            window.scrollTo(0, 0);
            await new Promise((r) => setTimeout(r, 1000));

            const contentArea = container.querySelector(".relative.z-10.space-y-2") as HTMLElement;
            const captureTarget = contentArea || container;

            revertImgs = await embedCrossOriginImagesForCapture(captureTarget);
            await new Promise((r) => setTimeout(r, 500)); // Thêm chút thời gian sau khi zoom to ra

            const filter = (node: HTMLElement) => {
                if (node.tagName === "LINK" && (node as HTMLLinkElement).rel === "prefetch") return false;
                if (node.classList?.contains("sticky")) return false;
                if (node.tagName === "NAV") return false;
                return true;
            };

            let dataUrl: string | null = null;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    dataUrl = await toPng(captureTarget, {
                        quality: 1,
                        pixelRatio: 2,
                        backgroundColor: "#f8fafc",
                        cacheBust: true,
                        includeQueryParams: true,
                        skipAutoScale: true,
                        filter: filter as any,
                        fetchRequestInit: { mode: "cors", cache: "force-cache" } as any,
                        imagePlaceholder:
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23e2e8f0' rx='20'/%3E%3C/svg%3E",
                    });
                    if (dataUrl) break;
                } catch {
                    await new Promise((r) => setTimeout(r, 500));
                }
            }

            if (!dataUrl) throw new Error("Screenshot failed after retries");

            const now = new Date();
            const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `VCB_Report_${ts}.png`;
            link.click();
        } catch (e) {
            console.error("Capture screenshot failed:", e);
            alert("Lỗi chụp màn hình. Hãy thử lại.");
        } finally {
            revertImgs?.();
            setIsCapturing(false);
            window.scrollTo(0, scrollY);
        }
    };

    const allTabs = React.useMemo(
        () => [
            { id: "performance", label: "Hiệu Suất", icon: RefreshCw },
            { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
            { id: "ranking", label: "Bảng xếp hạng", icon: Layout },
            { id: "personal", label: "Tiến độ", icon: User },
            { id: "daily_report", label: "Báo cáo", icon: FileText },
            { id: "daily_outstanding", label: "Vấn đề & Win", icon: ClipboardList },
            { id: "daily_checklist", label: "Checklist", icon: CheckSquare },
        ],
        [],
    );

    const visibleTabs = React.useMemo(() => {
        const hasManagerRole = sysRoles.includes(UserRole.MANAGER) || userRole === "manager";
        const isAdminOnlyNav = sysRoles.includes(UserRole.ADMIN);
        return allTabs
            .filter((tab) => {
                if (tab.id === "dashboard") return hasManagerRole;
                return true;
            })
            .map((tab) =>
                tab.id === "daily_outstanding" && isAdminOnlyNav
                    ? { ...tab, label: "Duyệt vấn đề & win" }
                    : tab,
            );
    }, [allTabs, sysRoles, userRole]);

    // Memoize filtered report lists to avoid expensive re-filtering on every render
    // Dùng deferredSearchName thay searchName → filter không chặn main thread khi gõ
    const filteredPerformanceReports = React.useMemo(() => {
        return reports.filter((r) => {
            return matchTeam(r.team) && (r.name || "Unknown").toLowerCase().includes(deferredSearchName.toLowerCase());
        });
    }, [reports, matchTeam, deferredSearchName]);

    const filteredPersonalMembers = React.useMemo(() => {
        return personalHistory.members.filter((m) => {
            return matchTeam(m.team);
        });
    }, [personalHistory.members, matchTeam]);

    const filteredAllReports = React.useMemo(() => {
        return reports.filter((r) => {
            const isSearchMatch = (r.name || "Unknown").toLowerCase().includes(deferredSearchName.toLowerCase());
            return matchTeam(r.team) && isSearchMatch;
        });
    }, [reports, matchTeam, deferredSearchName]);

    const filteredChecklistReports = React.useMemo(() => {
        const uniqueKeys = new Set();
        return reportOutstandings.filter((r) => {
            // --- NEW RULES for Workflow Priority ---
            const isMyReport = user?.email && r.email && normalize(r.email) === normalize(user.email);
            const userTeamParts = (userTeam || "").split(",").map((p: string) => normalize(p.trim())).filter(Boolean);
            const reportTeamParts = (r.team || "").split(",").map((p: string) => normalize(p.trim())).filter(Boolean);
            const isMyTeam = userTeamParts.length > 0 && reportTeamParts.some((rp: string) => userTeamParts.includes(rp));
            const rRole = (r.role || "").toLowerCase();
            const rPos = (r.position || "").toLowerCase();
            const isReportFromLeader = rRole.includes("leader") || rPos.includes("leader");

            if (!isAdminUser) {
                // Non-admins (Leaders/Members) can ONLY see their own team's outstanding reports
                // Exception: ALWAYS allow seeing own reports even if team has slight naming mismatch
                if (!isMyTeam && !isMyReport) return false;
            }

            const statusText = (r.approval_status || "").toLowerCase();
            const isLeaderHandled = statusText.includes("leader đã duyệt") || statusText.includes("leader từ chối");
            const isLegacyHandled =
                statusText === "đã duyệt" || statusText === "từ chối" || statusText === "không duyệt";
            const isAdminHandled = statusText.includes("admin đã duyệt") || statusText.includes("admin từ chối");

            if (isAdminUser) {
                // Admin ONLY sees reports AFTER Leader handled them (or legacy or admin handled)
                // Exception: If no team, no leader exists -> show directly to admin
                const hasNoTeam = !r.team || r.team.trim() === "" || normalize(r.team) === "khac";
                if (!isLeaderHandled && !isLegacyHandled && !isAdminHandled && !hasNoTeam) return false;
            }

            // Normal filters
            if (!matchTeam(r.team) && !isMyReport) return false;
            if (!(r.name || "Unknown").toLowerCase().includes(deferredSearchName.toLowerCase())) return false;

            // Deduplicate by Name + Category + Content to prevent identical visual rows
            const key = `${r.name}_${r.category}_${r.content}`.toLowerCase().trim();
            if (uniqueKeys.has(key)) return false;
            uniqueKeys.add(key);

            return true;
        });
    }, [reportOutstandings, matchTeam, deferredSearchName, isAdminUser, userTeam]);

    const checklistFilteredReports = React.useMemo(() => {
        // Bước 1: Lọc theo text search và dropdown team
        let roleFiltered = reports.filter((r) => {
            if (!matchTeam(r.team)) return false;
            if (!(r.name || "Unknown").toLowerCase().includes(deferredSearchName.toLowerCase())) return false;
            return true;
        });

        // Bước 2: Áp filter Leader/Member button filter
        return roleFiltered.filter((r) => {
            if (checklistRoleFilter === "all") return true;
            const pos = (r.position || "").toLowerCase();
            const isReportLeader = pos === "leader" || pos.includes("leader") || pos.includes("trưởng nhóm");
            if (checklistRoleFilter === "leader") return isReportLeader;
            return !isReportLeader; // 'member'
        });
    }, [reports, matchTeam, deferredSearchName, checklistRoleFilter]);

    return (
        <div id="report-view-container" className="min-h-screen bg-slate-50/20 space-y-3 selection:bg-blue-500/30">
            {activeTab !== "daily_report" && (
                <div className="sticky top-[48px] z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-sm px-4 py-2">
                    <ActivityFilters
                        activeTeam={activeTeam}
                        setActiveTeam={setActiveTeam}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        searchName={searchName}
                        setSearchName={setSearchName}
                        userRole={userRole}
                        userTeam={userTeam}
                        activeTab={activeTab}
                        globalTeams={globalTeams}
                        vnTeams={vnTeams}
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        timeType={timeType}
                        setTimeType={setTimeType}
                        onCapture={handleCaptureFullPage}
                        isNavbar={false}
                    />
                </div>
            )}

            <div className="relative z-10 space-y-2 p-2 sm:p-4">
                {activeTab !== "personal" &&
                    activeTab !== "daily_report" &&
                    activeTab !== "daily_checklist" &&
                    activeTab !== "daily_outstanding" && (
                        <div className="relative z-10 transition-all duration-500 space-y-2">
                            {kpiMeta && kpiMeta.kpiTotalInDb === 0 && (
                                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                                    <strong>Chưa có dữ liệu bảng larkKPI.</strong> Số liệu thống kê và card nhân viên
                                    lấy từ bảng này. Vui lòng đồng bộ KPI từ Lark (gọi API sync KPI hoặc dùng menu cấu
                                    hình backend).
                                </div>
                            )}
                            {kpiMeta?.kpiMonthFallback && (
                                <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                                    Đang hiển thị toàn bộ KPI trong DB vì không có bản ghi khớp tháng đang chọn. Để lọc
                                    đúng tháng, hãy đặt cột &quot;Tháng&quot; trong Lark đúng format (VD: T2, 2, Tháng
                                    2) rồi đồng bộ lại.
                                </div>
                            )}
                            {loading && !summary ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="bg-white rounded-3xl border border-slate-200/60 p-3 animate-pulse"
                                        >
                                            <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="w-16 h-16 rounded-full bg-slate-100" />
                                                <div className="flex-1">
                                                    <div className="h-8 w-20 bg-slate-200 rounded mb-2" />
                                                    <div className="h-3 w-28 bg-slate-100 rounded" />
                                                </div>
                                            </div>
                                            <div className="border-t border-slate-100 pt-3 flex justify-between">
                                                <div className="h-6 w-16 bg-slate-100 rounded" />
                                                <div className="h-6 w-16 bg-slate-100 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <ActivityKPIs
                                    summary={summary}
                                    teamContributions={teamContributions}
                                    groupContributions={groupContributions}
                                />
                            )}
                        </div>
                    )}

                <main className="min-h-[60vh]">
                    {activeTab === "dashboard" ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <DashboardAnalytics startDate={dashboardStartISO} endDate={dashboardEndISO} activeTeam={activeTeam} />
                        </div>
                    ) : activeTab === "performance" ? (
                        loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-7">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <CardSkeleton key={i} />
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-7">
                                    {filteredPerformanceReports.slice(0, visibleCount).map((report, idx) => {
                                        const isOwnName =
                                            report.name &&
                                            user?.full_name &&
                                            normalize(report.name) === normalize(user.full_name);
                                        const isOwnEmail =
                                            report.email &&
                                            user?.email &&
                                            normalize(report.email) === normalize(user.email);
                                        const isOwnCard = isOwnName || isOwnEmail;
                                        const _utParts = (userTeam || "").split(",").map((p: string) => normalize(p.trim())).filter(Boolean);
                                        const _rtParts = (report.team || "").split(",").map((p: string) => normalize(p.trim())).filter(Boolean);
                                        const isReportMyTeam = _utParts.length > 0 && _rtParts.some((rp: string) => _utParts.includes(rp));
                                        const canClickCard =
                                            isAdminUser ||
                                            (isLeaderUser && isReportMyTeam) ||
                                            isOwnCard;
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
                                                    onClick={() => {
                                                        setSearchName(report.name);
                                                        setIsPersonalDetailed(true);
                                                        setActiveTab("personal");
                                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                {visibleCount < filteredPerformanceReports.length && (
                                    <div ref={loadMoreRef} className="flex justify-center py-8">
                                        <div className="flex items-center gap-2 text-sm text-slate-400 font-bold">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Đang tải thêm...
                                        </div>
                                    </div>
                                )}
                            </>
                        )
                    ) : activeTab === "ranking" ? (
                        <RankingView rankings={rankings} />
                    ) : activeTab === "personal" ? (
                        <div className="space-y-12">
                            <PersonalCharts
                                history={personalHistory.history}
                                teamStats={personalHistory.teamStats}
                                companyStats={personalHistory.companyStats}
                                userActivity={personalHistory.userActivity}
                                members={filteredPersonalMembers}
                                allReports={filteredAllReports}
                                setSearchName={setSearchName}
                                isDetailedMode={isPersonalDetailed}
                                setIsDetailedMode={setIsPersonalDetailed}
                                userRole={userRole || (isAdminUser ? "admin" : isLeaderUser ? "leader" : "member")}
                                userTeam={userTeam}
                                currentUserName={user?.full_name}
                                currentUserEmail={user?.email}
                            />
                        </div>
                    ) : activeTab === "daily_outstanding" ? (
                        <div className="space-y-4 w-full max-w-[2420px] px-3 pb-6 mx-auto">
                            {filteredChecklistReports.length > 0 ? (
                                <div className="space-y-6">
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
                                                    {/* Badge phân quyền */}
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

                                    <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl shadow-blue-500/5 overflow-hidden">
                                        <div className="max-h-[800px] overflow-y-auto scrollbar-thin">
                                            <table className="w-full border-collapse text-left">
                                                <thead className="sticky top-0 z-20 bg-gradient-to-r from-blue-700 to-indigo-800 shadow-lg">
                                                    <tr>
                                                        <th className="px-6 py-3 text-[13px] font-black uppercase text-blue-50 tracking-widest bg-transparent border-b border-white/10 text-center">
                                                            Chức danh
                                                        </th>
                                                        <th className="px-8 py-3 text-[13px] font-black uppercase text-blue-50 tracking-widest bg-transparent border-b border-white/10 text-left">
                                                            Nhân viên
                                                        </th>
                                                        <th className="px-6 py-3 text-[13px] font-black uppercase text-blue-50 tracking-widest bg-transparent border-b border-white/10 text-center">
                                                            Phân loại
                                                        </th>
                                                        <th className="px-8 py-3 text-[13px] font-black uppercase text-blue-50 tracking-widest bg-transparent border-b border-white/10 text-left">
                                                            Nội dung
                                                        </th>
                                                        <th className="px-8 py-3 text-[13px] font-black uppercase text-blue-50 tracking-widest bg-transparent border-b border-white/10 text-center">
                                                            Thao tác / Trạng thái
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {filteredChecklistReports.map((r, idx) => {
                                                        const statusText = (r.approval_status || "").toLowerCase();

                                                        const isLegacyApproved =
                                                            statusText === "đã duyệt" || statusText === "duyệt";
                                                        const isLegacyRejected =
                                                            statusText === "từ chối" || statusText === "không duyệt";

                                                        const isLeaderApproved = statusText.includes("leader đã duyệt");
                                                        const isLeaderRejected = statusText.includes("leader từ chối");
                                                        const isLeaderHandled = isLeaderApproved || isLeaderRejected;

                                                        const isAdminApproved =
                                                            statusText.includes("admin đã duyệt") || isLegacyApproved;
                                                        const isAdminRejected =
                                                            statusText.includes("admin từ chối") || isLegacyRejected;
                                                        const isAdminHandled = isAdminApproved || isAdminRejected;

                                                        const isReportFromLeader =
                                                            (r.role || "").toLowerCase().includes("leader") ||
                                                            (r.position || "").toLowerCase().includes("leader");

                                                        // Check if report is older than 1 day
                                                        let isExpired = false;
                                                        if (r.date) {
                                                            let rDateObj = new Date(r.date);
                                                            if (r.date.includes("/")) {
                                                                const parts = r.date.split("/");
                                                                if (parts.length === 3) {
                                                                    rDateObj = new Date(
                                                                        parseInt(parts[2]),
                                                                        parseInt(parts[1]) - 1,
                                                                        parseInt(parts[0]),
                                                                    );
                                                                }
                                                            }
                                                            if (!isNaN(rDateObj.getTime())) {
                                                                // > 24 hours
                                                                if (
                                                                    new Date().getTime() - rDateObj.getTime() >
                                                                    24 * 60 * 60 * 1000
                                                                ) {
                                                                    isExpired = true;
                                                                }
                                                            }
                                                        }

                                                        // Permissions
                                                        // BỔ SUNG: Nếu report là từ Leader, hoặc KHÔNG CÓ TEAM, thì chỉ Admin mới được duyệt.
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
                                                        const canAdminAction = !isExpired && isAdminUser; // Màn Admin có thể thao tác hết
                                                        const isAutoRejected = isExpired && !isAdminHandled;

                                                        return (
                                                            <tr
                                                                key={r.id || idx}
                                                                className="hover:bg-blue-50/40 transition-all group"
                                                            >
                                                                <td className="px-6 py-3 border-r border-slate-50 text-center">
                                                                    <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-[12px] font-black uppercase tracking-widest shadow-sm">
                                                                        {r.role || "Member"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-8 py-3 border-r border-slate-50">
                                                                    <div className="font-black text-slate-900 text-[18px] mb-1">
                                                                        {r.name}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-[12px] text-blue-700 font-bold">
                                                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100">
                                                                            {r.team}
                                                                        </span>
                                                                        <span className="text-slate-400 font-medium italic">
                                                                            {r.date}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3 border-r border-slate-50 text-center">
                                                                    <span
                                                                        className={`px-3 py-2 rounded-xl text-[12px] font-black uppercase tracking-tight ${r.category?.toLowerCase().includes("win")
                                                                            ? "bg-purple-100 text-purple-800 border-2 border-purple-200 shadow-sm shadow-purple-100"
                                                                            : "bg-amber-100 text-amber-800 border-2 border-amber-200 shadow-sm shadow-amber-100"
                                                                            }`}
                                                                    >
                                                                        {r.category || "-"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-8 py-3 border-r border-slate-50">
                                                                    <div className="text-[17px] text-slate-900 font-bold leading-relaxed max-w-[800px]">
                                                                        {r.content || "Không có nội dung"}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3.5 text-center">
                                                                    <div className="flex justify-center flex-col gap-2 relative">
                                                                        {/* Trạng thái hiển thị */}
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            {/* Member View */}
                                                                            {!isAdminUser && !isLeaderUser && (
                                                                                <>
                                                                                    {isAdminApproved ? (
                                                                                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                                                                            <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                                                                            Đã duyệt
                                                                                        </span>
                                                                                    ) : isAdminRejected ? (
                                                                                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                                                                                            <AlertCircle className="w-3.5 h-3.5" />{" "}
                                                                                            Đã từ chối
                                                                                        </span>
                                                                                    ) : isLeaderRejected ? (
                                                                                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                                                                                            <AlertCircle className="w-3.5 h-3.5" />{" "}
                                                                                            Leader từ chối
                                                                                        </span>
                                                                                    ) : isAutoRejected ? (
                                                                                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-50 text-slate-500 border border-slate-200 flex items-center gap-1">
                                                                                            <AlertCircle className="w-3.5 h-3.5" />{" "}
                                                                                            Không được duyệt
                                                                                        </span>
                                                                                    ) : isLeaderApproved ? (
                                                                                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                                                            <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                                                                            Leader đã duyệt (Chờ duyệt)
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-50 text-slate-500 border border-slate-200 flex items-center gap-1">
                                                                                            <Clock className="w-3.5 h-3.5" />{" "}
                                                                                            {isReportFromLeader ||
                                                                                                !r.team ||
                                                                                                r.team.trim() === "" ||
                                                                                                normalize(r.team) === "khac"
                                                                                                ? "Chờ Admin duyệt"
                                                                                                : "Chờ Leader duyệt"}
                                                                                        </span>
                                                                                    )}
                                                                                </>
                                                                            )}

                                                                            {/* Leader View (chỉ hiện kết quả của Manager) */}
                                                                            {isLeaderUser && !isAdminUser && (
                                                                                <>
                                                                                    {isAdminApproved ? (
                                                                                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                                                                            <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                                                                            Đã duyệt
                                                                                        </span>
                                                                                    ) : isAdminRejected ? (
                                                                                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                                                                                            <AlertCircle className="w-3.5 h-3.5" />{" "}
                                                                                            Đã từ chối
                                                                                        </span>
                                                                                    ) : !canLeaderAction &&
                                                                                        _isLeaderTeamMatch &&
                                                                                        !isAdminHandled ? (
                                                                                        isLeaderApproved ? (
                                                                                            <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-50 text-slate-500 border border-slate-200 flex items-center gap-1">
                                                                                                <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                                                                                Đã duyệt (Đã khóa)
                                                                                            </span>
                                                                                        ) : isLeaderRejected ? (
                                                                                            <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-50 text-slate-500 border border-slate-200 flex items-center gap-1">
                                                                                                <AlertCircle className="w-3.5 h-3.5" />{" "}
                                                                                                Đã từ chối (Đã khóa)
                                                                                            </span>
                                                                                        ) : isReportFromLeader ||
                                                                                            !r.team ||
                                                                                            r.team.trim() === "" ||
                                                                                            normalize(r.team) ===
                                                                                            "khac" ? (
                                                                                            <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-50 text-slate-500 border border-slate-200 flex items-center gap-1">
                                                                                                <Clock className="w-3.5 h-3.5" />{" "}
                                                                                                Chờ Admin duyệt
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-50 text-slate-500 border border-slate-200 flex items-center gap-1">
                                                                                                <AlertCircle className="w-3.5 h-3.5" />{" "}
                                                                                                Không được duyệt (Quá
                                                                                                hạn)
                                                                                            </span>
                                                                                        )
                                                                                    ) : null}
                                                                                </>
                                                                            )}

                                                                            {/* Admin View */}
                                                                            {isAdminUser && (
                                                                                <>
                                                                                    {isLeaderApproved ? (
                                                                                        <span
                                                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${isExpired ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"} border flex items-center gap-1`}
                                                                                        >
                                                                                            <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                                                                            Leader đã duyệt{" "}
                                                                                            {isExpired && "(Khóa)"}
                                                                                        </span>
                                                                                    ) : isLeaderRejected ? (
                                                                                        <span
                                                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${isExpired ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-red-50 text-red-700 border-red-200"} border flex items-center gap-1`}
                                                                                        >
                                                                                            <AlertCircle className="w-3.5 h-3.5" />{" "}
                                                                                            Leader từ chối{" "}
                                                                                            {isExpired && "(Khóa)"}
                                                                                        </span>
                                                                                    ) : null}
                                                                                </>
                                                                            )}
                                                                        </div>

                                                                        {/* Các nút hành động */}
                                                                        <div className="flex justify-center flex-wrap gap-2 mt-1">
                                                                            {canLeaderAction && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleUpdateStatus(
                                                                                                r.id,
                                                                                                isLeaderApproved
                                                                                                    ? "Chưa duyệt"
                                                                                                    : "Leader đã duyệt",
                                                                                            )
                                                                                        }
                                                                                        className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase flex items-center gap-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 ${isLeaderApproved ? "bg-slate-200 text-slate-700" : "bg-emerald-600 text-white shadow-emerald-200/50"}`}
                                                                                    >
                                                                                        <Check
                                                                                            className="w-3.5 h-3.5"
                                                                                            strokeWidth={4}
                                                                                        />{" "}
                                                                                        {isLeaderApproved
                                                                                            ? "Hủy duyệt"
                                                                                            : "Duyệt"}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleUpdateStatus(
                                                                                                r.id,
                                                                                                isLeaderRejected
                                                                                                    ? "Chưa duyệt"
                                                                                                    : "Leader từ chối",
                                                                                            )
                                                                                        }
                                                                                        className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase flex items-center gap-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 ${isLeaderRejected ? "bg-slate-200 text-slate-700" : "bg-red-600 text-white shadow-red-200/50"}`}
                                                                                    >
                                                                                        <X
                                                                                            className="w-3.5 h-3.5"
                                                                                            strokeWidth={4}
                                                                                        />{" "}
                                                                                        {isLeaderRejected
                                                                                            ? "Hủy từ chối"
                                                                                            : "Từ chối"}
                                                                                    </button>
                                                                                </>
                                                                            )}

                                                                            {canAdminAction && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleUpdateStatus(
                                                                                                r.id,
                                                                                                isAdminApproved
                                                                                                    ? isLeaderApproved
                                                                                                        ? "Leader đã duyệt"
                                                                                                        : isLeaderRejected
                                                                                                            ? "Leader từ chối"
                                                                                                            : "Chưa duyệt"
                                                                                                    : `Admin đã duyệt | ${isLeaderApproved ? "Leader đã duyệt" : isLeaderRejected ? "Leader từ chối" : ""}`,
                                                                                            )
                                                                                        }
                                                                                        className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase flex items-center gap-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 ${isAdminApproved ? "bg-slate-200 text-slate-700" : "bg-blue-600 text-white shadow-blue-200/50"}`}
                                                                                    >
                                                                                        <Check
                                                                                            className="w-3.5 h-3.5"
                                                                                            strokeWidth={4}
                                                                                        />{" "}
                                                                                        {isAdminApproved
                                                                                            ? "Hủy duyệt"
                                                                                            : "Duyệt"}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleUpdateStatus(
                                                                                                r.id,
                                                                                                isAdminRejected
                                                                                                    ? isLeaderApproved
                                                                                                        ? "Leader đã duyệt"
                                                                                                        : isLeaderRejected
                                                                                                            ? "Leader từ chối"
                                                                                                            : "Chưa duyệt"
                                                                                                    : `Admin từ chối | ${isLeaderApproved ? "Leader đã duyệt" : isLeaderRejected ? "Leader từ chối" : ""}`,
                                                                                            )
                                                                                        }
                                                                                        className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase flex items-center gap-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 ${isAdminRejected ? "bg-slate-200 text-slate-700" : "bg-red-600 text-white shadow-red-200/50"}`}
                                                                                    >
                                                                                        <X
                                                                                            className="w-3.5 h-3.5"
                                                                                            strokeWidth={4}
                                                                                        />{" "}
                                                                                        {isAdminRejected
                                                                                            ? "Hủy từ chối"
                                                                                            : "Từ chối"}
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="col-span-full py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                                        <FileText className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">
                                        Không tìm thấy báo cáo nào
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === "daily_checklist" ? (
                        <div 
                            className={`space-y-8 animate-in fade-in duration-700 mx-auto transition-all duration-500 ${isCapturing ? "max-w-[1350px]" : "max-w-[1400px]"}`}
                            style={{ zoom: isCapturing ? 1.4 : 1 }}
                        >
                            {/* Summary Cards Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                {[
                                    {
                                        label: "Tổng số",
                                        value: checklistFilteredReports.length,
                                        sub: "Thành viên",
                                        color: "blue",
                                        icon: Users,
                                    },
                                    {
                                        label: "Đã nộp",
                                        value: checklistFilteredReports.filter((r) => {
                                            const s = (r.status || "").toString().toUpperCase();
                                            return s === "ĐÚNG HẠN" || s === "TRỄ HẠN" || s === "SUBMITTED" || s === "ĐÃ BÁO CÁO ĐỦ";
                                        }).length,
                                        sub: "Đúng hạn",
                                        color: "emerald",
                                        icon: Check,
                                    },
                                    {
                                        label: "Chưa nộp",
                                        value: checklistFilteredReports.filter((r) => {
                                            const s = (r.status || "").toString().toUpperCase();
                                            return s === "CHƯA BÁO CÁO" || s === "CHƯA NỘP" || s === "PENDING" || s === "";
                                        }).length,
                                        sub: "Trong team",
                                        color: "red",
                                        icon: AlertCircle,
                                    },
                                ].map((stat, i) => (
                                    <div
                                        key={i}
                                        className={`bg-white rounded-[2rem] p-6 border-2 border-${stat.color}-50 shadow-xl shadow-${stat.color}-500/5 flex items-center justify-between group transition-all duration-300 hover:-translate-y-1`}
                                    >
                                        <div className="space-y-1">
                                            <p className={`text-[11px] font-black text-${stat.color}-700 uppercase tracking-[0.2em]`}>
                                                {stat.label}:
                                            </p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-[32px] font-black text-slate-900 leading-none">
                                                    {stat.value}
                                                </span>
                                                <span className="text-[14px] font-black text-slate-500">
                                                    {stat.sub}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-50 flex items-center justify-center transition-transform duration-500 group-hover:rotate-12`}>
                                            <stat.icon className={`w-7 h-7 text-${stat.color}-500`} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 p-4 rounded-[2rem] border border-slate-100 backdrop-blur-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                            <FileText className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-[20px] font-black text-slate-900 uppercase tracking-tight whitespace-nowrap">
                                                Báo cáo ngày
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[13px] font-bold text-blue-600">
                                                    {selectedDate ? new Intl.DateTimeFormat('vi-VN').format(selectedDate) : "Hôm nay"}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                                    {activeTeam || "Tất cả Team"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filter All/Leader/Member */}
                                    {(isAdminUser || isLeaderUser) && (
                                        <div className="flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                                            {[
                                                { id: "all", label: "Tất cả", color: "blue" },
                                                { id: "leader", label: "Leader", color: "amber" },
                                                { id: "member", label: "Member", color: "slate" },
                                            ].map((f) => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => {
                                                        setChecklistRoleFilter(f.id as "all" | "member" | "leader");
                                                        setChecklistPage(1);
                                                    }}
                                                    className={`px-5 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${checklistRoleFilter === f.id ? `bg-white text-${f.color}-600 shadow-md ring-1 ring-slate-200` : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/30"}`}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mx-auto">
                                    {loading ? (
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="bg-white rounded-[2rem] border-2 border-slate-50 h-[400px] animate-pulse"
                                            >
                                                <div className="p-6 space-y-6">
                                                    <div className="flex justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 rounded-2xl bg-slate-100" />
                                                            <div className="space-y-2">
                                                                <div className="h-4 w-24 bg-slate-100 rounded" />
                                                                <div className="h-3 w-16 bg-slate-50 rounded" />
                                                            </div>
                                                        </div>
                                                        <div className="h-8 w-20 bg-slate-100 rounded-full" />
                                                    </div>
                                                    <div className="h-full bg-slate-50 rounded-2xl" />
                                                </div>
                                            </div>
                                        ))
                                    ) : checklistFilteredReports.length > 0 ? (
                                        checklistFilteredReports
                                            .slice(
                                                (checklistPage - 1) * 4,
                                                checklistPage * 4
                                            )
                                            .map((report, idx) => (
                                                <div
                                                    key={report.id || idx}
                                                    className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                                                    style={{ animationDelay: `${idx * 100}ms` }}
                                                >
                                                    <ReportCard report={report} />
                                                </div>
                                            ))
                                    ) : (
                                        <div className="col-span-full py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4">
                                            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                                                <FileText className="w-10 h-10 text-slate-200" />
                                            </div>
                                            <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">
                                                Không tìm thấy báo cáo nào
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Pagination */}
                                {!loading && checklistFilteredReports.length > 6 && (
                                    <div className="flex items-center justify-center gap-4 mt-12 pb-8">
                                        <button
                                            onClick={() => setChecklistPage((p) => Math.max(1, p - 1))}
                                            disabled={checklistPage === 1}
                                            className={`w-12 h-12 flex items-center justify-center rounded-2xl border-2 transition-all duration-300 ${checklistPage === 1 ? "opacity-30 cursor-not-allowed border-slate-100 text-slate-300" : "bg-white text-blue-600 border-slate-100 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-200 hover:-translate-x-1"}`}
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </button>

                                        <div className="flex items-center gap-2 bg-white p-2 rounded-[1.5rem] border-2 border-slate-50 shadow-sm">
                                            {(() => {
                                                const totalPages = Math.ceil(checklistFilteredReports.length / 6);
                                                const pages = [];
                                                for (let i = 1; i <= totalPages; i++) {
                                                    if (
                                                        i === 1 ||
                                                        i === totalPages ||
                                                        (i >= checklistPage - 1 && i <= checklistPage + 1)
                                                    ) {
                                                        pages.push(i);
                                                    } else if (i === checklistPage - 2 || i === checklistPage + 2) {
                                                        pages.push("...");
                                                    }
                                                }
                                                // Unique only
                                                return Array.from(new Set(pages)).map((p, idx) => {
                                                    if (p === "...") return <span key={`dots-${idx}`} className="w-10 text-center text-slate-300 font-bold">...</span>;
                                                    const isCurrent = p === checklistPage;
                                                    return (
                                                        <button
                                                            key={p}
                                                            onClick={() => setChecklistPage(p as number)}
                                                            className={`w-10 h-10 rounded-xl font-black text-[13px] transition-all duration-300 ${isCurrent ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110" : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"}`}
                                                        >
                                                            {p}
                                                        </button>
                                                    );
                                                });
                                            })()}
                                        </div>

                                        <button
                                            onClick={() => setChecklistPage((p) => Math.min(Math.ceil(checklistFilteredReports.length / 4), p + 1))}
                                            disabled={checklistPage === Math.ceil(checklistFilteredReports.length / 4)}
                                            className={`w-12 h-12 flex items-center justify-center rounded-2xl border-2 transition-all duration-300 ${checklistPage === Math.ceil(checklistFilteredReports.length / 4) ? "opacity-30 cursor-not-allowed border-slate-100 text-slate-300" : "bg-white text-blue-600 border-slate-100 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-200 hover:translate-x-1"}`}
                                        >
                                            <ChevronRight className="w-6 h-6" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === "daily_report" ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {reportType === "select" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-10">
                                    <button
                                        onClick={() => setReportType("daily")}
                                        className="group relative bg-slate-950 p-8 rounded-[3rem] border border-slate-800 shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-500 overflow-hidden text-left"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-950/30 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-900/40 transition-colors" />
                                        <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all duration-500 shadow-inner">
                                            <Calendar className="w-8 h-8 text-blue-400" />
                                        </div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                                            Báo cáo ngày
                                        </h3>
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                            Báo cáo và đánh giá công việc hàng ngày của Leader và Member.
                                        </p>
                                        <div className="mt-8 flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-widest transition-all duration-500">
                                            Chọn loại báo cáo <ChevronDown className="-rotate-90 w-3 h-3 stroke-[3]" />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setReportType("monthly")}
                                        className="group relative bg-slate-950 p-8 rounded-[3rem] border border-slate-800 shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-500 overflow-hidden text-left"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-950/30 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-900/40 transition-colors" />
                                        <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all duration-500 shadow-inner">
                                            <BarChart3 className="w-8 h-8 text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                                            Báo cáo tháng
                                        </h3>
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                            Tổng hợp dữ liệu hiệu suất, traffic và doanh thu theo chu kỳ tháng.
                                        </p>
                                        <div className="mt-8 flex items-center gap-2 text-indigo-500 font-black text-xs uppercase tracking-widest transition-all duration-500">
                                            Xem báo cáo tháng <ChevronDown className="-rotate-90 w-3 h-3 stroke-[3]" />
                                        </div>
                                    </button>
                                </div>
                            ) : reportType === "daily" ? (
                                <>
                                    {dailySubtype === "select" ? (
                                        <div className="space-y-6">
                                            <div className="px-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setReportType("select")}
                                                    className="relative z-[500] flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100/80 text-slate-700 hover:bg-slate-200 font-bold transition-all group border border-slate-200 shadow-sm cursor-pointer"
                                                >
                                                    <ChevronDown className="rotate-90 w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
                                                    Quay lại chọn Loại
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                                                <button
                                                    onClick={() => setDailySubtype("traffic")}
                                                    className="group relative bg-slate-950 p-8 rounded-[3rem] border border-slate-800 shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2 transition-all duration-500 overflow-hidden text-left"
                                                >
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-950/30 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-purple-900/40 transition-colors" />
                                                    <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-500 transition-all duration-500 shadow-inner">
                                                        <BarChart3 className="w-8 h-8 text-purple-400" />
                                                    </div>
                                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                                                        Báo cáo Traffic
                                                    </h3>
                                                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                        Cập nhật số liệu truy cập từ các nền tảng mạng xã hội hôm nay.
                                                    </p>
                                                    <div className="mt-8 flex items-center gap-2 text-purple-500 font-black text-xs uppercase tracking-widest transition-all duration-500">
                                                        Nhập số liệu{" "}
                                                        <ChevronDown className="-rotate-90 w-3 h-3 stroke-[3]" />
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => setDailySubtype("work")}
                                                    className="group relative bg-slate-950 p-8 rounded-[3rem] border border-slate-800 shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-500 overflow-hidden text-left"
                                                >
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-950/30 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-900/40 transition-colors" />
                                                    <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all duration-500 shadow-inner">
                                                        <ClipboardList className="w-8 h-8 text-blue-400" />
                                                    </div>
                                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                                                        Công việc hôm nay
                                                    </h3>
                                                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                        Báo cáo tiến độ checklist, khó khăn và kế hoạch làm việc.
                                                    </p>
                                                    <div className="mt-8 flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-widest transition-all duration-500">
                                                        Báo cáo công việc{" "}
                                                        <ChevronDown className="-rotate-90 w-3 h-3 stroke-[3]" />
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    ) : dailySubtype === "traffic" ? (
                                        <div className="space-y-6">
                                            <div className="px-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setDailySubtype("select")}
                                                    className="relative z-[500] flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50/50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-bold transition-all group border border-blue-100/50 shadow-sm cursor-pointer"
                                                >
                                                    <ChevronDown className="rotate-90 w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
                                                    Quay lại
                                                </button>
                                            </div>
                                            <div className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-8 border border-slate-100 shadow-inner">
                                                <ChecklistContainer
                                                    key="traffic"
                                                    mode="member"
                                                    showOnlyTraffic={true}
                                                    onSuccess={() => fetchReports(false)}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {reportMode === "select" ? (
                                                <div className="space-y-6">
                                                    <div className="px-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDailySubtype("select")}
                                                            className="relative z-[500] flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100/80 text-slate-700 hover:bg-slate-200 font-bold transition-all group border border-slate-200 shadow-sm cursor-pointer"
                                                        >
                                                            <ChevronDown className="rotate-90 w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
                                                            Quay lại
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                                                        {(isAdminUser || !isLeaderUser) && (
                                                            <button
                                                                onClick={() => setReportMode("member")}
                                                                className="group relative bg-slate-950 p-8 rounded-[3rem] border border-slate-800 shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-500 overflow-hidden text-left"
                                                            >
                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-950/30 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-900/40 transition-colors" />
                                                                <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all duration-500 shadow-inner">
                                                                    <User className="w-8 h-8 text-blue-400" />
                                                                </div>
                                                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                                                                    Báo cáo Member
                                                                </h3>
                                                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                                    Dành cho Editor & Content báo cáo tiến độ checklist
                                                                    và khó khăn hàng ngày.
                                                                </p>
                                                                <div className="mt-8 flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-widest transition-all duration-500">
                                                                    Bắt đầu báo cáo{" "}
                                                                    <ChevronDown className="-rotate-90 w-3 h-3 stroke-[3]" />
                                                                </div>
                                                            </button>
                                                        )}
                                                        {(isAdminUser || isLeaderUser) && (
                                                            <button
                                                                onClick={() => setReportMode("leader")}
                                                                className="group relative bg-slate-950 p-8 rounded-[3rem] border border-slate-800 shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-500 overflow-hidden text-left"
                                                            >
                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-950/30 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-900/40 transition-colors" />
                                                                <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all duration-500 shadow-inner">
                                                                    <ShieldCheck className="w-8 h-8 text-indigo-400" />
                                                                </div>
                                                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                                                                    Báo cáo Leader
                                                                </h3>
                                                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                                    Dành cho Team Leader đánh giá chất lượng và quản lý
                                                                    nhân sự hàng ngày.
                                                                </p>
                                                                <div className="mt-8 flex items-center gap-2 text-indigo-500 font-black text-xs uppercase tracking-widest transition-all duration-500">
                                                                    Bắt đầu đánh giá{" "}
                                                                    <ChevronDown className="-rotate-90 w-3 h-3 stroke-[3]" />
                                                                </div>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between px-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setReportMode("select")}
                                                            className="relative z-[500] flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100/80 text-slate-700 hover:bg-slate-200 font-bold transition-all group border border-slate-200 shadow-sm cursor-pointer"
                                                        >
                                                            <ChevronDown className="rotate-90 w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
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
                                            )}
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="px-4">
                                        <button
                                            type="button"
                                            onClick={() => setReportType("select")}
                                            className="relative z-[500] flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100/80 text-slate-700 hover:bg-slate-200 font-bold transition-all group border border-slate-200 shadow-sm cursor-pointer"
                                        >
                                            <ChevronDown className="rotate-90 w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
                                            Quay lại chọn Loại
                                        </button>
                                    </div>
                                    <div className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-20 border border-slate-100 shadow-inner text-center">
                                        <BarChart3 className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-[0.2em]">
                                            Tính năng Báo cáo tháng
                                        </h3>
                                        <p className="text-slate-400 mt-2 text-sm">
                                            Đang được phát triển. Vui lòng quay lại sau!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </main>
            </div>
        </div>
    );
};

const PAGE_FALLBACK = (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-blue-600" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu...</p>
        </div>
    </div>
);

const UserActivityPage = () => (
    <Suspense fallback={PAGE_FALLBACK}>
        <UserActivityPageContent />
    </Suspense>
);

export default UserActivityPage;
