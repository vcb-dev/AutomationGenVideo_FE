// VCB Video Downloader — content script
// Phát hiện <video> đang được rê chuột vào và hiện 1 nút tải nhỏ (kiểu Cốc Cốc),
// suy luận link chia sẻ của video theo từng nền tảng, rồi nhờ background mở/focus
// tab trang tải video với link đã điền sẵn.
(() => {
    const DEFAULTS = {
        appBase: 'http://localhost:3001',
        defaultFormat: 'mp4',
        defaultQuality: 'best',
        autoDownload: false,
        hoverIconEnabled: true,
        // Gợi ý dịch Việt→Trung ở ô tìm kiếm trên các trang TQ (Douyin, Xiaohongshu...).
        cnTranslateEnabled: true,
        disabledSites: [],
    };

    const MIN_WIDTH = 160;
    const MIN_HEIGHT = 90;
    const HIDE_DELAY_MS = 350;

    let settings = { ...DEFAULTS };
    let settingsReady = false;
    let activeVideo = null;
    let lastContextVideo = null;
    let hideTimer = null;
    let rafScheduled = false;

    const hostname = location.hostname.replace(/^www\./, '');

    function isOwnAppOrigin() {
        try {
            const base = new URL(settings.appBase || DEFAULTS.appBase);
            return base.hostname.replace(/^www\./, '') === hostname;
        } catch {
            return false;
        }
    }

    // --- Site adapters: suy luận URL chia sẻ (permalink) từ 1 phần tử <video> ---
    // Lưu ý quan trọng: querySelectorAll ở mỗi cấp cha quét CẢ SUBTREE của cấp đó. Nếu leo
    // qua khỏi ranh giới "item" của video (card/feed-entry) sang 1 container dùng chung cho
    // NHIỀU video (vd cả feed), sẽ dễ vơ nhầm permalink của video khác. Heuristic: 1 khi
    // subtree của tổ tiên chứa > 1 thẻ <video> thì coi như đã chạm container dùng chung —
    // ngừng quét subtree tìm anchor con (nhưng vẫn tiếp tục kiểm tra bản thân tổ tiên có
    // phải <a> hay không, vì đó là tín hiệu chính xác 1-1, không phụ thuộc subtree).
    function findAncestorLink(video, hrefTest, maxDepth = 10) {
        let el = video;
        let subtreeScanAllowed = true;
        for (let i = 0; i < maxDepth && el; i++) {
            if (el.tagName === 'A' && el.href && hrefTest(el.href)) return el.href;
            if (subtreeScanAllowed && el.querySelectorAll) {
                if (el.querySelectorAll('video').length > 1) {
                    subtreeScanAllowed = false;
                } else {
                    const found = Array.from(el.querySelectorAll('a[href]')).find((a) => hrefTest(a.href));
                    if (found) return found.href;
                }
            }
            el = el.parentElement;
        }
        return null;
    }

    const ADAPTERS = [
        {
            test: (h) => h.includes('youtube.com') || h === 'youtu.be',
            resolve: (v) => {
                if (/\/watch$/.test(location.pathname)) return location.href;
                if (location.pathname.startsWith('/shorts/')) return location.href;
                return (
                    findAncestorLink(v, (href) => /\/watch\?v=|\/shorts\//.test(href)) ||
                    null
                );
            },
        },
        {
            test: (h) => h.includes('tiktok.com'),
            resolve: (v) => {
                if (/\/video\/\d+/.test(location.pathname)) return location.href;
                return findAncestorLink(v, (href) => /\/video\/\d+/.test(href));
            },
        },
        {
            test: (h) => h.includes('facebook.com') || h.includes('fb.watch'),
            resolve: (v) => {
                const isFbVideoHref = (href) => /\/videos\/|\/reel\/|\/watch\/?\?v=|[?&]v=\d{6,}|story_fbid=/.test(href);
                // Ở bảng tin, findAncestorLink ngừng quét sớm vì băng reels phía trên có
                // nhiều <video> chung một container. Khoanh đúng bài viết trước rồi hẵng tìm:
                // link permalink nằm ở dòng thời gian trong phần đầu bài, khác nhánh với video.
                const post = v?.closest?.('[role="article"]') || v?.closest?.('article');
                if (post) {
                    const hit = Array.from(post.querySelectorAll('a[href]')).find((a) => isFbVideoHref(a.href));
                    if (hit) return hit.href;
                }
                return findAncestorLink(v, isFbVideoHref);
            },
        },
        {
            test: (h) => h.includes('instagram.com'),
            resolve: (v) => {
                if (/\/(p|reel|tv)\//.test(location.pathname)) return location.href;
                return findAncestorLink(v, (href) => /\/(p|reel|tv)\//.test(href));
            },
        },
        {
            test: (h) => h === 'twitter.com' || h === 'x.com',
            resolve: (v) => {
                if (/\/status\/\d+/.test(location.pathname)) return location.href;
                return findAncestorLink(v, (href) => /\/status\/\d+/.test(href));
            },
        },
        {
            test: (h) => h.includes('douyin.com'),
            // Douyin mở video trong lớp phủ ngay trên trang kênh: lúc đó path vẫn là
            // /user/... nhưng mã video nằm ở query modal_id — phải ưu tiên nó, nếu không
            // sẽ vơ nhầm link trang kênh.
            resolve: (v) => {
                const modal = location.search.match(/[?&]modal_id=(\d{6,})/);
                if (modal) return `https://www.douyin.com/video/${modal[1]}`;
                if (/\/video\/\d{6,}/.test(location.pathname)) return location.href;
                return findAncestorLink(v, (href) => /\/video\//.test(href));
            },
        },
        {
            test: (h) => h.includes('bilibili.com'),
            resolve: (v) => {
                if (/\/video\/(BV|av)/i.test(location.pathname)) return location.href;
                return findAncestorLink(v, (href) => /\/video\/(BV|av)/i.test(href));
            },
        },
        {
            test: (h) => h.includes('reddit.com'),
            resolve: (v) => findAncestorLink(v, (href) => /\/comments\//.test(href)),
        },
        {
            test: (h) => h.includes('vimeo.com'),
            resolve: (v) => {
                if (/^\/\d+/.test(location.pathname)) return location.href;
                return findAncestorLink(v, (href) => /vimeo\.com\/\d+/.test(href));
            },
        },
        {
            test: (h) => h.includes('dailymotion.com'),
            resolve: (v) => findAncestorLink(v, (href) => /\/video\//.test(href)),
        },
        {
            // RedNote (rednote.com, tên quốc tế) / Xiaohongshu (小红书) — bài viết dạng
            // /explore/<id> hoặc /discovery/item/<id>, thường kèm ?xsec_token= bắt buộc.
            test: (h) => h.includes('rednote.com') || h.includes('xiaohongshu.com'),
            resolve: (v) => {
                if (/\/(explore|discovery\/item)\//.test(location.pathname)) return location.href;
                return findAncestorLink(v, (href) => /\/(explore|discovery\/item)\//.test(href));
            },
        },
    ];

    function resolveVideoUrl(video) {
        const adapter = ADAPTERS.find((a) => a.test(hostname));
        const resolved = adapter ? adapter.resolve(video) : null;
        if (resolved) return resolved;
        // Fallback tổng quát: tìm anchor "trông giống permalink" bao quanh video,
        // nếu không có thì dùng URL trang hiện tại (đúng cho hầu hết trang blog/nhúng đơn video).
        const generic = findAncestorLink(video, (href) => {
            if (!href || href.endsWith('#') || href.startsWith('javascript:')) return false;
            try {
                const u = new URL(href);
                return u.pathname.length > 1;
            } catch {
                return false;
            }
        });
        return generic || location.href;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ĐỌC THÔNG TIN VIDEO NGAY TRÊN TRANG (dùng khi đề xuất về hệ thống)
    // ═══════════════════════════════════════════════════════════════════════════

    // Rút id video THẬT từ URL. Hệ thống dùng id này làm khoá (scraper_douyin_videos.post_id,
    // video_library.video_id...) — nếu nhét cả đường link vào thì video đề xuất không bao giờ
    // khớp với video đã cào, và cùng một video dán 2 kiểu link sẽ thành 2 dòng khác nhau.
    const VIDEO_ID_RULES = [
        { platform: 'douyin', hosts: ['douyin.com', 'iesdouyin.com'],
          re: [/\/video\/(\d{6,})/, /\/note\/(\d{6,})/, /[?&]modal_id=(\d{6,})/] },
        { platform: 'tiktok', hosts: ['tiktok.com'],
          re: [/\/video\/(\d{6,})/, /\/photo\/(\d{6,})/, /[?&]item_id=(\d{6,})/] },
        { platform: 'youtube', hosts: ['youtube.com', 'youtu.be'],
          re: [/[?&]v=([\w-]{8,})/, /\/shorts\/([\w-]{8,})/, /\/embed\/([\w-]{8,})/, /youtu\.be\/([\w-]{8,})/] },
        { platform: 'bilibili', hosts: ['bilibili.com', 'b23.tv'],
          re: [/\/video\/(BV[\w]{8,})/i, /\/video\/(av\d+)/i] },
        { platform: 'xiaohongshu', hosts: ['xiaohongshu.com', 'xhslink.com', 'rednote.com'],
          re: [/\/explore\/([\da-f]{16,})/i, /\/discovery\/item\/([\da-f]{16,})/i, /\/search_result\/([\da-f]{16,})/i] },
        { platform: 'kuaishou', hosts: ['kuaishou.com'],
          re: [/\/short-video\/([\w-]{6,})/, /\/f\/([\w-]{6,})/, /[?&]photoId=([\w-]{6,})/] },
        { platform: 'instagram', hosts: ['instagram.com'],
          re: [/\/reels?\/([\w-]{5,})/, /\/p\/([\w-]{5,})/, /\/tv\/([\w-]{5,})/] },
        { platform: 'facebook', hosts: ['facebook.com', 'fb.watch'],
          re: [/\/videos\/(?:[^/]+\/)?(\d{6,})/, /\/reel\/(\d{6,})/, /[?&]v=(\d{6,})/, /\/watch\/?\?v=(\d{6,})/] },
    ];

    /**
     * → { platform, videoId } | null
     * videoId = null nghĩa là ĐÚNG nền tảng nhưng link không trỏ vào một video cụ thể
     * (vd đang đứng ở trang cá nhân /user/... ) — chỗ gọi phải từ chối, đừng đề xuất bừa.
     */
    function detectVideoRef(rawUrl) {
        let u;
        try { u = new URL(rawUrl, location.href); } catch { return null; }
        const host = u.hostname.replace(/^www\./, '');
        for (const rule of VIDEO_ID_RULES) {
            if (!rule.hosts.some((d) => host === d || host.endsWith('.' + d))) continue;
            for (const re of rule.re) {
                const m = u.href.match(re);
                if (m && m[1]) return { platform: rule.platform, videoId: m[1] };
            }
            return { platform: rule.platform, videoId: null };
        }
        return { platform: '', videoId: null };
    }

    // Với nền tảng mà mã video đủ để dựng lại link chuẩn, chuẩn hoá luôn — tránh lưu vào
    // hệ thống những link dài loằng ngoằng kèm tham số phiên (vd link lớp phủ của Douyin
    // mang cả sec_uid của trang kênh). Nền tảng cần thêm tham số mới xem được
    // (xiaohongshu: xsec_token; tiktok: tên kênh) thì giữ nguyên link gốc.
    const CANONICAL_URL_BUILDERS = {
        douyin: (id) => `https://www.douyin.com/video/${id}`,
        youtube: (id) => `https://www.youtube.com/watch?v=${id}`,
        bilibili: (id) => `https://www.bilibili.com/video/${id}`,
        kuaishou: (id) => `https://www.kuaishou.com/short-video/${id}`,
    };

    /**
     * Tìm link + mã video theo nhiều nguồn, dừng ở nguồn đầu tiên cho ra mã.
     * Một nguồn duy nhất không đủ tin: trang cá nhân Douyin mở video trong lớp phủ,
     * Facebook ở bảng tin thì link nằm tận dòng thời gian của bài viết, v.v.
     */
    function resolveProposable(video, extraUrls = []) {
        const seen = new Set();
        const candidates = [];
        const push = (u) => {
            if (!u || typeof u !== 'string' || seen.has(u)) return;
            seen.add(u);
            candidates.push(u);
        };

        push(resolveVideoUrl(video));
        // Link do background gửi kèm (vd người dùng bấm chuột phải thẳng vào 1 link video).
        for (const u of extraUrls) push(u);
        push(location.href);
        push(document.querySelector('link[rel="canonical"]')?.href);
        push(document.querySelector('meta[property="og:url"]')?.getAttribute('content'));
        // Link trong đúng khối bài viết chứa video (bảng tin Facebook/Twitter...)
        const post = video?.closest?.('[role="article"]') || video?.closest?.('article');
        if (post) {
            for (const a of post.querySelectorAll('a[href]')) push(a.href);
        }

        for (const url of candidates) {
            const ref = detectVideoRef(url);
            if (ref && ref.videoId) {
                const build = CANONICAL_URL_BUILDERS[ref.platform];
                return { url: build ? build(ref.videoId) : url, platform: ref.platform, videoId: ref.videoId };
            }
        }
        // Không nguồn nào ra mã — trả lại link tốt nhất có được để chỗ gọi báo lỗi rõ ràng.
        const fallback = candidates[0] || location.href;
        const ref = detectVideoRef(fallback) || { platform: '', videoId: null };
        return { url: fallback, platform: ref.platform || '', videoId: '' };
    }

    // "1.4万" → 14000, "1.2亿" → 120000000, "12.3K" → 12300, "1,234" → 1234
    function parseCount(raw) {
        if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
        const s = String(raw ?? '').trim();
        if (!s) return 0;
        const m = s.match(/([\d.,]+)\s*([万億亿千KkMmBb]?)/);
        if (!m) return 0;
        const num = Number(m[1].replace(/,/g, ''));
        if (!Number.isFinite(num)) return 0;
        const mult = { '万': 1e4, '億': 1e8, '亿': 1e8, '千': 1e3, K: 1e3, k: 1e3, M: 1e6, m: 1e6, B: 1e9, b: 1e9 }[m[2]] || 1;
        return Math.max(0, Math.floor(num * mult));
    }

    // --- Lấy các khối JSON mà trang nhúng sẵn trong <script> -------------------
    // Content script chạy ở "isolated world" nên KHÔNG đọc được biến window của trang
    // (window.__INITIAL_STATE__...). Nhưng đọc được textContent của chính thẻ <script>,
    // mà các trang này đều render sẵn state vào HTML — nên đi đường đó.
    const STATE_VAR_RE =
        /(?:window\.)?(?:__INITIAL_STATE__|__APOLLO_STATE__|__NUXT__|_ROUTER_DATA|ytInitialPlayerResponse|ytInitialData|SIGI_STATE|RENDER_DATA)\s*=\s*/;

    function safeJson(text) {
        try { return JSON.parse(text); } catch { return null; }
    }

    // Cắt đúng một khối JSON cân ngoặc kể từ vị trí `from` (bỏ qua ngoặc nằm trong chuỗi).
    function sliceBalancedJson(text, from) {
        const open = text[from];
        const close = open === '[' ? ']' : '}';
        let depth = 0, inStr = false, esc = false;
        for (let i = from; i < text.length; i++) {
            const ch = text[i];
            if (inStr) {
                if (esc) esc = false;
                else if (ch === '\\') esc = true;
                else if (ch === '"') inStr = false;
                continue;
            }
            if (ch === '"') inStr = true;
            else if (ch === open) depth++;
            else if (ch === close && --depth === 0) return text.slice(from, i + 1);
        }
        return null;
    }

    const MAX_SCRIPT_CHARS = 3_000_000;

    function collectPageJson() {
        const blobs = [];
        for (const s of document.querySelectorAll('script')) {
            const text = s.textContent;
            if (!text || text.length < 40 || text.length > MAX_SCRIPT_CHARS) continue;
            const type = (s.type || '').toLowerCase();
            if (type.includes('json')) {
                // Douyin nhét RENDER_DATA dạng đã encodeURIComponent.
                let parsed = safeJson(text);
                if (!parsed && /%7B|%5B/.test(text)) {
                    try { parsed = safeJson(decodeURIComponent(text)); } catch { /* bỏ qua */ }
                }
                if (parsed) blobs.push(parsed);
                continue;
            }
            const m = text.match(STATE_VAR_RE);
            if (!m) continue;
            const start = text.indexOf('{', m.index + m[0].length - 1);
            const startArr = text.indexOf('[', m.index + m[0].length - 1);
            const pos = start >= 0 && (startArr < 0 || start < startArr) ? start : startArr;
            if (pos < 0) continue;
            const slice = sliceBalancedJson(text, pos);
            const parsed = slice && safeJson(slice);
            if (parsed) blobs.push(parsed);
        }
        return blobs;
    }

    // Tên trường mỗi nền tảng đặt một kiểu → gom lại thành nhóm thay vì đóng cứng đường dẫn
    // (đóng cứng path kiểu data.aweme_detail.statistics... là hỏng ngay khi trang đổi cấu trúc).
    const FIELD_ALIASES = {
        // 'view'/'like'/'reply'/'share' trần là kiểu của Bilibili (videoData.stat).
        views: ['play_count', 'playCount', 'view_count', 'viewCount', 'views', 'video_view_count', 'view'],
        likes: ['digg_count', 'diggCount', 'like_count', 'likeCount', 'likedCount', 'likes', 'realLikeCount', 'liked_count', 'like'],
        comments: ['comment_count', 'commentCount', 'comments', 'reply_count', 'replyCount', 'reply'],
        shares: ['share_count', 'shareCount', 'shares', 'forward_count', 'repost_count', 'share'],
        collects: ['collect_count', 'collectCount', 'collectedCount', 'favorite_count', 'collected_count'],
    };
    // Mỗi trang bọc số liệu trong một tên khác nhau — phải mở đúng lớp bọc, nếu không sẽ
    // chọn nhầm chính cái object số liệu làm "video" và mất hết tiêu đề/tác giả/ảnh bìa.
    const STATS_WRAPPER_KEYS = ['statistics', 'stats', 'stat', 'interactInfo', 'interact_info', 'counts'];
    const TITLE_KEYS = ['desc', 'title', 'caption', 'content', 'display_title', 'contentDesc'];
    const AUTHOR_NAME_KEYS = ['nickname', 'author_name', 'authorName', 'display_name', 'uname', 'nick_name', 'owner_name'];
    // Đọc bên trong object tác giả (author/owner/user) thì 'name' mới an toàn — đặt ở
    // node video sẽ đụng tên video.
    const AUTHOR_BOX_NAME_KEYS = ['nickname', 'name', 'nick_name', 'uname', 'display_name', 'author_name', 'authorName'];
    const NODE_ID_KEYS = ['aweme_id', 'id', 'video_id', 'videoId', 'photoId', 'bvid', 'note_id', 'noteId', 'id_str'];

    function statsContainer(node) {
        for (const k of STATS_WRAPPER_KEYS) {
            const v = node[k];
            if (v && typeof v === 'object' && !Array.isArray(v)) return v;
        }
        return node;
    }

    function authorContainer(node) {
        for (const k of ['author', 'owner', 'user', 'uploader', 'channel']) {
            const v = node[k];
            if (v && typeof v === 'object' && !Array.isArray(v)) return v;
        }
        return {};
    }
    const AUTHOR_ID_KEYS = ['unique_id', 'uniqueId', 'short_id', 'sec_uid', 'user_id', 'author_id', 'red_id', 'mid'];
    const COVER_KEYS = ['cover', 'origin_cover', 'dynamic_cover', 'preview_image', 'thumbnail', 'coverUrl', 'pic', 'imageUrl'];

    // Ảnh bìa mỗi trang đặt một kiểu: chuỗi thẳng, {url_list:[...]}, {urlList:[...]}, hoặc mảng.
    function pickCover(container) {
        if (!container || typeof container !== 'object') return '';
        // YouTube: thumbnail = { thumbnails: [{url}] }
        if (Array.isArray(container.thumbnails)) {
            const hit = container.thumbnails.find((t) => typeof t?.url === 'string' && /^https?:/i.test(t.url));
            if (hit) return hit.url;
        }
        for (const key of COVER_KEYS) {
            const raw = container[key];
            if (!raw) continue;
            if (typeof raw === 'string' && /^https?:/i.test(raw)) return raw;
            if (Array.isArray(raw)) {
                const hit = raw.find((x) => typeof x === 'string' && /^https?:/i.test(x));
                if (hit) return hit;
            }
            if (typeof raw === 'object') {
                for (const listKey of ['url_list', 'urlList', 'urls']) {
                    const list = raw[listKey];
                    if (Array.isArray(list)) {
                        const hit = list.find((x) => typeof x === 'string' && /^https?:/i.test(x));
                        if (hit) return hit;
                    }
                }
                if (typeof raw.url === 'string' && /^https?:/i.test(raw.url)) return raw.url;
            }
        }
        return '';
    }

    function pickAlias(obj, keys) {
        for (const k of keys) {
            const v = obj[k];
            if (v !== undefined && v !== null && v !== '') return v;
        }
        return undefined;
    }

    /**
     * Như pickAlias nhưng CHỈ nhận chữ. Vài nền tảng để trường tiêu đề/tác giả là object
     * (vd Instagram: caption = {text: ...}) — String(object) ra "[object Object]" và đã lọt
     * vào bộ sưu tập thật, nên chặn tại đây.
     */
    function pickText(obj, keys) {
        for (const k of keys) {
            const v = obj?.[k];
            if (typeof v === 'string' && v.trim()) return v;
            if (typeof v === 'number' && Number.isFinite(v)) return String(v);
            // Dạng {text: "..."} / {name: "..."} vẫn lấy được phần chữ bên trong.
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                for (const inner of ['text', 'name', 'title', 'content']) {
                    if (typeof v[inner] === 'string' && v[inner].trim()) return v[inner];
                }
            }
        }
        return undefined;
    }

    /**
     * Lùng trong các khối JSON của trang object mô tả ĐÚNG video này.
     *
     * Quy tắc an toàn (quan trọng): thà không có số liệu còn hơn có số liệu của video khác.
     * Trang kiểu bảng tin nhúng JSON của hàng chục video; lấy "object giống video nhất"
     * sẽ gán nhầm lượt xem/tim/tên kênh của một video hoàn toàn khác. Nên:
     *   - có object trùng id  → dùng object đó;
     *   - không trùng id nhưng cả trang chỉ có ĐÚNG 1 object dạng video → dùng (trang 1 video);
     *   - không trùng id mà có nhiều object → trả rỗng, không đoán.
     */
    function findVideoNode(blobs, videoId) {
        let best = null;
        let bestScore = 0;
        let idMatched = null;
        let candidateCount = 0;
        const seen = new Set();
        const MAX_NODES = 200000;
        let visited = 0;

        const walk = (node) => {
            if (visited++ > MAX_NODES || node === null || typeof node !== 'object') return;
            if (seen.has(node)) return;
            seen.add(node);

            if (!Array.isArray(node)) {
                const stats = statsContainer(node);
                let groups = 0;
                for (const keys of Object.values(FIELD_ALIASES)) {
                    if (pickAlias(stats, keys) !== undefined) groups++;
                }
                if (groups > 0) {
                    // Cộng điểm cho những dấu hiệu "đây là object mô tả video" chứ không phải
                    // riêng cụm số liệu: có tiêu đề, có tác giả.
                    let score = groups;
                    const hasTitle = pickAlias(node, TITLE_KEYS) !== undefined;
                    const hasAuthor = !!(node.author || node.owner || node.user || node.uploader);
                    if (hasTitle) score += 2;
                    if (hasAuthor) score += 2;
                    // Chỉ đếm là "ứng viên video" khi trông thật sự giống một video, để cụm
                    // số liệu lồng bên trong không bị đếm thành ứng viên thứ hai.
                    if (hasTitle || hasAuthor) candidateCount++;

                    const idHit = videoId && NODE_ID_KEYS
                        .some((k) => node[k] !== undefined && String(node[k]) === String(videoId));
                    if (idHit && !idMatched) idMatched = node;
                    if (score > bestScore) { bestScore = score; best = node; }
                }
            }
            for (const v of Array.isArray(node) ? node : Object.values(node)) {
                if (v && typeof v === 'object') walk(v);
            }
        };

        for (const b of blobs) walk(b);

        if (idMatched) return idMatched;
        // Không khớp id: chỉ tin khi cả trang chỉ có một ứng viên duy nhất.
        if (candidateCount === 1 && best) return best;
        return {};
    }

    function readMeta(sel) {
        const el = document.querySelector(sel);
        return (el && (el.getAttribute('content') || '').trim()) || '';
    }

    // Schema.org VideoObject — YouTube/Bilibili và nhiều trang khác nhúng sẵn, có cả số liệu.
    function readJsonLd() {
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
            const data = safeJson(s.textContent || '');
            if (!data) continue;
            const list = Array.isArray(data) ? data : [data];
            for (const item of list) {
                if (!item || typeof item !== 'object') continue;
                const type = item['@type'];
                const isVideo = type === 'VideoObject' || (Array.isArray(type) && type.includes('VideoObject'));
                if (isVideo) return item;
            }
        }
        return null;
    }

    function jsonLdStat(ld, typeName) {
        const raw = ld && ld.interactionStatistic;
        if (!raw) return undefined;
        for (const s of Array.isArray(raw) ? raw : [raw]) {
            const t = s && (s.interactionType?.['@type'] || s.interactionType || '');
            if (String(t).includes(typeName)) return s.userInteractionCount;
        }
        return undefined;
    }

    /**
     * Gom thông tin video đang xem để gửi kèm đề xuất.
     * 3 lớp, lớp sau chỉ bù chỗ lớp trước thiếu:
     *   1. JSON trang nhúng sẵn  (đủ số liệu nhất)
     *   2. JSON-LD VideoObject   (chuẩn schema.org)
     *   3. thẻ og: / twitter:    (gần như trang nào cũng có, nhưng chỉ tiêu đề + ảnh)
     */
    function collectVideoMetadata(pageUrl, videoId) {
        const meta = {
            title: '', description: '', author_name: '', author_username: '',
            thumbnail_url: '', views_count: 0, likes_count: 0, comments_count: 0, shares_count: 0,
        };

        let node = {};
        try { node = findVideoNode(collectPageJson(), videoId); } catch { node = {}; }
        const stats = statsContainer(node);
        const author = authorContainer(node);

        meta.views_count = parseCount(pickAlias(stats, FIELD_ALIASES.views));
        meta.likes_count = parseCount(pickAlias(stats, FIELD_ALIASES.likes));
        meta.comments_count = parseCount(pickAlias(stats, FIELD_ALIASES.comments));
        meta.shares_count = parseCount(pickAlias(stats, FIELD_ALIASES.shares));
        meta.title = (pickText(node, TITLE_KEYS) ?? '').slice(0, 500);
        // YouTube để author là chuỗi thẳng, các trang khác để là object.
        const authorRaw = pickText(author, AUTHOR_BOX_NAME_KEYS)
            ?? (typeof node.author === 'string' ? node.author : undefined)
            ?? (typeof node.uploader === 'string' ? node.uploader : undefined)
            ?? pickText(node, AUTHOR_NAME_KEYS);
        meta.author_name = (authorRaw ?? '').slice(0, 255);
        meta.author_username = (pickText(author, AUTHOR_ID_KEYS) ?? pickText(node, AUTHOR_ID_KEYS) ?? '').slice(0, 255);
        // Douyin/Kuaishou giấu ảnh bìa trong node video chứ không có thẻ og:image.
        meta.thumbnail_url = pickCover(node) || pickCover(node.video) || pickCover(node.thumbnail) || '';

        // Thẻ og:/JSON-LD mô tả CẢ TRANG, không phải video đang rê chuột. Ở bảng tin
        // Facebook chúng mô tả chính Facebook (tiêu đề "Facebook", ảnh là logo). Chỉ tin
        // chúng khi trang này đúng là trang của video đang đề xuất.
        const pageRef = [
            location.href,
            document.querySelector('link[rel="canonical"]')?.href,
            document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
        ].map((u) => (u ? detectVideoRef(u) : null)).find((r) => r && r.videoId);
        const pageIsThisVideo = !!(videoId && pageRef && String(pageRef.videoId) === String(videoId));

        const ld = pageIsThisVideo ? readJsonLd() : null;
        if (ld) {
            if (!meta.title) meta.title = String(ld.name || '').slice(0, 500);
            if (!meta.description) meta.description = String(ld.description || '').slice(0, 2000);
            if (!meta.thumbnail_url) {
                const t = ld.thumbnailUrl;
                meta.thumbnail_url = String(Array.isArray(t) ? t[0] || '' : t || '');
            }
            if (!meta.author_name) meta.author_name = String(ld.author?.name || ld.creator?.name || '').slice(0, 255);
            if (!meta.views_count) meta.views_count = parseCount(jsonLdStat(ld, 'Watch'));
            if (!meta.likes_count) meta.likes_count = parseCount(jsonLdStat(ld, 'Like'));
            if (!meta.comments_count) meta.comments_count = parseCount(jsonLdStat(ld, 'Comment'));
            if (!meta.shares_count) meta.shares_count = parseCount(jsonLdStat(ld, 'Share'));
        }

        if (pageIsThisVideo) {
            const siteName = readMeta('meta[property="og:site_name"]');
            if (!meta.title) {
                const ogTitle = readMeta('meta[property="og:title"]') || readMeta('meta[name="twitter:title"]') || document.title || '';
                // "Facebook", "TikTok - Make Your Day"... là tên trang, không phải tên video.
                if (ogTitle && ogTitle.trim() !== (siteName || '').trim()) meta.title = ogTitle.slice(0, 500);
            }
            if (!meta.description) {
                meta.description = (readMeta('meta[property="og:description"]') || readMeta('meta[name="description"]') || '').slice(0, 2000);
            }
            if (!meta.thumbnail_url) {
                meta.thumbnail_url = readMeta('meta[property="og:image"]') || readMeta('meta[name="twitter:image"]') || '';
            }
        }
        // Ảnh bìa dạng data: nhét vào DB thì phình cột — bỏ, để trống còn hơn.
        if (/^data:/i.test(meta.thumbnail_url) || meta.thumbnail_url.length > 1900) meta.thumbnail_url = '';

        // Lấy tên kênh từ URL trang cá nhân nếu JSON không có (vd .../@tenkenh/video/123)
        if (!meta.author_username) {
            const m = pageUrl.match(/\/@([\w.-]{2,})/);
            if (m) meta.author_username = m[1];
        }
        return meta;
    }

    // --- Shadow DOM overlay ---
    const HOST_ID = 'vcb-vdl-host-9f2a';
    let hostEl = document.getElementById(HOST_ID);
    if (hostEl) return; // đã inject rồi (vd trang SPA re-run script)
    hostEl = document.createElement('div');
    hostEl.id = HOST_ID;
    const shadow = hostEl.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
        <style>
            :host { all: initial; }
            .btn {
                position: fixed;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                gap: 6px;
                background: #7c3aed;
                color: #fff;
                border-radius: 999px;
                padding: 7px 12px 7px 8px;
                font: 600 12px/1.2 -apple-system, "Segoe UI", Roboto, sans-serif;
                box-shadow: 0 4px 14px rgba(0,0,0,.28);
                cursor: pointer;
                opacity: 0;
                transform: translateY(4px) scale(.94);
                transition: opacity .12s ease, transform .12s ease, background .12s ease;
                pointer-events: none;
                user-select: none;
            }
            .btn.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
            .btn:hover { background: #6d28d9; }
            .btn.busy { background: #16a34a; }
            .btn svg { width: 15px; height: 15px; flex: none; }
            .btn .label { white-space: nowrap; }
            .toast {
                position: fixed;
                z-index: 2147483647;
                background: #111827;
                color: #fff;
                font: 500 12px/1.3 -apple-system, "Segoe UI", Roboto, sans-serif;
                padding: 8px 12px;
                border-radius: 8px;
                box-shadow: 0 4px 14px rgba(0,0,0,.3);
                opacity: 0;
                transform: translateY(6px);
                transition: opacity .15s ease, transform .15s ease;
                pointer-events: none;
                max-width: 260px;
            }
            .toast.visible { opacity: 1; transform: translateY(0); }
            .panel {
                position: fixed;
                z-index: 2147483647;
                width: 220px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 8px 28px rgba(0,0,0,.32);
                padding: 10px;
                font: 500 12px/1.3 -apple-system, "Segoe UI", Roboto, sans-serif;
                color: #1f2937;
                opacity: 0;
                transform: translateY(4px) scale(.97);
                transition: opacity .12s ease, transform .12s ease;
                pointer-events: none;
            }
            .panel.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
            .panel .seg-row { display: flex; gap: 6px; margin-bottom: 6px; }
            .panel .seg-btn {
                flex: 1;
                padding: 7px 4px;
                border: 1px solid #e5e7eb;
                background: #fff;
                border-radius: 8px;
                font-size: 11.5px;
                font-weight: 600;
                color: #4b5563;
                cursor: pointer;
            }
            .panel .seg-btn.active { border-color: #7c3aed; background: #f5f3ff; color: #6d28d9; }
            .panel .dl-btn {
                width: 100%;
                margin-top: 4px;
                padding: 9px;
                background: #7c3aed;
                color: #fff;
                border: none;
                border-radius: 8px;
                font-size: 12.5px;
                font-weight: 700;
                cursor: pointer;
            }
            .panel .dl-btn:hover { background: #6d28d9; }
            .panel .dl-btn:disabled { opacity: .6; cursor: default; }
            .panel .propose-btn {
                width: 100%;
                margin-top: 6px;
                padding: 8px;
                background: #fff;
                color: #6d28d9;
                border: 1px solid #ddd6fe;
                border-radius: 8px;
                font-size: 12.5px;
                font-weight: 700;
                cursor: pointer;
            }
            .panel .propose-btn:hover { background: #f5f3ff; }
            .panel .propose-btn:disabled { opacity: .6; cursor: default; }
        </style>
        <div class="btn" id="btn" role="button" aria-label="Tải video qua VCB">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3v11m0 0 4-4m-4 4-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M5 18v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="label">Tải video</span>
        </div>
        <div class="panel" id="panel">
            <div class="seg-row" id="panelFormatRow">
                <button type="button" class="seg-btn" data-format="mp4">Video MP4</button>
                <button type="button" class="seg-btn" data-format="mp3">Âm thanh MP3</button>
            </div>
            <div class="seg-row" id="panelQualityRow">
                <button type="button" class="seg-btn" data-quality="best">Tốt nhất</button>
                <button type="button" class="seg-btn" data-quality="1080">1080p</button>
                <button type="button" class="seg-btn" data-quality="720">720p</button>
            </div>
            <button type="button" class="dl-btn" id="panelDownload">⬇ Tải xuống</button>
            <button type="button" class="propose-btn" id="panelPropose">★ Đề xuất vào VCB</button>
        </div>
        <div class="toast" id="toast"></div>
    `;
    document.documentElement.appendChild(hostEl);
    const btnEl = shadow.getElementById('btn');
    const toastEl = shadow.getElementById('toast');
    const panelEl = shadow.getElementById('panel');
    const panelDownloadBtn = shadow.getElementById('panelDownload');
    const panelProposeBtn = shadow.getElementById('panelPropose');

    let panelOpen = false;
    let panelFormat = DEFAULTS.defaultFormat;
    let panelQuality = DEFAULTS.defaultQuality;

    let toastTimer = null;
    function showToast(text, ms = 1800) {
        toastEl.textContent = text;
        toastEl.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('visible'), ms);
    }

    function positionButton(video) {
        const rect = video.getBoundingClientRect();
        const top = Math.max(8, rect.top + 8);
        const left = Math.min(window.innerWidth - 132, Math.max(8, rect.right - 132));
        btnEl.style.top = `${top}px`;
        btnEl.style.left = `${left}px`;
        toastEl.style.top = `${top + 34}px`;
        toastEl.style.left = `${left}px`;
        if (panelOpen) positionPanel();
    }

    function positionPanel() {
        // Neo ngay dưới nút hover — dùng chính vị trí hiện tại của nút (đã được
        // positionButton đặt trước đó) thay vì tính lại từ video, để panel luôn bám
        // đúng theo nút dù trang cuộn/video di chuyển.
        const btnTop = parseFloat(btnEl.style.top) || 8;
        const btnLeft = parseFloat(btnEl.style.left) || 8;
        const top = Math.min(window.innerHeight - 160, btnTop + 40);
        const left = Math.min(window.innerWidth - 228, Math.max(8, btnLeft));
        panelEl.style.top = `${top}px`;
        panelEl.style.left = `${left}px`;
    }

    function setPanelActive(row, attr, value) {
        Array.from(row.children).forEach((btn) => {
            btn.classList.toggle('active', btn.dataset[attr] === value);
        });
    }

    function openPanel() {
        panelFormat = settings.defaultFormat;
        panelQuality = settings.defaultQuality;
        setPanelActive(shadow.getElementById('panelFormatRow'), 'format', panelFormat);
        setPanelActive(shadow.getElementById('panelQualityRow'), 'quality', panelQuality);
        panelDownloadBtn.disabled = false;
        panelDownloadBtn.textContent = '⬇ Tải xuống';
        panelProposeBtn.disabled = false;
        panelProposeBtn.textContent = '★ Đề xuất vào VCB';
        panelOpen = true;
        positionPanel();
        panelEl.classList.add('visible');
    }

    function closePanel() {
        panelOpen = false;
        panelEl.classList.remove('visible');
    }

    function showButtonFor(video) {
        if (panelOpen && video !== activeVideo) closePanel();
        activeVideo = video;
        positionButton(video);
        btnEl.classList.add('visible');
        btnEl.classList.remove('busy');
        btnEl.querySelector('.label').textContent = 'Tải video';
    }

    function hideButton() {
        if (panelOpen) return; // panel đang mở — người dùng có thể đang thao tác, đừng ẩn nút
        activeVideo = null;
        btnEl.classList.remove('visible');
    }

    function scheduleReposition() {
        if (!activeVideo || rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(() => {
            rafScheduled = false;
            if (activeVideo && activeVideo.isConnected) positionButton(activeVideo);
            else hideButton();
        });
    }

    function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideButton, HIDE_DELAY_MS);
    }
    function cancelHide() {
        clearTimeout(hideTimer);
    }

    // TikTok/YouTube/Facebook thường phủ 1 lớp overlay (div bắt click/control riêng) lên
    // trên thẻ <video> thật — overlay đó là ANH EM (sibling) chứ không phải tổ tiên của
    // video, nên e.target.closest('video') không tìm ra được khi chuột đang ở overlay.
    // elementsFromPoint quét toàn bộ ngăn xếp phần tử tại đúng toạ độ chuột (bất kể lớp nào
    // đang "nổi" lên trên bắt sự kiện), nên tìm được video kể cả khi nó bị che.
    function videoAtEvent(e) {
        const direct = e.target && e.target.closest ? e.target.closest('video') : null;
        if (direct) return direct;
        const stack = document.elementsFromPoint(e.clientX, e.clientY);
        return stack.find((el) => el.tagName === 'VIDEO') || null;
    }

    function qualifies(video) {
        if (!video || video.dataset.vcbIgnore != null) return false;
        const rect = video.getBoundingClientRect();
        if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) return false;
        const style = getComputedStyle(video);
        return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0.05;
    }

    document.addEventListener(
        'mouseover',
        (e) => {
            if (!settingsReady || !settings.hoverIconEnabled) return;
            if (settings.disabledSites.includes(hostname)) return;
            if (isOwnAppOrigin()) return;
            const video = videoAtEvent(e);
            if (!video || !qualifies(video)) return;
            cancelHide();
            showButtonFor(video);
        },
        true
    );

    document.addEventListener(
        'mouseout',
        (e) => {
            const video = videoAtEvent(e);
            if (!activeVideo) return;
            if (!video || video !== activeVideo) scheduleHide();
        },
        true
    );

    btnEl.addEventListener('mouseenter', cancelHide);
    btnEl.addEventListener('mouseleave', scheduleHide);
    panelEl.addEventListener('mouseenter', cancelHide);
    panelEl.addEventListener('mouseleave', scheduleHide);

    window.addEventListener('scroll', scheduleReposition, true);
    window.addEventListener('resize', scheduleReposition);

    function resetButtonSoon() {
        setTimeout(() => {
            if (activeVideo) {
                btnEl.classList.remove('busy');
                btnEl.querySelector('.label').textContent = 'Tải video';
            }
        }, 1200);
    }

    // Khi extension được reload/cập nhật (chrome://extensions → Tải lại) mà trang đang mở
    // KHÔNG được F5 lại, content script cũ vẫn còn chạy nhưng mất kết nối tới extension —
    // gọi chrome.runtime.sendMessage lúc đó ném "Extension context invalidated" (đôi khi
    // ngay lập tức, không qua callback), khiến người dùng bấm nút mà không thấy gì xảy ra,
    // không toast, không lỗi hiển thị. Kiểm tra trước + bọc try/catch để báo rõ thay vì im lặng.
    function isExtensionContextValid() {
        try {
            return !!(chrome.runtime && chrome.runtime.id);
        } catch {
            return false;
        }
    }

    function sendMessageSafe(msg, callback) {
        if (!isExtensionContextValid()) {
            showToast('Extension vừa được cập nhật — hãy tải lại (F5) trang này rồi thử lại.', 3500);
            btnEl.classList.remove('busy');
            panelDownloadBtn.disabled = false;
            panelDownloadBtn.textContent = '⬇ Tải xuống';
            return;
        }
        try {
            chrome.runtime.sendMessage(msg, callback);
        } catch {
            showToast('Extension vừa được cập nhật — hãy tải lại (F5) trang này rồi thử lại.', 3500);
            btnEl.classList.remove('busy');
            panelDownloadBtn.disabled = false;
            panelDownloadBtn.textContent = '⬇ Tải xuống';
        }
    }

    function finishClick(res, directAttempted) {
        if (chrome.runtime.lastError) {
            showToast('Không kết nối được extension, thử tải lại trang.');
            btnEl.classList.remove('busy');
            return;
        }
        if (directAttempted && res && res.ok && !res.fellBackToPageFlow) {
            showToast('Đang tải trực tiếp qua trình duyệt ✓');
        } else if (res && res.ok) {
            showToast('Đã mở trang tải video ở tab khác ✓');
        } else {
            showToast((res && res.error) || 'Có lỗi xảy ra');
        }
        resetButtonSoon();
    }

    // Tải bằng đúng lựa chọn format/quality. Link bắt trực tiếp (chrome.downloads) chỉ lưu
    // NGUYÊN VẸN file trình duyệt đã tải — không tách được audio/đổi chất lượng, nên chỉ
    // dùng đường đó khi người dùng chọn đúng "Video MP4 + Tốt nhất" (mặc định); các lựa
    // chọn khác (MP3, 1080p/720p cụ thể) luôn cần server (yt-dlp) xử lý.
    function runDownload(video, format, quality, { onDone } = {}) {
        const pageUrl = resolveVideoUrl(video);
        const wantsDefault = format === 'mp4' && quality === 'best';

        const openViaServer = () => {
            // auto: true — người dùng đã chọn xong định dạng/chất lượng và bấm "Tải xuống"
            // trong panel rồi, không nên bắt chọn lại lần 2 trên tab dashboard vừa mở.
            sendMessageSafe(
                { type: 'vcb-download', url: pageUrl, format, quality, auto: true },
                (res) => {
                    finishClick(res, false);
                    onDone && onDone();
                }
            );
        };

        if (!isExtensionContextValid()) {
            showToast('Extension vừa được cập nhật — hãy tải lại (F5) trang này rồi thử lại.', 3500);
            btnEl.classList.remove('busy');
            panelDownloadBtn.disabled = false;
            panelDownloadBtn.textContent = '⬇ Tải xuống';
            return;
        }

        if (!wantsDefault) {
            openViaServer();
            return;
        }
        // Hỏi background xem có bắt được link media thật (từ network traffic) cho tab
        // này không — có thì tải thẳng bằng trình duyệt (nhanh, không bị chặn bot kiểu
        // X/Instagram); không có thì rơi về luồng cũ (mở trang, server tự tải qua yt-dlp).
        sendMessageSafe({ type: 'vcb-get-captured' }, (captureRes) => {
            const directUrl = !chrome.runtime.lastError && captureRes && captureRes.url;
            if (directUrl) {
                sendMessageSafe(
                    { type: 'vcb-download-direct', url: directUrl, pageUrl },
                    (res) => {
                        finishClick(res, true);
                        onDone && onDone();
                    }
                );
            } else {
                openViaServer();
            }
        });
    }

    btnEl.addEventListener('click', () => {
        if (!activeVideo) return;
        if (settings.autoDownload) {
            // Giữ nguyên hành vi cũ: tải luôn bằng mặc định đã lưu, bỏ qua bước chọn.
            btnEl.classList.add('busy');
            btnEl.querySelector('.label').textContent = 'Đang tải...';
            runDownload(activeVideo, settings.defaultFormat, settings.defaultQuality);
            return;
        }
        if (panelOpen) closePanel();
        else openPanel();
    });

    panelDownloadBtn.addEventListener('click', () => {
        if (!activeVideo) return;
        panelDownloadBtn.disabled = true;
        panelDownloadBtn.textContent = 'Đang tải...';
        runDownload(activeVideo, panelFormat, panelQuality, {
            onDone: () => closePanel(),
        });
    });

    // Đề xuất video đang xem vào hệ thống. Không gọi API từ đây (extension không giữ JWT):
    // background mở tab Bộ Sưu Tập kèm ?propose=<link>, tab đó đã đăng nhập sẵn.
    panelProposeBtn.addEventListener('click', () => {
        if (!activeVideo) return;
        if (!isExtensionContextValid()) {
            showToast('Extension vừa được cập nhật — hãy tải lại (F5) trang này rồi thử lại.', 3500);
            return;
        }
        const ref = resolveProposable(activeVideo);

        // Không moi được mã video từ bất kỳ nguồn nào → không đề xuất, vì bản ghi sinh ra
        // sẽ không bao giờ khớp được với dữ liệu hệ thống cào về.
        if (!ref.videoId) {
            showToast(
                ref.platform
                    ? 'Chưa lấy được mã video ở trang này. Mở riêng video đó rồi bấm lại.'
                    : 'Nền tảng này chưa hỗ trợ đề xuất.',
                4500,
            );
            return;
        }

        const pageUrl = ref.url;
        panelProposeBtn.disabled = true;
        panelProposeBtn.textContent = 'Đang gửi...';
        const meta = collectVideoMetadata(pageUrl, ref.videoId);
        const restore = () => {
            panelProposeBtn.disabled = false;
            panelProposeBtn.textContent = '★ Đề xuất vào VCB';
        };
        try {
            chrome.runtime.sendMessage({
                type: 'vcb-propose',
                url: pageUrl,
                platform: ref.platform,
                videoId: ref.videoId,
                meta,
            }, (res) => {
                restore();
                if (chrome.runtime.lastError) {
                    showToast('Không kết nối được extension, thử tải lại trang.');
                    return;
                }
                if (res && res.ok) {
                    showToast(res.message || 'Đã gửi đề xuất ✓', 3500);
                    closePanel();
                } else {
                    showToast((res && res.error) || 'Không đề xuất được video này.', 4000);
                }
            });
        } catch {
            restore();
            showToast('Extension vừa được cập nhật — hãy tải lại (F5) trang này rồi thử lại.', 3500);
        }
    });

    shadow.getElementById('panelFormatRow').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-format]');
        if (!btn) return;
        panelFormat = btn.dataset.format;
        setPanelActive(shadow.getElementById('panelFormatRow'), 'format', panelFormat);
    });
    shadow.getElementById('panelQualityRow').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-quality]');
        if (!btn) return;
        panelQuality = btn.dataset.quality;
        setPanelActive(shadow.getElementById('panelQualityRow'), 'quality', panelQuality);
    });

    // Đóng panel khi bấm ra ngoài (composedPath vì phần tử nằm trong Shadow DOM) hoặc nhấn Escape.
    document.addEventListener('click', (e) => {
        if (!panelOpen) return;
        const path = e.composedPath();
        if (path.includes(panelEl) || path.includes(btnEl)) return;
        closePanel();
    }, true);
    document.addEventListener('keydown', (e) => {
        if (panelOpen && e.key === 'Escape') closePanel();
    });

    // --- Right-click (context menu) support: nhớ video vừa được click chuột phải ---
    document.addEventListener(
        'contextmenu',
        (e) => {
            const video = e.target && e.target.closest ? e.target.closest('video') : null;
            if (video) lastContextVideo = video;
        },
        true
    );

    // --- Tự nhận diện địa chỉ hệ thống ------------------------------------------
    // Trang web hệ thống nhúng <meta name="vcb-app" content="1"> (đặt ở app/layout.tsx).
    // Thấy thẻ này thì báo origin về background để lưu làm appBase — người dùng không
    // phải tự nhập địa chỉ trong trang Cài đặt nữa (địa chỉ đổi theo Cloudflare Tunnel).
    // Gửi thẳng chứ không qua sendMessageSafe() — hàm đó gắn với nút tải (hiện toast,
    // reset trạng thái nút), dùng ở đây sẽ báo nhầm cho người dùng.
    if (document.querySelector('meta[name="vcb-app"]')) {
        try {
            chrome.runtime.sendMessage({ type: 'vcb-app-detected', origin: location.origin }, () => {
                // Nuốt lastError: background không trả lời message này.
                void chrome.runtime.lastError;
            });
        } catch {
            // Extension vừa reload → context cũ chết. Lần load trang sau sẽ tự gửi lại.
        }
    }

    // --- Nghe job-hoàn-tất từ trang web hệ thống (page.tsx bắn CustomEvent này khi 1 lượt tải
    // xong/lỗi) và báo lại cho background để hiện notification hệ điều hành. Chỉ trang chính chủ
    // mới bắn được sự kiện này nên không cần kiểm tra isOwnAppOrigin() ở đây.
    window.addEventListener('vcb-download-complete', (e) => {
        const detail = e.detail || {};
        chrome.runtime.sendMessage({
            type: 'vcb-job-notify',
            success: !!detail.success,
            title: detail.title,
            error: detail.error,
        });
    });

    // --- Messaging từ background/popup ---
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type === 'vcb-resolve-last-video') {
            sendResponse({ url: lastContextVideo ? resolveVideoUrl(lastContextVideo) : null });
            return;
        }
        if (msg?.type === 'vcb-scan') {
            const seen = new Set();
            const results = [];
            const candidates = document.querySelectorAll('video');
            for (let i = 0; i < candidates.length && results.length < 25; i++) {
                const v = candidates[i];
                if (!qualifies(v)) continue;
                const url = resolveVideoUrl(v);
                if (seen.has(url)) continue;
                seen.add(url);
                results.push({ url, poster: v.poster || null });
            }
            sendResponse({ videos: results, disabled: isOwnAppOrigin() });
            return;
        }
        if (msg?.type === 'vcb-settings-updated') {
            settings = { ...DEFAULTS, ...msg.settings };
            return;
        }
        // Menu chuột phải: background xin thông tin video đọc từ trang này.
        if (msg?.type === 'vcb-collect-meta') {
            const ref = resolveProposable(
                lastContextVideo || document.querySelector('video'),
                msg.url ? [msg.url] : [],
            );
            sendResponse({
                url: ref.url,
                platform: ref.platform,
                videoId: ref.videoId,
                meta: collectVideoMetadata(ref.url, ref.videoId),
            });
            return;
        }
        // Gửi đề xuất hộ, CHỈ khi content script này đang chạy trên chính trang web hệ thống:
        // ở đây mới có phiên đăng nhập (token trong localStorage của origin đó). Nhờ vậy người
        // dùng đang lướt Douyin không bị nhảy sang tab khác.
        if (msg?.type === 'vcb-propose-api') {
            proposeViaApp(msg.payload).then(sendResponse);
            return true; // trả lời bất đồng bộ
        }
    });

    /** Gọi API đề xuất bằng cookie phiên của trang web hệ thống (chạy trên chính origin đó). */
    async function proposeViaApp(payload) {
        if (!document.querySelector('meta[name="vcb-app"]')) {
            return { ok: false, error: 'Tab này không phải trang hệ thống.' };
        }

        try {
            const res = await fetch(`${location.origin}/api/extension/propose`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 401) return { ok: false, error: 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập, vui lòng đăng nhập trước.' };
            if (!res.ok) return { ok: false, error: data.message || 'Hệ thống từ chối đề xuất này.' };
            return { ok: true, message: data.message || 'Đã gửi đề xuất ✓', direct: !!data.direct };
        } catch {
            return { ok: false, error: 'Không kết nối được tới hệ thống.' };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Gợi ý dịch tiếng Việt → tiếng Trung cho ô tìm kiếm trên các trang TQ.
    // Các nền tảng này chỉ ra kết quả tốt khi tìm bằng tiếng Trung; user gõ tiếng
    // Việt thì hiện 1 chip nhỏ dưới ô nhập, bấm (hoặc Tab) để thay chữ vào ô.
    // Cố ý KHÔNG chặn phím Enter — các trang này có JS riêng xử lý submit, chặn
    // Enter rất dễ làm kẹt ô tìm kiếm của trang.
    // ═══════════════════════════════════════════════════════════════════════
    const CN_SEARCH_HOSTS = ['douyin.com', 'xiaohongshu.com', 'rednote.com', 'bilibili.com', 'kuaishou.com'];
    const isCnSearchSite = CN_SEARCH_HOSTS.some((h) => hostname.includes(h));

    let cnChipEl = null;
    let cnChipInput = null;
    let cnChipTranslated = '';
    let cnDebounceTimer = null;
    let cnReqId = 0;

    // So sánh code point thay vì regex chứa ký tự CJK nguyên bản: giữ nguồn thuần ASCII
    // để không hỏng âm thầm nếu file bị lưu/đóng gói sai mã hoá.
    // Dải U+4E00–U+9FFF = CJK Unified Ideographs.
    function hasCjk(text) {
        for (const ch of text) {
            const code = ch.codePointAt(0) || 0;
            if (code >= 0x4e00 && code <= 0x9fff) return true;
        }
        return false;
    }

    // Dùng cả thuộc tính DOM lẫn attribute: vài trang gán contenteditable động, và
    // isContentEditable không phải môi trường nào cũng có.
    function isEditableHost(el) {
        return !!el && (el.isContentEditable === true || el.hasAttribute?.('contenteditable'));
    }

    function readInputValue(el) {
        if (!el) return '';
        return isEditableHost(el) ? (el.textContent || '') : (el.value || '');
    }

    // Các trang này dựng bằng React/Vue: gán thẳng .value sẽ bị framework ghi đè vì
    // state nội bộ không đổi. Phải gọi native setter rồi bắn 'input' để framework nhận.
    function setInputValue(el, value) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
            // Chọn prototype theo ĐÚNG loại thẻ. Gọi setter của HTMLInputElement lên thẻ
            // khác (vd div) sẽ ném TypeError và làm chết luôn handler.
            const proto = tag === 'TEXTAREA'
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            try {
                if (setter) setter.call(el, value);
                else el.value = value;
            } catch {
                el.value = value;
            }
        } else {
            // contenteditable hoặc bất kỳ thứ gì khác — an toàn nhất là ghi text.
            el.textContent = value;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function hideCnChip() {
        if (cnChipEl) {
            cnChipEl.remove();
            cnChipEl = null;
        }
        cnChipTranslated = '';
        // Bỏ tham chiếu tới ô nhập, tránh giữ 1 node đã bị gỡ khỏi DOM (các trang này
        // là SPA, dựng/huỷ DOM liên tục).
        cnChipInput = null;
    }

    function applyCnTranslation() {
        if (!cnChipInput || !cnChipTranslated) return;
        setInputValue(cnChipInput, cnChipTranslated);
        cnChipInput.focus();
        hideCnChip();
    }

    /** Bám theo ô nhập khi trang cuộn; ô rời khỏi màn hình thì mới bỏ chip. */
    function repositionCnChip() {
        if (!cnChipEl || !cnChipInput) return;
        if (!cnChipInput.isConnected) { hideCnChip(); return; }
        const rect = cnChipInput.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) { hideCnChip(); return; }
        cnChipEl.style.top = `${Math.round(rect.bottom + 6)}px`;
        cnChipEl.style.left = `${Math.round(rect.left)}px`;
    }

    function showCnChip(input, translated) {
        hideCnChip();
        cnChipInput = input;
        cnChipTranslated = translated;

        const rect = input.getBoundingClientRect();
        const chip = document.createElement('div');
        chip.setAttribute('data-vcb-cn-chip', '1');
        chip.style.cssText = [
            'position:fixed',
            `top:${Math.round(rect.bottom + 6)}px`,
            `left:${Math.round(rect.left)}px`,
            'z-index:2147483647',
            'background:#111827',
            'color:#fff',
            'font-size:13px',
            'font-family:system-ui,-apple-system,sans-serif',
            'padding:7px 11px',
            'border-radius:8px',
            'box-shadow:0 4px 14px rgba(0,0,0,.35)',
            'display:flex',
            'align-items:center',
            'gap:8px',
            'cursor:pointer',
            'max-width:min(420px,90vw)',
        ].join(';');
        // Dựng bằng textContent thay vì innerHTML: bản dịch bắt nguồn từ text người dùng
        // gõ trên trang lạ, chèn thẳng vào innerHTML là mở đường cho injection.
        const mkSpan = (text, css) => {
            const s = document.createElement('span');
            s.style.cssText = css;
            s.textContent = text;
            return s;
        };
        chip.appendChild(mkSpan('Tìm bằng tiếng Trung:', 'opacity:.7'));
        chip.appendChild(mkSpan(translated, 'color:#fbbf24;font-weight:700'));
        chip.appendChild(mkSpan('bấm / Tab', 'opacity:.55;font-size:11px'));
        chip.addEventListener('mousedown', (e) => {
            // mousedown thay vì click: click xảy ra sau blur nên chip đã bị gỡ mất.
            e.preventDefault();
            applyCnTranslation();
        });
        document.body.appendChild(chip);
        cnChipEl = chip;
    }

    function onCnInput(e) {
        const el = e.target;
        if (!el || !isTextEntry(el)) return;
        if (settings.cnTranslateEnabled === false) return;

        const text = readInputValue(el).trim();
        clearTimeout(cnDebounceTimer);

        // Chỉ gợi ý khi có chữ Latin và CHƯA phải tiếng Trung.
        if (text.length < 2 || hasCjk(text) || !/[a-zA-ZÀ-ỹ]/.test(text)) {
            hideCnChip();
            return;
        }

        const myReq = ++cnReqId;
        cnDebounceTimer = setTimeout(() => {
            sendMessageSafe({ type: 'vcb-translate-zh', text }, (res) => {
                if (myReq !== cnReqId) return; // đã có lần gõ mới hơn

                if (chrome.runtime.lastError) {
                    showCnNotice('Extension vừa cập nhật — tải lại trang (F5) rồi gõ lại.');
                    return;
                }
                if (!res?.ok) {
                    // 'skip' = vốn đã là tiếng Trung, im lặng là đúng. Còn lại phải nói ra,
                    // im lặng khiến người dùng tưởng tính năng không tồn tại.
                    if (!res || res.reason === 'skip') { hideCnChip(); return; }
                    showCnNotice(cnFailureText(res));
                    return;
                }

                // Không dùng document.activeElement: trang Trung Quốc bung khung gợi ý ngay
                // khi gõ và hay cướp focus, làm chip không bao giờ hiện. Điều kiện đúng là
                // ô còn nằm trên trang và nội dung chưa đổi so với lúc gửi đi dịch.
                if (!el.isConnected || readInputValue(el).trim() !== text) return;
                showCnChip(el, res.translated);
            });
        }, 600);
    }

    function cnFailureText(res) {
        const where = res?.base ? ` (${String(res.base).replace(/^https?:\/\//, '')})` : '';
        if (res?.reason === 'offline') return `Chưa kết nối được hệ thống VCB${where} để dịch.`;
        if (res?.reason === 'server') return `Hệ thống VCB${where} đang lỗi, chưa dịch được.`;
        return 'Chưa dịch được từ khoá này.';
    }

    // Chip báo lỗi: cùng chỗ, cùng kiểu với chip gợi ý nhưng không bấm được, tự tắt sau 4s.
    // Chỉ nhắc lại sau 30s để không nổ liên tục theo từng phím gõ.
    let cnLastNoticeAt = 0;
    function showCnNotice(message) {
        hideCnChip();
        const now = Date.now();
        if (now - cnLastNoticeAt < 30000) return;
        cnLastNoticeAt = now;

        const el = document.activeElement;
        const rect = (el && el.getBoundingClientRect) ? el.getBoundingClientRect() : { bottom: 60, left: 20 };
        const box = document.createElement('div');
        box.setAttribute('data-vcb-cn-chip', '1');
        box.style.cssText = [
            'position:fixed',
            `top:${Math.round(rect.bottom + 6)}px`,
            `left:${Math.round(rect.left)}px`,
            'z-index:2147483647',
            'background:#7f1d1d', 'color:#fff', 'font-size:12.5px',
            'font-family:system-ui,-apple-system,sans-serif',
            'padding:7px 11px', 'border-radius:8px',
            'box-shadow:0 4px 14px rgba(0,0,0,.35)',
            'max-width:min(420px,90vw)',
        ].join(';');
        box.textContent = `VCB: ${message}`;
        document.body.appendChild(box);
        cnChipEl = box;
        cnChipTranslated = '';
        setTimeout(() => { if (cnChipEl === box) hideCnChip(); }, 4000);
    }

    function isTextEntry(el) {
        if (!el || el.disabled || el.readOnly) return false;
        if (isEditableHost(el)) return true;
        const tag = el.tagName;
        if (tag === 'TEXTAREA') return true;
        if (tag !== 'INPUT') return false;
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        return type === 'text' || type === 'search';
    }

    if (isCnSearchSite) {
        // Bắt sự kiện ở document (capture) thay vì gắn selector cụ thể từng trang —
        // markup/class của các trang này đổi liên tục, hardcode selector sẽ hỏng.
        document.addEventListener('input', onCnInput, true);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && cnChipEl && cnChipTranslated) {
                e.preventDefault();
                applyCnTranslation();
            } else if (e.key === 'Escape') {
                hideCnChip();
            }
        }, true);
        // KHÔNG ẩn chip khi ô mất focus. Douyin/Xiaohongshu vừa gõ là bung ngay khung gợi ý
        // của chính trang và cướp focus, nên 'focusout' bắn liên tục — chip bị xoá trước khi
        // người dùng kịp nhìn thấy, thành ra tính năng trông như không tồn tại.
        // Chỉ ẩn khi người dùng thật sự bấm ra chỗ khác (ngoài chip và ngoài ô đang gõ).
        document.addEventListener('mousedown', (e) => {
            if (!cnChipEl) return;
            const path = e.composedPath ? e.composedPath() : [e.target];
            if (path.includes(cnChipEl) || (cnChipInput && path.includes(cnChipInput))) return;
            hideCnChip();
        }, true);
        // Cuộn trang thì bám theo ô thay vì biến mất — khung gợi ý của trang cũng bắn scroll,
        // ẩn đi là mất chip oan. Chỉ bỏ khi ô đã rời khỏi màn hình.
        window.addEventListener('scroll', repositionCnChip, true);
        window.addEventListener('resize', repositionCnChip);
    }

    // --- Load settings ---
    chrome.storage.sync.get(DEFAULTS, (stored) => {
        settings = { ...DEFAULTS, ...stored };
        settingsReady = true;
    });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        for (const [key, { newValue }] of Object.entries(changes)) {
            if (key in DEFAULTS) settings[key] = newValue;
        }
    });
})();
