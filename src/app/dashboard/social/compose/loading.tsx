export default function ComposeLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 animate-pulse">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - compose form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Account selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="h-4 w-28 bg-slate-200 rounded mb-3" />
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 w-28 bg-slate-100 rounded-xl" />
                ))}
              </div>
            </div>

            {/* Caption textarea */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
              <div className="h-40 bg-slate-100 rounded-xl" />
              <div className="flex justify-between mt-2">
                <div className="h-3 w-24 bg-slate-100 rounded" />
                <div className="h-3 w-16 bg-slate-100 rounded" />
              </div>
            </div>

            {/* Media upload */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
              <div className="h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200" />
            </div>

            {/* Submit button */}
            <div className="h-12 bg-slate-200 rounded-xl" />
          </div>

          {/* Right panel - preview */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="h-4 w-20 bg-slate-200 rounded mb-4" />
              <div className="aspect-[9/16] bg-slate-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
