import type { SourceType } from '@/types/task-auto'

export const MARKETS = [
  { value: 'VIETNAM', label: 'Vietnam', activeClass: 'text-red-700 border-red-400' },
  { value: 'GLOBAL', label: 'Global', activeClass: ' text-blue-700 border-blue-400' },
]

export const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  PRODUCT_STOCK: 'bg-indigo-100 text-indigo-700',
  COLLECTED: 'bg-emerald-100 text-emerald-700',
  OUTRO: 'bg-purple-100 text-purple-700',
  WORKSHOP: 'bg-amber-100 text-amber-700',
  HUYK: 'bg-rose-100 text-rose-700',
}

export interface SourceDraft {
  enabled: boolean
  type: SourceType
  name: string
  link: string
  code: string
}

export const defaultSource: SourceDraft = {
  enabled: false, type: 'PRODUCT_STOCK', name: '', link: '', code: '',
}

export const parseMarkets = (market: string | null | undefined): string[] => {
  if (!market) return []
  return market.split(',').map(m => {
    const t = m.trim().toUpperCase()
    return t === 'VN' ? 'VIETNAM' : t
  }).filter(Boolean)
}

export const formatPrice = (price: string | null | undefined): string | null => {
  if (!price) return null
  const n = parseFloat(price)
  if (isNaN(n)) return null
  return new Intl.NumberFormat('vi-VN').format(n) + ' ₫'
}
