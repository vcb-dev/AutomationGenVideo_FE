'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildMonthGrid } from '@/lib/equipment/month-grid';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface DatePickerProps {
  /** Định dạng YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  align?: 'left' | 'right';
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const formatDisplay = (isoStr: string) => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length < 3) return isoStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

export function DatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày…',
  className,
  label,
  required,
  minDate,
  maxDate,
  align = 'left',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initial = value || todayIso();
  const [year, setYear] = useState(() => Number(initial.slice(0, 4)) || new Date().getFullYear());
  const [month, setMonth] = useState(() => Number(initial.slice(5, 7)) || (new Date().getMonth() + 1));

  useEffect(() => {
    if (value && value.length >= 10) {
      setYear(Number(value.slice(0, 4)));
      setMonth(Number(value.slice(5, 7)));
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const today = todayIso();

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Input Box */}
      <div
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 transition-all select-none',
          'hover:border-slate-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20',
          'dark:border-white/[0.12] dark:bg-slate-900 dark:text-slate-100 dark:hover:border-white/20',
          open && 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400',
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarIcon size={14} className="shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors" />
          <span className={cn('font-semibold text-xs whitespace-nowrap', !value && 'text-slate-400 font-normal dark:text-slate-500')}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </div>

        {value ? (
          <button
            type="button"
            className="p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            <X size={13} />
          </button>
        ) : (
          <div className="w-3" />
        )}
      </div>

      {/* Popover Calendar */}
      {open && (
        <div
          className={cn(
            'absolute top-full z-[100] mt-1.5 w-[265px] rounded-xl border border-slate-200 bg-white p-3',
            'shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Tháng {month} / {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Weekday Row */}
          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={cn('text-center text-[10px] font-bold', i === 6 ? 'text-rose-500' : 'text-slate-400')}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Days Matrix */}
          <div className="grid grid-cols-7 gap-0.5">
            {weeks.flat().map((cell) => {
              const isSelected = cell.iso === value;
              const isToday = cell.iso === today;
              const isDisabled = Boolean(
                (minDate && cell.iso < minDate) ||
                (maxDate && cell.iso > maxDate),
              );

              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(cell.iso);
                    setOpen(false);
                  }}
                  className={cn(
                    'h-7 w-full rounded-md text-[11px] font-semibold transition-all flex items-center justify-center',
                    cell.inMonth
                      ? 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-300 opacity-40 dark:text-slate-600',
                    isToday && !isSelected && 'border border-blue-500 text-blue-600 font-bold dark:text-blue-400',
                    isSelected && 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30',
                    isDisabled && 'cursor-not-allowed opacity-30',
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer Bar */}
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
              className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Xóa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
