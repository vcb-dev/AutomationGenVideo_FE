'use client';

import type { ChannelAlert } from '@/services/scraperService';
import { ChannelAvatar, Subtitle, Card, PlatformCard, CardTitle, EmptyState } from './shared';

/**
 * Three alert categories generated and prioritized by the backend:
 * 1. Sync errors
 * 2. View drops
 * 3. Inactive/silent channels
 */
export default function AlertBlock({
  alerts,
  hiddenCount = 0,
}: {
  alerts: ChannelAlert[];
  /** Số cảnh báo BE đã cắt đi cho vừa màn hình. Không nói ra thì 12 dòng đọc như là tất cả. */
  hiddenCount?: number;
}) {
  return (
    <Card chim className="!mb-0">
      <CardTitle hint="Kênh đồng bộ lỗi, tụt hiệu quả hoặc đã lâu không đăng bài">
        Cần chú ý
      </CardTitle>
      <Subtitle className="!mb-2">Cập nhật sau mỗi lần đồng bộ</Subtitle>

      {alerts.length === 0 ? (
        <EmptyState tieu_de="Không có cảnh báo" mo_ta="Mọi kênh nội bộ đang chạy đúng nhịp." />
      ) : (
        <div>
          {alerts.map((c, i) => {
            const channelName = c.channel || c.kenh || '';
            const content = c.content || c.noi_dung || '';
            const level = c.level || c.muc || 'w';
            const label = c.label || c.nhan || 'Lưu ý';

            return (
              <div
                key={i}
                className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <ChannelAvatar ten={channelName} platform={c.platform} size={32} />
                <div className="flex-1 min-w-0 text-[13.5px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <b className="font-medium text-foreground">{channelName}</b>
                    <PlatformCard platform={c.platform} />
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 text-[12.5px] mt-0.5 font-normal break-words">
                    {content}
                  </div>
                </div>
                <span
                  className={[
                    'text-[11.5px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap border shrink-0',
                    level === 'b'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <p className="text-[12.5px] text-slate-400 dark:text-slate-500 pt-3">
              Còn {hiddenCount} cảnh báo nữa không hiện ở đây — mở mục Kênh nội bộ để xem đầy đủ.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
