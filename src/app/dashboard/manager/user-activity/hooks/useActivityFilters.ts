"use client";

import React from "react";

export const CARDS_PER_BATCH = 100;
export const CHECKLIST_PAGE_SIZE = 4;

interface UseActivityFiltersReturn {
    activeTeam: string;
    setActiveTeam: React.Dispatch<React.SetStateAction<string>>;
    selectedDate: Date;
    setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
    searchName: string;
    setSearchName: React.Dispatch<React.SetStateAction<string>>;
    dailyFilter: "all" | "video_win" | "product_win" | "idea" | "difficulty";
    setDailyFilter: React.Dispatch<React.SetStateAction<"all" | "video_win" | "product_win" | "idea" | "difficulty">>;
    timeType: string;
    setTimeType: React.Dispatch<React.SetStateAction<string>>;
    dateRange: { start: Date; end: Date };
    setDateRange: React.Dispatch<React.SetStateAction<{ start: Date; end: Date }>>;
    visibleCount: number;
    setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
    checklistPage: number;
    setChecklistPage: React.Dispatch<React.SetStateAction<number>>;
    checklistRoleFilter: "all" | "member" | "leader";
    setChecklistRoleFilter: React.Dispatch<React.SetStateAction<"all" | "member" | "leader">>;
    loadMoreRef: React.RefObject<HTMLDivElement>;
}

/**
 * Manages all filter/pagination UI state.
 * Deliberately takes no external data dependencies to avoid circular deps
 * with useActivityData. Team categorization (allKnownTeams, matchTeam) and
 * infinite scroll setup live in the parent component where both data and
 * filter state are available.
 */
export function useActivityFilters(): UseActivityFiltersReturn {
    const [activeTeam, setActiveTeam] = React.useState("Team K8");
    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const [searchName, setSearchName] = React.useState("");
    const [dailyFilter, setDailyFilter] = React.useState<"all" | "video_win" | "product_win" | "idea" | "difficulty">("all");
    const [timeType, setTimeType] = React.useState("today");
    const [dateRange, setDateRange] = React.useState<{ start: Date; end: Date }>(() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start, end };
    });
    const [visibleCount, setVisibleCount] = React.useState(CARDS_PER_BATCH);
    const [checklistPage, setChecklistPage] = React.useState(1);
    const [checklistRoleFilter, setChecklistRoleFilter] = React.useState<"all" | "member" | "leader">("all");
    const loadMoreRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setVisibleCount(CARDS_PER_BATCH);
        setChecklistPage(1);
    }, [activeTeam, searchName, dateRange]);

    return {
        activeTeam, setActiveTeam, selectedDate, setSelectedDate,
        searchName, setSearchName, dailyFilter, setDailyFilter,
        timeType, setTimeType, dateRange, setDateRange,
        visibleCount, setVisibleCount, checklistPage, setChecklistPage,
        checklistRoleFilter, setChecklistRoleFilter, loadMoreRef,
    };
}
