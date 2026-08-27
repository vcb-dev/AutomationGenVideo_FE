'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FilePlus,
  CheckSquare,
  PackageCheck,
  Handshake,
  RotateCcw,
  Boxes,
} from 'lucide-react';

const STEPS = [
  {
    href: '/dashboard/equipment',
    label: 'Kho thiết bị',
    icon: Boxes,
    match: (p: string) => p === '/dashboard/equipment',
  },
  {
    href: '/dashboard/equipment/new-request',
    label: '1. Tạo phiếu',
    icon: FilePlus,
    match: (p: string) => p.includes('/new-request'),
  },
  {
    href: '/dashboard/equipment/approvals',
    label: '2. Duyệt phiếu',
    icon: CheckSquare,
    match: (p: string) => p.includes('/approvals'),
  },
  {
    href: '/dashboard/equipment/prepare',
    label: '3. Chuẩn bị máy',
    icon: PackageCheck,
    match: (p: string) => p.includes('/prepare'),
  },
  {
    href: '/dashboard/equipment/handover',
    label: '4. Bàn giao',
    icon: Handshake,
    match: (p: string) => p.includes('/handover'),
  },
  {
    href: '/dashboard/equipment/returns',
    label: '5. Trả máy',
    icon: RotateCcw,
    match: (p: string) => p.includes('/returns'),
  },
];

export function EquipmentWorkflowNav() {
  const pathname = usePathname() || '';

  return (
    <div className="mb-6 overflow-x-auto pb-1">
      <nav className="flex items-center gap-1.5 min-w-max p-1.5 bg-slate-100/80 dark:bg-white/[0.04] rounded-2xl border border-slate-200/80 dark:border-white/[0.08]">
        {STEPS.map((step, idx) => {
          const isActive = step.match(pathname);
          const Icon = step.icon;

          return (
            <div key={step.href} className="flex items-center">
              <Link
                href={step.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all',
                  isActive
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]',
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-blue-600 dark:text-white' : 'text-slate-400')} />
                <span>{step.label}</span>
              </Link>
              {idx < STEPS.length - 1 && idx > 0 && (
                <span className="mx-1 text-slate-300 dark:text-slate-600 font-bold">›</span>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
