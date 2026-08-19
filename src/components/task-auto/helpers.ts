export function getInitials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function formatDateTime(dt?: string | null): string {
  if (!dt) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dt))
}

export function formatDate(dt?: string | null): string {
  if (!dt) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(dt))
}

export function isOverdue(deadline?: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

// Chuyển ISO deadline (UTC) sang chuỗi cho <input type="datetime-local"> theo giờ VN
// (UTC+7) — dùng formatToParts với timeZone cố định để không phụ thuộc múi giờ trình duyệt.
export function toVNDatetimeLocalInput(dt?: string | null): string {
  if (!dt) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(dt))
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function calcDuration(start: string, end: string | null): string {
  if (!end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return '—'
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return `${mins}m ${rem}s`
}
