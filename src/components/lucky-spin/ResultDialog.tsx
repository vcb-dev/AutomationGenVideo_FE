'use client';

import { ReactNode, useState } from 'react';
import { User } from 'lucide-react';

export interface WinnerDisplayItem {
  id?: string;
  name: string;
  avatarUrl?: string;
  teamName?: string;
}

interface Props {
  open: boolean;
  eyebrow: string;
  name: string;
  subtitle: string;
  avatarUrl?: string;
  winners?: WinnerDisplayItem[];
  children: ReactNode;
}

function WinnerAvatar({
  name,
  url,
  size = 'lg',
}: {
  name: string;
  url?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [failed, setFailed] = useState(false);
  const sizeClasses = {
    sm: 'h-10 w-10 text-[13px]',
    md: 'h-14 w-14 text-[16px]',
    lg: 'h-24 w-24 text-[26px]',
  };
  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-10 w-10',
  };

  const initial = name.trim().charAt(0).toUpperCase();

  if (url && !failed) {
    return (
      <div className={`relative mx-auto ${sizeClasses[size]}`}>
        {size === 'lg' && (
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#F4B63D] to-[#E9A616] opacity-70 blur-sm" />
        )}
        <img
          src={url}
          alt={name}
          onError={() => setFailed(true)}
          className={`relative h-full w-full rounded-full object-cover border-2 border-[#F4B63D] shadow-md bg-white dark:bg-gray-800`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative mx-auto flex items-center justify-center rounded-full border-2 border-[#F4B63D]/70 bg-gradient-to-br from-[#FFF8E7] to-[#FDE6AB] font-bold text-[#9E6E09] dark:from-[#2A2415] dark:to-[#423415] dark:text-[#F4B63D] shadow-sm ${sizeClasses[size]}`}
    >
      {initial ? initial : <User className={iconSizes[size]} strokeWidth={1.8} />}
    </div>
  );
}

/** Hộp kết quả: nền mờ tối, card trắng bo lớn, hiển thị tên và ảnh người trúng. */
export function ResultDialog({ open, eyebrow, name, subtitle, avatarUrl, winners, children }: Props) {
  if (!open) return null;

  const hasMultiple = winners && winners.length > 1;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#111827]/60 p-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[22px] border border-[#E8EBEF] bg-white p-7 text-center shadow-[0_24px_48px_rgba(17,24,39,0.18)] dark:border-white/[0.08] dark:bg-[#141821]">
        <div className="mb-4 inline-flex items-center rounded-full bg-[#FFF8E7] px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#B98311] dark:bg-[#F4B63D]/12">
          {eyebrow}
        </div>

        {hasMultiple ? (
          <div className="mb-5 max-h-56 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {winners.map((w, idx) => (
                <div
                  key={w.id || idx}
                  className="flex flex-col items-center rounded-xl border border-[#F0F2F5] bg-[#FAFBFD] p-3 text-center dark:border-white/[0.06] dark:bg-white/[0.02]"
                >
                  <WinnerAvatar name={w.name} url={w.avatarUrl} size="md" />
                  <p className="mt-2 text-[14px] font-bold leading-tight text-[#111827] dark:text-white line-clamp-1">
                    {w.name}
                  </p>
                  {w.teamName && (
                    <span className="mt-0.5 text-[12px] text-[#6B7280] dark:text-gray-400 line-clamp-1">
                      {w.teamName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-2">
            {(avatarUrl || (winners && winners[0]?.avatarUrl)) && (
              <div className="mb-4">
                <WinnerAvatar name={name} url={avatarUrl || winners?.[0]?.avatarUrl} size="lg" />
              </div>
            )}
            <p className="mb-1.5 text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#111827] dark:text-white">
              {name}
            </p>
          </div>
        )}

        <p className="mb-6 text-[15px] text-[#6B7280] dark:text-gray-400">{subtitle}</p>
        <div className="flex flex-col gap-2.5">{children}</div>
      </div>
    </div>
  );
}
