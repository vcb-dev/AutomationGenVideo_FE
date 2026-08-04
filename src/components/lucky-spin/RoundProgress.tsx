'use client';

import { cn } from '@/lib/utils';

interface Props {
  /** Số vòng của lượt đang chạy; 0 hoặc 1 thì không cần hiện gì. */
  total: number;
  revealed: number;
  names: string[];
  onDark?: boolean;
}

/**
 * Tiến độ của lượt bốc nhiều người: đang ở vòng thứ mấy và ai đã ra.
 *
 * Không có nó thì bốc 5 người sẽ là 5 vòng quay liên tiếp mà không ai biết còn mấy vòng nữa,
 * cũng không nhớ nổi những người vừa ra.
 */
export function RoundProgress({ total, revealed, names, onDark }: Props) {
  if (total <= 1) return null;

  const done = revealed >= total;

  return (
    <div className="mt-4 flex flex-col items-center gap-2.5 text-center">
      <span
        className={cn(
          'rounded-full px-4 py-1.5 text-[13px] font-semibold',
          onDark ? 'bg-white/10 text-white/80' : 'bg-[#FFF8E7] text-[#8A6410]',
        )}
      >
        {done ? `Đã quay xong ${total} người` : `Đang quay người ${Math.min(revealed + 1, total)}/${total}`}
      </span>

      {names.length > 0 && (
        <div className="flex max-w-md flex-wrap items-center justify-center gap-2">
          {names.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className={cn(
                'rounded-full px-3 py-1 text-[13px] font-medium',
                onDark ? 'bg-[#F4B63D] text-[#111827]' : 'bg-[#F3F4F6] text-[#111827] dark:bg-white/[0.08] dark:text-gray-100',
              )}
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
