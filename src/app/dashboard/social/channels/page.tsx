'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { socialApi, SocialAccount, SocialPlatform } from '@/lib/api/social';
import { useSocialAccounts, useInvalidateAccounts } from '@/hooks/useSocialAccounts';

// ─── Platform meta ─────────────────────────────────────────────────────────

const P: Record<SocialPlatform, { label: string; color: string; icon: React.ReactNode; loginLabel: string }> = {
  FACEBOOK: {
    label: 'Facebook', loginLabel: 'Đăng nhập với Facebook',
    color: '#1877F2',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
  },
  INSTAGRAM: {
    label: 'Instagram Business', loginLabel: 'Kết nối Instagram',
    color: '#E1306C',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>,
  },
  TIKTOK: {
    label: 'TikTok', loginLabel: 'Đăng nhập với TikTok',
    color: '#010101',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.78a4.85 4.85 0 01-1.07-.09z" /></svg>,
  },
  THREADS: {
    label: 'Threads (Meta)', loginLabel: 'Đăng nhập với Threads',
    color: '#101010',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.692-1.685-1.74-1.752-2.95-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 013.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.312-.883-2.371-.889h-.048c-.709 0-1.541.195-2.095.694l-1.128-1.566c.874-.777 2.08-1.184 3.477-1.184h.072c2.714.018 4.533 1.423 4.96 3.906.16.905.208 1.87.135 2.88.595.42 1.1.915 1.504 1.482.975 1.383 1.214 3.177.64 5.15-.617 2.098-2.066 3.832-4.07 4.878-1.85.96-4.041 1.446-6.528 1.446z" /></svg>,
  },
  YOUTUBE: {
    label: 'YouTube', loginLabel: 'Đăng nhập với YouTube',
    color: '#FF0000',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>,
  },
  ZALO: {
    label: 'Zalo OA', loginLabel: 'Đăng nhập với Zalo',
    color: '#0068FF',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.563 8.994l-1.393 6.667c-.101.462-.37.575-.75.357l-2.07-1.526-1.001.963c-.11.11-.203.203-.415.203l.149-2.113 3.835-3.463c.167-.149-.036-.231-.258-.083L6.91 13.94 4.87 13.3c-.448-.14-.456-.448.094-.663l10.889-4.197c.372-.135.698.083.71.554z" /></svg>,
  },
};

const LETTER_COLORS = ['bg-slate-500', 'bg-slate-600', 'bg-gray-500', 'bg-zinc-500', 'bg-neutral-500', 'bg-stone-500', 'bg-slate-400', 'bg-gray-600', 'bg-zinc-600', 'bg-neutral-600'];
const letterColor = (name: string) => LETTER_COLORS[name.charCodeAt(0) % LETTER_COLORS.length];

type Tab = 'Tất cả' | SocialPlatform;
const ALL_PLATFORMS: SocialPlatform[] = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'THREADS', 'YOUTUBE', 'ZALO'];

// ─── Component ─────────────────────────────────────────────────────────────

