export default function ChannelsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-52 bg-slate-200 rounded-lg" />
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-slate-200 rounded-full" />
        ))}
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
              <div className="h-7 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="h-px bg-slate-100 mb-3" />
            <div className="flex gap-2">
              <div className="h-8 flex-1 bg-slate-100 rounded-lg" />
              <div className="h-8 w-8 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Connect buttons */}
      <div className="mt-8">
        <div className="h-5 w-36 bg-slate-200 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
