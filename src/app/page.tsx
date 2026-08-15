"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    Bot,
    Calendar,
    ChevronDown,
    ClipboardList,
    LayoutGrid,
    Lightbulb,
    Moon,
    Search,
    Settings,
    Sparkles,
    Sun,
    Video,
} from "lucide-react";
import { SiGooglecloud, SiAmazonwebservices, SiOpenai, SiClaude } from "react-icons/si";
import { useAuthStore } from "@/store/auth-store";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/SocialLanguageContext";
import { motion } from "framer-motion";

// Tổng quan công việc hiển thị trong khung mockup — số liệu minh hoạ tĩnh,
// không lấy từ API (trang landing hiển thị trước khi đăng nhập).
const TASK_STATS = [
    { label: "Tổng công việc", value: "128", delta: "+18.2%", positive: true },
    { label: "Hoàn thành", value: "89", delta: "+24.6%", positive: true },
    { label: "Hiệu suất team", value: "92.4%", delta: "+8.7%", positive: true },
    { label: "Đang quá hạn", value: "7", delta: "+12.5%", positive: false },
];

const PROGRESS_SEGMENTS = [
    { label: "Hoàn thành", count: 89, pct: 69.5, color: "#22c55e" },
    { label: "Đang làm", count: 28, pct: 21.9, color: "#3b82f6" },
    { label: "Chờ phản hồi", count: 6, pct: 4.7, color: "#f59e0b" },
    { label: "Quá hạn", count: 5, pct: 3.9, color: "#ef4444" },
];

const PERF_TREND = [78, 83, 74, 79, 81, 85, 92.4];
const PERF_DAYS = ["11/08", "12/08", "13/08", "14/08", "15/08", "16/08", "17/08"];

