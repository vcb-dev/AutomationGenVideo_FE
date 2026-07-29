export default function CalendarLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-36 bg-slate-200 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-slate-200 rounded-lg" />
          <div className="h-9 w-32 bg-slate-200 rounded-lg" />
          <div className="h-9 w-9 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-50 border-r border-slate-100 last:border-r-0" />
          ))}
        </div>
        {/* Weeks */}
        {Array.from({ length: 5 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
            {Array.from({ length: 7 }).map((_, day) => (
              <div key={day} className="h-28 border-r border-slate-100 last:border-r-0 p-2">
                <div className="h-5 w-5 bg-slate-100 rounded-full mb-2" />
                {Math.random() > 0.6 && (
                  <div className="h-5 bg-blue-100 rounded mb-1" />
                )}
                {Math.random() > 0.7 && (
                  <div className="h-5 bg-indigo-100 rounded" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
