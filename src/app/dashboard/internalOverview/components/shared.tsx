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

export const soDay = (n: number): string => Math.round(n || 0).toLocaleString('vi-VN');

export const soGon = (n: number): string => {
  const v = n || 0;
  if (v >= 1e9) return (v / 1e9).toFixed(1).replace('.', ',') + ' tỷ';
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace('.', ',') + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace('.', ',') + 'K';
  return soDay(v);
};

export const phanTram = (v: number): string => (v || 0).toFixed(1).replace('.', ',') + '%';

/** Chia cho 0 xảy ra thật khi nền tảng chưa có video nào — trả 0 thay vì NaN/Infinity. */
export const tyLe = (tu: number, mau: number): number => (mau > 0 ? (tu / mau) * 100 : 0);

/** Chênh lệch phần trăm so với kỳ trước. Kỳ trước bằng 0 thì không có gì để so. */
export function chenhLech(nay: number, truoc: number): number | null {
  if (!truoc) return null;
  return Math.round(((nay - truoc) / truoc) * 100);
}

export function ngayNgan(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} Th${d.getMonth() + 1}`;
}

export function ngayDayDu(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** "06:12 hôm nay" / "3 ngày trước" — dòng phụ dưới tên kênh trong bảng xếp hạng. */
export function moTaDongBo(iso: string | null): string {
  if (!iso) return 'Chưa đồng bộ';
  const d = new Date(iso);
  const soNgay = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  const gio = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (soNgay <= 0) return `Đồng bộ ${gio} hôm nay`;
  if (soNgay === 1) return `Đồng bộ ${gio} hôm qua`;
  return `Đồng bộ ${soNgay} ngày trước`;
}

// ─── Màu nền tảng cho biểu đồ ────────────────────────────────────────────────
/**
 * platformStyle() trả về lớp Tailwind, dùng được cho thẻ HTML nhưng KHÔNG dùng được cho
 * recharts và thuộc tính `fill` của SVG — hai chỗ đó cần mã màu thật. Giữ đúng một bảng ở
 * đây cho phần đồ hoạ, phần còn lại vẫn dùng chung platformStyle().
 */
const MAU_NEN_TANG: Record<string, string> = {
  facebook: '#3b82f6',
  tiktok: '#64748b',
  instagram: '#d8478f',
  youtube: '#ef4444',
};

export const mauNenTang = (platform: string): string => MAU_NEN_TANG[platform] || '#8b93a7';

export const tenNenTang = (platform: string): string => platformStyle(platform).label;

/** Hai màu dữ liệu trung tính, dùng cho các thanh chia hai phần (VN / Global…). */
export const MAU_CHINH = '#5b5bd6';
export const MAU_PHU = '#aab1c4';

/** Ba màu cho cơ cấu tương tác — thích / bình luận / chia sẻ. */
export const MAU_TUONG_TAC = ['#5b5bd6', '#2f9e8f', '#dd8a3e'];

// ─── Mảnh giao diện ──────────────────────────────────────────────────────────

export function The({
  children,
  className = '',
  noiBat = false,
  chim = false,
}: {
  children: ReactNode;
  className?: string;
  /** Thẻ hạng 1: bóng đậm hơn, đệm rộng hơn — dành cho biểu đồ chính. */
  noiBat?: boolean;
  /** Thẻ hạng 3: nền chìm, không bóng — dành cho khối phụ. */
  chim?: boolean;
}) {
  const nen = chim ? 'bg-slate-50 dark:bg-slate-900/40' : 'bg-card';
  const bong = noiBat ? 'shadow-md' : chim ? '' : 'shadow-sm';
  return (
    <div className={`${nen} border border-border rounded-2xl ${noiBat ? 'p-6' : 'p-5'} ${bong} ${className}`}>
      {children}
    </div>
  );
}

/** Chấm "i" giải thích cách một con số được tính — bản thiết kế dùng ở mọi tiêu đề. */
export function ChuThich({ noiDung }: { noiDung: string }) {
  return (
    <span
      title={noiDung}
      className="ml-1.5 inline-grid place-items-center w-[15px] h-[15px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[9.5px] font-semibold cursor-help shrink-0 leading-none"
    >
      i
    </span>
  );
}

export function TieuDeThe({ children, chuThich }: { children: ReactNode; chuThich?: string }) {
  return (
    <h3 className="text-[14.5px] font-semibold text-foreground flex items-center tracking-tight">
      {children}
      {chuThich && <ChuThich noiDung={chuThich} />}
    </h3>
  );
}

export function PhuDe({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[12.5px] text-slate-400 dark:text-slate-500 mt-1 ${className}`}>{children}</p>;
}

