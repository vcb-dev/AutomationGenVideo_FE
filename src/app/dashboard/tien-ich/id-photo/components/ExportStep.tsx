'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FileDown,
  RotateCcw,
  Loader2,
  Download,
  ExternalLink,
  Pencil,
  Sparkles,
  AlertTriangle,
  X,
  ZoomIn,
  ZoomOut,
  Move,
} from 'lucide-react';
import { getPositionOption, IdPhotoPosition } from './constants';
import { EmployeeInfoFields, EmployeeInfoValues, isEmployeeInfoValid } from './EmployeeInfoFields';
import { CROP_DEFAULT, CROP_SCALE_MAX, CROP_SCALE_MIN, CropTransform, clampCropOffset, computeCropLayout } from './crop-math';

/**
 * Toạ độ các phần tử đặt đè lên ảnh nền, quy ra % của khổ 420×669.
 * BẢN SAO của IdPhotoService.CARD_LAYOUT bên BE (id-photo.service.ts) — preview và file PDF
 * phải ra cùng một bố cục, sửa 1 bên phải sửa bên kia.
 */
const CARD_LAYOUT = {
  circle: {                       // BE: tâm (209.2, 183.3), bán kính 85.2
    top: `${((183.3 - 85.2) / 669) * 100}%`,
    left: `${((209.2 - 85.2) / 420) * 100}%`,
    width: `${((85.2 * 2) / 420) * 100}%`,
  },
  nameTop: `${(392 / 669) * 100}%`,      // BE: CARD_LAYOUT.nameY
  teamIdTop: `${(458 / 669) * 100}%`,    // BE: CARD_LAYOUT.teamIdY
};

/** Ảnh nền khung thẻ theo cấp bậc — khớp FRAME_FILE_BY_POSITION bên BE. */
const FRAME_BY_POSITION: Record<IdPhotoPosition, string> = {
  NEW_STAFF_1_3M: '/card-frame-white.png',
  STAFF_OVER_3M: '/card-frame-gold.png',
  LEADER: '/card-frame-navy.png',
  MANAGER: '/card-frame-red.png',
  BOD: '/card-frame-black.png',
};

