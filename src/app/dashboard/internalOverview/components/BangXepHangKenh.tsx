'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ThongKeKenh } from '@/services/scraperService';
import {
  AnhKenh,
  NhomTab,
  PhuDe,
  The,
  TheNenTang,
  TieuDeThe,
  TrangRong,
  mauNenTang,
  moTaDongBo,
  phanTram,
  soDay,
  soGon,
  tenNenTang,
  tyLe,
} from './shared';

type Cot = 'posts' | 'views' | 'likes' | 'comments' | 'tb' | 'er' | 'followers';

const COT: { ma: Cot; nhan: string }[] = [
  { ma: 'posts', nhan: 'Bài đăng' },
  { ma: 'views', nhan: 'Lượt xem' },
  { ma: 'likes', nhan: 'Lượt thích' },
  { ma: 'comments', nhan: 'Bình luận' },
  { ma: 'tb', nhan: 'TB / bài' },
  { ma: 'er', nhan: 'Tỷ lệ tương tác' },
  { ma: 'followers', nhan: 'Người theo dõi' },
];

interface DongKenh extends ThongKeKenh {
  tb: number;
  er: number;
}

/**
 * Bảng xếp hạng kênh nội bộ. Chỉ liệt kê kênh CÓ đăng bài trong kỳ; kênh im lặng nằm ở khối
 * "Cần chú ý" chứ không lẫn vào đây với một hàng toàn số 0.
 *
 * Bấm một dòng thì mở thẳng danh sách video của kênh đó ở trang Kênh nội bộ — cùng bộ lọc
 * `channel` mà trang ấy đang dùng, nên không cần thêm gì ở phía kia.
 */
