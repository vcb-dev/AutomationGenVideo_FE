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
let state = { ...DEFAULTS };

function applySegUI() {
    el('fmtMp4').classList.toggle('active', state.defaultFormat === 'mp4');
    el('fmtMp3').classList.toggle('active', state.defaultFormat === 'mp3');
    el('qBest').classList.toggle('active', state.defaultQuality === 'best');
    el('q1080').classList.toggle('active', state.defaultQuality === '1080');
    el('q720').classList.toggle('active', state.defaultQuality === '720');
}

function renderSiteList() {
    const list = el('siteList');
    list.innerHTML = '';
    if (state.disabledSites.length === 0) {
        list.innerHTML = '<div class="empty">Chưa tắt trên trang nào.</div>';
        return;
    }
    state.disabledSites.forEach((host) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${host}</span><button type="button">Bật lại</button>`;
        li.querySelector('button').addEventListener('click', () => {
            state.disabledSites = state.disabledSites.filter((h) => h !== host);
            chrome.storage.sync.set({ disabledSites: state.disabledSites });
            renderSiteList();
        });
        list.appendChild(li);
    });
}

chrome.storage.sync.get(DEFAULTS, (stored) => {
    state = { ...DEFAULTS, ...stored };
    el('appBase').value = state.appBase;
    el('hoverToggle').checked = state.hoverIconEnabled;
    el('autoToggle').checked = state.autoDownload;
    applySegUI();
    renderSiteList();
});

[
    ['fmtMp4', 'defaultFormat', 'mp4'],
    ['fmtMp3', 'defaultFormat', 'mp3'],
    ['qBest', 'defaultQuality', 'best'],
    ['q1080', 'defaultQuality', '1080'],
    ['q720', 'defaultQuality', '720'],
].forEach(([id, key, value]) => {
    el(id).addEventListener('click', () => {
        state[key] = value;
        applySegUI();
    });
});

el('hoverToggle').addEventListener('change', (e) => { state.hoverIconEnabled = e.target.checked; });
el('autoToggle').addEventListener('change', (e) => { state.autoDownload = e.target.checked; });

el('save').addEventListener('click', () => {
    const status = el('status');
    const appBaseValue = el('appBase').value.trim().replace(/\/$/, '');
    if (!/^https?:\/\//.test(appBaseValue)) {
        status.style.color = '#dc2626';
        status.textContent = 'URL không hợp lệ (phải bắt đầu bằng http/https).';
        return;
    }
    state.appBase = appBaseValue;
    chrome.storage.sync.set(
        {
            appBase: state.appBase,
            defaultFormat: state.defaultFormat,
            defaultQuality: state.defaultQuality,
            autoDownload: state.autoDownload,
            hoverIconEnabled: state.hoverIconEnabled,
        },
        () => {
            status.style.color = '#16a34a';
            status.textContent = 'Đã lưu!';
            setTimeout(() => { status.textContent = ''; }, 2000);
        }
    );
});
