'use client';

import { useState } from 'react';
import type { HashtagThongKe } from '@/services/scraperService';
import { ThanhNgang } from './BaKhoiBocTach';
import { MAU_CHINH, NhomTab, PhuDe, The, TieuDeThe, TrangRong, soDay, soGon } from './shared';

type Kieu = 'views' | 'posts';

/**
 * Thay cho khối "Cách mọi người tìm thấy nội dung" của bản thiết kế — nguồn hiển thị là số
 * liệu insight riêng của nền tảng, cào từ ngoài không lấy được. Hashtag thì có sẵn ngay
 * trong caption và là thứ đội nội dung điều khiển được, nên hữu ích hơn hẳn một khung rỗng.
 *
 * #A1…#A5 đã bị BE loại khỏi danh sách này vì đã có khối "Tuyến nội dung" riêng.
 */
export default function KhoiHashtag({ hashtag }: { hashtag: HashtagThongKe[] }) {
  const [kieu, setKieu] = useState<Kieu>('views');

  const lon = Math.max(...hashtag.map((h) => h[kieu]), 1);

  return (
    <The className="!mb-5">
      <TieuDeThe chuThich="Bóc trực tiếp từ hashtag trong caption. Một video gắn nhiều thẻ sẽ được tính cho từng thẻ">
        Hiệu quả theo hashtag
      </TieuDeThe>
      <PhuDe>10 thẻ dẫn đầu trong kỳ</PhuDe>

      <NhomTab<Kieu>
        className="my-3.5"
        dang_chon={kieu}
        onChon={setKieu}
        cac_tab={[
          { ma: 'views', nhan: 'Theo lượt xem' },
          { ma: 'posts', nhan: 'Theo số bài' },
        ]}
      />

      {hashtag.length === 0 ? (
        <TrangRong tieu_de="Chưa có hashtag" mo_ta="Không có video nào trong kỳ gắn hashtag." />
      ) : (
        <div>
          {[...hashtag]
            .sort((a, b) => b[kieu] - a[kieu])
            .map((h) => (
              <ThanhNgang
                key={h.the}
                nhan={`#${h.the}`}
                phanTramGiaTri={h[kieu]}
                phanTramLon={lon}
                mau={MAU_CHINH}
                ben_phai={kieu === 'views' ? soGon(h.views) : soDay(h.posts)}
                phu={kieu === 'views' ? `${soDay(h.posts)} bài` : `${soGon(h.views)} lượt xem`}
              />
            ))}
        </div>
      )}
    </The>
  );
}
