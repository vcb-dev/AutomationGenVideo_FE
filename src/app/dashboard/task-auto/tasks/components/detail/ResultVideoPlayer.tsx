'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { drivePreviewUrl } from '@/lib/utils'
import { resultThumbUrl, resultVideoKind, storageDownloadUrl } from '@/lib/task-auto/result-video'

interface Props {
  resultUrl: string
  className?: string
  style?: CSSProperties
  autoPlay?: boolean
  title?: string
}

// Video kết quả task: video trên kho phát bằng <video>, link Drive cũ nhúng iframe preview.
export function ResultVideoPlayer({ resultUrl, className, style, autoPlay, title = 'Video kết quả' }: Props) {
  const [playError, setPlayError] = useState(false)
  useEffect(() => setPlayError(false), [resultUrl])

  if (resultVideoKind(resultUrl) !== 'file') {
    return <iframe key={resultUrl} src={drivePreviewUrl(resultUrl) ?? resultUrl} className={className} style={{ border: 'none', ...style }} allow="autoplay" allowFullScreen title={title} />
  }
  if (playError) {
    return (
      <div className={className} style={{ background: '#000', ...style }}>
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-white">
          <p>Trình duyệt không phát được video này (thường là video .mov quay bằng iPhone).</p>
          <a href={storageDownloadUrl(resultUrl)} className="underline">Tải video về để xem</a>
        </div>
      </div>
    )
  }
  return (
    <video
      key={resultUrl}
      src={resultUrl}
      poster={resultThumbUrl(resultUrl) ?? undefined}
      controls
      autoPlay={autoPlay}
      playsInline
      preload="metadata"
      onError={() => setPlayError(true)}
      className={className}
      style={{ background: '#000', objectFit: 'contain', ...style }}
      title={title}
    />
  )
}
