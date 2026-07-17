"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";

/** /lark/* yêu cầu đăng nhập (JwtAuthGuard) — phải gắn token cho fetch thủ công. */
function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

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
    isFetching: boolean;
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
        checklist_source_team: item.checklist_source_team || item.team,
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
        kpi_month: item.kpi_month || 0,
        completed_month: item.completed_month || 0,
        traffic: item.trafficToday?.total ? item.trafficToday.total.toLocaleString("vi-VN") : "0",
        revenue: item.revenueToday ? item.revenueToday.toLocaleString("vi-VN") : "0",
        traffic_month: item.traffic_month ? item.traffic_month.toLocaleString("vi-VN") : "0",
        revenue_month: item.revenue_month ? item.revenue_month.toLocaleString("vi-VN") : "0",
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
        is_zero_kpi: item.is_zero_kpi || false,
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
    const queryClient = useQueryClient();
    const [reportOutstandings, setReportOutstandings] = useState<any[]>([]);

    const startDateStr = useMemo(() => {
        if (!dateRange?.start) return "";
        const s = dateRange.start;
        return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
    }, [dateRange?.start]);

    const endDateStr = useMemo(() => {
        if (!dateRange?.end) return "";
        const e = dateRange.end;
        return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
    }, [dateRange?.end]);

    // Debounce filter params 400ms — tránh gọi API ngay mỗi lần user click filter
    const filterDebounce = useRef<ReturnType<typeof setTimeout>>();
    const [debouncedFilter, setDebouncedFilter] = useState({
        startDate: startDateStr,
        endDate: endDateStr,
        team: activeTeam,
        timeType,
    });
    useEffect(() => {
        clearTimeout(filterDebounce.current);
        filterDebounce.current = setTimeout(() => {
            setDebouncedFilter({ startDate: startDateStr, endDate: endDateStr, team: activeTeam, timeType });
        }, 400);
        return () => clearTimeout(filterDebounce.current);
    }, [startDateStr, endDateStr, activeTeam, timeType]);

    // Debounce search name 400ms — tránh gọi API mỗi ký tự khi tìm kiếm
    const searchDebounce = useRef<ReturnType<typeof setTimeout>>();
    const [debouncedSearchName, setDebouncedSearchName] = useState(searchName);
    useEffect(() => {
        clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => setDebouncedSearchName(searchName), 400);
        return () => clearTimeout(searchDebounce.current);
    }, [searchName]);

    // 1. Primary Query: Fetch Combined User Activities and KPIs
    const activityQuery = useQuery({
        queryKey: ["userActivity", user?.email, debouncedFilter.startDate, debouncedFilter.endDate, debouncedFilter.team, debouncedFilter.timeType],
        queryFn: async ({ signal }) => {
            if (!user?.email) return null;
            const params = new URLSearchParams();
            if (debouncedFilter.startDate) params.append("startDate", debouncedFilter.startDate);
            if (debouncedFilter.endDate) params.append("endDate", debouncedFilter.endDate);
            if (debouncedFilter.team !== "All") params.append("team", debouncedFilter.team);
            params.append("requesterEmail", user.email);
            if (debouncedFilter.timeType) params.append("timeType", debouncedFilter.timeType);

            const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/lark/user-activity?${params.toString()}`;
            const response = await fetch(url, { cache: "no-store", signal, headers: getAuthHeaders() });
            if (!response.ok) throw new Error("Failed to fetch user activity reports");
            let data = await response.json();

            // Handle suspicious empty first load logic
            const hasKpiInDb = Number(data?.meta?.kpiTotalInDb || 0) > 0;
            const filteredKpiCount = Number(data?.meta?.kpiFilteredForMonth || 0);
            const reportCount = Array.isArray(data?.reports) ? data.reports.length : 0;
            const isSuspiciousEmptyFirstLoad = hasKpiInDb && filteredKpiCount === 0 && reportCount === 0;

            if (isSuspiciousEmptyFirstLoad) {
                try {
                    await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/lark/clear-activity-cache`,
                        { method: "POST", cache: "no-store", signal, headers: getAuthHeaders() },
                    );
                    const retryResponse = await fetch(url, { cache: "no-store", signal, headers: getAuthHeaders() });
                    if (retryResponse.ok) {
                        data = await retryResponse.json();
                    }
                } catch (recoveryError) {
                    console.warn("Activity recovery refetch failed:", recoveryError);
                }
            }
            return data;
        },
        enabled: !!user?.email,
        staleTime: 5 * 60 * 1000,       // 5 phút — dữ liệu giữ trong cache, không refetch khi navigate
        refetchInterval: 3 * 60 * 1000, // Background refresh mỗi 3 phút
        placeholderData: keepPreviousData, // Giữ data cũ trên màn hình trong khi filter mới load
    });

    const userRole = useMemo(() => {
        return activityQuery.data?.userRole ? activityQuery.data.userRole.toLowerCase() : null;
    }, [activityQuery.data?.userRole]);

    // 2. Secondary Query: Fetch Personal History (only when tab is "personal")
    const historyQuery = useQuery({
        queryKey: ["personalHistory", user?.email, debouncedSearchName, userRole],
        queryFn: async ({ signal }) => {
            if (!user?.email) return null;
            const params = new URLSearchParams();
            params.append("email", user.email);
            if (debouncedSearchName && (userRole === "admin" || userRole === "manager" || userRole === "leader")) {
                params.append("name", debouncedSearchName);
            }
            const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/lark/personal-history?${params.toString()}`;
            const response = await fetch(url, { cache: "no-store", signal, headers: getAuthHeaders() });
            if (!response.ok) throw new Error("Failed to fetch personal history");
            return await response.json();
        },
        enabled: !!user?.email && activeTab === "personal",
        staleTime: 5 * 60 * 1000,
        placeholderData: keepPreviousData,
    });

    // Synchronize reportOutstandings with query data
    useEffect(() => {
        if (activityQuery.data?.reportOutstandings) {
            setReportOutstandings(activityQuery.data.reportOutstandings);
        }
    }, [activityQuery.data?.reportOutstandings]);

    // Memoize mapped reports and summaries
    const reports = useMemo(() => {
        return (activityQuery.data?.reports || []).map(mapReportItem);
    }, [activityQuery.data?.reports]);

    const summary = useMemo(() => activityQuery.data?.summary || null, [activityQuery.data?.summary]);
    const rankings = useMemo(() => activityQuery.data?.rankings || null, [activityQuery.data?.rankings]);
    const teamContributions = useMemo(() => activityQuery.data?.teamContributions || [], [activityQuery.data?.teamContributions]);
    const groupContributions = useMemo(() => activityQuery.data?.groupContributions || null, [activityQuery.data?.groupContributions]);
    const kpiMeta = useMemo(() => activityQuery.data?.meta || null, [activityQuery.data?.meta]);
    const userTeam = useMemo(() => activityQuery.data?.userTeam || user?.team || null, [activityQuery.data?.userTeam, user?.team]);

    const personalHistory = useMemo(() => {
        const data = historyQuery.data;
        return {
            history: data?.history ?? [],
            teamStats: data?.teamStats ?? null,
            companyStats: data?.companyStats ?? null,
            userActivity: data?.userActivity ?? null,
            members: data?.members ?? [],
        };
    }, [historyQuery.data]);

    // Manual refetch functions mapped to React Query refetch API
    const fetchReports = useCallback(async (showLoading = true) => {
        if (showLoading) {
            await activityQuery.refetch();
        } else {
            await queryClient.invalidateQueries({
                queryKey: ["userActivity", user?.email, startDateStr, endDateStr, activeTeam, timeType]
            });
        }
    }, [activityQuery, queryClient, user?.email, startDateStr, endDateStr, activeTeam, timeType]);

    const fetchHistory = useCallback(async () => {
        await historyQuery.refetch();
    }, [historyQuery]);

    // Handle updating outstanding report status
    const handleUpdateStatus = useCallback(async (id: string, status: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/lark/update-outstanding-status`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                    body: JSON.stringify({ id, status, approvedBy: user?.full_name }),
                },
            );
            if (response.ok) {
                setReportOutstandings((prev) =>
                    prev.map((r) =>
                        r.id === id ? { ...r, status, approval_status: status, approved_by: user?.full_name } : r,
                    ),
                );
                // Also invalidate query cache in background to keep data in sync
                queryClient.invalidateQueries({ queryKey: ["userActivity"] });
            }
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    }, [user?.full_name, queryClient]);

    return {
        reports,
        summary,
        rankings,
        teamContributions,
        groupContributions,
        reportOutstandings,
        kpiMeta,
        loading: activityQuery.isLoading,
        isFetching: activityQuery.isFetching,
        userRole,
        userTeam,
        personalHistory,
        fetchReports,
        fetchHistory,
        handleUpdateStatus,
    };
}
