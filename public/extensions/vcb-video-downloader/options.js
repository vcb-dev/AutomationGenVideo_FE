const DEFAULT_APP_BASE = 'http://localhost:3001';
const input = document.getElementById('appBase');
const status = document.getElementById('status');

chrome.storage.sync.get(['appBase'], ({ appBase }) => {
    input.value = appBase || DEFAULT_APP_BASE;
});

document.getElementById('save').addEventListener('click', () => {
    const value = input.value.trim().replace(/\/$/, '');
    if (!/^https?:\/\//.test(value)) {
        status.style.color = '#dc2626';
        status.textContent = 'URL không hợp lệ (phải bắt đầu bằng http/https).';
        return;
    }
    chrome.storage.sync.set({ appBase: value }, () => {
        status.style.color = '#16a34a';
        status.textContent = 'Đã lưu!';
        setTimeout(() => { status.textContent = ''; }, 2000);
    });
});
