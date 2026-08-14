import { cn } from '@/lib/utils';

export interface Step {
  label: string;
  state: 'done' | 'current' | 'todo';
}

/**
 * Thanh bốn bước của luồng mượn: duyệt → gán serial → kiểm tra khi giao → bàn giao.
 * Dùng chung cho màn Chuẩn bị và màn Bàn giao để người dùng thấy mình đang đứng ở đâu.
 */
export function StepBar({ steps }: { steps: Step[] }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-y-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <span
            className={cn(
              'flex items-center gap-2 text-xs font-semibold',
              step.state === 'done' && 'text-emerald-600 dark:text-emerald-400',
              step.state === 'current' && 'text-blue-600 dark:text-blue-400',
              step.state === 'todo' && 'text-slate-400',
            )}
          >
            <span
              className={cn(
                'grid h-6 w-6 place-items-center rounded-full text-[11px]',
                step.state === 'done' &&
                  'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
                step.state === 'current' && 'bg-blue-600 text-white',
                step.state === 'todo' && 'bg-slate-200 text-slate-500 dark:bg-white/[0.08]',
              )}
            >
              {step.state === 'done' ? '✓' : i + 1}
            </span>
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <span className="mx-3 h-0.5 w-8 bg-slate-200 dark:bg-white/[0.1]" />
          )}
        </div>
      ))}
    </div>
  );
}
