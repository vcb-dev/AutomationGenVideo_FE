'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO string or "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  required?: boolean;
  className?: string;
  quickPresets?: boolean;
}

const MONTH_NAMES_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const WEEKDAY_NAMES_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày và giờ…',
  minDate,
  maxDate,
  label,
  required,
  className = '',
  quickPresets = true,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current date & time from value
  const parsedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  const [viewYear, setViewYear] = useState(() => parsedDate ? parsedDate.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsedDate ? parsedDate.getMonth() : new Date().getMonth());
  const [selectedHour, setSelectedHour] = useState(() => parsedDate ? parsedDate.getHours() : 9);
  const [selectedMinute, setSelectedMinute] = useState(() => parsedDate ? Math.floor(parsedDate.getMinutes() / 5) * 5 : 0);

  // Sync view when parsedDate changes
  useEffect(() => {
    if (parsedDate) {
      setViewYear(parsedDate.getFullYear());
      setViewMonth(parsedDate.getMonth());
      setSelectedHour(parsedDate.getHours());
      setSelectedMinute(parsedDate.getMinutes());
    }
  }, [parsedDate]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    const today = new Date();

    // Previous month filler days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday =
        today.getDate() === d &&
        today.getMonth() === viewMonth &&
        today.getFullYear() === viewYear;

      const isSelected = !!(
        parsedDate &&
        parsedDate.getDate() === d &&
        parsedDate.getMonth() === viewMonth &&
        parsedDate.getFullYear() === viewYear
      );

      const cellDate = new Date(viewYear, viewMonth, d, 23, 59, 59);
      const cellDateStart = new Date(viewYear, viewMonth, d, 0, 0, 0);
      const isDisabled = !!(
        (minDate && cellDate < minDate) ||
        (maxDate && cellDateStart > maxDate)
      );

      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        isToday,
        isSelected,
        isDisabled,
      });
    }

    // Next month filler days to complete grid (42 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
    }

    return days;
  }, [viewYear, viewMonth, parsedDate, minDate, maxDate]);

  const handleSelectDay = (day: number, month: number, year: number) => {
    const newDate = new Date(year, month, day, selectedHour, selectedMinute);
    const isoString = `${newDate.getFullYear()}-${pad2(newDate.getMonth() + 1)}-${pad2(newDate.getDate())}T${pad2(newDate.getHours())}:${pad2(newDate.getMinutes())}`;
    onChange(isoString);
  };

  const handleTimeChange = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    const base = parsedDate ? new Date(parsedDate) : new Date();
    base.setHours(hour);
    base.setMinutes(minute);
    const isoString = `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}T${pad2(base.getHours())}:${pad2(base.getMinutes())}`;
    onChange(isoString);
  };

  const handleApplyPreset = (hoursFromNow: number) => {
    const target = new Date(Date.now() + hoursFromNow * 3600 * 1000);
    target.setMinutes(Math.round(target.getMinutes() / 5) * 5);
    const isoString = `${target.getFullYear()}-${pad2(target.getMonth() + 1)}-${pad2(target.getDate())}T${pad2(target.getHours())}:${pad2(target.getMinutes())}`;
    onChange(isoString);
    setIsOpen(false);
  };

  const handleApplyPresetDayTime = (daysOffset: number, targetHour: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    target.setHours(targetHour, 0, 0, 0);
    const isoString = `${target.getFullYear()}-${pad2(target.getMonth() + 1)}-${pad2(target.getDate())}T${pad2(target.getHours())}:${pad2(target.getMinutes())}`;
    onChange(isoString);
    setIsOpen(false);
  };

  const displayString = useMemo(() => {
    if (!parsedDate) return '';
    const dayName = WEEKDAY_NAMES_VI[parsedDate.getDay()];
    const dd = pad2(parsedDate.getDate());
    const mm = pad2(parsedDate.getMonth() + 1);
    const yyyy = parsedDate.getFullYear();
    const hh = pad2(parsedDate.getHours());
    const min = pad2(parsedDate.getMinutes());
    return `${hh}:${min} • ${dayName}, ${dd}/${mm}/${yyyy}`;
  }, [parsedDate]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Input Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-sm transition-all duration-200 text-left ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-900/10'
            : 'border-slate-300 bg-white hover:border-slate-400 dark:border-white/[0.12] dark:bg-slate-900/60 dark:hover:border-white/[0.2]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${parsedDate ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className={`truncate font-medium ${parsedDate ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
            {displayString || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          <Clock className="w-3.5 h-3.5" />
        </div>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-[340px] sm:w-[380px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Preset Buttons */}
          {quickPresets && (
            <div className="mb-3.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Mốc thời gian nhanh:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(2)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:bg-slate-800 dark:hover:bg-blue-900/40 dark:text-slate-300 transition-colors"
                >
                  +2 giờ
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetDayTime(0, 17)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:bg-slate-800 dark:hover:bg-blue-900/40 dark:text-slate-300 transition-colors"
                >
                  Hôm nay 17:00
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetDayTime(1, 9)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:bg-slate-800 dark:hover:bg-blue-900/40 dark:text-slate-300 transition-colors"
                >
                  Ngày mai 09:00
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetDayTime(3, 17)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:bg-slate-800 dark:hover:bg-blue-900/40 dark:text-slate-300 transition-colors"
                >
                  +3 ngày
                </button>
              </div>
            </div>
          )}

          {/* Month / Year Navigator */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {MONTH_NAMES_VI[viewMonth]} {viewYear}
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Day Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES_VI.map((d, i) => (
              <span key={d} className={`text-[11px] font-semibold ${i === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              const isCellSelected = cell.isSelected;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={cell.isDisabled || !cell.isCurrentMonth}
                  onClick={() => cell.isCurrentMonth && handleSelectDay(cell.day, cell.month, cell.year)}
                  className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    !cell.isCurrentMonth
                      ? 'text-slate-300 dark:text-slate-700 opacity-40 cursor-default'
                      : isCellSelected
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30'
                      : cell.isToday
                      ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                      : cell.isDisabled
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Bar */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Thời gian:</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Hour Dropdown */}
              <select
                value={selectedHour}
                onChange={(e) => handleTimeChange(Number(e.target.value), selectedMinute)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-2.5 py-1 text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {pad2(h)} giờ
                  </option>
                ))}
              </select>

              <span className="font-bold text-slate-400">:</span>

              {/* Minute Dropdown */}
              <select
                value={selectedMinute}
                onChange={(e) => handleTimeChange(selectedHour, Number(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-2.5 py-1 text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    {pad2(m)} phút
                  </option>
                ))}
              </select>

              {/* Done button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ml-1 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                title="Xác nhận"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
