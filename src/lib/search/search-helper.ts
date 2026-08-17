export type SearchPlatform = 'TIKTOK' | 'DOUYIN' | 'XIAOHONGSHU' | 'BILIBILI' | 'KUAISHOU' | 'INSTAGRAM' | 'FACEBOOK';

export interface SearchRequestBody {
  platform: string;
  keyword: string;
  max_results: number;
  search_type: string;
  search_mode: 'keyword' | 'hashtag';
  page: number;
}

export function buildSearchPayload(
  platform: SearchPlatform,
  searchTerm: string,
  searchType: 'keyword' | 'hashtag',
  page: number = 1,
  maxResults: number = 30,
  instagramPostType: 'posts' | 'reels' = 'posts',
): SearchRequestBody {
  const keyword = searchType === 'hashtag'
    ? `#${searchTerm.replace(/#/g, '').trim()}`
    : searchTerm.trim();

  return {
    platform: platform.toLowerCase(),
    keyword,
    max_results: maxResults,
    search_type: platform === 'INSTAGRAM' ? instagramPostType : 'posts',
    search_mode: searchType,
    page,
  };
}

export function normalizeSearchResults(rawList: any[], platform: SearchPlatform) {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item) => ({
    id: item.video_id || item.id || '',
    video_id: item.video_id || item.id || '',
    title: item.title || item.description || '',
    description: item.description || item.title || '',
    thumbnail_url: item.thumbnail_url || item.cover_url || item.preview_image || '',
    video_url: item.video_url || item.url || '',
    author_name: item.author_name || item.user_name || item.author_display_name || 'N/A',
    author_username: item.author_username || item.user_id || '',
    views_count: Number(item.views_count || item.play_count || item.view_count || 0),
    likes_count: Number(item.likes_count || item.digg_count || item.like_count || 0),
    comments_count: Number(item.comments_count || item.comment_count || 0),
    shares_count: Number(item.shares_count || item.share_count || 0),
    platform,
    raw_data: item,
  }));
}
