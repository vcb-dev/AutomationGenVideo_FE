import { fetchWithAuth } from '@/lib/api-client';
// Đi qua BE (proxy sang AI ở src/modules/scraper-proxy), không gọi thẳng AI nữa.
import type { PlatformKey } from '@/lib/platform-config';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

function buildParams(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const str = params.toString();
  return str ? `?${str}` : '';
}

export interface ScrapedFanpage {
  id: number;
  profile_id: string;
  name: string;
  handle: string;
  page_url: string;
  avatar_url: string;
  is_verified: boolean | null;
  followers_count: number;
  likes_count: number;
  is_visible_on_ui: boolean;
  is_periodic_crawl: boolean;
  is_bookmarked: boolean;
  is_initial_scraped: boolean;
  scraping_status: 'idle' | 'processing' | 'completed' | 'failed';
  last_scraped_at: string | null;
  scrape_error: string | null;
  reels_count: number;
  created_at: string;
  // detail only
  total_views?: number;
  total_likes?: number;
  total_comments?: number;
  total_shares?: number;
}

export interface ScrapedReel {
  post_id: string;
  shortcode: string;
  url: string;
  content: string;
  hashtags: string[];
  video_url: string;
  thumbnail_url: string;
  duration_seconds: number | null;
  has_audio: boolean;
  date_posted: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  fanpage: {
    id: number;
    name: string;
    handle: string;
    avatar_url: string;
  } | null;
}

export interface TikTokVideo {
  post_id: string;
  shortcode: string;
  url: string;
  description: string;
  hashtags: string[];
  video_url: string;
  cdn_url: string;
  preview_image: string;
  video_duration: number;
  region: string;
  play_count?: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  music_title: string;
  search_keyword: string;
  date_posted: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    url: string;
    followers: number;
    is_verified: boolean;
  };
}

export interface PaginatedTikTokVideos {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  videos: TikTokVideo[];
}

export interface XiaohongshuVideo {
  id: number;
  note_id: string;
  url: string;
  title: string;
  description: string;
  thumbnail_url: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  duration_seconds: number;
  liked_count: number;
  collected_count: number;
  comments_count: number;
  shared_count: number;
  keywords: string[];
  date_posted: string;
}

export interface PaginatedXiaohongshuVideos {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  videos: XiaohongshuVideo[];
}

export interface XiaohongshuProfile {
  id: number;
  user_id: string;
  nickname: string;
  avatar_url: string;
  is_verified: boolean;
  is_tracked: boolean;
  is_bookmarked: boolean;
  is_owned: boolean;
  is_initial_scraped: boolean;
  last_scraped_at: string | null;
  scraping_status: 'idle' | 'processing' | 'completed' | 'failed';
  scrape_error: string | null;
  created_at: string;
  videos_count?: number;
}

export interface PaginatedXhsProfiles {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  profiles: XiaohongshuProfile[];
}

export interface DouyinVideo {
  post_id: string;
  url: string;
  description: string;
  hashtags: string[];
  preview_image: string;
  video_duration: number;
  region: string;
  digg_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  music_title: string;
  search_keyword: string;
  date_posted: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    followers: number;
    is_verified: boolean;
  };
}

export interface DouyinProfile {
  id: number;
  sec_user_id: string;
  uid: string;
  username: string;
  nickname: string;
  avatar_url: string;
  biography: string;
  is_verified: boolean;
  followers_count: number;
  is_bookmarked: boolean;
  is_tracked: boolean;
  is_owned: boolean;
  is_initial_scraped: boolean;
  last_scraped_at: string | null;
  scraping_status: 'idle' | 'processing' | 'completed' | 'failed';
  scrape_error: string | null;
  created_at: string;
  videos_in_db: number;
  total_diggs?: number;
  total_comments?: number;
  total_shares?: number;
  total_collects?: number;
}

export interface PaginatedDouyinProfiles {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  profiles: DouyinProfile[];
}

export interface PaginatedDouyinVideos {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  videos: DouyinVideo[];
}

export interface TikTokProfile {
  id: number;
  profile_id: string;
  username: string;
  nickname: string;
  url: string;
  avatar_url: string;
  biography: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  likes_count: number;
  videos_count: number;
  is_tracked: boolean;
  is_bookmarked: boolean;
  is_owned: boolean;
  is_initial_scraped: boolean;
  scraping_status: 'idle' | 'processing' | 'completed' | 'failed';
  scrape_error: string | null;
  last_scraped_at: string | null;
  created_at: string;
  videos_in_db: number;
  // detail only
  total_plays?: number;
  total_diggs?: number;
  total_comments?: number;
  total_shares?: number;
}

export interface TikTokProfileVideo {
  video_id: string;
  shortcode: string;
  url: string;
  description: string;
  hashtags: string[];
  cover_image: string;
  video_duration: number;
  region: string;
  post_type: string;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  favorites_count: number;
  music_title: string;
  music_author: string;
  date_posted: string;
  profile: {
    id: number;
    username: string;
    nickname: string;
    avatar_url: string;
  } | null;
}

export interface PaginatedTikTokProfiles {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  profiles: TikTokProfile[];
}

export interface PaginatedTikTokProfileVideos {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  videos: TikTokProfileVideo[];
}

export interface InstagramProfile {
  id: number;
  username: string;
  url: string;
  avatar_url: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_tracked: boolean;
  is_bookmarked: boolean;
  is_owned: boolean;
  is_initial_scraped: boolean;
  scraping_status: 'idle' | 'processing' | 'completed' | 'failed';
  scrape_error: string | null;
  last_scraped_at: string | null;
  created_at: string;
  reels_in_db: number;
  // detail only
  total_plays?: number;
  total_likes?: number;
  total_comments?: number;
  total_views?: number;
}

