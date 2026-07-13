'use client'

import { AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { SettingsCard } from './components/SettingsCard'
import { RunsTable } from './components/RunsTable'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const canEdit = user?.roles?.some(r => r === 'ADMIN' || r === 'MANAGER') ?? false

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Cài đặt Auto-Assign</h1>
        <p className="text-slate-500 text-base mt-1">Cấu hình lịch phân công tự động và xem lịch sử</p>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Bạn chỉ có quyền xem. Chỉ <strong>ADMIN</strong> hoặc <strong>MANAGER</strong> mới có thể chỉnh sửa cài đặt.</span>
        </div>
      )}

      <SettingsCard canEdit={canEdit} />
      <RunsTable />
    </div>
  )
}
