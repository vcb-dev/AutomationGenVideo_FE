'use client';

import { ReactNode } from 'react';
import { platformStyle } from '@/lib/platform-config';

/**
 * Mảnh dùng chung cho trang Tổng quan kênh nội bộ.
 *
 * Bản thiết kế gốc (dashboard-v13.html) dựng trên một bộ biến CSS riêng. Ở đây quy đổi sang
 * token Tailwind sẵn có của hệ thống (bg-card / border-border / text-foreground…) để trang
 * ăn theo đúng chế độ sáng-tối và bảng màu chung, thay vì kéo thêm một bộ token thứ hai.
 */

// ─── Định dạng số ────────────────────────────────────────────────────────────
// Dấu phẩy thập phân và dấu chấm hàng nghìn theo chuẩn Việt Nam, giống hệt bản thiết kế.

export const fullNumber = (n: number): string => Math.round(n || 0).toLocaleString('vi-VN');

export const compactNumber = (n: number): string => {
  const v = n || 0;
  if (v >= 1e9) return (v / 1e9).toFixed(1).replace('.', ',') + ' tỷ';
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace('.', ',') + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace('.', ',') + 'K';
  return fullNumber(v);
};

export const percent = (v: number): string => (v || 0).toFixed(1).replace('.', ',') + '%';

/** Chia cho 0 xảy ra thật khi nền tảng chưa có video nào — trả 0 thay vì NaN/Infinity. */
export const ratio = (tu: number, mau: number): number => (mau > 0 ? (tu / mau) * 100 : 0);

/** Chênh lệch phần trăm so với kỳ trước. Kỳ trước bằng 0 thì không có gì để so. */
export function computeDelta(nay: number, truoc: number): number | null {
  if (!truoc) return null;
  return Math.round(((nay - truoc) / truoc) * 100);
}

/**
 * BE gom nhóm mọi con số theo NGÀY GIỜ VIỆT NAM, nên nhãn ngày cũng phải đọc theo múi giờ
 * đó chứ không theo đồng hồ máy. `new Date('2026-08-25')` là nửa đêm UTC: máy đặt múi giờ
 * âm sẽ hiện ra 24/8 trong khi BE tính cho ngày 25/8 — lệch đúng một ngày trên cả trục
 * biểu đồ lẫn ngày đăng của video.
 */
const VN_TZ = 'Asia/Ho_Chi_Minh';

/** Ngày theo lịch Việt Nam, dạng 'YYYY-MM-DD'. */
function vietnamDateKey(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: VN_TZ });
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const [, thang, ngay] = vietnamDateKey(d).split('-');
  return `${Number(ngay)} Th${Number(thang)}`;
}

export function fullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', {
    timeZone: VN_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** "06:12 hôm nay" / "3 ngày trước" — dòng phụ dưới tên kênh trong bảng xếp hạng. */
