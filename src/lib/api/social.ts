import apiClient from '../api-client';
import { withUploadQueue } from '../upload-queue';

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
  extra_data?: Record<string, string | number | boolean | null | undefined>;
  created_at: string;
}

export interface SocialPostResult {
  postId?: string;
  videoId?: string;
  publishId?: string;
  url?: string;
  status?: string;
  [key: string]: unknown;
}

export interface SocialPost {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  message: string;
  media_urls: string[];
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  source: 'IMMEDIATE' | 'SCHEDULED';
  scheduled_at?: string;
  executed_at?: string;
  error_msg?: string;
  thumb_url?: string;
  retry_count?: number;
  next_retry_at?: string;
  created_at: string;
  result?: SocialPostResult;
  account?: { name: string; username?: string; avatar_url?: string; platform: SocialPlatform };
  user?: { id: string; full_name: string; team?: string; image_url?: string };
}

export interface HistoryMember {
  id: string;
  full_name: string;
  email: string;
  team?: string;
  roles: string[];
  image_url?: string;
}

export interface QueueJobStatus {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  platform: SocialPlatform;
  error_msg: string | null;
  result: unknown;
  queuePosition: number | null;
  queueTotal: number | null;
  account: { name: string; platform: SocialPlatform } | null;
}

export interface UploadedMedia {
  url: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  thumbnail_url?: string;
  storage?: string;
  drive_file_id?: string;
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
  storage: 'supabase' | 'local' | 'db' | 'google_drive';
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
    fromDrive: async (fileId: string, accessToken: string, mimeType: string, filename: string): Promise<UploadedMedia[]> => {
      const res = await apiClient.post<{ urls: UploadedMedia[] }>(
        '/social/upload/from-drive',
        { fileId, accessToken, mimeType, filename }
      );
      return res.data.urls;
    },
    chunked: (file: File, onProgress?: (pct: number) => void): Promise<UploadedMedia[]> =>
      withUploadQueue(async () => {
        const CHUNK_SIZE = 8 * 1024 * 1024;
        const { uploadId, uploadUrl, chunkSize } = await apiClient
          .post<{ uploadId: string; uploadUrl: string; chunkSize: number }>('/social/upload/chunk/init', {
            filename: file.name, mimetype: file.type, totalSize: file.size,
          }).then(r => r.data);
        const effectiveChunkSize = chunkSize || CHUNK_SIZE;
        let driveFileId: string | undefined;
        let offset = 0;

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const syncStatus = async () => {
          const status = await apiClient.post<{
            uploadedBytes: number;
            totalSize: number;
            completed: boolean;
            driveFileId?: string;
          }>('/social/upload/chunk/status', { uploadId }).then(r => r.data);
          driveFileId = status.driveFileId || driveFileId;
          offset = Math.min(status.uploadedBytes || 0, file.size);
          onProgress?.(Math.round((offset / file.size) * 90));
          return status;
        };

        while (offset < file.size) {
          const start = offset;
          const end = Math.min(start + effectiveChunkSize, file.size) - 1;
          const blob = file.slice(start, end + 1);
          let uploaded = false;

          for (let attempt = 1; attempt <= 5; attempt++) {
            try {
              const res = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                  'Content-Type': file.type || 'application/octet-stream',
                  'Content-Range': `bytes ${start}-${end}/${file.size}`,
                },
                body: blob,
                signal: AbortSignal.timeout(60_000),
              });

              // Server quá tải: đợi theo Retry-After rồi thử lại (không tính vào attempt)
              if (res.status === 429) {
                const wait = parseInt(res.headers.get('Retry-After') ?? '5', 10);
                await sleep(Math.max(wait * 1000, 3000));
                attempt--; // không tính lần này
                continue;
              }

              if (res.status === 200 || res.status === 201) {
                const data = await res.json().catch(() => ({}));
                driveFileId = (data as { id?: string }).id;
                offset = file.size;
                uploaded = true;
                break;
              }

              if (res.status === 308) {
                offset = end + 1;
                uploaded = true;
                break;
              }

              const text = await res.text().catch(() => res.statusText);
              throw new Error(`Google Drive upload failed (${res.status}): ${text}`);
            } catch (err) {
              if (attempt === 5) {
                const status = await syncStatus().catch(() => null);
                if (status?.completed) {
                  driveFileId = status.driveFileId;
                  offset = file.size;
                  uploaded = true;
                  break;
                }
                if (offset > start) {
                  uploaded = true;
                  break;
                }
                await apiClient.post('/social/upload/chunk/cancel', { uploadId }).catch(() => {});
                throw err;
              }
              await sleep(1000 * attempt);
            }
          }

