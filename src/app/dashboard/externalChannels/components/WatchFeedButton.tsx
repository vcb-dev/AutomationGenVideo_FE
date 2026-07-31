'use client';

import Link from 'next/link';
import { PlayCircle } from 'lucide-react';
import { playbackModeOf } from '@/lib/video-playback';

/**
 * Mở trang lướt dọc để xem video ngay trên web hệ thống, khỏi phải nhảy sang nền tảng gốc.
 *
 * `startVideoId` để trang lướt nhảy thẳng tới đúng video người dùng đang nhìn, thay vì luôn
 * bắt đầu từ đầu danh sách.
 */
export default function WatchFeedButton({
    platform,
    startVideoId,
    className = '',
    label = 'Xem tại đây',
}: {
    platform: string;
    startVideoId?: string;
    className?: string;
    label?: string;
}) {
    // 'all' = danh sách trộn nhiều nền tảng; mỗi video tự chọn cách phát theo nền tảng của
    // nó, nên không kiểm được ở đây.
    const isMixed = platform === 'all';

    // Nền tảng không nhúng được mà cũng không phát qua trung gian được thì đừng mời người
    // dùng bấm vào để rồi nhận màn hình báo lỗi.
    if (!isMixed && playbackModeOf(platform) === 'unsupported') return null;

    const params = new URLSearchParams({ platform });
    if (startVideoId) params.set('start', startVideoId);

    return (
        <Link
            href={`/dashboard/externalChannels/watch?${params.toString()}`}
            className={
                className ||
                'inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-violet-700'
            }
        >
            <PlayCircle className="h-4 w-4" />
            {label}
        </Link>
    );
}