export function syncDescription(iso: string | null): string {
  if (!iso) return 'Chưa đồng bộ';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Chưa đồng bộ';

  const time = d.toLocaleTimeString('vi-VN', { timeZone: VN_TZ, hour: '2-digit', minute: '2-digit' });

  // Đếm theo lịch chứ không theo số giờ trôi qua: đồng bộ lúc 23h hôm qua, sáng nay xem thì
  // hiệu số mới 9 tiếng — cách cũ làm tròn xuống 0 và nói "hôm nay".
  const today = vietnamDateKey(new Date());
  const syncedDate = vietnamDateKey(d);
  if (syncedDate === today) return `Đồng bộ ${time} hôm nay`;

  const dayCount = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${syncedDate}T00:00:00Z`)) / 86_400_000,
  );
  if (dayCount === 1) return `Đồng bộ ${time} hôm qua`;
  if (dayCount < 1) return `Đồng bộ ${time} hôm nay`;
  return `Đồng bộ ${dayCount} ngày trước`;
}

// ─── Màu nền tảng cho biểu đồ ────────────────────────────────────────────────
/**
 * platformStyle() trả về lớp Tailwind, dùng được cho thẻ HTML nhưng KHÔNG dùng được cho
 * recharts và thuộc tính `fill` của SVG — hai chỗ đó cần mã màu thật. Giữ đúng một bảng ở
 * đây cho phần đồ hoạ, phần còn lại vẫn dùng chung platformStyle().
 */
const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#3b82f6',
  tiktok: '#64748b',
  instagram: '#d8478f',
  threads: '#101010',
  youtube: '#ef4444',
};

export const platformColor = (platform: string): string => PLATFORM_COLORS[platform] || '#8b93a7';

export const platformName = (platform: string): string => platformStyle(platform).label;

/** Hai màu dữ liệu trung tính, dùng cho các thanh chia hai phần (VN / Global…). */
export const COLOR_PRIMARY = '#5b5bd6';
export const COLOR_SECONDARY = '#aab1c4';

/** Ba màu cho cơ cấu tương tác — thích / bình luận / chia sẻ. */
export const COLOR_ENGAGEMENT = ['#5b5bd6', '#2f9e8f', '#dd8a3e'];

// ─── Mảnh giao diện ──────────────────────────────────────────────────────────

export function Card({
  children,
  className = '',
  highlighted = false,
  chim = false,
}: {
  children: ReactNode;
  className?: string;
  /** Thẻ hạng 1: bóng đậm hơn, đệm rộng hơn — dành cho biểu đồ chính. */
  highlighted?: boolean;
  /** Thẻ hạng 3: nền chìm, không bóng — dành cho khối phụ. */
  chim?: boolean;
}) {
  const nen = chim ? 'bg-slate-50 dark:bg-slate-900/40' : 'bg-card';
  const bong = highlighted ? 'shadow-md' : chim ? '' : 'shadow-sm';
  return (
    <div className={`${nen} border border-border rounded-2xl ${highlighted ? 'p-6' : 'p-5'} ${bong} ${className}`}>
      {children}
    </div>
  );
}

/** Chấm "i" giải thích cách một con số được tính — bản thiết kế dùng ở mọi tiêu đề. */
export function Legend({ tooltip }: { tooltip: string }) {
  return (
    <span
      title={tooltip}
      className="ml-1.5 inline-grid place-items-center w-[15px] h-[15px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[9.5px] font-semibold cursor-help shrink-0 leading-none"
    >
      i
    </span>
  );
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <h3 className="text-[14.5px] font-semibold text-foreground flex items-center tracking-tight">
      {children}
      {hint && <Legend tooltip={hint} />}
    </h3>
  );
}

export function Subtitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[12.5px] text-slate-400 dark:text-slate-500 mt-1 ${className}`}>{children}</p>;
}

export function Dot({ mau, size = 8 }: { mau: string; size?: number }) {
  return (
    <i
      className="rounded-full shrink-0 inline-block"
      style={{ background: mau, width: size, height: size }}
    />
  );
}

/**
 * Thanh nhiều đoạn. Đoạn 0% bị bỏ hẳn để không đọng lại một vệt bo tròn 2px vô nghĩa.
 *
 * `baseline` quyết định thanh nói lên điều gì:
 *   - Bỏ trống → quy đổi theo tổng của CHÍNH dòng đó, thanh luôn đầy khung. Đúng khi chỉ có
 *     một dòng, hoặc khi người đọc chỉ cần thấy TỶ LỆ trong dòng.
 *   - Truyền vào (thường là giá trị lớn nhất trong nhóm) → thanh giữ được ĐỘ LỚN, so giữa
 *     các dòng mới có nghĩa.
 *
 * Đo được trên trang thật khi thiếu `baseline`: cả 5 tuyến A1–A5 đều ra thanh 409px như nhau,
 * nên tuyến A3 chiếm 2,6% lượt xem trông ngang bằng A4 chiếm 36,9% — đọc lướt là hiểu sai.
 */
export function SplitBar({
  segments,
  cao = 8,
  className = '',
  baseline,
}: {
  segments: { gia_tri: number; mau: string; ten?: string }[];
  cao?: number;
  className?: string;
  baseline?: number;
}) {
  const total = baseline && baseline > 0 ? baseline : segments.reduce((s, d) => s + d.gia_tri, 0);
  return (
    <div
      className={`flex rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 gap-0.5 ${className}`}
      style={{ height: cao }}
    >
      {segments
        .filter((d) => d.gia_tri > 0)
        .map((d, i) => (
          <i
            key={i}
            className="block rounded-full transition-[width] duration-500"
            style={{ width: `${ratio(d.gia_tri, total)}%`, background: d.mau }}
            title={d.ten}
          />
        ))}
    </div>
  );
}

