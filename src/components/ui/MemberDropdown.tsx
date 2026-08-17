'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface MemberDropdownOption {
  id: string;
  full_name: string;
}

interface MemberDropdownProps {
  members: MemberDropdownOption[];
  value: string;
  onChange: (id: string) => void;
}

const AVATAR_COLORS = [
  'bg-[#5e5ce6]/10 text-[#4441cc]',
  'bg-emerald-500/10 text-emerald-600',
  'bg-amber-500/10 text-amber-600',
  'bg-rose-500/10 text-rose-600',
  'bg-sky-500/10 text-sky-600',
  'bg-fuchsia-500/10 text-fuchsia-600',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Màu avatar ổn định theo id — cùng 1 người luôn ra cùng 1 màu giữa các lần render. */
function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function MemberDropdown({ members, value, onChange }: MemberDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = members.find((m) => m.id === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white border border-[#c7c4d7] rounded-xl pl-2 pr-3 py-1.5 text-xs font-semibold text-[#1b1b1d] hover:border-[#4441cc]/50 focus:outline-none focus:border-[#4441cc] transition-colors shadow-sm min-w-[190px]"
      >
        {selected ? (
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorForId(selected.id)}`}
          >
            {getInitials(selected.full_name)}
          </span>
        ) : (
          <span className="w-6 h-6 rounded-full bg-[#f6f3f5] flex-shrink-0" />
        )}
        <span className="truncate flex-1 text-left">{selected?.full_name || 'Chọn thành viên'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#464554] transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-64 max-h-72 overflow-y-auto rounded-xl border border-[#c7c4d7] bg-white shadow-lg p-1.5 z-50 custom-scrollbar">
          {members.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-[#464554]/70">Không có thành viên nào</p>
          ) : (
            members.map((m) => {
              const isSelected = m.id === value;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                    isSelected ? 'bg-[#4441cc]/10 text-[#4441cc]' : 'text-[#1b1b1d] hover:bg-[#f6f3f5]'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorForId(m.id)}`}
                  >
                    {getInitials(m.full_name)}
                  </span>
                  <span className="truncate">{m.full_name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
