import { buildSearchPayload, normalizeSearchResults } from '../search-helper';

describe('Video Search Helper & Normalization', () => {
  describe('buildSearchPayload', () => {
    it('builds keyword search payload for TikTok', () => {
      const payload = buildSearchPayload('TIKTOK', 'jewelry', 'keyword', 1, 30);
      expect(payload).toEqual({
        platform: 'tiktok',
        keyword: 'jewelry',
        max_results: 30,
        search_type: 'posts',
        search_mode: 'keyword',
        page: 1,
      });
    });

    it('formats hashtag search with leading # for Douyin', () => {
      const payload = buildSearchPayload('DOUYIN', '#ring', 'hashtag', 2, 20);
      expect(payload).toEqual({
        platform: 'douyin',
        keyword: '#ring',
        max_results: 20,
        search_type: 'posts',
        search_mode: 'hashtag',
        page: 2,
      });
    });

    it('handles Xiaohongshu keyword search with trimmed spaces', () => {
      const payload = buildSearchPayload('XIAOHONGSHU', '  fashion  ', 'keyword', 1);
      expect(payload.keyword).toBe('fashion');
      expect(payload.platform).toBe('xiaohongshu');
    });

    it('handles Bilibili and Kuaishou payload generation', () => {
      const p1 = buildSearchPayload('BILIBILI', 'vlog', 'keyword');
      const p2 = buildSearchPayload('KUAISHOU', 'crafts', 'keyword');
      expect(p1.platform).toBe('bilibili');
      expect(p2.platform).toBe('kuaishou');
    });

    it('supports Instagram reels search_type', () => {
      const payload = buildSearchPayload('INSTAGRAM', 'jewelry', 'keyword', 1, 30, 'reels');
      expect(payload.platform).toBe('instagram');
      expect(payload.search_type).toBe('reels');
    });
  });

  describe('normalizeSearchResults', () => {
    it('returns empty array when given non-array input', () => {
      expect(normalizeSearchResults(null as any, 'TIKTOK')).toEqual([]);
      expect(normalizeSearchResults(undefined as any, 'DOUYIN')).toEqual([]);
    });

    it('normalizes multi-platform video items correctly', () => {
      const raw = [
        {
          video_id: 'vid_123',
          title: 'Gorgeous Jade Ring',
          description: 'High quality jewelry piece',
          thumbnail_url: 'https://cdn.example.com/thumb.jpg',
          video_url: 'https://tiktok.com/@vcb/video/123',
          author_name: 'VCB Official',
          author_username: 'vcbofficial',
          views_count: 5000,
          likes_count: 320,
          comments_count: 45,
          shares_count: 12,
        },
      ];

      const res = normalizeSearchResults(raw, 'TIKTOK');
      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        id: 'vid_123',
        video_id: 'vid_123',
        title: 'Gorgeous Jade Ring',
        description: 'High quality jewelry piece',
        thumbnail_url: 'https://cdn.example.com/thumb.jpg',
        video_url: 'https://tiktok.com/@vcb/video/123',
        author_name: 'VCB Official',
        author_username: 'vcbofficial',
        views_count: 5000,
        likes_count: 320,
        comments_count: 45,
        shares_count: 12,
        platform: 'TIKTOK',
        raw_data: raw[0],
      });
    });

    it('fallbacks missing fields gracefully', () => {
      const raw = [
        {
          id: 'note_999',
          description: 'Solo description note',
          play_count: '1200',
          digg_count: '85',
        },
      ];

      const res = normalizeSearchResults(raw, 'XIAOHONGSHU');
      expect(res[0].video_id).toBe('note_999');
      expect(res[0].title).toBe('Solo description note');
      expect(res[0].views_count).toBe(1200);
      expect(res[0].likes_count).toBe(85);
      expect(res[0].author_name).toBe('N/A');
    });
  });
});
