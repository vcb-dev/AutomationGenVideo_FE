'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Settings, Zap, Clock, Globe, Calendar, Power, Loader2, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/task-auto'
import { formatDateTime } from '@/components/task-auto/helpers'
import {
  getAutoAssignSettings,
  updateAutoAssignSettings,
  triggerAutoAssign,
} from '@/lib/api/task-auto'
import { AutoAssignSetting } from '@/types/task-auto'

function ToggleSwitch({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <label className={cn('relative inline-flex items-center cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} className="sr-only peer" disabled={disabled} />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
    </label>
  )
}

export function SettingsCard({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient()
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['task-auto', 'auto-assign-settings'],
    queryFn: getAutoAssignSettings,
  })

  const [form, setForm] = useState<Partial<AutoAssignSetting>>({
    schedule_time: '08:00', timezone: 'Asia/Ho_Chi_Minh', weekend_enabled: false, is_active: false, default_cooldown_days: 5,
  })

  useEffect(() => {
    if (settings) setForm({
      schedule_time: settings.schedule_time,
      timezone: settings.timezone,
      weekend_enabled: settings.weekend_enabled,
      is_active: settings.is_active,
      default_cooldown_days: settings.default_cooldown_days,
    })
  }, [settings])

  const updateMut = useMutation({
    mutationFn: (body: Partial<AutoAssignSetting>) => updateAutoAssignSettings(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'auto-assign-settings'] }); toast.success('Đã lưu cài đặt') },
    onError: () => toast.error('Không thể lưu cài đặt'),
  })

  const triggerMut = useMutation({
    mutationFn: triggerAutoAssign,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'assignment-runs'] })
      setShowConfirm(false)
      if (res.assigned > 0) {
        toast.success(`Đã phân công ${res.assigned} task thành công`)
      } else {
        toast('Không có task nào được tạo (đủ KPI hoặc không đủ content/sản phẩm)', { icon: 'ℹ️' })
      }
    },
    onError: () => { toast.error('Không thể kích hoạt phân công — hãy kiểm tra BE server'); setShowConfirm(false) },
  })

  if (isLoading) return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
    </div>
  )

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4 px-7 py-6 border-b border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Settings className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-xl">Cài đặt tự động phân công</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {settings?.updated_at ? `Cập nhật lần cuối: ${formatDateTime(settings.updated_at)}` : 'Chưa có thông tin cập nhật'}
            </p>
          </div>
        </div>

        <div className="p-7 space-y-6">
          {/* Main active toggle */}
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <Power className={cn('w-5 h-5', form.is_active ? 'text-indigo-600' : 'text-slate-400')} />
              <div>
                <p className="font-semibold text-slate-800">Kích hoạt hệ thống</p>
                <p className="text-sm text-slate-500 mt-0.5">Bật/tắt toàn bộ tính năng tự động phân công</p>
              </div>
            </div>
            <ToggleSwitch checked={form.is_active ?? false} onChange={v => setForm(f => ({ ...f, is_active: v }))} disabled={!canEdit} />
          </div>

          {/* Settings fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
                <Clock className="w-4 h-4 text-slate-400" /> Thời gian chạy (HH:MM)
              </label>
              <input type="time" value={form.schedule_time ?? '08:00'} onChange={e => setForm(f => ({ ...f, schedule_time: e.target.value }))} disabled={!canEdit}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-50 transition-colors" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
                <Globe className="w-4 h-4 text-slate-400" /> Múi giờ
              </label>
              <input type="text" value={form.timezone ?? 'Asia/Ho_Chi_Minh'} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} disabled={!canEdit} placeholder="Asia/Ho_Chi_Minh"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-50 transition-colors" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
                <Timer className="w-4 h-4 text-slate-400" /> Cooldown mặc định (ngày)
              </label>
              <input type="number" min={0} value={form.default_cooldown_days ?? 5}
                onChange={e => setForm(f => ({ ...f, default_cooldown_days: e.target.value === '' ? 0 : Number(e.target.value) }))}
                disabled={!canEdit}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-50 transition-colors" />
              <p className="text-xs text-slate-400 mt-1">Áp dụng cho sản phẩm chưa tự set cooldown riêng</p>
            </div>
          </div>

          {/* Weekend toggle */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Chạy vào cuối tuần</p>
                <p className="text-sm text-slate-500">Bật để phân công tự động vào Thứ 7 và Chủ nhật (KPI các ngày đều như nhau).</p>
              </div>
            </div>
            <ToggleSwitch checked={form.weekend_enabled ?? false} onChange={v => setForm(f => ({ ...f, weekend_enabled: v }))} disabled={!canEdit} />
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-3 px-7 py-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <button onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-60">
              {updateMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Lưu cài đặt
            </button>
            <button onClick={() => setShowConfirm(true)} disabled={triggerMut.isPending}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-60">
              {triggerMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-500" />}
              Chạy ngay
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog open={showConfirm} onCancel={() => setShowConfirm(false)} onConfirm={() => triggerMut.mutate()}
        title="Xác nhận chạy thủ công" message="Bạn có chắc muốn kích hoạt phân công tự động ngay bây giờ?" confirmLabel="Chạy ngay" isLoading={triggerMut.isPending} />
    </>
  )
}
