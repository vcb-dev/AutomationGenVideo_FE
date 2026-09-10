'use client';

import { useRef, type ReactNode } from 'react';
import { Plus, X, UploadCloud, Loader2, CheckCircle2, AlertTriangle, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE_BYTES, getPositionOption, IdPhotoPosition } from './constants';
import { EmployeeInfoFields, EmployeeInfoValues } from './EmployeeInfoFields';
import { IdPhotoItemStatus } from '../bulk/id-photo-batch';

export interface BulkCardModel {
  key: string;
  file: File | null;
  previewUrl: string | null;
  values: EmployeeInfoValues;
}

// ─── Card form (giai đoạn nhập liệu, trước khi bấm "Tạo hàng loạt") ──────────
//
// Dùng LẠI y hệt style luồng đơn lẻ: khung `border border-[#e2e0ea] rounded-2xl bg-white`
// (UploadStep/InfoStep), ô upload nét đứt `bg-[#fcfaff]` (UploadStep), và toàn bộ phần
// tên/team/mã + dropdown Vị trí là component `EmployeeInfoFields` NGUYÊN BẢN — không
// tự dựng input/dropdown mới.

export function BulkEmployeeCard({
  index,
  model,
  disabled,
  onChangeFile,
  onChangeValues,
  onAddAfter,
  onRemove,
}: {
  index: number;
  model: BulkCardModel;
  disabled?: boolean;
  onChangeFile: (file: File) => void;
  onChangeValues: (patch: Partial<EmployeeInfoValues>) => void;
  onAddAfter: () => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
      toast.error(`Chỉ nhận ảnh JPG/PNG. "${f.name}" là ${f.type || 'không rõ định dạng'}.`);
      return;
    }
    if (f.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error(`"${f.name}" nặng ${(f.size / (1024 * 1024)).toFixed(1)}MB, vượt giới hạn 10MB.`);
      return;
    }
    onChangeFile(f);
  };

  // Nút icon +/x — cùng kích thước ô đóng modal của luồng đơn lẻ (ExportStep: w-8 h-8 rounded-lg).
  const iconBtn =
    'w-8 h-8 rounded-lg border border-[#d5d3e0] text-[#464554] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  // Header khối — DÙNG CHUNG một cấp với "Thông tin cơ bản" / "Vị trí công tác" trong
  // EmployeeInfoFields (text-base font-bold + gạch chân), để 3 khối trong card đồng bộ.
  const sectionHead = 'text-base font-bold text-[#1b1b1d] mb-4 pb-3 border-b border-[#e2e0ea]';

  return (
    <div className="border border-[#e2e0ea] rounded-2xl bg-white p-6">
      {/* Nhãn card — nhỏ, in hoa, xám: là ĐỊNH DANH card, không cùng cấp với header khối bên dưới. */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e2e0ea]">
        <span className="text-xs font-bold uppercase tracking-wide text-[#9c9aa8]">Nhân viên {index + 1}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={onAddAfter}
            title="Thêm 1 nhân viên ngay bên dưới"
            className={`${iconBtn} hover:border-[#4441cc] hover:text-[#4441cc]`}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            title="Xoá nhân viên này khỏi danh sách"
            className={`${iconBtn} hover:border-[#dc2626] hover:text-[#dc2626]`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Khối 1 — Ảnh gốc (nét đứt, nền #fcfaff, icon UploadCloud như UploadStep) */}
      <div className="mb-6">
        <h3 className={sectionHead}>Ảnh gốc</h3>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
          onChange={(e) => pickFile(e.target.files)}
        />
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!disabled) pickFile(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-[#d5d3e0] hover:border-[#4441cc] rounded-2xl h-[240px] flex flex-col items-center justify-center bg-[#fcfaff] transition-colors text-center px-6 overflow-hidden"
        >
          {model.previewUrl ? (
            <div className="relative w-full h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={model.previewUrl} alt="Ảnh gốc" className="w-full h-full object-contain" />
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-white/90 border border-[#d5d3e0] text-xs font-semibold text-[#4441cc] hover:bg-white disabled:opacity-40"
              >
                Đổi ảnh
              </button>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-[#4441cc]/10 flex items-center justify-center mb-4">
                <UploadCloud className="w-6 h-6 text-[#4441cc]" />
              </div>
              <p className="text-sm text-[#1b1b1d]">
                Kéo thả ảnh chân dung vào đây hoặc{' '}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                  className="text-[#4441cc] font-semibold underline underline-offset-2 disabled:opacity-40"
                >
                  duyệt file
                </button>
              </p>
              <p className="text-xs text-[#9c9aa8] mt-1">Hỗ trợ JPG, PNG. Dung lượng tối đa 10MB.</p>
            </>
          )}
        </div>
      </div>

      {/* Khối 2 + 3 — Thông tin cơ bản / Vị trí công tác: component NGUYÊN BẢN của luồng đơn lẻ.
          Ép về 1 CỘT (`[&>div]:!grid-cols-1`): trong card hẹp ~540px, để 2 cột md:grid-cols-2
          mặc định của EmployeeInfoFields sẽ chật, nhãn radio xuống dòng + dải màu bị cắt góc.
          Xếp dọc "Thông tin cơ bản" rồi "Vị trí công tác" gọn hơn hẳn. Luồng đơn lẻ (panel
          rộng) không bị ảnh hưởng vì override chỉ ở đây. */}
      <div className="[&>div]:!grid-cols-1 [&>div]:!gap-6">
        <EmployeeInfoFields
          values={model.values}
          disabled={disabled}
          radioGroupName={`position-${model.key}`}
          onChange={onChangeValues}
        />
      </div>
    </div>
  );
}

// ─── Dòng thu gọn (sau khi submit — xem lại kết quả) ────────────────────────

const STATUS_META: Record<
  IdPhotoItemStatus,
  { label: string; className: string; icon: ReactNode }
> = {
  PENDING: {
    label: 'Chờ xử lý',
    className: 'text-[#9c9aa8] bg-[#f4f4f6]',
    icon: <span className="w-2 h-2 rounded-full bg-[#c7c4d7]" />,
  },
  PROCESSING: {
    label: 'Đang xử lý',
    className: 'text-[#4441cc] bg-[#4441cc]/10',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  SUCCESS: {
    label: 'Hoàn tất',
    className: 'text-[#0f8f4c] bg-[#0f8f4c]/10',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  FAILED: {
    label: 'Lỗi',
    className: 'text-[#dc2626] bg-[#dc2626]/10',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

export function BulkPersonRow({
  name,
  position,
  status,
  thumbUrl,
  onEdit,
}: {
  name: string;
  position: IdPhotoPosition;
  status: IdPhotoItemStatus;
  thumbUrl?: string | null;
  /** Chỉ truyền khi status SUCCESS/FAILED — hiện nút "Sửa". */
  onEdit?: () => void;
}) {
  const meta = STATUS_META[status];
  const posColor = getPositionOption(position).color;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#e2e0ea] bg-white px-3.5 py-2.5">
      <div
        className="w-9 h-9 rounded-full flex-none overflow-hidden border bg-[#f4f4f6] flex items-center justify-center"
        style={{ borderColor: posColor === '#FFFFFF' ? '#e2e0ea' : posColor }}
      >
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={name} className="w-full h-full object-cover" />
        ) : status === 'PROCESSING' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4441cc]" />
        ) : (
          <span className="text-[11px] font-bold text-[#9c9aa8]">{(name.trim()[0] || '?').toUpperCase()}</span>
        )}
      </div>
      <span className="text-sm font-medium text-[#1b1b1d] truncate flex-1">{name.trim() || '(chưa có tên)'}</span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
      >
        {meta.icon}
        {meta.label}
      </span>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-lg border border-[#d5d3e0] px-2.5 py-1 text-xs font-semibold text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Sửa
        </button>
      )}
    </div>
  );
}
