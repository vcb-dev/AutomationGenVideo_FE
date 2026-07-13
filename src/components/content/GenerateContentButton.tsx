'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GenerateContentButtonProps {
    videoId: number | string;
    videoTitle: string;
    videoDescription?: string;  // Caption / description / hashtags của video gốc
    videoUrl?: string;           // URL video gốc — dùng để transcribe (speech-to-text)
    className?: string;
    compact?: boolean;
}

export default function GenerateContentButton({
    videoId,
    videoTitle,
    videoDescription = '',
    videoUrl = '',
    className = '',
    compact = false
}: GenerateContentButtonProps) {
    const router = useRouter();

    const handleClick = () => {
        if (!videoTitle) {
            console.error('Invalid video data: missing title', { videoId, videoTitle });
            return;
        }

        // Truyền nội dung gốc (caption + hashtag) sang trang product-selection
        // để generate content phân tích và dựa vào đó viết lại
        const params = new URLSearchParams({
            videoId: videoId?.toString() ?? '0',
            videoTitle: encodeURIComponent(videoTitle),
            videoDescription: encodeURIComponent(videoDescription.slice(0, 800)),
        });
        if (videoUrl) {
            params.set('videoUrl', encodeURIComponent(videoUrl));
        }
        router.push(`/dashboard/content/product-selection?${params.toString()}`);
    };

    const isDisabled = !videoTitle;

    return (
        <button
            onClick={handleClick}
            disabled={isDisabled}
            className={`
        flex items-center justify-center gap-2 px-4 py-2 rounded-lg
        bg-gradient-to-r from-purple-600 to-pink-600
        hover:from-purple-700 hover:to-pink-700
        text-white font-semibold text-sm
        transition-all duration-200
        shadow-lg hover:shadow-xl
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
        >
            <Sparkles className="w-4 h-4" />
            {compact ? 'AI' : 'Generate Content'}
        </button>
    );
}
