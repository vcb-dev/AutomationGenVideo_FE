import { platformStyle, PLATFORM_KEYS } from './platform-config';

/**
 * Lỗi thật đã xảy ra trên máy người dùng, trang /dashboard/externalChannels/all:
 *
 *     TypeError: Cannot read properties of undefined (reading 'icon')
 *     const config = platformConfig[video.platform];
 *     const PlatformIcon = config.icon;   ← vỡ trắng cả trang
 *
 * Nguyên nhân: bảng cấu hình của trang đó chỉ khai facebook/tiktok/instagram, trong khi
 * endpoint gộp `scraper/all-videos` đã được mở rộng và thực tế trả về 6 nền tảng — đo được
 * trong 100 video đầu: xiaohongshu 27, youtube 35, tiktok 16, kuaishou 11, douyin 7,
 * bilibili 4. Gặp video Douyin đầu tiên là trang chết.
 *
 * TypeScript không bắt được vì kiểu `ExternalVideo.platform` khi đó vẫn khai đúng ba nền
 * tảng, nên trình biên dịch tưởng phép tra cứu luôn có kết quả.
 */

describe('platformStyle — không bao giờ được trả về undefined', () => {
    it('có đủ kiểu dáng cho cả 8 nền tảng đang chạy', () => {
        expect(PLATFORM_KEYS).toHaveLength(8);
        for (const key of PLATFORM_KEYS) {
            const style = platformStyle(key);
            expect(style.icon).toBeDefined();
            expect(style.label).toBeTruthy();
            expect(style.bg).toBeTruthy();
            expect(style.color).toBeTruthy();
        }
    });

    it('4 nền tảng Trung Quốc — chính là nhóm đã làm vỡ trang — đều tra được', () => {
        for (const key of ['douyin', 'xiaohongshu', 'kuaishou', 'bilibili']) {
            expect(platformStyle(key).icon).toBeDefined();
            expect(platformStyle(key).label).not.toBe('Khác');
        }
    });

    it('nền tảng lạ vẫn ra kiểu dáng dùng được thay vì undefined', () => {
        // Đây mới là điều giữ cho trang không vỡ lần sau: BE thêm nền tảng thứ 9 mà FE chưa
        // biết thì tệ nhất chỉ là hiện biểu tượng chung, không phải màn hình trắng.
        for (const la of ['threads', 'snapchat', 'nen-tang-chua-ton-tai']) {
            const style = platformStyle(la);
            expect(style.icon).toBeDefined();
            expect(style.label).toBe('Khác');
        }
    });

    it('giá trị rỗng / null / undefined cũng không làm vỡ', () => {
        for (const xau of ['', null, undefined]) {
            expect(platformStyle(xau as any).icon).toBeDefined();
        }
    });

    it('không phân biệt hoa thường — dữ liệu có chỗ viết hoa nền tảng', () => {
        expect(platformStyle('DOUYIN').label).toBe('Douyin');
        expect(platformStyle('TikTok').label).toBe('TikTok');
    });
});
