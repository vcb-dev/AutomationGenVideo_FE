'use client'

import { Play, ExternalLink, Maximize2 } from 'lucide-react'
import { Section } from './Section'

interface Props {
  resultUrl: string
  onExpand: () => void
}

// Nhúng trực tiếp video Drive bên cạnh content trong modal chi tiết task — trước đây phải bấm
// "Xem video kết quả" mới mở overlay riêng, giờ hiện luôn để duyệt content + video cùng lúc.
export function VideoResultSection({ resultUrl, onExpand }: Props) {
  const embedUrl = resultUrl.replace(/\/view(\?.*)?$/, '/preview')

  return (
    <Section icon={<Play className="w-4 h-4" />} title="Video kết quả" bgColor="bg-emerald-50" iconColor="text-emerald-600">
      <div className="p-4 space-y-3">
        <div className="relative w-full aspect-[9/16] bg-black rounded-xl overflow-hidden">
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay"
            allowFullScreen
            title="Video kết quả"
          />
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
            href={resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Drive
          </a>
        </div>
      </div>
    </Section>
  )
}
