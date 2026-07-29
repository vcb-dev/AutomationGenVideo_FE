import { useCallback, useRef } from 'react';
import { useScrapingStore, ScrapeNotification } from '@/store/scraping-store';

interface StartOptions {
  /** Tên hiển thị trong thông báo — nickname/username của profile */
  label: string;
  /** Số video/reel đã có trước khi bắt đầu cào (để tính số video mới) */
  before: number;
  /** Gọi API detail để biết trạng thái cào hiện tại + số video hiện có */
  fetchStatus: () => Promise<{ scraping_status: string; count: number }>;
  /** Số lần poll tối đa trước khi coi là timeout (mặc định ~5 phút ở 5s/lần) */
  maxAttempts?: number;
  intervalMs?: number;
}

/**
 * Tạo thông báo "đang cào" cho 1 profile rồi tự poll API detail cho tới khi
 * cào xong (scraping_status rời khỏi 'processing'), tính newCount bằng cách
 * so sánh số video trước/sau, và cập nhật thông báo thành "done"/"error".
 *
 * Dùng cho các trang danh sách (list) nơi không có sẵn cơ chế poll theo dõi
 * 1 profile cụ thể như ở trang chi tiết.
 */
export function useProfileScrapeNotification(platform: ScrapeNotification['platform']) {
  const { addNotification, updateNotification } = useScrapingStore();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const start = useCallback((opts: StartOptions): string => {
    const notifId = addNotification({
      platform,
      kind: 'profile',
      label: opts.label,
      status: 'scraping',
      startedAt: new Date(),
    });

    const maxAttempts = opts.maxAttempts ?? 60;
    const intervalMs = opts.intervalMs ?? 5000;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const detail = await opts.fetchStatus();
        if (detail.scraping_status !== 'processing') {
          updateNotification(notifId, {
            status: detail.scraping_status === 'failed' ? 'error' : 'done',
            completedAt: new Date(),
            newCount: Math.max(0, detail.count - opts.before),
          });
          timers.current.delete(notifId);
          return;
        }
      } catch {
        // Lỗi tạm thời (mạng, 404 do chưa kịp tạo record...) — thử lại lần sau
      }
      if (attempts >= maxAttempts) {
        updateNotification(notifId, { status: 'error', completedAt: new Date() });
        timers.current.delete(notifId);
        return;
      }
      const t = setTimeout(poll, intervalMs);
      timers.current.set(notifId, t);
    };

    const t = setTimeout(poll, intervalMs);
    timers.current.set(notifId, t);
    return notifId;
  }, [addNotification, updateNotification, platform]);

  return { start };
}
