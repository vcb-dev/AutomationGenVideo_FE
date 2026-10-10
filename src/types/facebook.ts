export interface FacebookPage {
  page_id: string;
  name: string;
  username?: string;
  category?: string;
  avatar_url?: string;
  followers_count: number;
  likes_count: number;
  is_active: boolean;
  is_scraping: boolean;
  is_backfilled: boolean;
  last_synced_at?: string;
  last_scraped_at?: string;
  scrape_error?: string;
  video_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FacebookVideo {
  post_id: string;
  caption?: string;
  published_at: string;
  permalink_url?: string;
  thumbnail_url?: string;
  video_url?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  reach_count: number;
  link_clicks: number;
  last_updated_at?: string;
}

export interface PaginatedPages {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  pages: FacebookPage[];
}

export interface PaginatedVideos {
  status: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  page_info: FacebookPage;
  videos: FacebookVideo[];
}

/** Video ở tab "Video đã đăng" (Nhiệm vụ) — kèm page và kênh (team + người cầm) đã ghép ở BE. */
export interface PublishedVideo extends FacebookVideo {
  page: { page_id: string; name: string; avatar_url?: string | null } | null
  /** null = page chưa ghép được với kênh nào trong Quản lý kênh */
  channel: { team_id: string | null; team_name: string | null; owner_id: string | null; owner_name: string | null } | null
  /** Task đã gắn link bài này (khớp theo id reel trong published_links) */
  linked_task_ids?: string[]
}

export interface PaginatedPublishedVideos {
  status: string
  count: number
  page: number
  page_size: number
  total_pages: number
  videos: PublishedVideo[]
}

export interface PublishedVideoFilters extends VideoFilters {
  /** Nhiều team phân cách dấu phẩy */
  team_id?: string
  owner_id?: string
  sort?: 'newest' | 'views'
}

export interface PublishedVideoOwner {
  id: string
  full_name: string
  team_ids: string[]
  page_count: number
}

export interface PublishedVideoFilterOptions {
  status: string
  total_pages: number
  unmatched_pages: number
  owners: PublishedVideoOwner[]
}

/** Lượt bấm "Cập nhật" ở tab Video đã đăng — chạy nền ở BE, FE hỏi tiến độ theo id. */
export interface PublishedVideoRefreshJob {
  id: string
  status: 'running' | 'done' | 'failed'
  started_at: string
  finished_at: string | null
  /** BE hiện luôn cào lại bài trong đúng khoảng ngày đang lọc trước khi làm mới chỉ số. */
  sync_new: boolean
  pages_total: number
  pages_done: number
  pages_failed: number
  pages_skipped: number
  new_videos: number
  metrics_total: number
  metrics_done: number
  metrics_updated: number
  /** Video khớp bộ lọc vượt trần 1.000 — chỉ cập nhật phần mới đăng nhất */
  capped: boolean
  errors: string[]
}

export type PublishedVideoRefreshFilters = Omit<PublishedVideoFilters, 'page' | 'page_size' | 'sort'>

export interface PageFilters {
  page?: number;
  page_size?: number;
  search?: string;
  status?: 'active' | 'inactive' | '';
  min_likes?: number;
  min_followers?: number;
}

export interface VideoFilters {
  page?: number;
  page_size?: number;
  search?: string;
  min_views?: number;
  min_likes?: number;
  hashtag_category?: 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | '';
  date_from?: string;
  date_to?: string;
}
