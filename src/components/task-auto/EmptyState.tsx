import { type LucideIcon, Inbox } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon = Inbox, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-base font-semibold text-slate-500">{title}</p>
      {description && <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{description}</p>}
    </div>
  )
}
