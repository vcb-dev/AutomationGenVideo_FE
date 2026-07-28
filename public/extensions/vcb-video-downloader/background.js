// VCB Video Downloader — background service worker
// Base URL trỏ tới trang web hệ thống được lưu trong chrome.storage (cấu hình qua trang Options),
// vì hệ thống hiện chạy qua Cloudflare Tunnel nên domain có thể đổi theo thời gian.
const DEFAULT_APP_BASE = 'http://localhost:3001';
const DEFAULTS = {
    appBase: DEFAULT_APP_BASE,
    defaultFormat: 'mp4',
    defaultQuality: 'best',
    autoDownload: false,
    hoverIconEnabled: true,
    // Gợi ý dịch Việt→Trung ở ô tìm kiếm trên các trang TQ (Douyin, Xiaohongshu...).
    cnTranslateEnabled: true,
    disabledSites: [],
};
const CONTEXT_MENU_ID = 'vcb-download-video';
const PROPOSE_MENU_ID = 'vcb-propose-video';

// --- Bắt link media thật từ network traffic (kiểu Cốc Cốc) ---------------
// Khi trang tự tải video bằng phiên/cookie thật của người dùng, ta "nhìn" lại
// response đó thay vì nhờ server tự đoán lại link (dễ bị nền tảng chặn bot vì
// không có cookie/phiên thật — xem content.js/README cho chi tiết). Chỉ nhắm
// tới file media progressive (1 file trọn vẹn) — video dạng DASH/HLS nhiều
// luồng (YouTube, Reels chất lượng cao) sẽ không khớp bộ lọc, tự rơi về luồng
// yt-dlp cũ qua trang web, không có gì thay đổi cho các trường hợp đó.
const CAPTURE_MAX_PER_TAB = 20;
const CAPTURE_MAX_AGE_MS = 20_000;
const CAPTURE_MIN_SIZE_BYTES = 50 * 1024;
const mediaCaptures = new Map(); // tabId -> candidate[]

function isLikelyMediaFile(url, contentType) {
    const ct = (contentType || '').toLowerCase();
    if (ct.startsWith('video/') || ct.startsWith('audio/')) return true;
    // Vài CDN trả content-type chung chung (application/octet-stream) —
    // xét thêm đuôi file, loại trừ .ts (segment HLS lẻ, không phải file trọn vẹn).
    if (ct === 'application/octet-stream' || ct === '') {
        try {
            const path = new URL(url).pathname.toLowerCase();
            if (/\.(ts)$/.test(path)) return false;
            return /\.(mp4|webm|mov|m4v|m4a|mp3)$/.test(path);
        } catch {
            return false;
        }
    }
    return false;
}

function addCapture(tabId, candidate) {
    if (tabId == null || tabId < 0) return;
    const list = mediaCaptures.get(tabId) || [];
    list.push(candidate);
    if (list.length > CAPTURE_MAX_PER_TAB) list.shift();
    mediaCaptures.set(tabId, list);
}

function getBestCapture(tabId) {
    const list = mediaCaptures.get(tabId);
    if (!list || list.length === 0) return null;
    const now = Date.now();
    const fresh = list.filter((c) => now - c.timestamp <= CAPTURE_MAX_AGE_MS);
    if (fresh.length === 0) return null;
    fresh.sort((a, b) => b.size - a.size);
    return fresh[0];
}

chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        if (!details.responseHeaders) return;
        let contentType = '';
        let contentLength = 0;
        for (const h of details.responseHeaders) {
            const name = (h.name || '').toLowerCase();
            if (name === 'content-type') contentType = h.value || '';
            else if (name === 'content-length') contentLength = parseInt(h.value, 10) || 0;
        }
        if (contentLength < CAPTURE_MIN_SIZE_BYTES) return;
        if (details.url.toLowerCase().endsWith('.ts')) return;
        if (!isLikelyMediaFile(details.url, contentType)) return;
        addCapture(details.tabId, {
            url: details.url,
            contentType,
            size: contentLength,
            timestamp: Date.now(),
        });
    },
    { urls: ['http://*/*', 'https://*/*'], types: ['media', 'xmlhttprequest', 'object'] },
    ['responseHeaders']
);

