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
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildMonthGrid } from '@/lib/equipment/month-grid';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface DatePickerProps {
  /** Dạng YYYY-MM-DD, chuỗi rỗng nghĩa là chưa chọn. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const displayVi = (isoValue: string) => {
  if (!isoValue) return '';
  const [y, m, d] = isoValue.split('-');
  return `${d}/${m}/${y}`;
};

export function DatePicker({ value, onChange, placeholder = 'Chọn ngày', className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Mở lịch ở tháng của ngày đang chọn; chưa chọn thì mở ở tháng hiện tại.
  const initial = value || todayIso();
  const [cursor, setCursor] = useState({
    year: Number(initial.slice(0, 4)),
    month: Number(initial.slice(5, 7)),
  });

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

  const weeks = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const today = todayIso();

  const step = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      if (m < 1) return { year: c.year - 1, month: 12 };
      if (m > 12) return { year: c.year + 1, month: 1 };
      return { ...c, month: m };
    });
  };

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
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => step(-1)}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Tháng {cursor.month} · {cursor.year}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-[11px] font-medium text-slate-400">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {weeks.flat().map((cell) => {
              const selected = cell.iso === value;
              const isToday = cell.iso === today;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    onChange(cell.iso);
                    setOpen(false);
                  }}
                  className={cn(
                    'h-8 rounded-md text-sm transition-colors',
                    cell.inMonth
                      ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06]'
                      : 'text-slate-300 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-white/[0.03]',
                    isToday && !selected && 'font-semibold text-indigo-600 dark:text-indigo-400',
                    selected && 'bg-indigo-600 font-semibold text-white hover:bg-indigo-600',
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

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
