'use client';

import { useEffect } from 'react';

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Analytics error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold text-slate-800">Đã xảy ra lỗi</h2>
      <p className="text-slate-600 text-sm text-center max-w-md">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
      >
        Thử lại
      </button>
    </div>
  );
}
