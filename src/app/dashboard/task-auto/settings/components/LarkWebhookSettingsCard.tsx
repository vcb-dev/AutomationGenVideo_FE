'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Send, Link2, Lock, Loader2 } from 'lucide-react'
import { getLarkWebhookGlobalSetting, updateLarkWebhookGlobalSetting } from '@/lib/api/task-auto'

const inputClass = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-50 transition-colors'

export function LarkWebhookSettingsCard({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient()

  const { data: setting, isLoading } = useQuery({
    queryKey: ['task-auto', 'lark-webhook-setting'],
    queryFn: getLarkWebhookGlobalSetting,
  })

  const [url, setUrl] = useState('')
  // Ô secret luôn bắt đầu rỗng — BE là write-only (không trả secret thật), rỗng khi lưu nghĩa là
  // "giữ nguyên secret hiện có", không phải "xoá".
  const [secret, setSecret] = useState('')

  useEffect(() => {
    if (setting) setUrl(setting.webhook_url ?? '')
  }, [setting])

  const updateMut = useMutation({
    mutationFn: (body: { webhook_url?: string | null; webhook_secret?: string | null }) =>
      updateLarkWebhookGlobalSetting(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'lark-webhook-setting'] })
      setSecret('')
      toast.success('Đã lưu webhook Lark chung')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể lưu — kiểm tra lại URL'),
  })

  const handleSave = () => {
    const trimmedUrl = url.trim()
    const trimmedSecret = secret.trim()
    updateMut.mutate({
      webhook_url: trimmedUrl || null,
      ...(trimmedSecret ? { webhook_secret: trimmedSecret } : {}),
    })
  }

  const handleClearSecret = () => {
    updateMut.mutate({ webhook_url: (setting?.webhook_url ?? url) || null, webhook_secret: null })
  }

  if (isLoading) return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 flex items-center justify-center h-32">
      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
    </div>
  )

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
      <div className="flex items-center gap-4 px-7 py-6 border-b border-gray-100">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Send className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-xl">Webhook Lark chung</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Nhận mọi thông báo "task/content cần duyệt" của toàn hệ thống — mỗi team có thể cấu
            hình thêm webhook riêng ở trang Đội nhóm để chỉ nhận thông báo của team mình.
          </p>
        </div>
      </div>

      <div className="p-7 space-y-5">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
            <Link2 className="w-4 h-4 text-slate-400" /> Webhook URL
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={!canEdit}
            placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..."
            className={inputClass}
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
            <Lock className="w-4 h-4 text-slate-400" /> Secret Key
          </label>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            disabled={!canEdit}
            placeholder={setting?.webhook_secret_set ? 'Để trống = giữ nguyên secret hiện có' : 'Chỉ cần nếu bot bật "Ký số bảo mật" trong cài đặt Lark'}
            className={inputClass}
          />
          <div className="flex items-center gap-3 mt-1.5">
            {setting?.webhook_secret_set ? (
              <span className="text-xs text-emerald-600 font-medium">Đã đặt secret</span>
            ) : (
              <span className="text-xs text-slate-400">Chưa đặt secret</span>
            )}
            {canEdit && setting?.webhook_secret_set && (
              <button
                onClick={handleClearSecret}
                disabled={updateMut.isPending}
                className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50 transition-colors"
              >
                Xoá secret đã đặt
              </button>
            )}
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-3 px-7 py-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button
            onClick={handleSave}
            disabled={updateMut.isPending}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {updateMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Lưu webhook
          </button>
        </div>
      )}
    </div>
  )
}
