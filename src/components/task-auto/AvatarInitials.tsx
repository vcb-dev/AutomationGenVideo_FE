import { cn } from '@/lib/utils'
import { getInitials } from './helpers'

interface Props {
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const SIZE = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
}

const COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
]

function nameToColorIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return hash % COLORS.length
}

export function AvatarInitials({ name, size = 'sm' }: Props) {
  const colorClass = name ? COLORS[nameToColorIndex(name)] : COLORS[0]
  return (
    <span className={cn(
      'inline-flex items-center justify-center rounded-full font-bold flex-shrink-0',
      SIZE[size],
      colorClass,
    )}>
      {getInitials(name)}
    </span>
  )
}
