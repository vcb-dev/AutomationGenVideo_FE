'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildMonthGrid } from '@/lib/equipment/month-grid';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface DatePickerProps {
  /** Dạng YYYY-MM-DD, chuỗi rỗng nghĩa là chưa chọn. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
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

export function DatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày…',
  className,
  label,
  required,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const initial = value || todayIso();
  const [cursor, setCursor] = useState({
    year: Number(initial.slice(0, 4)) || new Date().getFullYear(),
    month: Number(initial.slice(5, 7)) || (new Date().getMonth() + 1),
  });

  useEffect(() => {
    if (value && value.length >= 10) {
      setCursor({
        year: Number(value.slice(0, 4)),
        month: Number(value.slice(5, 7)),
      });
    }
  }, [value]);

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
    <div ref={box} className={cn('relative w-full', className)}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-all outline-none',
          'hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
          'dark:border-white/[0.12] dark:bg-[#0f131a] dark:text-slate-100 dark:hover:border-white/20',
          open && 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Calendar size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
          <span className={cn('truncate font-medium', !value && 'text-slate-400 dark:text-slate-500')}>
            {value ? displayVi(value) : placeholder}
          </span>
        </div>

        {value && (
          <X
            size={14}
            className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
            'absolute left-0 top-full z-50 mt-1.5 w-[280px] rounded-2xl border border-slate-200 bg-white p-3.5',
            'shadow-xl dark:border-white/[0.08] dark:bg-[#141821] dark:shadow-2xl animate-in fade-in zoom-in-95 duration-100',
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => step(-1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Tháng {cursor.month} / {cursor.year}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={cn("text-center text-[11px] font-bold", i === 6 ? "text-rose-500" : "text-slate-400")}>
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
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
                    'h-8 w-full rounded-lg text-xs font-medium transition-all flex items-center justify-center',
                    cell.inMonth
                      ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06]'
                      : 'text-slate-300 opacity-40 dark:text-slate-600',
                    isToday && !selected && 'border border-blue-500 text-blue-600 font-bold dark:text-blue-400',
                    selected && 'bg-blue-600 font-bold text-white hover:bg-blue-600 shadow-md shadow-blue-500/20',
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
              className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Xóa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
