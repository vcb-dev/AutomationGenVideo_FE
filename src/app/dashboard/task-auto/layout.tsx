'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ListTodo, Users, Package, Radio, FileText, Target, Settings, LayoutDashboard, Zap, BookUser, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { UserRole } from '@/types/auth'
import { getTeams } from '@/lib/api/task-auto'
import { getMyTeams, getTeamsPageLabel } from '@/lib/task-auto/team-label'

const TEAMS_HREF = '/dashboard/task-auto/teams'

/**
 * Phân quyền nav:
 *  - Không có `roles`     → hiện cho tất cả
 *  - `roles: [...]`       → chỉ hiện khi user có ít nhất 1 trong các role đó
 */
const NAV_ITEMS = [
  {
    href: '/dashboard/task-auto',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/dashboard/task-auto/tasks',
    label: 'Công việc hôm nay',
    icon: ListTodo,
  },
  {
    // Nhãn hiển thị tính theo team của user (getTeamsPageLabel), không dùng label này
    href: TEAMS_HREF,
    label: 'Team của tôi',
    icon: Users,
  },
  {
    href: '/dashboard/task-auto/catalog/products',
    label: 'Kho sản phẩm',
    icon: Package,
  },
  {
    href: '/dashboard/task-auto/catalog/sources',
    label: 'Kho tư liệu dựng video',
    icon: Radio,
  },
  {
    href: '/dashboard/task-auto/content',
    label: 'Video nổi bật',
    icon: FileText,
  },
  {
    // Kho cá nhân — Editor/Leader nhập hàng từ kho chung toàn cục
    href: '/dashboard/task-auto/my-catalog',
    label: 'Kho cá nhân',
    icon: BookUser,
    roles: [UserRole.LEADER, UserRole.MEMBER, UserRole.EDITOR, UserRole.CONTENT],
  },
  {
    href: '/dashboard/task-auto/kpi',
    label: 'KPI và OKR',
    icon: Target,
  },
  {
    href: '/dashboard/task-auto/compliance',
    label: 'Nhiệm vụ còn thiếu',
    icon: ShieldAlert,
  },
  {
    // Cài đặt hệ thống — chỉ Admin/Manager
    href: '/dashboard/task-auto/settings',
    label: 'Cài đặt',
    icon: Settings,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
] satisfies {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
  roles?: UserRole[]
}[]

export default function TaskAutoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const userRoles: UserRole[] = user?.roles ?? []
  const isAdminOrManager = userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.MANAGER)

  // Cùng queryKey với các trang task-auto khác (Team, Kho sản phẩm...) nên dùng chung cache
  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
    enabled: !!user?.id,
  })
  const teamsLabel = getTeamsPageLabel(getMyTeams(teams, user?.id), isAdminOrManager)

  const visibleItems = NAV_ITEMS.filter(
    item => !item.roles || item.roles.some(r => userRoles.includes(r)),
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sub-header — sticky on scroll */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-20">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            {/* Brand mark */}
            <div className="flex items-center gap-2.5 mr-2 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-lg text-slate-800 hidden 2xl:block tracking-tight">Task Auto</span>
            </div>

            {/* Divider */}
            <div className="w-px h-7 bg-gray-200 mr-2 shrink-0 hidden sm:block" />

            {/* Nav links — cuộn ngang khi không đủ chỗ (mobile, laptop hẹp), fade mép phải gợi ý còn item ẩn */}
            <div className="relative flex-1 min-w-0">
              <nav aria-label="Task Auto" className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {visibleItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                  const isTeams = item.href === TEAMS_HREF
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      title={isTeams ? teamsLabel : undefined}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 2xl:px-3 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-150 shrink-0',
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-gray-100'
                      )}
                    >
                      <item.icon aria-hidden="true" className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                      {/* Tên team dài bất thường thì cắt, tên đầy đủ nằm ở title + tiêu đề trang Team */}
                      {isTeams ? <span className="truncate max-w-[12rem]">{teamsLabel}</span> : item.label}
                    </Link>
                  )
                })}
              </nav>
              <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="px-4 sm:px-6 lg:px-8 py-5">
        {children}
      </div>
    </div>
  )
}
