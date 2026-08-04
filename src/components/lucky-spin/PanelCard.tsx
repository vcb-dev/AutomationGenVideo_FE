import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { cardClass, cardTitleClass } from '@/components/lucky-spin/styles';

interface Props {
  title?: string;
  className?: string;
  children: ReactNode;
}

export function PanelCard({ title, className, children }: Props) {
  return (
    <div className={cn(cardClass, className)}>
      {title && <h3 className={cn(cardTitleClass, 'mb-5')}>{title}</h3>}
      {children}
    </div>
  );
}
