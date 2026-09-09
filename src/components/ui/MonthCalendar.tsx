'use client';

/**
 * Lưới ngày của một tháng, kèm thanh chuyển tháng.
 *
 * Tách khỏi `DatePicker` để `DateTimePicker` dùng lại được. Chép đôi phần này là sớm muộn hai bộ
 * lịch lệch nhau — mà lệch một cột thì người dùng bấm nhầm ngày và nhìn mắt thường rất khó thấy,
 * đúng lý do việc dựng lưới đã được tách sẵn ra `lib/equipment/month-grid.ts` và có test riêng.
 *
 * Chỉ lo phần lịch: cái vỏ (nút bấm, popover, nút Hôm nay / Xoá) thuộc về nơi dùng, vì hai chỗ
 * dùng có nhu cầu khác nhau.
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildMonthGrid } from '@/lib/equipment/month-grid';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const displayVi = (isoValue: string) => {
  if (!isoValue) return '';
  const [y, m, d] = isoValue.split('-');
  return `${d}/${m}/${y}`;
};

interface MonthCalendarProps {
  /** `YYYY-MM-DD`, rỗng nghĩa là chưa chọn. */
  value: string;
  onSelect: (iso: string) => void;
  className?: string;
}

export function MonthCalendar({ value, onSelect, className }: MonthCalendarProps) {
  // Mở ở tháng của ngày đang chọn; chưa chọn thì mở ở tháng hiện tại.
  const initial = value || todayIso();
  const [cursor, setCursor] = useState({
    year: Number(initial.slice(0, 4)),
    month: Number(initial.slice(5, 7)),
  });

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
    <div className={className}>
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
              onClick={() => onSelect(cell.iso)}
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
    </div>
  );
}
