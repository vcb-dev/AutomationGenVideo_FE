'use client'

import { Play, ExternalLink, Maximize2 } from 'lucide-react'
import { Section } from './Section'
import { ResultVideoPlayer } from './ResultVideoPlayer'
import { resultVideoKind, storageDownloadUrl } from '@/lib/task-auto/result-video'

interface Props {
  resultUrl: string
  onExpand: () => void
}

// Nhúng video kết quả cạnh content trong modal chi tiết task để duyệt content + video cùng lúc.
export function VideoResultSection({ resultUrl, onExpand }: Props) {
  const isFile = resultVideoKind(resultUrl) === 'file'

  return (
    <Section icon={<Play className="w-4 h-4" />} title="Video kết quả" bgColor="bg-emerald-50" iconColor="text-emerald-600">
      <div className="p-4 space-y-3">
        <div className="relative w-full aspect-[9/16] bg-black rounded-xl overflow-hidden">
          <ResultVideoPlayer resultUrl={resultUrl} className="absolute inset-0 w-full h-full" />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExpand}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-lg transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" /> Phóng to
          </button>
          <a
            href={isFile ? storageDownloadUrl(resultUrl) : resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> {isFile ? 'Tải video' : 'Drive'}
          </a>
        </div>
      </div>
    </Section>
  )
}
