'use client';

import type { ThiTruongNenTang, PlatformStats, TuyenNoiDung } from '@/services/scraperService';
import {
  Dot,
  BreakdownFooter,
  BreakdownRow,
  TotalRow,
  COLOR_PRIMARY,
  COLOR_SECONDARY,
  COLOR_ENGAGEMENT,
  Subtitle,
  PlatformCard,
  The,
  SplitBar,
  CardTitle,
  EmptyState,
  platformColor,
  percent,
  fullNumber,
  compactNumber,
  platformName,
  ratio,
} from './shared';

/**
 * Ba khối bóc tách của bản thiết kế gốc đều dựa vào số liệu insight nội bộ của nền tảng
 * (tỷ lệ người theo dõi / chưa theo dõi, loại nội dung, nguồn hiển thị). VCBI cào dữ liệu
 * công khai từ bên ngoài nên KHÔNG có mấy con số đó — dựng khung rỗng chờ API thì mãi mãi
 * rỗng. Ba khối dưới đây giữ nguyên bố cục nhưng thay bằng thứ tính được từ dữ liệu thật:
 *
 *   - Thị trường VN / Global  — đoán theo dấu tiếng Việt trong caption, cùng quy tắc với bộ
 *     lọc thị trường sẵn có ở trang danh sách video (content-filters.ts bên BE).
 *   - Tuyến nội dung A1–A5    — đội nội dung vốn đã gắn thẳng #A1…#A5 vào caption.
 *   - Cơ cấu tương tác        — thích / bình luận / chia sẻ, số cào về được thật.
 */

// ─── 1. Thị trường ───────────────────────────────────────────────────────────

export function MarketBlock({ thiTruong }: { thiTruong: ThiTruongNenTang[] }) {
  const vn = thiTruong.reduce((s, t) => s + t.vn, 0);
  const global = thiTruong.reduce((s, t) => s + t.global, 0);
  const total = vn + global;

  return (
    <The className="!mb-0 flex flex-col">
      <CardTitle chuThich="Đoán theo dấu tiếng Việt trong caption — caption tiếng Việt không dấu sẽ bị xếp sang Global">
        Thị trường nội dung
      </CardTitle>
      <Subtitle>Theo lượt xem trong kỳ</Subtitle>

      {total === 0 ? (
        <EmptyState tieu_de="Chưa có video nào" mo_ta="Chưa có bài đăng nào trong kỳ đang chọn." />
      ) : (
        <>
          <div className="flex flex-col items-center pt-2.5">
            <Donut phanChinh={ratio(vn, total)} />
            <div className="flex gap-3.5 mt-5 flex-wrap w-full">
              <ODonut mau={COLOR_PRIMARY} nhan="Việt Nam" value={percent(ratio(vn, total))} />
              <ODonut mau={COLOR_SECONDARY} nhan="Global" value={percent(ratio(global, total))} />
            </div>
          </div>

          <div className="w-full mt-5 border-t border-slate-100 dark:border-slate-800 pt-1">
            {thiTruong.map((t, i) => {
              const tongP = t.vn + t.global;
              return (
                <BreakdownRow
                  key={t.platform}
                  vien={i < thiTruong.length - 1}
                  nhan={
                    <>
                      <Dot mau={platformColor(t.platform)} />
                      {platformName(t.platform)}
                    </>
                  }
                  gia_tri={<span title={fullNumber(tongP)}>{compactNumber(tongP)}</span>}
                  segments={[
                    { gia_tri: t.vn, mau: COLOR_PRIMARY, ten: `Việt Nam: ${fullNumber(t.vn)}` },
                    { gia_tri: t.global, mau: COLOR_SECONDARY, ten: `Global: ${fullNumber(t.global)}` },
                  ]}
                  chu_giai={[
                    { mau: COLOR_PRIMARY, nhan: 'Việt Nam', gia_tri: `${compactNumber(t.vn)} · ${percent(ratio(t.vn, tongP))}` },
                    { mau: COLOR_SECONDARY, nhan: 'Global', gia_tri: `${compactNumber(t.global)} · ${percent(ratio(t.global, tongP))}` },
                  ]}
                  ty_le_cuoi={{
                    nhan: 'Số bài',
                    gia_tri: `${fullNumber(t.posts_vn)} VN · ${fullNumber(t.posts_global)} Global`,
                  }}
                />
              );
            })}
          </div>

          <BreakdownFooter>
            <TotalRow nhan="Tổng lượt xem trong kỳ" gia_tri={compactNumber(total)} />
            <SplitBar
              className="mt-3"
              segments={[
                { gia_tri: vn, mau: COLOR_PRIMARY },
                { gia_tri: global, mau: COLOR_SECONDARY },
              ]}
            />
            <div className="flex items-center gap-2 mt-2.5 text-[11.5px] text-slate-400 dark:text-slate-500">
              Lượt xem đến từ nội dung tiếng Việt
              <b className="ml-auto text-foreground font-semibold tabular-nums text-[12.5px]">
                {percent(ratio(vn, total))}
              </b>
            </div>
          </BreakdownFooter>
        </>
      )}
    </The>
  );
}

