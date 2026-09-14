'use client';

import { useQuery } from '@tanstack/react-query';
import { scraperService } from '@/services/scraperService';
import { useAuthStore } from '@/store/auth-store';
import { FilterSelect } from './FilterFields';

/**
 * Bộ lọc dùng chung cho MỌI trang kênh nội bộ: kênh, hashtag, thị trường (VN/Global) và
 * tuyến nội dung (A1–A5). Cả 5 trang nội bộ đều gọi cùng một endpoint `scraper/owned/videos`
 * nên đặt ở một chỗ thay vì dán lại năm lần.
 *
 * Lọc được làm Ở SERVER, không phải ở đây. Lọc trên danh sách đã tải về thì trang 1 lấy 24
 * video rồi lọc còn 3 — người dùng tưởng cả hệ thống chỉ có 3 video thuộc nhóm đó, trong
 * khi thực tế còn hàng nghìn ở các trang sau.
 */

/** Đúng bộ tuyến mà đội nội dung đang gắn vào caption dưới dạng #A1…#A5. */
export const TUYEN_NOI_DUNG = ['A1', 'A2', 'A3', 'A4', 'A5'] as const;

export interface ContentFiltersValue {
    channel: string;
    hashtag: string;
    market: string;
    contentLine: string;
}

export default function ContentFilters({
    value,
    onChange,
    /** Trang từng nền tảng chỉ nên hiện kênh của nền tảng đó. Bỏ trống = hiện tất cả. */
    platform,
}: {
    value: ContentFiltersValue;
    onChange: (v: Partial<ContentFiltersValue>) => void;
    platform?: string;
}) {
    const { token } = useAuthStore();

    // Danh sách kênh và hashtag hiếm khi đổi trong một phiên làm việc, mà lại là hai truy vấn
    // gom nhóm nặng ở server (bóc hashtag từ 20.000 caption). staleTime dài để mỗi lần đổi
    // bộ lọc không gọi lại.
    const kenhQuery = useQuery({
        queryKey: ['owned-channels'],
        queryFn: () => scraperService.getOwnedChannels(token!),
        enabled: !!token,
        staleTime: 10 * 60 * 1000,
    });

    const hashtagQuery = useQuery({
        queryKey: ['owned-hashtags'],
        queryFn: () => scraperService.getOwnedHashtags(token!, 60),
        enabled: !!token,
        staleTime: 10 * 60 * 1000,
    });

    const kenh = (kenhQuery.data || []).filter(
        (c) => !platform || c.platform === platform,
    );

    return (
        <>
            <FilterSelect
                value={value.channel}
                onChange={(v) => onChange({ channel: v })}
                className="w-[190px]"
                title="Chỉ hiện video của kênh đã chọn"
                options={[
                    { value: '', label: `Tất cả kênh${kenh.length ? ` (${kenh.length})` : ''}` },
                    ...kenh.map((c) => ({
                        value: String(c.id),
                        label: `${c.ten} (${c.so_video})`,
                    })),
                ]}
            />

            <FilterSelect
                value={value.hashtag}
                onChange={(v) => onChange({ hashtag: v })}
                className="w-[170px]"
                title="Chỉ hiện video có hashtag đã chọn"
                options={[
                    { value: '', label: 'Tất cả hashtag' },
                    ...(hashtagQuery.data || []).map((h) => ({
                        value: h.the || '',
                        label: `#${h.the} (${h.so_video})`,
                    })),
                ]}
            />

            <FilterSelect
                value={value.market}
                onChange={(v) => onChange({ market: v })}
                className="w-[140px]"
                title="Kênh VN nhận theo dấu tiếng Việt trong caption"
                options={[
                    { value: '', label: 'VN + Global' },
                    { value: 'vn', label: 'Kênh VN' },
                    { value: 'global', label: 'Kênh Global' },
                ]}
            />

            <FilterSelect
                value={value.contentLine}
                onChange={(v) => onChange({ contentLine: v })}
                className="w-[140px]"
                title="Bắt theo hashtag #A1…#A5 có trong caption"
                options={[
                    { value: '', label: 'Tất cả tuyến' },
                    ...TUYEN_NOI_DUNG.map((ma) => ({
                        value: ma,
                        label: `Tuyến ${ma}`,
                    })),
                ]}
            />
        </>
    );
}
