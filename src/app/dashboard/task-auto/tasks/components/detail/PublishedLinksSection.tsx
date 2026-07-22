'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Link2, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateTaskPublishedLinks } from '@/lib/api/task-auto'
import type { PublishedLink } from '@/types/task-auto'
import { Section } from './Section'

// Icon thương hiệu thật cho các nền tảng phổ biến (quick-add) — path lấy từ
// src/app/dashboard/social/channels/page.tsx (P_STATIC) để đồng bộ hình ảnh trong toàn app.
const BRAND_SVGS: Record<string, { label: string; color: string; path: string }> = {
  FACEBOOK: {
    label: 'Facebook',
    color: '#1877F2',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  INSTAGRAM: {
    label: 'Instagram',
    color: '#E1306C',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  },
  TIKTOK: {
    label: 'TikTok',
    color: '#010101',
    path: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.78a4.85 4.85 0 01-1.07-.09z',
  },
  YOUTUBE: {
    label: 'YouTube',
    color: '#FF0000',
    path: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
}
const QUICK_PLATFORMS = Object.keys(BRAND_SVGS) as (keyof typeof BRAND_SVGS)[]

function BrandIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d={path} />
    </svg>
  )
}

function getPlatformMeta(platform: string) {
  const brand = BRAND_SVGS[platform.trim().toUpperCase()]
  if (brand) {
    return { label: brand.label, color: brand.color, icon: <BrandIcon path={brand.path} className="w-3.5 h-3.5 text-white" /> }
  }
  return { label: platform, color: '#64748b', icon: <Link2 className="w-3.5 h-3.5 text-white" /> }
}

function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return v
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

interface Props {
  taskId: string
  publishedLinks?: PublishedLink[] | null
  canEdit: boolean
}

export function PublishedLinksSection({ taskId, publishedLinks, canEdit }: Props) {
  const qc = useQueryClient()
  const links = publishedLinks ?? []

  const [formOpen, setFormOpen] = useState(false)
  const [draftPlatform, setDraftPlatform] = useState('')
  const [draftUrl, setDraftUrl] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPlatform, setEditPlatform] = useState('')
  const [editUrl, setEditUrl] = useState('')

  const mutation = useMutation({
    mutationFn: (next: PublishedLink[]) => updateTaskPublishedLinks(taskId, next),
    onSuccess: () => {
      toast.success('Đã cập nhật link bài đăng')
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', taskId] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Cập nhật link thất bại'),
  })

  const resetForm = () => { setFormOpen(false); setDraftPlatform(''); setDraftUrl('') }

  const handleAdd = () => {
    const platform = draftPlatform.trim()
    const url = normalizeUrl(draftUrl)
    if (!platform) return toast.error('Nhập tên nền tảng')
    if (!url) return toast.error('Nhập link bài đăng')
    mutation.mutate([...links, { id: crypto.randomUUID(), platform, url }], { onSuccess: resetForm })
  }

  const handleSaveEdit = (id: string) => {
    const platform = editPlatform.trim()
    const url = normalizeUrl(editUrl)
    if (!platform) return toast.error('Nhập tên nền tảng')
    if (!url) return toast.error('Nhập link bài đăng')
    const next = links.map(l => l.id === id ? { ...l, platform, url } : l)
    mutation.mutate(next, { onSuccess: () => setEditingId(null) })
  }

  const handleDelete = (id: string) => {
    mutation.mutate(links.filter(l => l.id !== id))
  }

  return (
    <Section icon={<Link2 className="w-4 h-4" />} title="Link bài đăng" bgColor="bg-emerald-50" iconColor="text-emerald-600">
      <div className="p-4 space-y-2">
        {links.length === 0 && !formOpen && (
          <p className="text-sm text-gray-400 italic">Chưa có link bài đăng nào được nộp</p>
        )}

        {links.map(link => {
          const meta = getPlatformMeta(link.platform)
          const isEditing = editingId === link.id
          return (
            <div key={link.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50/60">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: meta.color }}>
                {meta.icon}
              </div>

              {isEditing ? (
                <>
                  <input
                    value={editPlatform}
                    onChange={e => setEditPlatform(e.target.value)}
                    placeholder="Nền tảng"
                    className="w-28 shrink-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 ring-indigo-500/20 outline-none"
                  />
                  <input
                    value={editUrl}
                    onChange={e => setEditUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 ring-indigo-500/20 outline-none"
                  />
                  <button
                    onClick={() => handleSaveEdit(link.id)}
                    disabled={mutation.isPending}
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 shrink-0 transition-colors"
                  >
                    {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 shrink-0 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide leading-none mb-1">{meta.label}</p>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2 truncate block"
                    >
                      {link.url}
                    </a>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingId(link.id); setEditPlatform(link.platform); setEditUrl(link.url) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                        title="Sửa link"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        disabled={mutation.isPending}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors"
                        title="Xoá link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}

        {canEdit && (
          formOpen ? (
            <div className="border border-indigo-200 rounded-xl bg-indigo-50/30 p-3 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PLATFORMS.map(key => {
                  const p = BRAND_SVGS[key]
                  const selected = draftPlatform === p.label
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDraftPlatform(p.label)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
                        selected ? 'border-indigo-400 bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: p.color }}>
                        <BrandIcon path={p.path} className="w-2.5 h-2.5 text-white" />
                      </span>
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <input
                value={draftPlatform}
                onChange={e => setDraftPlatform(e.target.value)}
                placeholder="Tên nền tảng (vd Facebook, Threads, Zalo...)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 ring-indigo-500/20 outline-none"
              />
              <input
                value={draftUrl}
                onChange={e => setDraftUrl(e.target.value)}
                placeholder="Dán link bài đăng..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 ring-indigo-500/20 outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdd}
                  disabled={mutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Nộp link
                </button>
                <button onClick={resetForm} className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                  Huỷ
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setFormOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-indigo-600 border border-dashed border-indigo-300 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nộp link bài đăng
            </button>
          )
        )}
      </div>
    </Section>
  )
}
