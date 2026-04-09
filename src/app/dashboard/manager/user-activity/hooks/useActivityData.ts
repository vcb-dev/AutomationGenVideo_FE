"use client";

import React, { useCallback, useRef } from "react";

interface PersonalHistory {
    history: any[];
    teamStats: any | null;
    companyStats?: any | null;
    userActivity: any | null;
    members: any[];
}

interface KpiMeta {
    kpiTotalInDb?: number;
    kpiFilteredForMonth?: number;
    kpiMonthFallback?: boolean;
}

interface UseActivityDataParams {
    user: any;
    dateRange: { start: Date; end: Date };
    activeTeam: string;
    timeType: string;
    searchName: string;
    activeTab: string;
}

interface UseActivityDataReturn {
    reports: any[];
    summary: any;
    rankings: any;
    teamContributions: any[];
    groupContributions: any;
    reportOutstandings: any[];
    kpiMeta: KpiMeta | null;
    loading: boolean;
    userRole: string | null;
    userTeam: string | null;
    personalHistory: PersonalHistory;
    fetchReports: (showLoading?: boolean) => Promise<void>;
    fetchHistory: () => Promise<void>;
    handleUpdateStatus: (id: string, status: string) => Promise<void>;
}

const getAvatarUrl = (url: string | null, name: string) => {
    if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    if (url.includes("drive.google.com")) {
        const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
        }
    }
    // Strip auth params from Google user content URLs to avoid 403 Forbidden
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

const mapReportItem = (item: any) => {
    const pos = (item.position || "").toLowerCase();
    const role = (item.role || "").toLowerCase();
    const isLeaderReport =
        pos.includes("leader") || pos.includes("lead") || pos.includes("manager") ||
        pos.includes("trưởng nhóm") || role.includes("leader") || role.includes("manager") ||
        !!(item.answers && (
            item.answers["1. Bạn đã kiểm tra chất lượng nội dung video đầu ra của team mình chưa?"] ||
            item.answers["2. Team bạn hôm qua có thành viên nào có video Win nhất?"]
        ));

    return {
        id: item.id,
        name: item.name,
        position: item.position || (isLeaderReport ? "Leader" : "Member"),
        team: item.team,
        avatar: getAvatarUrl(item.avatar, item.name),
        status: item.status,
        reportStatus: item.status,
        submittedAt: item.date,
        email: item.email,
        time: item.date
            ? `${new Date(item.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${new Date(item.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }).replace(/\//g, "-")}`
            : "Chưa báo cáo",
        dailyGoal: item.dailyGoal || 0,
        done: item.done || 0,
        traffic: item.traffic_month ? item.traffic_month.toLocaleString("vi-VN") : "0",
        revenue: item.revenue_month ? item.revenue_month.toLocaleString("vi-VN") : "0",
        monthlyProgress: item.monthlyProgress || 0,
        checklist: {
            fb: item.checklist?.fb || false,
            ig: item.checklist?.ig || false,
            tiktok: item.checklist?.tiktok || false,
            youtube: item.checklist?.youtube || false,
            zalo: item.checklist?.zalo || false,
            lark: item.checklist?.lark || false,
            captionHashtag: item.checklist?.caption || false,
            reportLink: item.answers?.["Báo cáo Lark - Bạn đã gửi link báo cáo video chưa?"] || false,
        },
        videoCount: item.answers
            ? Number(item.answers[Object.keys(item.answers).find((k) => k.toLowerCase().includes("50%")) || ""] || 0)
            : 0,
        task_progress: item.task_progress || null,
        trafficToday: item.trafficToday || null,
        /**
         * Có ít nhất 1 kênh tracked (owner) mới bắt buộc traffic. API mới gửi boolean; fallback channelCount khi có số.
         */
        needsTraffic:
            typeof item.needsTraffic === "boolean"
                ? item.needsTraffic
                : item.channelCount != null && item.channelCount !== ""
                  ? Number(item.channelCount) > 0
                  : true,
        questions: [
            {
                question: isLeaderReport
                    ? "ĐÃ KIỂM TRA CHẤT LƯỢNG VIDEO ĐẦU RA CỦA TEAM CHƯA?"
                    : "NGÀY HÔM QUA CÔNG VIỆC BẠN CÓ CẢI GÌ KHIẾN BẠN TỰ HÀO VÀ THÍCH THÚ NHẤT?",
                answer: isLeaderReport
                    ? item.answers?.["1. Bạn đã kiểm tra chất lượng nội dung video đầu ra của team mình chưa?"] || "Không có"
                    : item.answers?.["1. Ngày hôm qua công việc bạn có cái gì khiến bạn tự hào và thích thú nhất?"] ||
                      item.answers?.["1.Ngày hôm qua công việc bạn có cái gì khiến bạn tự hào và thích thú nhất?"] || "Không có",
            },
            {
                question: isLeaderReport
                    ? "TEAM BẠN HÔM QUA CÓ THÀNH VIÊN NÀO CÓ VIDEO WIN NHẤT?"
                    : "HÔM QUA CÓ ĐỔI MỚI SÁNG TẠO GÌ ĐƯỢC ÁP DỤNG VÀO CÔNG VIỆC CỦA BẠN KHÔNG?",
                answer: isLeaderReport
                    ? item.answers?.["2. Team bạn hôm qua có thành viên nào có video Win nhất?"] || "Không có"
                    : item.answers?.["2. Hôm qua có đổi mới sáng tạo gì được áp dụng vào công việc của bạn không?"] ||
                      item.answers?.["2. HÔM QUA CÓ ĐỔI MỚI SÁNG TẠO GÌ ĐƯỂ ÁP DỤNG VÀO CÔNG VIỆC CỦA BẠN KHÔNG?"] || "Không có",
            },
            {
                question: isLeaderReport
                    ? "TEAM BẠN HÔM QUA CÓ GÌ ĐỔI MỚI ĐƯỢC ÁP DỤNG KHÔNG?"
                    : "BẠN CÓ GẶP KHÓ KHĂN NÀO CẦN HỖ TRỢ KHÔNG?",
                answer: isLeaderReport
                    ? item.answers?.["3. Team bạn hôm qua có gì đổi mới được áp dụng không?"] || "Không có"
                    : item.answers?.["3. Bạn có gặp khó khăn nào cần hỗ trợ không?"] ||
                      item.answers?.["3. BẠN CÓ GẶP KHÓ KHĂN NÀO CẦN HỖ TRỢ KHÔNG?"] || "Không có",
            },
            {
                question: isLeaderReport
                    ? "TEAM BẠN CÓ AI TRỄ DEADLINE HÔM QUA KHÔNG? LÝ DO?"
                    : "BẠN CÓ ĐÓNG GÓP Ý TƯỞNG HAY ĐỀ XUẤT GÌ KHÔNG?",
                answer: isLeaderReport
                    ? item.answers?.["4. Team bạn có ai trễ Deadline hôm qua không? Lý do và phương án?"] || "Không có"
                    : item.answers?.["4. Bạn có đóng góp ý tưởng hay đề xuất gì không?"] ||
                      item.answers?.["4. BẠN CÓ ĐÓNG GÓP Ý TƯỞNG HAY ĐỀ XUẤT GÌ KHÔNG?"] || "Không có",
            },
            {
                question: isLeaderReport
                    ? "TEAM BẠN HÔM QUA CÓ SẢN PHẨM NÀO WIN MỚI KHÔNG?"
                    : "BẠN CÓ SẢN PHẨM (A4 - A5) NÀO WIN MỚI KHÔNG?",
                answer: isLeaderReport
                    ? item.answers?.["5. Team bạn hôm qua có sản phẩm nào win mới không? Đã thông tin lên Group New Product chưa?"] || "Không có"
                    : item.answers?.["5. Bạn có sản phẩm (A4 - A5) nào win mới không? (>5k view - >10 CMT hỏi giá?)"] ||
                      item.answers?.["5. Bạn có sản phẩm (A4 - A5) nào win mới không? (>5k view - >10 cmt hỏi giá?)"] ||
                      item.answers?.["5. BẠN CÓ SẢN PHẨM (A4 - A5) NÀO WIN MỚI KHÔNG? (>5K VIEW - >10 CMT HỎI GIÁ?)"] || "Không có",
            },
        ],
    };
};