export default function ChannelsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Tất cả');
  const { data: accounts = [], isLoading: loading, error } = useSocialAccounts();
  const [expiringAccounts, setExpiringAccounts] = useState<any[]>([]);
  useEffect(() => {
    socialApi.accounts.expiring().then(setExpiringAccounts).catch(() => {});
  }, []);
  const invalidateAccounts = useInvalidateAccounts();
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  // collapsed: accountId nào đang ẩn pages
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [threadsTokenInputOpen, setThreadsTokenInputOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [savingManualToken, setSavingManualToken] = useState(false);

  useEffect(() => {
    if (error) toast.error('Không tải được danh sách tài khoản');
  }, [error]);

  const loadAccounts = useCallback(async () => {
    await invalidateAccounts();
  }, [invalidateAccounts]);

  // Ref để lưu số lượng accounts trước khi connect (dùng cho polling fallback)
  const accountCountBeforeConnect = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref để track connecting state cho popup checker (tránh stale closure)
  const connectingRef = useRef<SocialPlatform | null>(null);
  useEffect(() => { connectingRef.current = connecting; }, [connecting]);

  /**
   * Refresh sau OAuth thành công:
   * - Lần 1: ngay lập tức → hiển thị account chính
   * - Poll mỗi 2s (Facebook): cập nhật UI liên tục cho đến khi count ổn định 2 lần liên tiếp
   *   → đảm bảo TẤT CẢ Pages được lưu xong mới dừng, không dừng giữa chừng
   */
  const refreshAfterOAuth = useCallback((platform?: SocialPlatform) => {
    // Lần 1: refresh ngay lập tức
    invalidateAccounts();

    // Chỉ Facebook mới có Pages cần quét thêm
    if (platform !== 'FACEBOOK') return;

    let attempts         = 0;
    const MAX_ATTEMPTS   = 10;  // tối đa 10 × 2s = 20 giây
    let lastCount        = 0;
    let stableCount      = 0;   // số lần liên tiếp count không đổi
    const STABLE_NEEDED  = 2;   // cần ổn định 2 lần liên tiếp mới dừng

    const scanTimer = setInterval(async () => {
      attempts++;
      try {
        const fresh = await socialApi.accounts.list();
        const currentCount = fresh.length;

        // Luôn cập nhật UI với data mới nhất
        invalidateAccounts();

        if (currentCount === lastCount && lastCount > 0) {
          stableCount++;
          // Count ổn định đủ số lần → tất cả Pages đã lưu xong
          if (stableCount >= STABLE_NEEDED) {
            clearInterval(scanTimer);
            toast.success('✅ Đã quét xong tất cả Pages và Instagram!', { duration: 3000 });
            return;
          }
        } else {
          // Count vừa tăng → reset stable counter, tiếp tục poll
          stableCount = 0;
          lastCount = currentCount;
        }
      } catch { /* silent */ }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(scanTimer);
        invalidateAccounts();
      }
    }, 2000);

    return () => clearInterval(scanTimer);
  }, [invalidateAccounts]);

  useEffect(() => {
    const handleOAuth = (payload: { type?: string; error?: string }) => {
      if (!payload?.type) return;
      if (payload.type.endsWith('-oauth-success')) {
        // Trích platform từ message type (vd: "facebook-oauth-success" → "FACEBOOK")
        const platform = payload.type.replace('-oauth-success', '').toUpperCase() as SocialPlatform;
        const isFacebook = platform === 'FACEBOOK';
        toast.success(isFacebook
          ? 'Kết nối thành công! Đang quét Pages và Instagram...'
          : 'Kết nối thành công! Đang tải dữ liệu...'
        );
        setConnecting(null);
        if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
        refreshAfterOAuth(platform);
      } else if (payload.type.endsWith('-oauth-error')) {
        toast.error(`Kết nối thất bại: ${payload.error || 'Lỗi không xác định'}`);
        setConnecting(null);
      }
    };

    // BroadcastChannel — nhận ngay cả khi popup đóng trước khi postMessage kịp gửi
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('vcb-oauth');
      bc.onmessage = (e) => handleOAuth(e.data);
    } catch { /* browser cũ không hỗ trợ */ }

    // postMessage fallback
    const onMsg = (e: MessageEvent) => handleOAuth(e.data);
    window.addEventListener('message', onMsg);

    return () => {
      bc?.close();
      window.removeEventListener('message', onMsg);
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    };
  }, [loadAccounts, refreshAfterOAuth]);

  const handleConnect = async (platform: SocialPlatform) => {
    setConnecting(platform);
    // Lưu snapshot accounts của platform này để so sánh (không dùng tổng count vì upsert không tăng)
    const snapshotIds = new Set(accounts.filter(a => a.platform === platform).map(a => a.id));
    accountCountBeforeConnect.current = accounts.length;

    // Mở popup ngay lập tức để tránh Safari chặn (phải mở trực tiếp từ click event, trước khi await)
    const popup = window.open('', `oauth-${platform}`, 'width=620,height=720,left=200,top=80');

    try {
      const { url } = await socialApi.oauth.getUrl(platform);
      
      if (!popup) {
        toast.error('Trình duyệt chặn popup — hãy bỏ chặn popup cho trang này.');
        setConnecting(null);
        return;
      }
      
      // Gán URL cho popup sau khi có kết quả
      popup.location.href = url;

      // Popup checker: khi popup đóng mà chưa nhận BroadcastChannel → poll server
      const popupChecker = setInterval(async () => {
        if (popup.closed) {
          clearInterval(popupChecker);
          // Chờ 2s để BE hoàn tất lưu + BroadcastChannel có thời gian gửi
          await new Promise((r) => setTimeout(r, 2000));
          if (connectingRef.current !== platform) return; // Đã nhận được message → dừng

          toast('Đang kiểm tra kết nối...', { icon: '🔄' });
          let pollCount = 0;
          pollTimerRef.current = setInterval(async () => {
            pollCount++;
            try {
              // invalidateAccounts trigger React Query refetch → component tự re-render với data mới
              await invalidateAccounts();
              // Dùng API trực tiếp thay vì stale closure `accounts`
              const freshAccounts = await socialApi.accounts.list();
              const platformAccounts = freshAccounts.filter(a => a.platform === platform);
              const hasNewAccount = freshAccounts.length > accountCountBeforeConnect.current ||
                platformAccounts.some(a => !snapshotIds.has(a.id));

              if (hasNewAccount) {
                if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
                setConnecting(null);
                toast.success('Kết nối thành công!');
                refreshAfterOAuth(platform);
              } else if (pollCount >= 8) {
                if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
                setConnecting(null);
                const hasAny = freshAccounts.filter(a => a.platform === platform).some(a => !snapshotIds.has(a.id));
                if (hasAny) {
                  toast.success('Kết nối thành công!');
                  refreshAfterOAuth(platform);
                } else {
                  toast('Nhấn "Làm mới" để tải lại danh sách tài khoản.', { icon: 'ℹ️' });
                }
              }
            } catch { /* silent */ }
          }, 2000);
        }
      }, 1000);
    } catch { 
      toast.error('Lỗi kết nối'); 
      setConnecting(null); 
      if (popup && !popup.closed) popup.close();
    }
  };

  const handleSaveManualToken = async (platform: SocialPlatform) => {
    if (!manualToken.trim()) {
      toast.error('Vui lòng nhập mã token');
      return;
    }
    setSavingManualToken(true);
    try {
      await socialApi.oauth.connectViaToken(platform, { access_token: manualToken.trim() });
      toast.success('Kết nối tài khoản thành công!');
      setManualToken('');
      setThreadsTokenInputOpen(false);
      await loadAccounts();
    } catch (err: any) {
      toast.error(`Kết nối lỗi: ${err.message || 'Mã token không hợp lệ'}`);
    } finally {
      setSavingManualToken(false);
    }
  };


  const handleDisconnect = async (account: SocialAccount) => {
    const extra = account.extra_data as any;
    const isPersonalFB = account.platform === 'FACEBOOK' && !extra?.type;
    const confirmMsg = isPersonalFB
      ? `Gỡ kết nối "${account.name}"?\n\nTất cả Fanpage và Instagram Business liên kết sẽ bị gỡ theo.`
      : `Gỡ kết nối "${account.name}"?`;
    if (!confirm(confirmMsg)) return;
    setDisconnecting(account.id);
    try {
      await socialApi.accounts.disconnect(account.id);
      toast.success('Đã gỡ kết nối');
      await invalidateAccounts();
    } catch { toast.error('Không thể gỡ kết nối'); }
    finally { setDisconnecting(null); }
  };

  const toggleCollapse = (accountId: string) =>
    setCollapsed((prev) => ({ ...prev, [accountId]: !prev[accountId] }));

  const [igCollapsed, setIgCollapsed] = useState(false);
  // pagesExpanded: accountId → true/false (true = xem tất cả pages)
  const [pagesExpanded, setPagesExpanded] = useState<Record<string, boolean>>({});
  const PAGES_PER_ROW = 4; // số page mặc định hiển thị (1 hàng)

  // ── Derived ────────────────────────────────────────────────────────────────
  const visiblePlatforms = activeTab === 'Tất cả' ? ALL_PLATFORMS : [activeTab as SocialPlatform];

  // Đếm account hiển thị cho mỗi platform (cùng logic với displayAccts)
  const getDisplayCount = (platform: SocialPlatform) => {
    if (platform === 'INSTAGRAM') {
      return accounts.filter((a) => a.platform === 'INSTAGRAM').length;
    }
    // Các platform khác: chỉ đếm personal account (loại bỏ sub-type như page, instagram_business)
    const SUB_TYPES = ['page', 'instagram_business'];
    return accounts.filter((a) => a.platform === platform && !SUB_TYPES.includes((a.extra_data as any)?.type)).length;
  };
  const totalConnected = ALL_PLATFORMS.reduce((sum, p) => sum + getDisplayCount(p), 0);

  const tabList: { key: Tab; label: string; icon?: React.ReactNode }[] = [
    { key: 'Tất cả', label: 'Tất cả' },
    ...ALL_PLATFORMS.map((p) => ({ key: p as Tab, label: P[p].label.split(' ')[0], icon: P[p].icon })),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">

      {/* Token expiry warning banner */}
      {expiringAccounts.length > 0 && (
        <div className="mx-8 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800 mb-1">{expiringAccounts.length} tài khoản sắp hết hạn token</p>
            <div className="flex flex-wrap gap-2">
              {expiringAccounts.map((acc: any) => (
                <span key={acc.id} className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                  <Clock className="w-3 h-3" />
                  {acc.name}
                  <span className="text-amber-500">· {acc.days_until_expiry <= 0 ? 'Đã hết hạn' : `còn ${acc.days_until_expiry} ngày`}</span>
                </span>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-1.5">Vào kênh đó, gỡ kết nối và kết nối lại để gia hạn token.</p>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-8 pt-6 pb-4 text-sm border-b border-slate-200">
        <span className="text-blue-600">Kênh</span>
        <span className="text-slate-300">›</span>
        <span className="font-semibold text-slate-800">Quản lý kênh</span>
        <span className="ml-1 px-2 py-0.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
          {totalConnected} kênh
        </span>
        <button onClick={() => loadAccounts()} className="ml-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-0 px-8 border-b border-slate-200 bg-white">
        {tabList.map(({ key, label, icon }) => {
          const count = key === 'Tất cả' ? totalConnected : getDisplayCount(key as SocialPlatform);
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === key
                  ? 'border-slate-800 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              {icon && <span className={activeTab === key ? 'text-slate-900' : 'text-slate-400'}>{icon}</span>}
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Platform cards */}
      <div className="px-8 py-6 space-y-6">
        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-2xl border border-slate-200 animate-pulse bg-slate-50" />)}
          </div>
        ) : (
          visiblePlatforms.map((platform) => {
            const meta = P[platform];
            // Instagram: hiện cả direct OAuth lẫn instagram_business từ Facebook Pages
            // Facebook/khác: chỉ hiện personal account (bỏ sub-type như page/instagram_business)
            const SUB_TYPES = ['page', 'instagram_business'];
            const displayAccts = platform === 'INSTAGRAM'
              ? accounts.filter((a) => a.platform === 'INSTAGRAM')
              : accounts.filter((a) => a.platform === platform && !SUB_TYPES.includes((a.extra_data as any)?.type));

            return (
              <div key={platform} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                {/* Platform header */}
                <div className="flex items-center gap-3 px-8 py-5 border-b border-slate-100">
                  <span style={{ color: meta.color }} className="text-xl">{meta.icon}</span>
                  <span className="text-lg font-bold" style={{ color: meta.color }}>{meta.label}</span>

                  <div className="ml-auto">
                    {/* Instagram: không có nút login — tự động lấy từ FB */}
                    {platform === 'INSTAGRAM' && displayAccts.length === 0 && (
                      <span className="text-sm text-blue-500 italic">Tự động lấy từ Facebook Page</span>
                    )}
                    {platform === 'INSTAGRAM' && displayAccts.length > 0 && (
                      <button
                        onClick={() => setIgCollapsed((v) => !v)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                        {igCollapsed
                          ? <><ChevronDown className="w-4 h-4" /> Hiện ({displayAccts.length})</>
                          : <><ChevronUp className="w-4 h-4" /> Ẩn</>}
                      </button>
                    )}
                    {/* Các platform khác: nút login */}
                    {platform !== 'INSTAGRAM' && displayAccts.length === 0 && (
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => handleConnect(platform)}
                          disabled={connecting === platform}
                          className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60 shadow-sm hover:shadow-md active:scale-95"
                          style={{ backgroundColor: meta.color }}
                        >
                          {connecting === platform ? <RefreshCw className="w-4 h-4 animate-spin" /> : meta.icon}
                          {connecting === platform ? 'Đang kết nối...' : meta.loginLabel}
                        </button>
                        {platform === 'THREADS' && (
                          <button
                            onClick={() => setThreadsTokenInputOpen((v) => !v)}
                            className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
                          >
                            {threadsTokenInputOpen ? 'Ẩn form token' : 'Nhập token thủ công'}
                          </button>
                        )}
                      </div>
                    )}
                    {platform !== 'INSTAGRAM' && displayAccts.length > 0 && (
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => handleConnect(platform)}
                          disabled={connecting === platform}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-all disabled:opacity-60"
                          style={{ borderColor: meta.color, color: meta.color }}
                        >
                          {connecting === platform ? <RefreshCw className="w-4 h-4 animate-spin" /> : '＋'}
                          {connecting === platform ? 'Đang kết nối...' : 'Thêm tài khoản'}
                        </button>
                        {platform === 'THREADS' && (
                          <button
                            onClick={() => setThreadsTokenInputOpen((v) => !v)}
                            className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
                          >
                            {threadsTokenInputOpen ? 'Ẩn form token' : 'Nhập token thủ công'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── INSTAGRAM: grid cards với ảnh thật ── */}
                <AnimatePresence initial={false}>
                {platform === 'INSTAGRAM' && displayAccts.length > 0 && !igCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                  <div className="px-8 py-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-slate-600">
                        Instagram Business ({displayAccts.length})
                      </p>
                      {displayAccts.length > PAGES_PER_ROW && (
                        <button
                          onClick={() => setPagesExpanded(prev => ({ ...prev, instagram: !prev['instagram'] }))}
                          className="flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 transition-colors"
                        >
                          {pagesExpanded['instagram'] ? (
                            <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</>
                          ) : (
                            <><ChevronDown className="w-3.5 h-3.5" /> Xem thêm {displayAccts.length - PAGES_PER_ROW} account</>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-4 w-full">
                      {(pagesExpanded['instagram'] ? displayAccts : displayAccts.slice(0, PAGES_PER_ROW)).map((account: SocialAccount) => {
                        const bgColor = letterColor(account.name);
                        const extra = account.extra_data as any;
                        return (
                          <div
                            key={account.id}
                            className="flex items-center gap-4 px-5 py-5 rounded-2xl border border-slate-200 bg-white hover:shadow-sm transition-all w-full"
                          >
                            {account.avatar_url ? (
                              <img
                                src={account.avatar_url}
                                alt={account.name}
                                className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 shadow-md border-2 border-white"
                                onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement)?.style.removeProperty('display'); }}
                              />
                            ) : null}
                            <div className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-md ${account.avatar_url ? 'hidden' : ''}`}>
                              {account.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate leading-snug">{account.name}</p>
                              {account.username && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="w-3 h-3 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
                                  <p className="text-xs text-pink-600 font-semibold truncate">@{account.username}</p>
                                </div>
                              )}
                              <p className="text-xs text-blue-500 mt-0.5 truncate">
                                {extra?.pageId ? `Page: ${extra.pageId}` : 'Direct OAuth'}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              <button
                                onClick={() => handleDisconnect(account)}
                                disabled={disconnecting === account.id}
                                className="text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
                              >
                                {disconnecting === account.id ? '...' : 'Gỡ'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Nút expand ở dưới */}
                    {displayAccts.length > PAGES_PER_ROW && (
                      <button
                        onClick={() => setPagesExpanded(prev => ({ ...prev, instagram: !prev['instagram'] }))}
                        className="mt-3 w-full py-2.5 text-xs font-bold text-slate-500 hover:text-pink-600 border border-slate-200 hover:border-pink-200 rounded-xl bg-slate-50 hover:bg-pink-50 transition-all flex items-center justify-center gap-1.5"
                      >
                        {pagesExpanded['instagram'] ? (
                          <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</>
                        ) : (
                          <><ChevronDown className="w-3.5 h-3.5" /> Xem tất cả {displayAccts.length} Instagram account</>
                        )}
                      </button>
                    )}
                  </div>
                  </motion.div>
                )}
                </AnimatePresence>

                {/* ── FACEBOOK & CÁC PLATFORM KHÁC: account rows + pages grid ── */}
                {platform !== 'INSTAGRAM' && displayAccts.map((account: SocialAccount) => {
                  const pages = accounts.filter((a) => a.parent_id === account.id && (a.extra_data as any)?.type === 'page');
                  const isCollapsed = collapsed[account.id];
                  const extra = account.extra_data as any;
                  const hasPages = pages.length > 0;

                  return (
                    <div key={account.id} className="border-t border-slate-100 first:border-t-0">
                      {/* Account row */}
                      <div className="flex items-center gap-4 px-8 py-5">
                        <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-slate-200">
                          {account.avatar_url
                            ? <img src={account.avatar_url} alt={account.name} className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">{account.name.charAt(0)}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-base">{account.name}</p>
                          <p className="text-sm text-blue-500 mt-0.5">
                            {extra?.label || 'API Official'}
                            {account.token_expires_at && (
                              <span className="ml-3 text-amber-500 font-medium">
                                Hết hạn {new Date(account.token_expires_at).toLocaleDateString('vi')}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {platform === 'FACEBOOK' && hasPages && (
                            <button
                              onClick={() => toggleCollapse(account.id)}
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                              {isCollapsed
                                ? <><ChevronDown className="w-4 h-4" /> Hiện ({pages.length})</>
                                : <><ChevronUp className="w-4 h-4" /> Ẩn</>}
                            </button>
                          )}
                          <button
                            onClick={() => handleDisconnect(account)}
                            disabled={disconnecting === account.id}
                            className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors disabled:opacity-60"
                          >
                            {disconnecting === account.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Gỡ'}
                          </button>
                        </div>
                      </div>

                      {/* Facebook Pages grid */}
                      {platform === 'FACEBOOK' && hasPages && (
                        <AnimatePresence initial={false}>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                            >
                              <div className="px-8 py-5">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                  <p className="text-sm font-semibold text-slate-600">
                                    Các Fanpage được quản lý: ({pages.length})
                                  </p>
                                  {pages.length > PAGES_PER_ROW && (
                                    <button
                                      onClick={() => setPagesExpanded(prev => ({ ...prev, [account.id]: !prev[account.id] }))}
                                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                      {pagesExpanded[account.id] ? (
                                        <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</>
                                      ) : (
                                        <><ChevronDown className="w-3.5 h-3.5" /> Xem thêm {pages.length - PAGES_PER_ROW} page</>
                                      )}
                                    </button>
                                  )}
                                </div>

                                {/* Pages grid — mặc định 1 hàng (PAGES_PER_ROW), expand khi click */}
                                <div className="grid grid-cols-4 gap-4 w-full">
                                  {(pagesExpanded[account.id] ? pages : pages.slice(0, PAGES_PER_ROW)).map((page) => {
                                    const bgColor = letterColor(page.name);
                                    return (
                                      <div
                                        key={page.id}
                                        className="flex items-center gap-4 px-5 py-5 rounded-2xl border border-slate-200 bg-white hover:shadow-sm transition-all w-full"
                                      >
                                        {page.avatar_url ? (
                                          <img
                                            src={page.avatar_url}
                                            alt={page.name}
                                            className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 shadow-md border-2 border-white"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                              (e.currentTarget.nextSibling as HTMLElement)?.style.removeProperty('display');
                                            }}
                                          />
                                        ) : null}
                                        <div className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-md ${page.avatar_url ? 'hidden' : ''}`}>
                                          {page.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-bold text-slate-900 truncate leading-snug">{page.name}</p>
                                          <p className="text-xs text-slate-400 mt-1 truncate">ID: {page.username}</p>
                                        </div>
                                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 self-start mt-0.5" />
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Nút expand ở dưới nếu nhiều pages */}
                                {pages.length > PAGES_PER_ROW && (
                                  <button
                                    onClick={() => setPagesExpanded(prev => ({ ...prev, [account.id]: !prev[account.id] }))}
                                    className="mt-3 w-full py-2.5 text-xs font-bold text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl bg-slate-50 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
                                  >
                                    {pagesExpanded[account.id] ? (
                                      <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</>
                                    ) : (
                                      <><ChevronDown className="w-3.5 h-3.5" /> Xem tất cả {pages.length} page</>
                                    )}
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  );
                })}

                {platform === 'THREADS' && displayAccts.length > 0 && threadsTokenInputOpen && (
                  <div className="mx-8 my-5 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="text-sm font-bold text-slate-800 mb-2">Nạp Token Threads trực tiếp</p>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Nhấp nút <strong>"Tạo mã truy cập"</strong> cho tài khoản Threads Tester trong Meta Developer Dashboard, copy mã token và dán vào đây:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        placeholder="Dán mã Token (ví dụ: TH_...)"
                        className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent text-slate-800 font-mono shadow-sm"
                      />
                      <button
                        onClick={() => handleSaveManualToken('THREADS')}
                        disabled={savingManualToken}
                        className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60 flex-shrink-0"
                      >
                        {savingManualToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lưu'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {displayAccts.length === 0 && (
                  <div className="px-8 py-10 text-center text-slate-400">
                    {platform === 'INSTAGRAM'
                      ? 'Instagram Business sẽ tự động được thêm khi bạn kết nối Facebook.'
                      : `Chưa có tài khoản ${meta.label}. Nhấn "${meta.loginLabel}" để bắt đầu.`}

                    {/* Manual token input specifically for Threads fallback */}
                    {platform === 'THREADS' && threadsTokenInputOpen && (
                      <div className="mt-6 max-w-xl mx-auto p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-sm font-bold text-slate-800 mb-2 text-left">Nạp Token Threads trực tiếp</p>
                        <p className="text-xs text-slate-500 mb-4 text-left leading-relaxed">
                          Nhấp nút <strong>"Tạo mã truy cập"</strong> cho tài khoản Threads Tester trong Meta Developer Dashboard, copy mã token và dán vào đây:
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            placeholder="Dán mã Token (ví dụ: TH_...)"
                            className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent text-slate-800 font-mono shadow-sm"
                          />
                          <button
                            onClick={() => handleSaveManualToken('THREADS')}
                            disabled={savingManualToken}
                            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60 flex-shrink-0"
                          >
                            {savingManualToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lưu'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
