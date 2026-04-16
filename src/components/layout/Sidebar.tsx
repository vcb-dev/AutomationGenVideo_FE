'use client';

import Image from "next/image";
import { useState, useMemo, memo, useCallback, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Search,
  Settings,
  LogOut,
  BarChart3,
  Facebook,
  Instagram,
  Music2,
  Music,
  LayoutGrid,
  Pin,
  Users,
  Activity,
  BookOpen,
  LayoutDashboard,
  Layout,
  User,
  FileText,
  ClipboardList,
  CheckSquare,
  Bookmark,
  Languages,
} from 'lucide-react';
import { UserRole } from '@/types/auth';
import { useAuthStore } from '@/store/auth-store';

interface SidebarProps {
  menuItems?: any[];
  user: any;
  onLogout: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
}

function SmartSidebar({ user, onLogout, isPinned, onTogglePin }: SidebarProps) {
  const { token } = useAuthStore();
  const [allowedMenuIds, setAllowedMenuIds] = useState<string[]>([]);
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

  // Fetch dynamic permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${apiBaseUrl}/role-permissions/my-tabs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setAllowedMenuIds(data);
        }
      } catch (err) {
        console.error("Failed to fetch sidebar permissions", err);
      }
    };
    fetchPermissions();
  }, [token, apiBaseUrl]);

  return (
    <Suspense fallback={<div className="w-[80px] bg-[#0f172a]" />}>
      <SidebarContent 
        user={user} 
        onLogout={onLogout} 
        isPinned={isPinned} 
        onTogglePin={onTogglePin} 
        allowedMenuIds={allowedMenuIds}
      />
    </Suspense>
  );
}