chrome.tabs.onRemoved.addListener((tabId) => mediaCaptures.delete(tabId));

// Chuyển sang trang mới (main frame) trong cùng tab thì bỏ capture cũ —
// tránh nhầm link video của trang trước sang trang đang xem.
chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) mediaCaptures.delete(details.tabId);
});

chrome.runtime.onInstalled.addListener((details) => {
    // removeAll trước khi create vì onInstalled còn nổ cho cả 'update' (reload lúc dev) —
    // create() thẳng sẽ ném lỗi "duplicate id" nếu menu cũ chưa được dọn.
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: CONTEXT_MENU_ID,
            title: 'Tải video này qua VCB',
            contexts: ['video', 'link', 'page'],
        });
        chrome.contextMenus.create({
            id: PROPOSE_MENU_ID,
            title: 'Đề xuất video này vào VCB',
            contexts: ['video', 'link', 'page'],
        });
    });
    // KHÔNG tự mở trang Cài đặt khi cài nữa: địa chỉ hệ thống được nhận diện tự động
    // lúc người dùng mở trang web hệ thống (xem rememberAppBase). Trang Cài đặt vẫn
    // truy cập được từ menu extension khi cần sửa tay.
    if (details.reason === 'install') {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'VCB Video Downloader đã sẵn sàng',
            message: 'Mở trang web hệ thống một lần để extension tự kết nối. Sau đó rê chuột vào video bất kỳ để tải, hoặc chuột phải để đề xuất.',
        });
    }
});

async function getSettings() {
    const stored = await chrome.storage.sync.get(DEFAULTS);
    return { ...DEFAULTS, ...stored };
}

// Các origin đã báo trong vòng đời service worker này — chống nổ notification liên tục
// khi người dùng mở song song localhost và link tunnel (mỗi lần đổi tab lại ghi đè nhau).
const notifiedOrigins = new Set();

/**
 * Ghi nhớ địa chỉ hệ thống khi người dùng mở trang web hệ thống — thay cho việc bắt
 * họ tự nhập trong trang Cài đặt (địa chỉ đổi liên tục vì chạy qua Cloudflare Tunnel).
 *
 * Bất kỳ trang nào cũng có thể tự gắn thẻ <meta name="vcb-app"> để giả danh, nên:
 *  - chỉ tin origin LẤY TỪ CHÍNH TAB gửi tin (sender.origin), không tin origin trong message;
 *  - chỉ nhận từ tab chính (frameId === 0), để một iframe ẩn trên trang lạ không tự đổi được;
 *  - ghi đè một địa chỉ đã dùng thật thì báo notification, không đổi ngầm;
 *  - vẫn giữ trang Cài đặt để sửa tay khi cần.
 */
async function rememberAppBase(claimedOrigin, sender) {
    if (sender?.frameId !== 0) return;

    // sender.origin do Chrome cấp, không giả được — ưu tiên nó hơn giá trị trong message.
    let origin = sender?.origin || claimedOrigin;
    if (!origin && sender?.url) {
        try { origin = new URL(sender.url).origin; } catch { return; }
    }
    if (!origin || !/^https?:\/\/[^/]+$/i.test(origin)) return;

    const { appBase } = await getSettings();
    const current = (appBase || '').replace(/\/$/, '');
    if (current === origin) return;

    await chrome.storage.sync.set({ appBase: origin });

    // Lần đầu (vẫn đang là địa chỉ mặc định) thì im lặng — mục tiêu là bỏ hẳn bước cấu hình.
    // Chỉ báo khi ghi đè một địa chỉ người dùng đã thực sự dùng.
    if (!current || current === DEFAULT_APP_BASE || notifiedOrigins.has(origin)) return;
    notifiedOrigins.add(origin);
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'VCB — Đổi địa chỉ hệ thống',
        message: `Extension sẽ dùng: ${origin}\n(Nếu bạn không mở trang này, hãy sửa lại trong Cài đặt.)`,
    });
}

