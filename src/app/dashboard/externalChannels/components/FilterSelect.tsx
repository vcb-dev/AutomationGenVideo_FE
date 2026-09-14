'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CaretDown, Check, MagnifyingGlass, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface FilterSelectOption {
  value: string | number;
  label: string;
  count?: number | string;
  badge?: string;
}

interface FilterSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  align?: 'left' | 'right';
  searchable?: boolean;
  searchPlaceholder?: string;
  title?: string;
}

export default function FilterSelect({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  icon,
  className,
  triggerClassName,
  align = 'left',
  searchable,
  searchPlaceholder = 'Tìm kiếm...',
  title,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-enable search if more than 7 options
  const isSearchable = searchable !== undefined ? searchable : options.length > 7;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      if (isSearchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSearchable]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = isSearchable && searchTerm.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase().trim())
      )
    : options;

  return (
    <div className={cn('relative inline-block text-left', className)} ref={containerRef}>
      <button
        type="button"
        title={title}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearchTerm('');
        }}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-medium transition-all select-none cursor-pointer outline-none',
          'border-slate-200 bg-card text-foreground hover:border-slate-300',
          'dark:border-white/[0.08] dark:bg-[#0f131a] dark:text-slate-100 dark:hover:border-white/20',
          isOpen && 'border-primary dark:border-primary ring-1 ring-primary/25',
          triggerClassName
        )}
      >
        {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
        <span className="truncate max-w-[180px] sm:max-w-[220px] text-left text-xs sm:text-sm">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <CaretDown
          size={13}
          weight="bold"
          className={cn(
            'shrink-0 text-slate-400 transition-transform duration-200 ml-auto',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-1.5 min-w-[200px] max-w-xs z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl',
            'dark:border-white/[0.08] dark:bg-[#141821] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {isSearchable && (
            <div className="relative mb-1.5 px-1 pt-1">
              <MagnifyingGlass
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-6 py-1 text-xs border border-slate-200 dark:border-white/[0.08] rounded-md bg-slate-50 dark:bg-slate-900/60 text-foreground placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-primary"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => {
                      onChange(String(option.value));
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left select-none cursor-pointer',
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20'
                        : 'text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    )}
                  >
                    <span className="truncate pr-2">{option.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {option.count !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({option.count})
                        </span>
                      )}
                      {isSelected && (
                        <Check size={13} weight="bold" className="text-primary" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
