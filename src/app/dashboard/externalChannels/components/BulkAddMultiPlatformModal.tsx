'use client';

import { useState, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  X,
  ListPlus,
  CircleNotch,
  CheckCircle,
  WarningCircle,
  Clock,
  Sparkle,
  ShoppingBag,
  Tag,
  BookmarkSimple,
  Check,
  Copy,
  ArrowRight,
  Globe,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth-store';
import { scraperService, ScraperChannelTag } from '@/services/scraperService';
import { platformStyle } from '@/lib/platform-config';
import { runWithConcurrency } from '@/lib/video-links';
import {
  parseBulkChannelUrls,
  DetectedPlatform,
  ParsedBulkChannelUrl,
  PLATFORM_LABEL,
} from '../lib/bulk-channel-helpers';
import { normalizeThreadsUsername } from '@/lib/scrape/threads-helpers';

interface BulkAddMultiPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  availableTags?: Array<{ name: string; slug: string; id?: number }>;
}

type ItemStatus = 'pending' | 'processing' | 'success' | 'error';

interface ItemProgress {
  id: string;
  url: string;
  platform: NonNullable<DetectedPlatform>;
  status: ItemStatus;
  message?: string;
}

const DEFAULT_FALLBACK_TAGS: { name: string; slug: string }[] = [
  { name: 'Vàng', slug: 'vang' },
  { name: 'Bạc', slug: 'bac' },
  { name: 'Kim cương', slug: 'kim-cuong' },
  { name: 'Đá quý', slug: 'da-quy' },
  { name: 'Phong thuỷ', slug: 'phong-thuy' },
  { name: 'Đồng hồ', slug: 'dong-ho' },
  { name: 'Chế tác', slug: 'che-tac' },
  { name: 'Moissanite', slug: 'moissanite' },
];

const DEFAULT_COUNT = 50;
const MAX_COUNT = 1000;
const CONCURRENCY_LIMIT = 2; // Số tác vụ cào song song an toàn, không gây nghẽn mạng hay chạm rate-limit

