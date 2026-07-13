// VCB Video Downloader
// Base URL trỏ tới trang web hệ thống được lưu trong chrome.storage (cấu hình qua trang Options),
// vì hệ thống hiện chạy qua Cloudflare Tunnel nên domain có thể đổi theo thời gian.
const DEFAULT_APP_BASE = 'http://localhost:3001';

chrome.runtime.onInstalled.addListener(() => {
    chrome.runtime.openOptionsPage();
});

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab || !tab.url || !/^https?:\/\//.test(tab.url)) return;
    const { appBase } = await chrome.storage.sync.get(['appBase']);
    const base = (appBase || DEFAULT_APP_BASE).replace(/\/$/, '');
    const target = `${base}/dashboard/tools/video-downloader?url=${encodeURIComponent(tab.url)}`;
    chrome.tabs.create({ url: target, index: tab.index + 1 });
});
