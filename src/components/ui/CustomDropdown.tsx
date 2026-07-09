import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption {
  value: any;
  label: string;
}

interface CustomDropdownProps {
  value: any;
  onChange: (value: any) => void;
  options: DropdownOption[];
  labelPrefix?: string;
  className?: string;
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  labelPrefix,
  className,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-xl border text-slate-200 outline-none font-bold text-[10px] transition-all duration-200 cursor-pointer shadow-sm select-none",
          isOpen
            ? "border-indigo-500/80 bg-slate-800/80 ring-1 ring-indigo-500/25 text-white"
            : "bg-slate-900/60 border-white/[0.08] hover:bg-slate-800/60 hover:border-white/[0.15]"
        )}
      >
        {labelPrefix && (
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mr-0.5">
            {labelPrefix}
          </span>
        )}
        <span className="truncate">{selectedOption?.label || ''}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-indigo-400"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-max min-w-[120px] max-h-80 overflow-y-auto origin-top-right rounded-xl border border-white/[0.08] bg-[#0e1626] shadow-2xl backdrop-blur-xl p-1 z-50 focus:outline-none custom-scrollbar">
          <div className="flex flex-col gap-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center w-full px-3 py-1.5 rounded-lg text-[10px] font-bold text-left transition-colors duration-150 cursor-pointer select-none",
                    isSelected
                      ? "bg-indigo-500 text-white font-black"
                      : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
