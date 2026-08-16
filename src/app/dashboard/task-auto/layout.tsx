'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ListTodo, Users, Package, FileText, Target, Settings, LayoutDashboard, Zap, BookUser } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { UserRole } from '@/types/auth'

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
    label: 'Nhiệm vụ',
    icon: ListTodo,
  },
  {
    href: '/dashboard/task-auto/teams',
    label: 'Đội nhóm',
    icon: Users,
  },
  {
    href: '/dashboard/task-auto/catalog',
    label: 'Danh mục',
    icon: Package,
  },
  {
    href: '/dashboard/task-auto/content',
    label: 'Content',
    icon: FileText,
  },
  {
    // Kho cá nhân — Editor/Leader nhập hàng từ danh mục toàn cục
    href: '/dashboard/task-auto/my-catalog',
    label: 'Kho cá nhân',
    icon: BookUser,
    roles: [UserRole.LEADER, UserRole.MEMBER, UserRole.EDITOR, UserRole.CONTENT],
  },
  {
    href: '/dashboard/task-auto/kpi',
    label: 'KPI',
    icon: Target,
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
              <span className="font-extrabold text-lg text-slate-800 hidden sm:block tracking-tight">Task Auto</span>
            </div>

            {/* Divider */}
            <div className="w-px h-7 bg-gray-200 mr-2 shrink-0 hidden sm:block" />

            {/* Nav links — cuộn ngang trên mobile, fade mép phải gợi ý còn item ẩn */}
            <div className="relative flex-1 min-w-0">
              <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {visibleItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-150 shrink-0',
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-gray-100'
                      )}
                    >
                      <item.icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
              <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
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
