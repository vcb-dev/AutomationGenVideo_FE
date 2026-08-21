'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildMonthGrid } from '@/lib/equipment/month-grid';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface DateTimePickerProps {
  value: string; // ISO string or "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày và giờ…',
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

  const [cursorYear, setCursorYear] = useState(() => parsed ? parsed.getFullYear() : new Date().getFullYear());
  const [cursorMonth, setCursorMonth] = useState(() => parsed ? parsed.getMonth() + 1 : new Date().getMonth() + 1);
  const [selectedDayIso, setSelectedDayIso] = useState(() => {
    if (parsed) {
      return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
    }
    return '';
  });
  const [hour, setHour] = useState(() => parsed ? parsed.getHours() : 9);
  const [minute, setMinute] = useState(() => parsed ? parsed.getMinutes() : 0);

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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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
    const baseDayIso = selectedDayIso || `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}-${pad2(new Date().getDate())}`;
    if (!selectedDayIso) setSelectedDayIso(baseDayIso);
    const [y, m, d] = baseDayIso.split('-').map(Number);
    const combined = new Date(y, m - 1, d, newHour, newMinute);
    const isoString = `${combined.getFullYear()}-${pad2(combined.getMonth() + 1)}-${pad2(combined.getDate())}T${pad2(combined.getHours())}:${pad2(combined.getMinutes())}`;
    onChange(isoString);
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
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }, [parsed]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Standard Form Input Field */}
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
          <CalendarIcon size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
          <span className={cn('truncate font-medium', !parsed && 'text-slate-400 dark:text-slate-500')}>
            {displayString || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {parsed ? (
            <X
              size={14}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
            />
          ) : (
            <Clock size={14} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Standard Calendar & Time Dropdown Popover */}
      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1.5 w-[300px] sm:w-[320px] rounded-2xl border border-slate-200 bg-white p-3.5',
            'shadow-xl dark:border-white/[0.08] dark:bg-[#141821] dark:shadow-2xl animate-in fade-in zoom-in-95 duration-100',
          )}
        >
          {/* Header Month / Year Navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => step(-1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Tháng {cursorMonth} / {cursorYear}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Row */}
          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={cn("text-center text-[11px] font-bold", i === 6 ? "text-rose-500" : "text-slate-400")}>
                {w}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((cell) => {
              const isSelected = cell.iso === selectedDayIso;
              const isToday = cell.iso === `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}-${pad2(new Date().getDate())}`;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => handleSelectDay(cell.iso)}
                  className={cn(
                    'h-8 w-full rounded-lg text-xs font-medium transition-all flex items-center justify-center',
                    cell.inMonth
                      ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06]'
                      : 'text-slate-300 opacity-40 dark:text-slate-600',
                    isToday && !isSelected && 'border border-blue-500 text-blue-600 font-bold dark:text-blue-400',
                    isSelected && 'bg-blue-600 font-bold text-white hover:bg-blue-600 shadow-md shadow-blue-500/20',
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Standard Time Selector */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Clock size={14} className="text-slate-400" />
              <span>Giờ:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={hour}
                onChange={(e) => handleTimeChange(Number(e.target.value), minute)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 outline-none dark:border-white/[0.1] dark:bg-slate-800 dark:text-white"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {pad2(h)}
                  </option>
                ))}
              </select>
              <span className="font-bold text-slate-400">:</span>
              <select
                value={minute}
                onChange={(e) => handleTimeChange(hour, Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 outline-none dark:border-white/[0.1] dark:bg-slate-800 dark:text-white"
              >
                {Array.from({ length: 60 }).map((_, m) => (
                  <option key={m} value={m}>
                    {pad2(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={setNow}
              className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              Hiện tại
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clear}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Xóa
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
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
