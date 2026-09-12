'use client';

import { useState } from 'react';
import { FileDown, RotateCcw, Loader2, Download, ExternalLink, Pencil, Sparkles, AlertTriangle, X } from 'lucide-react';
import { getPositionOption, IdPhotoPosition } from './constants';
import { EmployeeInfoFields, EmployeeInfoValues, isEmployeeInfoValid } from './EmployeeInfoFields';

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
  employeeTitlePrefix,
  position,
  photoUrl,
}: {
  employeeName: string;
  employeeTeam: string;
  employeeId: string;
  employeeTitlePrefix?: string;
  position: IdPhotoPosition;
  photoUrl: string | null;
}) {
  const opt = getPositionOption(position);
  const isLightBg = opt.color.toUpperCase() === '#FFFFFF';
  const textColor = isLightBg ? '#1F2937' : '#FFFFFF';

  return (
    <div
      className="relative w-full max-w-[340px] mx-auto rounded-2xl shadow-lg overflow-hidden"
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
      <div
        className="absolute rounded-full overflow-hidden bg-[#f6f3f5]"
        style={{ ...CARD_LAYOUT.circle, aspectRatio: '1 / 1' }}
      >
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={employeeName} className="w-full h-full object-cover" />
        )}
      </div>

      {/* Họ tên — in hoa, ghép tiền tố chức danh nếu có */}
      <h4
        className="absolute w-full px-5 text-center text-[1.35rem] font-bold uppercase leading-tight"
        style={{ top: CARD_LAYOUT.nameTop, color: textColor }}
      >
        {[employeeTitlePrefix?.trim(), employeeName].filter(Boolean).join(' ') || 'Họ và tên'}
      </h4>

      {/* Team + ID CÙNG một dòng như thẻ thật */}
      <p
        className="absolute w-full px-4 text-center text-[0.8rem] font-medium"
        style={{ top: CARD_LAYOUT.teamIdTop, color: textColor }}
      >
        Team: {employeeTeam || '—'}&nbsp;&nbsp;&nbsp;&nbsp;ID: {employeeId || '—'}
      </p>

      {/* 6 sao KHÔNG vẽ ở đây nữa — đã có sẵn trong ảnh nền. */}
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
  employeeTitlePrefix,
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
}: {
  employeeName: string;
  employeeTeam: string;
  employeeId: string;
  employeeTitlePrefix?: string;
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
}) {
  const [confirmingRemerge, setConfirmingRemerge] = useState(false);

  // Đang sửa thì preview chạy theo BẢN NHÁP — người dùng thấy ngay thẻ sẽ ra thế nào trước khi
  // bấm "Cập nhật", đúng thứ họ đang muốn kiểm chứng (vd tên dài có bị co chữ không).
  const shown = isEditingInfo
    ? editValues
    : { employeeName, employeeTeam, employeeId, employeeTitlePrefix: employeeTitlePrefix ?? '', position };

  const opt = getPositionOption(shown.position);
  const isExporting = isExportingPdf || isDownloading;
  // Mọi thao tác nặng khoá lẫn nhau: đang ghép lại ảnh mà bấm xuất PDF thì file ra là ảnh cũ,
  // còn đang cập nhật chữ mà xuất PDF thì ra thông tin chưa lưu.
  const busy = isExporting || isUpdatingInfo || isRemerging;
  // Các nút phụ (Sửa thông tin / Ghép áo lại / Làm lại từ đầu) bị khoá theo `busy` nhưng KHÔNG
  // phải là thao tác đang chạy, nên không thể gắn spinner lên chúng — spinner phải nằm đúng ở
  // nút đang xử lý. Thay vào đó nói rõ lý do bị khoá qua tooltip: trước đây chúng chỉ mờ đi và
  // người dùng không biết mình đang chờ cái gì.
  const busyHint = isRemerging
    ? 'Đang ghép áo lại, vui lòng đợi...'
    : isUpdatingInfo
    ? 'Đang cập nhật thông tin, vui lòng đợi...'
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
                value={[shown.employeeTitlePrefix?.trim(), shown.employeeName].filter(Boolean).join(' ')}
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
        <div className="relative border border-[#e2e0ea] rounded-2xl bg-[#fafafb] p-6 flex items-center justify-center">
          <IdCardPreview
            employeeName={shown.employeeName}
            employeeTeam={shown.employeeTeam}
            employeeId={shown.employeeId}
            employeeTitlePrefix={shown.employeeTitlePrefix}
            position={shown.position}
            photoUrl={photoUrl}
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
      </div>
    </div>
  );
}
