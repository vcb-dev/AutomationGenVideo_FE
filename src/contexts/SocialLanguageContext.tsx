'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Lang = 'vi' | 'en';

const T = {
  vi: {
    // ── channels page ──────────────────────────────────────────────────────
    failedToLoad: 'Không tải được danh sách tài khoản',
    connectSuccessPages: 'Kết nối thành công! Đang quét Pages và Instagram...',
    connectSuccessData: 'Kết nối thành công! Đang tải dữ liệu...',
    connectFailed: (msg: string) => `Kết nối thất bại: ${msg}`,
    scanDone: '✅ Đã quét xong tất cả Pages và Instagram!',
    popupBlocked: 'Trình duyệt chặn popup — hãy bỏ chặn popup cho trang này.',
    checkingConnection: 'Đang kiểm tra kết nối...',
    connectSuccess: 'Kết nối thành công!',
    refreshHint: 'Nhấn "Làm mới" để tải lại danh sách tài khoản.',
    connectionError: 'Lỗi kết nối',
    enterToken: 'Vui lòng nhập mã token',
    accountConnected: 'Kết nối tài khoản thành công!',
    connectionErrorWith: (msg: string) => `Kết nối lỗi: ${msg}`,
    cannotDisconnectOther: 'Bạn không thể gỡ tài khoản của người khác',
    disconnectConfirmWithPages: (name: string) =>
      `Gỡ kết nối "${name}"?\n\nTất cả Fanpage và Instagram Business liên kết sẽ bị gỡ theo.`,
    disconnectConfirm: (name: string) => `Gỡ kết nối "${name}"?`,
    disconnected: 'Đã gỡ kết nối',
    disconnectFailed: (msg: string) => `Không thể gỡ kết nối: ${msg}`,
    tabAll: 'Tất cả',
    expiringBanner: (n: number) => `${n} tài khoản sắp hết hạn token`,
    expired: 'Đã hết hạn',
    daysLeft: (n: number) => `còn ${n} ngày`,
    renewHint: 'Kết nối lại để gia hạn token và tiếp tục đăng bài.',
    channels: 'Kênh',
    manageChannels: 'Quản lý kênh',
    channelCount: (n: number) => `${n} kênh`,
    refresh: 'Làm mới',
    autoFromFB: 'Tự động lấy từ Facebook Page',
    connecting: 'Đang kết nối...',
    connectInstagram: 'Kết nối Instagram',
    addInstagram: 'Thêm Instagram',
    showN: (n: number) => `Hiện (${n})`,
    hide: 'Ẩn',
    addAccount: 'Thêm tài khoản',
    enterTokenManual: 'Nhập token thủ công',
    hideTokenForm: 'Ẩn form token',
    igBusinessCount: (n: number) => `Instagram Business (${n})`,
    showMoreAccounts: (n: number) => `Xem thêm ${n} account`,
    collapse: 'Thu gọn',
    viewAllIg: (n: number) => `Xem tất cả ${n} Instagram account`,
    expiresOn: (date: string) => `Hết hạn ${date}`,
    managedPages: (n: number) => `Các Fanpage được quản lý: (${n})`,
    showMorePages: (n: number) => `Xem thêm ${n} page`,
    viewAllPages: (n: number) => `Xem tất cả ${n} page`,
    loadThreadsToken: 'Nạp Token Threads trực tiếp',
    threadsTokenDesc:
      'Nhấp nút "Tạo mã truy cập" cho tài khoản Threads Tester trong Meta Developer Dashboard, copy mã token và dán vào đây:',
    tokenPlaceholder: 'Dán mã Token (ví dụ: TH_...)',
    save: 'Lưu',
    igAutoNote: 'Instagram Business sẽ tự động được thêm khi bạn kết nối Facebook.',
    noAccounts: (platform: string, loginLabel: string) =>
      `Chưa có tài khoản ${platform}. Nhấn "${loginLabel}" để bắt đầu.`,
    remove: 'Gỡ',
    loginLabel: {
      FACEBOOK: 'Đăng nhập với Facebook',
      INSTAGRAM: 'Kết nối Instagram',
      TIKTOK: 'Đăng nhập với TikTok',
      THREADS: 'Đăng nhập với Threads',
      YOUTUBE: 'Đăng nhập với YouTube',
      ZALO: 'Đăng nhập với Zalo',
    },
    dateLocale: 'vi',
    // ── NotificationBell ───────────────────────────────────────────────────
    notifTitle: '🔔 Thông báo đăng bài',
    markAllRead: 'Đánh dấu đã đọc',
    noNotifs: 'Chưa có thông báo',
    notifsHint: 'Thông báo sẽ hiển thị khi bạn đăng bài',
    postSuccess: 'Đăng bài thành công',
    postFailed: 'Đăng bài thất bại',
    postPending: 'Đang chờ xử lý',
    retry: 'Đăng lại',
    viewHistory: 'Xem tất cả lịch sử',
    retryQueued: 'Đã đưa vào hàng chờ đăng lại',
    retryFailed: 'Retry thất bại',
    // ── BackgroundTaskManager ──────────────────────────────────────────────
    processingTasks: (n: number) => `Đang xử lý ${n} tác vụ...`,
    allDone: 'Tất cả tác vụ hoàn tất',
    uploading: 'Đang tải lên...',
    processing: 'Đang xử lý...',
    waiting: 'Đang chờ...',
    done: 'Hoàn tất!',
    failed: 'Thất bại',
    cancelled: 'Đã hủy',
    sendingToSocial: 'Đang gửi tới MXH...',
    queuePos: (pos: number, total: number | null) =>
      total != null ? `Hàng chờ: #${pos}/${total}` : `Hàng chờ: #${pos}`,
  },
  en: {
    failedToLoad: 'Failed to load accounts',
    connectSuccessPages: 'Connected! Scanning Pages and Instagram...',
    connectSuccessData: 'Connected! Loading data...',
    connectFailed: (msg: string) => `Connection failed: ${msg}`,
    scanDone: '✅ All Pages and Instagram accounts scanned!',
    popupBlocked: 'Browser blocked popup — please allow popups for this site.',
    checkingConnection: 'Checking connection...',
    connectSuccess: 'Connected successfully!',
    refreshHint: 'Click "Refresh" to reload the account list.',
    connectionError: 'Connection error',
    enterToken: 'Please enter a token',
    accountConnected: 'Account connected successfully!',
    connectionErrorWith: (msg: string) => `Connection error: ${msg}`,
    cannotDisconnectOther: "You cannot disconnect other users' accounts",
    disconnectConfirmWithPages: (name: string) =>
      `Disconnect "${name}"?\n\nAll linked Fanpages and Instagram Business accounts will also be disconnected.`,
    disconnectConfirm: (name: string) => `Disconnect "${name}"?`,
    disconnected: 'Disconnected',
    disconnectFailed: (msg: string) => `Failed to disconnect: ${msg}`,
    tabAll: 'All',
    expiringBanner: (n: number) => `${n} account${n > 1 ? 's' : ''} with expiring tokens`,
    expired: 'Expired',
    daysLeft: (n: number) => `${n} day${n > 1 ? 's' : ''} left`,
    renewHint: 'Reconnect to renew token and continue posting.',
    channels: 'Channels',
    manageChannels: 'Manage Channels',
    channelCount: (n: number) => `${n} channel${n > 1 ? 's' : ''}`,
    refresh: 'Refresh',
    autoFromFB: 'Auto-fetched from Facebook Pages',
    connecting: 'Connecting...',
    connectInstagram: 'Connect Instagram',
    addInstagram: 'Add Instagram',
    showN: (n: number) => `Show (${n})`,
    hide: 'Hide',
    addAccount: 'Add Account',
    enterTokenManual: 'Enter token manually',
    hideTokenForm: 'Hide token form',
    igBusinessCount: (n: number) => `Instagram Business (${n})`,
    showMoreAccounts: (n: number) => `Show ${n} more`,
    collapse: 'Collapse',
    viewAllIg: (n: number) => `View all ${n} Instagram account${n > 1 ? 's' : ''}`,
    expiresOn: (date: string) => `Expires ${date}`,
    managedPages: (n: number) => `Managed Fanpages: (${n})`,
    showMorePages: (n: number) => `Show ${n} more`,
    viewAllPages: (n: number) => `View all ${n} page${n > 1 ? 's' : ''}`,
    loadThreadsToken: 'Load Threads Token Directly',
    threadsTokenDesc:
      'Click the "Create Access Token" button for your Threads Tester account in Meta Developer Dashboard, copy the token and paste it here:',
    tokenPlaceholder: 'Paste Token (e.g., TH_...)',
    save: 'Save',
    igAutoNote: 'Instagram Business will be automatically added when you connect Facebook.',
    noAccounts: (platform: string, loginLabel: string) =>
      `No ${platform} accounts yet. Click "${loginLabel}" to get started.`,
    remove: 'Remove',
    loginLabel: {
      FACEBOOK: 'Login with Facebook',
      INSTAGRAM: 'Connect Instagram',
      TIKTOK: 'Login with TikTok',
      THREADS: 'Login with Threads',
      YOUTUBE: 'Login with YouTube',
      ZALO: 'Login with Zalo',
    },
    dateLocale: 'en-US',
    notifTitle: '🔔 Post Notifications',
    markAllRead: 'Mark all read',
    noNotifs: 'No notifications',
    notifsHint: 'Notifications will appear when you post',
    postSuccess: 'Post successful',
    postFailed: 'Post failed',
    postPending: 'Pending',
    retry: 'Retry',
    viewHistory: 'View all history',
    retryQueued: 'Queued for retry',
    retryFailed: 'Retry failed',
    processingTasks: (n: number) => `Processing ${n} task${n > 1 ? 's' : ''}...`,
    allDone: 'All tasks complete',
    uploading: 'Uploading...',
    processing: 'Processing...',
    waiting: 'Waiting...',
    done: 'Done!',
    failed: 'Failed',
    cancelled: 'Cancelled',
    sendingToSocial: 'Sending to social media...',
    queuePos: (pos: number, total: number | null) =>
      total != null ? `Queue: #${pos}/${total}` : `Queue: #${pos}`,
  },
} as const;

type Normalize<Obj> = {
  [K in keyof Obj]: Obj[K] extends (...args: any[]) => any
    ? Obj[K]
    : Obj[K] extends object
    ? { [SubK in keyof Obj[K]]: string }
    : string;
};

export type SocialT = Normalize<typeof T.vi>;

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: SocialT;
}

const SocialLanguageContext = createContext<LanguageCtx>({
  lang: 'vi',
  setLang: () => {},
  t: T.vi,
});

export function SocialLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('vi');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('social_lang') as Lang | null;
      if (stored === 'en' || stored === 'vi') setLangState(stored);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('social_lang', l); } catch {}
  };

  return (
    <SocialLanguageContext.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </SocialLanguageContext.Provider>
  );
}

export function useSocialLang() {
  return useContext(SocialLanguageContext);
}
