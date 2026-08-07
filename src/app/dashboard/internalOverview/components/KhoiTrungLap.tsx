'use client';

import type { NhomTrung, TrungLapNoiBo, TrungTheoKenh } from '@/services/scraperService';
import {
  AnhKenh,
  Khung,
  MAU_CHINH,
  PhuDe,
  The,
  TieuDeThe,
  ThanhChia,
  TrangRong,
  ngayNgan,
  phanTram,
  soDay,
  soGon,
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
const SAN_VIDEO_XEP_HANG = 20;

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
export default function KhoiTrungLap({
  duLieu,
  dangTai,
  loi,
}: {
  duLieu?: TrungLapNoiBo;
  dangTai: boolean;
  loi: boolean;
}) {
  if (dangTai && !duLieu) return <KhungChoTrungLap />;

  if (loi && !duLieu) {
    return (
      <The className="mb-5">
        <TieuDeThe>Trùng lặp nội dung</TieuDeThe>
        <TrangRong
          tieu_de="Không tải được số liệu trùng lặp"
          mo_ta="Các khối khác trên trang vẫn dùng bình thường. Tải lại trang để thử lại."
        />
      </The>
    );
  }

  if (!duLieu) return null;

  const { tom_tat, nhom, theo_kenh } = duLieu;

  if (tom_tat.tong_video === 0) {
    return (
      <The className="mb-5">
        <TieuDeThe chuThich={CHU_THICH}>Trùng lặp nội dung</TieuDeThe>
        <TrangRong
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
          <TieuDeThe chuThich={CHU_THICH}>Trùng lặp nội dung</TieuDeThe>
          <PhuDe>Cùng một video được đăng trên nhiều kênh nội bộ khác nhau</PhuDe>
        </div>
      </div>

      <div className="grid gap-3 mt-4 mb-1 grid-cols-2 lg:grid-cols-4">
        <O nhan="Nội dung bị trùng" giaTri={soDay(tom_tat.so_nhom)} phu="nhóm video giống nhau" />
        <O
          nhan="Phủ từ 3 kênh"
          giaTri={soDay(tom_tat.so_nhom_tu_3_kenh)}
          phu="nhóm lan ra nhiều kênh"
          nhanManh={tom_tat.so_nhom_tu_3_kenh > 0}
        />
        <O
          nhan="Video trùng"
          giaTri={phanTram(tom_tat.ty_le)}
          phu={`${soDay(tom_tat.so_video_trung)} / ${soDay(tom_tat.tong_video)} video trong kỳ`}
        />
        <O nhan="Kênh dính trùng" giaTri={soDay(tom_tat.so_kenh_dinh)} phu="kênh có video lặp" />
      </div>

      {tom_tat.so_nhom === 0 ? (
        <TrangRong
          tieu_de="Không có nội dung nào bị đăng trùng"
          mo_ta="Mỗi kênh nội bộ đang đăng nội dung riêng trong kỳ này."
        />
      ) : (
        <div className="grid gap-6 mt-5 grid-cols-1 xl:grid-cols-[1.6fr_1fr]">
          <BangNhom nhom={nhom} tongNhom={tom_tat.so_nhom} />
          <BangKenh theoKenh={theo_kenh} />
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
  giaTri,
  phu,
  nhanManh = false,
}: {
  nhan: string;
  giaTri: string;
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
        {giaTri}
      </div>
      <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-1.5">{phu}</div>
    </div>
  );
}

function BangNhom({ nhom, tongNhom }: { nhom: NhomTrung[]; tongNhom: number }) {
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-foreground mb-1">Nội dung phủ nhiều kênh nhất</h4>
      <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mb-1">
        {tongNhom > nhom.length
          ? `${nhom.length} nhóm hàng đầu trong tổng số ${soDay(tongNhom)}`
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

function DongNhom({ nhom }: { nhom: NhomTrung }) {
  const nhieuKenh = nhom.so_kenh >= 3;
  // Một kênh có thể đăng lại cùng nội dung nhiều lần, nên so_video > so_kenh là chuyện thường —
  // hiện thêm phần chênh ra để người đọc không tưởng con số bị đếm sai.
  const dangLai = nhom.so_video - nhom.so_kenh;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex -space-x-2 shrink-0 pt-0.5">
        {nhom.kenh.slice(0, SO_AVATAR_TOI_DA).map((k) => (
          <div key={k.id} className="ring-2 ring-card rounded-lg" title={k.ten}>
            <AnhKenh ten={k.ten} platform={nhom.platform} size={26} />
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
          <span className="tabular-nums">{soGon(nhom.views)} lượt xem</span>
          <span className="tabular-nums">
            {nhom.ngay_dau.slice(0, 10) === nhom.ngay_cuoi.slice(0, 10)
              ? ngayNgan(nhom.ngay_dau)
              : `${ngayNgan(nhom.ngay_dau)} → ${ngayNgan(nhom.ngay_cuoi)}`}
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

function BangKenh({ theoKenh }: { theoKenh: TrungTheoKenh[] }) {
  const duLon = theoKenh.filter((k) => k.tong_video >= SAN_VIDEO_XEP_HANG);
  const hien = duLon.slice(0, SO_KENH_TOI_DA);
  const boQua = theoKenh.length - duLon.length;

  if (hien.length === 0) return null;

  // Mốc chung là kênh nhiều video nhất, để bề rộng thanh so được GIỮA các dòng. Bỏ mốc thì
  // kênh 20/20 video vẽ ra thanh dài bằng kênh 94/113 — cùng gần 100% nhưng khác hẳn quy mô.
  const moc = Math.max(...hien.map((k) => k.tong_video), 1);

  return (
    <div>
      <h4 className="text-[13px] font-semibold text-foreground mb-1">Kênh lặp nội dung nhiều nhất</h4>
      <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mb-1">
        Bề rộng thanh theo số video trong kỳ
        {duLon.length > hien.length && ` · ${hien.length} kênh đầu trong ${duLon.length}`}
      </p>
      <div>
        {hien.map((k) => (
          <div
            key={`${k.platform}-${k.id}`}
            className="py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
          >
            <div className="flex items-center gap-2 text-[12.5px]">
              <AnhKenh ten={k.ten} platform={k.platform} size={22} />
              <span className="font-medium text-foreground truncate" title={k.ten}>
                {k.ten}
              </span>
              <b className="ml-auto font-semibold tabular-nums shrink-0">{phanTram(k.ty_le)}</b>
            </div>
            <ThanhChia
              cao={6}
              className="my-1.5"
              moc={moc}
              doan={[
                { gia_tri: k.video_trung, mau: k.ty_le >= NGUONG_DANH_DAU ? '#dd8a3e' : MAU_CHINH, ten: 'Trùng' },
                { gia_tri: k.tong_video - k.video_trung, mau: '#e2e8f0', ten: 'Riêng' },
              ]}
            />
            <div className="text-[11.5px] text-slate-400 dark:text-slate-500 tabular-nums">
              {soDay(k.video_trung)} / {soDay(k.tong_video)} video trùng với kênh khác
            </div>
          </div>
        ))}
      </div>
      {boQua > 0 && (
        <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-2.5">
          Bỏ qua {boQua} kênh dưới {SAN_VIDEO_XEP_HANG} video trong kỳ — mẫu quá nhỏ để tỷ lệ có
          nghĩa.
        </p>
      )}
    </div>
  );
}

function KhungChoTrungLap() {
  return (
    <The className="mb-5">
      <Khung className="h-4 w-40" />
      <Khung className="h-3 w-72 mt-2" />
      <div className="grid gap-3 mt-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Khung key={i} className="h-[74px] w-full" />
        ))}
      </div>
      <div className="grid gap-6 mt-5 grid-cols-1 xl:grid-cols-[1.6fr_1fr]">
        <Khung className="h-[280px] w-full" />
        <Khung className="h-[280px] w-full" />
      </div>
    </The>
  );
}
