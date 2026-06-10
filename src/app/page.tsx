"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowRight,
    CheckCircle,
    Shield,
    BarChart3,
    Globe,
    Database,
    Video,
    Search,
    TrendingUp,
    Layers,
    Moon,
    Sun,
} from "lucide-react";
import { SiGooglecloud, SiAmazonwebservices } from "react-icons/si";
import { useAuthStore } from "@/store/auth-store";
import { motion } from "framer-motion";

export default function LandingPage() {
    const { isAuthenticated } = useAuthStore();
    const [scrolled, setScrolled] = useState(false);

    const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        // Check local storage or system preference on mount
        const savedTheme = localStorage.getItem("theme");
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add("dark");
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove("dark");
        }
    }, []);

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

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30 transition-colors duration-300">
            {/* HEADER */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-sm dark:shadow-slate-900/10 py-4" : "bg-transparent py-6"}`}
            >
                <div className="container mx-auto px-6 max-w-7xl flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                            <Image src="/logo-vcb.png" alt="Viễn Chí Bảo" className="w-full h-full object-cover" width={40} height={40} unoptimized />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Viễn Chí Bảo
                        </span>
                    </div>

                    {/* Nav Links (Simplified) */}
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
                        <Link href="#" className="hover:text-blue-600 transition-colors">
                            Trang chủ
                        </Link>
                        <Link href="#" className="hover:text-blue-600 transition-colors">
                            Tính năng
                        </Link>
                        <Link href="#" className="hover:text-blue-600 transition-colors">
                            Bảng giá
                        </Link>
                    </nav>

                    {/* Auth Buttons */}
                    <div className="flex items-center gap-4">
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
                                    <Moon size={12} className="text-slate-900 fill-slate-900/20" />
                                ) : (
                                    <Sun size={12} className="text-orange-500 fill-orange-500/20" />
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
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Đang tải...
                                    </>
                                ) : (
                                    <>
                                        Vào Dashboard <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    prefetch={true}
                                    onClick={() => setNavigatingTo("/login")}
                                    className={`text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 ${navigatingTo ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                    {navigatingTo === "/login" && (
                                        <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                    )}
                                    Đăng nhập
                                </Link>
                                <Link
                                    href="/register"
                                    prefetch={true}
                                    onClick={() => setNavigatingTo("/register")}
                                    className={`px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 ${navigatingTo ? "opacity-80 pointer-events-none" : ""}`}
                                >
                                    {navigatingTo === "/register" && (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    )}
                                    Đăng ký
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="pt-32 pb-20 overflow-hidden relative">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-blue-50 to-transparent dark:from-blue-900/10 dark:to-transparent -z-10 rounded-bl-[100px]" />
                <div className="absolute top-40 left-20 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob will-change-transform" />
                <div className="absolute top-40 right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 will-change-transform" />

                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        {/* Text Content */}
                        <div className="flex-1 max-w-2xl relative z-10">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-8"
                            >
                                <Layers className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Video Intelligence Platform
                                </span>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.15] mb-6 tracking-tight"
                            >
                                Tự động hóa <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                    Sáng tạo Video & AI
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-lg"
                            >
                                Giải pháp toàn diện giúp bạn khám phá xu hướng TikTok/Reels, tự động tải xuống hàng loạt
                                và phân tích chiến lược của đối thủ cạnh tranh với sức mạnh của AI.
                            </motion.p>

                            {/* Removed Buttons as requested */}

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500 mt-8"
                            >
                                <div className="flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4 text-blue-500" /> Phân tích Video Real-time
                                </div>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <div className="flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4 text-blue-500" /> Không giới hạn kênh
                                </div>
                            </motion.div>
                        </div>

                        {/* Visual Mockup (Right Side) - Animated */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="flex-1 w-full relative"
                        >
                            {/* Main Dashboard Card */}
                            <div className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 transform perspective-1000 rotate-y-[-5deg] hover:rotate-y-0 transition-transform duration-700">
                                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 aspect-[16/10] relative">
                                    {/* Mock UI Header */}
                                    <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-2">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                        </div>
                                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-5 rounded-md mx-4" />
                                    </div>

                                    {/* Mock UI Body (Animated) */}
                                    <div className="p-6 grid grid-cols-3 gap-4">
                                        <div className="col-span-2 space-y-4">
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative">
                                                {/* Scanning Line Effect */}
                                                <motion.div
                                                    animate={{ top: ["0%", "100%", "0%"] }}
                                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                                    className="absolute left-0 right-0 h-0.5 bg-green-400/50 shadow-[0_0_10px_rgba(74,222,128,0.5)] z-20"
                                                />

                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 bg-black dark:bg-slate-800 rounded-lg flex items-center justify-center text-white">
                                                        <BarChart3 size={20} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                                                        <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                                                    </div>
                                                </div>
                                                <div className="h-24 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg w-full flex items-end justify-between px-2 pb-2 gap-1.5">
                                                    {[40, 60, 30, 80, 50, 90, 65].map((h, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ height: 0 }}
                                                            animate={{
                                                                height: [`${h}%`, `${Math.min(h + 20, 100)}%`, `${h}%`],
                                                            }}
                                                            transition={{
                                                                duration: 2,
                                                                repeat: Infinity,
                                                                delay: i * 0.1,
                                                            }}
                                                            className="w-full bg-blue-500 rounded-t-sm opacity-80"
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Video Cards Row */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <motion.div
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                                    className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 h-24 flex gap-2 items-center"
                                                >
                                                    <div className="w-12 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0" />
                                                    <div className="space-y-2 w-full">
                                                        <div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                                                        <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
                                                    </div>
                                                </motion.div>

                                                <motion.div
                                                    animate={{ y: [0, 5, 0] }}
                                                    transition={{
                                                        duration: 3,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        delay: 1,
                                                    }}
                                                    className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 h-24 flex gap-2 items-center"
                                                >
                                                    <div className="w-12 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0" />
                                                    <div className="space-y-2 w-full">
                                                        <div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                                                        <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
                                                    </div>
                                                </motion.div>
                                            </div>
                                        </div>

                                        <div className="col-span-1 space-y-4">
                                            <motion.div
                                                className="bg-indigo-600 p-4 rounded-xl shadow-lg h-32 flex flex-col justify-between text-white relative overflow-hidden"
                                                animate={{
                                                    boxShadow: [
                                                        "0 10px 15px -3px rgba(79, 70, 229, 0.4)",
                                                        "0 20px 25px -5px rgba(79, 70, 229, 0.5)",
                                                        "0 10px 15px -3px rgba(79, 70, 229, 0.4)",
                                                    ],
                                                }}
                                                transition={{ duration: 3, repeat: Infinity }}
                                            >
                                                <Globe size={20} className="opacity-80" />
                                                <div className="space-y-1 relative z-10">
                                                    <div className="text-xs opacity-70">Engagement</div>
                                                    <div className="text-2xl font-bold">+128%</div>
                                                </div>
                                                {/* Background effect */}
                                                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full" />
                                            </motion.div>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 h-full flex flex-col justify-center items-center gap-2">
                                                <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center">
                                                    <Video size={20} />
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-slate-400">Content</div>
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        Viral
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Elements (Animated) */}
                            <motion.div
                                animate={{ y: [-10, 10, -10] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-6 -right-8 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-20 max-w-[200px]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500">Video Status</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Clean & Safe</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [10, -10, 10] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                className="absolute -bottom-8 -left-8 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-20"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Search size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500">Channels Tracked</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">2,450+</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* PARTNERS SECTION */}
            <section className="py-12 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="container mx-auto px-6 max-w-7xl">
                    <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">
                        ĐƯỢC HỖ TRỢ BỞI CÁC NỀN TẢNG HÀNG ĐẦU
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-12 lg:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Google Cloud Logo */}
                        <div className="flex items-center gap-2 group cursor-pointer hover:opacity-100">
                            <SiGooglecloud className="w-8 h-8 text-slate-500 group-hover:text-[#4285F4] transition-colors" />
                            <span className="font-bold text-xl text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                Google Cloud
                            </span>
                        </div>

                        {/* AWS Logo */}
                        <div className="flex items-center gap-2 group cursor-pointer hover:opacity-100">
                            <SiAmazonwebservices className="w-8 h-8 text-slate-500 group-hover:text-[#FF9900] transition-colors" />
                            <span className="font-bold text-xl text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                AWS
                            </span>
                        </div>

                        {/* Apify Logo */}
                        <div className="flex items-center gap-2 group cursor-pointer hover:opacity-100">
                            <Database className="w-8 h-8 text-slate-500 group-hover:text-[#97D700] transition-colors" />
                            <span className="font-bold text-xl text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                Apify
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Additional Features Section */}
            <section className="py-20">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                            Công nghệ lõi của chúng tôi
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            Hệ thống phân tích video thông minh được xây dựng trên nền tảng Big Data và AI tiên tiến
                            nhất.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Search,
                                title: "Scraping Thông minh",
                                desc: "Tự động thu thập dữ liệu video, bình luận và xu hướng từ TikTok/Instagram theo thời gian thực.",
                            },
                            {
                                icon: TrendingUp,
                                title: "Dự báo Xu hướng",
                                desc: "Sử dụng AI để phân tích và dự đoán các trào lưu nội dung viral tiếp theo.",
                            },
                            {
                                icon: Layers,
                                title: "Quản lý Đa kênh",
                                desc: "Tập trung quản lý hàng trăm kênh video trên một bảng điều khiển duy nhất.",
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                            >
                                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                                    <item.icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
