export const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_TASK:   'Đang dùng',
  USED:      'Đã dùng',
  ARCHIVED:  'Lưu trữ',
}

export const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  IN_TASK:   'bg-blue-100 text-blue-700',
  USED:      'bg-gray-100 text-slate-500',
  ARCHIVED:  'bg-amber-100 text-amber-600',
}

export const MARKET_LABELS: Record<string, string> = {
  VIETNAM:   'VN',
  INDONESIA: 'ID',
  JAPAN:     'JP',
  THAILAND:  'TH',
}

export const MARKET_COLORS: Record<string, string> = {
  VIETNAM:   'bg-emerald-100 text-emerald-700',
  INDONESIA: 'bg-amber-100 text-amber-700',
  JAPAN:     'bg-rose-100 text-rose-700',
  THAILAND:  'bg-sky-100 text-sky-700',
}
