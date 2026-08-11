'use client';

import type { DuplicateGroup, InternalDuplicates, DuplicateByChannel } from '@/services/scraperService';
import {
  ChannelAvatar,
  Frame,
  COLOR_PRIMARY,
  Subtitle,
  The,
  CardTitle,
  SplitBar,
  EmptyState,
  shortDate,
  percent,
  fullNumber,
  compactNumber,
} from './shared';

/** Kênh trùng từ ngưỡng này trở lên bị đánh dấu — khớp đúng ngưỡng cảnh báo bên BE. */
const NGUONG_DANH_DAU = 90;

/**
 * Kênh dưới ngần này video trong kỳ thì không xếp hạng — cùng sàn với cảnh báo bên BE.
 *
 * Không có sàn thì tỷ lệ trên mẫu quá nhỏ chiếm đầu bảng và nói sai chuyện: đo trên dữ liệu
 * thật, "HUYK - Trang Sức Viễn Chí Bảo" có 1/1 video trùng ra 100%, đứng trên cả "Huyk thợ
 * kim hoàn trang sức" 93/99 video — trong khi kênh sau mới là chỗ thật sự lặp nội dung.
 */
const RANKING_VIDEO_FLOOR = 20;

/** Cắt bảng xếp hạng kênh cho cân với cột nhóm bên trái; 27 dòng thì khối dài quá đọc. */
const SO_KENH_TOI_DA = 12;

/** Số kênh hiện avatar trong một dòng nhóm trước khi rút thành "+N". */
const SO_AVATAR_TOI_DA = 4;

/**
 * Video được đăng trùng trên nhiều kênh nội bộ.
 *
 * ── Cách nhận diện, và vì sao phải nói rõ giới hạn ──────────────────────────────
 * BE khớp theo (caption chuẩn hoá + độ dài video), KHÔNG so file video — bảng không lưu
 * mã băm nào, và link fbcdn đã lưu thì trả HTTP 403 nên cũng không tải về mà so được.
 * Hệ quả: video bị sửa lại caption sẽ lọt lưới. Ghi thẳng vào chú thích tiêu đề để người
 * đọc không tưởng đây là con số tuyệt đối.
 *
 * ── Vì sao khối này tự tải, tách khỏi số liệu tổng quan ─────────────────────────
 * Gọi endpoint riêng /scraper/owned/trung-lap. Query lỗi hay đang tải thì chỉ khối này
 * hiện khung chờ, phần còn lại của trang vẫn vẽ đủ.
 */
export default function DuplicateBlock({
  data,
  dangTai,
  loi,
}: {
  data?: InternalDuplicates;
  dangTai: boolean;
  loi: boolean;
}) {
  if (dangTai && !data) return <KhungChoTrungLap />;

  if (loi && !data) {
    return (
      <The className="mb-5">
        <CardTitle>Trùng lặp nội dung</CardTitle>
        <EmptyState
          tieu_de="Không tải được số liệu trùng lặp"
          mo_ta="Các khối khác trên trang vẫn dùng bình thường. Tải lại trang để thử lại."
        />
      </The>
    );
  }

  if (!data) return null;

  const { tom_tat, nhom, theo_kenh } = data;

  if (tom_tat.tong_video === 0) {
    return (
      <The className="mb-5">
        <CardTitle hint={CHU_THICH}>Trùng lặp nội dung</CardTitle>
        <EmptyState
          tieu_de="Chưa có video nào trong kỳ"
          mo_ta="Đổi khoảng ngày hoặc chờ lần đồng bộ kế tiếp để hệ thống cào thêm video."
        />
      </The>
    );
  }

  return (
    <The className="mb-5">
      <div className="flex items-start gap-4 flex-wrap">
        <div>
          <CardTitle hint={CHU_THICH}>Trùng lặp nội dung</CardTitle>
          <Subtitle>Cùng một video được đăng trên nhiều kênh nội bộ khác nhau</Subtitle>
        </div>
      </div>

      <div className="grid gap-3 mt-4 mb-1 grid-cols-2 lg:grid-cols-4">
        <O nhan="Nội dung bị trùng" value={fullNumber(tom_tat.so_nhom)} phu="nhóm video giống nhau" />
        <O
          nhan="Phủ từ 3 kênh"
          value={fullNumber(tom_tat.so_nhom_tu_3_kenh)}
          phu="nhóm lan ra nhiều kênh"
          nhanManh={tom_tat.so_nhom_tu_3_kenh > 0}
        />
        <O
          nhan="Video trùng"
          value={percent(tom_tat.ty_le)}
          phu={`${fullNumber(tom_tat.so_video_trung)} / ${fullNumber(tom_tat.tong_video)} video trong kỳ`}
        />
        <O nhan="Kênh dính trùng" value={fullNumber(tom_tat.so_kenh_dinh)} phu="kênh có video lặp" />
      </div>

      {tom_tat.so_nhom === 0 ? (
        <EmptyState
          tieu_de="Không có nội dung nào bị đăng trùng"
          mo_ta="Mỗi kênh nội bộ đang đăng nội dung riêng trong kỳ này."
        />
      ) : (
        <div className="grid gap-6 mt-5 grid-cols-1 xl:grid-cols-[1.6fr_1fr]">
          <BangNhom nhom={nhom} tongNhom={tom_tat.so_nhom} />
          <ChannelTable byChannel={theo_kenh} />
        </div>
      )}
    </The>
  );
}

