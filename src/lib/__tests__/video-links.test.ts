import { parseVideoLinks, runWithConcurrency, extractVideoId, MAX_LINKS_PER_BATCH, PROPOSAL_PLATFORMS } from '../video-links';

describe('parseVideoLinks — dán nhiều link video cùng lúc', () => {
    it('Tách link theo dòng, dấu cách và dấu phẩy', () => {
        const text = [
            'https://www.douyin.com/video/7412345678901234567',
            'https://www.tiktok.com/@a/video/7300000000000000001, https://www.youtube.com/shorts/abcdEFGH123',
        ].join('\n');
        const { links } = parseVideoLinks(text);
        expect(links.map((l) => [l.platform, l.videoId])).toEqual([
            ['douyin', '7412345678901234567'],
            ['tiktok', '7300000000000000001'],
            ['youtube', 'abcdEFGH123'],
        ]);
        expect(links.every((l) => !l.error)).toBe(true);
    });

    it('Bóc được link trong đoạn text chia sẻ từ app Douyin', () => {
        const text = '7.99 复制打开抖音，看看【某某的作品】宝石原石切割 https://v.douyin.com/iRNBho6u/ Wsx:/ 01/28';
        const { links } = parseVideoLinks(text);
        expect(links).toHaveLength(1);
        expect(links[0]).toMatchObject({ url: 'https://v.douyin.com/iRNBho6u/', platform: 'douyin', videoId: '' });
        expect(links[0].error).toBeUndefined(); // link rút gọn: để BE giải
    });

    it('Bỏ dấu câu dính cuối link', () => {
        const { links } = parseVideoLinks('xem cái này (https://www.tiktok.com/@a/video/7300000000000000001).');
        expect(links[0].url).toBe('https://www.tiktok.com/@a/video/7300000000000000001');
    });

    it('Bỏ link trùng, kể cả cùng video nhưng khác kiểu link', () => {
        const text = [
            'https://www.douyin.com/video/7412345678901234567',
            'https://www.douyin.com/jingxuan?modal_id=7412345678901234567',
            'https://www.douyin.com/video/7412345678901234567',
        ].join('\n');
        const { links, duplicates } = parseVideoLinks(text);
        expect(links).toHaveLength(1);
        expect(duplicates).toBe(2);
    });

    it('Đánh dấu lỗi link trang cá nhân nhưng vẫn giữ trong danh sách', () => {
        const { links } = parseVideoLinks('https://www.tiktok.com/@someone');
        expect(links).toHaveLength(1);
        expect(links[0].error).toMatch(/không trỏ vào một video/);
    });

    it('Cắt ở giới hạn mỗi lượt và báo số link bị bỏ', () => {
        const text = Array.from({ length: MAX_LINKS_PER_BATCH + 3 }, (_, i) =>
            `https://www.tiktok.com/@a/video/73000000000000${String(i).padStart(5, '0')}`).join('\n');
        const { links, overLimit } = parseVideoLinks(text);
        expect(links).toHaveLength(MAX_LINKS_PER_BATCH);
        expect(overLimit).toBe(3);
    });

    it('Text không có link → danh sách rỗng', () => {
        expect(parseVideoLinks('không có link nào').links).toEqual([]);
        expect(parseVideoLinks('').links).toEqual([]);
    });

    it('extractVideoId giữ nguyên hành vi cũ', () => {
        expect(extractVideoId('https://www.instagram.com/reel/Cxyz12345/')).toBe('Cxyz12345');
        expect(extractVideoId('https://www.bilibili.com/video/BV1xx411c7mD')).toBe('BV1xx411c7mD');
        expect(extractVideoId('https://example.com/video/123456')).toBe('');
    });
});

describe('Reddit', () => {
    it('Bóc mã bài viết từ link bài và redd.it', () => {
        const { links } = parseVideoLinks([
            'https://www.reddit.com/r/Jewelry/comments/1ojnh50/my_new_ring/',
            'https://redd.it/1abcdef',
        ].join('\n'));
        expect(links.map((l) => [l.platform, l.videoId, l.error])).toEqual([
            ['reddit', '1ojnh50', undefined],
            ['reddit', '1abcdef', undefined],
        ]);
    });

    it('v.redd.it và link chia sẻ /s/ là link rút gọn: không có mã nhưng vẫn hợp lệ để BE giải', () => {
        const { links } = parseVideoLinks('https://v.redd.it/abc123xyz9\nhttps://www.reddit.com/r/Jewelry/s/AbC123xYz');
        expect(links.map((l) => [l.platform, l.videoId, l.error])).toEqual([
            ['reddit', '', undefined],
            ['reddit', '', undefined],
        ]);
    });

    it('Link subreddit không trỏ vào video → báo lỗi', () => {
        expect(parseVideoLinks('https://www.reddit.com/r/Jewelry/').links[0].error).toMatch(/không trỏ vào một video/);
    });

    it('Có trong danh sách nền tảng đề xuất', () => {
        expect(PROPOSAL_PLATFORMS).toContain('reddit');
    });
});

describe('runWithConcurrency', () => {
    it('Chạy hết mọi phần tử, không vượt số việc song song', async () => {
        let running = 0;
        let peak = 0;
        const done: number[] = [];
        await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
            running++;
            peak = Math.max(peak, running);
            await new Promise((r) => setTimeout(r, 5));
            done.push(n);
            running--;
        });
        expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(peak).toBe(3);
    });

    it('Danh sách rỗng thì xong ngay', async () => {
        const worker = jest.fn();
        await runWithConcurrency([], 3, worker);
        expect(worker).not.toHaveBeenCalled();
    });
});