function SidebarContent({ 
  user, 
  onLogout, 
  isPinned, 
  onTogglePin,
  allowedMenuIds
}: any) {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get('tab');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const isManagement = user?.roles?.some((r: any) =>
    [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER].includes(r)
  );

  const isManagerOrAdmin = user?.roles?.some((r: any) =>
    [UserRole.ADMIN, UserRole.MANAGER].includes(r)
  );

  const isManagerRole = user?.roles?.includes(UserRole.MANAGER);
  const isAdminRole = user?.roles?.includes(UserRole.ADMIN);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Directly derive activePlatform
  const activePlatform = useMemo(() => {
    const path = pathname?.toLowerCase() || '';
    if (path === '/dashboard/manager') {
      return 'dashboard-general';
    } else if (path.startsWith('/dashboard/manager/user-activity') || path.startsWith('/dashboard/editor-management') || path.startsWith('/dashboard/hieu-suat')) {
      return 'user-management';
    } else if (
      pathname.startsWith('/dashboard/facebook') ||
      pathname.startsWith('/dashboard/instagram') ||
      pathname.startsWith('/dashboard/tiktok') ||
      pathname.startsWith('/dashboard/douyin') ||
      pathname.startsWith('/dashboard/xiaohongshu') ||
      pathname.startsWith('/dashboard/youtube') ||
      pathname.startsWith('/dashboard/ai') ||
      pathname.startsWith('/dashboard/search-video') ||
      pathname.startsWith('/dashboard/channel-analysis')
    ) {
      return 'social-discovery';
    }
    return isManagement ? 'user-management' : 'social-discovery';
  }, [pathname, isManagement]);

  // Platforms configuration
  const platforms = useMemo(() => {
    const items = [
      ...(isManagerRole ? [
        {
          id: 'dashboard-general',
          icon: LayoutGrid,
          label: 'Dashboard Tổng',
          menus: [
            {
              section: 'TỔNG QUAN',
              items: [
                { label: 'Trang chủ Admin', href: '/dashboard/manager', icon: LayoutGrid },
              ]
            }
          ]
        }
      ] : []),
      {
        id: 'user-management',
        icon: Users,
        label: 'VCB Portal',
        menus: [
          {
            section: 'HỆ THỐNG',
            items: [
              { label: 'Hiệu suất', href: '/dashboard/manager/user-activity?tab=performance', icon: Activity },
              ...(isManagerRole ? [
                { label: 'Tổng quan', href: '/dashboard/manager/user-activity?tab=dashboard', icon: LayoutDashboard },
              ] : []),
              { label: 'Bảng xếp hạng', href: '/dashboard/manager/user-activity?tab=ranking', icon: Layout },
              { label: 'Tiến độ', href: '/dashboard/manager/user-activity?tab=personal', icon: User },
              ...(isAdminRole
                ? []
                : [{ label: 'Báo cáo', href: '/dashboard/manager/user-activity?tab=daily_report', icon: FileText }]),
              { label: isAdminRole ? 'Xem báo cáo' : 'Checklist', href: '/dashboard/manager/user-activity?tab=daily_checklist', icon: CheckSquare },
              { label: isAdminRole ? 'Duyệt vấn đề & win' : 'Vấn đề & Win', href: '/dashboard/manager/user-activity?tab=daily_outstanding', icon: ClipboardList },
            ]
          }
        ]
      },
      {
        id: 'social-discovery',
        icon: Search,
        label: 'Khám phá Video',
        menus: [
          {
            section: 'PHÂN TÍCH',
            items: [
              { label: 'Channels', href: '/dashboard/facebook/channels', icon: Users },
              { label: 'Phân tích kênh', href: '/dashboard/channel-analysis', icon: BarChart3 },
            ]
          },
          {
            section: 'KHÁM PHÁ',
            items: [
              { label: 'Tìm kiếm Video (Hub)', href: '/dashboard/search-video', icon: Search },
            ]
          },
          {
            section: 'BỘ SƯU TẬP',
            items: [
              { label: 'Bộ sưu tập', href: '/dashboard/video-library', icon: Bookmark },
              { label: 'Dịch Content', href: '/dashboard/content/generate?mode=translate-only', icon: Languages },
            ]
          }
        ]
      }
    ];
    return items;
  }, [user?.roles, isManagement, isManagerOrAdmin, isManagerRole, isAdminRole]);

  const currentPlatform = useMemo(() => platforms.find(p => p.id === activePlatform), [platforms, activePlatform]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsSidebarHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      // Keep opened only if cursor is still hovering sidebar area.
      const isStillHovering = sidebarRef.current?.matches(':hover');
      if (!isStillHovering) {
        setIsSidebarHovered(false);
      }
    }, 150);
  }, []);

  const handleLinkClick = useCallback(() => {
    // Prevent stale "hover-open" state after fast navigation transitions.
    if (!isPinned) {
      setIsSidebarHovered(false);
    }
  }, [isPinned]);

  useEffect(() => {
    // Route changed: collapse hover drawer unless user explicitly pinned it.
    if (!isPinned) {
      setIsSidebarHovered(false);
    }
  }, [pathname, currentTab, isPinned]);

  const isDrawerVisible = activePlatform && (isSidebarHovered || isPinned);

  return (
    <>
      <aside
        ref={sidebarRef}
        className="fixed top-0 left-0 h-screen z-[1000] flex transition-[width] duration-200 ease-in-out"
        style={{ width: isDrawerVisible ? '320px' : '80px' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="w-[80px] h-full bg-[#0f172a] border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-20 relative"
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden mb-4 cursor-pointer border-2 border-slate-700 shadow-lg relative group">
            <Image
              src="/logo-vcb.jfif"
              alt="VCB"
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-110"
              loading="eager"
             width={0} height={0} sizes="100vw" unoptimized/>
          </div>

          <div className="flex-1 flex flex-col gap-4 w-full px-4">
            {platforms.map(p => (
              <Link
                key={p.id}
                href={p.menus?.[0]?.items?.[0]?.href || '#'}
                prefetch={true}
                onClick={handleLinkClick}
                className={`w-full aspect-square rounded-xl flex items-center justify-center transition-colors duration-150 ease-out relative
                        ${activePlatform === p.id
                    ? 'bg-blue-600/10 text-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <p.icon className="w-6 h-6" />
                {activePlatform === p.id && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                )}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-4 w-full px-4 mt-auto">
            {allowedMenuIds.includes('settings') || isManagerOrAdmin ? (
              <Link
                href="/dashboard/manager/checklist-settings"
                className="w-full aspect-square rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors duration-150 ease-out"
                title="Cài đặt hệ thống"
              >
                <Settings className="w-5 h-5" />
              </Link>
            ) : null}

            <button
              onClick={onLogout}
              className="w-full aspect-square rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-900/20 hover:text-red-500 mt-2 transition-colors duration-150 ease-out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          className="h-full bg-[#0b1121] border-r border-slate-800 flex flex-col overflow-hidden"
          style={{
            width: '240px',
            flexShrink: 0,
            opacity: isDrawerVisible ? 1 : 0,
            clipPath: isDrawerVisible ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
            pointerEvents: isDrawerVisible ? 'auto' : 'none',
            willChange: 'clip-path, opacity',
            transition: prefersReducedMotion
              ? 'none'
              : 'clip-path 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease',
          }}
        >
          <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800 whitespace-nowrap flex-shrink-0">
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                {currentPlatform?.label}
                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Beta</span>
              </h2>
              <p className="text-slate-500 text-xs mt-1">Video Intelligence</p>
            </div>
            <button
              onClick={onTogglePin}
              className={`p-1.5 rounded-lg transition-colors duration-150 ease-out ${isPinned ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-700'}`}
            >
              <Pin className={`w-4 h-4 transition-transform duration-200 ${isPinned ? 'fill-current rotate-45' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-4 whitespace-nowrap custom-scrollbar">
            {currentPlatform?.menus.map((section, idx) => (
              <div key={idx} className="mb-8">
                <h3 className="text-xs font-semibold text-slate-500 mb-4 px-2 tracking-wider">{section.section}</h3>
                <div className="space-y-1">
                  {section.items.map((item: any) => {
                    const itemUrl = item.href.split('?')[0];
                    const itemTab = item.href.indexOf('tab=') !== -1 ? item.href.split('tab=')[1] : null;
                    const isActive = itemTab 
                      ? (pathname === itemUrl && currentTab === itemTab)
                      : (pathname === itemUrl && !currentTab);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        onClick={() => {
                            handleLinkClick();
                            if (item.href.includes("tab=daily_report")) {
                                window.dispatchEvent(new CustomEvent("resetUserActivityDailyReport", { detail: { type: item.href.includes("report=monthly") ? "monthly" : item.href.includes("report=daily") ? "daily" : "select" } }));
                            }
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ease-out text-sm font-medium
                                             ${isActive
                            ? 'text-white bg-slate-800 shadow-lg shadow-slate-900/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                          }`}
                      >
                        <item.icon className={`w-4 h-4 transition-colors duration-150 ${isActive ? 'text-blue-500' : 'text-slate-500'}`} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Quick action (do not touch menu structure above) */}
            {/* Quick action removed: Channel Analytics is now main menu */}
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(SmartSidebar);
