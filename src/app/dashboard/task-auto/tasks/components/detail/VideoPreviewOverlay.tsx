'use client'

import { useEffect } from 'react'
import { X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { cn } from '@/lib/utils'
import { resultVideoKind } from '@/lib/task-auto/result-video'
import { ResultVideoPlayer } from './ResultVideoPlayer'

interface Props {
  resultUrl: string
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export function VideoPreviewOverlay({ resultUrl, onClose, onPrev, onNext, hasPrev, hasNext }: Props) {
  useScrollLock()
  const isFile = resultVideoKind(resultUrl) === 'file'

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.()
      if (e.key === 'ArrowRight' && hasNext) onNext?.()
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [hasPrev, hasNext, onPrev, onNext, onClose])

  return (
    <div
      className="fixed inset-0 z-[1100] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {onPrev && (
        <button
          onClick={e => { e.stopPropagation(); onPrev() }}
          disabled={!hasPrev}
          title="Video trước"
          className={cn(
            'absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors',
            !hasPrev && 'opacity-30 cursor-not-allowed hover:bg-white/10'
          )}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <div className="relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <ResultVideoPlayer
          resultUrl={resultUrl}
          autoPlay
          style={{ width: 'min(360px, 90vw)', height: 'min(640px, 80vh)', borderRadius: '12px' }}
        />
        <a
          href={resultUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          {isFile ? 'Mở video trong tab mới' : 'Mở trong Google Drive'}
        </a>
      </div>

      {onNext && (
        <button
          onClick={e => { e.stopPropagation(); onNext() }}
          disabled={!hasNext}
          title="Video tiếp theo"
          className={cn(
            'absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors',
            !hasNext && 'opacity-30 cursor-not-allowed hover:bg-white/10'
          )}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}
