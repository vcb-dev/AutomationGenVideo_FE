import { cn } from '@/lib/utils';
import { statusLabel, StatusTone } from '@/lib/equipment/status-label';

/**
 * Trạng thái luôn hiện bằng thẻ bo tròn, KHÔNG bao giờ bằng chấm màu — chấm màu dành riêng
 * cho Tình trạng. Hai loại thông tin khác nhau phải nhìn ra khác nhau ngay từ xa.
 */
const TONE: Record<StatusTone, string> = {
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  busy: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  maint: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  bad: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  wait: 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300',
};

export function StatusPill({ status }: { status: string }) {
  const { label, tone } = statusLabel(status);
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        TONE[tone],
      )}
    >
      {label}
    </span>
  );
}
