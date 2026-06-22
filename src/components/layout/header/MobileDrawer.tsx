"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Settings, LogOut, Video } from "lucide-react";
import { User, UserRole } from "@/types/auth";
import { NavMenu } from "./types";
import { getSectionClasses } from "./color-utils";

const ROLE_LABELS: Record<UserRole, string> = {
    [UserRole.ADMIN]: "Quản trị viên",
    [UserRole.MANAGER]: "Quản lý",
    [UserRole.LEADER]: "Trưởng nhóm",
    [UserRole.MEMBER]: "Thành viên",
    [UserRole.EDITOR]: "Editor",
    [UserRole.CONTENT]: "Content",
};

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    userInitial: string;
    onLogout: () => void;
    navMenus: NavMenu[];
    isManagerOrAdmin: boolean;
    allowedMenuIds: string[];
    isMenuActive: (menu: NavMenu) => boolean;
    isItemActive: (href: string) => boolean;
    mobileExpandedId: string | null;
    setMobileExpandedId: (id: string | null) => void;
    mobileSubItemKey: string | null;
    setMobileSubItemKey: (key: string | null) => void;
}

export default function MobileDrawer({
    isOpen,
    onClose,
    user,
    userInitial,
    onLogout,
    navMenus,
    isManagerOrAdmin,
    allowedMenuIds,
    isMenuActive,
    isItemActive,
    mobileExpandedId,
    setMobileExpandedId,
    mobileSubItemKey,
    setMobileSubItemKey,
}: MobileDrawerProps) {
    const pathname = usePathname() || "";
    const roleLabel = user?.roles?.[0] ? (ROLE_LABELS[user.roles[0]] ?? user.roles[0]) : "";
    const isManagement = user?.roles?.some((r) =>
        [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER].includes(r),
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] md:hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Drawer panel */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute inset-x-0 top-16 bottom-0 bg-[#0d1424] border-t border-white/[0.06] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* User info banner */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md ring-1 ring-white/10">
                                <span className="text-sm font-bold text-white leading-none">{userInitial}</span>
                            </div>
                            <div className="leading-none">
                                <p className="text-sm font-semibold text-slate-200 leading-tight">
                                    {user?.full_name}
                                </p>
                                <p className="text-xs font-semibold text-blue-400 uppercase tracking-tight mt-1">
                                    {roleLabel}
                                </p>
                            </div>
                        </div>

                        {/* Nav sections */}
                        <div className="py-2">
                            {navMenus.map((menu) => {
                                const active = isMenuActive(menu);
                                const expanded = mobileExpandedId === menu.id;

                                return (
                                    <div key={menu.id}>
                                        <button
                                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.04] transition-colors duration-150"
                                            onClick={() => setMobileExpandedId(expanded ? null : menu.id)}
                                        >
                                            <span
                                                className={`text-base font-bold ${active ? "text-blue-400" : "text-slate-200"}`}
                                            >
                                                {menu.label}
                                            </span>
                                            <ChevronDown
                                                className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                                            />
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {expanded && (
                                                <motion.div
                                                    key="content"
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pb-2">
                                                        {menu.sections.map((section) => {
                                                            const {
                                                                badgeClass,
                                                                activeIconClass,
                                                                activeDotClass,
                                                                activeRowClass,
                                                            } = getSectionClasses(section.color ?? "blue");

                                                            return (
                                                                <div key={section.section}>
                                                                    <div className="flex items-center px-5 pt-3 pb-1">
                                                                        <span
                                                                            className={`text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md select-none ${badgeClass}`}
                                                                        >
                                                                            {section.section}
                                                                        </span>
                                                                    </div>

                                                                    <div>
                                                                        {section.items.map((item) => {
                                                                            const itemActive = isItemActive(item.href);
                                                                            const hasSubPanel = !!item.subPanel;
                                                                            const isSubExpanded =
                                                                                mobileSubItemKey === item.label;

                                                                            if (hasSubPanel) {
                                                                                return (
                                                                                    <div key={item.label}>
                                                                                        <button
                                                                                            onClick={() =>
                                                                                                setMobileSubItemKey(
                                                                                                    isSubExpanded
                                                                                                        ? null
                                                                                                        : item.label,
                                                                                                )
                                                                                            }
                                                                                            className={`w-full flex items-center gap-3 px-5 py-3 transition-colors duration-100 ${
                                                                                                isSubExpanded
                                                                                                    ? "bg-violet-500/10 text-violet-300"
                                                                                                    : "text-slate-300 hover:bg-white/[0.04]"
                                                                                            }`}
                                                                                        >
                                                                                            <div
                                                                                                className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                                                                                                    isSubExpanded
                                                                                                        ? "bg-violet-500/20 text-violet-400"
                                                                                                        : "bg-white/[0.06] text-slate-500"
                                                                                                }`}
                                                                                            >
                                                                                                <item.icon className="w-4 h-4" />
                                                                                            </div>
                                                                                            <div className="flex-1 min-w-0 text-left">
                                                                                                <p className="text-sm font-medium leading-tight">
                                                                                                    {item.label}
                                                                                                </p>
                                                                                                {item.description && (
                                                                                                    <p className="text-xs text-slate-500 mt-0.5 leading-tight truncate">
                                                                                                        {item.description}
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                            <ChevronDown
                                                                                                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                                                                                                    isSubExpanded
                                                                                                        ? "rotate-180 text-violet-400"
                                                                                                        : "text-slate-600"
                                                                                                }`}
                                                                                            />
                                                                                        </button>

                                                                                        <AnimatePresence initial={false}>
                                                                                            {isSubExpanded && (
                                                                                                <motion.div
                                                                                                    key="sub"
                                                                                                    initial={{
                                                                                                        height: 0,
                                                                                                        opacity: 0,
                                                                                                    }}
                                                                                                    animate={{
                                                                                                        height: "auto",
                                                                                                        opacity: 1,
                                                                                                    }}
                                                                                                    exit={{
                                                                                                        height: 0,
                                                                                                        opacity: 0,
                                                                                                    }}
                                                                                                    transition={{
                                                                                                        duration: 0.18,
                                                                                                    }}
                                                                                                    className="overflow-hidden"
                                                                                                >
                                                                                                    <div className="mx-5 mb-2 border-l-2 border-violet-500/20 pl-3">
                                                                                                        {item.subPanel?.map(
                                                                                                            (card) => {
                                                                                                                const isBlue =
                                                                                                                    card.accentColor ===
                                                                                                                    "blue";
                                                                                                                return (
                                                                                                                    <Link
                                                                                                                        key={
                                                                                                                            card.href
                                                                                                                        }
                                                                                                                        href={
                                                                                                                            card.href
                                                                                                                        }
                                                                                                                        onClick={
                                                                                                                            onClose
                                                                                                                        }
                                                                                                                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.05] transition-colors duration-100 group/sub"
                                                                                                                    >
                                                                                                                        <div
                                                                                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors duration-200 ${
                                                                                                                                isBlue
                                                                                                                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover/sub:bg-blue-600 group-hover/sub:text-white group-hover/sub:border-blue-500"
                                                                                                                                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover/sub:bg-indigo-600 group-hover/sub:text-white group-hover/sub:border-indigo-500"
                                                                                                                            }`}
                                                                                                                        >
                                                                                                                            <card.icon className="w-5 h-5" />
                                                                                                                        </div>
                                                                                                                        <div className="flex-1 min-w-0">
                                                                                                                            <p
                                                                                                                                className={`text-sm font-bold leading-tight ${isBlue ? "text-blue-300" : "text-indigo-300"}`}
                                                                                                                            >
                                                                                                                                {
                                                                                                                                    card.label
                                                                                                                                }
                                                                                                                            </p>
                                                                                                                            <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                                                                                                                                {
                                                                                                                                    card.description
                                                                                                                                }
                                                                                                                            </p>
                                                                                                                        </div>
                                                                                                                        <ChevronRight
                                                                                                                            className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 group-hover/sub:translate-x-0.5 ${isBlue ? "text-blue-500" : "text-indigo-500"}`}
                                                                                                                        />
                                                                                                                    </Link>
                                                                                                                );
                                                                                                            },
                                                                                                        )}
                                                                                                    </div>
                                                                                                </motion.div>
                                                                                            )}
                                                                                        </AnimatePresence>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <Link
                                                                                    key={item.href}
                                                                                    href={item.href}
                                                                                    onClick={onClose}
                                                                                    className={`flex items-center gap-3 px-5 py-3 transition-colors duration-100 ${
                                                                                        itemActive
                                                                                            ? activeRowClass
                                                                                            : "text-slate-300 hover:bg-white/[0.04]"
                                                                                    }`}
                                                                                >
                                                                                    <div
                                                                                        className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                                                                                            itemActive
                                                                                                ? activeIconClass
                                                                                                : "bg-white/[0.06] text-slate-500"
                                                                                        }`}
                                                                                    >
                                                                                        <item.icon className="w-4 h-4" />
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="text-sm font-medium leading-tight">
                                                                                            {item.label}
                                                                                        </p>
                                                                                        {item.description && (
                                                                                            <p className="text-xs text-slate-500 mt-0.5 leading-tight truncate">
                                                                                                {item.description}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                    {itemActive && (
                                                                                        <span
                                                                                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeDotClass}`}
                                                                                        />
                                                                                    )}
                                                                                </Link>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="mx-5 border-t border-white/[0.05]" />
                                    </div>
                                );
                            })}

                            {/* New Dashboard Thống kê tab */}
                            <div>
                                <Link
                                    href="/dashboard/thong-ke"
                                    onClick={onClose}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.04] transition-colors duration-150"
                                >
                                    <span
                                        className={`text-base font-bold ${pathname.startsWith("/dashboard/thong-ke") ? "text-blue-400" : "text-slate-200"}`}
                                    >
                                        Báo cáo content
                                    </span>
                                </Link>
                                <div className="mx-5 border-t border-white/[0.05]" />
                            </div>

                            {/* Settings */}
                            {(allowedMenuIds.includes("settings") || isManagerOrAdmin) && (
                                <>
                                    <Link
                                        href="/dashboard/manager/checklist-settings"
                                        onClick={onClose}
                                        className="flex items-center gap-3 px-5 py-4 text-slate-300 hover:bg-white/[0.04] transition-colors duration-100"
                                    >
                                        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-white/[0.06] text-slate-500">
                                            <Settings className="w-4 h-4" />
                                        </div>
                                        <span className="text-base font-bold">Cài đặt</span>
                                    </Link>
                                    <div className="mx-5 border-t border-white/[0.05]" />
                                </>
                            )}

                            {/* Logout */}
                            <button
                                onClick={() => {
                                    onClose();
                                    onLogout();
                                }}
                                className="w-full flex items-center gap-3 px-5 py-4 text-left text-red-400 hover:bg-red-500/10 transition-colors duration-100"
                            >
                                <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-red-500/10 text-red-400">
                                    <LogOut className="w-4 h-4" />
                                </div>
                                <span className="text-base font-bold">Đăng xuất</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
