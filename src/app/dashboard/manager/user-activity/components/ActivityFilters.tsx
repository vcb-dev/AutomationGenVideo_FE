"use client";

import Image from "next/image";
import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check, Globe, MapPin, Layers, Search, X, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { UserRole } from "@/types/auth";

interface ActivityFiltersProps {
    activeTeam: string;
    setActiveTeam: (team: string) => void;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    searchName: string;
    setSearchName: (name: string) => void;
    userRole?: string | null;
    userTeam?: string | null;
    activeTab?: string;
    globalTeams?: string[];
    vnTeams?: string[];
    dateRange: { start: Date; end: Date };
    setDateRange: (range: { start: Date; end: Date }) => void;
    timeType: string;
    setTimeType: (type: string) => void;
    onCapture?: () => void;
    isNavbar?: boolean;
}

const ActivityFilters = ({
    activeTeam,
    setActiveTeam,
    selectedDate,
    setSelectedDate,
    searchName,
    setSearchName,
    userRole,
    userTeam,
    activeTab,
    globalTeams = [], // Fallback
    vnTeams = [], // Fallback
    dateRange,
    setDateRange,
    timeType,
    setTimeType,
    onCapture,
    isNavbar = false,
}: ActivityFiltersProps) => {
    // Earliest date that has KPI data — February 1, 2026
    const MIN_DATE = new Date(2026, 1, 1, 0, 0, 0, 0); // month is 0-indexed: 1 = February

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [filterMode, setFilterMode] = useState<"day" | "week" | "month" | "year" | "range">(() => {
        if (timeType === "month" || timeType === "this_month" || timeType === "last_month") return "month";
        if (timeType === "this_week" || timeType === "last_week") return "week";
        if (timeType === "this_year") return "year";
        if (timeType === "custom") return "range";
        return "day";
    });

    // Sync filterMode when timeType changes from outside
    useEffect(() => {
        if (timeType === "month" || timeType === "this_month" || timeType === "last_month") setFilterMode("month");
        else if (timeType === "this_week" || timeType === "last_week" || timeType === "custom_week") setFilterMode("week");
        else if (timeType === "this_year") setFilterMode("year");
        else if (timeType === "custom") setFilterMode("range");
        else if (timeType === "custom_day") setFilterMode("day");   // ← thêm
        else setFilterMode("day");
    }, [timeType]);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const timeFilterRef = useRef<HTMLDivElement>(null);

    const { user } = useAuthStore();
    const sysRoles = user?.roles || [];
    const isAdmin =
        sysRoles.includes(UserRole.ADMIN) ||
        sysRoles.includes(UserRole.MANAGER) ||
        userRole === "admin" ||
        userRole === "manager";
    const isLeader = sysRoles.includes(UserRole.LEADER) || userRole === "leader";

    const isRankingTab = activeTab === "ranking";
    const isPersonalTab = activeTab === "personal";
    const isPerformanceTab = activeTab === "performance";

    // Team filter: ALWAYS visible to everyone
    const canSeeTeamFilter = true;

    // Team label: no longer needed since filter is always visible
    const showTeamLabel = false;

    const isAllGlobal = activeTeam === "All Global";
    const isAllVN = activeTeam === "All VN";
    const isGlobalActive = isAllGlobal || globalTeams.includes(activeTeam);
    const isVNActive = isAllVN || vnTeams.includes(activeTeam);
    // Khi globalTeams/vnTeams chưa hydrate (fetch đầu), mọi team cụ thể (vd. Team K8 mặc định) không được
    // coi là "ALL" — tránh UI hiển thị ALL trong khi API vẫn lọc theo một team → trống + dropdown Global không có team.
    const teamsDiscovered = globalTeams.length > 0 || vnTeams.length > 0;
    const isAllActive =
        activeTeam === "All" ||
        (teamsDiscovered &&
            !isGlobalActive &&
            !isVNActive &&
            activeTeam !== "All Global" &&
            activeTeam !== "All VN");

    const timeOptions = [
        { id: "today", label: "Hôm nay" },
        { id: "yesterday", label: "Hôm qua" },
        { id: "this_week", label: "Tuần này" },
        { id: "last_week", label: "Tuần trước" },
        { id: "this_month", label: "Tháng này" },
        { id: "last_month", label: "Tháng trước" },
        { id: "this_year", label: "Năm nay" },
        { id: "custom", label: "Chọn ngày" },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                if (timeFilterRef.current && !timeFilterRef.current.contains(event.target as Node)) {
                    setOpenDropdown(null);
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const toggleDropdown = (id: string) => {
        setOpenDropdown(openDropdown === id ? null : id);
    };

    const handleSelectTeam = (team: string) => {
        setActiveTeam(team);
        setOpenDropdown(null);
    };

    /** Clamp a date so it's never before MIN_DATE */
    const clampToMin = (d: Date) => (d < MIN_DATE ? new Date(MIN_DATE) : d);

    const handleSelectTimeType = (typeId: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let start = new Date(today);
        let end = new Date(today);
        end.setHours(23, 59, 59, 999);

        switch (typeId) {
            case "today":
                setFilterMode("day");
                break;
            case "yesterday":
                setFilterMode("day");
                start.setDate(today.getDate() - 1);
                // Don't allow going before MIN_DATE
                if (start < MIN_DATE) { start = new Date(MIN_DATE); }
                end = new Date(start);
                end.setHours(23, 59, 59, 999);
                break;
            case "this_week":
            case "last_week": {
                setFilterMode("week");
                const targetDay = typeId === "this_week" ? today : new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                const dayOfWeek = targetDay.getDay();
                const diff = targetDay.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                start = new Date(targetDay);
                start.setDate(diff);
                start.setHours(0, 0, 0, 0);
                start = clampToMin(start);
                end = new Date(targetDay);
                end.setDate(diff + 6);
                end.setHours(23, 59, 59, 999);
                break;
            }
            case "this_month":
                setFilterMode("month");
                start = clampToMin(new Date(today.getFullYear(), today.getMonth(), 1));
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case "last_month": {
                setFilterMode("month");
                const rawLastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                start = clampToMin(rawLastMonthStart);
                end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
                break;
            }
            case "this_year":
                setFilterMode("year");
                // For the KPI minimum year, start from Feb 1 instead of Jan 1
                start = clampToMin(new Date(today.getFullYear(), 0, 1));
                end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case "custom":
                setFilterMode("range");
                setShowDatePicker(true);
                break;
        }

        setTimeType(typeId);
        setDateRange({ start, end });
        if (typeId !== "custom") {
            setSelectedDate(start);
            setOpenDropdown(null);
        }
    };

    const dropdownVariants = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -10, scale: 0.95 },
    };

    // --- Custom Calendar Logic ---
    const [viewDate, setViewDate] = useState(new Date(selectedDate));
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const days = [];
    const totalDays = daysInMonth(currentYear, currentMonth);
    const startDay = firstDayOfMonth(currentYear, currentMonth);

    // Padding for previous month
    for (let i = 0; i < startDay; i++) {
        days.push(null);
    }
    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
        days.push(i);
    }

    const isToday = (day: number) => {
        const today = new Date();
        return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    };

    const isFuture = (day: number) => {
        const d = new Date(currentYear, currentMonth, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d > today;
    };

    const isBeforeMin = (day: number) => {
        const d = new Date(currentYear, currentMonth, day);
        return d < MIN_DATE;
    };

    const isSelected = (day: number) => {
        const d = new Date(currentYear, currentMonth, day);
        const startDay = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate());
        const endDay = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate());
        return d.getTime() === startDay.getTime() || d.getTime() === endDay.getTime();
    };

    const isInRange = (day: number) => {
        const d = new Date(currentYear, currentMonth, day);
        const startNorm = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate());
        const endNorm = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate());
        return d.getTime() >= startNorm.getTime() && d.getTime() <= endNorm.getTime();
    };

    const handleDateSelect = (day: number) => {
        if (isFuture(day) || isBeforeMin(day)) return;
        const newDate = new Date(currentYear, currentMonth, day, 0, 0, 0, 0); // ← không mutate

        if (filterMode === "day") {
            const start = new Date(currentYear, currentMonth, day, 0, 0, 0, 0);
            const end = new Date(currentYear, currentMonth, day, 23, 59, 59, 999);
            setSelectedDate(start);
            setDateRange({ start, end });
            setTimeType("custom_day");
            setOpenDropdown(null);
        } else if (filterMode === "week") {
            const dayOfWeek = newDate.getDay();
            const diff = newDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const start = new Date(newDate);
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            setDateRange({ start, end });
            setTimeType("custom_week"); // ← fix
            setOpenDropdown(null);
        } else if (filterMode === "range") {
            if (dateRange.start.getTime() === dateRange.end.getTime()) {
                if (newDate < dateRange.start) {
                    setDateRange({ start: newDate, end: dateRange.start });
                } else {
                    setDateRange({ start: dateRange.start, end: newDate });
                }
                setTimeType("custom"); // ← fix
                setOpenDropdown(null);
            } else {
                setDateRange({ start: newDate, end: newDate });
            }
        }
    };

    const handleMonthSelect = (monthIdx: number) => {
        const today = new Date();
        const yr = viewDate.getFullYear();
        // Block future months
        if (yr > today.getFullYear() || (yr === today.getFullYear() && monthIdx > today.getMonth())) return;
        // Block months before February 2026
        if (yr < MIN_DATE.getFullYear() || (yr === MIN_DATE.getFullYear() && monthIdx < MIN_DATE.getMonth())) return;

        const rawStart = new Date(yr, monthIdx, 1, 0, 0, 0, 0);
        const start = rawStart < MIN_DATE ? MIN_DATE : rawStart;
        const end = new Date(yr, monthIdx + 1, 0, 23, 59, 59, 999);
        const cappedEnd = end > today ? today : end;
        setDateRange({ start, end: cappedEnd });
        setTimeType("custom");
        setOpenDropdown(null);
    };

    const handleYearSelect = (year: number) => {
        const today = new Date();
        if (year > today.getFullYear()) return;
        if (year < MIN_DATE.getFullYear()) return;

        // Start from Feb 1 if it's the min year, otherwise Jan 1
        const rawStart = new Date(year, 0, 1, 0, 0, 0, 0);
        const start = rawStart < MIN_DATE ? new Date(MIN_DATE) : rawStart;
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        const cappedEnd = end > today ? today : end;
        setDateRange({ start, end: cappedEnd });
        setTimeType("custom");
        setOpenDropdown(null);
    };

    // --- Direct Input Logic ---
    const [inputValue, setInputValue] = useState(formatDate(selectedDate));

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, ""); // Remove non-digits
        if (val.length > 8) val = val.slice(0, 8);

        // Format as DD/MM/YYYY
        let formatted = "";
        if (val.length > 0) {
            formatted = val.slice(0, 2);
            if (val.length > 2) {
                formatted += "/" + val.slice(2, 4);
                if (val.length > 4) {
                    formatted += "/" + val.slice(4, 8);
                }
            }
        }
        setInputValue(formatted);

        // Try to parse if complete
        if (val.length === 8) {
            const d = parseInt(val.slice(0, 2));
            const m = parseInt(val.slice(2, 4)) - 1;
            const y = parseInt(val.slice(4, 8));
            const date = new Date(y, m, d);

            if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
                setSelectedDate(date);
                setViewDate(new Date(date));
            }
        }
    };

    // Get display label for dropdown buttons
    const getGlobalLabel = () => {
        if (isAllGlobal) return "Tất cả Global";
        if (globalTeams.includes(activeTeam)) return activeTeam;
        return "Global";
    };

    const getVNLabel = () => {
        if (isAllVN) return "Tất cả VN";
        if (vnTeams.includes(activeTeam)) return activeTeam;
        return "Việt Nam";
    };

    return (
        <div
            className={`flex lg:flex-row lg:items-center justify-between gap-y-3 gap-x-6 ${isNavbar ? "py-1 px-1" : "py-2 px-2"}`}
        >
            {canSeeTeamFilter && (
                <div className="flex flex-wrap items-center gap-5" ref={dropdownRef}>

                    {/* Label */}
                    <div className="flex items-center gap-2 px-5 py-3 h-11 bg-slate-50 rounded-xl border border-slate-200">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span className="text-[12px] font-semibold text-slate-600 uppercase tracking-widest">
                            Team
                        </span>
                    </div>

                    {/* ALL Button */}
                    <button
                        onClick={() => handleSelectTeam("All")}
                        className={`px-5 py-3 h-11 rounded-xl text-[13px] font-semibold transition-all duration-200 border flex items-center gap-2 ${
                            isAllActive
                                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAllActive ? "bg-blue-200" : "bg-slate-300"}`} />
                        Tất cả
                    </button>

                    {/* Combined Teams Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => toggleDropdown("teams")}
                            className={`px-5 py-3 h-11 rounded-xl text-[13px] font-semibold transition-all duration-200 border flex items-center gap-2.5 ${
                                isGlobalActive || isVNActive
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
                                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                            }`}
                        >
                            {isVNActive ? (
                                <Image src="/vn-flag.png" alt="VN" className="w-5 h-3.5 object-contain rounded-sm" width={20} height={14} unoptimized />
                            ) : isGlobalActive ? (
                                <Globe className={`w-4 h-4 ${isGlobalActive ? "text-blue-200" : "text-slate-500"}`} />
                            ) : (
                                <Globe className="w-4 h-4 text-slate-400" />
                            )}
                            <span>
                                {isGlobalActive ? getGlobalLabel() : isVNActive ? getVNLabel() : "Chọn Team"}
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openDropdown === "teams" ? "rotate-180" : ""} ${isGlobalActive || isVNActive ? "text-blue-200" : "text-slate-400"}`} />
                        </button>

                        <AnimatePresence>
                            {openDropdown === "teams" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute top-full left-0 mt-2 w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[60]"
                                >
                                    <div className="grid md:grid-cols-2 divide-x-2 divide-slate-200">

                                        {/* ── Global Column ── */}
                                        <div className="flex flex-col">
                                            {/* Column header */}
                                            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b-2 border-amber-200">
                                                <Globe className="w-4 h-4 text-amber-600" />
                                                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Global</span>
                                            </div>

                                            {/* All Global */}
                                            <button
                                                onClick={() => handleSelectTeam("All Global")}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold transition-colors border-b-2 border-slate-100 ${
                                                    activeTeam === "All Global"
                                                        ? "bg-blue-50 text-blue-700"
                                                        : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    {activeTeam === "All Global" && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                                                    <span>Tất cả Global</span>
                                                </span>
                                                {activeTeam === "All Global" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                            </button>

                                            {/* Global teams */}
                                            <div className="py-1">
                                                {globalTeams.map((team: string) => (
                                                    <button
                                                        key={team}
                                                        onClick={() => handleSelectTeam(team)}
                                                        className={`w-full flex items-center justify-between px-4 py-2 text-left text-[12px] transition-colors border-b border-slate-100 ${
                                                            activeTeam === team
                                                                ? "bg-blue-50 text-blue-700 font-semibold"
                                                                : "text-slate-500 hover:bg-slate-50 hover:text-blue-700 font-medium"
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            {activeTeam === team && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                                                            {team.toLowerCase().includes("global - indo") && (
                                                                <Image src="/indo-flag.png" alt="INDO" className="w-5 h-3.5 object-contain rounded-sm" width={20} height={14} unoptimized />
                                                            )}
                                                            {team.toLowerCase().includes("global thái lan") && (
                                                                <Image src="/thailand-flag.png" alt="TH" className="w-5 h-3.5 object-contain rounded-sm" width={20} height={14} unoptimized />
                                                            )}
                                                            {(team.toLowerCase().includes("jp") || team.toLowerCase().includes("nhật bản")) && (
                                                                <Image src="/japan-flag.png" alt="JP" className="w-5 h-3.5 object-contain rounded-sm border-2 border-gray-200" width={20} height={14} unoptimized />
                                                            )}
                                                            {team.toLowerCase().includes("đài loan") && (
                                                                <Image src="/taiwan-flag.png" alt="TW" className="w-5 h-3.5 object-contain rounded-sm" width={20} height={14} unoptimized />
                                                            )}
                                                            <span className="truncate max-w-[140px]">{team}</span>
                                                        </span>
                                                        {activeTeam === team && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* ── Vietnam Column ── */}
                                        <div className="flex flex-col">
                                            {/* Column header */}
                                            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b-2 border-blue-200">
                                                <Image src="/vn-flag.png" alt="VN" className="w-5 h-3.5 object-contain rounded-sm" width={20} height={14} unoptimized />
                                                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Việt Nam</span>
                                            </div>

                                            {/* All VN */}
                                            <button
                                                onClick={() => handleSelectTeam("All VN")}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold transition-colors border-b-2 border-slate-100 ${
                                                    activeTeam === "All VN"
                                                        ? "bg-blue-50 text-blue-700"
                                                        : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    {activeTeam === "All VN" && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                                                    <span>Tất cả VN</span>
                                                </span>
                                                {activeTeam === "All VN" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                            </button>

                                            {/* VN teams */}
                                            <div className="py-1">
                                                {vnTeams.map((team: string) => (
                                                    <button
                                                        key={team}
                                                        onClick={() => handleSelectTeam(team)}
                                                        className={`w-full flex items-center justify-between px-4 py-2 text-left text-[12px] transition-colors border-b border-slate-100 ${
                                                            activeTeam === team
                                                                ? "bg-blue-50 text-blue-700 font-semibold"
                                                                : "text-slate-500 hover:bg-slate-50 hover:text-blue-700 font-medium"
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            {activeTeam === team && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                                                            <span className="truncate max-w-[140px]">{team}</span>
                                                        </span>
                                                        {activeTeam === team && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {showTeamLabel && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[12px] font-semibold text-slate-700 uppercase tracking-wider">
                        Team: {userTeam}
                    </span>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-auto lg:ml-auto" ref={timeFilterRef}>

                {/* ── Time Filter ── */}
                <div className="relative ">
                    <button
                        onClick={() => toggleDropdown("timeSelector")}
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-200 group ${
                            openDropdown === "timeSelector" || timeType !== "today"
                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                                : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                    >
                        <Calendar className={`w-4 h-4 ${openDropdown === "timeSelector" || timeType !== "today" ? "text-blue-200" : "text-slate-400"}`} />
                        <div className="flex flex-col items-start leading-tight">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                openDropdown === "timeSelector" || timeType !== "today" ? "text-blue-200" : "text-slate-400"
                            }`}>
                                {timeType === "custom_day"
                                    ? "Ngày"
                                    : timeType === "custom_week"
                                    ? "Tuần"
                                    : timeType === "custom"
                                    ? "Khoảng thời gian"
                                    : filterMode === "month" ? "Tháng"
                                    : filterMode === "year" ? "Năm"
                                    : timeOptions.find((opt) => opt.id === timeType)?.label || "Thời gian"}
                            </span>
                            <span className={`text-[13px] font-semibold leading-none ${
                                openDropdown === "timeSelector" || timeType !== "today" ? "text-white" : "text-slate-800"
                            }`}>
                                {filterMode === "year"
                                    ? dateRange.start.getFullYear()
                                    : filterMode === "month"
                                        ? `Tháng ${dateRange.start.getMonth() + 1}/${dateRange.start.getFullYear()}`
                                        : timeType === "custom_day"
                                            ? formatDate(selectedDate)
                                            : timeType === "custom_week"
                                                ? `Tuần ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
                                                : timeType === "custom_day"
                                                    ? formatDate(selectedDate)
                                                    : timeType === "custom_week" || filterMode === "week" || timeType === "custom" || filterMode === "range"
                                                    ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
                                                    : formatDate(selectedDate)
                                }
                            </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openDropdown === "timeSelector" ? "rotate-180" : ""} ${openDropdown === "timeSelector" || timeType !== "today" ? "text-blue-200" : "text-slate-400"}`} />
                    </button>

                    {timeType !== "today" && (
                        <motion.button
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); handleSelectTimeType("today"); }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10 border-2 border-white"
                            title="Xóa bộ lọc"
                        >
                            <X className="w-2.5 h-2.5" />
                        </motion.button>
                    )}

                    <AnimatePresence>
                        {openDropdown === "timeSelector" && (
                            <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[80] overflow-hidden w-[320px] max-w-[calc(100vw-16px)]"
                            >
                                {/* ── Mode Tabs ── */}
                                <div className="flex items-center gap-0.5 p-2 border-b border-slate-100 bg-slate-50">
                                    {(["day", "week", "month", "year", "range"] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setFilterMode(mode)}
                                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all ${
                                                filterMode === mode
                                                    ? "bg-blue-600 text-white shadow-sm"
                                                    : "text-slate-400 hover:text-slate-700 hover:bg-white"
                                            }`}
                                        >
                                            {mode === "day" ? "Ngày" : mode === "week" ? "Tuần" : mode === "month" ? "Tháng" : mode === "year" ? "Năm" : "Khoảng"}
                                        </button>
                                    ))}
                                </div>

                                {/* ── Quick presets — horizontal scroll ── */}
                                <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-100 overflow-x-auto scrollbar-none">
                                    {timeOptions.map((opt) => {
                                        const isActive = timeType === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleSelectTimeType(opt.id)}
                                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                                                    isActive
                                                        ? "bg-blue-600 border-blue-600 text-white"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* ── Calendar body ── */}
                                <div className="p-3">
                                    {filterMode === "month" ? (
                                        <>
                                            <div className="flex items-center justify-between mb-3">
                                                <button
                                                    onClick={() => { const d = new Date(viewDate); d.setFullYear(d.getFullYear() - 1); if (d.getFullYear() >= MIN_DATE.getFullYear()) setViewDate(d); }}
                                                    disabled={viewDate.getFullYear() <= MIN_DATE.getFullYear()}
                                                    className={`p-1.5 rounded-lg transition-colors ${viewDate.getFullYear() <= MIN_DATE.getFullYear() ? "text-slate-200 cursor-not-allowed" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                                                >
                                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                                </button>
                                                <span className="text-[13px] font-bold text-slate-800">{viewDate.getFullYear()}</span>
                                                <button
                                                    onClick={() => { const d = new Date(viewDate); d.setFullYear(d.getFullYear() + 1); if (d.getFullYear() <= new Date().getFullYear()) setViewDate(d); }}
                                                    disabled={viewDate.getFullYear() >= new Date().getFullYear()}
                                                    className={`p-1.5 rounded-lg transition-colors ${viewDate.getFullYear() >= new Date().getFullYear() ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
                                                >
                                                    <ChevronDown className="w-4 h-4 -rotate-90" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {Array.from({ length: 12 }).map((_, i) => {
                                                    const yr = viewDate.getFullYear();
                                                    const today = new Date();
                                                    const isActiveMon = dateRange.start.getMonth() === i && dateRange.start.getFullYear() === yr;
                                                    const isCurrentMon = today.getMonth() === i && today.getFullYear() === yr;
                                                    const isFutureMon = yr > today.getFullYear() || (yr === today.getFullYear() && i > today.getMonth());
                                                    const isBeforeMinMon = yr < MIN_DATE.getFullYear() || (yr === MIN_DATE.getFullYear() && i < MIN_DATE.getMonth());
                                                    const isDisabled = isFutureMon || isBeforeMinMon;
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleMonthSelect(i)}
                                                            disabled={isDisabled}
                                                            className={`py-2.5 rounded-xl text-[11px] font-semibold border transition-all ${
                                                                isActiveMon ? "bg-blue-600 border-blue-600 text-white"
                                                                : isCurrentMon ? "border-blue-300 text-blue-600 bg-blue-50"
                                                                : isDisabled ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                                                : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50"
                                                            }`}
                                                        >
                                                            Th.{i + 1}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : filterMode === "year" ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {[2023, 2024, 2025, 2026, 2027, 2028].map((yr) => {
                                                const isActiveYr = dateRange.start.getFullYear() === yr;
                                                const isCurrentYr = new Date().getFullYear() === yr;
                                                return (
                                                    <button
                                                        key={yr}
                                                        onClick={() => handleYearSelect(yr)}
                                                        disabled={yr > new Date().getFullYear()}
                                                        className={`py-4 rounded-xl text-[15px] font-bold border transition-all ${
                                                            isActiveYr ? "bg-blue-600 border-blue-600 text-white"
                                                            : isCurrentYr ? "border-blue-300 text-blue-600 bg-blue-50"
                                                            : yr > new Date().getFullYear() ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50"
                                                            : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50"
                                                        }`}
                                                    >
                                                        {yr}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Month nav */}
                                            <div className="flex items-center justify-between mb-2">
                                                <button
                                                    onClick={() => { const prev = new Date(viewDate); prev.setMonth(prev.getMonth() - 1); if (prev >= new Date(MIN_DATE.getFullYear(), MIN_DATE.getMonth(), 1)) changeMonth(-1); }}
                                                    disabled={viewDate.getFullYear() === MIN_DATE.getFullYear() && viewDate.getMonth() <= MIN_DATE.getMonth()}
                                                    className={`p-1.5 rounded-lg transition-colors ${viewDate.getFullYear() === MIN_DATE.getFullYear() && viewDate.getMonth() <= MIN_DATE.getMonth() ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
                                                >
                                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                                </button>
                                                <span className="text-[12px] font-bold text-slate-800 capitalize">
                                                    {viewDate.toLocaleString("vi-VN", { month: "long", year: "numeric" })}
                                                </span>
                                                <button
                                                    onClick={() => { const today = new Date(); const nextMonth = new Date(viewDate); nextMonth.setMonth(nextMonth.getMonth() + 1); if (nextMonth.getFullYear() < today.getFullYear() || (nextMonth.getFullYear() === today.getFullYear() && nextMonth.getMonth() <= today.getMonth())) changeMonth(1); }}
                                                    disabled={viewDate.getFullYear() > new Date().getFullYear() || (viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() >= new Date().getMonth())}
                                                    className={`p-1.5 rounded-lg transition-colors ${viewDate.getFullYear() > new Date().getFullYear() || (viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() >= new Date().getMonth()) ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
                                                >
                                                    <ChevronDown className="w-4 h-4 -rotate-90" />
                                                </button>
                                            </div>

                                            {/* Day headers */}
                                            <div className="grid grid-cols-7 mb-1">
                                                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
                                                    <div key={d} className="text-center text-[9px] font-bold text-slate-400 py-1">{d}</div>
                                                ))}
                                            </div>

                                            {/* Days grid */}
                                            <div className="grid grid-cols-7 gap-y-0.5">
                                                {days.map((day, idx) => (
                                                    <div key={idx} className="aspect-square flex items-center justify-center">
                                                        {day ? (
                                                            <button
                                                                onClick={() => handleDateSelect(day)}
                                                                disabled={isFuture(day) || isBeforeMin(day)}
                                                                className={`w-8 h-8 flex items-center justify-center text-[11px] font-medium rounded-lg transition-all ${
                                                                    isSelected(day) || (filterMode === "week" && isInRange(day))
                                                                        ? "bg-blue-600 text-white font-bold"
                                                                        : isInRange(day) ? "bg-blue-100 text-blue-700"
                                                                        : isToday(day) ? "bg-blue-50 text-blue-600 ring-1 ring-blue-400 font-bold"
                                                                        : (isFuture(day) || isBeforeMin(day)) ? "text-slate-300 cursor-not-allowed"
                                                                        : "hover:bg-slate-100 text-slate-700 hover:text-blue-700"
                                                                }`}
                                                            >
                                                                {day}
                                                            </button>
                                                        ) : <div />}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Range hint */}
                                            {filterMode === "range" && (
                                                <div className="mt-2 px-2.5 py-1.5 bg-blue-50 rounded-lg flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                                                    <span className="text-[10px] text-blue-700 font-medium truncate">
                                                        {dateRange.start.getTime() === dateRange.end.getTime()
                                                            ? "Chọn ngày kết thúc"
                                                            : `${formatDate(dateRange.start)} → ${formatDate(dateRange.end)}`}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* ── Footer ── */}
                                <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-100 bg-slate-50">
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        {filterMode === "year"
                                            ? dateRange.start.getFullYear()
                                            : filterMode === "month"
                                                ? `Tháng ${dateRange.start.getMonth() + 1}/${dateRange.start.getFullYear()}`
                                                : `${formatDate(dateRange.start)}${dateRange.start.getTime() !== dateRange.end.getTime() ? ` → ${formatDate(dateRange.end)}` : ''}`}
                                    </span>
                                    <button
                                        onClick={() => setOpenDropdown(null)}
                                        className="px-4 py-1.5 text-[11px] font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all uppercase tracking-wider"
                                    >
                                        Xong
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Name Search ── */}
                <div
                    className={`flex items-center gap-2.5 px-5 py-3 h-11 rounded-xl border transition-all duration-200 ${
                        searchName
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white border-slate-200 hover:border-blue-300 focus-within:border-blue-400"
                    }`}
                >
                    <Search className={`w-4 h-4 shrink-0 ${searchName ? "text-blue-200" : "text-slate-400"}`} />
                    <input
                        type="text"
                        placeholder="Tìm tên..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        className={`bg-transparent border-none focus:outline-none text-[13px] font-medium w-32 placeholder:font-normal ${
                            searchName ? "text-white placeholder:text-blue-300" : "text-slate-800 placeholder:text-slate-400"
                        }`}
                    />
                    {searchName && (
                        <button onClick={() => setSearchName("")} className="p-0.5 hover:bg-white/20 rounded-full transition-colors">
                            <X className="w-3.5 h-3.5 text-white" />
                        </button>
                    )}
                </div>

                {/* ── Screenshot ── */}
                {onCapture && (
                    <button
                        type="button"
                        onClick={onCapture}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-slate-900 text-white hover:bg-black transition-all"
                    >
                        <Camera className="w-4 h-4" />
                        Chụp
                    </button>
                )}
            </div>
        </div>
    );
};

export default ActivityFilters;
