"use client";

import React, { Suspense, useMemo, useDeferredValue } from "react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import ActivityKPIs from "./components/ActivityKPIs";
import ActivityFilters from "./components/ActivityFilters";


const DashboardAnalytics = dynamic(() => import("./components/DashboardAnalytics"), { ssr: false });
const RankingView = dynamic(() => import("./components/RankingView"), { ssr: false });
const PersonalCharts = dynamic(() => import("./components/PersonalCharts"), { ssr: false });

import { RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useSearchParams, useRouter } from "next/navigation";
import { UserRole } from "@/types/auth";
import { useActivityData } from "./hooks/useActivityData";
import { useActivityFilters, CARDS_PER_BATCH, CHECKLIST_PAGE_SIZE } from "./hooks/useActivityFilters";
import PerformanceTab from "./components/Performancetab";
import { OutstandingTab } from "./components/Outstandingtab";
import { DailyReportTab } from "./components/report/Dailyreporttab";
import { ChecklistTab } from "./components/CheecklistTab";
import { KpiCardsSkeleton, PageLoadingFallback } from "./components/loading/Activityskeletons";

const normalize = (str: any) => (str || "").toString().toLowerCase().trim().replace(/\s+/g, "");

// Chuẩn hoá tên team giống hệt `normalizeTeamKey` phía BE (lark.service.ts): bỏ dấu tiếng Việt
// VÀ bỏ khoảng trắng/gạch ngang. `normalize()` ở trên chỉ bỏ khoảng trắng nên các biến thể như
// "Global- Thái Lan 1" (users.team) vs "Global Thái Lan 1" (lark_kpi.team) không khớp nhau,
// khiến toàn bộ card team đó bị lọc rớt ở FE dù BE đã trả về đúng dữ liệu.
const normTeam = (str: any) =>
    (str || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/đ/g, "d")
        .trim()
        .replace(/[\s-]+/g, "");

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
    "dashboard", "performance", "ranking", "personal",
    "daily_checklist", "daily_report", "daily_outstanding",
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
            try { absolute = new URL(raw, window.location.href); } catch { return; }
            if (absolute.origin === window.location.origin) return;
            const proxyUrl = `/api/capture-image?url=${encodeURIComponent(absolute.href)}`;
            try {
                const r = await fetch(proxyUrl);
                if (!r.ok) return;
                const dataUrl = await blobToDataUrl(await r.blob());
                img.src = dataUrl;
                img.removeAttribute("srcset");
                try { await img.decode(); } catch { await new Promise((res) => setTimeout(res, 50)); }
            } catch { /* keep original */ }
        }),
    );

    return () => {
        backup.forEach(({ img, src, srcset }) => {
            if (src != null) img.setAttribute("src", src); else img.removeAttribute("src");
            if (srcset != null) img.setAttribute("srcset", srcset); else img.removeAttribute("srcset");
        });
    };
}

