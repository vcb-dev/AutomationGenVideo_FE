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
