export default function AnalyticsLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
      <p className="text-slate-600 font-medium">Loading analytics...</p>
      <p className="text-slate-400 text-sm">Fetching channel data</p>
    </div>
  );
}
