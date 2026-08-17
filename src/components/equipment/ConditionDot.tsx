import { cn } from '@/lib/utils';
import { conditionLabel, ConditionTone } from '@/lib/equipment/status-label';

/**
 * Tình trạng luôn hiện bằng chấm màu kèm chữ. Chấm màu là thang bốn mức nên đọc được thứ tự
 * nặng nhẹ, còn thẻ bo tròn của Trạng thái thì không có thứ tự.
 *
 * Chữ luôn đi kèm chấm, không bao giờ để chấm trần: người mù màu chỉ còn cách đoán.
 */
const TONE: Record<ConditionTone, string> = {
  good: 'bg-teal-500',
  used: 'bg-amber-500',
  check: 'bg-orange-600',
  broken: 'bg-red-700',
};

export function ConditionDot({ condition }: { condition: string }) {
  const { label, tone } = conditionLabel(condition);
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <i className={cn('h-2 w-2 shrink-0 rounded-full', TONE[tone])} />
      {label}
    </span>
  );
}
