import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  alignUp?: boolean;
  onToggleOpen?: (isOpen: boolean) => void;
}

export function CustomSelect({ value, onChange, options, alignUp = false, onToggleOpen }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onToggleOpen?.(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onToggleOpen]);

  const getPlatformStyle = (platform: string) => {
    switch (platform) {
      case 'TikTok':
        return 'text-cyan-400';
      case 'Instagram Reels':
        return 'text-pink-400';
      case 'YouTube Shorts':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          onToggleOpen?.(next);
        }}
        className="flex items-center justify-between w-full bg-muted hover:bg-accent border border-border focus:border-blue-500/40 outline-none rounded-lg px-2.5 py-1.5 text-[13px] font-bold transition-all duration-150 text-left"
      >
        <span className={getPlatformStyle(value)}>{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 w-full min-w-[140px] bg-muted border border-border rounded-lg shadow-xl shadow-black/80 z-50 py-1 overflow-hidden transition-all ${alignUp ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
        >
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                  onToggleOpen?.(false);
                }}
                className={`flex items-center justify-between w-full px-2.5 py-1.5 text-[13px] font-semibold text-left transition-colors duration-100 ${isSelected
                    ? 'bg-blue-600/20 text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
              >
                <span className={getPlatformStyle(opt)}>{opt}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  alignUp?: boolean;
  themeColor?: 'emerald' | 'red' | 'purple';
  onToggleOpen?: (isOpen: boolean) => void;
}

export function CustomDatePicker({ value, onChange, alignUp = false, themeColor = 'emerald', onToggleOpen }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
    return new Date();
  };

  const selectedDate = value ? parseDate(value) : null;
  const [navDate, setNavDate] = useState(() => selectedDate || new Date());

  useEffect(() => {
    if (value) {
      setNavDate(parseDate(value));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onToggleOpen?.(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onToggleOpen]);

  const year = navDate.getFullYear();
  const month = navDate.getMonth();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (y: number, m: number, d: number) => {
    const formattedMonth = String(m + 1).padStart(2, '0');
    const formattedDay = String(d).padStart(2, '0');
    onChange(`${y}-${formattedMonth}-${formattedDay}`);
    setIsOpen(false);
    onToggleOpen?.(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
    onToggleOpen?.(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
    const formattedDay = String(today.getDate()).padStart(2, '0');
    onChange(`${today.getFullYear()}-${formattedMonth}-${formattedDay}`);
    setIsOpen(false);
    onToggleOpen?.(false);
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayIdx = firstDayOfMonth.getDay();
  const adjustedFirstDayIdx = firstDayIdx === 0 ? 6 : firstDayIdx - 1;

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = adjustedFirstDayIdx - 1; i >= 0; i--) {
    cells.push({
      day: totalDaysInPrevMonth - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= totalDaysInMonth; d++) {
    cells.push({
      day: d,
      month,
      year,
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      day: d,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }

  const displayDateStr = value
    ? value.split('-').reverse().join('/')
    : 'Chọn ngày';

  const themeClasses = {
    emerald: {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-[#10b981]',
      border: 'border-emerald-300 dark:border-emerald-500/20',
      hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-foreground',
      todayBorder: 'border border-emerald-400 dark:border-emerald-500/40',
      selectedBg: 'bg-[#10b981] text-black font-extrabold',
    },
    red: {
      text: 'text-red-400',
      bg: 'bg-red-600',
      border: 'border-red-500/20',
      hover: 'hover:bg-red-500/10 hover:text-foreground',
      todayBorder: 'border border-red-500/40',
      selectedBg: 'bg-red-600 text-white font-extrabold',
    },
    purple: {
      text: 'text-purple-400',
      bg: 'bg-purple-600',
      border: 'border-purple-500/20',
      hover: 'hover:bg-purple-500/10 hover:text-foreground',
      todayBorder: 'border border-purple-500/40',
      selectedBg: 'bg-purple-600 text-white font-extrabold',
    },
  }[themeColor];

  return (
    <div className="relative w-full max-w-[125px] mx-auto" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          onToggleOpen?.(next);
        }}
        className="w-full bg-muted hover:bg-accent border border-border rounded-lg px-2.5 py-1.5 text-[13px] font-bold text-muted-foreground flex items-center justify-center gap-1.5 transition-all duration-150 select-none"
      >
        <CalendarIcon className={`w-3 h-3 ${themeClasses.text}`} />
        <span>{displayDateStr}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-[220px] bg-muted border border-border rounded-xl shadow-2xl shadow-black/90 z-50 p-3 select-none ${alignUp ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[13px] font-black text-foreground">
              Tháng {month + 1} - {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((h) => (
              <span key={h} className="text-[11px] font-bold text-muted-foreground uppercase">
                {h}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {cells.map((cell, idx) => {
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === cell.day &&
                selectedDate.getMonth() === cell.month &&
                selectedDate.getFullYear() === cell.year;

              const today = new Date();
              const isToday =
                today.getDate() === cell.day &&
                today.getMonth() === cell.month &&
                today.getFullYear() === cell.year;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                  className={`
                    w-6 h-6 text-[12px] rounded-md transition-all duration-100 flex items-center justify-center font-semibold
                    ${cell.isCurrentMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground/50 hover:text-muted-foreground'
                    }
                    ${isSelected ? themeClasses.selectedBg : ''}
                    ${!isSelected && isToday ? themeClasses.todayBorder : ''}
                    ${!isSelected ? themeClasses.hover : ''}
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border text-[12px] font-bold">
            <button
              type="button"
              onClick={handleClear}
              className="text-red-400 hover:text-red-300 transition-colors py-0.5 px-1.5 hover:bg-red-500/10 rounded"
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-blue-400 hover:text-blue-300 transition-colors py-0.5 px-1.5 hover:bg-blue-500/10 rounded"
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