export function IdCardPreview({
  employeeName,
  employeeTeam,
  employeeId,
  position,
  photoUrl,
  crop,
  onCropChange,
}: {
  employeeName: string;
  employeeTeam: string;
  employeeId: string;
  position: IdPhotoPosition;
  photoUrl: string | null;
  /** "Điều chỉnh vị trí ảnh trong khung tròn" đã lưu (null/undefined = vị trí gốc, xem crop-math.ts). */
  crop?: CropTransform | null;
  /** Có giá trị → khung tròn cho kéo thả (Pointer Events, hoạt động cả chuột lẫn chạm) để đổi
   *  `crop`. Không truyền → preview CHỈ ĐỌC (dùng cho ô lưới hàng loạt), vẫn tôn trọng `crop`
   *  đã lưu để hiển thị đúng như PDF thật sẽ ra. */
  onCropChange?: (next: CropTransform) => void;
}) {
  const opt = getPositionOption(position);
  const isLightBg = opt.color.toUpperCase() === '#FFFFFF';
  const textColor = isLightBg ? '#1F2937' : '#FFFFFF';

  return (
    <div
      className="relative w-full max-w-[340px] mx-auto rounded-2xl shadow-lg overflow-hidden [container-type:inline-size]"
      style={{
        // Khung là ẢNH THẬT (đã crop đúng tỉ lệ 420/669) thay cho bản trước vẽ bằng SVG path:
        // dải ruy băng, đường cong lõm, logo và 6 sao đều nằm sẵn trong ảnh nên không còn sai
        // số hình học, và 5 biến thể màu đồng bộ tuyệt đối vì sinh từ cùng một file gốc.
        backgroundImage: `url(${FRAME_BY_POSITION[position]})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        aspectRatio: '420 / 669',
      }}
    >
      {/* Ảnh chân dung cắt tròn, đặt đúng khung tròn rỗng có sẵn trên ảnh nền */}
      <CircleCropArea
        photoUrl={photoUrl}
        alt={employeeName}
        crop={crop}
        onCropChange={onCropChange}
        style={{ ...CARD_LAYOUT.circle, aspectRatio: '1 / 1' }}
      />

      {/* Họ tên — in hoa. (Tiền tố chức danh đã bỏ — chỉ in tên thường, khớp PDF bên BE.)
          Cỡ chữ theo `cqw` (% bề rộng thẻ) thay vì `rem` cố định: thẻ dựng ở nhiều kích cỡ
          (bước 4 luồng đơn lẻ ~340px, ô lưới batch nhỏ hơn) — dùng rem thì thẻ nhỏ bị tràn chữ,
          đè lên dòng Team/ID. 6.3cqw ≈ 1.35rem tại 340px. */}
      <h4
        className="absolute w-full px-[6%] text-center font-bold uppercase leading-tight truncate"
        style={{ top: CARD_LAYOUT.nameTop, color: textColor, fontSize: '6.3cqw' }}
      >
        {employeeName || 'Họ và tên'}
      </h4>

      {/* Team + ID CÙNG một dòng như thẻ thật */}
      <p
        className="absolute w-full px-[5%] text-center font-medium truncate"
        style={{ top: CARD_LAYOUT.teamIdTop, color: textColor, fontSize: '3.7cqw' }}
      >
        Team: {employeeTeam || '—'}&nbsp;&nbsp;&nbsp;&nbsp;ID: {employeeId || '—'}
      </p>

      {/* 6 sao KHÔNG vẽ ở đây nữa — đã có sẵn trong ảnh nền. */}
    </div>
  );
}

/**
 * Vòng tròn chân dung — vẽ ảnh theo ĐÚNG công thức `computeCropLayout` (crop-math.ts), khớp
 * tuyệt đối với PDF thật bên BE (id-photo.service.ts#drawIdCardPage dùng bản sao cùng công
 * thức). Luôn tôn trọng `crop` đã lưu (kể cả khi CHỈ ĐỌC, vd ô lưới hàng loạt) — khác bản trước
 * chỉ có `object-cover` (tương đương crop mặc định, không đổi được).
 *
 * Kéo thả bằng Pointer Events (không phải mousedown/touchstart riêng): 1 bộ handler chạy được
 * cả chuột lẫn chạm, đúng kiểu tương tác quen thuộc của crop avatar Facebook/Zalo mà không cần
 * thêm thư viện. Chỉ bật kéo khi có `onCropChange` — ô lưới hàng loạt (BulkResultGrid) truyền
 * `crop` để hiển thị đúng nhưng không truyền `onCropChange` nên vẫn chỉ đọc.
 */
function CircleCropArea({
  photoUrl,
  alt,
  crop,
  onCropChange,
  style,
}: {
  photoUrl: string | null;
  alt: string;
  crop?: CropTransform | null;
  onCropChange?: (next: CropTransform) => void;
  style: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // Kích thước THẬT (px gốc) của ảnh — chỉ biết được sau khi <img> nạp xong. Chưa có thì tạm
  // coi ảnh vuông (object-fit:cover mặc định) để không "giật hình" 1 nhịp lúc đang tải.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Ảnh đổi (vd bấm "Ghép áo lại" ra ảnh mới) → kích thước cũ không còn đúng, phải đo lại.
  useEffect(() => {
    setNatural(null);
  }, [photoUrl]);

  // Phòng vệ thêm cho ảnh đã cache/tải xong trước khi `onLoad` kịp gắn (data-URI có thể hoàn
  // tất trong cùng lượt commit) — `img.complete` luôn đúng bất kể `onLoad` có bắn hay không. Đã
  // verify bằng Playwright thật: `onLoad` vẫn bắn bình thường ở luồng chính đang dùng, giữ nhánh
  // này chỉ để chắc chắn cho các trường hợp tải nhanh bất thường khác, không phải nguyên nhân
  // bug "lưới không cập nhật crop" đã báo — xem BulkPersonRow (BulkEmployeeCard.tsx) cho nguyên
  // nhân THẬT của bug đó.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setNatural({ w: el.naturalWidth, h: el.naturalHeight });
    }
  }, [photoUrl]);

  const value = crop ?? CROP_DEFAULT;
  const layout = natural ? computeCropLayout(natural.w, natural.h, value) : null;
  const interactive = Boolean(onCropChange && natural);

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!onCropChange || !natural) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startOffsetX: value.offsetX, startOffsetY: value.offsetY };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !onCropChange || !natural || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    // Khung LUÔN là hình vuông (aspectRatio 1/1) nên chia theo width/height riêng vẫn ra cùng
    // 1 tỉ lệ — chia riêng để chịu được sai số bo tròn pixel của trình duyệt.
    const dxFrac = (e.clientX - drag.startX) / rect.width;
    const dyFrac = (e.clientY - drag.startY) / rect.height;
    const { offsetX, offsetY } = clampCropOffset(natural.w, natural.h, value.scale, drag.startOffsetX + dxFrac, drag.startOffsetY + dyFrac);
    onCropChange({ offsetX, offsetY, scale: value.scale });
  };

  const endDrag = (e: React.PointerEvent<HTMLImageElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      setDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer đã bị huỷ (vd rời trang giữa chừng) — không sao */
      }
    }
  };

  return (
    <div ref={containerRef} className="absolute rounded-full overflow-hidden bg-[#f6f3f5]" style={style}>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={photoUrl}
          alt={alt}
          draggable={false}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute select-none touch-none"
          style={
            layout
              ? {
                  left: `${layout.x * 100}%`,
                  top: `${layout.y * 100}%`,
                  width: `${layout.width * 100}%`,
                  height: `${layout.height * 100}%`,
                  maxWidth: 'none',
                  cursor: interactive ? (dragging ? 'grabbing' : 'grab') : undefined,
                }
              : { inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
          }
        />
      )}
    </div>
  );
}

/**
 * Thanh trượt zoom + nút "Đặt lại vị trí gốc" cho "Điều chỉnh vị trí ảnh trong khung tròn".
 * KHÔNG cần biết kích thước ảnh thật: đổi `scale` chỉ đổi khoảng kéo TỐI ĐA cho phép, còn
 * offset đã lưu vẫn được `computeCropLayout` tự kẹp lại đúng khi vẽ (xem crop-math.ts) — dù giá
 * trị lưu tạm có vượt biên mới, preview/PDF không bao giờ hở viền trắng.
 */
export function CropControls({
  crop,
  onChange,
  disabled,
}: {
  crop?: CropTransform | null;
  onChange: (next: CropTransform) => void;
  disabled?: boolean;
}) {
  const value = crop ?? CROP_DEFAULT;
  const isDefault = value.offsetX === 0 && value.offsetY === 0 && value.scale === CROP_SCALE_MIN;

  return (
    <div className="rounded-xl border border-[#e2e0ea] bg-[#fafafb] px-3.5 py-3 space-y-2.5">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#464554]">
        <Move className="w-3.5 h-3.5 flex-none" />
        Kéo ảnh trong khung tròn để chỉnh vị trí — dùng thanh trượt để phóng to/nhỏ
      </div>
      <div className="flex items-center gap-2.5">
        <ZoomOut className="w-4 h-4 flex-none text-[#9c9aa8]" />
        <input
          type="range"
          min={CROP_SCALE_MIN}
          max={CROP_SCALE_MAX}
          step={0.01}
          value={value.scale}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, scale: Number(e.target.value) })}
          className="flex-1 accent-[#4441cc] disabled:opacity-40"
          aria-label="Phóng to/nhỏ ảnh trong khung tròn"
        />
        <ZoomIn className="w-4 h-4 flex-none text-[#9c9aa8]" />
        <button
          type="button"
          onClick={() => onChange(CROP_DEFAULT)}
          disabled={disabled || isDefault}
          title="Đặt lại vị trí gốc — ảnh phủ khít khung, không lệch tâm"
          className="flex-none px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Đặt lại vị trí gốc
        </button>
      </div>
    </div>
  );
}

/**
 * Bước 4 — xem lại thẻ và xuất PDF, kèm HAI đường sửa tại chỗ để không phải "Làm lại từ đầu"
 * chỉ vì một lỗi nhỏ:
 *
 *   "Sửa thông tin" → PATCH /id-photo/:id. MIỄN PHÍ, không đụng AI (ảnh giữ nguyên).
 *   "Ghép áo lại"   → POST /id-photo/:id/remerge-outfit. TỐN 1 lượt Gemini, nên phải qua một
 *                     nhịp xác nhận có cảnh báo chi phí, không cho bấm nhầm phát là chạy luôn.
 *
 * Panel sửa thông tin hiện NGAY TRÊN bước 4 (không chuyển về bước 3) — quay về bước 3 sẽ đi
 * lại POST /id-photo/create với uploadId đã bị xoá, xem ghi chú ở Stepper#navLocked.
 */
export function ExportStep({
  employeeName,
  employeeTeam,
  employeeId,
  position,
  photoUrl,
  isExportingPdf,
  isDownloading,
  pdfBlobUrl,
  popupBlocked,
  pdfFileName,
  isEditingInfo,
  editValues,
  isUpdatingInfo,
  isRemerging,
  onStartEditInfo,
  onChangeEditValues,
  onCancelEditInfo,
  onSubmitEditInfo,
  onRemergeOutfit,
  onExportAndDownload,
  onRestart,
  crop,
  cropDirty,
  isSavingCrop,
  onCropChange,
  onSaveCrop,
}: {
  employeeName: string;
  employeeTeam: string;
  employeeId: string;
  position: IdPhotoPosition;
  photoUrl: string | null;
  isExportingPdf: boolean;
  isDownloading: boolean;
  /** Có giá trị sau khi xuất thành công — dùng cho cả nút mở lại lẫn nút tải xuống. */
  pdfBlobUrl: string | null;
  /** Trình duyệt đã chặn tab tự mở → phải để người dùng tự bấm. */
  popupBlocked: boolean;
  pdfFileName: string;
  /** Đang mở panel sửa thông tin → hiện form thay vì các ô chỉ đọc. */
  isEditingInfo: boolean;
  /** Bản nháp đang sửa — TÁCH khỏi giá trị đã lưu để bấm "Huỷ" là bỏ sạch thay đổi. */
  editValues: EmployeeInfoValues;
  isUpdatingInfo: boolean;
  isRemerging: boolean;
  onStartEditInfo: () => void;
  onChangeEditValues: (patch: Partial<EmployeeInfoValues>) => void;
  onCancelEditInfo: () => void;
  onSubmitEditInfo: () => void;
  onRemergeOutfit: () => void;
  onExportAndDownload: () => void;
  onRestart: () => void;
  /** "Điều chỉnh vị trí ảnh trong khung tròn" — bản nháp đang chỉnh (kéo/zoom cập nhật ngay). */
  crop: CropTransform;
  /** true = khác bản ĐÃ LƯU trong DB — hiện nút "Lưu vị trí ảnh". */
  cropDirty: boolean;
  isSavingCrop: boolean;
  onCropChange: (next: CropTransform) => void;
  onSaveCrop: () => void;
}) {
  const [confirmingRemerge, setConfirmingRemerge] = useState(false);

  // Đang sửa thì preview chạy theo BẢN NHÁP — người dùng thấy ngay thẻ sẽ ra thế nào trước khi
  // bấm "Cập nhật", đúng thứ họ đang muốn kiểm chứng (vd tên dài có bị co chữ không).
  const shown = isEditingInfo
    ? editValues
    : { employeeName, employeeTeam, employeeId, position };

  const opt = getPositionOption(shown.position);
  const isExporting = isExportingPdf || isDownloading;
  // Mọi thao tác nặng khoá lẫn nhau: đang ghép lại ảnh mà bấm xuất PDF thì file ra là ảnh cũ,
  // còn đang cập nhật chữ mà xuất PDF thì ra thông tin chưa lưu.
  const busy = isExporting || isUpdatingInfo || isRemerging || isSavingCrop;
  // Các nút phụ (Sửa thông tin / Ghép áo lại / Làm lại từ đầu) bị khoá theo `busy` nhưng KHÔNG
  // phải là thao tác đang chạy, nên không thể gắn spinner lên chúng — spinner phải nằm đúng ở
  // nút đang xử lý. Thay vào đó nói rõ lý do bị khoá qua tooltip: trước đây chúng chỉ mờ đi và
  // người dùng không biết mình đang chờ cái gì.
  const busyHint = isRemerging
    ? 'Đang ghép áo lại, vui lòng đợi...'
    : isUpdatingInfo
    ? 'Đang cập nhật thông tin, vui lòng đợi...'
    : isSavingCrop
    ? 'Đang lưu vị trí ảnh, vui lòng đợi...'
    : isExporting
    ? 'Đang tạo file PDF, vui lòng đợi...'
    : null;

  return (
    <div className="space-y-6">
      {/* ── Panel SỬA THÔNG TIN — full width phía trên để form 2 cột (giống hệt bước 3) có đủ
          chỗ, thay vì nhét vào nửa cột trái. ───────────────────────────────────────────── */}
      {isEditingInfo && (
        <div className="border-2 border-[#4441cc] rounded-2xl bg-white p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-bold text-[#1b1b1d]">Sửa thông tin thẻ</h3>
              <p className="text-xs text-[#9c9aa8] mt-0.5">
                Chỉ cập nhật chữ in trên thẻ — <span className="font-semibold text-[#464554]">không tạo lại ảnh</span>,
                không tốn thêm chi phí AI. Xem trước thay đổi ở khung thẻ bên dưới.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancelEditInfo}
              disabled={isUpdatingInfo}
              className="flex-none p-1.5 rounded-lg text-[#9c9aa8] hover:text-[#1b1b1d] hover:bg-[#f6f3f5] disabled:opacity-40 transition-colors"
              aria-label="Đóng panel sửa thông tin"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <EmployeeInfoFields
            values={editValues}
            disabled={isUpdatingInfo}
            radioGroupName="position-edit"
            onChange={onChangeEditValues}
          />

          <div className="flex justify-end gap-2.5 mt-8">
            <button
              type="button"
              onClick={onCancelEditInfo}
              disabled={isUpdatingInfo}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-40 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={!isEmployeeInfoValid(editValues) || isUpdatingInfo}
              onClick={onSubmitEditInfo}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isUpdatingInfo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Cập nhật'
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Thông tin thẻ */}
        <div className="border border-[#e2e0ea] rounded-2xl bg-white p-6 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-bold text-[#1b1b1d]">Thông tin thẻ</h3>
            {/* Đường sửa MIỄN PHÍ — thay cho việc phải "Làm lại từ đầu" chỉ vì gõ sai một chữ. */}
            <button
              type="button"
              onClick={onStartEditInfo}
              disabled={isEditingInfo || busy}
              title={isEditingInfo ? 'Panel sửa thông tin đang mở' : busyHint ?? 'Sửa chữ in trên thẻ — không tạo lại ảnh, không tốn chi phí AI'}
              className="flex-none px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Sửa thông tin
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#464554] mb-1.5">Tên nhân viên</label>
              <input
                readOnly
                value={shown.employeeName}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e0ea] bg-[#fafafb] text-sm text-[#1b1b1d] cursor-default"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#464554] mb-1.5">Team / Khối</label>
                <input
                  readOnly
                  value={shown.employeeTeam}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e0ea] bg-[#fafafb] text-sm text-[#1b1b1d] cursor-default"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#464554] mb-1.5">Mã nhân viên (ID)</label>
                <input
                  readOnly
                  value={shown.employeeId}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e0ea] bg-[#fafafb] text-sm text-[#1b1b1d] cursor-default"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#464554] mb-1.5">
                Cấp bậc / Vị trí (Quy định màu nền)
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e0ea] bg-[#fafafb] text-sm text-[#1b1b1d]">
                {opt.label}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 space-y-2.5">
            <button
              type="button"
              disabled={busy || isEditingInfo}
              onClick={onExportAndDownload}
              title={isEditingInfo ? 'Lưu hoặc huỷ thay đổi ở panel sửa thông tin trước đã' : busyHint ?? 'Dựng file PDF 1 trang, sẵn sàng để in'}
              className="w-full px-5 py-3 rounded-xl font-semibold text-sm text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {isExporting ? 'Đang tạo file PDF...' : pdfBlobUrl ? 'Xuất lại file PDF' : 'Xuất file PDF'}
            </button>

            {/* Cảnh báo popup bị chặn — không có khối này thì người dùng chỉ thấy toast báo
                thành công mà không có file nào hiện ra, không biết phải làm gì tiếp. */}
            {popupBlocked && pdfBlobUrl && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3">
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Trình duyệt đã chặn mở tab tự động. Bấm nút bên dưới để mở file.
                </p>
                <a
                  href={pdfBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full px-4 py-2 rounded-lg font-semibold text-xs text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở file PDF
                </a>
              </div>
            )}

            {/* Tải thẳng về máy — đường thoát chắc chắn nhất, không phụ thuộc popup. */}
            {pdfBlobUrl && (
              <a
                href={pdfBlobUrl}
                download={pdfFileName}
                className="w-full px-5 py-2.5 rounded-xl font-semibold text-sm border-2 border-[#4441cc] text-[#4441cc] hover:bg-[#4441cc]/5 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Tải xuống PDF
              </a>
            )}

            <p className="text-[11px] text-[#9c9aa8] text-center">
              {pdfBlobUrl
                ? 'File PDF 1 trang, sẵn sàng để in. Dùng "Tải xuống PDF" để lưu về máy.'
                : 'File PDF sẽ chứa 1 trang duy nhất cho ảnh thẻ này, sẵn sàng để in ấn.'}
            </p>

            {/* ── Ghép áo lại — đường sửa CÓ TỐN CHI PHÍ ───────────────────────────────────
                Cảnh báo hiện SẴN (không giấu sau tooltip/hover) và bắt xác nhận thêm một
                nhịp: mỗi lần bấm là đúng 1 lượt Gemini, khác hẳn "Sửa thông tin" vốn miễn phí. */}
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-none mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Ảnh bị lỗi bố cục (vd đỉnh đầu bị che)? Bấm &quot;Ghép áo lại&quot; để AI dựng lại ảnh từ đúng ảnh
                  gốc bạn đã tải lên.{' '}
                  <span className="font-semibold">
                    Việc này sẽ tạo lại ảnh bằng AI, có thể tốn thêm chi phí. Ảnh mới có thể khác ảnh cũ.
                  </span>
                </p>
              </div>

              {confirmingRemerge ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingRemerge(false)}
                    disabled={isRemerging}
                    className="flex-1 px-3 py-2 rounded-lg font-semibold text-xs border border-amber-400 text-amber-900 hover:bg-amber-100 disabled:opacity-40 transition-colors"
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingRemerge(false);
                      onRemergeOutfit();
                    }}
                    disabled={isRemerging}
                    className="flex-1 px-3 py-2 rounded-lg font-semibold text-xs text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 transition-colors"
                  >
                    Tôi hiểu, ghép lại
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingRemerge(true)}
                  disabled={busy || isEditingInfo}
                  title={isEditingInfo ? 'Lưu hoặc huỷ thay đổi ở panel sửa thông tin trước đã' : busyHint ?? 'AI dựng lại ảnh từ ảnh gốc — tốn 1 lượt Gemini'}
                  className="w-full px-4 py-2 rounded-lg font-semibold text-xs border border-amber-400 text-amber-900 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                >
                  {isRemerging ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang ghép áo lại...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Ghép áo lại
                    </>
                  )}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onRestart}
              disabled={busy}
              title={busyHint ?? 'Xoá sạch và bắt đầu lại từ bước chọn ảnh'}
              className="w-full px-5 py-2.5 rounded-xl font-semibold text-sm border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Làm lại từ đầu
            </button>
          </div>
        </div>

        {/* Preview thẻ */}
        <div className="space-y-3">
          <div className="relative border border-[#e2e0ea] rounded-2xl bg-[#fafafb] p-6 flex items-center justify-center">
            <IdCardPreview
              employeeName={shown.employeeName}
              employeeTeam={shown.employeeTeam}
              employeeId={shown.employeeId}
              position={shown.position}
              photoUrl={photoUrl}
              crop={crop}
              onCropChange={photoUrl && !busy ? onCropChange : undefined}
            />

            {/* Che preview trong lúc AI dựng ảnh mới — ảnh đang hiện là ảnh CŨ sắp bị thay, để
                trần thì người dùng tưởng đã xong rồi bấm xuất PDF ra ảnh cũ. */}
            {isRemerging && (
              <div className="absolute inset-0 rounded-2xl bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#4441cc]" />
                <p className="text-xs font-semibold text-[#1b1b1d]">AI đang ghép áo lại...</p>
                <p className="text-[11px] text-[#9c9aa8]">Thường mất 10-30 giây, vui lòng không đóng trang.</p>
              </div>
            )}
          </div>

          {/* "Điều chỉnh vị trí ảnh trong khung tròn" — LUÔN hiện ở đây (không giấu sau nút
              riêng, khác panel "Sửa thông tin"): đây chính là chỗ người dùng phát hiện đầu/tóc
              bị cắt khi vừa xem preview, sửa ngay tại chỗ thay vì phải tìm nút ẩn ở đâu đó. */}
          {photoUrl && (
            <>
              <CropControls crop={crop} onChange={onCropChange} disabled={busy} />
              {cropDirty && (
                <button
                  type="button"
                  onClick={onSaveCrop}
                  disabled={busy}
                  title={busyHint ?? 'Lưu vị trí ảnh — PDF xuất sau đó sẽ dùng đúng vị trí này'}
                  className="w-full px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isSavingCrop ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isSavingCrop ? 'Đang lưu vị trí ảnh...' : 'Lưu vị trí ảnh'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
