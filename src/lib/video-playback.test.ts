import { planPlayback, playbackModeOf } from './video-playback';

const API = 'http://localhost:3000/api';

/**
 * Chọn đúng cách phát cho từng nền tảng. Ranh giới này quan trọng vì chọn sai là hỏng thật,
 * không phải hỏng nhẹ:
 *  - đưa Douyin vào iframe → không có mã nhúng, hiện trang trắng;
 *  - đưa Douyin vào thẻ <video> trỏ thẳng CDN → 403 vì họ chặn theo referer (đã đo);
 *  - đưa Xiaohongshu vào thẻ <video> trỏ thẳng CDN → link http, trang HTTPS chặn mixed content;
 *  - đưa YouTube qua trung gian → tốn băng thông server vô ích trong khi có mã nhúng miễn phí.
 */
describe('playbackModeOf — nền tảng nào nhúng, nền tảng nào qua trung gian', () => {
    it.each(['youtube', 'bilibili', 'facebook', 'instagram'])(
        '%s dùng mã nhúng chính chủ (không tốn băng thông của mình)',
        (p) => expect(playbackModeOf(p)).toBe('embed'),
    );

    it.each(['douyin', 'xiaohongshu', 'kuaishou', 'tiktok'])(
        '%s phải qua trung gian của mình',
        (p) => expect(playbackModeOf(p)).toBe('proxy'),
    );

    /**
     * TikTok CÓ mã nhúng nhưng KHÔNG dùng được: đo thực tế tiktok.com/embed/v2/<id> trả 503
     * liên tục 3/3 lần (họ chặn). Nếu ai đó thấy "TikTok có embed mà" rồi chuyển ngược lại,
     * test này sẽ chặn.
     */
    it('TikTok KHÔNG được xếp vào nhóm nhúng — mã nhúng của họ trả 503', () => {
        expect(playbackModeOf('tiktok')).not.toBe('embed');
    });

    it('nền tảng lạ → báo không hỗ trợ, không đoán bừa', () => {
        expect(playbackModeOf('vimeo')).toBe('unsupported');
        expect(playbackModeOf('')).toBe('unsupported');
    });

    it('không phân biệt hoa thường và khoảng trắng thừa', () => {
        expect(playbackModeOf('  YouTube ')).toBe('embed');
        expect(playbackModeOf('DOUYIN')).toBe('proxy');
    });
});

describe('planPlayback — dựng đúng địa chỉ phát', () => {
    it('YouTube: nhúng, tự phát, tắt tiếng (trình duyệt chặn tự phát có tiếng)', () => {
        const r = planPlayback('youtube', 'dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', API);
        expect(r.mode).toBe('embed');
        expect(r.src).toContain('youtube.com/embed/dQw4w9WgXcQ');
        expect(r.src).toContain('mute=1');
        expect(r.src).toContain('playsinline=1');
    });

    it('Bilibili: mã BV dùng bvid, mã av dùng aid', () => {
        expect(planPlayback('bilibili', 'BV1GJ411x7h7', '', API).src).toContain('bvid=BV1GJ411x7h7');
        const av = planPlayback('bilibili', 'av170001', '', API).src;
        expect(av).toContain('aid=170001');
        expect(av).not.toContain('bvid');
    });

    it('Instagram: lấy shortcode từ link khi mã video không phải shortcode', () => {
        const r = planPlayback('instagram', '3907795283352076835', 'https://www.instagram.com/reel/C1a2B3c4D5e/', API);
        expect(r.src).toContain('/p/C1a2B3c4D5e/embed');
    });

    it('Facebook: truyền cả link gốc, đã mã hoá đúng', () => {
        const url = 'https://www.facebook.com/reel/1234567890123';
        const r = planPlayback('facebook', '1234567890123', url, API);
        expect(r.src).toContain(encodeURIComponent(url));
    });

    it('Douyin: trỏ vào trung gian của mình, KHÔNG trỏ thẳng CDN', () => {
        const r = planPlayback('douyin', '7659675415467902374', 'https://www.douyin.com/video/7659675415467902374', API);
        expect(r.mode).toBe('proxy');
        expect(r.src).toContain(`${API}/scraper/stream/douyin/7659675415467902374`);
        expect(r.src).toContain(`url=${encodeURIComponent('https://www.douyin.com/video/7659675415467902374')}`);
        expect(r.src).not.toContain('douyinpic');
        expect(r.src).not.toContain('zjcdn');
    });

    /**
     * Lỗi thật đã mắc: đặt JwtAuthGuard lên route phát rồi để thẻ <video src> tự gọi.
     * Trình duyệt KHÔNG cho gắn header vào request của thẻ <video>, nên mọi video đều 401 —
     * trong khi test bằng curl có gắn header thì vẫn xanh. Token buộc phải đi trong URL.
     */
    it('link phát PHẢI mang token trong URL (thẻ <video> không gửi được header)', () => {
        const r = planPlayback('douyin', '123', 'https://www.douyin.com/video/123', API, 'JWT_ABC');
        expect(r.src).toContain('t=JWT_ABC');
    });

    it('không có token thì không nhét tham số rỗng vào URL', () => {
        const r = planPlayback('douyin', '123', '', API);
        expect(r.src).not.toContain('t=');
    });

    it('token được mã hoá an toàn trong URL', () => {
        const r = planPlayback('kuaishou', 'abc', 'https://ks/x', API, 'a b+c/d=');
        expect(r.src).toContain(encodeURIComponent('a b+c/d=').replace(/%20/g, '+'));
    });

    it('nền tảng nhúng KHÔNG được đính token (link đi ra ngoài, lộ token)', () => {
        const r = planPlayback('youtube', 'dQw4w9WgXcQ', '', API, 'JWT_ABC');
        expect(r.src).not.toContain('JWT_ABC');
    });

    it('Kuaishou: phải kèm link gốc — API bên kia chỉ nhận link chia sẻ, không nhận mã', () => {
        const url = 'https://www.kuaishou.com/f/X-f2k5KJpiXN1SY';
        const r = planPlayback('kuaishou', 'X-f2k5KJpiXN1SY', url, API);
        expect(decodeURIComponent(r.src)).toContain(url);
    });

    it('thiếu mã video ở nền tảng nhúng → báo không phát được, không dựng link hỏng', () => {
        const r = planPlayback('youtube', '', 'https://youtube.com/', API);
        expect(r.mode).toBe('unsupported');
        expect(r.reason).toBeTruthy();
    });

    it('nền tảng lạ → báo rõ lý do', () => {
        const r = planPlayback('vimeo', '123', 'https://vimeo.com/123', API);
        expect(r.mode).toBe('unsupported');
        expect(r.reason).toContain('vimeo');
    });

    it('mã video có ký tự đặc biệt vẫn được mã hoá an toàn', () => {
        const r = planPlayback('douyin', 'a/b?c=1', '', API);
        expect(r.src).toContain(encodeURIComponent('a/b?c=1'));
        expect(r.src).not.toContain('stream/douyin/a/b');
    });
});
