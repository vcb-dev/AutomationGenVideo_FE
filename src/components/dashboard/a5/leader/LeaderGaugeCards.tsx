const GAUGES = [
  {
    title: "A1. Nhận diện – Tiếp cận",
    pct: 82,
    titleClass: "text-a1",
    barClass: "bg-a1",
    borderClass: "border-t-a1",
    sub: "300 video → 245 hoàn thành",
  },
  {
    title: "A2. Thẩm quyền – Kiến thức",
    pct: 79,
    titleClass: "text-a2",
    barClass: "bg-a2",
    borderClass: "border-t-a2",
    sub: "250 video → 198 hoàn thành",
  },
  {
    title: "A3. Tin cậy – Niềm tin",
    pct: 78,
    titleClass: "text-a3",
    barClass: "bg-a3",
    borderClass: "border-t-a3",
    sub: "200 video → 156 hoàn thành",
  },
  {
    title: "A4. Chuyển đổi – Mua hàng",
    pct: 74,
    titleClass: "text-a4",
    barClass: "bg-a4",
    borderClass: "border-t-a4",
    sub: "120 video → 89 hoàn thành",
  },
  {
    title: "A5. Tài sản – Cốt lõi",
    pct: 67,
    titleClass: "text-a5",
    barClass: "bg-a5",
    borderClass: "border-t-a5",
    sub: "100 video → 67 hoàn thành",
  },
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
            <div className="text-3xl font-extrabold">{g.pct}%</div>
            <div className="flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${g.barClass}`}
                  style={{ width: `${g.pct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">{g.sub}</div>
        </div>
      ))}
    </div>
  );
}
