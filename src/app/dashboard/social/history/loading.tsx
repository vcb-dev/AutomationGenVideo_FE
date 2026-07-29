export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 animate-pulse">
      {/* Header + stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-slate-200 rounded-lg" />
        <div className="h-9 w-28 bg-slate-200 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
            <div className="h-7 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="h-9 w-48 bg-slate-200 rounded-lg" />
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Table rows */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-11 bg-slate-100 border-b border-slate-200" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-full bg-slate-200" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
