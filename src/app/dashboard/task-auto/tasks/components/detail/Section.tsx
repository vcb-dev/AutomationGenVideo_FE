'use client'

import { cn } from '@/lib/utils'

interface Props {
  icon: React.ReactNode
  title: string
  iconColor?: string
  bgColor?: string
  children: React.ReactNode
  className?: string
}

export function Section({ icon, title, iconColor = 'text-indigo-500', bgColor = 'bg-indigo-50', children, className }: Props) {
  return (
    <div className={cn("border border-gray-200 rounded-2xl overflow-hidden bg-white flex flex-col", className)}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bgColor)}>
          <span className={iconColor}>{icon}</span>
        </div>
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      </div>
      {children}
    </div>
  )
}
