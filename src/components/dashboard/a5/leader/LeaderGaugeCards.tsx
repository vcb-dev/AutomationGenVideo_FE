const GAUGES = [
  { title: "A1. Nhận diện – Tiếp cận", titleClass: "text-a1", borderClass: "border-t-a1" },
  { title: "A2. Thẩm quyền – Kiến thức", titleClass: "text-a2", borderClass: "border-t-a2" },
  { title: "A3. Tin cậy – Niềm tin", titleClass: "text-a3", borderClass: "border-t-a3" },
  { title: "A4. Chuyển đổi – Mua hàng", titleClass: "text-a4", borderClass: "border-t-a4" },
  { title: "A5. Tài sản – Cốt lõi", titleClass: "text-a5", borderClass: "border-t-a5" },
] as const;

export function LeaderGaugeCards() {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {GAUGES.map((g) => (
        <div
          key={g.title}
          className={`rounded-xl border border-gray-100 border-t-[3px] bg-white p-4 shadow-sm ${g.borderClass}`}
        >
          <div className={`text-sm font-bold ${g.titleClass}`}>{g.title}</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="text-3xl font-extrabold text-gray-300">—</div>
            <div className="flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">Chưa có dữ liệu theo A1-A5</div>
        </div>
      ))}
    </div>
  );
}