/** Vành khuyên hai đoạn, đầu bo tròn và chừa khe hở — dựng thẳng bằng SVG như bản thiết kế. */
function Donut({ phanChinh }: { phanChinh: number }) {
  const R = 68;
  const C = 2 * Math.PI * R;
  const khe = 7;
  const doanChinh = Math.max(0, (C * phanChinh) / 100 - khe);
  const doanPhu = Math.max(0, (C * (100 - phanChinh)) / 100 - khe);

  return (
    <svg width="164" height="164" viewBox="0 0 184 184">
      <g transform="translate(92,92) rotate(-90)">
        <circle r={R} fill="none" strokeWidth="17" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
        <circle
          r={R}
          fill="none"
          stroke={COLOR_SECONDARY}
          strokeWidth="17"
          strokeLinecap="round"
          strokeDasharray={`${doanPhu} ${C - doanPhu}`}
          strokeDashoffset={-((C * phanChinh) / 100) - khe / 2}
        />
        <circle
          r={R}
          fill="none"
          stroke={COLOR_PRIMARY}
          strokeWidth="17"
          strokeLinecap="round"
          strokeDasharray={`${doanChinh} ${C - doanChinh}`}
          strokeDashoffset={-khe / 2}
        />
      </g>
      <text
        x="92"
        y="88"
        textAnchor="middle"
        fill="currentColor"
        className="text-foreground"
        style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-.04em' }}
      >
        {percent(phanChinh)}
      </text>
      <text x="92" y="108" textAnchor="middle" fill="currentColor" className="text-slate-400" style={{ fontSize: 11.5 }}>
        tiếng Việt
      </text>
    </svg>
  );
}

function ODonut({ mau, nhan, value }: { mau: string; nhan: string; value: string }) {
  return (
    <div className="flex-1 min-w-[104px] px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
      <b className="block text-lg font-semibold text-foreground mb-0.5 tabular-nums tracking-tight">{value}</b>
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Dot mau={mau} />
        {nhan}
      </span>
    </div>
  );
}

// ─── 2. Tuyến nội dung ───────────────────────────────────────────────────────

