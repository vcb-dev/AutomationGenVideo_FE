/**
 * Design system của vòng quay.
 *
 * Một màu nhấn duy nhất (#F4B63D) chỉ dùng cho tab đang chọn, nút hành động chính, counter,
 * badge active, mũi tên vòng quay và focus input. Phần còn lại là màu trung tính — đó là thứ
 * tạo cảm giác cao cấp, không phải việc dùng nhiều màu.
 */

/* ── Màu ───────────────────────────────────────────────────────────── */
export const PRIMARY = '#F4B63D';
export const PRIMARY_HOVER = '#E9A616';
export const PRIMARY_LIGHT = '#FFF8E7';
export const PAGE_BG = '#F8FAFC';
export const BORDER = '#E8EBEF';
export const TEXT_MAIN = '#111827';
export const TEXT_MUTED = '#6B7280';

/* ── Bề mặt ────────────────────────────────────────────────────────── */
export const cardClass =
  'rounded-[18px] border border-[#E8EBEF] bg-white p-6 shadow-[0_4px_14px_rgba(0,0,0,0.04)] ' +
  'dark:border-white/[0.07] dark:bg-[#141821] dark:shadow-none';

/** Card có phản hồi khi rê chuột — dùng cho panel bấm được, không dùng cho panel chỉ đọc. */
export const cardHoverClass =
  'transition-all duration-[250ms] ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(17,24,39,0.07)]';

/* ── Form ──────────────────────────────────────────────────────────── */
export const inputClass =
  'h-11 w-full rounded-xl border border-[#DCE1E7] bg-white px-3.5 text-[15px] text-[#111827] ' +
  'placeholder:text-[#9CA3AF] outline-none transition-all duration-[250ms] ease-out ' +
  'focus:border-[#F4B63D] focus:shadow-[0_0_0_3px_rgba(244,182,61,0.15)] ' +
  'disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#9CA3AF] ' +
  'dark:border-white/[0.09] dark:bg-white/[0.03] dark:text-gray-100 dark:disabled:bg-white/[0.02]';

/** Select bỏ mũi tên mặc định của trình duyệt, tự vẽ lại cho khớp bộ input. */
export const selectClass =
  `${inputClass} cursor-pointer appearance-none bg-no-repeat pr-10 ` +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")] " +
  'bg-[position:right_14px_center]';

export const fileInputClass =
  'w-full cursor-pointer text-[13px] text-[#6B7280] transition-colors ' +
  'file:mr-3 file:cursor-pointer file:rounded-[10px] file:border file:border-[#D6DAE1] file:bg-white ' +
  'file:px-3.5 file:py-2 file:text-[13px] file:font-medium file:text-[#111827] file:transition-colors ' +
  'hover:file:border-[#F4B63D] hover:file:bg-[#FFF8E7] ' +
  'dark:text-gray-400 dark:file:border-white/10 dark:file:bg-white/[0.04] dark:file:text-gray-200';

/** Caption 13px/500 — nhãn trường nhập liệu, cách ô nhập 8px. */
export const fieldLabelClass = 'mb-2 block text-[13px] font-medium text-[#6B7280] dark:text-gray-400';

export const hintClass = 'text-[13px] leading-relaxed text-[#6B7280] dark:text-gray-400';

/* ── Typography ────────────────────────────────────────────────────── */
export const pageTitleClass = 'text-[36px] font-bold leading-tight tracking-[-0.02em] text-[#111827] dark:text-white';
export const cardTitleClass = 'text-[20px] font-semibold tracking-[-0.01em] text-[#111827] dark:text-white';
export const bodyClass = 'text-[15px] text-[#111827] dark:text-gray-200';
export const mutedClass = 'text-[15px] text-[#6B7280] dark:text-gray-400';

/* ── Bảng ──────────────────────────────────────────────────────────── */
export const thClass =
  'border-b border-[#E8EBEF] bg-[#F9FAFB] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.04em] ' +
  'text-[#6B7280] first:rounded-tl-xl last:rounded-tr-xl dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-gray-400';

export const trClass = 'transition-colors duration-[250ms] hover:bg-[#FFF9EC] dark:hover:bg-white/[0.03]';

export const tdClass =
  'border-b border-[#F1F3F6] px-4 py-3.5 text-[15px] text-[#111827] dark:border-white/[0.05] dark:text-gray-200';

export const monoCellClass =
  'border-b border-[#F1F3F6] px-4 py-3.5 text-[13px] tabular-nums text-[#6B7280] dark:border-white/[0.05] dark:text-gray-400';

/* ── Counter ───────────────────────────────────────────────────────── */
export const counterNumberClass = 'text-[36px] font-bold leading-none tracking-[-0.02em] text-[#F4B63D]';
export const counterLabelClass = 'text-[15px] text-[#6B7280] dark:text-gray-400';
