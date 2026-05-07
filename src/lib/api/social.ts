import apiClient from '../api-client';

export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'THREADS' | 'YOUTUBE' | 'ZALO';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  name: string;
  username?: string;
  avatar_url?: string;
  is_active: boolean;
  token_expires_at?: string;
  parent_id?: string;
  extra_data?: Record<string, any>;
  created_at: string;
}


export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  message: string;
  media_urls: string[];
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  source: 'IMMEDIATE' | 'SCHEDULED';
  scheduled_at?: string;
  executed_at?: string;
  error_msg?: string;
  created_at: string;
  account?: { name: string; username?: string; avatar_url?: string; platform: SocialPlatform };
}

// ─── Accounts ───────────────────────────────────────────────────────────────

export interface UploadedMedia {
  url: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export const socialApi = {
  /** Upload file lên BE → lấy public URL trước khi publish */
  upload: {
    media: async (files: File[]): Promise<UploadedMedia[]> => {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      const res = await apiClient.post<{ urls: UploadedMedia[] }>(
        '/social/upload/media', form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return res.data.urls;
    },
    fromDrive: async (fileId: string, accessToken: string, mimeType: string, filename: string): Promise<UploadedMedia[]> => {
      const res = await apiClient.post<{ urls: UploadedMedia[] }>(
        '/social/upload/from-drive',
        { fileId, accessToken, mimeType, filename }
      );
      return res.data.urls;
    },
  },

  accounts: {
    list: (): Promise<SocialAccount[]> =>
      apiClient.get<SocialAccount[]>('/social/accounts').then((r) => r.data),
    disconnect: (id: string) => apiClient.delete(`/social/accounts/${id}`).then((r) => r.data),
  },

  oauth: {
    getUrl: (platform: SocialPlatform) =>
      apiClient.get<{ url: string }>(`/social/oauth/${platform.toLowerCase()}/url`).then((r) => r.data),
    connectViaToken: (platform: SocialPlatform, data: { access_token: string; refresh_token?: string; page_id?: string }) =>
      apiClient.post(`/social/oauth/${platform.toLowerCase()}/token`, data).then((r) => r.data),
  },

  publish: {
    now: (data: { accountId: string; message: string; mediaUrls?: string[]; pageId?: string; privacy?: string }) =>
      apiClient.post('/social/publish', data, { timeout: 600000 }).then((r) => r.data),
  },

  queue: {
    /** Thêm nhiều jobs vào hàng chờ — trả về jobIds để poll */
    enqueue: (jobs: Array<{
      accountId: string;
      platform: SocialPlatform;
      message: string;
      mediaUrls?: string[];
      privacy?: string;
      pageId?: string;
    }>): Promise<{ jobIds: string[]; total: number }> =>
      apiClient.post('/social/queue/enqueue', { jobs }).then((r) => r.data),

    /** Poll trạng thái nhiều jobs — gọi mỗi 3 giây */
    pollStatus: (jobIds: string[]): Promise<{
      jobs: Array<{
        id: string;
        status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
        platform: SocialPlatform;
        error_msg: string | null;
        result: any;
        queuePosition: number | null;
        queueTotal: number | null;
        account: { name: string; platform: SocialPlatform } | null;
      }>;
    }> =>
      apiClient.get(`/social/queue/status?ids=${jobIds.join(',')}`).then((r) => r.data),

    /** Thống kê hàng chờ (admin) */
    stats: () => apiClient.get('/social/queue/stats').then((r) => r.data),
  },

  schedule: {
    list: () => apiClient.get<SocialPost[]>('/social/schedule').then((r) => r.data),
    create: (data: { accountId: string; message: string; mediaUrls?: string[]; pageId?: string; scheduledAt: string; privacy?: string }) =>
      apiClient.post('/social/schedule', data).then((r) => r.data),
    update: (id: string, data: { message?: string; scheduledAt?: string }) =>
      apiClient.put(`/social/schedule/${id}`, data).then((r) => r.data),
    cancel: (id: string) => apiClient.delete(`/social/schedule/${id}`).then((r) => r.data),
    retry: (id: string) => apiClient.post(`/social/schedule/${id}/retry`).then((r) => r.data),
  },

  history: {
    list: (limit = 50) => apiClient.get<SocialPost[]>(`/social/history?limit=${limit}`).then((r) => r.data),
    stats: () => apiClient.get('/social/history/stats').then((r) => r.data),
    notifications: () => apiClient.get('/social/history/notifications').then((r) => r.data),
  },

  drafts: {
    list: () => apiClient.get('/social/drafts').then((r) => r.data),
    create: (data: { title?: string; message: string; mediaUrls?: string[]; platform?: SocialPlatform; accountId?: string }) =>
      apiClient.post('/social/drafts', data).then((r) => r.data),
    update: (id: string, data: any) => apiClient.put(`/social/drafts/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete(`/social/drafts/${id}`).then((r) => r.data),
  },
};

export const PLATFORM_META: Record<SocialPlatform, { label: string; color: string; emoji: string }> = {
  FACEBOOK:  { label: 'Facebook',   color: 'bg-blue-600',   emoji: '👤' },
  INSTAGRAM: { label: 'Instagram',  color: 'bg-pink-500',   emoji: '📷' },
  TIKTOK:    { label: 'TikTok',     color: 'bg-black',      emoji: '🎵' },
  THREADS:   { label: 'Threads',    color: 'bg-gray-800',   emoji: '🧵' },
  YOUTUBE:   { label: 'YouTube',    color: 'bg-red-600',    emoji: '▶️' },
  ZALO:      { label: 'Zalo OA',    color: 'bg-sky-500',    emoji: '💬' },
};