/** Một dòng trong các khối bóc tách: tiêu đề + số + thanh chia + chú giải. */
export function BreakdownRow({
  nhan,
  gia_tri,
  segments,
  chu_giai,
  ty_le_cuoi,
  vien = true,
  baseline,
}: {
  nhan: ReactNode;
  gia_tri: ReactNode;
  segments: { gia_tri: number; mau: string; ten?: string }[];
  chu_giai: { mau: string; nhan: string; gia_tri: string }[];
  ty_le_cuoi?: { nhan: string; gia_tri: string };
  vien?: boolean;
  /** Mốc quy đổi bề rộng dùng chung cho cả nhóm dòng — xem SplitBar. */
  baseline?: number;
}) {
  return (
    <div className={`py-3.5 ${vien ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
      <div className="flex items-center gap-2 text-[13px] font-medium text-foreground min-h-5">
        {nhan}
        <b className="ml-auto font-semibold tabular-nums text-[13px]">{gia_tri}</b>
      </div>
      <SplitBar segments={segments} cao={7} className="my-2.5" baseline={baseline} />
      <div className="flex gap-3.5 flex-wrap text-[11.5px] text-slate-400 dark:text-slate-500">
        {chu_giai.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <Dot mau={c.mau} size={7} />
            {c.nhan}
            <em className="not-italic text-slate-500 dark:text-slate-400 font-medium tabular-nums">
              {c.gia_tri}
            </em>
          </span>
        ))}
      </div>
      {ty_le_cuoi && (
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-dashed border-slate-100 dark:border-slate-800 text-[11.5px] text-slate-400 dark:text-slate-500">
          {ty_le_cuoi.nhan}
          <b className="ml-auto text-foreground font-semibold tabular-nums text-[12.5px]">
            {ty_le_cuoi.gia_tri}
          </b>
        </div>
      )}
    </div>
  );
}

/** Khối tổng kết đóng chân các thẻ bóc tách. */
export function BreakdownFooter({ children }: { children: ReactNode }) {
  return <div className="mt-5 pt-4 border-t border-border">{children}</div>;
}

export function TotalRow({ nhan, gia_tri }: { nhan: string; gia_tri: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[12.5px] text-slate-500 dark:text-slate-400">
      <span>{nhan}</span>
      <b className="ml-auto text-foreground font-semibold tabular-nums text-[13.5px]">{gia_tri}</b>
    </div>
  );
}

export function TabGroup<T extends string>({
  cac_tab,
  dang_chon,
  onSelect,
  className = '',
}: {
  cac_tab: { ma: T; nhan: ReactNode }[];
  dang_chon: T;
  onSelect: (ma: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`flex gap-[3px] p-[3px] bg-slate-100 dark:bg-slate-800/70 rounded-[10px] w-fit flex-wrap ${className}`}
    >
      {cac_tab.map((t) => {
        const chon = t.ma === dang_chon;
        return (
          <button
            key={t.ma}
            role="tab"
            aria-selected={chon}
            onClick={() => onSelect(t.ma)}
            className={[
              'inline-flex items-center gap-[7px] px-3.5 py-[7px] rounded-[7px] text-[13px] transition-colors',
              chon
                ? 'bg-card text-foreground font-semibold shadow-sm'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-foreground',
            ].join(' ')}
          >
            {t.nhan}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ tieu_de, mo_ta }: { tieu_de: string; mo_ta: string }) {
  return (
    <div className="border border-dashed border-border rounded-xl px-6 py-8 text-center text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
      <b className="block text-foreground text-[14.5px] font-semibold mb-1.5">{tieu_de}</b>
      {mo_ta}
    </div>
  );
}

export function Frame({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`} />;
}

/** Ảnh đại diện kênh; không có ảnh thì rơi về hai chữ cái đầu trên nền màu nền tảng. */
export function ChannelAvatar({
  ten,
  avatar,
  platform,
  size = 34,
}: {
  ten: string;
  avatar?: string;
  platform: string;
  size?: number;
}) {
  const chu = (ten || '?').trim().slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-lg shrink-0 grid place-items-center text-white font-semibold overflow-hidden"
      style={{ width: size, height: size, background: platformColor(platform), fontSize: size * 0.32 }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        chu
      )}
    </div>
  );
}

export function PlatformCard({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11.5px] font-medium whitespace-nowrap bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-border">
      <Dot mau={platformColor(platform)} size={7} />
      {platformName(platform)}
    </span>
  );
}

/** Mũi tên ↑/↓ kèm phần trăm. Không có kỳ trước để so thì hiện gạch ngang, không hiện 0%. */
export function PercentDelta({ delta, hau_to }: { delta: number | null; hau_to?: string }) {
  if (delta === null) {
    return (
      <span className="text-slate-400 dark:text-slate-500 font-normal">
        — chưa có kỳ trước để so
      </span>
    );
  }
  const mau =
    delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-rose-600 dark:text-rose-400' : '';
  return (
    <span className={`${mau} font-semibold`}>
      {delta > 0 ? '↑' : delta < 0 ? '↓' : '—'} {Math.abs(delta)}%
      {hau_to && <span className="text-slate-400 dark:text-slate-500 font-normal"> {hau_to}</span>}
    </span>
  );
}