export interface InstagramReel {
  post_id: string;
  shortcode: string;
  url: string;
  description: string;
  hashtags: string[];
  thumbnail_url: string;
  thumbnail_drive_url: string | null;
  duration_seconds: number | null;
  is_paid_partnership: boolean;
  views_count: number;
  play_count: number;
  likes_count: number;
  comments_count: number;
  date_posted: string;
  profile: {
    id: number;
    username: string;
    avatar_url: string;
  } | null;
}

export interface PaginatedInstagramProfiles {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  profiles: InstagramProfile[];
}

export interface PaginatedInstagramReels {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  reels: InstagramReel[];
}

export interface YoutubeProfile {
  id: number;
  channel_id: string;
  title: string;
  description: string;
  url: string;
  avatar_url: string;
  banner_url: string;
  is_verified: boolean;
  has_business_email: boolean;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  country: string;
  channel_created_at: string | null;
  is_tracked: boolean;
  is_bookmarked: boolean;
  is_owned: boolean;
  is_initial_scraped: boolean;
  scraping_status: 'idle' | 'processing' | 'completed' | 'failed';
  scrape_error: string | null;
  last_scraped_at: string | null;
  created_at: string;
  shorts_in_db: number;
  // detail only
  total_views?: number;
}

export interface YoutubeShort {
  video_id: string;
  title: string;
  hashtags: string[];
  url: string;
  thumbnail_url: string;
  view_count: number;
  view_count_text: string;
  created_at: string;
}

export interface PaginatedYoutubeProfiles {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  profiles: YoutubeProfile[];
}

export interface PaginatedYoutubeShorts {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  profile: YoutubeProfile;
  shorts: YoutubeShort[];
}

export interface YoutubeShortWithProfile extends YoutubeShort {
  profile: { id: number; channel_id: string; title: string; avatar_url: string; };
}

export interface PaginatedYoutubeShortsList {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  shorts: YoutubeShortWithProfile[];
}

export interface KuaishouProfile {
  id: number;
  // eid: định danh trong URL profile (kuaishou.com/profile/{eid}) — dùng khi
  // gọi kuaishouProfileScrape. user_id (numeric) chỉ để hiển thị/tham chiếu,
  // có thể null trong khoảnh khắc ngắn trước khi resolve xong.
  eid: string;
  user_id: string | null;
  username: string;
  nickname: string;
  url: string;
  avatar_url: string;
  biography: string;
  gender: string;
  followers_count: number;
  following_count: number;
  likes_count: number;
  videos_count: number;
  is_tracked: boolean;
  is_bookmarked: boolean;
  is_initial_scraped: boolean;
  scraping_status: 'idle' | 'processing' | 'completed' | 'failed';
  scrape_error: string | null;
  last_scraped_at: string | null;
  created_at: string;
  videos_in_db: number;
  // detail only
  total_views?: number;
}

export interface KuaishouVideo {
  post_id: string;
  url: string;
  description: string;
  hashtags: string[];
  thumbnail_url: string;
  video_duration: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  date_posted: string;
  created_at: string;
}

export interface PaginatedKuaishouProfiles {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  profiles: KuaishouProfile[];
}

export interface PaginatedKuaishouVideos {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  profile: KuaishouProfile;
  videos: KuaishouVideo[];
}

export interface KuaishouSearchVideo {
  post_id: string;
  url: string;
  description: string;
  hashtags: string[];
  thumbnail_url: string;
  video_duration: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  search_keyword: string;
  date_posted: string;
  author: {
    id: string;
    eid: string;
    username: string;
    avatar_url: string;
    is_verified: boolean;
  } | null;
}

export interface PaginatedKuaishouSearchVideos {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  videos: KuaishouSearchVideo[];
}

export interface BilibiliProfile {
  id: number;
  mid: string;
  username: string;
  nickname: string;
  url: string;
  avatar_url: string;
  biography: string;
  is_verified: boolean;
  verify_desc: string;
  followers_count: number;
  following_count: number;
  likes_count: number;
  videos_count: number;
  is_tracked: boolean;
  is_bookmarked: boolean;
  is_initial_scraped: boolean;
  scraping_status: 'idle' | 'processing' | 'completed' | 'failed';
  scrape_error: string | null;
  last_scraped_at: string | null;
  created_at: string;
  videos_in_db: number;
  // detail only
  total_views?: number;
}

export interface BilibiliVideo {
  post_id: string;
  url: string;
  description: string;
  thumbnail_url: string;
  video_duration: number;
  view_count: number;
  danmaku_count: number;
  date_posted: string;
  created_at: string;
}

export interface PaginatedBilibiliProfiles {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  profiles: BilibiliProfile[];
}

export interface PaginatedBilibiliVideos {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  profile: BilibiliProfile;
  videos: BilibiliVideo[];
}

export interface BilibiliSearchVideo {
  post_id: string;
  url: string;
  description: string;
  hashtags: string[];
  thumbnail_url: string;
  video_duration: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  collect_count: number;
  danmaku_count: number;
  search_keyword: string;
  date_posted: string;
  author: {
    id: string;
    username: string;
    avatar_url: string;
  } | null;
}

export interface PaginatedBilibiliSearchVideos {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  videos: BilibiliSearchVideo[];
}

export interface KeywordSuggestion {
  id: number;
  keyword: string;
  hits: number;
}

