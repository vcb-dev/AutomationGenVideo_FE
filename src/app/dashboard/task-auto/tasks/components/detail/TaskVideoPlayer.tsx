'use client'

import type { CSSProperties } from 'react'
import { cn, drivePreviewUrl, videoThumbnailUrl } from '@/lib/utils'

interface Props {
  url: string
  title: string
  className?: string
  style?: CSSProperties
}

export function TaskVideoPlayer({ url, title, className, style }: Props) {
  if (url.includes('drive.google.com')) {
    return (
      <iframe
        key={url}
        src={drivePreviewUrl(url) ?? url}
        title={title}
        className={cn('border-0', className)}
        style={style}
        allow="autoplay"
        allowFullScreen
      />
    )
  }
  return (
    <video
      key={url}
      src={url}
      poster={videoThumbnailUrl(url) ?? undefined}
      aria-label={title}
      controls
      playsInline
      preload="metadata"
      className={cn('bg-black object-contain', className)}
      style={style}
    />
  )
}
