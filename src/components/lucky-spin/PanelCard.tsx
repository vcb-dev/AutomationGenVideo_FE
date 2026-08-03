import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { railClass } from '@/components/lucky-spin/styles';

interface Props {
  title?: string;
  className?: string;
  children: ReactNode;
}

export function PanelCard({ title, className, children }: Props) {
  return (
    <div className={cn(railClass, className)}>
      {title && <h3 className="mb-4 text-base font-semibold">{title}</h3>}
      {children}
    </div>
  );
}
