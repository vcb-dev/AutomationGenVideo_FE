'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelStats } from '@/services/scraperService';
import {
  ChannelAvatar,
  TabGroup,
  Subtitle,
  Card,
  PlatformCard,
  CardTitle,
  EmptyState,
  platformColor,
  syncDescription,
  percent,
  fullNumber,
  compactNumber,
  platformName,
  ratio,
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

interface ChannelRow extends ChannelStats {
  tb: number;
  er: number;
  /** Nền tảng chưa lấy được lượt xem — xem prop thieuLuotXem. */
  thieuSo: boolean;
}

/**
 * Bảng xếp hạng kênh nội bộ. Chỉ liệt kê kênh CÓ đăng bài trong kỳ; kênh im lặng nằm ở khối
 * "Cần chú ý" chứ không lẫn vào đây với một hàng toàn số 0.
 *
 * Bấm một dòng thì mở thẳng danh sách video của kênh đó ở trang Kênh nội bộ — cùng bộ lọc
 * `channel` mà trang ấy đang dùng, nên không cần thêm gì ở phía kia.
 */
export default function ChannelRanking({
  kenh,
  thieuLuotXem = [],
}: {
  kenh: ChannelStats[];
  /** Nền tảng chưa lấy được lượt xem — cột lượt xem của kênh thuộc nhóm này hiện gạch ngang. */
  thieuLuotXem?: string[];
}) {
  const router = useRouter();
  const [cot, setCot] = useState<Cot>('views');
  const [giam, setGiam] = useState(true);
  const [nhom, setNhom] = useState<'0' | '1'>('0');

  const hasMultiplePlatforms = new Set(kenh.map((k) => k.platform)).size > 1;

  const dong: ChannelRow[] = useMemo(
    () =>
      kenh.map((k) => ({
        ...k,
        tb: k.posts > 0 ? Math.round(k.views / k.posts) : 0,
        er: ratio(k.likes + k.comments + k.shares, k.views),
        thieuSo: thieuLuotXem.includes(k.platform),
      })),
    [kenh, thieuLuotXem],
  );

  const sorted = useMemo(
    () => [...dong].sort((a, b) => (a[cot] - b[cot]) * (giam ? -1 : 1)),
    [dong, cot, giam],
  );

  const maxValue = Math.max(...dong.filter((d) => !d.thieuSo).map((d) => d.views), 1);

  const doiCot = (ma: Cot) => {
    if (ma === cot) setGiam((v) => !v);
    else {
      setCot(ma);
      setGiam(true);
    }
  };

  const moKenh = (k: ChannelRow) =>
    router.push(`/dashboard/internalChannels/all?channel=${encodeURIComponent(k.id)}`);

  const groupByPlatform = nhom === '1' && hasMultiplePlatforms;
  const platforms = [...new Set(sorted.map((k) => k.platform))];

  return (
    <Card className="!mb-5">
      <CardTitle hint="Bấm tiêu đề cột để đổi cách sắp xếp">Xếp hạng kênh</CardTitle>
      <Subtitle>Bấm một dòng để xem toàn bộ video của kênh</Subtitle>

      {hasMultiplePlatforms && (
        <TabGroup<'0' | '1'>
          className="my-3.5"
          dang_chon={nhom}
          onSelect={setNhom}
          cac_tab={[
            { ma: '0', nhan: 'Xếp chung' },
            { ma: '1', nhan: 'Nhóm theo nền tảng' },
          ]}
        />
      )}

      {kenh.length === 0 ? (
        <div className="mt-4">
          <EmptyState
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
                {hasMultiplePlatforms && (
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
              {groupByPlatform
                ? platforms.map((p) => {
                    const cua = sorted.filter((k) => k.platform === p);
                    return (
                      <Fragment key={p}>
                        <tr>
                          <td
                            colSpan={COT.length + 2}
                            className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 px-3.5 py-2.5 rounded-lg"
                          >
                            <PlatformCard platform={p} />
                            <span className="ml-2">
                              {cua.length} kênh · {fullNumber(cua.reduce((s, k) => s + k.posts, 0))} bài ·{' '}
                              {thieuLuotXem.includes(p)
                                ? 'chưa có số lượt xem'
                                : `${compactNumber(cua.reduce((s, k) => s + k.views, 0))} lượt xem`}
                            </span>
                          </td>
                        </tr>
                        {cua.map((k) => (
                          <Row
                            key={`${k.platform}-${k.id}`}
                            k={k}
                            maxValue={maxValue}
                            hienNenTang={hasMultiplePlatforms}
                            onMo={() => moKenh(k)}
                          />
                        ))}
                      </Fragment>
                    );
                  })
                : sorted.map((k) => (
                    <Row
                      key={`${k.platform}-${k.id}`}
                      k={k}
                      maxValue={maxValue}
                      hienNenTang={hasMultiplePlatforms}
                      onMo={() => moKenh(k)}
                    />
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Gạch ngang thay cho số 0 — nói rõ là chưa lấy được, không phải bằng không. */
function ChuaCoSo() {
  return (
    <span
      className="text-slate-400 dark:text-slate-500"
      title="Chưa lấy được lượt xem của nền tảng này — không phải bằng 0"
    >
      —
    </span>
  );
}

function Row({
  k,
  maxValue,
  hienNenTang,
  onMo,
}: {
  k: ChannelRow;
  maxValue: number;
  hienNenTang: boolean;
  onMo: () => void;
}) {
  const o = 'px-3 py-3.5 text-right text-[13px] border-b border-slate-100 dark:border-slate-800';
  return (
    <tr onClick={onMo} className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <td className="pl-1.5 pr-3 py-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <ChannelAvatar ten={k.ten} avatar={k.avatar} platform={k.platform} />
          <div className="min-w-0">
            <div className="font-medium text-[13.5px] leading-snug text-foreground truncate max-w-[220px]">
              {k.ten}
            </div>
            <div className="text-slate-400 dark:text-slate-500 text-[11.5px]">{syncDescription(k.dong_bo)}</div>
          </div>
        </div>
      </td>
      {hienNenTang && (
        <td className="px-3 py-3.5 text-left border-b border-slate-100 dark:border-slate-800">
          <PlatformCard platform={k.platform} />
        </td>
      )}
      <td className={o}>{fullNumber(k.posts)}</td>
      <td className={`${o} relative min-w-[130px]`}>
        {k.thieuSo ? (
          <ChuaCoSo />
        ) : (
          <>
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 rounded-md opacity-[0.13]"
              style={{ width: `${ratio(k.views, maxValue)}%`, background: platformColor(k.platform) }}
            />
            <span className="relative z-10 font-medium" title={fullNumber(k.views)}>
              {compactNumber(k.views)}
            </span>
          </>
        )}
      </td>
      <td className={o} title={fullNumber(k.likes)}>
        {compactNumber(k.likes)}
      </td>
      <td className={o} title={fullNumber(k.comments)}>
        {compactNumber(k.comments)}
      </td>
      <td className={o} title={k.thieuSo ? undefined : fullNumber(k.tb)}>
        {k.thieuSo ? <ChuaCoSo /> : compactNumber(k.tb)}
      </td>
      <td className={o}>{k.thieuSo ? <ChuaCoSo /> : percent(k.er)}</td>
      <td className={o} title={fullNumber(k.followers)}>
        {compactNumber(k.followers)}
      </td>
    </tr>
  );
}
