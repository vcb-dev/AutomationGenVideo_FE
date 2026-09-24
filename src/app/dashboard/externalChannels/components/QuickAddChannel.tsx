'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CircleNotch,
  LinkSimple,
  ShoppingBag,
  Sparkle,
  Check,
  Plus,
  BookmarkSimple,
  Tag,
} from '@phosphor-icons/react';

import { useAuthStore } from '@/store/auth-store';
import { scraperService, ScraperChannelTag } from '@/services/scraperService';
import { UserRole } from '@/types/auth';
import AddTagModal from './AddTagModal';

type DetectedPlatform =
  | 'tiktok'
  | 'douyin'
  | 'instagram'
  | 'youtube'
  | 'xiaohongshu'
  | 'kuaishou'
  | 'bilibili'
  | 'facebook'
  | 'threads'
  | null;

// Nhận diện cả domain đầy đủ lẫn domain rút gọn (link copy từ app điện thoại).
// Link rút gọn được BE tự follow redirect để lấy URL thật (resolve-short-link.util.ts).
function detectPlatform(url: string): DetectedPlatform {
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok'; // gồm cả vt./vm.tiktok.com
  if (u.includes('douyin.com')) return 'douyin'; // gồm cả v.douyin.com
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
  if (u.includes('kuaishou.com')) return 'kuaishou'; // gồm cả v.kuaishou.com
  if (u.includes('bilibili.com') || u.includes('b23.tv')) return 'bilibili';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('threads.net')) return 'threads';
  return null;
}

