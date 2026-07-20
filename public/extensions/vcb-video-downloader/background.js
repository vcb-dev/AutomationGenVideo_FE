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
    disabledSites: [],
};
const CONTEXT_MENU_ID = 'vcb-download-video';

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
    });
    if (details.reason === 'install') chrome.runtime.openOptionsPage();
});

async function getSettings() {
    const stored = await chrome.storage.sync.get(DEFAULTS);
    return { ...DEFAULTS, ...stored };
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

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;
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
    url = url || info.linkUrl || info.srcUrl || tab?.url || null;
    await openDownloader(url);
});

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
