import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Nhãn tên team của 1 dòng dữ liệu — dùng khi xem kho của "Tất cả đội nhóm" để biết dòng đó thuộc team nào. */
export function TeamTag({ name, className }: { name?: string; className?: string }) {
  if (!name) return null
  return (
    <span
      title={name}
      className={cn(
        'inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold',
        className,
      )}
    >
      <Users className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{name}</span>
    </span>
  )
}