const CHU_THICH =
  'Nhận diện bằng caption trùng khớp và độ dài video bằng nhau — không so file video, ' +
  'nên video bị sửa lại caption sẽ không được tính là trùng.';

function O({
  nhan,
  value,
  phu,
  nhanManh = false,
}: {
  nhan: string;
  value: string;
  phu: string;
  nhanManh?: boolean;
}) {
  return (
    <div className="px-3.5 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
      <div className="text-[11.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">
        {nhan}
      </div>
      <div
        className={`text-[22px] font-bold tabular-nums mt-1 leading-none ${
          nhanManh ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
        }`}
      >
        {value}
      </div>
      <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-1.5">{phu}</div>
    </div>
  );
}

function BangNhom({ nhom, tongNhom }: { nhom: DuplicateGroup[]; tongNhom: number }) {
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-foreground mb-1">Nội dung phủ nhiều kênh nhất</h4>
      <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mb-1">
        {tongNhom > nhom.length
          ? `${nhom.length} nhóm hàng đầu trong tổng số ${fullNumber(tongNhom)}`
          : `${nhom.length} nhóm`}
      </p>
      <div>
        {nhom.map((g, i) => (
          <DongNhom key={`${g.platform}-${g.noi_dung}-${g.giay}-${i}`} nhom={g} />
        ))}
      </div>
    </div>
  );
}

function DongNhom({ nhom }: { nhom: DuplicateGroup }) {
  const nhieuKenh = nhom.so_kenh >= 3;
  // Một kênh có thể đăng lại cùng nội dung nhiều lần, nên so_video > so_kenh là chuyện thường —
  // hiện thêm phần chênh ra để người đọc không tưởng con số bị đếm sai.
  const dangLai = nhom.so_video - nhom.so_kenh;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex -space-x-2 shrink-0 pt-0.5">
        {nhom.kenh.slice(0, SO_AVATAR_TOI_DA).map((k) => (
          <div key={k.id} className="ring-2 ring-card rounded-lg" title={k.ten}>
            <ChannelAvatar ten={k.ten} platform={nhom.platform} size={26} />
          </div>
        ))}
        {nhom.kenh.length > SO_AVATAR_TOI_DA && (
          <div
            className="ring-2 ring-card rounded-lg grid place-items-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
            style={{ width: 26, height: 26 }}
            title={nhom.kenh.slice(SO_AVATAR_TOI_DA).map((k) => k.ten).join(', ')}
          >
            +{nhom.kenh.length - SO_AVATAR_TOI_DA}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <a
          href={nhom.url_mau || undefined}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] text-foreground font-medium leading-snug line-clamp-2 hover:underline"
          title={nhom.noi_dung}
        >
          {nhom.noi_dung}
        </a>
        <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-x-2.5 gap-y-1 flex-wrap">
          <span className="truncate max-w-full">{nhom.kenh.map((k) => k.ten).join(' · ')}</span>
        </div>
        <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-x-2.5 flex-wrap">
          {nhom.giay !== null && <span className="tabular-nums">{nhom.giay}s</span>}
          <span className="tabular-nums">{compactNumber(nhom.views)} lượt xem</span>
          <span className="tabular-nums">
            {nhom.ngay_dau.slice(0, 10) === nhom.ngay_cuoi.slice(0, 10)
              ? shortDate(nhom.ngay_dau)
              : `${shortDate(nhom.ngay_dau)} → ${shortDate(nhom.ngay_cuoi)}`}
          </span>
          {dangLai > 0 && <span>đăng lại {dangLai} lần</span>}
        </div>
      </div>

      <span
        className={[
          'text-[11.5px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap border shrink-0 tabular-nums',
          nhieuKenh
            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-border',
        ].join(' ')}
      >
        {nhom.so_kenh} kênh
      </span>
    </div>
  );
}

