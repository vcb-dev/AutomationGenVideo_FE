import Link from 'next/link';
import { cn } from '@/lib/utils';

export type KpiTone = 'neutral' | 'ok' | 'busy' | 'bad' | 'maint';

const ACCENT: Record<KpiTone, string> = {
  neutral: 'bg-slate-400',
  ok: 'bg-emerald-500',
  busy: 'bg-blue-500',
  bad: 'bg-red-600',
  maint: 'bg-violet-500',
};

const VALUE: Record<KpiTone, string> = {
  neutral: 'text-slate-900 dark:text-white',
  ok: 'text-emerald-600 dark:text-emerald-400',
  busy: 'text-blue-600 dark:text-blue-400',
  bad: 'text-red-600 dark:text-red-400',
  maint: 'text-violet-600 dark:text-violet-400',
};

interface KpiCardProps {
  label: string;
  value: number;
  hint?: string;
  tone?: KpiTone;
  /** Bấm vào chỉ số phải ra đúng danh sách sinh ra nó, nếu không con số chỉ để ngắm. */
  href: string;
}

export function KpiCard({ label, value, hint, tone = 'neutral', href }: KpiCardProps) {
  return (
    <Link
      href={href}
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20"
    >
      <span className={cn('absolute inset-x-0 top-0 h-[3px]', ACCENT[tone])} />
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn('mt-2 text-3xl font-bold leading-none', VALUE[tone])}>{value}</div>
      <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">{hint ?? ' '}</div>
    </Link>
  );
}
