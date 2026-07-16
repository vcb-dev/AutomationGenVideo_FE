const DEFAULT_APP_BASE = 'http://localhost:3001';
const DEFAULTS = {
    appBase: DEFAULT_APP_BASE,
    defaultFormat: 'mp4',
    defaultQuality: 'best',
    autoDownload: false,
    hoverIconEnabled: true,
    disabledSites: [],
};

const el = (id) => document.getElementById(id);
const statusEl = el('status');
let settings = { ...DEFAULTS };
let activeTab = null;
let lastScannedUrls = [];

function showStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.style.color = isError ? '#dc2626' : '#16a34a';
    if (text) setTimeout(() => { if (statusEl.textContent === text) statusEl.textContent = ''; }, 2500);
}

function applyFormatUI() {
    el('fmtMp4').classList.toggle('active', settings.defaultFormat === 'mp4');
    el('fmtMp3').classList.toggle('active', settings.defaultFormat === 'mp3');
    el('qBest').classList.toggle('active', settings.defaultQuality === 'best');
    el('q1080').classList.toggle('active', settings.defaultQuality === '1080');
    el('q720').classList.toggle('active', settings.defaultQuality === '720');
}

function hostnameOf(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

function emptyHint(text) {
    const div = document.createElement('div');
    div.className = 'empty-hint';
    div.textContent = text;
    return div;
}

function updateDownloadAllVisibility() {
    const btn = el('downloadAll');
    if (lastScannedUrls.length > 1) {
        btn.style.display = 'inline-block';
        btn.textContent = `Tải tất cả (${lastScannedUrls.length})`;
    } else {
        btn.style.display = 'none';
    }
}

function renderVideoList(videos, disabledReason) {
    const list = el('videoList');
    list.innerHTML = '';
    lastScannedUrls = [];
    if (disabledReason) {
        list.appendChild(emptyHint(disabledReason));
        updateDownloadAllVisibility();
        return;
    }
    if (!videos || videos.length === 0) {
        list.appendChild(emptyHint('Chưa phát hiện video nào trên trang này.'));
        updateDownloadAllVisibility();
        return;
    }
    lastScannedUrls = videos.map((v) => v.url);
    updateDownloadAllVisibility();
    videos.forEach((v) => {
        // Dựng DOM bằng property assignment (không innerHTML) vì v.url/v.poster đến từ
        // trang bên thứ ba bất kỳ mà người dùng đang xem — không tin tưởng nội dung.
        const row = document.createElement('div');
        row.className = 'video-item';

        const thumb = document.createElement(v.poster ? 'img' : 'div');
        thumb.className = 'thumb';
        if (v.poster) thumb.src = v.poster;

        const urlSpan = document.createElement('span');
        urlSpan.className = 'url';
        urlSpan.title = v.url;
        urlSpan.textContent = hostnameOf(v.url) || v.url;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Tải';
        btn.addEventListener('click', () => triggerDownload(v.url));

        row.append(thumb, urlSpan, btn);
        list.appendChild(row);
    });
}

async function scanCurrentTab() {
    if (!activeTab?.id || !/^https?:\/\//.test(activeTab.url || '')) {
        renderVideoList(null, 'Không quét được trang này.');
        return;
    }
    try {
        const res = await chrome.tabs.sendMessage(activeTab.id, { type: 'vcb-scan' }, { frameId: 0 });
        if (res?.disabled) {
            renderVideoList(null, 'Đây là trang hệ thống VCB — dùng ô dán link ở trang Tải video.');
            return;
        }
        renderVideoList(res?.videos || []);
    } catch {
        // content script chưa được inject (tab mở trước khi cài/reload extension) — thử tiêm rồi quét lại.
        try {
            await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['content.js'] });
            const res = await chrome.tabs.sendMessage(activeTab.id, { type: 'vcb-scan' }, { frameId: 0 });
            renderVideoList(res?.videos || []);
        } catch {
            renderVideoList(null, 'Không quét được trang này (hãy tải lại trang rồi thử lại).');
        }
    }
}

async function triggerDownload(url) {
    showStatus('Đang mở trang tải video...');
    const res = await chrome.runtime.sendMessage({ type: 'vcb-download', url });
    if (res?.ok) showStatus('Đã mở ở tab khác ✓');
    else showStatus(res?.error || 'Có lỗi xảy ra', true);
}

async function triggerDownloadAll() {
    if (lastScannedUrls.length === 0) return;
    showStatus(`Đang mở hàng đợi ${lastScannedUrls.length} video...`);
    const res = await chrome.runtime.sendMessage({ type: 'vcb-download-batch', urls: lastScannedUrls });
    if (res?.ok) showStatus(`Đã gửi ${res.count} video sang tab tải ✓`);
    else showStatus(res?.error || 'Có lỗi xảy ra', true);
}

function wireFormatButtons() {
    [
        ['fmtMp4', 'defaultFormat', 'mp4'],
        ['fmtMp3', 'defaultFormat', 'mp3'],
        ['qBest', 'defaultQuality', 'best'],
        ['q1080', 'defaultQuality', '1080'],
        ['q720', 'defaultQuality', '720'],
    ].forEach(([id, key, value]) => {
        el(id).addEventListener('click', () => {
            settings[key] = value;
            chrome.storage.sync.set({ [key]: value });
            applyFormatUI();
        });
    });
}

function wireToggles() {
    el('hoverToggle').addEventListener('change', (e) => {
        chrome.storage.sync.set({ hoverIconEnabled: e.target.checked });
    });
    el('autoToggle').addEventListener('change', (e) => {
        chrome.storage.sync.set({ autoDownload: e.target.checked });
    });
    el('siteToggle').addEventListener('change', (e) => {
        const host = hostnameOf(activeTab?.url);
        if (!host) return;
        const set = new Set(settings.disabledSites);
        if (e.target.checked) set.add(host);
        else set.delete(host);
        settings.disabledSites = Array.from(set);
        chrome.storage.sync.set({ disabledSites: settings.disabledSites });
    });
}

async function init() {
    const stored = await chrome.storage.sync.get(DEFAULTS);
    settings = { ...DEFAULTS, ...stored };
    applyFormatUI();
    el('hoverToggle').checked = settings.hoverIconEnabled;
    el('autoToggle').checked = settings.autoDownload;
    el('appBaseLabel').textContent = settings.appBase.replace(/^https?:\/\//, '');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab || null;

    const host = hostnameOf(activeTab?.url);
    if (host) {
        el('siteToggleLabel').textContent = `Tắt icon trên ${host}`;
        el('siteToggle').checked = settings.disabledSites.includes(host);
    } else {
        el('siteToggle').disabled = true;
    }

    const downloadBtn = el('downloadCurrent');
    if (!activeTab || !/^https?:\/\//.test(activeTab.url || '')) {
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Không có video trên trang này';
    }
    downloadBtn.addEventListener('click', () => activeTab?.url && triggerDownload(activeTab.url));

    wireFormatButtons();
    wireToggles();
    void scanCurrentTab();
}

el('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
el('downloadAll').addEventListener('click', () => void triggerDownloadAll());

init();
