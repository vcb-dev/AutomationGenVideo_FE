'use client';

/**
 * MỘT ô duy nhất cho cả ngày lẫn giờ, thay cho `<input type="datetime-local">`.
 *
 * Vì sao không dùng input gốc: lịch bung ra của Chrome **chỉ có ngày, không có đồng hồ** — muốn
 * đặt giờ thì phải bấm vào ô hh:mm rồi gõ. Người dùng mở ra thấy mỗi cái lịch nên kết luận là
 * màn hình không cho chọn giờ, rồi để nguyên 00:00 — mà giờ nhận/trả quyết định cả phép tính khả
 * dụng lẫn hạn trả của phiếu.
 *
 * Vì sao gộp một ô thay vì hai: hai ô rời cạnh nhau đọc như hai câu hỏi tách biệt, và mọi khác
 * biệt nhỏ về viền hay chiều cao đều lộ ra ngay. Gộp lại thì "thời điểm" là một khái niệm, một
 * chỗ bấm, một popover.
 *
 * Lịch dùng chung `MonthCalendar` với `DatePicker` — chép đôi là sớm muộn hai bộ lịch lệch nhau.
 */

import { useEffect, useRef, useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonthCalendar, displayVi, todayIso } from '@/components/ui/MonthCalendar';
import {
  isOffGridTime,
  joinDateTime,
  splitDateTime,
  timeOptions,
} from '@/lib/equipment/datetime-value';

interface DateTimePickerProps {
  /** Dạng `YYYY-MM-DDTHH:mm`, chuỗi rỗng nghĩa là chưa chọn. */
  value: string;
  onChange: (value: string) => void;
  /** Bước nhảy của danh sách giờ, tính bằng phút. */
  stepMinutes?: number;
  placeholder?: string;
  className?: string;
}

/** Giờ điền sẵn khi người dùng chọn ngày trước — đầu giờ làm việc, không phải nửa đêm. */
const DEFAULT_TIME = '08:00';

export function DateTimePicker({
  value,
  onChange,
  stepMinutes = 30,
  placeholder = 'Chọn ngày giờ',
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { date, time } = splitDateTime(value);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const options = timeOptions(stepMinutes);
  // Giờ lệch khỏi lưới (phiếu cũ, hoặc dữ liệu nhập từ nơi khác) phải có mặt trong danh sách, nếu
  // không thì không tô được mục đang chọn và người dùng tưởng giờ của phiếu đã mất.
  const shownOptions = isOffGridTime(time, stepMinutes) ? [...options, time].sort() : options;

  // Chọn ngày mà chưa có giờ thì điền sẵn giờ làm việc: để trống là quay lại đúng cái bẫy
  // "mặc định nửa đêm" mà bộ chọn này sinh ra để tránh. KHÔNG đóng popover — người dùng còn
  // phải chọn giờ, đóng ngay là họ lại bỏ qua bước đó.
  const pickDate = (iso: string) => onChange(joinDateTime(iso, time || DEFAULT_TIME));

  const pickTime = (nextTime: string) => {
    onChange(joinDateTime(date || todayIso(), nextTime));
    setOpen(false);
  };

  return (
    <div ref={box} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-[200px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm',
          'text-slate-800 transition-colors hover:border-slate-300',
          'dark:border-white/[0.08] dark:bg-[#0f131a] dark:text-slate-100 dark:hover:border-white/20',
          open && 'border-indigo-400 dark:border-indigo-400',
        )}
      >
        <CalendarClock size={15} className="shrink-0 text-slate-400" />
        <span className={cn('flex-1 text-left', !value && 'text-slate-400')}>
          {value ? `${displayVi(date)} · ${time}` : placeholder}
        </span>
        {value && (
          <X
            size={14}
            className="shrink-0 text-slate-400 hover:text-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          />
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-2 flex rounded-xl border border-slate-200 bg-white p-3',
            'shadow-[0_12px_32px_rgba(17,24,39,0.12)]',
            'dark:border-white/[0.08] dark:bg-[#141821] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]',
          )}
        >
          <MonthCalendar value={date} onSelect={pickDate} className="w-[252px]" />

          {/* Cột giờ cuộn được, cao bằng lịch. Tự cuộn tới giờ đang chọn để không phải dò tay. */}
          <div className="ml-3 flex w-[84px] flex-col border-l border-slate-100 pl-3 dark:border-white/[0.06]">
            <span className="mb-2 text-center text-[11px] font-medium text-slate-400">Giờ</span>
            {/* Chiều cao cứng, xấp xỉ lịch 6 hàng. Đã thử `flex-1 min-h-0` cho khớp tuyệt đối —
                hỏng: không bên nào ràng buộc chiều cao nên cột giờ nở ra hết 48 mục và popover
                dài cả trang. Tháng 5 hàng thì thừa một khoảng nhỏ dưới lịch, chấp nhận được. */}
            <div className="max-h-[248px] overflow-y-auto pr-1">
              {shownOptions.map((option) => {
                const selected = option === time;
                return (
                  <button
                    key={option}
                    type="button"
                    ref={(el) => {
                      if (selected && el) el.scrollIntoView({ block: 'center' });
                    }}
                    onClick={() => pickTime(option)}
                    className={cn(
                      'mb-0.5 w-full rounded-md py-1.5 text-sm transition-colors',
                      selected
                        ? 'bg-indigo-600 font-semibold text-white hover:bg-indigo-600'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06]',
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