// ── Page content ───────────────────────────────────────────────────────────────
const UserActivityPageContent = () => {
    const user = useAuthStore((s) => s.user);
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const reportParam = searchParams.get("report");
    const typeParam = searchParams.get("type");

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
    const [isPersonalDetailed, setIsPersonalDetailed] = React.useState(false);
    const [isCapturing, setIsCapturing] = React.useState(false);

    const {
        activeTeam, setActiveTeam,
        selectedDate, setSelectedDate,
        searchName, setSearchName,
        dailyFilter, setDailyFilter,
        timeType, setTimeType,
        dateRange, setDateRange,
        visibleCount, setVisibleCount,
        checklistPage, setChecklistPage,
        checklistRoleFilter,
        loadMoreRef,
    } = useActivityFilters();

    const deferredSearchName = useDeferredValue(searchName);

    const {
        reports, summary, rankings,
        teamContributions, groupContributions,
        reportOutstandings, kpiMeta,
        loading, isFetching, userRole, userTeam,
        personalHistory, fetchReports, fetchHistory,
        handleUpdateStatus,
    } = useActivityData({ user, dateRange, activeTeam, timeType, searchName, activeTab });

    // ── URL sync ──────────────────────────────────────────────────────────────
    React.useEffect(() => {
        const next = activeTabFromSearchParam(tabParam);
        if (next) setActiveTab(next);
    }, [tabParam]);

    React.useEffect(() => {
        if (!user || tabParam !== "dashboard") return;
        const hasManagerRole = user.roles?.includes(UserRole.MANAGER) || userRole === "manager";
        if (!hasManagerRole) router.replace("/dashboard/manager/user-activity?tab=performance");
    }, [user, tabParam, userRole, router]);

    React.useEffect(() => {
        const r = reportParam?.trim().toLowerCase();
        if (r === "daily") setReportType("daily");
        else if (r === "monthly") setReportType("monthly");
    }, [reportParam]);

    React.useEffect(() => { setReportMode("select"); }, [typeParam]);

    React.useEffect(() => {
        const handleResetReport = (e: any) => {
            const detailType = e.detail?.type;
            if (detailType) setReportType(detailType);
            setActiveTab("daily_report");
            setDailySubtype("select");
            setReportMode("select");
        };
        window.addEventListener("resetUserActivityDailyReport", handleResetReport);
        return () => window.removeEventListener("resetUserActivityDailyReport", handleResetReport);
    }, []);

    // ── Infinite scroll ───────────────────────────────────────────────────────
    React.useEffect(() => {
        const el = loadMoreRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisibleCount((p) => p + CARDS_PER_BATCH); },
            { rootMargin: "200px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [reports.length]);

    // ── Team categorization ───────────────────────────────────────────────────
    const [allKnownTeams, setAllKnownTeams] = React.useState<string[]>([]);
    React.useEffect(() => {
        const hasContrib = teamContributions && teamContributions.length > 0;
        const hasReports = reports && reports.length > 0;
        if (!hasContrib && !hasReports) return;
        setAllKnownTeams((prev) => {
            // Use broad normKey (strip all spaces AND dashes) to deduplicate variants like
            // "Global - Thái Lan 1", "Global- Thái Lan 1", "Global Thái Lan 1" → same team
            const normKey = (s: string) => s.toLowerCase().replace(/[\s-]/g, '');
            const keyMap = new Map<string, string>(prev.map(t => [normKey(t), t]));
            let changed = false;
            const addTeamString = (t: string | null | undefined) => {
                if (!t || t === "Khác") return;
                const parts = t.includes(",") ? t.split(",").map((p: string) => p.trim()).filter(Boolean) : [t];
                for (const part of parts) {
                    if (!part || part === "Khác") continue;
                    const key = normKey(part);
                    if (!keyMap.has(key)) {
                        keyMap.set(key, part);
                        changed = true;
                    } else if (part.includes(' - ') && !keyMap.get(key)!.includes(' - ')) {
                        // Prefer canonical form with " - " separator (e.g. "Global - Thái Lan 1")
                        keyMap.set(key, part);
                        changed = true;
                    }
                }
            };
            teamContributions?.forEach((item) => addTeamString(item.team));
            reports?.forEach((r) => addTeamString(r.team));
            return changed ? Array.from(keyMap.values()) : prev;
        });
    }, [teamContributions, reports]);

    const { globalTeams, vnTeams } = React.useMemo(() => {
        const globals: string[] = [], vns: string[] = [];
        const GLOBAL_KEYWORDS = ["global", "jp", "thái lan", "đài loan", "indo"];
        allKnownTeams.forEach((teamName) => {
            const isGlobal = GLOBAL_KEYWORDS.some((kw) => teamName.toLowerCase().includes(kw));
            if (isGlobal && !globals.includes(teamName)) globals.push(teamName);
            else if (!isGlobal && !vns.includes(teamName)) vns.push(teamName);
        });
        return { globalTeams: globals.sort(), vnTeams: vns.sort() };
    }, [allKnownTeams]);

    // "Global Thái Lan" (tên cũ, không số) được coi là alias cho cả hai sub-team mới.
    // normTeam() đã tự bỏ dấu gạch ngang/khoảng trắng nên không cần liệt kê các biến thể gạch ngang nữa.
    const THAI_LAN_ALIASES: Record<string, string[]> = {
        [normTeam("Global Thái Lan 1")]: [normTeam("Global Thái Lan")],
        [normTeam("Global Thái Lan 2")]: [normTeam("Global Thái Lan")],
    };

    const matchTeam = React.useCallback(
        (teamName: string | null | undefined): boolean => {
            if (activeTeam === "All") return true;
            const raw = teamName || "Khác";
            const parts = raw.includes(",") ? raw.split(",").map((p) => normTeam(p.trim())) : [normTeam(raw)];
            const safeActive = normTeam(activeTeam);
            if (activeTeam === "All Global") return parts.some((p) => globalTeams.some((t) => normTeam(t) === p));
            if (activeTeam === "All VN") return parts.some((p) => vnTeams.some((t) => normTeam(t) === p));
            // Khi filter theo "Global- Thái Lan 1/2", cũng match record có tên cũ "Global Thái Lan"
            const aliases = THAI_LAN_ALIASES[safeActive] ?? [];
            return parts.includes(safeActive) || parts.some((p) => aliases.includes(p));
        },
        [activeTeam, globalTeams, vnTeams],
    );

    // ── Stable ISO strings ────────────────────────────────────────────────────
    const dashboardStartISO = useMemo(() => dateRange.start.toISOString(), [dateRange.start.getTime()]); // eslint-disable-line
    const dashboardEndISO = useMemo(() => dateRange.end.toISOString(), [dateRange.end.getTime()]);       // eslint-disable-line

    // ── Role helpers ──────────────────────────────────────────────────────────
    const sysRoles = useMemo(() => user?.roles ?? [], [user]);
    const isAdminUser = React.useMemo(
        () => sysRoles.includes(UserRole.ADMIN) || sysRoles.includes(UserRole.MANAGER) || userRole === "admin" || userRole === "manager",
        [userRole, sysRoles], // eslint-disable-line
    );
    const isLeaderUser = React.useMemo(
        () => sysRoles.includes(UserRole.LEADER) || userRole === "leader",
        [userRole, sysRoles], // eslint-disable-line
    );

    const [initialTeamSet, setInitialTeamSet] = React.useState(false);
    React.useEffect(() => {
        if (!isAdminUser && userTeam && !initialTeamSet) {
            const firstTeam = userTeam.includes(",") ? userTeam.split(",")[0].trim() : userTeam;
            setActiveTeam(firstTeam);
            setInitialTeamSet(true);
        }
    }, [isAdminUser, userTeam, initialTeamSet]);

    // ── Screenshot ────────────────────────────────────────────────────────────
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
            await new Promise((r) => setTimeout(r, 500));
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
                        quality: 1, pixelRatio: 2, backgroundColor: "#f8fafc",
                        cacheBust: true, includeQueryParams: true, skipAutoScale: true,
                        filter: filter as any,
                        fetchRequestInit: { mode: "cors", cache: "force-cache" } as any,
                        imagePlaceholder: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23e2e8f0' rx='20'/%3E%3C/svg%3E",
                    });
                    if (dataUrl) break;
                } catch { await new Promise((r) => setTimeout(r, 500)); }
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
            toast.error("Lỗi chụp màn hình. Hãy thử lại.");
        } finally {
            revertImgs?.();
            setIsCapturing(false);
            window.scrollTo(0, scrollY);
        }
    };

    // ── Filtered lists ────────────────────────────────────────────────────────
    const filteredPerformanceReports = React.useMemo(() => {
        return reports.filter((r) => {
            if (r.is_zero_kpi) return false;
            return matchTeam(r.team) && (r.name || "Unknown").toLowerCase().includes(deferredSearchName.toLowerCase());
        });
    }, [reports, matchTeam, deferredSearchName]);

    const filteredPersonalMembers = React.useMemo(
        () => personalHistory.members.filter((m) => matchTeam(m.team)),
        [personalHistory.members, matchTeam],
    );

    const filteredAllReports = React.useMemo(() => {
        return reports.filter((r) => {
            return matchTeam(r.team) && (r.name || "Unknown").toLowerCase().includes(deferredSearchName.toLowerCase());
        });
    }, [reports, matchTeam, deferredSearchName]);

    const filteredChecklistReports = React.useMemo(() => {
        const uniqueKeys = new Set();
        return reportOutstandings.filter((r) => {
            const isMyReport = user?.email && r.email && normalize(r.email) === normalize(user.email);
            const userTeamParts = (userTeam || "").split(",").map((p: string) => normTeam(p.trim())).filter(Boolean);
            const reportTeamParts = (r.team || "").split(",").map((p: string) => normTeam(p.trim())).filter(Boolean);
            const isMyTeam = userTeamParts.length > 0 && reportTeamParts.some((rp: string) => userTeamParts.includes(rp));

            if (!isAdminUser && !isMyTeam && !isMyReport) return false;

            const statusText = (r.approval_status || "").toLowerCase();
            const isLeaderHandled = statusText.includes("leader đã duyệt") || statusText.includes("leader từ chối");
            const isLegacyHandled = statusText === "đã duyệt" || statusText === "từ chối" || statusText === "không duyệt";
            const isAdminHandled = statusText.includes("admin đã duyệt") || statusText.includes("admin từ chối");

            if (isAdminUser) {
                const hasNoTeam = !r.team || r.team.trim() === "" || normTeam(r.team) === "khac";
                if (!isLeaderHandled && !isLegacyHandled && !isAdminHandled && !hasNoTeam) return false;
            }

            if (!matchTeam(r.team) && !isMyReport) return false;
            if (!(r.name || "Unknown").toLowerCase().includes(deferredSearchName.toLowerCase())) return false;

            const key = `${r.name}_${r.category}_${r.content}`.toLowerCase().trim();
            if (uniqueKeys.has(key)) return false;
            uniqueKeys.add(key);
            return true;
        });
    }, [reportOutstandings, matchTeam, deferredSearchName, isAdminUser, userTeam]);

    const checklistFilteredReports = React.useMemo(() => {
        const roleFiltered = reports.filter((r) => {
            if (!matchTeam(r.checklist_source_team || r.team)) return false;
            if (!(r.name || "Unknown").toLowerCase().includes(deferredSearchName.toLowerCase())) return false;
            return true;
        });
        return roleFiltered.filter((r) => {
            if (checklistRoleFilter === "all") return true;
            const pos = (r.position || "").toLowerCase();
            const isReportLeader = pos === "leader" || pos.includes("leader") || pos.includes("trưởng nhóm");
            if (checklistRoleFilter === "leader") return isReportLeader;
            return !isReportLeader;
        });
    }, [reports, matchTeam, deferredSearchName, checklistRoleFilter]);

    const totalChecklistPages = React.useMemo(
        () => Math.max(1, Math.ceil(checklistFilteredReports.length / CHECKLIST_PAGE_SIZE)),
        [checklistFilteredReports.length],
    );

    React.useEffect(() => {
        setChecklistPage((prev) => Math.min(prev, totalChecklistPages));
    }, [totalChecklistPages, setChecklistPage]);

    const pagedChecklistReports = React.useMemo(
        () => checklistFilteredReports.slice(
            (checklistPage - 1) * CHECKLIST_PAGE_SIZE,
            checklistPage * CHECKLIST_PAGE_SIZE,
        ),
        [checklistFilteredReports, checklistPage],
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div id="report-view-container" className="min-h-screen bg-slate-50/20 space-y-3 selection:bg-blue-500/30">
            {activeTab !== "daily_report" && (
                <div className="sticky top-[64px] z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-sm px-4 py-2">
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
                    {isFetching && !loading && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                            <div className="h-full bg-blue-500 animate-[shimmer_1.2s_ease-in-out_infinite]" style={{ width: "40%", animation: "progress-slide 1.2s ease-in-out infinite" }} />
                            <style>{`@keyframes progress-slide { 0% { transform: translateX(-100%); width: 40%; } 50% { width: 60%; } 100% { transform: translateX(280%); width: 40%; } }`}</style>
                        </div>
                    )}
                </div>
            )}

            <div className="relative z-10 space-y-2 p-2 sm:p-4">
                {/* KPI bar — hidden on personal/report/checklist/outstanding tabs */}
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
                                <KpiCardsSkeleton count={4} />
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
                            <DashboardAnalytics
                                startDate={dashboardStartISO}
                                endDate={dashboardEndISO}
                                activeTeam={activeTeam}
                            />
                        </div>
                    ) : activeTab === "performance" ? (
                        <PerformanceTab
                            loading={loading}
                            filteredReports={filteredPerformanceReports}
                            visibleCount={visibleCount}
                            loadMoreRef={loadMoreRef}
                            timeType={timeType}
                            user={user}
                            userTeam={userTeam}
                            isAdminUser={isAdminUser}
                            isLeaderUser={isLeaderUser}
                            onCardClick={(report) => {
                                setSearchName(report.name);
                                setIsPersonalDetailed(true);
                                setActiveTab("personal");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                        />
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
                                loading={loading}
                            />
                        </div>
                    ) : activeTab === "daily_outstanding" ? (
                        <div className="space-y-4 w-full max-w-[2420px] px-3 pb-6 mx-auto">
                            <OutstandingTab
                                filteredChecklistReports={filteredChecklistReports}
                                isAdminUser={isAdminUser}
                                isLeaderUser={isLeaderUser}
                                userTeam={userTeam}
                                handleUpdateStatus={handleUpdateStatus}
                            />
                        </div>
                    ) : activeTab === "daily_checklist" ? (
                        <ChecklistTab
                            isAdminUser={isAdminUser}
                            isCapturing={isCapturing}
                            loading={loading}
                            checklistFilteredReports={checklistFilteredReports}
                            pagedChecklistReports={pagedChecklistReports}
                            checklistPage={checklistPage}
                            totalChecklistPages={totalChecklistPages}
                            setChecklistPage={setChecklistPage}
                        />
                    ) : activeTab === "daily_report" ? (
                        <DailyReportTab
                            reportType={reportType}
                            typeParam={typeParam}
                            reportMode={reportMode}
                            setReportMode={setReportMode}
                            isAdminUser={isAdminUser}
                            isLeaderUser={isLeaderUser}
                            fetchReports={fetchReports}
                        />
                    ) : null}
                </main>
            </div>
        </div>
    );
};

// ── Page wrapper ───────────────────────────────────────────────────────────────
const PAGE_FALLBACK = <PageLoadingFallback />;

const UserActivityPage = () => (
    <Suspense fallback={PAGE_FALLBACK}>
        <UserActivityPageContent />
    </Suspense>
);

export default UserActivityPage;