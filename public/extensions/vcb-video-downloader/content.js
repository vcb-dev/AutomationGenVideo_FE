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
            resolve: (v) =>
                findAncestorLink(v, (href) => /\/videos\/|\/reel\/|watch\/?\?v=/.test(href)),
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
            resolve: (v) => findAncestorLink(v, (href) => /\/video\//.test(href)),
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
        </div>
        <div class="toast" id="toast"></div>
    `;
    document.documentElement.appendChild(hostEl);
    const btnEl = shadow.getElementById('btn');
    const toastEl = shadow.getElementById('toast');
    const panelEl = shadow.getElementById('panel');
    const panelDownloadBtn = shadow.getElementById('panelDownload');

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
    });

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