// Dịch từ khoá sang tiếng Trung qua chính trang web hệ thống (Next route công khai,
// không cần đăng nhập) — dùng lại đúng endpoint AI mà web app đang dùng, không tự
// gọi dịch vụ dịch bên thứ ba từ extension.
async function translateToChinese(text) {
    const raw = (text || '').trim();
    if (!raw) return { ok: false, translated: '' };

    try {
        const { appBase } = await getSettings();
        const base = (appBase || DEFAULT_APP_BASE).replace(/\/$/, '');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${base}/api/translate-chinese`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: raw }),
            signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) return { ok: false, translated: '' };
        const data = await res.json();
        const translated = (data?.translated || '').trim();
        // source='already_chinese' nghĩa là input vốn đã là tiếng Trung → không cần gợi ý.
        if (!translated || translated === raw) return { ok: false, translated: '' };
        return { ok: true, translated };
    } catch {
        return { ok: false, translated: '' };
    }
}

function buildTargetUrl(base, pageUrl, { format, quality, auto }) {
    const params = new URLSearchParams({ url: pageUrl, format, quality });
    if (auto) params.set('auto', '1');
    return `${base.replace(/\/$/, '')}/dashboard/tools/video-downloader?${params.toString()}`;
}

function buildBatchTargetUrl(base, urls, { format, quality }) {
    const params = new URLSearchParams({ urls: JSON.stringify(urls), format, quality });
    return `${base.replace(/\/$/, '')}/dashboard/tools/video-downloader?${params.toString()}`;
}

async function openOrFocusAppTab(target) {
    const { lastAppTabId } = await chrome.storage.local.get('lastAppTabId');
    if (lastAppTabId != null) {
        try {
            const tab = await chrome.tabs.update(lastAppTabId, { url: target, active: true });
            if (tab) {
                await chrome.windows.update(tab.windowId, { focused: true });
                return;
            }
        } catch {
            // Tab đã đóng hoặc không còn tồn tại — mở tab mới bên dưới.
        }
    }
    const tab = await chrome.tabs.create({ url: target });
    await chrome.storage.local.set({ lastAppTabId: tab.id });
}

async function openDownloader(pageUrl, opts = {}) {
    if (!pageUrl || !/^https?:\/\//.test(pageUrl)) {
        return { ok: false, error: 'Không xác định được link video trên trang này.' };
    }
    const settings = await getSettings();
    const target = buildTargetUrl(settings.appBase, pageUrl, {
        format: opts.format || settings.defaultFormat,
        quality: opts.quality || settings.defaultQuality,
        auto: opts.auto ?? settings.autoDownload,
    });
    await openOrFocusAppTab(target);
    return { ok: true };
}

async function openDownloaderBatch(urls, opts = {}) {
    const valid = Array.isArray(urls) ? urls.filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)) : [];
    if (valid.length === 0) return { ok: false, error: 'Không có video hợp lệ để tải.' };
    const settings = await getSettings();
    const target = buildBatchTargetUrl(settings.appBase, valid, {
        format: opts.format || settings.defaultFormat,
        quality: opts.quality || settings.defaultQuality,
    });
    await openOrFocusAppTab(target);
    return { ok: true, count: valid.length };
}

// Suy ra permalink video từ chỗ user bấm chuột phải — dùng chung cho cả 2 menu.
async function resolveUrlFromContext(info, tab) {
    let url = null;
    if (tab?.id != null) {
        try {
            // frameId: right-click có thể xảy ra trong iframe nhúng (all_frames:true) —
            // nhắm đúng frame đó thay vì để Chrome broadcast/đua giữa các frame.
            const res = await chrome.tabs.sendMessage(
                tab.id,
                { type: 'vcb-resolve-last-video' },
                { frameId: info.frameId ?? 0 }
            );
            url = res?.url || null;
        } catch {
            // content script chưa sẵn sàng trên tab này (vd trang chrome://) — bỏ qua.
        }
    }
    return url || info.linkUrl || info.srcUrl || tab?.url || null;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID) {
        await openDownloader(await resolveUrlFromContext(info, tab));
        return;
    }
    if (info.menuItemId === PROPOSE_MENU_ID) {
        // Xin luôn thông tin video từ chính trang đang mở (số view/tim/tiêu đề/ảnh bìa),
        // giống hệt nút trong bảng hover — đề xuất từ menu chuột phải cũng phải có dữ liệu.
        const ctx = await collectProposeContext(info, tab);
        const res = await proposeVideo(ctx);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: res?.ok ? 'VCB — Đã gửi đề xuất' : 'VCB — Không đề xuất được',
            message: res?.ok ? (res.message || 'Video đã được gửi vào hệ thống.') : (res?.error || 'Có lỗi xảy ra.'),
        });
    }
});

// Hỏi content script mọi thứ cần cho một đề xuất; thiếu thì rơi về link thô.
async function collectProposeContext(info, tab) {
    const url = await resolveUrlFromContext(info, tab);
    if (tab?.id != null) {
        const res = await sendToTab(tab.id, { type: 'vcb-collect-meta', url });
        if (res && res.url) return res;
    }
    return { url };
}

/**
 * Gửi đề xuất mà KHÔNG kéo người dùng rời trang họ đang xem.
 *
 * Extension không giữ JWT (và không nên giữ), nên nhờ content script chạy trên chính
 * tab trang web hệ thống gọi API hộ — ở đó có sẵn phiên đăng nhập.
 *   1. Có tab hệ thống đang mở  → nhắn cho nó, người dùng không thấy gì ngoài 1 toast.
 *   2. Không có tab nào         → mở 1 tab NGẦM (không chuyển focus), gửi xong thì đóng.
 *   3. Cả hai đều hỏng          → mới quay về cách cũ: mở form đề xuất cho user tự bấm.
 */
async function proposeVideo({ url, platform, videoId, meta }) {
    if (!url) return { ok: false, error: 'Không tìm thấy link video.' };
    const settings = await getSettings();
    const base = (settings.appBase || DEFAULT_APP_BASE).replace(/\/$/, '');
    const payload = {
        video_url: url,
        platform: platform || platformLabel(url),
        video_id: videoId || '',
        ...(meta || {}),
    };

    const existing = await findAppTab(base);
    if (existing != null) {
        const res = await sendToTab(existing, { type: 'vcb-propose-api', payload });
        if (res && res.ok) return res;
        // Tab hệ thống có đó nhưng chưa đăng nhập / hết hạn: báo đúng lý do, đừng mở thêm tab.
        if (res && res.error) return res;
    }

    const hidden = await proposeViaHiddenTab(base, payload);
    if (hidden) return hidden;

    // Đường lui cuối: mở form đề xuất điền sẵn link cho người dùng tự xác nhận.
    return openProposeVideo(url);
}

/** Tìm 1 tab đang mở trang web hệ thống. */
async function findAppTab(base) {
    try {
        const tabs = await chrome.tabs.query({ url: `${base}/*` });
        // Ưu tiên tab đang hiển thị — nhiều khả năng là tab người dùng vừa đăng nhập.
        const pick = tabs.find((t) => t.active) || tabs[0];
        return pick?.id ?? null;
    } catch {
        return null;
    }
}

function sendToTab(tabId, msg) {
    return new Promise((resolve) => {
        try {
            chrome.tabs.sendMessage(tabId, msg, (res) => {
                if (chrome.runtime.lastError) resolve(null); // content script chưa sẵn sàng
                else resolve(res || null);
            });
        } catch {
            resolve(null);
        }
    });
}

/**
 * Mở tab hệ thống ở chế độ ngầm (active: false) chỉ để mượn phiên đăng nhập, xong thì đóng.
 * Người dùng vẫn đứng nguyên ở trang đang xem.
 */
async function proposeViaHiddenTab(base, payload) {
    let tabId = null;
    try {
        const tab = await chrome.tabs.create({ url: `${base}/dashboard`, active: false });
        tabId = tab?.id ?? null;
        if (tabId == null) return null;
        await waitForTabReady(tabId, 15000);
        // Content script vừa nạp cần một nhịp để gắn listener.
        await new Promise((r) => setTimeout(r, 400));
        const res = await sendToTab(tabId, { type: 'vcb-propose-api', payload });
        return res && (res.ok || res.error) ? res : null;
    } catch {
        return null;
    } finally {
        // Đóng tab mượn. Bọc try/catch vì nếu bước này ném thì service worker chết ngang,
        // nuốt luôn kết quả đề xuất đã thành công.
        if (tabId != null) {
            try { await chrome.tabs.remove(tabId); } catch { /* tab có thể đã đóng */ }
        }
    }
}

function waitForTabReady(tabId, timeoutMs) {
    return new Promise((resolve) => {
        const done = () => {
            chrome.tabs.onUpdated.removeListener(onUpdate);
            clearTimeout(timer);
            resolve();
        };
        const onUpdate = (id, info) => { if (id === tabId && info.status === 'complete') done(); };
        const timer = setTimeout(done, timeoutMs);
        chrome.tabs.onUpdated.addListener(onUpdate);
        // Có thể tab đã 'complete' trước khi ta kịp lắng nghe.
        chrome.tabs.get(tabId).then((t) => { if (t?.status === 'complete') done(); }).catch(() => {});
    });
}

// Mở trang Bộ Sưu Tập kèm link video để app tự bật hộp thoại đề xuất.
// Chỉ còn dùng làm đường lui khi không mượn được phiên đăng nhập ở tab hệ thống.
async function openProposeVideo(videoUrl) {
    if (!videoUrl) return { ok: false, error: 'Không tìm thấy link video.' };
    const settings = await getSettings();
    const base = (settings.appBase || DEFAULT_APP_BASE).replace(/\/$/, '');
    const target = `${base}/dashboard/video-library?propose=${encodeURIComponent(videoUrl)}`;
    const tab = await chrome.tabs.create({ url: target, active: true });
    if (tab?.id != null) await chrome.storage.local.set({ lastAppTabId: tab.id });
    return { ok: true };
}

// Tên nền tảng gọn từ hostname của trang video (vd "www.tiktok.com" -> "tiktok").
function platformLabel(pageUrl) {
    try {
        const host = new URL(pageUrl).hostname.replace(/^www\./, '');
        const known = ['tiktok', 'youtube', 'youtu', 'facebook', 'fb', 'instagram',
            'twitter', 'x', 'douyin', 'bilibili', 'reddit', 'vimeo', 'dailymotion',
            'rednote', 'xiaohongshu', 'soundcloud'];
        const hit = known.find((k) => host.includes(k));
        return hit ? hit.replace('youtu', 'youtube').replace(/^fb$/, 'facebook').replace(/^x$/, 'twitter') : (host.split('.')[0] || 'video');
    } catch {
        return 'video';
    }
}

// Đoán đuôi file từ URL media; mặc định mp4 nếu không rõ (link CDN thường không có .ext).
function guessExt(mediaUrl) {
    try {
        const path = new URL(mediaUrl).pathname.toLowerCase();
        const m = path.match(/\.(mp4|webm|mov|m4v|m4a|mp3)$/);
        return m ? m[1] : 'mp4';
    } catch {
        return 'mp4';
    }
}

// Tên file gọn gàng, có thể sắp xếp theo thời gian: VCB-tiktok-20260716-143005.mp4
function buildFilename(mediaUrl, pageUrl) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `VCB-${platformLabel(pageUrl)}-${stamp}.${guessExt(mediaUrl)}`;
}

function downloadDirect(url, pageUrl) {
    return new Promise((resolve) => {
        chrome.downloads.download(
            { url, filename: buildFilename(url, pageUrl), conflictAction: 'uniquify' },
            (downloadId) => {
                if (chrome.runtime.lastError || downloadId == null) {
                    resolve({ ok: false, error: chrome.runtime.lastError?.message || 'Không khởi tạo được tải trực tiếp.' });
                } else {
                    resolve({ ok: true, downloadId });
                }
            }
        );
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === 'vcb-get-captured') {
        const tabId = sender.tab?.id;
        const best = tabId != null ? getBestCapture(tabId) : null;
        sendResponse({ url: best?.url || null });
        return;
    }
    if (msg?.type === 'vcb-download-direct') {
        // Tải thẳng bằng chrome.downloads — dùng cookie/phiên thật của trình duyệt,
        // không qua server/yt-dlp nên không bị nền tảng chặn kiểu bot. Nếu lỗi (link
        // hết hạn đúng lúc bấm...) thì rơi về luồng cũ (mở trang, server tự tải) để
        // không mất lượt tải của người dùng.
        downloadDirect(msg.url, msg.pageUrl).then(async (res) => {
            if (res.ok) {
                sendResponse(res);
            } else {
                const fallback = await openDownloader(msg.pageUrl, { format: msg.format, quality: msg.quality });
                sendResponse({ ...fallback, fellBackToPageFlow: true });
            }
        });
        return true;
    }
    if (msg?.type === 'vcb-download') {
        openDownloader(msg.url, { format: msg.format, quality: msg.quality, auto: msg.auto }).then(sendResponse);
        return true; // async response
    }
    if (msg?.type === 'vcb-download-batch') {
        openDownloaderBatch(msg.urls, { format: msg.format, quality: msg.quality }).then(sendResponse);
        return true;
    }
    if (msg?.type === 'vcb-get-settings') {
        getSettings().then(sendResponse);
        return true;
    }
    if (msg?.type === 'vcb-propose') {
        // Nút "Đề xuất vào VCB" trong bảng hover (cùng đường với menu chuột phải).
        proposeVideo(msg).then(sendResponse);
        return true;
    }
    if (msg?.type === 'vcb-app-detected') {
        // Content script báo: tab này chính là trang web hệ thống → nhớ địa chỉ.
        rememberAppBase(msg.origin, sender);
        return;
    }
    if (msg?.type === 'vcb-translate-zh') {
        // Dịch tiếng Việt → tiếng Trung cho ô tìm kiếm trên các trang TQ (Douyin, Xiaohongshu...).
        // PHẢI fetch từ đây (service worker có host_permissions) chứ không từ content script:
        // content script chạy theo origin của trang nên sẽ bị CORS chặn.
        translateToChinese(msg.text).then(sendResponse);
        return true;
    }
    if (msg?.type === 'vcb-job-notify') {
        // Trang web hệ thống báo job tải xong/lỗi qua content script chạy trên chính domain đó —
        // bắn notification hệ điều hành để người dùng không cần ngồi canh tab.
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: msg.success ? 'VCB — Tải video xong' : 'VCB — Tải video thất bại',
            message: msg.success ? (msg.title || 'Video đã được tải về máy.') : (msg.error || 'Có lỗi xảy ra khi tải video.'),
        });
        return;
    }
    return undefined;
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
    const { lastAppTabId } = await chrome.storage.local.get('lastAppTabId');
    if (lastAppTabId != null) {
        try {
            const tab = await chrome.tabs.update(lastAppTabId, { active: true });
            if (tab) await chrome.windows.update(tab.windowId, { focused: true });
        } catch {
            // Tab đã đóng — bỏ qua.
        }
    }
    chrome.notifications.clear(notificationId);
});