export function Cham({ mau, size = 8 }: { mau: string; size?: number }) {
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
 * `moc` quyết định thanh nói lên điều gì:
 *   - Bỏ trống → quy đổi theo tổng của CHÍNH dòng đó, thanh luôn đầy khung. Đúng khi chỉ có
 *     một dòng, hoặc khi người đọc chỉ cần thấy TỶ LỆ trong dòng.
 *   - Truyền vào (thường là giá trị lớn nhất trong nhóm) → thanh giữ được ĐỘ LỚN, so giữa
 *     các dòng mới có nghĩa.
 *
 * Đo được trên trang thật khi thiếu `moc`: cả 5 tuyến A1–A5 đều ra thanh 409px như nhau,
 * nên tuyến A3 chiếm 2,6% lượt xem trông ngang bằng A4 chiếm 36,9% — đọc lướt là hiểu sai.
 */
export function ThanhChia({
  doan,
  cao = 8,
  className = '',
  moc,
}: {
  doan: { gia_tri: number; mau: string; ten?: string }[];
  cao?: number;
  className?: string;
  moc?: number;
}) {
  const tong = moc && moc > 0 ? moc : doan.reduce((s, d) => s + d.gia_tri, 0);
  return (
    <div
      className={`flex rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 gap-0.5 ${className}`}
      style={{ height: cao }}
    >
      {doan
        .filter((d) => d.gia_tri > 0)
        .map((d, i) => (
          <i
            key={i}
            className="block rounded-full transition-[width] duration-500"
            style={{ width: `${tyLe(d.gia_tri, tong)}%`, background: d.mau }}
            title={d.ten}
          />
        ))}
    </div>
  );
}

/** Một dòng trong các khối bóc tách: tiêu đề + số + thanh chia + chú giải. */
export function DongBocTach({
  nhan,
  gia_tri,
  doan,
  chu_giai,
  ty_le_cuoi,
  vien = true,
  moc,
}: {
  nhan: ReactNode;
  gia_tri: ReactNode;
  doan: { gia_tri: number; mau: string; ten?: string }[];
  chu_giai: { mau: string; nhan: string; gia_tri: string }[];
  ty_le_cuoi?: { nhan: string; gia_tri: string };
  vien?: boolean;
  /** Mốc quy đổi bề rộng dùng chung cho cả nhóm dòng — xem ThanhChia. */
  moc?: number;
}) {
  return (
    <div className={`py-3.5 ${vien ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
      <div className="flex items-center gap-2 text-[13px] font-medium text-foreground min-h-5">
        {nhan}
        <b className="ml-auto font-semibold tabular-nums text-[13px]">{gia_tri}</b>
      </div>
      <ThanhChia doan={doan} cao={7} className="my-2.5" moc={moc} />
      <div className="flex gap-3.5 flex-wrap text-[11.5px] text-slate-400 dark:text-slate-500">
        {chu_giai.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <Cham mau={c.mau} size={7} />
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
export function ChanBocTach({ children }: { children: ReactNode }) {
  return <div className="mt-5 pt-4 border-t border-border">{children}</div>;
}

export function DongTong({ nhan, gia_tri }: { nhan: string; gia_tri: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[12.5px] text-slate-500 dark:text-slate-400">
      <span>{nhan}</span>
      <b className="ml-auto text-foreground font-semibold tabular-nums text-[13.5px]">{gia_tri}</b>
    </div>
  );
}

export function NhomTab<T extends string>({
  cac_tab,
  dang_chon,
  onChon,
  className = '',
}: {
  cac_tab: { ma: T; nhan: ReactNode }[];
  dang_chon: T;
  onChon: (ma: T) => void;
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
            onClick={() => onChon(t.ma)}
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

export function TrangRong({ tieu_de, mo_ta }: { tieu_de: string; mo_ta: string }) {
  return (
    <div className="border border-dashed border-border rounded-xl px-6 py-8 text-center text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
      <b className="block text-foreground text-[14.5px] font-semibold mb-1.5">{tieu_de}</b>
      {mo_ta}
    </div>
  );
}

export function Khung({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`} />;
}

/** Ảnh đại diện kênh; không có ảnh thì rơi về hai chữ cái đầu trên nền màu nền tảng. */
export function AnhKenh({
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
      style={{ width: size, height: size, background: mauNenTang(platform), fontSize: size * 0.32 }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt=""
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

export function TheNenTang({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11.5px] font-medium whitespace-nowrap bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-border">
      <Cham mau={mauNenTang(platform)} size={7} />
      {tenNenTang(platform)}
    </span>
  );
}

/** Mũi tên ↑/↓ kèm phần trăm. Không có kỳ trước để so thì hiện gạch ngang, không hiện 0%. */
export function ChenhLechPhanTram({ delta, hau_to }: { delta: number | null; hau_to?: string }) {
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
