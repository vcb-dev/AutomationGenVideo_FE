'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ListTodo, Users, Package, Target, Settings, LayoutDashboard, Zap, BookUser } from 'lucide-react'
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
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 h-20">
            {/* Brand mark */}
            <div className="flex items-center gap-3 mr-2 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-lg text-slate-800 hidden sm:block tracking-tight">Task Auto</span>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200 mr-2 shrink-0 hidden sm:block" />

            {/* Nav links */}
            <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
              {visibleItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-5 py-3 rounded-xl text-base font-medium whitespace-nowrap transition-all duration-150',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 font-semibold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </div>
    </div>
  )
}
