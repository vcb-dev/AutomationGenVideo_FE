'use client';

/**
 * Bộ chọn ngày tự vẽ, thay cho `<input type="date">`.
 *
 * Vì sao không dùng input gốc: lịch bung ra là widget của trình duyệt, CSS không với tới được —
 * nó lệch hẳn khỏi phần còn lại của giao diện (bo góc, phông chữ, màu nhấn, tiếng Anh trên máy
 * đặt ngôn ngữ khác). Tự vẽ thì tuần bắt đầu thứ Hai theo lịch Việt Nam, và tông màu ăn khớp
 * với chỗ dùng.
 *
 * Việc dựng lưới ngày nằm ở `lib/equipment/month-grid.ts` — logic thuần, test riêng, vì lệch
 * một cột là người dùng bấm nhầm ngày mà nhìn mắt thường rất khó thấy.
 *
 * Phần lịch đã tách ra `MonthCalendar` để `DateTimePicker` dùng chung. Ở đây chỉ còn cái vỏ:
 * nút bấm, popover, và hai nút Hôm nay / Xoá.
 */

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonthCalendar, displayVi, todayIso } from '@/components/ui/MonthCalendar';

interface DatePickerProps {
  /** Dạng YYYY-MM-DD, chuỗi rỗng nghĩa là chưa chọn. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Chọn ngày', className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

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

  const today = todayIso();

  return (
    <div ref={box} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-[150px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm',
          'text-slate-800 transition-colors hover:border-slate-300',
          'dark:border-white/[0.08] dark:bg-[#0f131a] dark:text-slate-100 dark:hover:border-white/20',
          open && 'border-indigo-400 dark:border-indigo-400',
        )}
      >
        <CalendarDays size={15} className="shrink-0 text-slate-400" />
        <span className={cn('flex-1 text-left', !value && 'text-slate-400')}>
          {value ? displayVi(value) : placeholder}
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
            'absolute left-0 top-full z-50 mt-2 w-[276px] rounded-xl border border-slate-200 bg-white p-3',
            'shadow-[0_12px_32px_rgba(17,24,39,0.12)]',
            'dark:border-white/[0.08] dark:bg-[#141821] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]',
          )}
        >
          <MonthCalendar
            value={value}
            onSelect={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
          />

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Xoá
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
