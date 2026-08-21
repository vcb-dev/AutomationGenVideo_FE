'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildMonthGrid } from '@/lib/equipment/month-grid';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface DateTimePickerProps {
  /** Dạng YYYY-MM-DDTHH:mm hoặc ISO string */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày & giờ…',
  label,
  required,
  className = '',
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  const [cursorYear, setCursorYear] = useState(() => (parsed ? parsed.getFullYear() : new Date().getFullYear()));
  const [cursorMonth, setCursorMonth] = useState(() => (parsed ? parsed.getMonth() + 1 : new Date().getMonth() + 1));
  const [selectedDayIso, setSelectedDayIso] = useState(() => {
    if (parsed) {
      return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
    }
    return '';
  });

  const [hourStr, setHourStr] = useState(() => (parsed ? pad2(parsed.getHours()) : '09'));
  const [minuteStr, setMinuteStr] = useState(() => (parsed ? pad2(parsed.getMinutes()) : '00'));

  useEffect(() => {
    if (parsed) {
      setCursorYear(parsed.getFullYear());
      setCursorMonth(parsed.getMonth() + 1);
      setSelectedDayIso(`${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`);
      setHourStr(pad2(parsed.getHours()));
      setMinuteStr(pad2(parsed.getMinutes()));
    } else {
      setSelectedDayIso('');
    }
  }, [parsed]);

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

  const weeks = useMemo(() => buildMonthGrid(cursorYear, cursorMonth), [cursorYear, cursorMonth]);
  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }, []);

  const step = (delta: number) => {
    let nextMonth = cursorMonth + delta;
    let nextYear = cursorYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setCursorYear(nextYear);
    setCursorMonth(nextMonth);
  };

  const syncDateTime = (isoDay: string, h: number, m: number) => {
    const validH = Math.min(23, Math.max(0, isNaN(h) ? 0 : h));
    const validM = Math.min(59, Math.max(0, isNaN(m) ? 0 : m));
    const baseDay = isoDay || todayIso;
    const [y, mon, d] = baseDay.split('-').map(Number);
    const combined = new Date(y, mon - 1, d, validH, validM);
    const isoString = `${combined.getFullYear()}-${pad2(combined.getMonth() + 1)}-${pad2(combined.getDate())}T${pad2(combined.getHours())}:${pad2(combined.getMinutes())}`;
    onChange(isoString);
  };

  const handleSelectDay = (iso: string) => {
    setSelectedDayIso(iso);
    syncDateTime(iso, parseInt(hourStr, 10), parseInt(minuteStr, 10));
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setHourStr(val);
    if (val !== '') {
      const num = parseInt(val, 10);
      if (num >= 0 && num <= 23) {
        syncDateTime(selectedDayIso, num, parseInt(minuteStr, 10) || 0);
      }
    }
  };

  const handleHourBlur = () => {
    let num = parseInt(hourStr, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 23) num = 23;
    setHourStr(pad2(num));
    syncDateTime(selectedDayIso, num, parseInt(minuteStr, 10) || 0);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMinuteStr(val);
    if (val !== '') {
      const num = parseInt(val, 10);
      if (num >= 0 && num <= 59) {
        syncDateTime(selectedDayIso, parseInt(hourStr, 10) || 0, num);
      }
    }
  };

  const handleMinuteBlur = () => {
    let num = parseInt(minuteStr, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    setMinuteStr(pad2(num));
    syncDateTime(selectedDayIso, parseInt(hourStr, 10) || 0, num);
  };

  const setNow = () => {
    const now = new Date();
    const isoString = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    setHourStr(pad2(now.getHours()));
    setMinuteStr(pad2(now.getMinutes()));
    onChange(isoString);
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    setOpen(false);
  };

  const displayString = useMemo(() => {
    if (!parsed) return '';
    const dd = pad2(parsed.getDate());
    const mm = pad2(parsed.getMonth() + 1);
    const yyyy = parsed.getFullYear();
    const hh = pad2(parsed.getHours());
    const min = pad2(parsed.getMinutes());
    return `${dd}/${mm}/${yyyy}  ${hh}:${min}`;
  }, [parsed]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Input Box */}
      <div
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs sm:text-sm text-slate-800 transition-all select-none',
          'hover:border-slate-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20',
          'dark:border-white/[0.12] dark:bg-slate-900 dark:text-slate-100 dark:hover:border-white/20',
          open && 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon size={14} className="shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors" />
          <span className={cn('truncate font-medium', !parsed && 'text-slate-400 dark:text-slate-500')}>
            {displayString || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {parsed ? (
            <button
              type="button"
              className="p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
            >
              <X size={13} />
            </button>
          ) : (
            <Clock size={13} className="text-slate-400" />
          )}
        </div>
      </div>

      {/* Popover Calendar & Manual Time Input */}
      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-[100] mt-1.5 w-[265px] rounded-xl border border-slate-200 bg-white p-3',
            'shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100',
          )}
        >
          {/* Header Month / Year */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => step(-1)}
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Tháng {cursorMonth} / {cursorYear}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
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

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {weeks.flat().map((cell) => {
              const isSelected = cell.iso === selectedDayIso;
              const isToday = cell.iso === todayIso;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => handleSelectDay(cell.iso)}
                  className={cn(
                    'h-7 w-full rounded-md text-[11px] font-medium transition-all flex items-center justify-center',
                    cell.inMonth
                      ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                      : 'text-slate-300 opacity-40 dark:text-slate-600',
                    isToday && !isSelected && 'border border-blue-500 text-blue-600 font-bold dark:text-blue-400',
                    isSelected && 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30',
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Manual Time Input Section */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <Clock size={13} className="text-blue-500" />
              <span>Nhập giờ:</span>
            </div>

            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={hourStr}
                onChange={handleHourChange}
                onBlur={handleHourBlur}
                className="w-9 h-7 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/[0.1] dark:bg-slate-800 dark:text-white"
                placeholder="09"
              />
              <span className="font-bold text-slate-400 text-xs">:</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={minuteStr}
                onChange={handleMinuteChange}
                onBlur={handleMinuteBlur}
                className="w-9 h-7 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/[0.1] dark:bg-slate-800 dark:text-white"
                placeholder="00"
              />
            </div>
          </div>

          {/* Footer Bar */}
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={setNow}
              className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              Hiện tại
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={clear}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Xóa
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
