'use client';

/**
 * Skeleton placeholder for a channel card while data is loading.
 * Uses CSS animation for a smooth shimmer effect.
 */
export function ChannelCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
        <div className="w-6 h-6 bg-slate-100 rounded-full" />
      </div>
      {/* Stats row */}
      <div className="px-4 pb-4 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-slate-50 p-3 space-y-1">
            <div className="h-3 bg-slate-200 rounded w-2/3 mx-auto" />
            <div className="h-5 bg-slate-200 rounded w-4/5 mx-auto" />
          </div>
        ))}
      </div>
      {/* Footer bar */}
      <div className="border-t border-slate-100 px-4 py-3 flex justify-between items-center">
        <div className="h-3 bg-slate-100 rounded w-24" />
        <div className="h-3 bg-slate-100 rounded w-16" />
      </div>
    </div>
  );
}

/** Render N skeleton cards in a responsive grid — use while the channel list is loading. */
export function ChannelCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ChannelCardSkeleton key={i} />
      ))}
    </div>
  );
}