// Lookalike Creator — shape chung, mỗi platform chỉ điền field định danh của
// mình (username/channel_id/user_id/sec_user_id/eid), field còn lại undefined.
export interface LookalikeChannel {
  id: number;
  username?: string;
  nickname?: string;
  full_name?: string;
  title?: string;
  channel_id?: string;
  user_id?: string;
  sec_user_id?: string;
  eid?: string;
  avatar_url: string;
  followers_count?: number;
  subscriber_count?: number;
  overlap_count: number;
}

export interface PaginatedFanpages {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  fanpages: ScrapedFanpage[];
}

export interface PaginatedReels {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  reels: ScrapedReel[];
}

export interface ExternalVideo {
  /**
   * TÁM nền tảng, không phải ba.
   *
   * Trước đây endpoint gộp chỉ trả facebook/tiktok/instagram nên kiểu này khai đúng ba cái.
   * Từ khi thêm 5 nhánh douyin/xiaohongshu/kuaishou/bilibili/youtube vào truy vấn gộp, thực
   * tế trả về tới 6 nền tảng — mà kiểu vẫn khai 3, nên TypeScript tưởng mọi tra cứu
   * `platformConfig[video.platform]` đều chắc chắn có, không cảnh báo gì, và trang
   * /externalChannels/all vỡ ngay khi gặp video Douyin. Khai đủ ở đây để trình biên dịch
   * bắt lỗi thay vì để người dùng gặp.
   */
  platform: PlatformKey;
  post_id: string;
  url: string;
  description: string;
  thumbnail_url: string;
  duration_seconds: number | null;
  play_count: number;
  likes_count: number;
  comments_count: number;
  date_posted: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  author_username: string;
}

export interface OwnedChannel {
  platform: string;
  /** page_id / username / channel_id tuỳ nền tảng — chính là giá trị gửi lên khi lọc. */
  id: string;
  ten: string;
  so_video: number;
}

export interface OwnedHashtag {
  /** Không kèm dấu #. */
  the: string;
  so_video: number;
}

// ─── Tổng quan kênh nội bộ ───────────────────────────────────────────────────
// Khớp với OwnedStatsService bên BE (owned-stats.service.ts). Mọi con số đều là TỔNG của
// các video ĐĂNG trong kỳ, không phải số phát sinh trong kỳ — xem ghi chú ở trang tổng quan.

export interface PeriodStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  posts: number;
}

export interface DailyStats extends PeriodStats {
  /** 'YYYY-MM-DD' theo giờ Việt Nam. */
  ngay: string;
}

export interface PlatformStats extends PeriodStats {
  platform: string;
  truoc: PeriodStats;
  followers: number;
  /** Số kênh có đăng bài trong kỳ. */
  so_kenh: number;
  /** Tổng số kênh nội bộ của nền tảng, kể cả kênh không đăng gì. */
  tong_kenh: number;
  theo_ngay: DailyStats[];
}

export interface ChannelStats extends PeriodStats {
  platform: string;
  id: string;
  ten: string;
  avatar: string;
  followers: number;
  /** ISO, null nếu chưa đồng bộ lần nào. */
  dong_bo: string | null;
  views_truoc: number;
}

export interface VideoNoiBat {
  platform: string;
  post_id: string;
  url: string;
  mo_ta: string;
  thumbnail: string;
  kenh_ten: string;
  views: number;
  likes: number;
  comments: number;
  /** ISO. */
  ngay: string;
}

export interface ThiTruongNenTang {
  platform: string;
  vn: number;
  global: number;
  posts_vn: number;
  posts_global: number;
}

export interface TuyenNoiDung {
  /** 'A1'…'A5'. */
  ma: string;
  posts: number;
  views: number;
  views_vn: number;
  views_global: number;
}

export interface HashtagThongKe {
  the: string;
  posts: number;
  views: number;
}

export interface ChannelAlert {
  platform: string;
  kenh: string;
  noi_dung: string;
  /** 'w' = cảnh báo nhẹ (vàng), 'b' = nặng (đỏ). */
  muc: 'w' | 'b';
  nhan: string;
}

export interface InternalStats {
  status: string;
  ky: { tu: string; den: string; so_ngay: number };
  nen_tang: PlatformStats[];
  kenh: ChannelStats[];
  top_video: VideoNoiBat[];
  thi_truong: ThiTruongNenTang[];
  tuyen_noi_dung: TuyenNoiDung[];
  hashtag: HashtagThongKe[];
  canh_bao: ChannelAlert[];
  tong_kenh: number;
}

// ─── Video đăng trùng giữa các kênh nội bộ ───────────────────────────────────
// Khớp với OwnedDuplicateService bên BE.

/** Một nội dung bị đăng trên từ 2 kênh nội bộ trở lên. */
export interface DuplicateGroup {
  /** Caption đã chuẩn hoá (hạ hoa/thường, gộp khoảng trắng) — dùng luôn làm nhãn hiển thị. */
  noi_dung: string;
  platform: string;
  /** Độ dài video, giây. `null` với YouTube Shorts — bảng đó không có trường độ dài. */
  giay: number | null;
  so_kenh: number;
  /** Có thể lớn hơn `so_kenh`: một kênh đăng lại cùng nội dung nhiều lần trong kỳ. */
  so_video: number;
  views: number;
  kenh: { id: string; ten: string }[];
  ngay_dau: string;
  ngay_cuoi: string;
  /** Link tới bài nhiều lượt xem nhất trong nhóm. */
  url_mau: string;
}

