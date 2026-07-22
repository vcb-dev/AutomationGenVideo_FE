'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { socialApi, SocialAccount, SocialPlatform } from '@/lib/api/social';
import { useSocialAccounts, useInvalidateAccounts, SOCIAL_ACCOUNTS_KEY } from '@/hooks/useSocialAccounts';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { useSocialLang } from '@/contexts/SocialLanguageContext';

// ─── Platform meta ─────────────────────────────────────────────────────────

const P_STATIC: Record<SocialPlatform, { label: string; color: string; icon: React.ReactNode }> = {
  FACEBOOK: {
    label: 'Facebook',
    color: '#1877F2',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
  },
  INSTAGRAM: {
    label: 'Instagram Business',
    color: '#E1306C',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>,
  },
  THREADS: {
    label: 'Threads (Meta)',
    color: '#101010',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.692-1.685-1.74-1.752-2.95-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 013.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.312-.883-2.371-.889h-.048c-.709 0-1.541.195-2.095.694l-1.128-1.566c.874-.777 2.08-1.184 3.477-1.184h.072c2.714.018 4.533 1.423 4.96 3.906.16.905.208 1.87.135 2.88.595.42 1.1.915 1.504 1.482.975 1.383 1.214 3.177.64 5.15-.617 2.098-2.066 3.832-4.07 4.878-1.85.96-4.041 1.446-6.528 1.446z" /></svg>,
  },
  YOUTUBE: {
    label: 'YouTube',
    color: '#FF0000',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>,
  },
};

const LETTER_COLORS = ['bg-slate-500', 'bg-slate-600', 'bg-gray-500', 'bg-zinc-500', 'bg-neutral-500', 'bg-stone-500', 'bg-slate-400', 'bg-gray-600', 'bg-zinc-600', 'bg-neutral-600'];
const letterColor = (name: string) => LETTER_COLORS[name.charCodeAt(0) % LETTER_COLORS.length];

type Tab = 'ALL' | SocialPlatform;
const ALL_PLATFORMS: SocialPlatform[] = ['FACEBOOK', 'INSTAGRAM', 'THREADS', 'YOUTUBE'];

// ─── Component ─────────────────────────────────────────────────────────────

