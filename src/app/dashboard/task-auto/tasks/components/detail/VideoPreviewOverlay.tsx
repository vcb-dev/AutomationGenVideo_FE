'use client'

import { X, ExternalLink } from 'lucide-react'
import { useScrollLock } from '@/hooks/useScrollLock'

interface Props {
  resultUrl: string
  onClose: () => void
}

export function VideoPreviewOverlay({ resultUrl, onClose }: Props) {
  useScrollLock()
  const embedUrl = resultUrl.replace(/\/view(\?.*)?$/, '/preview')

  return (
    <div
      className="fixed inset-0 z-[1100] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <iframe
          src={embedUrl}
          style={{ width: 'min(360px, 90vw)', height: 'min(640px, 80vh)', border: 'none', borderRadius: '12px' }}
          allow="autoplay"
          allowFullScreen
        />
        <a
          href={resultUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Mở trong Google Drive
        </a>
      </div>
    </div>
  )
}