export function ContentLineBlock({ tuyen }: { tuyen: TuyenNoiDung[] }) {
  const tongViews = tuyen.reduce((s, t) => s + t.views, 0);
  const tongBai = tuyen.reduce((s, t) => s + t.posts, 0);
  const tongVN = tuyen.reduce((s, t) => s + t.views_vn, 0);

  return (
    <The className="!mb-0 flex flex-col">
      <CardTitle chuThich="Bắt theo hashtag #A1…#A5 sẵn có trong caption. Một video gắn nhiều tuyến sẽ được tính cho từng tuyến">
        Tuyến nội dung
      </CardTitle>
      <Subtitle>Tỷ trọng lượt xem theo tuyến A1–A5</Subtitle>

      <div className="flex gap-4 flex-wrap my-3.5 text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Dot mau={COLOR_PRIMARY} />
          Việt Nam
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot mau={COLOR_SECONDARY} />
          Global
        </span>
      </div>

      {tuyen.length === 0 ? (
        <EmptyState
          tieu_de="Chưa gắn tuyến nội dung"
          mo_ta="Không có video nào trong kỳ mang hashtag #A1 đến #A5."
        />
      ) : (
        <>
          <div>
            {tuyen.map((t, i) => (
              <BreakdownRow
                key={t.ma}
                vien={i < tuyen.length - 1}
                // Năm tuyến nằm cạnh nhau nên thanh phải so được với nhau: quy đổi theo tuyến
                // lớn nhất. Thiếu mốc này thì mọi thanh đều đầy khung và A3 (2,6% lượt xem)
                // trông ngang A4 (36,9%) — đã đo được đúng như vậy trên trang thật.
                baseline={Math.max(...tuyen.map((x) => x.views))}
                nhan={<span className="font-semibold">{t.ma}</span>}
                gia_tri={percent(ratio(t.views, tongViews))}
                segments={[
                  { gia_tri: t.views_vn, mau: COLOR_PRIMARY, ten: `Việt Nam: ${fullNumber(t.views_vn)}` },
                  { gia_tri: t.views_global, mau: COLOR_SECONDARY, ten: `Global: ${fullNumber(t.views_global)}` },
                ]}
                chu_giai={[
                  { mau: COLOR_PRIMARY, nhan: 'VN', gia_tri: compactNumber(t.views_vn) },
                  { mau: COLOR_SECONDARY, nhan: 'Global', gia_tri: compactNumber(t.views_global) },
                ]}
                ty_le_cuoi={{
                  nhan: `${fullNumber(t.posts)} bài · trung bình ${compactNumber(t.posts ? t.views / t.posts : 0)} lượt xem/bài`,
                  gia_tri: compactNumber(t.views),
                }}
              />
            ))}
          </div>

          <BreakdownFooter>
            <TotalRow nhan={`Tổng ${tuyen.length} tuyến · ${fullNumber(tongBai)} bài`} gia_tri={`${compactNumber(tongViews)} lượt xem`} />
            <SplitBar
              className="mt-3"
              segments={tuyen.map((t, i) => ({
                gia_tri: t.views,
                mau: i % 2 === 0 ? COLOR_PRIMARY : COLOR_SECONDARY,
                ten: `${t.ma}: ${fullNumber(t.views)}`,
              }))}
            />
            <div className="flex items-center gap-2 mt-2.5 text-[11.5px] text-slate-400 dark:text-slate-500">
              Lượt xem của tuyến đến từ nội dung tiếng Việt
              <b className="ml-auto text-foreground font-semibold tabular-nums text-[12.5px]">
                {percent(ratio(tongVN, tongViews))}
              </b>
            </div>
          </BreakdownFooter>
        </>
      )}
    </The>
  );
}

// ─── 3. Cơ cấu tương tác ─────────────────────────────────────────────────────