export default function BulkAddMultiPlatformModal({
  isOpen,
  onClose,
  onSuccess,
  availableTags = [],
}: BulkAddMultiPlatformModalProps) {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  const [text, setText] = useState('');
  const [count, setCount] = useState(String(DEFAULT_COUNT));
  const [channelType, setChannelType] = useState<'product' | 'content'>('product');
  const [selectedProductLines, setSelectedProductLines] = useState<string[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(true);

  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, current: 0, succeeded: 0, failed: 0 });
  const [itemsProgress, setItemsProgress] = useState<ItemProgress[]>([]);
  const [resultSummary, setResultSummary] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    failedItems: { url: string; error: string }[];
  } | null>(null);

  const tagsList = availableTags.length > 0 ? availableTags : DEFAULT_FALLBACK_TAGS;

  const toggleProductLine = (slug: string) => {
    setSelectedProductLines((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  // Phân tích văn bản dán vào
  const { valid, invalid, duplicatesCount, platformCounts } = useMemo(() => {
    return parseBulkChannelUrls(text);
  }, [text]);

  if (!isOpen) return null;

  // Helper đảm bảo kênh được bookmark
  const ensureChannelBookmarked = async (
    authToken: string,
    platform: NonNullable<DetectedPlatform>,
    channelId: number,
    alreadyExists?: boolean,
  ) => {
    try {
      if (platform === 'xiaohongshu') {
        await scraperService.xhsProfileToggle(authToken, channelId, { is_bookmarked: true });
        return;
      }

      if (!alreadyExists) {
        switch (platform) {
          case 'facebook': await scraperService.toggleFanpage(authToken, channelId, 'is_bookmarked'); break;
          case 'tiktok': await scraperService.toggleTiktokProfile(authToken, channelId, 'is_bookmarked'); break;
          case 'instagram': await scraperService.toggleInstagramProfile(authToken, channelId, 'is_bookmarked'); break;
          case 'youtube': await scraperService.toggleYoutubeProfile(authToken, channelId, 'is_bookmarked'); break;
          case 'douyin': await scraperService.toggleDouyinProfile(authToken, channelId, 'is_bookmarked'); break;
          case 'kuaishou': await scraperService.toggleKuaishouProfile(authToken, channelId, 'is_bookmarked'); break;
          case 'bilibili': await scraperService.toggleBilibiliProfile(authToken, channelId, 'is_bookmarked'); break;
          case 'threads': await scraperService.toggleThreadsProfile(authToken, channelId, 'is_bookmarked', true); break;
        }
      } else {
        let currentBookmarked = false;
        switch (platform) {
          case 'facebook': {
            const d = await scraperService.getFanpageDetail(authToken, channelId);
            currentBookmarked = !!d?.is_bookmarked;
            if (!currentBookmarked) await scraperService.toggleFanpage(authToken, channelId, 'is_bookmarked');
            break;
          }
          case 'tiktok': {
            const d = await scraperService.getTiktokProfileDetail(authToken, channelId);
            currentBookmarked = !!d?.is_bookmarked;
            if (!currentBookmarked) await scraperService.toggleTiktokProfile(authToken, channelId, 'is_bookmarked');
            break;
          }
          case 'instagram': {
            const d = await scraperService.getInstagramProfileDetail(authToken, channelId);
            currentBookmarked = !!d?.is_bookmarked;
            if (!currentBookmarked) await scraperService.toggleInstagramProfile(authToken, channelId, 'is_bookmarked');
            break;
          }
          case 'youtube': {
            const d = await scraperService.getYoutubeProfileDetail(authToken, channelId);
            currentBookmarked = !!d?.is_bookmarked;
            if (!currentBookmarked) await scraperService.toggleYoutubeProfile(authToken, channelId, 'is_bookmarked');
            break;
          }
          case 'douyin': {
            const d = await scraperService.getDouyinProfileDetail(authToken, channelId);
            currentBookmarked = !!d?.is_bookmarked;
            if (!currentBookmarked) await scraperService.toggleDouyinProfile(authToken, channelId, 'is_bookmarked');
            break;
          }
          case 'kuaishou': {
            const d = await scraperService.getKuaishouProfileDetail(authToken, channelId);
            currentBookmarked = !!d?.is_bookmarked;
            if (!currentBookmarked) await scraperService.toggleKuaishouProfile(authToken, channelId, 'is_bookmarked');
            break;
          }
          case 'bilibili': {
            const d = await scraperService.getBilibiliProfileDetail(authToken, channelId);
            currentBookmarked = !!d?.is_bookmarked;
            if (!currentBookmarked) await scraperService.toggleBilibiliProfile(authToken, channelId, 'is_bookmarked');
            break;
          }
          case 'threads': {
            await scraperService.toggleThreadsProfile(authToken, channelId, 'is_bookmarked', true);
            break;
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi đánh dấu lưu bookmark cho kênh:', err);
    }
  };

  const handleStartBulkAdd = async () => {
    if (!token) {
      toast.error('Chưa đăng nhập');
      return;
    }
    if (valid.length === 0) {
      toast.error('Vui lòng nhập ít nhất một URL kênh hợp lệ');
      return;
    }

    const parsedCount = Number(count);
    const n = Number.isFinite(parsedCount) && parsedCount > 0 ? Math.min(MAX_COUNT, Math.floor(parsedCount)) : undefined;

    const classificationPayload = {
      channel_type: channelType,
      product_lines: channelType === 'product' ? selectedProductLines : [],
    };

    setIsExecuting(true);
    setResultSummary(null);

    // Khởi tạo tiến trình
    const initialProgress: ItemProgress[] = valid.map((v) => ({
      id: v.id,
      url: v.url,
      platform: v.platform,
      status: 'pending',
    }));
    setItemsProgress(initialProgress);
    setProgress({ total: valid.length, current: 0, succeeded: 0, failed: 0 });

    const failedItems: { url: string; error: string }[] = [];
    let succeededCount = 0;
    let failedCount = 0;

    await runWithConcurrency(valid, CONCURRENCY_LIMIT, async (item: ParsedBulkChannelUrl, index: number) => {
      // Đánh dấu đang xử lý
      setItemsProgress((prev) =>
        prev.map((p, i) => (i === index ? { ...p, status: 'processing' } : p))
      );

      try {
        let result: any;
        switch (item.platform) {
          case 'tiktok':
            result = await scraperService.tiktokProfileScrape(token, item.url, undefined, n);
            break;
          case 'douyin':
            result = await scraperService.douyinProfileScrape(token, item.url, n);
            break;
          case 'instagram':
            result = await scraperService.instagramProfileScrape(token, item.url, undefined, n);
            break;
          case 'youtube':
            result = await scraperService.youtubeChannelScrape(token, item.url, undefined, n);
            break;
          case 'kuaishou':
            result = await scraperService.kuaishouProfileScrape(token, item.url, n);
            break;
          case 'bilibili':
            result = await scraperService.bilibiliProfileScrape(token, item.url, n);
            break;
          case 'xiaohongshu':
            result = await scraperService.xhsProfileScrape(token, item.url, n);
            break;
          case 'facebook':
            result = await scraperService.fanpageScrapeByUrl(token, item.url, n, classificationPayload);
            break;
          case 'threads': {
            const cleanUname = normalizeThreadsUsername(item.url);
            result = await scraperService.scrapeThreadsProfile(token, cleanUname, n);
            break;
          }
        }

        const channelId: number | undefined =
          item.platform === 'facebook'
            ? result?.fanpage_id
            : item.platform === 'xiaohongshu' || item.platform === 'threads'
            ? result?.profile?.id
            : result?.profile_id;

        if (channelId) {
          if (item.platform !== 'threads') {
            try {
              await scraperService.updateChannelClassification(token, item.platform, channelId, classificationPayload);
            } catch (err) {
              console.warn('Lỗi khi lưu phân loại thẻ:', err);
            }
          }

          if (isBookmarked) {
            const alreadyExists = !!(result?.already_exists || result?.created === false);
            await ensureChannelBookmarked(token, item.platform, channelId, alreadyExists);
          }
        }

        succeededCount++;
        setItemsProgress((prev) =>
          prev.map((p, i) =>
            i === index
              ? {
                  ...p,
                  status: 'success',
                  message: result?.message || 'Đã thêm kênh và cào thành công',
                }
              : p
          )
        );
      } catch (err: any) {
        failedCount++;
        const errMsg = err?.message || 'Lỗi không xác định';
        failedItems.push({ url: item.url, error: errMsg });
        setItemsProgress((prev) =>
          prev.map((p, i) => (i === index ? { ...p, status: 'error', message: errMsg } : p))
        );
      } finally {
        setProgress((prev) => ({
          ...prev,
          current: prev.current + 1,
          succeeded: succeededCount,
          failed: failedCount,
        }));
      }
    });

    setIsExecuting(false);
    setResultSummary({
      total: valid.length,
      succeeded: succeededCount,
      failed: failedCount,
      failedItems,
    });

    // Cập nhật lại các query cache
    queryClient.invalidateQueries({ queryKey: ['all-external-videos'] });
    queryClient.invalidateQueries({ queryKey: ['scraper-channel-tags'] });
    queryClient.invalidateQueries({ queryKey: ['scraper-fanpages'] });
    queryClient.invalidateQueries({ queryKey: ['threads-profiles'] });
    for (const p of ['tiktok', 'douyin', 'instagram', 'youtube', 'xiaohongshu', 'kuaishou', 'bilibili']) {
      queryClient.invalidateQueries({ queryKey: [`scraper-${p}-profiles`] });
    }

    if (succeededCount > 0) {
      toast.success(`Đã thêm thành công ${succeededCount}/${valid.length} kênh!`);
      onSuccess?.();
    } else {
      toast.error('Không thêm được kênh nào trong danh sách.');
    }
  };

  const handleCopyFailedUrls = () => {
    if (!resultSummary?.failedItems.length) return;
    const textToCopy = resultSummary.failedItems.map((f) => f.url).join('\n');
    navigator.clipboard.writeText(textToCopy);
    toast.success('Đã sao chép các URL bị lỗi vào bộ nhớ tạm');
  };

  const handleClose = () => {
    if (isExecuting) {
      if (!confirm('Quá trình thêm hàng loạt đang chạy trong nền. Bạn có chắc muốn đóng modal?')) {
        return;
      }
    }
    setText('');
    setResultSummary(null);
    setItemsProgress([]);
    onClose();
  };

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ListPlus size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Thêm Hàng Loạt Kênh Đa Nền Tảng</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  9 Nền tảng
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dán danh sách liên kết từ TikTok, Douyin, Instagram, YouTube, Xiaohongshu / RedNote, Facebook, Threads...
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Nội dung chính cuộn */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {!isExecuting && !resultSummary ? (
            <>
              {/* Textarea nhập link */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Globe size={14} weight="bold" className="text-primary" />
                    Danh sách liên kết kênh (Mỗi dòng 1 link hoặc cách nhau bằng dấu phẩy)
                  </label>
                  {valid.length > 0 && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {valid.length} kênh hợp lệ {duplicatesCount > 0 && `(đã lọc ${duplicatesCount} trùng)`}
                    </span>
                  )}
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder={`Dán danh sách URL tại đây, ví dụ:\nhttps://www.tiktok.com/@tiemvang_xyz\nhttps://www.douyin.com/user/MS4wLj...\nhttps://www.rednote.com/user/profile/5b1b...\nhttps://www.facebook.com/tiemvangkimanh\nhttps://www.threads.net/@zuck`}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs font-mono resize-y"
                />
              </div>

              {/* Badge thống kê nhận diện nền tảng theo thời gian thực */}
              {valid.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border/80">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Các kênh đã nhận diện:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(platformCounts).map(([plat, cnt]) => {
                      const cfg = platformStyle(plat);
                      const Icon = cfg.icon;
                      const labelInfo = PLATFORM_LABEL[plat];
                      return (
                        <span
                          key={plat}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs ${labelInfo?.badgeClass || 'bg-slate-200 text-slate-800'}`}
                        >
                          <Icon size={14} weight="bold" />
                          <span>{labelInfo?.label || plat}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                            {cnt}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cảnh báo các link không nhận diện được */}
              {invalid.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-300">
                  <div className="font-semibold flex items-center gap-1.5 mb-1">
                    <WarningCircle size={15} weight="bold" />
                    Có {invalid.length} dòng không nhận diện được nền tảng:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] max-h-20 overflow-y-auto">
                    {invalid.slice(0, 5).map((inv, idx) => (
                      <li key={idx} className="truncate">{inv}</li>
                    ))}
                    {invalid.length > 5 && <li>...và {invalid.length - 5} dòng khác</li>}
                  </ul>
                </div>
              )}

              {/* Cấu hình chung cho toàn bộ kênh */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-border space-y-3.5">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Cấu hình áp dụng chung
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Số video cào ban đầu */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Số video muốn cào ban đầu mỗi kênh (1-{MAX_COUNT})
                    </label>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      min={1}
                      max={MAX_COUNT}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
                    />
                  </div>

                  {/* Loại kênh */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Loại kênh phân loại
                    </label>
                    <div className="flex items-center p-0.5 bg-slate-200/60 dark:bg-slate-800 rounded-lg border border-border/50">
                      <button
                        type="button"
                        onClick={() => setChannelType('product')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          channelType === 'product'
                            ? 'bg-card text-primary shadow-xs'
                            : 'text-slate-500 hover:text-foreground'
                        }`}
                      >
                        <ShoppingBag size={14} weight="bold" />
                        Sản phẩm
                      </button>
                      <button
                        type="button"
                        onClick={() => setChannelType('content')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          channelType === 'content'
                            ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs'
                            : 'text-slate-500 hover:text-foreground'
                        }`}
                      >
                        <Sparkle size={14} weight="bold" />
                        Content
                      </button>
                    </div>
                  </div>
                </div>

                {/* Thẻ phân loại dòng sản phẩm (khi chọn loại Sản phẩm) */}
                {channelType === 'product' && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      <Tag size={13} weight="bold" className="text-primary" />
                      Gán thẻ dòng sản phẩm:
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tagsList.map((tag) => {
                        const isSelected = selectedProductLines.includes(tag.slug);
                        return (
                          <button
                            key={tag.slug}
                            type="button"
                            onClick={() => toggleProductLine(tag.slug)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                                : 'bg-card text-slate-600 dark:text-slate-300 border border-border hover:border-primary/50'
                            }`}
                          >
                            {isSelected && <Check size={12} weight="bold" />}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tuỳ chọn lưu Bookmark */}
                <div className="pt-2 border-t border-border/60">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isBookmarked}
                      onChange={(e) => setIsBookmarked(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary"
                    />
                    <BookmarkSimple
                      size={15}
                      weight={isBookmarked ? 'fill' : 'regular'}
                      className={isBookmarked ? 'text-amber-500' : 'text-slate-400'}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      Tự động lưu vào Kênh Yêu Thích (Bookmark)
                    </span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            /* Tiến trình hoặc Kết quả */
            <div className="space-y-4">
              {/* Thanh tiến trình */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <div className="flex items-center gap-2 text-foreground">
                    {isExecuting ? (
                      <>
                        <CircleNotch size={16} weight="bold" className="animate-spin text-primary" />
                        <span>Đang xử lý thêm hàng loạt ({progress.current}/{progress.total})...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} weight="fill" className="text-emerald-500" />
                        <span>Hoàn tất thêm hàng loạt!</span>
                      </>
                    )}
                  </div>
                  <span className="text-primary">{percentage}%</span>
                </div>

                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ Thành công: {progress.succeeded}
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    ✗ Thất bại: {progress.failed}
                  </span>
                  <span>Tổng cộng: {progress.total}</span>
                </div>
              </div>

              {/* Danh sách từng kênh đang chạy / kết quả */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {itemsProgress.map((item, idx) => {
                  const cfg = platformStyle(item.platform);
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-card border border-border rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`p-1.5 rounded-lg ${cfg.bg} ${cfg.color} shrink-0`}>
                          <Icon size={16} weight="bold" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-md" title={item.url}>
                            {item.url}
                          </p>
                          {item.message && (
                            <p
                              className={`text-[11px] truncate mt-0.5 ${
                                item.status === 'error'
                                  ? 'text-rose-500'
                                  : item.status === 'success'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {item.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium text-[11px]">
                            <Clock size={12} /> Chờ...
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-[11px]">
                            <CircleNotch size={12} weight="bold" className="animate-spin" /> Đang cào...
                          </span>
                        )}
                        {item.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            <CheckCircle size={12} weight="fill" /> Thành công
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                            <WarningCircle size={12} weight="fill" /> Lỗi
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Báo cáo nếu có lỗi */}
              {resultSummary && resultSummary.failed > 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="text-rose-700 dark:text-rose-300">
                    Có <strong className="font-bold">{resultSummary.failed}</strong> kênh bị lỗi trong quá trình cào.
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyFailedUrls}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 font-semibold rounded-lg border border-rose-300 dark:border-rose-800 shadow-2xs transition-all"
                  >
                    <Copy size={13} weight="bold" />
                    Sao chép link lỗi
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          {!resultSummary ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isExecuting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-foreground transition-all disabled:opacity-50"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={handleStartBulkAdd}
                disabled={isExecuting || valid.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:opacity-90 disabled:opacity-50 shadow-xs transition-all"
              >
                {isExecuting ? (
                  <>
                    <CircleNotch size={16} weight="bold" className="animate-spin" />
                    <span>Đang xử lý ({progress.current}/{progress.total})...</span>
                  </>
                ) : (
                  <>
                    <ListPlus size={16} weight="bold" />
                    <span>Bắt đầu thêm ({valid.length} kênh)</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setResultSummary(null);
                  setText('');
                  setItemsProgress([]);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-foreground transition-all"
              >
                Thêm đợt khác
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-xs"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
