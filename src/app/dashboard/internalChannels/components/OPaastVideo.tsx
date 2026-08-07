'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Check, CircleNotch, Sparkle, WarningCircle } from '@phosphor-icons/react';

import { useAuthStore } from '@/store/auth-store';
import { scraperService, KetQuaPaastVideo, TrangThaiPaast } from '@/services/scraperService';
import PaastV2Modal, { KetQuaV2 } from './PaastV2Modal';

/**
 * Ô chấm điểm PAAST ở góc thẻ video kênh nội bộ.
 *
 * ── Vì sao không tự chấm khi mở trang ───────────────────────────────────────────
 * Lần chấm đầu của mỗi video tốn một lượt LLM và ~15 giây. Lưới có 24 thẻ, tự chấm hết là
 * đốt 24 lượt cho những video người dùng còn chưa nhìn tới. Nên trang chỉ ĐỌC trạng thái đã
 * lưu (một lượt gọi cho cả lưới), còn việc chấm chỉ chạy khi người dùng bấm vào ô này.
 *
 * ── Vì sao phải chặn sự kiện ────────────────────────────────────────────────────
 * Thẻ video là một thẻ <a> bọc toàn bộ. Không gọi preventDefault + stopPropagation thì bấm
 * ô chấm điểm sẽ mở luôn bài gốc trên Facebook và popup không bao giờ hiện ra.
 */
export default function OPaastVideo({
  platform,
  postId,
  trangThai,
  onCapNhat,
}: {
  platform: string;
  postId: string;
  /** Trạng thái đã biết từ lượt gọi chung của lưới; chưa có nghĩa là chưa từng chấm. */
  trangThai?: TrangThaiPaast;
  /** Báo cho lưới biết video này vừa có điểm, để ô cập nhật mà không phải tải lại trang. */
  onCapNhat?: (t: TrangThaiPaast) => void;
}) {
  const { token } = useAuthStore();
  const [dangChay, setDangChay] = useState(false);
  const [ketQua, setKetQua] = useState<KetQuaPaastVideo | null>(null);
  const [moModal, setMoModal] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  // Chỉ bật portal sau khi đã mount — createPortal cần document, gọi lúc render phía server là vỡ.
  const [daMount, setDaMount] = useState(false);
  useEffect(() => setDaMount(true), []);

  // Bản 2 không có điểm số — ô hiển thị ĐẠT / CHƯA ĐẠT theo verdict.
  const kq: KetQuaV2 | null = ketQua?.phan_tich?.analysis_result ?? null;
  const dat = kq ? kq.verdict.passed : trangThai?.dat ?? null;
  const daCham = dat !== null;

  async function bam(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (dangChay) return;

    // Đã có kết quả trong phiên này thì mở lại luôn, khỏi hỏi server.
    if (ketQua?.phan_tich) {
      setMoModal(true);
      return;
    }

    setDangChay(true);
    setLoi(null);
    // Lần chấm đầu mất ~15 giây (hỏi phụ đề Facebook rồi gọi LLM). Không báo gì thì người
    // dùng tưởng bấm hụt và bấm tiếp.
    const dangCho = toast.loading('Đang lấy kịch bản và chấm điểm…');
    try {
      const r = await scraperService.chamDiemPaast(token!, platform, postId);
      setKetQua(r);
      if (r.phan_tich) {
        toast.dismiss(dangCho);
        setMoModal(true);
        onCapNhat?.({
          trang_thai: r.trang_thai,
          dat: r.phan_tich.analysis_result?.verdict?.passed ?? null,
          so_ky_tu: r.so_ky_tu ?? 0,
        });
      } else {
        // ~2/3 video Facebook chưa có phụ đề tự sinh. Đây là chuyện BÌNH THƯỜNG chứ không
        // phải hỏng, nhưng phải nói ra màn hình: trước đây chỉ đổi màu một icon 22px và
        // giấu lý do trong tooltip, người dùng bấm xong không thấy gì nên tưởng lỗi.
        const ghiChu = r.ghi_chu || 'Chưa lấy được kịch bản của video này';
        setLoi(ghiChu);
        toast.error(ghiChu, { id: dangCho, duration: 6000 });
      }
    } catch {
      const ghiChu = 'Không chấm điểm được video này';
      setLoi(ghiChu);
      toast.error(ghiChu, { id: dangCho });
    } finally {
      setDangChay(false);
    }
  }

  // Bản 2 bỏ thang điểm nên ô chỉ có hai trạng thái: đạt chuẩn (xanh) hay chưa (hổ phách).
  const mau = !daCham
    ? 'bg-slate-950/55 text-white/90 border-white/20'
    : dat
      ? 'bg-emerald-500/90 text-white border-emerald-300/40'
      : 'bg-amber-500/90 text-white border-amber-300/40';

  return (
    <>
      <button
        onClick={bam}
        title={
          loi
            ? loi
            : daCham
              ? `${dat ? 'Đạt chuẩn PAAST' : 'Chưa đủ chuẩn PAAST'} — bấm để xem chi tiết`
              : 'Chấm điểm PAAST cho video này'
        }
        className={[
          'absolute top-2 right-2 z-20 h-[22px] min-w-[22px] px-1.5 rounded-md border backdrop-blur',
          'grid place-items-center text-[11px] font-semibold leading-none transition-transform',
          'hover:scale-110 disabled:opacity-60',
          loi ? 'bg-slate-950/55 text-amber-300 border-amber-400/30' : mau,
        ].join(' ')}
        disabled={dangChay}
      >
        {dangChay ? (
          <CircleNotch size={12} weight="bold" className="animate-spin" />
        ) : loi ? (
          <WarningCircle size={12} weight="fill" />
        ) : daCham ? (
          dat ? <Check size={12} weight="bold" /> : <WarningCircle size={12} weight="fill" />
        ) : (
          <Sparkle size={12} weight="fill" />
        )}
      </button>

      {/*
        PHẢI đưa popup ra thẳng <body> bằng portal.
        PaastScoreModal định vị bằng `fixed inset-0`, nhưng thẻ video bọc ngoài có
        `hover:scale-[1.01]` — tổ tiên có `transform` thì trở thành khung chứa cho phần tử
        `fixed`, nên popup bị nhốt gọn trong ô thẻ ~230px thay vì phủ màn hình. Đã dựng ra
        và nhìn thấy tận mắt trước khi sửa.
      */}
      {daMount && moModal && kq
        ? createPortal(
            <PaastV2Modal
              open={moModal}
              ketQua={kq}
              kichBan={ketQua?.kich_ban}
              onClose={() => setMoModal(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}