export default function LandingPage() {
    const { isAuthenticated } = useAuthStore();
    const { lang, setLang, t } = useLang();
    const tl = t.landing;
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === "dark";
    const [scrolled, setScrolled] = useState(false);

    const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

    const todayLabel = useMemo(() => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, "0");
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        return `${dd}/${mm}/${now.getFullYear()}`;
    }, []);

    const enterHref = isAuthenticated ? "/dashboard" : "/login";

    // Re-validate auth state on landing page mount.
    // This ensures that after backend restart (dev),
    // any old tokens are checked against /auth/profile
    // and cleared if no longer valid.
    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        if (token && typeof window !== "undefined") {
            // Use store's loadUser to validate token with backend.
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            useAuthStore.getState().loadUser();
        }
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const toolCards = [
        { icon: ClipboardList, title: tl.toolWorkTitle, desc: tl.toolWorkDesc, color: "green" as const },
        { icon: BarChart3, title: tl.toolPerfTitle, desc: tl.toolPerfDesc, color: "cyan" as const },
        { icon: Search, title: tl.toolContentTitle, desc: tl.toolContentDesc, color: "purple" as const },
        { icon: Lightbulb, title: tl.toolProductTitle, desc: tl.toolProductDesc, color: "yellow" as const },
        { icon: Video, title: tl.toolUtilTitle, desc: tl.toolUtilDesc, color: "red" as const },
        { icon: Bot, title: tl.toolAiTitle, desc: tl.toolAiDesc, color: "indigo" as const },
    ];

    const colorClasses: Record<string, string> = {
        green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
        cyan: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400",
        purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
        yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
        red: "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400",
        indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30 transition-colors duration-300">
            {/* HEADER */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-sm dark:shadow-slate-900/10 py-4" : "bg-transparent py-6"}`}
            >
                <div className="container mx-auto px-6 lg:px-10 max-w-[1680px] flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                            <Image src="/logo-vcb.png" alt="Viễn Chí Bảo" className="w-full h-full object-cover" width={40} height={40} unoptimized />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Viễn Chí Bảo
                        </span>
                    </div>

                    {/* Nav Links */}
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
                        <Link href="/" className="text-blue-600 dark:text-blue-400 font-semibold border-b-2 border-blue-600 dark:border-blue-400 pb-1">
                            {tl.navHome}
                        </Link>
                        <Link href="#tinh-nang" className="hover:text-blue-600 transition-colors">
                            {tl.navFeatures}
                        </Link>
                        <Link href="#" className="hover:text-blue-600 transition-colors">
                            {tl.navGuide}
                        </Link>
                        <Link href="#" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                            {tl.navResources}
                            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                    </nav>

                    {/* Auth Buttons */}
                    <div className="flex items-center gap-4">
                        {/* Language toggle */}
                        <div className="flex rounded-full overflow-hidden text-xs font-bold border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setLang("vi")}
                                aria-pressed={lang === "vi"}
                                className={`px-2.5 py-1.5 transition-colors ${lang === "vi" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
                            >
                                VI
                            </button>
                            <button
                                onClick={() => setLang("en")}
                                aria-pressed={lang === "en"}
                                className={`px-2.5 py-1.5 transition-colors border-l border-slate-200 dark:border-slate-700 ${lang === "en" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
                            >
                                EN
                            </button>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className={`relative w-14 h-7 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                                isDarkMode ? "bg-slate-700" : "bg-slate-200"
                            }`}
                            aria-label="Toggle Dark Mode"
                        >
                            <div className="flex justify-between items-center w-full h-full px-1 text-[10px] font-bold">
                                <span
                                    className={`transition-opacity duration-300 ${isDarkMode ? "opacity-100 text-white" : "opacity-0"}`}
                                >
                                    ON
                                </span>
                                <span
                                    className={`transition-opacity duration-300 ${!isDarkMode ? "opacity-100 text-slate-500" : "opacity-0"}`}
                                >
                                    OFF
                                </span>
                            </div>
                            <motion.div
                                className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center z-10"
                                animate={{ x: isDarkMode ? 28 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                {isDarkMode ? (
                                    <Moon size={12} className="text-slate-900 fill-slate-900/20" aria-hidden="true" />
                                ) : (
                                    <Sun size={12} className="text-orange-500 fill-orange-500/20" aria-hidden="true" />
                                )}
                            </motion.div>
                        </button>

                        {isAuthenticated ? (
                            <Link
                                href="/dashboard"
                                prefetch={false}
                                onClick={() => setNavigatingTo("/dashboard")}
                                className={`px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 ${navigatingTo ? "opacity-80 pointer-events-none" : ""}`}
                            >
                                {navigatingTo === "/dashboard" ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                                        {tl.loading}
                                    </>
                                ) : (
                                    <>
                                        {tl.goToDashboard} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                    </>
                                )}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    prefetch={true}
                                    onClick={() => setNavigatingTo("/login")}
                                    className={`px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 ${navigatingTo ? "opacity-80 pointer-events-none" : ""}`}
                                >
                                    {navigatingTo === "/login" && (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                                    )}
                                    {tl.login}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="pt-24 pb-10 overflow-hidden relative">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-blue-50 to-transparent dark:from-blue-900/10 dark:to-transparent -z-10 rounded-bl-[100px]" />
                <div className="absolute top-40 left-20 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob will-change-transform" />
                <div className="absolute top-40 right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 will-change-transform" />

                <div className="container mx-auto px-6 lg:px-10 max-w-[1680px]">
                    <div className="flex flex-col lg:flex-row items-center gap-10">
                        {/* Text Content */}
                        <div className="flex-1 max-w-xl relative z-10">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-5"
                            >
                                <LayoutGrid className="w-4 h-4 text-blue-600" aria-hidden="true" />
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                    {tl.badge}
                                </span>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-[1.2] mb-4 tracking-tight whitespace-nowrap"
                            >
                                {tl.heroTitleLine1} <br />
                                {tl.heroTitlePre}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                    {tl.heroTitleHighlight1}
                                </span>
                                {tl.heroTitleMid}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                    {tl.heroTitleHighlight2}
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-base text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-lg"
                            >
                                {tl.heroDesc}
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="flex flex-wrap items-center gap-4"
                            >
                                <Link
                                    href={enterHref}
                                    prefetch={enterHref === "/login"}
                                    onClick={() => setNavigatingTo(enterHref)}
                                    className={`px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all flex items-center gap-2 ${navigatingTo ? "opacity-80 pointer-events-none" : ""}`}
                                >
                                    {navigatingTo === enterHref ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                                    ) : (
                                        <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                                    )}
                                    {tl.ctaEnter}
                                </Link>
                                <a
                                    href="#mockup-preview"
                                    className="px-5 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                >
                                    <BarChart3 className="w-4 h-4" aria-hidden="true" />
                                    {tl.ctaOverview}
                                </a>
                            </motion.div>
                        </div>

                        {/* Visual Mockup (Right Side) — purely illustrative preview, not a real/functional dashboard */}
                        <motion.div
                            id="mockup-preview"
                            aria-hidden="true"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="flex-1 w-full relative scroll-mt-32"
                        >
                            {/* Main Dashboard Card */}
                            <div className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2">
                                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                    {/* Mock UI Header */}
                                    <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-2 shrink-0">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                        </div>
                                    </div>

                                    <div className="flex">
                                        {/* Sidebar */}
                                        <div className="hidden sm:flex flex-col items-center gap-2 py-4 px-2.5 border-r border-slate-100 dark:border-slate-800">
                                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                                                <LayoutGrid size={15} />
                                            </div>
                                            {[ClipboardList, BarChart3, Search, Lightbulb, Video, Bot, Settings].map((Icon, i) => (
                                                <div
                                                    key={i}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-600"
                                                >
                                                    <Icon size={15} />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex-1 p-4 sm:p-5 min-w-0">
                                            {/* Toolbar */}
                                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                                    Tổng quan hôm nay
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium px-2.5 py-1.5 rounded-lg">
                                                        <Calendar size={12} />
                                                        Hôm nay: {todayLabel}
                                                    </div>
                                                    <div className="hidden md:flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium px-2.5 py-1.5 rounded-lg">
                                                        <Sparkles size={12} />
                                                        AI Assistant
                                                    </div>
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                                        <Settings size={13} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stat cards */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                                                {TASK_STATS.map((s) => (
                                                    <div
                                                        key={s.label}
                                                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3"
                                                    >
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 truncate">{s.label}</p>
                                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                                            <span className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</span>
                                                            <span className={`text-[10px] font-semibold ${s.positive ? "text-green-500" : "text-red-500"}`}>
                                                                {s.delta}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Progress donut + Perf trend */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">Tiến độ công việc</p>
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative w-20 h-20 shrink-0">
                                                            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                                                                {(() => {
                                                                    let cumulative = 0;
                                                                    return PROGRESS_SEGMENTS.map((seg) => {
                                                                        const offset = -cumulative;
                                                                        cumulative += seg.pct;
                                                                        return (
                                                                            <circle
                                                                                key={seg.label}
                                                                                cx="18"
                                                                                cy="18"
                                                                                r="15.5"
                                                                                fill="none"
                                                                                stroke={seg.color}
                                                                                strokeWidth="4"
                                                                                strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                                                                                strokeDashoffset={offset}
                                                                                pathLength={100}
                                                                            />
                                                                        );
                                                                    });
                                                                })()}
                                                            </svg>
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                <span className="text-sm font-bold text-slate-900 dark:text-white">128</span>
                                                                <span className="text-[9px] text-slate-400">Tổng</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5 min-w-0 flex-1">
                                                            {PROGRESS_SEGMENTS.map((seg) => (
                                                                <div key={seg.label} className="flex items-baseline gap-1.5 text-[10px] leading-tight">
                                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0 self-center" style={{ backgroundColor: seg.color }} />
                                                                    <span className="text-slate-500 dark:text-slate-400 flex-1">{seg.label}</span>
                                                                    <span className="text-slate-700 dark:text-slate-300 font-medium shrink-0 whitespace-nowrap">
                                                                        {seg.count} ({seg.pct}%)
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">Hiệu suất 7 ngày qua</p>
                                                    <svg viewBox="0 0 280 90" className="w-full h-20" preserveAspectRatio="none">
                                                        <polyline
                                                            fill="none"
                                                            stroke="#4f46e5"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            points={PERF_TREND.map((v, i) => `${(i / (PERF_TREND.length - 1)) * 270 + 5},${85 - (v / 100) * 80}`).join(" ")}
                                                        />
                                                        {PERF_TREND.map((v, i) => (
                                                            <circle
                                                                key={i}
                                                                cx={(i / (PERF_TREND.length - 1)) * 270 + 5}
                                                                cy={85 - (v / 100) * 80}
                                                                r={i === PERF_TREND.length - 1 ? 3 : 1.5}
                                                                fill="#4f46e5"
                                                            />
                                                        ))}
                                                    </svg>
                                                    <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                                        {PERF_DAYS.map((d) => (
                                                            <span key={d}>{d}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tool icons row */}
                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                {toolCards.map((tool) => (
                                                    <div
                                                        key={tool.title}
                                                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-2.5 flex flex-col items-center text-center gap-1.5"
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[tool.color]}`}>
                                                            <tool.icon size={15} />
                                                        </div>
                                                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-200 leading-tight w-full">
                                                            {tool.title}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* PARTNERS SECTION */}
            <section className="py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="container mx-auto px-6 lg:px-10 max-w-[1680px]">
                    <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                        {tl.partnersTitle}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-12 lg:gap-24 opacity-70 hover:opacity-100 transition-opacity duration-500">
                        {/* Google Cloud Logo */}
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <SiGooglecloud className="w-7 h-7 text-slate-500 group-hover:text-[#4285F4] transition-colors" aria-hidden="true" />
                            <span className="font-bold text-lg text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                Google Cloud
                            </span>
                        </div>

                        {/* AWS Logo */}
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <SiAmazonwebservices className="w-7 h-7 text-slate-500 group-hover:text-[#FF9900] transition-colors" aria-hidden="true" />
                            <span className="font-bold text-lg text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                aws
                            </span>
                        </div>

                        {/* OpenAI Logo */}
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <SiOpenai className="w-7 h-7 text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" aria-hidden="true" />
                            <span className="font-bold text-lg text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                OpenAI
                            </span>
                        </div>

                        {/* Claude Logo */}
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <SiClaude className="w-7 h-7 text-slate-500 group-hover:text-[#DA7756] transition-colors" aria-hidden="true" />
                            <span className="font-bold text-lg text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                Claude
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* TOOLS SECTION */}
            <section id="tinh-nang" className="py-8 pb-10 scroll-mt-24">
                <div className="container mx-auto px-6 lg:px-10 max-w-[1680px]">
                    <div className="text-center max-w-3xl mx-auto mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {tl.coreTechTitle}
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {toolCards.map((tool) => (
                            <div
                                key={tool.title}
                                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                            >
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colorClasses[tool.color]}`}>
                                    <tool.icon size={20} aria-hidden="true" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{tool.title}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">{tool.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
