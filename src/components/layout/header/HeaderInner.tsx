"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Settings, LogOut, Menu, X, Video } from "lucide-react";
import { UserRole } from "@/types/auth";
import { HeaderProps } from "./types";
import { useNavMenus } from "./use-nav-menus";
import UserBlock from "./UserBlock";
import NavDropdown from "./NavDropdown";
import MobileDrawer from "./MobileDrawer";
import NotificationBell from "@/components/social/NotificationBell";

export default function HeaderInner({ user, onLogout, allowedMenuIds }: HeaderProps) {
    const pathname = usePathname() || "";
    const searchParams = useSearchParams();
    const currentTab = searchParams?.get("tab");

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [subPanelKey, setSubPanelKey] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);
    const [mobileSubItemKey, setMobileSubItemKey] = useState<string | null>(null);

    const headerRef = useRef<HTMLElement>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isManagerOrAdmin = user?.roles?.some((r) =>
        [UserRole.ADMIN, UserRole.MANAGER].includes(r),
    );
    const isManagement = user?.roles?.some((r) =>
        [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER].includes(r),
    );
    const isAdmin = user?.roles?.includes(UserRole.ADMIN);
    const isLeader = user?.roles?.includes(UserRole.LEADER);
    const isManager = user?.roles?.includes(UserRole.MANAGER);

    const userInitial = user?.full_name
        ? (user.full_name.trim().split(" ").pop()?.[0]?.toUpperCase() ?? "?")
        : "?";

    const navMenus = useNavMenus(!!isManagerOrAdmin, !!isManagement, {
        isAdmin: !!isAdmin,
        isLeader: !!isLeader,
        isManager: !!isManager,
    });

    // allowedMenuIds chứa tab-level permissions, không phải nav menu IDs.
    // Hiển thị tất cả nav menus, role-based visibility đã được xử lý bởi isManagerOrAdmin / isManagement.
    const allowedNavMenus = navMenus;

    const isMenuActive = useCallback(
        (menu: (typeof navMenus)[0]) =>
            menu.activePathPrefixes.some((prefix) => pathname.startsWith(prefix)),
        [pathname],
    );

    const isItemActive = useCallback(
        (href: string) => {
            const [itemPath, itemQuery] = href.split("?");
            const itemTab = itemQuery ? new URLSearchParams(itemQuery).get("tab") : null;
            if (itemTab) return pathname === itemPath && currentTab === itemTab;
            return pathname === itemPath && !currentTab;
        },
        [pathname, currentTab],
    );

    const handleMenuEnter = useCallback((id: string) => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setOpenMenuId(id);
    }, []);

    const handleMenuLeave = useCallback(() => {
        closeTimeoutRef.current = setTimeout(() => setOpenMenuId(null), 150);
    }, []);

    const handleDropdownEnter = useCallback(() => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    }, []);

    /* Reset menus on route change */
    useEffect(() => {
        setOpenMenuId(null);
        setSubPanelKey(null);
        setMobileMenuOpen(false);
        setMobileSubItemKey(null);
    }, [pathname, currentTab]);

    /* Lock body scroll when mobile drawer is open */
    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileMenuOpen]);

    /* Close dropdown when clicking outside */
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    /* Cleanup timeout on unmount */
    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        };
    }, []);

    return (
        <>
            <header
                ref={headerRef}
                className="sticky top-0 z-[1000] bg-[#0d1424] border-b border-white/[0.06] shadow-lg shadow-black/20"
            >
                <div className="flex items-center h-16 px-3 gap-0">
                    {/* Mobile: Hamburger / X */}
                    <button
                        className="md:hidden w-9 h-9 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/[0.07] transition-colors duration-150 flex-shrink-0"
                        onClick={() => setMobileMenuOpen((v) => !v)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    {/* Logo */}
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 pl-1 pr-3 flex-shrink-0 group
                            absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
                    >
                        <div className="w-8 h-8 rounded-md overflow-hidden ring-1 ring-white/10 shadow flex-shrink-0">
                            <Image
                                src="/logo-vcb.png"
                                alt="VCB"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover transition-opacity duration-150 group-hover:opacity-90"
                            />
                        </div>
                        <span className="text-sm font-bold text-white tracking-wide leading-none hidden sm:block">
                            VCB<span className="text-blue-400 font-bold"> Studio</span>
                        </span>
                    </Link>

                    {/* Divider (desktop) */}
                    <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0 hidden md:block" />

                    {/* Nav menus (desktop) */}
                    <nav className="hidden md:flex items-stretch h-full gap-0.5 px-1">
                        {allowedNavMenus.map((menu) => (
                            <NavDropdown
                                key={menu.id}
                                menu={menu}
                                isActive={isMenuActive(menu)}
                                isOpen={openMenuId === menu.id}
                                subPanelKey={subPanelKey}
                                onMenuEnter={() => handleMenuEnter(menu.id)}
                                onMenuLeave={handleMenuLeave}
                                onDropdownEnter={handleDropdownEnter}
                                onDropdownLeave={handleMenuLeave}
                                onSubPanelKeyChange={setSubPanelKey}
                                isItemActive={isItemActive}
                            />
                        ))}

                    </nav>

                    {/* Portal slot */}
                    <div id="navbar-portal-root" className="flex-1 flex items-center px-2 overflow-hidden" />

                    {/* Right section */}
                    <div className="flex items-center gap-1 pl-2 flex-shrink-0">
                        {/* Settings (desktop) */}
                        {(allowedMenuIds.includes("settings") || isManagerOrAdmin) && (
                            <Link
                                href="/dashboard/manager/checklist-settings"
                                title="Cài đặt hệ thống"
                                className="hidden md:flex w-8 h-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.07] transition-colors duration-150"
                            >
                                <Settings className="w-4 h-4" />
                            </Link>
                        )}

                        {/* Notification Bell */}
                        <div className="hidden md:flex items-center">
                            <NotificationBell />
                        </div>

                        <div className="hidden md:block w-px h-5 bg-white/10 mx-1.5" />

                        {/* User block */}
                        <div className={mobileMenuOpen ? "hidden md:flex" : "flex"}>
                            <UserBlock user={user} userInitial={userInitial} />
                        </div>

                        {/* Logout */}
                        <button
                            onClick={onLogout}
                            title="Đăng xuất"
                            className={`w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150 ml-1 ${mobileMenuOpen ? "hidden md:flex" : "flex"}`}
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer */}
            <MobileDrawer
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                user={user}
                userInitial={userInitial}
                onLogout={onLogout}
                navMenus={allowedNavMenus}
                isManagerOrAdmin={!!isManagerOrAdmin}
                allowedMenuIds={allowedMenuIds}
                isMenuActive={isMenuActive}
                isItemActive={isItemActive}
                mobileExpandedId={mobileExpandedId}
                setMobileExpandedId={setMobileExpandedId}
                mobileSubItemKey={mobileSubItemKey}
                setMobileSubItemKey={setMobileSubItemKey}
            />
        </>
    );
}