          if (!uploaded) throw new Error('Google Drive upload failed');
          onProgress?.(Math.round((offset / file.size) * 90));
        }

        if (!driveFileId) {
          const status = await syncStatus();
          driveFileId = status.driveFileId;
        }
        if (!driveFileId) throw new Error('Không lấy được driveFileId sau khi upload hoàn tất');
        onProgress?.(95);
        const result = await apiClient.post<{ urls: UploadedMedia[] }>('/social/upload/chunk/finish', { uploadId, driveFileId }).then(r => r.data);
        onProgress?.(100);
        return result.urls;
      }),
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
    enqueue: (jobs: Array<{ accountId: string; platform: SocialPlatform; message: string; mediaUrls?: string[]; privacy?: string; pageId?: string; thumbUrl?: string }>): Promise<{ jobIds: string[]; total: number }> =>
      apiClient.post('/social/queue/enqueue', { jobs }).then((r) => r.data),
    pollStatus: (jobIds: string[]): Promise<{ jobs: QueueJobStatus[] }> =>
      apiClient.get(`/social/queue/status?ids=${jobIds.join(',')}`).then((r) => r.data),
    stats: () => apiClient.get('/social/queue/stats').then((r) => r.data),
  },

  schedule: {
    list: () => apiClient.get<SocialPost[]>('/social/schedule').then((r) => r.data),
    create: (data: { accountId: string; message: string; mediaUrls?: string[]; pageId?: string; scheduledAt: string; privacy?: string; thumbUrl?: string }) =>
      apiClient.post('/social/schedule', data).then((r) => r.data),
    update: (id: string, data: { message?: string; scheduledAt?: string }) =>
      apiClient.put(`/social/schedule/${id}`, data).then((r) => r.data),
    cancel: (id: string) => apiClient.delete(`/social/schedule/${id}`).then((r) => r.data),
    retry: (id: string) => apiClient.post(`/social/schedule/${id}/retry`).then((r) => r.data),
  },

  history: {
    list: (params?: { limit?: number; team?: string; employeeId?: string }) => {
      const p = new URLSearchParams();
      if (params?.limit) p.set('limit', String(params.limit));
      if (params?.team) p.set('team', params.team);
      if (params?.employeeId) p.set('employeeId', params.employeeId);
      return apiClient.get<SocialPost[]>(`/social/history?${p.toString()}`).then((r) => r.data);
    },
    stats: (params?: { team?: string; employeeId?: string }) => {
      const p = new URLSearchParams();
      if (params?.team) p.set('team', params.team);
      if (params?.employeeId) p.set('employeeId', params.employeeId);
      return apiClient.get(`/social/history/stats?${p.toString()}`).then((r) => r.data);
    },
    notifications: () => apiClient.get('/social/history/notifications').then((r) => r.data),
    members: (team?: string): Promise<HistoryMember[]> => {
      const p = team ? `?team=${encodeURIComponent(team)}` : '';
      return apiClient.get<HistoryMember[]>(`/social/history/members${p}`).then((r) => r.data);
    },
    teams: (): Promise<string[]> =>
      apiClient.get<string[]>('/social/history/teams').then((r) => r.data),
  },

  drafts: {
    list: () => apiClient.get('/social/drafts').then((r) => r.data),
    create: (data: { title?: string; message: string; mediaUrls?: string[]; platform?: SocialPlatform; accountId?: string; thumbUrl?: string }) =>
      apiClient.post('/social/drafts', data).then((r) => r.data),
    update: (id: string, data: { title?: string; message?: string; mediaUrls?: string[]; platform?: SocialPlatform; accountId?: string; thumbUrl?: string }) =>
      apiClient.put(`/social/drafts/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete(`/social/drafts/${id}`).then((r) => r.data),
  },

  library: {
    list: (page = 1, limit = 20): Promise<{ items: MediaLibraryItem[]; total: number; pages: number }> =>
      apiClient.get(`/social/library?page=${page}&limit=${limit}`).then((r) => r.data),
    stats: (): Promise<{ count: number; totalBytes: number; totalMB: number }> =>
      apiClient.get('/social/library/stats').then((r) => r.data),
    remove: (id: string) => apiClient.delete(`/social/library/${id}`).then((r) => r.data),
    postHistory: (id: string) => apiClient.get(`/social/library/${id}/posts`).then((r) => r.data),
    previewFrame: (id: string, timeSeconds: number): Promise<{ previewUrl: string }> =>
      apiClient.post(`/social/library/${id}/preview-frame`, { timeSeconds }).then((r) => r.data),
    setThumbnailAt: (id: string, timeSeconds: number): Promise<{ thumbnail_url: string }> =>
      apiClient.post(`/social/library/${id}/set-thumbnail`, { timeSeconds }).then((r) => r.data),
    upload: (file: File, onProgress?: (pct: number) => void, opts?: { type?: 'media' | 'thumb'; thumbFor?: string }): Promise<MediaLibraryItem> =>
      withUploadQueue(async () => {
        const form = new FormData();
        form.append('file', file);
        const params = new URLSearchParams();
        if (opts?.type === 'thumb') params.set('type', 'thumb');
        if (opts?.thumbFor) params.set('thumbFor', opts.thumbFor);
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await apiClient.post<{ file: MediaLibraryItem }>(
          `/social/library/upload${query}`, form,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 600_000,
            onUploadProgress: (e) => {
              if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
              else onProgress?.(50);
            },
          },
        );
        if (!res.data?.file) throw new Error('Upload thất bại: server không trả về thông tin file');
        return res.data.file;
      }),
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
