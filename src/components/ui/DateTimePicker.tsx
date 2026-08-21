'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildMonthGrid } from '@/lib/equipment/month-grid';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const QUICK_TIMES = ['08:00', '09:00', '12:00', '14:00', '17:00', '18:00', '20:00'];

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
  minDate,
  maxDate,
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
  const [hour, setHour] = useState(() => (parsed ? parsed.getHours() : 9));
  const [minute, setMinute] = useState(() => (parsed ? parsed.getMinutes() : 0));

  useEffect(() => {
    if (parsed) {
      setCursorYear(parsed.getFullYear());
      setCursorMonth(parsed.getMonth() + 1);
      setSelectedDayIso(`${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`);
      setHour(parsed.getHours());
      setMinute(parsed.getMinutes());
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

  const handleSelectDay = (iso: string) => {
    setSelectedDayIso(iso);
    const [y, m, d] = iso.split('-').map(Number);
    const combined = new Date(y, m - 1, d, hour, minute);
    const isoString = `${combined.getFullYear()}-${pad2(combined.getMonth() + 1)}-${pad2(combined.getDate())}T${pad2(combined.getHours())}:${pad2(combined.getMinutes())}`;
    onChange(isoString);
  };

  const handleTimeChange = (newHour: number, newMinute: number) => {
    setHour(newHour);
    setMinute(newMinute);
    const baseDayIso = selectedDayIso || todayIso;
    if (!selectedDayIso) setSelectedDayIso(baseDayIso);
    const [y, m, d] = baseDayIso.split('-').map(Number);
    const combined = new Date(y, m - 1, d, newHour, newMinute);
    const isoString = `${combined.getFullYear()}-${pad2(combined.getMonth() + 1)}-${pad2(combined.getDate())}T${pad2(combined.getHours())}:${pad2(combined.getMinutes())}`;
    onChange(isoString);
  };

  const handleApplyQuickTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    handleTimeChange(h, m);
  };

  const setNow = () => {
    const now = new Date();
    const isoString = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
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

      {/* Popover Calendar & Time Picker */}
      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1.5 w-[276px] rounded-xl border border-slate-200 bg-white p-3',
            'shadow-xl dark:border-white/[0.1] dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100',
          )}
        >
          {/* Header */}
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

          {/* Time Picker Section */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <Clock size={12} className="text-blue-500" />
                <span>Giờ:</span>
              </div>

              <div className="flex items-center gap-1">
                <select
                  value={hour}
                  onChange={(e) => handleTimeChange(Number(e.target.value), minute)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-white/[0.1] dark:bg-slate-800 dark:text-white"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {pad2(h)}h
                    </option>
                  ))}
                </select>
                <span className="font-bold text-slate-400 text-xs">:</span>
                <select
                  value={minute}
                  onChange={(e) => handleTimeChange(hour, Number(e.target.value))}
                  className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-white/[0.1] dark:bg-slate-800 dark:text-white"
                >
                  {Array.from({ length: 60 }).map((_, m) => (
                    <option key={m} value={m}>
                      {pad2(m)}p
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Time Chips */}
            <div className="flex flex-wrap gap-1">
              {QUICK_TIMES.map((timeStr) => (
                <button
                  key={timeStr}
                  type="button"
                  onClick={() => handleApplyQuickTime(timeStr)}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
                    `${pad2(hour)}:${pad2(minute)}` === timeStr
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
                  )}
                >
                  {timeStr}
                </button>
              ))}
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