export interface DuplicateByChannel {
  platform: string;
  id: string;
  ten: string;
  video_trung: number;
  tong_video: number;
  ty_le: number;
}

export interface InternalDuplicates {
  status: string;
  ky: { tu: string; den: string; so_ngay: number };
  tom_tat: {
    so_nhom: number;
    so_nhom_tu_3_kenh: number;
    so_video_trung: number;
    /** Chỉ đếm video có caption từ 20 ký tự — dưới ngưỡng đó không đủ để nhận diện trùng. */
    tong_video: number;
    ty_le: number;
    so_kenh_dinh: number;
  };
  nhom: DuplicateGroup[];
  theo_kenh: DuplicateByChannel[];
  canh_bao: ChannelAlert[];
}

// ─── Chấm điểm PAAST cho video nội bộ ────────────────────────────────────────
// Khớp với OwnedScriptService bên BE.

/**
 * - `da_cham`           — có kịch bản và đã có điểm
 * - `co_kich_ban`       — có kịch bản nhưng chưa chấm (hoặc chấm lỗi)
 * - `chua_co_kich_ban`  — Facebook chưa sinh phụ đề cho video này (~2/3 số video)
 * - `qua_ngan`          — kịch bản dưới 100 ký tự, PAAST không nhận
 * - `khong_ho_tro`      — nền tảng chưa lấy được kịch bản
 */
export type TrangThaiPaastMa =
  | 'da_cham'
  | 'co_kich_ban'
  | 'chua_co_kich_ban'
  | 'qua_ngan'
  | 'khong_ho_tro';

export interface TrangThaiPaast {
  trang_thai: TrangThaiPaastMa;
  /** Bản 2 bỏ thang điểm 0–100, chỉ còn kết luận đạt/chưa đạt chuẩn PAAST. */
  dat: boolean | null;
  so_ky_tu: number;
}

export interface PaastVideoResult {
  trang_thai: TrangThaiPaastMa;
  nguon?: string;
  ngon_ngu?: string;
  so_ky_tu?: number;
  kich_ban?: string;
  /** Bản ghi PaastAnalysisHistory — đưa thẳng vào PaastScoreModal qua prop `cachedResult`. */
  phan_tich?: any;
  ghi_chu?: string;
}

export interface PaginatedExternalVideos {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  videos: ExternalVideo[];
}