export function useActivityData({
    user,
    dateRange,
    activeTeam,
    timeType,
    searchName,
    activeTab,
}: UseActivityDataParams): UseActivityDataReturn {
    const [reports, setReports] = React.useState<any[]>([]);
    const [summary, setSummary] = React.useState<any>(null);
    const [rankings, setRankings] = React.useState<any>(null);
    const [teamContributions, setTeamContributions] = React.useState<any[]>([]);
    const [groupContributions, setGroupContributions] = React.useState<any>(null);
    const [reportOutstandings, setReportOutstandings] = React.useState<any[]>([]);
    const [kpiMeta, setKpiMeta] = React.useState<KpiMeta | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [userRole, setUserRole] = React.useState<string | null>(null);
    const [userTeam, setUserTeam] = React.useState<string | null>(null);
    const [personalHistory, setPersonalHistory] = React.useState<PersonalHistory>({
        history: [],
        teamStats: null,
        companyStats: null,
        userActivity: null,
        members: [],
    });
    const recoveredQueryRef = useRef<string | null>(null);
    const reportsAbortRef = useRef<AbortController | null>(null);
    const historyAbortRef = useRef<AbortController | null>(null);
    const latestReportsReqIdRef = useRef(0);
    const latestHistoryReqIdRef = useRef(0);

    // Store latest searchName/userRole in refs so fetchHistory doesn't depend on them directly.
    // This prevents re-fetching on every keystroke (Rule 5.15 - useRef for transient values).
    const searchNameRef = useRef(searchName);
    const userRoleRef = useRef(userRole);
    searchNameRef.current = searchName;
    userRoleRef.current = userRole;

    const fetchReports = useCallback(async (showLoading = true) => {
        if (!user?.email) return;
        reportsAbortRef.current?.abort();
        const controller = new AbortController();
        reportsAbortRef.current = controller;
        const requestId = ++latestReportsReqIdRef.current;
        if (showLoading) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateRange?.start) {
                const s = dateRange.start;
                params.append("startDate", `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`);
            }
            if (dateRange?.end) {
                const e = dateRange.end;
                params.append("endDate", `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`);
            }
            if (activeTeam !== "All") params.append("team", activeTeam);
            params.append("requesterEmail", user.email);
            if (timeType) params.append("timeType", timeType);

            const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/lark/user-activity?${params.toString()}`;
            const applyPayload = (data: any) => {
                if (data.userRole) setUserRole(data.userRole.toLowerCase());
                setUserTeam(data.userTeam || (user as any)?.team || null);
                setReports((data.reports || []).map(mapReportItem));
                setSummary(data.summary || null);
                setRankings(data.rankings || null);
                setTeamContributions(data.teamContributions || []);
                setGroupContributions(data.groupContributions || null);
                setReportOutstandings(data.reportOutstandings || []);
                setKpiMeta(data.meta || null);
            };

            const response = await fetch(url, { cache: "no-store", signal: controller.signal });
            let data = await response.json();

            const hasKpiInDb = Number(data?.meta?.kpiTotalInDb || 0) > 0;
            const filteredKpiCount = Number(data?.meta?.kpiFilteredForMonth || 0);
            const reportCount = Array.isArray(data?.reports) ? data.reports.length : 0;
            const isSuspiciousEmptyFirstLoad =
                hasKpiInDb &&
                filteredKpiCount === 0 &&
                reportCount === 0;

            const queryKey = params.toString();
            if (isSuspiciousEmptyFirstLoad && recoveredQueryRef.current !== queryKey) {
                recoveredQueryRef.current = queryKey;
                try {
                    await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/lark/clear-activity-cache`,
                        { method: "POST", cache: "no-store", signal: controller.signal },
                    );
                    const retryResponse = await fetch(url, { cache: "no-store", signal: controller.signal });
                    data = await retryResponse.json();
                } catch (recoveryError) {
                    console.warn("Activity recovery refetch failed:", recoveryError);
                }
            }

            if (!controller.signal.aborted && requestId === latestReportsReqIdRef.current) {
                applyPayload(data);
            }
        } catch (error) {
            if ((error as any)?.name !== "AbortError") {
                console.error("Failed to fetch reports:", error);
            }
        } finally {
            if (showLoading && requestId === latestReportsReqIdRef.current && !controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [user?.email, dateRange, activeTeam, timeType]);

    // fetchHistory intentionally only depends on user?.email — searchName/userRole
    // are read from refs so the effect doesn't re-run on every keystroke (Rule 5.15).
    const fetchHistory = useCallback(async () => {
        if (!user?.email) return;
        historyAbortRef.current?.abort();
        const controller = new AbortController();
        historyAbortRef.current = controller;
        const requestId = ++latestHistoryReqIdRef.current;
        try {
            const params = new URLSearchParams();
            params.append("email", user.email);
            const role = userRoleRef.current;
            if (searchNameRef.current && (role === "admin" || role === "manager" || role === "leader")) {
                params.append("name", searchNameRef.current);
            }
            const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/lark/personal-history?${params.toString()}`;
            const response = await fetch(url, { cache: "no-store", signal: controller.signal });
            const data = await response.json();
            if (!controller.signal.aborted && requestId === latestHistoryReqIdRef.current) {
                setPersonalHistory(data);
            }
        } catch (error) {
            if ((error as any)?.name !== "AbortError") {
                console.error("Failed to fetch personal history:", error);
            }
        }
    }, [user?.email]);

    const handleUpdateStatus = useCallback(async (id: string, status: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/lark/update-outstanding-status`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, status, approvedBy: user?.full_name }),
                },
            );
            if (response.ok) {
                setReportOutstandings((prev) =>
                    prev.map((r) =>
                        r.id === id ? { ...r, status, approval_status: status, approved_by: user?.full_name } : r,
                    ),
                );
            }
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    }, [user?.full_name]);

    React.useEffect(() => {
        const POLL_INTERVAL = 90_000;
        fetchReports(true);
        let intervalId: ReturnType<typeof setInterval> | null = setInterval(() => fetchReports(false), POLL_INTERVAL);

        const onVisibilityChange = () => {
            if (document.hidden) {
                if (intervalId !== null) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            } else {
                fetchReports(false);
                if (intervalId === null) {
                    intervalId = setInterval(() => fetchReports(false), POLL_INTERVAL);
                }
            }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            if (intervalId !== null) clearInterval(intervalId);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [fetchReports]);

    React.useEffect(() => {
        if (activeTab === "personal") {
            fetchHistory();
        }
    }, [activeTab, fetchHistory]);

    React.useEffect(() => {
        return () => {
            reportsAbortRef.current?.abort();
            historyAbortRef.current?.abort();
        };
    }, []);

    return {
        reports, summary, rankings, teamContributions, groupContributions,
        reportOutstandings, kpiMeta, loading, userRole, userTeam, personalHistory,
        fetchReports, fetchHistory, handleUpdateStatus,
    };
}
