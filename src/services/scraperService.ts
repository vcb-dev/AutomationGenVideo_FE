const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

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
  header_image_url: string;
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
  play_count: number;
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

export interface KeywordSuggestion {
  id: number;
  keyword: string;
  hits: number;
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
  platform: 'facebook' | 'tiktok' | 'instagram';
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
    const res = await fetch(`${API_URL}/scraper/all-videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos');
    return res.json();
  },

  suggestKeywords: async (token: string, q: string): Promise<KeywordSuggestion[]> => {
    const res = await fetch(`${API_URL}/scraper/keywords/suggest/${buildParams({ q })}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()).suggestions || [];
  },

  hitKeyword: async (token: string, keyword: string): Promise<void> => {
    await fetch(`${API_URL}/scraper/keywords/hit/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    });
  },

  triggerDiscovery: async (token: string, keyword: string): Promise<{ status: string; message: string }> => {
    const res = await fetch(`${API_URL}/scraper/discover/`, {
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
    const res = await fetch(`${API_URL}/scraper/fanpages/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải fanpages');
    return res.json();
  },

  // Fanpage detail
  getFanpageDetail: async (token: string, id: number): Promise<ScrapedFanpage> => {
    const res = await fetch(`${API_URL}/scraper/fanpages/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không tìm thấy fanpage');
    return res.json();
  },

  // Toggle bookmark / periodic crawl
  toggleFanpage: async (token: string, id: number, field: 'is_bookmarked' | 'is_periodic_crawl'): Promise<any> => {
    const res = await fetch(`${API_URL}/scraper/fanpages/${id}/toggle/`, {
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
    const res = await fetch(`${API_URL}/scraper/reels/search/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải reels');
    return res.json();
  },

  // ─── TIKTOK ────────────────────────────────────────────

  // TikTok keyword autocomplete (keywords đã cào)
  tiktokKeywordSuggest: async (token: string, q: string): Promise<{ keyword: string; count: number }[]> => {
    const res = await fetch(`${API_URL}/scraper/tiktok/keywords/suggest/${buildParams({ q })}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()).suggestions || [];
  },

  // Trigger TikTok keyword search (async)
  tiktokSearch: async (token: string, keyword: string, numOfPosts: number = 30, country: string = 'VN'): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/scraper/tiktok/search/`, {
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
    const res = await fetch(`${API_URL}/scraper/tiktok/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải TikTok videos');
    return res.json();
  },

  // ─── TIKTOK PROFILE ────────────────────────────────────

  tiktokProfileScrape: async (token: string, url: string, country: string = 'VN'): Promise<{ message: string; is_scraping?: boolean; already_exists?: boolean; profile_id: number }> => {
    const res = await fetch(`${API_URL}/scraper/tiktok/profiles/scrape/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, country }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Không thể cào profile');
    }
    return res.json();
  },

  getTiktokProfiles: async (token: string, params?: {
    page?: number; page_size?: number; search?: string;
  }): Promise<PaginatedTikTokProfiles> => {
    const res = await fetch(`${API_URL}/scraper/tiktok/profiles/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải profiles');
    return res.json();
  },

  getTiktokProfileDetail: async (token: string, id: number): Promise<TikTokProfile> => {
    const res = await fetch(`${API_URL}/scraper/tiktok/profiles/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không tìm thấy profile');
    return res.json();
  },

  getTiktokProfileVideos: async (token: string, profileId: number, params: {
    page?: number; page_size?: number; q?: string;
    min_plays?: number; sort?: string;
  }): Promise<PaginatedTikTokProfileVideos> => {
    const res = await fetch(`${API_URL}/scraper/tiktok/profiles/${profileId}/videos/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải videos');
    return res.json();
  },

  toggleTiktokProfile: async (token: string, id: number, field: 'is_bookmarked' | 'is_tracked'): Promise<any> => {
    const res = await fetch(`${API_URL}/scraper/tiktok/profiles/${id}/toggle/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    });
    if (!res.ok) throw new Error('Toggle failed');
    return res.json();
  },

  // ─── INSTAGRAM PROFILE ─────────────────────────────────

  instagramProfileScrape: async (token: string, url: string): Promise<{ message: string; is_scraping?: boolean; already_exists?: boolean; profile_id: number }> => {
    const res = await fetch(`${API_URL}/scraper/instagram/profiles/scrape/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Không thể cào profile');
    }
    return res.json();
  },

  getInstagramProfiles: async (token: string, params?: {
    page?: number; page_size?: number; search?: string;
  }): Promise<PaginatedInstagramProfiles> => {
    const res = await fetch(`${API_URL}/scraper/instagram/profiles/${buildParams(params || {})}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải profiles');
    return res.json();
  },

  getInstagramProfileDetail: async (token: string, id: number): Promise<InstagramProfile> => {
    const res = await fetch(`${API_URL}/scraper/instagram/profiles/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không tìm thấy profile');
    return res.json();
  },

  getInstagramProfileReels: async (token: string, profileId: number, params: {
    page?: number; page_size?: number; q?: string;
    min_plays?: number; sort?: string;
  }): Promise<PaginatedInstagramReels> => {
    const res = await fetch(`${API_URL}/scraper/instagram/profiles/${profileId}/reels/${buildParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải reels');
    return res.json();
  },

  toggleInstagramProfile: async (token: string, id: number, field: 'is_bookmarked' | 'is_tracked'): Promise<any> => {
    const res = await fetch(`${API_URL}/scraper/instagram/profiles/${id}/toggle/`, {
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
    const res = await fetch(`${API_URL}/scraper/fanpages/scrape-reels/`, {
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
    const res = await fetch(`${API_URL}/scraper/fanpages/scrape-by-url/`, {
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
};
