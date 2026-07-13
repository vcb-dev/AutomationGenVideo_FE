export default function StatsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-36 bg-slate-200 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-slate-200 rounded-lg" />
          <div className="h-9 w-28 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg" />
              <div className="h-3 w-20 bg-slate-200 rounded" />
            </div>
            <div className="h-8 w-20 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
        <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
        <div className="h-56 bg-slate-100 rounded-xl" />
      </div>

      {/* Platform breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-slate-200 rounded-full" />
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                  <div className="h-3 w-12 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
