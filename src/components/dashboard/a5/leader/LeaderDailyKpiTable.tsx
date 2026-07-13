import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Save,
  Target,
} from "lucide-react";

const ROWS = [
  { name: "Nguyễn Văn A", initials: "NA", bg: "bg-amber-500", a: [2, 1, 1, 1, 0], note: "Focus A4" },
  { name: "Nguyễn Văn C", initials: "VC", bg: "bg-teal-500", a: [1, 1, 0, 0, 1], note: "A5 hero" },
  { name: "Mai G", initials: "MG", bg: "bg-green-500", a: [0, 0, 2, 0, 0], note: "Hậu trường" },
  { name: "Lê F", initials: "LF", bg: "bg-violet-500", a: [1, 1, 1, 0, 0], note: "Bổ sung A3" },
];

export function LeaderDailyKpiTable() {
  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-base font-bold">
          <Target className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          Giao KPI video ngày
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
            aria-label="Ngày trước"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <input
            type="date"
            defaultValue="2026-03-24"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-amber-400"
          />
          <button
            type="button"
            className="inline-flex rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
            aria-label="Ngày sau"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <span className="ml-1 text-xs text-gray-500">Thứ 3</span>
        </div>
      </div>
      <div className="mb-4 text-sm text-gray-500">
        Leader giao số video theo 5A cho từng người mỗi ngày
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                THÀNH VIÊN
              </th>
              <th className="pb-2 text-center text-xs font-bold text-a1">A1</th>
              <th className="pb-2 text-center text-xs font-bold text-a2">A2</th>
              <th className="pb-2 text-center text-xs font-bold text-a3">A3</th>
              <th className="pb-2 text-center text-xs font-bold text-a4">A4</th>
              <th className="pb-2 text-center text-xs font-bold text-a5">A5</th>
              <th className="pb-2 text-center text-xs font-bold text-gray-700">TỔNG</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                GHI CHÚ
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const sum = r.a.reduce((s, x) => s + x, 0);
              return (
                <tr key={r.name} className="border-b border-gray-50">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${r.bg}`}
                      >
                        {r.initials}
                      </div>
                      <b>{r.name}</b>
                    </div>
                  </td>
                  {r.a.map((v, i) => (
                    <td key={i} className="text-center">
                      <input
                        className="w-11 rounded border border-gray-200 py-1.5 text-center text-sm font-semibold outline-none focus:border-blue-400"
                        defaultValue={v}
                      />
                    </td>
                  ))}
                  <td className="text-center font-bold text-blue-600">{sum}</td>
                  <td className="text-center text-xs text-gray-500">{r.note}</td>
                </tr>
              );
            })}
            <tr className="bg-amber-50 font-bold">
              <td className="py-2.5">TỔNG NGÀY</td>
              <td className="text-center text-a1">4</td>
              <td className="text-center text-a2">3</td>
              <td className="text-center text-a3">4</td>
              <td className="text-center text-a4">1</td>
              <td className="text-center text-a5">1</td>
              <td className="text-center text-blue-700">13</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
        >
          <Save className="h-4 w-4 shrink-0" aria-hidden />
          Lưu KPI ngày
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600"
        >
          <ClipboardCopy className="h-4 w-4 shrink-0" aria-hidden />
          Sao chép từ hôm qua
        </button>
        <span className="flex-1" />
        <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-gray-500">
          Còn lại: A1:18 · A2:18 ·{" "}
          <span className="inline-flex items-center gap-0.5 font-semibold text-red-500">
            A3:38
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </span>{" "}
          · A4:19 ·{" "}
          <span className="inline-flex items-center gap-0.5">
            A5 đạt
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          </span>
        </span>
      </div>
    </div>
  );
}
