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

export function AvatarInitials({ name, size = 'sm' }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold flex-shrink-0',
      SIZE[size]
    )}>
      {getInitials(name)}
    </span>
  )
}