function ChannelTable({ byChannel }: { byChannel: DuplicateByChannel[] }) {
  const largeEnough = byChannel.filter((k) => k.tong_video >= RANKING_VIDEO_FLOOR);
  const hien = largeEnough.slice(0, SO_KENH_TOI_DA);
  const skipped = byChannel.length - largeEnough.length;

  if (hien.length === 0) return null;

  // Mốc chung là kênh nhiều video nhất, để bề rộng thanh so được GIỮA các dòng. Bỏ mốc thì
  // kênh 20/20 video vẽ ra thanh dài bằng kênh 94/113 — cùng gần 100% nhưng khác hẳn quy mô.
  const baseline = Math.max(...hien.map((k) => k.tong_video), 1);

  return (
    <div>
      <h4 className="text-[13px] font-semibold text-foreground mb-1">Kênh lặp nội dung nhiều nhất</h4>
      <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mb-1">
        Bề rộng thanh theo số video trong kỳ
        {largeEnough.length > hien.length && ` · ${hien.length} kênh đầu trong ${largeEnough.length}`}
      </p>
      <div>
        {hien.map((k) => (
          <div
            key={`${k.platform}-${k.id}`}
            className="py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
          >
            <div className="flex items-center gap-2 text-[12.5px]">
              <ChannelAvatar ten={k.ten} platform={k.platform} size={22} />
              <span className="font-medium text-foreground truncate" title={k.ten}>
                {k.ten}
              </span>
              <b className="ml-auto font-semibold tabular-nums shrink-0">{percent(k.ty_le)}</b>
            </div>
            <SplitBar
              cao={6}
              className="my-1.5"
              baseline={baseline}
              segments={[
                { gia_tri: k.video_trung, mau: k.ty_le >= NGUONG_DANH_DAU ? '#dd8a3e' : COLOR_PRIMARY, ten: 'Trùng' },
                { gia_tri: k.tong_video - k.video_trung, mau: '#e2e8f0', ten: 'Riêng' },
              ]}
            />
            <div className="text-[11.5px] text-slate-400 dark:text-slate-500 tabular-nums">
              {fullNumber(k.video_trung)} / {fullNumber(k.tong_video)} video trùng với kênh khác
            </div>
          </div>
        ))}
      </div>
      {skipped > 0 && (
        <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-2.5">
          Bỏ qua {skipped} kênh dưới {RANKING_VIDEO_FLOOR} video trong kỳ — mẫu quá nhỏ để tỷ lệ có
          nghĩa.
        </p>
      )}
    </div>
  );
}

function KhungChoTrungLap() {
  return (
    <The className="mb-5">
      <Frame className="h-4 w-40" />
      <Frame className="h-3 w-72 mt-2" />
      <div className="grid gap-3 mt-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Frame key={i} className="h-[74px] w-full" />
        ))}
      </div>
      <div className="grid gap-6 mt-5 grid-cols-1 xl:grid-cols-[1.6fr_1fr]">
        <Frame className="h-[280px] w-full" />
        <Frame className="h-[280px] w-full" />
      </div>
    </The>
  );
}
