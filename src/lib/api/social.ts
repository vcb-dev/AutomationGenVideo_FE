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
  token_expires_soon?: boolean;
  token_expires_in_days?: number | null;
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

export interface UploadedMedia {
  url: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  thumbnail_url?: string;
  storage?: string;
  warning?: string;
}

export interface MediaLibraryItem {
  id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  storage: 'supabase' | 'local' | 'db';
  created_at: string;
}

export const socialApi = {
  upload: {
    media: async (files: File[], platform?: SocialPlatform): Promise<UploadedMedia[]> => {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      const params = platform ? `?platform=${platform}` : '';
      const res = await apiClient.post<{ urls: UploadedMedia[] }>(
        `/social/upload/media${params}`, form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data.urls;
    },
    chunked: async (file: File, onProgress?: (pct: number) => void): Promise<UploadedMedia[]> => {
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const { uploadId, chunkSize } = await apiClient
        .post<{ uploadId: string; chunkSize: number }>('/social/upload/chunk/init', {
          filename: file.name, mimetype: file.type, totalSize: file.size,
        }).then(r => r.data);
      const totalChunks = Math.ceil(file.size / (chunkSize || CHUNK_SIZE));
      for (let i = 0; i < totalChunks; i++) {
        const start = i * (chunkSize || CHUNK_SIZE);
        const blob  = file.slice(start, start + (chunkSize || CHUNK_SIZE));
        // Dùng FormData thay vì base64 JSON → không tốn 3× memory
        const form = new FormData();
        form.append('uploadId', uploadId);
        form.append('chunkIndex', String(i));
        form.append('chunk', blob, 'chunk');
        await apiClient.post('/social/upload/chunk', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onProgress?.(Math.round(((i + 1) / totalChunks) * 90));
      }
      const result = await apiClient.post<{ urls: UploadedMedia[] }>('/social/upload/chunk/finish', { uploadId, totalChunks }).then(r => r.data);
      onProgress?.(100);
      return result.urls;
    },
    fromDrive: async (fileId: string, accessToken: string, mimeType: string, filename: string): Promise<UploadedMedia[]> => {
      const res = await apiClient.post<{ urls: UploadedMedia[] }>('/social/upload/from-drive', { fileId, accessToken, mimeType, filename });
      return res.data.urls;
    },
  },

  accounts: {
    list: (): Promise<SocialAccount[]> =>
      apiClient.get<SocialAccount[]>('/social/accounts').then((r) => r.data),
    disconnect: (id: string) => apiClient.delete(`/social/accounts/${id}`).then((r) => r.data),
    expiring: (): Promise<Array<SocialAccount & { days_until_expiry: number }>> =>
      apiClient.get('/social/accounts/expiring').then((r) => r.data),
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
    enqueue: (jobs: Array<{ accountId: string; platform: SocialPlatform; message: string; mediaUrls?: string[]; privacy?: string; pageId?: string }>): Promise<{ jobIds: string[]; total: number }> =>
      apiClient.post('/social/queue/enqueue', { jobs }).then((r) => r.data),
    pollStatus: (jobIds: string[]): Promise<{ jobs: Array<{ id: string; status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'; platform: SocialPlatform; error_msg: string | null; result: any; queuePosition: number | null; queueTotal: number | null; account: { name: string; platform: SocialPlatform } | null }> }> =>
      apiClient.get(`/social/queue/status?ids=${jobIds.join(',')}`).then((r) => r.data),
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

  library: {
    list: (page = 1, limit = 20): Promise<{ items: MediaLibraryItem[]; total: number; pages: number }> =>
      apiClient.get(`/social/library?page=${page}&limit=${limit}`).then((r) => r.data),
    stats: (): Promise<{ count: number; totalBytes: number; totalMB: number }> =>
      apiClient.get('/social/library/stats').then((r) => r.data),
    remove: (id: string) => apiClient.delete(`/social/library/${id}`).then((r) => r.data),
    postHistory: (id: string) => apiClient.get(`/social/library/${id}/posts`).then((r) => r.data),
    upload: async (file: File, onProgress?: (pct: number) => void): Promise<MediaLibraryItem> => {
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post<{ file: MediaLibraryItem }>(
        '/social/library/upload', form,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 600_000,
          onUploadProgress: (e) => { if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100)); } },
      );
      return res.data.file;
    },
  },

  hashtag: {
    suggest: (message: string, platform?: SocialPlatform): Promise<{ hashtags: string[]; source: 'ai' | 'keyword' }> =>
      apiClient.post('/social/hashtag/suggest', { message, platform }).then((r) => r.data),
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