export const scraperService = {
  getAllExternalVideos: async (token: string, params: {
    page?: number; page_size?: number; q?: string; sort?: string; platform?: string;
    min_plays?: number; date_from?: string; date_to?: string;
  }): Promise<PaginatedExternalVideos> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/all-videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos');
    return res.json();
  },

  getOwnedChannelVideos: async (token: string, params: {
    page?: number; page_size?: number; q?: string; sort?: string; platform?: string;
    min_plays?: number; date_from?: string; date_to?: string;
    /** 'vn' | 'global' — server đoán theo dấu tiếng Việt trong caption. */
    market?: string;
    /** 'A1'..'A5' — server bắt theo hashtag #A1..#A5 sẵn có trong caption. */
    content_line?: string;
    /** Định danh kênh: page_id (Facebook) / username / channel_id tuỳ nền tảng. */
    channel?: string;
    /** Hashtag bất kỳ, có hay không có dấu # đều được. */
    hashtag?: string;
  }): Promise<PaginatedExternalVideos> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/owned/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos');
    return res.json();
  },

  /**
   * Số liệu tổng hợp cho trang Tổng quan kênh nội bộ.
   *
   * KHÔNG cộng lại từ getOwnedChannelVideos(): kỳ 28 ngày có ~3.800 video, kéo hết về rồi
   * cộng ở trình duyệt thì vừa chậm vừa sai vì API vốn chỉ trả tối đa 100 video mỗi trang.
   */
  getOwnedStats: async (
    token: string,
    params: {
      platform?: string;
      /** Preset nhanh. Có `tu` thì server bỏ qua `days`. */
      days?: number;
      /** 'YYYY-MM-DD' — khoảng ngày người dùng tự chọn. */
      tu?: string;
      den?: string;
    },
  ): Promise<InternalStats> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/owned/stats/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải số liệu tổng quan');
    return res.json();
  },

  /**
   * Video bị đăng trùng trên nhiều kênh nội bộ.
   *
   * Endpoint RIÊNG chứ không gộp vào getOwnedStats(): gộp vào thì cả trang tổng quan phải
   * chờ thêm ba truy vấn nữa mới vẽ được ô số đầu tiên. Nhận cùng bộ tham số kỳ ngày nên
   * hai khối luôn nói về cùng một khoảng thời gian.
   */
  getOwnedDuplicates: async (
    token: string,
    params: { platform?: string; days?: number; tu?: string; den?: string },
  ): Promise<InternalDuplicates> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/owned/trung-lap/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải số liệu trùng lặp');
    return res.json();
  },

  /**
   * Trạng thái chấm điểm PAAST của một loạt video — gọi MỘT lần cho cả lưới.
   *
   * Chỉ đọc bảng đã lưu, không kích hoạt lấy phụ đề, nên gọi thoải mái khi mở trang.
   * Video chưa từng chấm sẽ không có mặt trong kết quả.
   */
  getPaastStatus: async (
    token: string,
    khoas: string[],
  ): Promise<Record<string, TrangThaiPaast>> => {
    if (!khoas.length) return {};
    const res = await fetchWithAuth(
      `${API_URL}/scraper/owned/paast/status/${buildParams({ ids: khoas.join(',') })}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return {};
    return res.json();
  },

  /**
   * Lấy kịch bản và chấm điểm PAAST cho một video.
   *
   * Lần đầu mỗi video mất ~15 giây (hỏi phụ đề Facebook rồi gọi LLM chấm) và tốn một lượt
   * LLM, nên CHỈ gọi khi người dùng chủ động bấm. Từ lần sau lấy từ bảng, ~35ms, và cả team
   * dùng chung một điểm.
   */
  chamDiemPaast: async (
    token: string,
    platform: string,
    postId: string,
  ): Promise<PaastVideoResult> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/owned/paast/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, post_id: postId }),
    });
    if (!res.ok) throw new Error('Không chấm điểm được video này');
    return res.json();
  },

  /** Danh sách kênh nội bộ để đổ vào ô chọn (kèm số video từng kênh). */
  getOwnedChannels: async (token: string): Promise<OwnedChannel[]> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/owned/channels/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()).channels || [];
  },

  /** Hashtag đang thực sự có trong dữ liệu, sắp theo số video giảm dần. */
  getOwnedHashtags: async (token: string, limit = 60): Promise<OwnedHashtag[]> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/owned/hashtags/${buildParams({ limit })}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()).hashtags || [];
  },

  suggestKeywords: async (token: string, q: string): Promise<KeywordSuggestion[]> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/keywords/suggest/${buildParams({ q })}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()).suggestions || [];
  },

  hitKeyword: async (token: string, keyword: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/scraper/keywords/hit/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    });
  },

  /**
   * Dịch từ khoá sang tiếng Trung để xem trước, dùng cho các nền tảng Trung Quốc.
   * BE tự bỏ qua nếu text vốn đã là tiếng Trung (source='already_chinese').
   */
  translateKeyword: async (
    token: string,
    text: string,
  ): Promise<{ original: string; translated: string; source: string }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/keywords/translate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Không dịch được từ khoá');
    return res.json();
  },

  triggerDiscovery: async (token: string, keyword: string): Promise<{ status: string; message: string }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/discover/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    });
    if (!res.ok) throw new Error('Không thể gửi yêu cầu khám phá');
    return res.json();
  },

  // Paginated fanpages
  getFanpages: async (token: string, params?: {
    page?: number; page_size?: number; search?: string;
    bookmarked?: string; periodic?: string;
  }): Promise<PaginatedFanpages> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/fanpages/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải fanpages');
    return res.json();
  },

  // Fanpage detail
  getFanpageDetail: async (token: string, id: number): Promise<ScrapedFanpage> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/fanpages/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không tìm thấy fanpage');
    return res.json();
  },

  // Toggle bookmark / periodic crawl
  toggleFanpage: async (token: string, id: number, field: 'is_bookmarked' | 'is_periodic_crawl'): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/fanpages/${id}/toggle/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    });
    if (!res.ok) throw new Error('Toggle failed');
    return res.json();
  },

  // Search reels (infinite scroll)
  searchReels: async (token: string, params: {
    q?: string; page?: number; page_size?: number;
    min_views?: number; fanpage_id?: number;
    date_from?: string; date_to?: string; sort?: string;
  }): Promise<PaginatedReels> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/reels/search/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải reels');
    return res.json();
  },

  // ─── TIKTOK ────────────────────────────────────────────

  // TikTok keyword autocomplete (keywords đã cào)
  tiktokKeywordSuggest: async (token: string, q: string): Promise<{ keyword: string; count: number }[]> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/tiktok/keywords/suggest/${buildParams({ q })}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()).suggestions || [];
  },

  // Trigger TikTok keyword search (async)
  tiktokSearch: async (token: string, keyword: string, numOfPosts: number = 30, country: string = 'VN'): Promise<{ message: string; created?: number; updated?: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/tiktok/search/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, num_of_posts: numOfPosts, country }),
    });
    if (!res.ok) throw new Error('Không thể tìm kiếm TikTok');
    return res.json();
  },

  // Get TikTok videos (paginated)
  getTiktokVideos: async (token: string, params: {
    q?: string; page?: number; page_size?: number;
    min_plays?: number; date_from?: string; date_to?: string; sort?: string;
    search_keyword?: string;
  }): Promise<PaginatedTikTokVideos> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/tiktok/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải TikTok videos');
    return res.json();
  },

  // ─── TIKTOK PROFILE ────────────────────────────────────

  tiktokProfileScrape: async (token: string, username: string, isOwned?: boolean, numOfPosts?: number): Promise<{ message: string; is_scraping?: boolean; already_exists?: boolean; profile_id: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/tiktok/profiles/scrape/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, ...(isOwned !== undefined ? { is_owned: isOwned } : {}), ...(numOfPosts ? { num_of_posts: numOfPosts } : {}) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Không thể cào profile');
    }
    return res.json();
  },

  getTiktokProfiles: async (token: string, params?: {
    page?: number; page_size?: number; search?: string; sort_by?: 'followers' | 'recent'; is_owned?: boolean;
  }): Promise<PaginatedTikTokProfiles> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/tiktok/profiles/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải profiles');
    return res.json();
  },

  getTiktokProfileDetail: async (token: string, id: number): Promise<TikTokProfile> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/tiktok/profiles/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không tìm thấy profile');
    return res.json();
  },

  getTiktokProfileVideos: async (token: string, profileId: number, params: {
    page?: number; page_size?: number; q?: string;
    min_plays?: number; sort?: string;
  }): Promise<PaginatedTikTokProfileVideos> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/tiktok/profiles/${profileId}/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos');
    return res.json();
  },

  toggleTiktokProfile: async (token: string, id: number, field: 'is_bookmarked' | 'is_tracked'): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/tiktok/profiles/${id}/toggle/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    });
    if (!res.ok) throw new Error('Toggle failed');
    return res.json();
  },

  tiktokLookalikes: async (token: string, profileId: number): Promise<{ lookalikes: LookalikeChannel[] }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/tiktok/profiles/${profileId}/lookalikes/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { lookalikes: [] };
    return res.json();
  },

  // ─── INSTAGRAM PROFILE ─────────────────────────────────

  instagramProfileScrape: async (token: string, username: string, isOwned?: boolean, numOfPosts?: number): Promise<{ message: string; is_scraping?: boolean; already_exists?: boolean; profile_id: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/instagram/profiles/scrape/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, ...(isOwned !== undefined ? { is_owned: isOwned } : {}), ...(numOfPosts ? { num_of_posts: numOfPosts } : {}) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Không thể cào profile');
    }
    return res.json();
  },

  getInstagramProfiles: async (token: string, params?: {
    page?: number; page_size?: number; search?: string; is_owned?: boolean;
  }): Promise<PaginatedInstagramProfiles> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/instagram/profiles/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải profiles');
    return res.json();
  },

  getInstagramProfileDetail: async (token: string, id: number): Promise<InstagramProfile> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/instagram/profiles/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không tìm thấy profile');
    return res.json();
  },

  getInstagramProfileReels: async (token: string, profileId: number, params: {
    page?: number; page_size?: number; q?: string;
    min_plays?: number; sort?: string;
  }): Promise<PaginatedInstagramReels> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/instagram/profiles/${profileId}/reels/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải reels');
    return res.json();
  },

  toggleInstagramProfile: async (token: string, id: number, field: 'is_bookmarked' | 'is_tracked'): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/instagram/profiles/${id}/toggle/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    });
    if (!res.ok) throw new Error('Toggle failed');
    return res.json();
  },

  getInstagramReels: async (token: string, params?: {
    page?: number; page_size?: number; q?: string;
    profile_id?: number; min_plays?: number;
    date_from?: string; date_to?: string; sort?: string;
  }): Promise<PaginatedInstagramReels> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/instagram/reels/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải reels');
    return res.json();
  },

  instagramLookalikes: async (token: string, profileId: number): Promise<{ lookalikes: LookalikeChannel[] }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/instagram/profiles/${profileId}/lookalikes/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { lookalikes: [] };
    return res.json();
  },

  // ─── YOUTUBE ──────────────────────────────────────────

  youtubeChannelScrape: async (token: string, channelId: string, isOwned?: boolean, numOfPosts?: number): Promise<{ message: string; is_scraping?: boolean; already_exists?: boolean; newly_scraped?: boolean; profile_id: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/youtube/profiles/scrape/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: channelId, ...(isOwned !== undefined ? { is_owned: isOwned } : {}), ...(numOfPosts ? { num_of_posts: numOfPosts } : {}) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Không thể cào channel');
    }
    return res.json();
  },

  getYoutubeProfiles: async (token: string, params?: {
    page?: number; page_size?: number; search?: string; sort_by?: string; is_owned?: boolean;
  }): Promise<PaginatedYoutubeProfiles> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/youtube/profiles/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải profiles');
    return res.json();
  },

  getYoutubeProfileDetail: async (token: string, id: number): Promise<YoutubeProfile> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/youtube/profiles/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không tìm thấy profile');
    return res.json();
  },

  getYoutubeProfileShorts: async (token: string, profileId: number, params: {
    page?: number; page_size?: number; q?: string;
    min_views?: number; sort?: string;
  }): Promise<PaginatedYoutubeShorts> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/youtube/profiles/${profileId}/shorts/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải shorts');
    return res.json();
  },

  toggleYoutubeProfile: async (token: string, id: number, field: 'is_bookmarked' | 'is_tracked'): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/youtube/profiles/${id}/toggle/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    });
    if (!res.ok) throw new Error('Toggle failed');
    return res.json();
  },

  getYoutubeShorts: async (token: string, params?: {
    page?: number; page_size?: number; q?: string;
    profile_id?: number; min_views?: number; sort?: string;
  }): Promise<PaginatedYoutubeShortsList> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/youtube/shorts/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải shorts');
    return res.json();
  },

  youtubeLookalikes: async (token: string, profileId: number): Promise<{ lookalikes: LookalikeChannel[] }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/youtube/profiles/${profileId}/lookalikes/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { lookalikes: [] };
    return res.json();
  },

  // ─── KUAISHOU ─────────────────────────────────────────
  // Không có is_owned — Kuaishou chỉ có kênh ngoài (external).

  kuaishouSearch: async (token: string, keyword: string, numOfPosts = 30, displayKeyword?: string): Promise<{ message: string; created: number; updated: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/kuaishou/search/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, num_of_posts: numOfPosts, ...(displayKeyword ? { display_keyword: displayKeyword } : {}) }),
    });
    if (!res.ok) throw new Error('Không thể tìm kiếm');
    return res.json();
  },

  getKuaishouVideos: async (token: string, params: {
    page?: number; page_size?: number; q?: string; search_keyword?: string;
    min_views?: number; sort?: string; date_from?: string; date_to?: string;
  }): Promise<PaginatedKuaishouSearchVideos> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/kuaishou/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos');
    return res.json();
  },

  kuaishouKeywordSuggest: async (token: string, q: string): Promise<{ keyword: string; count: number }[]> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/kuaishou/keywords/suggest/${buildParams({ q })}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()).suggestions || [];
  },

  kuaishouProfileScrape: async (token: string, eid: string, numOfPosts?: number): Promise<{ message: string; is_scraping?: boolean; already_exists?: boolean; newly_scraped?: boolean; profile_id: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/kuaishou/profiles/scrape/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ eid, ...(numOfPosts ? { num_of_posts: numOfPosts } : {}) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Không thể cào profile');
    }
    return res.json();
  },

  getKuaishouProfiles: async (token: string, params?: {
    page?: number; page_size?: number; search?: string; sort_by?: string;
  }): Promise<PaginatedKuaishouProfiles> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/kuaishou/profiles/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải profiles');
    return res.json();
  },

  getKuaishouProfileDetail: async (token: string, id: number): Promise<KuaishouProfile> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/kuaishou/profiles/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không tìm thấy profile');
    return res.json();
  },

  getKuaishouProfileVideos: async (token: string, profileId: number, params: {
    page?: number; page_size?: number; q?: string;
    min_views?: number; sort?: string;
  }): Promise<PaginatedKuaishouVideos> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/kuaishou/profiles/${profileId}/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos');
    return res.json();
  },

  toggleKuaishouProfile: async (token: string, id: number, field: 'is_bookmarked' | 'is_tracked'): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/kuaishou/profiles/${id}/toggle/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    });
    if (!res.ok) throw new Error('Toggle failed');
    return res.json();
  },

  kuaishouLookalikes: async (token: string, profileId: number): Promise<{ lookalikes: LookalikeChannel[] }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/kuaishou/profiles/${profileId}/lookalikes/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { lookalikes: [] };
    return res.json();
  },

  // ─── BILIBILI ─────────────────────────────────────────
  // Không có is_owned — Bilibili chỉ có kênh ngoài (external). mid là ID duy
  // nhất (numeric), không có vấn đề 2 không gian ID như Kuaishou.

  bilibiliSearch: async (token: string, keyword: string, numOfPosts = 30, displayKeyword?: string): Promise<{ message: string; created: number; updated: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/bilibili/search/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, num_of_posts: numOfPosts, ...(displayKeyword ? { display_keyword: displayKeyword } : {}) }),
    });
    if (!res.ok) throw new Error('Không thể tìm kiếm');
    return res.json();
  },

  getBilibiliVideos: async (token: string, params: {
    page?: number; page_size?: number; q?: string; search_keyword?: string;
    min_views?: number; sort?: string; date_from?: string; date_to?: string;
  }): Promise<PaginatedBilibiliSearchVideos> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/bilibili/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos');
    return res.json();
  },

  bilibiliKeywordSuggest: async (token: string, q: string): Promise<{ keyword: string; count: number }[]> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/bilibili/keywords/suggest/${buildParams({ q })}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()).suggestions || [];
  },

  bilibiliProfileScrape: async (token: string, mid: string, numOfPosts?: number): Promise<{ message: string; is_scraping?: boolean; already_exists?: boolean; newly_scraped?: boolean; profile_id: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/bilibili/profiles/scrape/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mid, ...(numOfPosts ? { num_of_posts: numOfPosts } : {}) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Không thể cào profile');
    }
    return res.json();
  },

  getBilibiliProfiles: async (token: string, params?: {
    page?: number; page_size?: number; search?: string; sort_by?: string;
  }): Promise<PaginatedBilibiliProfiles> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/bilibili/profiles/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải profiles');
    return res.json();
  },

  getBilibiliProfileDetail: async (token: string, id: number): Promise<BilibiliProfile> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/bilibili/profiles/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không tìm thấy profile');
    return res.json();
  },

  getBilibiliProfileVideos: async (token: string, profileId: number, params: {
    page?: number; page_size?: number; q?: string;
    min_views?: number; sort?: string;
  }): Promise<PaginatedBilibiliVideos> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/bilibili/profiles/${profileId}/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos');
    return res.json();
  },

  toggleBilibiliProfile: async (token: string, id: number, field: 'is_bookmarked' | 'is_tracked'): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/bilibili/profiles/${id}/toggle/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    });
    if (!res.ok) throw new Error('Toggle failed');
    return res.json();
  },

  // ─── FACEBOOK ─────────────────────────────────────────

  // Trigger scrape reels (auto 300/10)
  triggerScrapeReels: async (token: string, fanpageId: number): Promise<{ message: string; is_scraping?: boolean }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/fanpages/scrape-reels/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fanpage_id: fanpageId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || body?.message || 'Không thể cào reels');
    }
    return res.json();
  },

  fanpageScrapeByUrl: async (token: string, url: string): Promise<{ message: string; is_scraping?: boolean; already_exists?: boolean; fanpage_id: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/fanpages/scrape-by-url/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Không thể cào fanpage');
    }
    return res.json();
  },

  // ─── DOUYIN ────────────────────────────────────────────

  // displayKeyword = tiếng Việt user gõ (khi `keyword` là bản dịch tiếng Trung) — BE lưu
  // bản tiếng Việt vào search_keyword cho dễ đọc ở bộ lọc/gợi ý.
  douyinSearch: async (token: string, keyword: string, numOfPosts = 30, displayKeyword?: string): Promise<{ message: string; created?: number; updated?: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/douyin/search/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, num_of_posts: numOfPosts, ...(displayKeyword ? { display_keyword: displayKeyword } : {}) }),
    });
    if (!res.ok) throw new Error('Không thể tìm kiếm Douyin');
    return res.json();
  },

  getDouyinVideos: async (token: string, params: {
    q?: string; page?: number; page_size?: number;
    min_digg?: number; date_from?: string; date_to?: string; sort?: string;
    search_keyword?: string;
  }): Promise<PaginatedDouyinVideos> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/douyin/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải Douyin videos');
    return res.json();
  },

  douyinKeywordSuggest: async (token: string, q: string): Promise<{ keyword: string; count: number }[]> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/douyin/keywords/suggest/${buildParams({ q })}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()).suggestions || [];
  },

  // numOfPosts để trống = dùng mặc định của BE (300). Trước đây BE bỏ qua tham số này
  // nên số truyền vào vô tác dụng; nay BE đã tôn trọng nên KHÔNG đặt mặc định cứng ở FE.
  douyinProfileScrape: async (token: string, secUserId: string, numOfPosts?: number, isOwned?: boolean): Promise<{ status: string; message: string; profile_id: number; already_exists?: boolean; newly_scraped?: boolean }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/douyin/profile/scrape/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sec_user_id: secUserId, ...(numOfPosts ? { num_of_posts: numOfPosts } : {}), ...(isOwned !== undefined ? { is_owned: isOwned } : {}) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Không thể cào profile Douyin');
    }
    return res.json();
  },

  getDouyinProfiles: async (token: string, params?: {
    page?: number; page_size?: number; search?: string; sort_by?: 'followers' | 'recent'; is_owned?: boolean;
  }): Promise<PaginatedDouyinProfiles> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/douyin/profiles/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải danh sách profiles');
    return res.json();
  },

  getDouyinProfileDetail: async (token: string, id: number): Promise<DouyinProfile> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/douyin/profiles/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải profile');
    return res.json();
  },

  getDouyinProfileVideos: async (token: string, id: number, params?: {
    page?: number; page_size?: number; sort?: string; q?: string; min_digg?: number;
  }): Promise<{ count: number; page: number; page_size: number; total_pages: number; videos: any[] }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/douyin/profiles/${id}/videos/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos');
    return res.json();
  },

  toggleDouyinProfile: async (token: string, id: number, field: 'is_bookmarked' | 'is_tracked'): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/douyin/profiles/${id}/toggle/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    });
    if (!res.ok) throw new Error('Toggle thất bại');
    return res.json();
  },

  douyinLookalikes: async (token: string, profileId: number): Promise<{ lookalikes: LookalikeChannel[] }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/douyin/profiles/${profileId}/lookalikes/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { lookalikes: [] };
    return res.json();
  },

  // ─── XIAOHONGSHU ───────────────────────────────────────

  xiaohongshuSearch: async (token: string, keyword: string, numOfPosts = 20, displayKeyword?: string): Promise<{ status: string; message: string; created?: number; updated?: number }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/xiaohongshu/search/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, num_of_posts: numOfPosts, ...(displayKeyword ? { display_keyword: displayKeyword } : {}) }),
    });
    if (!res.ok) throw new Error('Tìm kiếm Xiaohongshu thất bại');
    return res.json();
  },

  getXiaohongshuVideos: async (token: string, params: {
    q?: string; page?: number; page_size?: number;
    min_likes?: number; date_from?: string; date_to?: string;
    sort?: string; keyword?: string;
  }): Promise<PaginatedXiaohongshuVideos> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/xiaohongshu/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải Xiaohongshu videos');
    return res.json();
  },

  xiaohongshuKeywordSuggest: async (token: string, q: string): Promise<{ keyword: string; count: number }[]> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/xiaohongshu/keywords/suggest/${buildParams({ q })}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  // ─── XIAOHONGSHU PROFILES ──────────────────────────────

  // numOfPosts để trống = dùng mặc định của BE (300) — xem ghi chú ở douyinProfileScrape.
  xhsProfileScrape: async (token: string, userId: string, numOfPosts?: number, isOwned?: boolean): Promise<{ status: string; message: string; profile: XiaohongshuProfile; created: boolean }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/xiaohongshu/profiles/scrape/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...(numOfPosts ? { num_of_posts: numOfPosts } : {}), ...(isOwned !== undefined ? { is_owned: isOwned } : {}) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Thêm profile thất bại');
    }
    return res.json();
  },

  getXhsProfiles: async (token: string, params: {
    q?: string; page?: number; page_size?: number;
    bookmarked?: boolean; tracked?: boolean; is_owned?: boolean;
  } = {}): Promise<PaginatedXhsProfiles> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/xiaohongshu/profiles/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải XHS profiles');
    return res.json();
  },

  getXhsProfileDetail: async (token: string, profileId: number): Promise<XiaohongshuProfile> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/xiaohongshu/profiles/${profileId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Profile không tồn tại');
    return res.json();
  },

  getXhsProfileVideos: async (token: string, profileId: number, params: {
    page?: number; page_size?: number; sort?: string; q?: string; min_likes?: number;
  } = {}): Promise<PaginatedXiaohongshuVideos & { profile: XiaohongshuProfile }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/xiaohongshu/profiles/${profileId}/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos của profile');
    return res.json();
  },

  xhsProfileToggle: async (token: string, profileId: number, patch: { is_tracked?: boolean; is_bookmarked?: boolean }): Promise<XiaohongshuProfile> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/xiaohongshu/profiles/${profileId}/`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('Cập nhật thất bại');
    return res.json();
  },

  xhsLookalikes: async (token: string, profileId: number): Promise<{ lookalikes: LookalikeChannel[] }> => {
    const res = await fetchWithAuth(`${API_URL}/scraper/xiaohongshu/profiles/${profileId}/lookalikes/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { lookalikes: [] };
    return res.json();
  },
};
