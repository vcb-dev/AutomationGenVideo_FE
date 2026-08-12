'use client';

import { useState } from 'react';
import type { HashtagThongKe } from '@/services/scraperService';
import { HorizontalBar } from './BreakdownBlocks';
import { COLOR_PRIMARY, TabGroup, Subtitle, The, CardTitle, EmptyState, fullNumber, compactNumber } from './shared';

type MetricKey = 'views' | 'posts';

/**
 * Thay cho khối "Cách mọi người tìm thấy nội dung" của bản thiết kế — nguồn hiển thị là số
 * liệu insight riêng của nền tảng, cào từ ngoài không lấy được. Hashtag thì có sẵn ngay
 * trong caption và là thứ đội nội dung điều khiển được, nên hữu ích hơn hẳn một khung rỗng.
 *
 * #A1…#A5 đã bị BE loại khỏi danh sách này vì đã có khối "Tuyến nội dung" riêng.
 */
export default function HashtagBlock({ hashtag }: { hashtag: HashtagThongKe[] }) {
  const [metric, setMetric] = useState<MetricKey>('views');

  const maxValue = Math.max(...hashtag.map((h) => h[metric]), 1);

  return (
    <The className="!mb-5">
      <CardTitle hint="Bóc trực tiếp từ hashtag trong caption. Một video gắn nhiều thẻ sẽ được tính cho từng thẻ">
        Hiệu quả theo hashtag
      </CardTitle>
      <Subtitle>10 thẻ dẫn đầu trong kỳ</Subtitle>

      <TabGroup<MetricKey>
        className="my-3.5"
        dang_chon={metric}
        onSelect={setMetric}
        cac_tab={[
          { ma: 'views', nhan: 'Theo lượt xem' },
          { ma: 'posts', nhan: 'Theo số bài' },
        ]}
      />

      {hashtag.length === 0 ? (
        <EmptyState tieu_de="Chưa có hashtag" mo_ta="Không có video nào trong kỳ gắn hashtag." />
      ) : (
        <div>
          {[...hashtag]
            .sort((a, b) => b[metric] - a[metric])
            .map((h) => (
              <HorizontalBar
                key={h.the}
                nhan={`#${h.the}`}
                phanTramGiaTri={h[metric]}
                phanTramLon={maxValue}
                mau={COLOR_PRIMARY}
                ben_phai={metric === 'views' ? compactNumber(h.views) : fullNumber(h.posts)}
                phu={metric === 'views' ? `${fullNumber(h.posts)} bài` : `${compactNumber(h.views)} lượt xem`}
              />
            ))}
        </div>
      )}
    </The>
  );
}