export default function ChannelsPage() {
  const { lang, setLang, t } = useSocialLang();
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const { data: accounts = [], isLoading: loading, error } = useSocialAccounts();
  const currentUser = useAuthStore(s => s.user);
  const isAdmin = currentUser?.roles?.includes(UserRole.ADMIN) ?? false;
  // Admin gỡ được mọi tài khoản; người khác chỉ gỡ tài khoản mình kết nối (hoặc account cũ chưa gán chủ)
  const canRemove = (account: SocialAccount) =>
    isAdmin || !account.user_id || account.user_id === currentUser?.id;
  const [expiringAccounts, setExpiringAccounts] = useState<any[]>([]);
  useEffect(() => {
    socialApi.accounts.expiring().then(setExpiringAccounts).catch(() => {});
  }, []);
  const invalidateAccounts = useInvalidateAccounts();
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [threadsTokenInputOpen, setThreadsTokenInputOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [savingManualToken, setSavingManualToken] = useState(false);

  // Keep a ref to t so closures in effects/intervals always get the latest translations
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (error) toast.error(t.failedToLoad);
  }, [error, t.failedToLoad]);

  const loadAccounts = useCallback(async () => {
    await invalidateAccounts();
  }, [invalidateAccounts]);

  const accountCountBeforeConnect = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupCheckerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectingRef = useRef<SocialPlatform | null>(null);
  useEffect(() => { connectingRef.current = connecting; }, [connecting]);

  const refreshAfterOAuth = useCallback((platform?: SocialPlatform) => {
    invalidateAccounts();

    if (platform !== 'FACEBOOK') return;

    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    let lastCount = 0;
    let stableCount = 0;
    const STABLE_NEEDED = 2;

    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    const scanTimer = setInterval(async () => {
      attempts++;
      try {
        const fresh = await socialApi.accounts.list();
        const currentCount = fresh.length;
        qc.setQueryData(SOCIAL_ACCOUNTS_KEY, fresh);

        if (currentCount === lastCount && lastCount > 0) {
          stableCount++;
          if (stableCount >= STABLE_NEEDED) {
            clearInterval(scanTimer);
            scanTimerRef.current = null;
            toast.success(tRef.current.scanDone, { duration: 3000 });
            return;
          }
        } else {
          stableCount = 0;
          lastCount = currentCount;
        }
      } catch { /* silent */ }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(scanTimer);
        scanTimerRef.current = null;
        invalidateAccounts();
      }
    }, 2000);
    scanTimerRef.current = scanTimer;
  }, [invalidateAccounts, qc]);

  useEffect(() => {
    const handleOAuth = (payload: { type?: string; error?: string }) => {
      if (!payload?.type) return;
      if (payload.type.endsWith('-oauth-success')) {
        const platform = payload.type.replace('-oauth-success', '').toUpperCase() as SocialPlatform;
        const isFacebook = platform === 'FACEBOOK';
        toast.success(isFacebook ? tRef.current.connectSuccessPages : tRef.current.connectSuccessData);
        setConnecting(null);
        if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
        refreshAfterOAuth(platform);
      } else if (payload.type.endsWith('-oauth-error')) {
        toast.error(tRef.current.connectFailed(payload.error || 'Lỗi không xác định'));
        setConnecting(null);
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('vcb-oauth');
      bc.onmessage = (e) => handleOAuth(e.data);
    } catch { /* browser cũ không hỗ trợ */ }

    const onMsg = (e: MessageEvent) => handleOAuth(e.data);
    window.addEventListener('message', onMsg);

    return () => {
      bc?.close();
      window.removeEventListener('message', onMsg);
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
      if (popupCheckerRef.current) { clearInterval(popupCheckerRef.current); popupCheckerRef.current = null; }
      if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
    };
  }, [loadAccounts, refreshAfterOAuth]);

  const handleConnect = async (platform: SocialPlatform, igMode?: 'direct') => {
    setConnecting(platform);
    const snapshotIds = new Set(accounts.filter(a => a.platform === platform).map(a => a.id));
    accountCountBeforeConnect.current = accounts.length;

    const popup = window.open('', `oauth-${platform}`, 'width=620,height=720,left=200,top=80');

    try {
      const { url } = await socialApi.oauth.getUrl(platform, igMode ? { igMode } : undefined);

      if (!popup) {
        toast.error(tRef.current.popupBlocked);
        setConnecting(null);
        return;
      }

      popup.location.href = url;

      if (popupCheckerRef.current) clearInterval(popupCheckerRef.current);
      popupCheckerRef.current = setInterval(async () => {
        if (popup.closed) {
          if (popupCheckerRef.current) { clearInterval(popupCheckerRef.current); popupCheckerRef.current = null; }
          await new Promise((r) => setTimeout(r, 2000));
          if (connectingRef.current !== platform) return;

          toast(tRef.current.checkingConnection, { icon: '🔄' });
          let pollCount = 0;
          pollTimerRef.current = setInterval(async () => {
            pollCount++;
            try {
              await invalidateAccounts();
              const freshAccounts = await socialApi.accounts.list();
              const platformAccounts = freshAccounts.filter(a => a.platform === platform);
              const hasNewAccount = freshAccounts.length > accountCountBeforeConnect.current ||
                platformAccounts.some(a => !snapshotIds.has(a.id));

              if (hasNewAccount) {
                if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
                setConnecting(null);
                toast.success(tRef.current.connectSuccess);
                refreshAfterOAuth(platform);
              } else if (pollCount >= 8) {
                if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
                setConnecting(null);
                const hasAny = freshAccounts.filter(a => a.platform === platform).some(a => !snapshotIds.has(a.id));
                if (hasAny) {
                  toast.success(tRef.current.connectSuccess);
                  refreshAfterOAuth(platform);
                } else {
                  toast(tRef.current.refreshHint, { icon: 'ℹ️' });
                }
              }
            } catch { /* silent */ }
          }, 2000);
        }
      }, 1000);
    } catch {
      toast.error(tRef.current.connectionError);
      setConnecting(null);
      if (popup && !popup.closed) popup.close();
    }
  };

  const handleSaveManualToken = async (platform: SocialPlatform) => {
    if (!manualToken.trim()) {
      toast.error(t.enterToken);
      return;
    }
    setSavingManualToken(true);
    try {
      await socialApi.oauth.connectViaToken(platform, { access_token: manualToken.trim() });
      toast.success(t.accountConnected);
      setManualToken('');
      setThreadsTokenInputOpen(false);
      await loadAccounts();
    } catch (err: any) {
      toast.error(t.connectionErrorWith(err.message || 'Mã token không hợp lệ'));
    } finally {
      setSavingManualToken(false);
    }
  };

  const handleDisconnect = async (account: SocialAccount) => {
    if (!canRemove(account)) {
      toast.error(t.cannotDisconnectOther);
      return;
    }
    const extra = account.extra_data as any;
    const isPersonalFB = account.platform === 'FACEBOOK' && !extra?.type;
    const confirmMsg = isPersonalFB
      ? t.disconnectConfirmWithPages(account.name)
      : t.disconnectConfirm(account.name);
    if (!confirm(confirmMsg)) return;
    setDisconnecting(account.id);
    try {
      await socialApi.accounts.disconnect(account.id);
      toast.success(t.disconnected);
      await invalidateAccounts();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi không xác định';
      toast.error(t.disconnectFailed(msg));
    }
    finally { setDisconnecting(null); }
  };

  const toggleCollapse = (accountId: string) =>
    setCollapsed((prev) => ({ ...prev, [accountId]: !prev[accountId] }));

  const [igCollapsed, setIgCollapsed] = useState(false);
  const [pagesExpanded, setPagesExpanded] = useState<Record<string, boolean>>({});
  const PAGES_PER_ROW = 4;

  // ── Derived ────────────────────────────────────────────────────────────────
  const visiblePlatforms = activeTab === 'ALL' ? ALL_PLATFORMS : [activeTab as SocialPlatform];

  const getDisplayCount = (platform: SocialPlatform) => {
    if (platform === 'INSTAGRAM') {
      return accounts.filter((a) => a.platform === 'INSTAGRAM').length;
    }
    const SUB_TYPES = ['page', 'instagram_business'];
    return accounts.filter((a) => a.platform === platform && !SUB_TYPES.includes((a.extra_data as any)?.type)).length;
  };
  const totalConnected = ALL_PLATFORMS.reduce((sum, p) => sum + getDisplayCount(p), 0);

  const tabList: { key: Tab; label: string; icon?: React.ReactNode }[] = [
    { key: 'ALL', label: t.tabAll },
    ...ALL_PLATFORMS.map((p) => ({ key: p as Tab, label: P_STATIC[p].label.split(' ')[0], icon: P_STATIC[p].icon })),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">

      {/* Token expiry warning banner */}
      {expiringAccounts.length > 0 && (
        <div className="mx-8 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800 mb-1">
              {t.expiringBanner(expiringAccounts.length)}
            </p>
            <div className="flex flex-wrap gap-2">
              {expiringAccounts.map((acc: any) => (
                <span key={acc.id} className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                  <Clock className="w-3 h-3" />
                  {acc.name}
                  <span className="text-amber-500">· {acc.days_until_expiry <= 0 ? t.expired : t.daysLeft(acc.days_until_expiry)}</span>
                </span>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-1.5">{t.renewHint}</p>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-8 pt-6 pb-4 text-sm border-b border-slate-200">
        <span className="text-blue-600">{t.channels}</span>
        <span className="text-slate-300">›</span>
        <span className="font-semibold text-slate-800">{t.manageChannels}</span>
        <span className="ml-1 px-2 py-0.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
          {t.channelCount(totalConnected)}
        </span>

        {/* Language toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold ml-3">
          <button
            onClick={() => setLang('vi')}
            className={`px-3 py-1.5 transition-colors ${lang === 'vi' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            VI
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 transition-colors border-l border-slate-200 ${lang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            EN
          </button>
        </div>

        <button onClick={() => loadAccounts()} className="ml-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <RefreshCw className="w-4 h-4" /> {t.refresh}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-0 px-8 border-b border-slate-200 bg-white">
        {tabList.map(({ key, label, icon }) => {
          const count = key === 'ALL' ? totalConnected : getDisplayCount(key as SocialPlatform);
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
      <div className="px-4 md:px-8 py-6 space-y-6">
        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-2xl border border-slate-200 animate-pulse bg-slate-50" />)}
          </div>
        ) : (
          visiblePlatforms.map((platform) => {
            const meta = P_STATIC[platform];
            const loginLabel = t.loginLabel[platform];
            const SUB_TYPES = ['page', 'instagram_business'];
            const displayAccts = platform === 'INSTAGRAM'
              ? accounts.filter((a) => a.platform === 'INSTAGRAM')
              : accounts.filter((a) => a.platform === platform && !SUB_TYPES.includes((a.extra_data as any)?.type));

            return (
              <div key={platform} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                {/* Platform header */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 px-4 md:px-8 py-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span style={{ color: meta.color }} className="text-xl">{meta.icon}</span>
                    <span className="text-lg font-bold" style={{ color: meta.color }}>{meta.label}</span>
                  </div>

                  <div className="md:ml-auto mt-2 md:mt-0 flex gap-2 flex-wrap">
                    {/* Instagram: 1 nút chính (tự động lấy từ FB Page) + link phụ cho case chưa liên kết FB */}
                    {platform === 'INSTAGRAM' && displayAccts.length === 0 && (
                      <button
                        onClick={() => handleConnect('INSTAGRAM', 'direct')}
                        disabled={connecting === 'INSTAGRAM'}
                        className="flex items-center gap-1 px-3 py-2 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 shadow-sm hover:shadow-md active:scale-95"
                        style={{ backgroundColor: meta.color }}
                      >
                        {connecting === 'INSTAGRAM' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '+'}
                        {connecting === 'INSTAGRAM' ? t.connecting : t.connectInstagram}
                      </button>
                    )}
                    {platform === 'INSTAGRAM' && displayAccts.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleConnect('INSTAGRAM', 'direct')}
                          disabled={connecting === 'INSTAGRAM'}
                          className="flex items-center gap-1 px-3 py-2 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 shadow-sm hover:shadow-md active:scale-95"
                          style={{ backgroundColor: meta.color }}
                        >
                          {connecting === 'INSTAGRAM' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '+'}
                          {connecting === 'INSTAGRAM' ? t.connecting : t.addInstagram}
                        </button>
                        <button
                          onClick={() => setIgCollapsed((v) => !v)}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                          {igCollapsed
                            ? <><ChevronDown className="w-4 h-4" /> {t.showN(displayAccts.length)}</>
                            : <><ChevronUp className="w-4 h-4" /> {t.hide}</>}
                        </button>
                      </div>
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
                          {connecting === platform ? t.connecting : loginLabel}
                        </button>
                        {platform === 'THREADS' && (
                          <button
                            onClick={() => setThreadsTokenInputOpen((v) => !v)}
                            className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
                          >
                            {threadsTokenInputOpen ? t.hideTokenForm : t.enterTokenManual}
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
                          {connecting === platform ? t.connecting : t.addAccount}
                        </button>
                        {platform === 'THREADS' && (
                          <button
                            onClick={() => setThreadsTokenInputOpen((v) => !v)}
                            className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
                          >
                            {threadsTokenInputOpen ? t.hideTokenForm : t.enterTokenManual}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── INSTAGRAM: grid cards ── */}
                <AnimatePresence initial={false}>
                {platform === 'INSTAGRAM' && displayAccts.length > 0 && !igCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                  <div className="px-4 md:px-8 py-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-slate-600">
                        {t.igBusinessCount(displayAccts.length)}
                      </p>
                      {displayAccts.length > PAGES_PER_ROW && (
                        <button
                          onClick={() => setPagesExpanded(prev => ({ ...prev, instagram: !prev['instagram'] }))}
                          className="flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 transition-colors"
                        >
                          {pagesExpanded['instagram'] ? (
                            <><ChevronUp className="w-3.5 h-3.5" /> {t.collapse}</>
                          ) : (
                            <><ChevronDown className="w-3.5 h-3.5" /> {t.showMoreAccounts(displayAccts.length - PAGES_PER_ROW)}</>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
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
                              {canRemove(account) && (
                                <button
                                  onClick={() => handleDisconnect(account)}
                                  disabled={disconnecting === account.id}
                                  className="text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  {disconnecting === account.id ? '...' : t.remove}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {displayAccts.length > PAGES_PER_ROW && (
                      <button
                        onClick={() => setPagesExpanded(prev => ({ ...prev, instagram: !prev['instagram'] }))}
                        className="mt-3 w-full py-2.5 text-xs font-bold text-slate-500 hover:text-pink-600 border border-slate-200 hover:border-pink-200 rounded-xl bg-slate-50 hover:bg-pink-50 transition-all flex items-center justify-center gap-1.5"
                      >
                        {pagesExpanded['instagram'] ? (
                          <><ChevronUp className="w-3.5 h-3.5" /> {t.collapse}</>
                        ) : (
                          <><ChevronDown className="w-3.5 h-3.5" /> {t.viewAllIg(displayAccts.length)}</>
                        )}
                      </button>
                    )}
                  </div>
                  </motion.div>
                )}
                </AnimatePresence>

                {/* ── FACEBOOK & CÁC PLATFORM KHÁC ── */}
                {platform !== 'INSTAGRAM' && displayAccts.map((account: SocialAccount) => {
                  const pages = accounts.filter((a) => a.parent_id === account.id && (a.extra_data as any)?.type === 'page');
                  const isCollapsed = collapsed[account.id];
                  const extra = account.extra_data as any;
                  const hasPages = pages.length > 0;

                  return (
                    <div key={account.id} className="border-t border-slate-100 first:border-t-0">
                      {/* Account row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 md:px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-slate-200">
                            {account.avatar_url
                              ? <img src={account.avatar_url} alt={account.name} className="w-full h-full object-cover" />
                              : <span className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">{account.name.charAt(0)}</span>}
                          </div>
                          <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-base">{account.name}</p>
                          <p className="text-sm text-blue-500 mt-0.5">
                            {extra?.label || 'API Official'}
                            {account.token_expires_at && (
                              <span className="ml-3 text-amber-500 font-medium">
                                {t.expiresOn(new Date(account.token_expires_at).toLocaleDateString(t.dateLocale))}
                              </span>
                            )}
                          </p>
                        </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 self-start sm:self-auto">
                          {platform === 'FACEBOOK' && hasPages && (
                            <button
                              onClick={() => toggleCollapse(account.id)}
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                              {isCollapsed
                                ? <><ChevronDown className="w-4 h-4" /> {t.showN(pages.length)}</>
                                : <><ChevronUp className="w-4 h-4" /> {t.hide}</>}
                            </button>
                          )}
                          {canRemove(account) && (
                            <button
                              onClick={() => handleDisconnect(account)}
                              disabled={disconnecting === account.id}
                              className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors disabled:opacity-60"
                            >
                              {disconnecting === account.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : t.remove}
                            </button>
                          )}
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
                              <div className="px-4 md:px-8 py-5">
                                <div className="flex items-center justify-between mb-4">
                                  <p className="text-sm font-semibold text-slate-600">
                                    {t.managedPages(pages.length)}
                                  </p>
                                  {pages.length > PAGES_PER_ROW && (
                                    <button
                                      onClick={() => setPagesExpanded(prev => ({ ...prev, [account.id]: !prev[account.id] }))}
                                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                      {pagesExpanded[account.id] ? (
                                        <><ChevronUp className="w-3.5 h-3.5" /> {t.collapse}</>
                                      ) : (
                                        <><ChevronDown className="w-3.5 h-3.5" /> {t.showMorePages(pages.length - PAGES_PER_ROW)}</>
                                      )}
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
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

                                {pages.length > PAGES_PER_ROW && (
                                  <button
                                    onClick={() => setPagesExpanded(prev => ({ ...prev, [account.id]: !prev[account.id] }))}
                                    className="mt-3 w-full py-2.5 text-xs font-bold text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl bg-slate-50 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
                                  >
                                    {pagesExpanded[account.id] ? (
                                      <><ChevronUp className="w-3.5 h-3.5" /> {t.collapse}</>
                                    ) : (
                                      <><ChevronDown className="w-3.5 h-3.5" /> {t.viewAllPages(pages.length)}</>
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
                    <p className="text-sm font-bold text-slate-800 mb-2">{t.loadThreadsToken}</p>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">{t.threadsTokenDesc}</p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        placeholder={t.tokenPlaceholder}
                        className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent text-slate-800 font-mono shadow-sm"
                      />
                      <button
                        onClick={() => handleSaveManualToken('THREADS')}
                        disabled={savingManualToken}
                        className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60 flex-shrink-0"
                      >
                        {savingManualToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : t.save}
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {displayAccts.length === 0 && (
                  <div className="px-8 py-10 text-center text-slate-400">
                    {platform === 'INSTAGRAM'
                      ? t.igAutoNote
                      : t.noAccounts(meta.label, loginLabel)}

                    {platform === 'THREADS' && threadsTokenInputOpen && (
                      <div className="mt-6 max-w-xl mx-auto p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-sm font-bold text-slate-800 mb-2 text-left">{t.loadThreadsToken}</p>
                        <p className="text-xs text-slate-500 mb-4 text-left leading-relaxed">{t.threadsTokenDesc}</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            placeholder={t.tokenPlaceholder}
                            className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent text-slate-800 font-mono shadow-sm"
                          />
                          <button
                            onClick={() => handleSaveManualToken('THREADS')}
                            disabled={savingManualToken}
                            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60 flex-shrink-0"
                          >
                            {savingManualToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : t.save}
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
