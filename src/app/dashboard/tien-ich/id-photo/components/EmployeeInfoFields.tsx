'use client';

import { POSITION_OPTIONS, IdPhotoPosition } from './constants';

export interface EmployeeInfoValues {
  employeeName: string;
  employeeTeam: string;
  employeeId: string;
  employeeTitlePrefix: string;
  position: IdPhotoPosition;
}

/** Đủ để bật nút submit: 3 field bắt buộc in trên thẻ. Tiền tố chức danh là tuỳ chọn nên
 * KHÔNG tính vào đây (khớp CreateIdPhotoDto/UpdateIdPhotoDto bên BE). Dùng chung cho cả bước 3
 * lẫn panel "Sửa thông tin" ở bước 4 để hai nơi không lệch điều kiện hợp lệ. */
export function isEmployeeInfoValid(v: EmployeeInfoValues): boolean {
  return Boolean(v.employeeName.trim() && v.employeeTeam.trim() && v.employeeId.trim());
}

/**
 * 4 ô nhập + chọn cấp bậc — phần THÂN dùng chung của bước 3 (InfoStep, lúc tạo mới) và panel
 * "Sửa thông tin" ở bước 4 (ExportStep, lúc sửa bản ghi đã tạo).
 *
 * Tách ra để hai nơi không bao giờ lệch nhau: thêm/bớt một field, đổi maxLength hay đổi
 * POSITION_OPTIONS chỉ phải sửa đúng một chỗ. Component này CHỈ hiển thị — không giữ state,
 * không gọi API, không có nút bấm; mỗi nơi dùng tự dựng footer nút của riêng mình
 * ("Tiếp tục" ở bước 3, "Cập nhật"/"Huỷ" ở bước 4).
 */
export function EmployeeInfoFields({
  values,
  disabled = false,
  radioGroupName = 'position',
  onChange,
}: {
  values: EmployeeInfoValues;
  /** Khoá toàn bộ form trong lúc đang gửi request, tránh sửa tiếp giữa chừng. */
  disabled?: boolean;
  /** Tên nhóm radio — phải KHÁC nhau nếu có 2 form cùng hiển thị một lúc, nếu không trình
   * duyệt gộp chung nhóm và bỏ chọn chéo lẫn nhau. */
  radioGroupName?: string;
  onChange: (patch: Partial<EmployeeInfoValues>) => void;
}) {
  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-[#d5d3e0] focus:border-[#4441cc] focus:ring-2 focus:ring-[#4441cc]/10 outline-none text-sm text-[#1b1b1d] placeholder-[#9c9aa8] transition-all disabled:bg-[#fafafb] disabled:text-[#9c9aa8]';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Thông tin cơ bản */}
      <div>
        <h3 className="text-base font-bold text-[#1b1b1d] mb-4 pb-3 border-b border-[#e2e0ea]">Thông tin cơ bản</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#464554] mb-1.5">Họ và tên</label>
            <input
              type="text"
              value={values.employeeName}
              disabled={disabled}
              onChange={(e) => onChange({ employeeName: e.target.value })}
              placeholder="Nhập họ và tên..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#464554] mb-1.5">Team / Phòng ban</label>
            <input
              type="text"
              value={values.employeeTeam}
              disabled={disabled}
              onChange={(e) => onChange({ employeeTeam: e.target.value })}
              placeholder="Nhập team / phòng ban..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#464554] mb-1.5">Mã nhân viên (ID)</label>
            <input
              type="text"
              value={values.employeeId}
              disabled={disabled}
              onChange={(e) => onChange({ employeeId: e.target.value })}
              placeholder="VD: VCB12345"
              className={inputClass}
            />
          </div>
          {/* Tuỳ chọn — bỏ trống thì thẻ chỉ in tên, KHÔNG chặn nút submit (xem isEmployeeInfoValid) */}
          <div>
            <label className="block text-xs font-semibold text-[#464554] mb-1.5">
              Tiền tố chức danh <span className="font-normal text-[#9c9aa8]">(không bắt buộc)</span>
            </label>
            <input
              type="text"
              value={values.employeeTitlePrefix}
              disabled={disabled}
              onChange={(e) => onChange({ employeeTitlePrefix: e.target.value })}
              placeholder="VD: HĐ."
              maxLength={20}
              className={inputClass}
            />
            <p className="text-[11px] text-[#9c9aa8] mt-1">In trước tên trên thẻ, ví dụ &quot;HĐ. BẢO VIỆT&quot;.</p>
          </div>
        </div>
      </div>

      {/* Vị trí công tác */}
      <div>
        <h3 className="text-base font-bold text-[#1b1b1d] mb-1 pb-3 border-b border-[#e2e0ea]">Vị trí công tác</h3>
        <p className="text-xs text-[#9c9aa8] mt-3 mb-3">Vị trí sẽ quyết định màu viền thẻ của bạn.</p>
        <div className="space-y-2.5">
          {POSITION_OPTIONS.map((opt) => {
            const isSelected = values.position === opt.value;
            return (
              <label
                key={opt.value}
                className={`relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border transition-colors overflow-hidden ${
                  disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                } ${isSelected ? 'border-[#4441cc] bg-[#4441cc]/5' : 'border-[#e2e0ea] hover:border-[#c7c4d7]'}`}
              >
                <input
                  type="radio"
                  name={radioGroupName}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => onChange({ position: opt.value })}
                  className="w-4 h-4 accent-[#4441cc] flex-none"
                />
                <span className="text-sm font-medium text-[#1b1b1d]">{opt.label}</span>
                {/* Dải màu trang trí — KHÔNG hiện tên màu, chỉ gợi ý trực quan (khớp mockup) */}
                <span
                  className="absolute right-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: opt.color, opacity: opt.color === '#FFFFFF' ? 0 : 1 }}
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
