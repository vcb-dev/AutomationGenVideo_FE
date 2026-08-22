import {
    FacebookLogo,
    TiktokLogo,
    InstagramLogo,
    YoutubeLogo,
    VideoCamera,
} from '@phosphor-icons/react';
import { SiThreads } from 'react-icons/si';
import type { ComponentType } from 'react';

/**
 * Biểu tượng, màu và tên hiển thị của các nền tảng — một bản duy nhất cho cả hệ thống.
 */

export const PLATFORM_KEYS = [
    'facebook', 'tiktok', 'instagram', 'youtube', 'threads',
    'douyin', 'xiaohongshu', 'kuaishou', 'bilibili',
] as const;

export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export interface PlatformStyle {
    /** Biểu tượng. Dùng ComponentType chứ không dùng kiểu `Icon` của thư viện —
     *  ở phiên bản 2.x `Icon` là namespace, không dùng làm kiểu được. */
    icon: ComponentType<{ size?: number; className?: string; weight?: any }>;
    color: string;
    bg: string;
    label: string;
}

const BANG: Record<PlatformKey, PlatformStyle> = {
    facebook:    { icon: FacebookLogo,  color: 'text-blue-600',                  bg: 'bg-blue-50 dark:bg-blue-900/30',       label: 'Facebook' },
    tiktok:      { icon: TiktokLogo,    color: 'text-slate-800 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800',       label: 'TikTok' },
    instagram:   { icon: InstagramLogo, color: 'text-pink-500',                  bg: 'bg-pink-50 dark:bg-pink-900/30',       label: 'Instagram' },
    threads:     { icon: (props: any) => <SiThreads {...props} />, color: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800', label: 'Threads' },
    youtube:     { icon: YoutubeLogo,   color: 'text-red-600',                   bg: 'bg-red-50 dark:bg-red-900/30',         label: 'YouTube' },
    douyin:      { icon: VideoCamera,   color: 'text-slate-800 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800',       label: 'Douyin' },
    xiaohongshu: { icon: VideoCamera,   color: 'text-rose-600',                  bg: 'bg-rose-50 dark:bg-rose-900/30',       label: 'Xiaohongshu' },
    kuaishou:    { icon: VideoCamera,   color: 'text-orange-600',                bg: 'bg-orange-50 dark:bg-orange-900/30',   label: 'Kuaishou' },
    bilibili:    { icon: VideoCamera,   color: 'text-sky-500',                   bg: 'bg-sky-50 dark:bg-sky-900/30',         label: 'Bilibili' },
};

/** Nền tảng lạ (nền tảng mới thêm ở BE mà FE chưa kịp biết) thì vẫn vẽ được, không vỡ trang. */
const MAC_DINH: PlatformStyle = {
    icon: VideoCamera,
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-800',
    label: 'Khác',
};

/**
 * LUÔN trả về một kiểu dáng dùng được — đây mới là điểm chính.
 *
 * Tra thẳng vào bảng rồi `.icon` là cách đã làm vỡ trang một lần: chỉ cần BE thêm một
 * nền tảng là FE trắng màn hình. Đi qua hàm này thì trường hợp xấu nhất chỉ là hiện biểu
 * tượng chung chung.
 */
export function platformStyle(platform: string | undefined | null): PlatformStyle {
    const key = (platform || '').toLowerCase() as PlatformKey;
    return BANG[key] ?? MAC_DINH;
}
