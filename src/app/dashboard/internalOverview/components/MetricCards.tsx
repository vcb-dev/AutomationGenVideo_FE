'use client';

import type { PlatformStats } from '@/services/scraperService';
import { METRICS, MetricCode, Summary, lacksViewData } from './calculations';
import {
  Dot,
  PercentDelta,
  Legend,
  computeDelta,
  platformColor,
  percent,
  fullNumber,
  compactNumber,
  platformName,
  ratio,
} from './shared';

/**
 * Hàng thẻ chỉ số. Bấm vào thẻ nào thì biểu đồ lớn bên dưới vẽ theo chỉ số đó.
 *
 * Khi có từ 2 nền tảng trở lên, mỗi thẻ kèm thanh và danh sách tách theo nền tảng như bản
 * thiết kế. Khi chỉ có một nền tảng — đúng tình trạng dữ liệu hiện nay: chỉ Facebook có kênh
 * nội bộ — phần tách đó chỉ là một vệt đặc vô nghĩa, nên thay bằng đường xu hướng thu nhỏ
 * của chính chỉ số đó, vẫn là số thật và nói được nhiều hơn.
 */
export default function MetricCards({
  total,
  platform,
  selected,
  onSelect,
}: {
  total: Summary;
  platform: PlatformStats[];
  selected: MetricCode;
  onSelect: (ma: MetricCode) => void;
}) {
  const tachTheoNenTang = platform.length > 1;

  return (
    <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(232px,1fr))' }}>
      {METRICS.map((cs) => {
        const value = total[cs.ma];
        const delta = computeDelta(value, total.truoc[cs.ma]);
        const chon = cs.ma === selected;

        return (
          <button
            key={cs.ma}
            aria-pressed={chon}
            onClick={() => onSelect(cs.ma)}
            className={[
              'text-left bg-card border rounded-2xl px-[18px] pt-[18px] pb-4 transition-all duration-200',
              chon
                ? 'border-primary shadow-md ring-[3px] ring-primary/25'
                : 'border-border shadow-sm hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md hover:-translate-y-px',
            ].join(' ')}
          >
            <div className="flex items-center text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
              {cs.nhan}
              <Legend tooltip={`Tổng ${cs.nhan.toLowerCase()} của các video đăng trong kỳ`} />
            </div>

            <div
              className="text-[30px] font-semibold tracking-tighter my-1.5 tabular-nums leading-none text-foreground"
              title={fullNumber(value)}
            >
              {compactNumber(value)}
            </div>

            <div className="text-xs flex items-center gap-1.5">
              <PercentDelta delta={delta} hau_to="so với kỳ trước" />
            </div>

            {tachTheoNenTang ? (
              <>
                <div className="flex h-[5px] rounded-full overflow-hidden mt-4 bg-slate-100 dark:bg-slate-800 gap-0.5">
                  {platform
                    .filter((nt) => nt[cs.ma] > 0)
                    .map((nt) => (
                      <i
                        key={nt.platform}
                        className="block rounded-full transition-[width] duration-500"
                        style={{ width: `${ratio(nt[cs.ma], value)}%`, background: platformColor(nt.platform) }}
                        title={`${platformName(nt.platform)}: ${fullNumber(nt[cs.ma])}`}
                      />
                    ))}
                </div>
                <div className="mt-3 grid gap-2">
                  {platform.map((nt) => {
                    // Nền tảng chưa lấy được lượt xem thì hiện gạch ngang, không hiện "0".
                    const thieuSo = cs.ma === 'views' && lacksViewData(nt);
                    return (
                      <div
                        key={nt.platform}
                        className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
                      >
                        <Dot mau={platformColor(nt.platform)} />
                        {platformName(nt.platform)}
                        {thieuSo ? (
                          <em
                            className="not-italic ml-auto text-slate-400 dark:text-slate-500"
                            title="Chưa lấy được lượt xem của nền tảng này — không phải bằng 0"
                          >
                            chưa có số
                          </em>
                        ) : (
                          <>
                            <b className="ml-auto text-foreground font-semibold tabular-nums" title={fullNumber(nt[cs.ma])}>
                              {compactNumber(nt[cs.ma])}
                            </b>
                            <em className="not-italic w-11 text-right text-slate-400 dark:text-slate-500 tabular-nums">
                              {percent(ratio(nt[cs.ma], value))}
                            </em>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <DuongXuHuong
                gia_tri={total.theo_ngay.map((d) => d[cs.ma])}
                mau={chon ? 'hsl(var(--primary))' : platformColor(platform[0]?.platform ?? '')}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Đường xu hướng thu nhỏ, không trục không nhãn — chỉ để thấy hình dạng của kỳ. */
function DuongXuHuong({ gia_tri, mau }: { gia_tri: number[]; mau: string }) {
  if (gia_tri.length < 2) return <div className="mt-4 h-[34px]" />;

  const dinh = Math.max(...gia_tri, 1);
  const W = 100;
  const H = 30;
  const diem = gia_tri.map((v, i) => {
    const x = (i / (gia_tri.length - 1)) * W;
    const y = H - (v / dinh) * (H - 3) - 1.5;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-4 w-full h-[34px] overflow-visible">
      <polyline
        points={`0,${H} ${diem.join(' ')} ${W},${H}`}
        fill={mau}
        opacity="0.10"
        stroke="none"
      />
      <polyline
        points={diem.join(' ')}
        fill="none"
        stroke={mau}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