export default function BangXepHangKenh({ kenh }: { kenh: ThongKeKenh[] }) {
  const router = useRouter();
  const [cot, setCot] = useState<Cot>('views');
  const [giam, setGiam] = useState(true);
  const [nhom, setNhom] = useState<'0' | '1'>('0');

  const nhieuNenTang = new Set(kenh.map((k) => k.platform)).size > 1;

  const dong: DongKenh[] = useMemo(
    () =>
      kenh.map((k) => ({
        ...k,
        tb: k.posts > 0 ? Math.round(k.views / k.posts) : 0,
        er: tyLe(k.likes + k.comments + k.shares, k.views),
      })),
    [kenh],
  );

  const daSap = useMemo(
    () => [...dong].sort((a, b) => (a[cot] - b[cot]) * (giam ? -1 : 1)),
    [dong, cot, giam],
  );

  const lonNhat = Math.max(...dong.map((d) => d.views), 1);

  const doiCot = (ma: Cot) => {
    if (ma === cot) setGiam((v) => !v);
    else {
      setCot(ma);
      setGiam(true);
    }
  };

  const moKenh = (k: DongKenh) =>
    router.push(`/dashboard/internalChannels/all?channel=${encodeURIComponent(k.id)}`);

  const nhomTheoNenTang = nhom === '1' && nhieuNenTang;
  const cacNenTang = [...new Set(daSap.map((k) => k.platform))];

  return (
    <The className="!mb-5">
      <TieuDeThe chuThich="Bấm tiêu đề cột để đổi cách sắp xếp">Xếp hạng kênh</TieuDeThe>
      <PhuDe>Bấm một dòng để xem toàn bộ video của kênh</PhuDe>

      {nhieuNenTang && (
        <NhomTab<'0' | '1'>
          className="my-3.5"
          dang_chon={nhom}
          onChon={setNhom}
          cac_tab={[
            { ma: '0', nhan: 'Xếp chung' },
            { ma: '1', nhan: 'Nhóm theo nền tảng' },
          ]}
        />
      )}

      {kenh.length === 0 ? (
        <div className="mt-4">
          <TrangRong
            tieu_de="Chưa kênh nào đăng bài"
            mo_ta="Không có kênh nội bộ nào có video trong kỳ đang chọn. Thử nới rộng khoảng thời gian."
          />
        </div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full border-separate border-spacing-0 tabular-nums">
            <thead>
              <tr>
                <th className="text-left pl-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-border whitespace-nowrap">
                  Kênh
                </th>
                {nhieuNenTang && (
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-border whitespace-nowrap">
                    Nền tảng
                  </th>
                )}
                {COT.map((c) => (
                  <th
                    key={c.ma}
                    onClick={() => doiCot(c.ma)}
                    className={`text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider border-b border-border whitespace-nowrap cursor-pointer select-none transition-colors ${
                      c.ma === cot ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-500'
                    }`}
                  >
                    {c.nhan}
                    {c.ma === cot && (giam ? ' ↓' : ' ↑')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nhomTheoNenTang
                ? cacNenTang.map((p) => {
                    const cua = daSap.filter((k) => k.platform === p);
                    return (
                      <Fragment key={p}>
                        <tr>
                          <td
                            colSpan={COT.length + 2}
                            className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 px-3.5 py-2.5 rounded-lg"
                          >
                            <TheNenTang platform={p} />
                            <span className="ml-2">
                              {cua.length} kênh · {soDay(cua.reduce((s, k) => s + k.posts, 0))} bài ·{' '}
                              {soGon(cua.reduce((s, k) => s + k.views, 0))} lượt xem
                            </span>
                          </td>
                        </tr>
                        {cua.map((k) => (
                          <Dong
                            key={`${k.platform}-${k.id}`}
                            k={k}
                            lonNhat={lonNhat}
                            hienNenTang={nhieuNenTang}
                            onMo={() => moKenh(k)}
                          />
                        ))}
                      </Fragment>
                    );
                  })
                : daSap.map((k) => (
                    <Dong
                      key={`${k.platform}-${k.id}`}
                      k={k}
                      lonNhat={lonNhat}
                      hienNenTang={nhieuNenTang}
                      onMo={() => moKenh(k)}
                    />
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </The>
  );
}

function Dong({
  k,
  lonNhat,
  hienNenTang,
  onMo,
}: {
  k: DongKenh;
  lonNhat: number;
  hienNenTang: boolean;
  onMo: () => void;
}) {
  const o = 'px-3 py-3.5 text-right text-[13px] border-b border-slate-100 dark:border-slate-800';
  return (
    <tr onClick={onMo} className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <td className="pl-1.5 pr-3 py-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <AnhKenh ten={k.ten} avatar={k.avatar} platform={k.platform} />
          <div className="min-w-0">
            <div className="font-medium text-[13.5px] leading-snug text-foreground truncate max-w-[220px]">
              {k.ten}
            </div>
            <div className="text-slate-400 dark:text-slate-500 text-[11.5px]">{moTaDongBo(k.dong_bo)}</div>
          </div>
        </div>
      </td>
      {hienNenTang && (
        <td className="px-3 py-3.5 text-left border-b border-slate-100 dark:border-slate-800">
          <TheNenTang platform={k.platform} />
        </td>
      )}
      <td className={o}>{soDay(k.posts)}</td>
      <td className={`${o} relative min-w-[130px]`}>
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 h-6 rounded-md opacity-[0.13]"
          style={{ width: `${tyLe(k.views, lonNhat)}%`, background: mauNenTang(k.platform) }}
        />
        <span className="relative z-10 font-medium" title={soDay(k.views)}>
          {soGon(k.views)}
        </span>
      </td>
      <td className={o} title={soDay(k.likes)}>
        {soGon(k.likes)}
      </td>
      <td className={o} title={soDay(k.comments)}>
        {soGon(k.comments)}
      </td>
      <td className={o} title={soDay(k.tb)}>
        {soGon(k.tb)}
      </td>
      <td className={o}>{phanTram(k.er)}</td>
      <td className={o} title={soDay(k.followers)}>
        {soGon(k.followers)}
      </td>
    </tr>
  );
}
