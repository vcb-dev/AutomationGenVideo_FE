import { FacebookPage, PaginatedPages, PaginatedVideos, PageFilters, VideoFilters } from '@/types/facebook';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

function buildParams(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export const facebookService = {
  // Import pages metadata từ Facebook (nhẹ, không cào video)
  syncAndGetPages: async (token: string): Promise<FacebookPage[]> => {
    const importRes = await fetch(`${API_URL}/facebook/import/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!importRes.ok) throw new Error('Không thể import kênh từ Facebook');

    const listRes = await fetch(`${API_URL}/facebook/manage-pages/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok) throw new Error('Không thể tải danh sách kênh');
    const json = await listRes.json();
    return json.pages || [];
  },

  // Lấy danh sách pages với pagination + filter + search
  getPages: async (token: string, filters?: PageFilters): Promise<PaginatedPages> => {
    const qs = filters ? buildParams(filters) : '';
    const res = await fetch(`${API_URL}/facebook/manage-pages/${qs ? '?' + qs : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải danh sách kênh');
    return res.json();
  },

  // Lấy videos với pagination + filter + search
  getPageVideos: async (token: string, pageId: string, filters?: VideoFilters): Promise<PaginatedVideos> => {
    const qs = filters ? buildParams(filters) : '';
    const res = await fetch(`${API_URL}/facebook/page-videos/${pageId}/${qs ? '?' + qs : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải danh sách video');
    return res.json();
  },

  // Trigger delta sync (cào bài mới)
  triggerScrape: async (token: string, pageId: string): Promise<{ message: string; is_scraping: boolean }> => {
    const res = await fetch(`${API_URL}/facebook/sync/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: pageId }),
    });
    if (!res.ok) throw new Error('Không thể gửi yêu cầu cào video');
    return res.json();
  },

  // Trigger backfill (cào lượt đầu)
  triggerBackfill: async (token: string, pageId: string): Promise<{ message: string; is_scraping: boolean }> => {
    const res = await fetch(`${API_URL}/facebook/backfill/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: pageId }),
    });
    if (!res.ok) throw new Error('Không thể gửi yêu cầu cào lượt đầu');
    return res.json();
  },
};