const PLATFORM_LABEL: Record<string, { label: string; badgeClass: string }> = {
  tiktok: { label: 'TikTok', badgeClass: 'bg-black text-cyan-400 border border-cyan-500/30' },
  douyin: { label: 'Douyin', badgeClass: 'bg-black text-rose-400 border border-rose-500/30' },
  instagram: { label: 'Instagram', badgeClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' },
  youtube: { label: 'YouTube', badgeClass: 'bg-red-600 text-white' },
  xiaohongshu: { label: 'Xiaohongshu', badgeClass: 'bg-red-500 text-white' },
  kuaishou: { label: 'Kuaishou', badgeClass: 'bg-orange-500 text-white' },
  bilibili: { label: 'Bilibili', badgeClass: 'bg-sky-500 text-white' },
  facebook: { label: 'Facebook', badgeClass: 'bg-blue-600 text-white' },
  threads: { label: 'Threads', badgeClass: 'bg-black text-white border border-slate-700' },
};

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

export default function QuickAddChannel() {
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const canManageChannels = user?.roles?.some((r) => [UserRole.ADMIN, UserRole.LEADER].includes(r)) ?? false;

  const [url, setUrl] = useState('');
  const [count, setCount] = useState(String(DEFAULT_COUNT));
  const [channelType, setChannelType] = useState<'product' | 'content'>('product');
  const [selectedProductLines, setSelectedProductLines] = useState<string[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(true);
  const [showAddTagModal, setShowAddTagModal] = useState(false);

  // Lấy danh sách thẻ phân loại dòng sản phẩm
  const { data: fetchedTags = [], refetch: refetchTags } = useQuery<ScraperChannelTag[]>({
    queryKey: ['scraper-channel-tags'],
    queryFn: () => (token ? scraperService.getChannelTags(token) : Promise.resolve([])),
    enabled: !!token,
  });

  const availableTags = fetchedTags.length > 0 ? fetchedTags : DEFAULT_FALLBACK_TAGS;

  const toggleProductLine = (slug: string) => {
    setSelectedProductLines((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const detected = url.trim() ? detectPlatform(url.trim()) : null;

  // Helper đảm bảo kênh được bookmark nếu người dùng chọn lưu
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
        // Kênh mới tạo: mặc định is_bookmarked = false nên toggle 1 lần sẽ thành true
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
        // Kênh đã tồn tại: kiểm tra xem đã bookmarked chưa, nếu chưa thì mới toggle
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
      console.error('Lỗi khi đánh dấu lưu bookmark cho kênh:', err);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = url.trim();
      if (!token) throw new Error('Chưa đăng nhập');
      const platform = detectPlatform(trimmed);
      if (!platform) throw new Error('Không nhận diện được nền tảng từ URL này');

      const parsed = Number(count);
      const n = Number.isFinite(parsed) && parsed > 0 ? Math.min(MAX_COUNT, Math.floor(parsed)) : undefined;

      const classificationPayload = {
        channel_type: channelType,
        product_lines: channelType === 'product' ? selectedProductLines : [],
      };

      let result: any;
      switch (platform) {
        case 'tiktok':
          result = await scraperService.tiktokProfileScrape(token, trimmed, undefined, n);
          break;
        case 'douyin':
          result = await scraperService.douyinProfileScrape(token, trimmed, n);
          break;
        case 'instagram':
          result = await scraperService.instagramProfileScrape(token, trimmed, undefined, n);
          break;
        case 'youtube':
          result = await scraperService.youtubeChannelScrape(token, trimmed, undefined, n);
          break;
        case 'kuaishou':
          result = await scraperService.kuaishouProfileScrape(token, trimmed, n);
          break;
        case 'bilibili':
          result = await scraperService.bilibiliProfileScrape(token, trimmed, n);
          break;
        case 'xiaohongshu':
          result = await scraperService.xhsProfileScrape(token, trimmed, n);
          break;
        case 'facebook':
          result = await scraperService.fanpageScrapeByUrl(token, trimmed, n, classificationPayload);
          break;
        case 'threads': {
          const cleanUname = trimmed.replace(/^https?:\/\/(www\.)?threads\.net\//i, '').split('?')[0].split('/')[0].replace(/^@/, '');
          result = await scraperService.scrapeThreadsProfile(token, cleanUname, n);
          break;
        }
      }

      // Lấy id kênh từ kết quả trả về
      const channelId: number | undefined =
        platform === 'facebook'
          ? result?.fanpage_id
          : platform === 'xiaohongshu' || platform === 'threads'
          ? result?.profile?.id
          : result?.profile_id;

      if (channelId) {
        // Cập nhật phân loại thẻ cho kênh (với facebook API scrapeByUrl đã tự lưu, nhưng cập nhật thêm để đồng bộ 100%)
        if (platform !== 'threads') {
          try {
            await scraperService.updateChannelClassification(token, platform, channelId, classificationPayload);
          } catch (err) {
            console.error('Lỗi khi lưu phân loại thẻ:', err);
          }
        }

        // Nếu người dùng chọn lưu vào kênh yêu thích
        if (isBookmarked) {
          const alreadyExists = !!(result?.already_exists || result?.created === false);
          await ensureChannelBookmarked(token, platform, channelId, alreadyExists);
        }
      }

      return { result, platform, channelId };
    },
    onSuccess: (data) => {
      const msg = data.result?.message || 'Đã thêm kênh và lưu thẻ thành công!';
      toast.success(msg);
      setUrl('');
      setSelectedProductLines([]);

      // Invalidate các cache để UI cập nhật ngay lập tức
      queryClient.invalidateQueries({ queryKey: ['all-external-videos'] });
      queryClient.invalidateQueries({ queryKey: ['scraper-channel-tags'] });
      if (data.platform === 'facebook') {
        queryClient.invalidateQueries({ queryKey: ['scraper-fanpages'] });
      } else if (data.platform === 'threads') {
        queryClient.invalidateQueries({ queryKey: ['threads-profiles'] });
      } else {
        queryClient.invalidateQueries({ queryKey: [`scraper-${data.platform}-profiles`] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canManageChannels) return null;

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        {/* Tiêu đề & nhận diện nền tảng */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <LinkSimple size={15} weight="bold" className="text-primary" />
            Thêm kênh & gán thẻ phân loại — dán URL bất kỳ nền tảng
          </p>
          {detected ? (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-2xs ${PLATFORM_LABEL[detected].badgeClass}`}
            >
              {PLATFORM_LABEL[detected].label}
            </span>
          ) : url.trim() ? (
            <span className="text-[11px] text-amber-500 font-medium">Chưa nhận diện được nền tảng</span>
          ) : null}
        </div>

        <p className="text-xs text-slate-400 mb-2.5">
          Số video là mức tối đa muốn lấy. Thẻ và loại kênh sẽ được lưu trực tiếp vào kênh vừa thêm.
        </p>

        {/* Input link & số lượng & Submit */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url.trim() && !mutation.isPending) mutation.mutate();
            }}
            placeholder="Dán URL kênh TikTok / Douyin / Instagram / YouTube / Xiaohongshu / Kuaishou / Bilibili / Facebook..."
            className="flex-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
          />
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            min={1}
            max={MAX_COUNT}
            title={`Số video muốn cào (1-${MAX_COUNT}). Để trống = ${DEFAULT_COUNT}.`}
            placeholder="Số video"
            className="w-28 px-3 py-2.5 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
          />
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !url.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-xs transition-all"
          >
            {mutation.isPending && <CircleNotch size={16} weight="bold" className="animate-spin" />}
            {mutation.isPending ? 'Đang thêm & lưu...' : 'Thêm & cào'}
          </button>
        </div>

        {/* Cấu hình phân loại & chọn thẻ để lưu */}
        <div className="flex flex-col gap-2.5 pt-3 mt-3 border-t border-border/60 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* 1. Chọn loại kênh */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Tag size={13} weight="bold" className="text-primary" />
                Loại kênh:
              </span>
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-border/50">
                <button
                  type="button"
                  onClick={() => setChannelType('product')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    channelType === 'product'
                      ? 'bg-card text-primary shadow-xs'
                      : 'text-slate-500 hover:text-foreground'
                  }`}
                >
                  <ShoppingBag size={13} weight="bold" />
                  Sản phẩm
                </button>
                <button
                  type="button"
                  onClick={() => setChannelType('content')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    channelType === 'content'
                      ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-slate-500 hover:text-foreground'
                  }`}
                >
                  <Sparkle size={13} weight="bold" />
                  Content
                </button>
              </div>
            </div>

            {/* 3. Tuỳ chọn lưu yêu thích (Bookmark) */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 hover:text-foreground select-none">
              <input
                type="checkbox"
                checked={isBookmarked}
                onChange={(e) => setIsBookmarked(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <BookmarkSimple size={14} weight={isBookmarked ? 'fill' : 'regular'} className={isBookmarked ? 'text-amber-500' : 'text-slate-400'} />
              <span className="text-xs font-medium">Lưu vào kênh yêu thích (Bookmark)</span>
            </label>
          </div>

          {/* 2. Chọn thẻ dòng sản phẩm (khi loại kênh là Sản phẩm) */}
          {channelType === 'product' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-slate-400 font-medium mr-1 text-[11px]">Thẻ dòng sản phẩm:</span>
              {availableTags.map((tag) => {
                const isSelected = selectedProductLines.includes(tag.slug);
                return (
                  <button
                    key={tag.slug}
                    type="button"
                    onClick={() => toggleProductLine(tag.slug)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-card text-slate-600 dark:text-slate-300 border-border hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isSelected && <Check size={11} weight="bold" />}
                    <span>{tag.name}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowAddTagModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 border border-dashed border-primary/40 transition-colors ml-1"
                title="Tạo dòng sản phẩm mới"
              >
                <Plus size={11} weight="bold" />
                <span>Thêm dòng mới</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showAddTagModal && (
        <AddTagModal
          isOpen={showAddTagModal}
          onClose={() => setShowAddTagModal(false)}
          onSuccess={(newTag) => {
            setSelectedProductLines((prev) => (prev.includes(newTag.slug) ? prev : [...prev, newTag.slug]));
            refetchTags();
          }}
        />
      )}
    </>
  );
}
