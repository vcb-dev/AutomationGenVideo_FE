export default function ScheduleLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-36 bg-slate-200 rounded-lg" />
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-slate-200 rounded-lg" />
        ))}
      </div>

      {/* Scheduled post cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-2/3 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-1/3 bg-slate-100 rounded" />
            </div>
            <div className="text-right">
              <div className="h-4 w-28 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-slate-100 rounded-lg" />
              <div className="h-8 w-8 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
