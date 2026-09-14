'use client';

import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Eye, Users, VideoCamera } from '@phosphor-icons/react';

import type { PlatformStats } from '@/services/scraperService';
import {
  METRICS,
  MetricCode,
  Summary,
  averageViewsPerPost,
  lacksViewData,
  platformsWithoutViews,
} from './calculations';
import {
  PercentDelta,
  Legend,
  Dot,
  computeDelta,
  platformColor,
  fullDate,
  shortDate,
  fullNumber,
  compactNumber,
  platformName,
  Card,
} from './shared';

/**
 * Biểu đồ chính: một điểm mỗi ngày cho chỉ số đang chọn ở hàng thẻ phía trên.
 *
 * Bật "Tách theo nền tảng" thì mỗi nền tảng một đường; tắt thì gộp thành một đường có nền
 * chuyển sắc. Chỉ có một nền tảng thì công tắc bị ẩn — tách hay không cũng ra đúng một đường.
 */
export default function TrendChart({
  total,
  platform,
  metric,
  tach,
  onDoiTach,
  dayCount,
}: {
  total: Summary;
  platform: PlatformStats[];
  metric: MetricCode;
  tach: boolean;
  onDoiTach: (v: boolean) => void;
  dayCount: number;
}) {
  const metricLabel = METRICS.find((c) => c.ma === metric)!.nhan;

  // Nền tảng chưa lấy được lượt xem thì KHÔNG vẽ khi đang xem chỉ số lượt xem: một đường
  // phẳng dính đáy mang tên "Instagram" đọc thành "kênh không ai xem", trong khi sự thật là
  // chưa có số. Các chỉ số khác (thích/bình luận/chia sẻ) vẫn có thật nên vẫn vẽ bình thường.
  const thieuLuotXem = metric === 'views' ? platformsWithoutViews(platform) : [];
  // useMemo để giữ nguyên tham chiếu — mảng dựng lại mỗi lần render sẽ làm useMemo bên dưới
  // tính lại vô ích ở mọi lượt vẽ.
  const platformVe = useMemo(
    () => (metric === 'views' ? platform.filter((nt) => !lacksViewData(nt)) : platform),
    [platform, metric],
  );

  const hasMultiplePlatforms = platformVe.length > 1;
  const tachThat = tach && hasMultiplePlatforms;

  // Tra theo NGÀY chứ không theo vị trí trong mảng: hiện BE trả các nền tảng cùng một dải
  // ngày nên hai cách cho kết quả như nhau, nhưng chỉ cần một nền tảng thiếu vài ngày là cách
  // tra theo vị trí sẽ gán nhầm số của ngày này sang ngày khác mà biểu đồ vẫn vẽ trơn tru.
  const data = useMemo(() => {
    const bang = new Map(
      platformVe.map((nt) => [nt.platform, new Map(nt.theo_ngay.map((d) => [d.ngay, d[metric]]))]),
    );
    return total.theo_ngay.map((d) => {
      const tong = platformVe.reduce((s, nt) => s + (bang.get(nt.platform)?.get(d.ngay) ?? 0), 0);
      const dong: Record<string, number | string> = { ngay: d.ngay || d.date || '', total: tong };
      for (const nt of platformVe) dong[nt.platform] = bang.get(nt.platform)?.get(d.ngay) ?? 0;
      return dong;
    });
  }, [total.theo_ngay, platformVe, metric]);

  const duong = tachThat
    ? platformVe.map((nt) => ({ khoa: nt.platform, mau: platformColor(nt.platform), ten: platformName(nt.platform) }))
    : [
        {
          khoa: 'total',
          mau: hasMultiplePlatforms ? '#5b5bd6' : platformColor(platformVe[0]?.platform ?? ''),
          ten: hasMultiplePlatforms ? `Tổng ${platformVe.length} nền tảng` : platformName(platformVe[0]?.platform ?? ''),
        },
      ];

  const delta = computeDelta(total[metric], total.truoc[metric]);
  const average = averageViewsPerPost(platform);

  // Cách 5-6 ngày mới in một nhãn trục ngang — 90 ngày mà in hết thì nhãn chồng lên nhau.
  const buocNhan = Math.max(0, Math.ceil(data.length / 6) - 1);

  return (
    <Card highlighted className="mb-5">
      <div className="flex items-baseline gap-3 flex-wrap mb-1">
        <span
          className="text-[32px] font-semibold tracking-tighter tabular-nums leading-none text-foreground"
          title={fullNumber(total[metric])}
        >
          {compactNumber(total[metric])}
        </span>
        <span className="text-[14.5px] font-medium text-slate-500 dark:text-slate-400">{metricLabel}</span>
        <Legend tooltip="Tổng của toàn bộ video đăng trong kỳ đang chọn" />
      </div>
      <div className="text-[12.5px] text-slate-400 dark:text-slate-500">
        <PercentDelta delta={delta} /> so với {dayCount} ngày trước đó ·{' '}
        {hasMultiplePlatforms ? `gộp ${platformVe.length} nền tảng` : platformName(platformVe[0]?.platform ?? '')}
      </div>

      {thieuLuotXem.length > 0 && (
        <div className="mt-2 text-[12.5px] text-amber-600 dark:text-amber-400">
          Chưa lấy được lượt xem của {thieuLuotXem.map(platformName).join(', ')} — đã để riêng
          khỏi biểu đồ và khỏi phép tính trung bình, không phải các kênh đó không có người xem.
        </div>
      )}

      <div className="mt-3 h-[272px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="nenBieuDo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={duong[0].mau} stopOpacity={0.18} />
                <stop offset="60%" stopColor={duong[0].mau} stopOpacity={0.05} />
                <stop offset="100%" stopColor={duong[0].mau} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
            <XAxis
              dataKey="ngay"
              tickFormatter={shortDate}
              interval={buocNhan}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-400"
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tickFormatter={compactNumber}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-400"
              axisLine={false}
              tickLine={false}
              width={54}
            />
            <Tooltip
              content={<GoiY duong={duong} tach={tachThat} />}
              cursor={{ stroke: 'currentColor', strokeWidth: 1, className: 'text-slate-300 dark:text-slate-600' }}
            />
            {!tachThat && (
              <Area
                type="monotone"
                dataKey="total"
                stroke="none"
                fill="url(#nenBieuDo)"
                isAnimationActive={false}
              />
            )}
            {duong.map((d) => (
              <Line
                key={d.khoa}
                type="monotone"
                dataKey={d.khoa}
                stroke={d.mau}
                strokeWidth={2.2}
                dot={false}
                activeDot={{ r: 4.5, strokeWidth: 2.5, stroke: 'hsl(var(--card))' }}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-5 flex-wrap mt-3.5 text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
        {duong.map((d) => (
          <span key={d.khoa} className="inline-flex items-center gap-2">
            <i className="w-3.5 h-[3px] rounded-full" style={{ background: d.mau }} />
            {d.ten}
          </span>
        ))}
      </div>

      {hasMultiplePlatforms && (
        <div className="flex items-center gap-3 justify-end mt-3.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          <span>Tách theo nền tảng</span>
          <button
            role="switch"
            aria-checked={tach}
            aria-label="Tách đường theo nền tảng"
            onClick={() => onDoiTach(!tach)}
            className={`relative w-10 h-[23px] rounded-full shrink-0 transition-colors ${
              tach ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-[2.5px] left-[2.5px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
                tach ? 'translate-x-[17px]' : ''
              }`}
            />
          </button>
        </div>
      )}

      <div className="grid gap-px mt-6 bg-border rounded-xl overflow-hidden" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        <ODem
          icon={<Users size={17} />}
          so={fullNumber(total.followers)}
          nhan="Tổng người theo dõi"
          hint="Cộng người theo dõi của tất cả kênh nội bộ tại lần đồng bộ gần nhất"
        />
        <ODem
          icon={<Eye size={17} />}
          so={fullNumber(average)}
          nhan="Lượt xem trung bình / bài"
          hint="Tổng lượt xem chia cho số bài đăng trong kỳ"
        />
        <ODem
          icon={<VideoCamera size={17} />}
          so={`${fullNumber(total.so_kenh)} / ${fullNumber(total.tong_kenh)}`}
          nhan="Kênh có đăng bài trong kỳ"
          hint="Số kênh nội bộ có ít nhất một bài trong kỳ, trên tổng số kênh đang quản lý"
        />
      </div>
    </Card>
  );
}

function ODem({
  icon,
  so,
  nhan,
  hint,
}: {
  icon: React.ReactNode;
  so: string;
  nhan: string;
  hint: string;
}) {
  return (
    <div className="bg-card px-[18px] py-4">
      <div className="text-slate-400 dark:text-slate-500 mb-2.5 flex">{icon}</div>
      <div className="text-xl font-semibold tracking-tight tabular-nums text-foreground">{so}</div>
      <div className="text-slate-500 dark:text-slate-400 text-[12.5px] mt-0.5 flex items-center">
        {nhan}
        <Legend tooltip={hint} />
      </div>
    </div>
  );
}

function GoiY({
  active,
  payload,
  label,
  duong,
  tach,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
  duong: { khoa: string; mau: string; ten: string }[];
  tach: boolean;
}) {
  if (!active || !payload?.length || !label) return null;

  // Vùng nền chuyển sắc cũng là một chuỗi của recharts nên nó lọt vào payload và bị đếm hai
  // lần; chỉ lấy đúng những chuỗi đang vẽ thành đường.
  const dong = duong
    .map((d) => ({ ...d, gia_tri: payload.find((p) => p.dataKey === d.khoa)?.value }))
    .filter((d) => d.gia_tri !== undefined);
  const tongNgay = dong.reduce((s, d) => s + (d.gia_tri || 0), 0);

  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed">
      <div className="text-slate-400 dark:text-slate-500 text-[11.5px] mb-0.5">{fullDate(label)}</div>
      {dong.map((d) => (
        <div key={d.khoa} className="flex items-center gap-2 whitespace-nowrap">
          <Dot mau={d.mau} />
          <span className="text-slate-500 dark:text-slate-400">{d.ten}:</span>
          <span className="text-foreground tabular-nums">{fullNumber(d.gia_tri || 0)}</span>
        </div>
      ))}
      {tach && dong.length > 1 && (
        <div className="text-slate-400 dark:text-slate-500 mt-1 pt-1 border-t border-border">
          Tổng: <span className="tabular-nums">{fullNumber(tongNgay)}</span>
        </div>
      )}
    </div>
  );
}