export function EngagementBlock({ platform }: { platform: PlatformStats[] }) {
  const phan = [
    { khoa: 'likes' as const, nhan: 'Lượt thích', mau: COLOR_ENGAGEMENT[0] },
    { khoa: 'comments' as const, nhan: 'Bình luận', mau: COLOR_ENGAGEMENT[1] },
    { khoa: 'shares' as const, nhan: 'Chia sẻ', mau: COLOR_ENGAGEMENT[2] },
  ];

  const tongTheoPhan = phan.map((p) => platform.reduce((s, nt) => s + nt[p.khoa], 0));
  const tongTuongTac = tongTheoPhan.reduce((s, v) => s + v, 0);
  const tongViews = platform.reduce((s, nt) => s + nt.views, 0);

  return (
    <The className="!mb-0 flex flex-col">
      <CardTitle chuThich="Tỷ trọng thích / bình luận / chia sẻ trong tổng tương tác của các video đăng trong kỳ">
        Cơ cấu tương tác
      </CardTitle>
      <Subtitle>Trong kỳ đang chọn</Subtitle>

      <div className="flex gap-4 flex-wrap my-3.5 text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
        {phan.map((p) => (
          <span key={p.khoa} className="inline-flex items-center gap-1.5">
            <Dot mau={p.mau} />
            {p.nhan}
          </span>
        ))}
      </div>

      {tongTuongTac === 0 ? (
        <EmptyState tieu_de="Chưa có tương tác" mo_ta="Chưa cào được lượt thích, bình luận hay chia sẻ nào trong kỳ." />
      ) : (
        <>
          <div>
            {platform.map((nt, i) => {
              const tuongTac = nt.likes + nt.comments + nt.shares;
              return (
                <BreakdownRow
                  key={nt.platform}
                  vien={i < platform.length - 1}
                  nhan={
                    <>
                      <Dot mau={platformColor(nt.platform)} />
                      {platformName(nt.platform)}
                    </>
                  }
                  gia_tri={<span title={fullNumber(tuongTac)}>{compactNumber(tuongTac)} tương tác</span>}
                  segments={phan.map((p) => ({
                    gia_tri: nt[p.khoa],
                    mau: p.mau,
                    ten: `${p.nhan}: ${fullNumber(nt[p.khoa])}`,
                  }))}
                  chu_giai={phan.map((p) => ({
                    mau: p.mau,
                    nhan: p.nhan,
                    gia_tri: `${compactNumber(nt[p.khoa])} · ${percent(ratio(nt[p.khoa], tuongTac))}`,
                  }))}
                  ty_le_cuoi={{
                    nhan: 'Tương tác trên lượt xem',
                    gia_tri: percent(ratio(tuongTac, nt.views)),
                  }}
                />
              );
            })}
          </div>

          <BreakdownFooter>
            <TotalRow
              nhan={platform.length > 1 ? `Tổng ${platform.length} nền tảng` : platformName(platform[0]?.platform ?? '')}
              gia_tri={`${compactNumber(tongTuongTac)} tương tác`}
            />
            <SplitBar
              className="mt-3"
              segments={phan.map((p, i) => ({ gia_tri: tongTheoPhan[i], mau: p.mau, ten: p.nhan }))}
            />
            <div className="flex gap-3.5 flex-wrap mt-2.5 text-[11.5px] text-slate-400 dark:text-slate-500">
              {phan.map((p, i) => (
                <span key={p.khoa} className="inline-flex items-center gap-1.5">
                  <Dot mau={p.mau} size={7} />
                  {p.nhan}
                  <em className="not-italic text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                    {compactNumber(tongTheoPhan[i])}
                  </em>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-dashed border-slate-100 dark:border-slate-800 text-[11.5px] text-slate-400 dark:text-slate-500">
              Tương tác trên lượt xem
              <b className="ml-auto text-foreground font-semibold tabular-nums text-[12.5px]">
                {percent(ratio(tongTuongTac, tongViews))}
              </b>
            </div>
          </BreakdownFooter>
        </>
      )}
    </The>
  );
}

/** Dùng lại ở khối hashtag để giữ đúng một kiểu thanh ngang. */
export function HorizontalBar({
  nhan,
  phanTramGiaTri,
  phanTramLon,
  mau,
  ben_phai,
  phu,
}: {
  nhan: string;
  phanTramGiaTri: number;
  phanTramLon: number;
  mau: string;
  ben_phai: string;
  phu?: string;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="text-[13px] mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
        {nhan}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden min-w-[2px]">
          <i
            className="block h-full rounded-full transition-[width] duration-500"
            style={{ width: `${ratio(phanTramGiaTri, phanTramLon)}%`, background: mau }}
          />
        </div>
        <div className="w-[124px] text-right text-[13px] font-semibold tabular-nums shrink-0 text-foreground">
          {ben_phai}
          {phu && <small className="text-slate-400 dark:text-slate-500 text-[11.5px] ml-1.5 font-normal">{phu}</small>}
        </div>
      </div>
    </div>
  );
}
