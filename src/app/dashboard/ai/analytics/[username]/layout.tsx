import { Suspense } from 'react';
import AnalyticsLoading from './loading';

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AnalyticsLoading />}>
      {children}
    </Suspense>
  );
}
