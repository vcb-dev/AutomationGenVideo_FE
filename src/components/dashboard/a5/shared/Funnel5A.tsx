import { ArrowRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "a1", label: "A1. NHẬN DIỆN", value: "1.2M", sub: "Tiếp cận đại chúng", border: "border-a1", text: "text-a1", bg: "bg-pink-50" },
  { key: "a2", label: "A2. THẨM QUYỀN", value: "420K", sub: "Kiến thức chuyên môn", border: "border-a2", text: "text-a2", bg: "bg-blue-50" },
  { key: "a3", label: "A3. TIN CẬY", value: "185K", sub: "Bằng chứng & Niềm tin", border: "border-a3", text: "text-a3", bg: "bg-emerald-50" },
  { key: "a4", label: "A4. CHUYỂN ĐỔI", value: "95K", sub: "Hành động mua hàng", border: "border-a4", text: "text-a4", bg: "bg-amber-50" },
  { key: "a5", label: "A5. TÀI SẢN", value: "28K", sub: "Nội dung cốt lõi", border: "border-a5", text: "text-a5", bg: "bg-purple-50" },
] as const;

interface Funnel5AProps {
  /** Admin: hiện mô tả dưới mỗi bước; Leader: chỉ tiêu đề (mock gốc ngắn hơn) */
  variant?: "admin" | "leader";
  /** 5 giá trị view đã scale theo bộ lọc (mặc định mock tĩnh) */
  stepValues?: readonly string[];
}

export function Funnel5A({ variant = "admin", stepValues }: Funnel5AProps) {
  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-base font-bold">
        <Filter className="h-5 w-5 shrink-0 text-a1" aria-hidden />
        <span>Phễu 5A — Hành trình khách hàng</span>
        <span className="text-xs font-normal text-gray-500">(view)</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 md:px-4">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex min-w-[100px] flex-1 flex-wrap items-center justify-center gap-2">
            <div className="flex min-w-[88px] flex-1 flex-col items-center text-center">
              <div
                className={cn(
                  "mx-auto mb-2 flex h-[96px] w-[96px] items-center justify-center rounded-full border-[6px]",
                  s.border,
                  s.bg,
                )}
              >
                <div>
                  <div className={cn("text-xl font-extrabold", s.text)}>
                    {stepValues?.[i] ?? s.value}
                  </div>
                  <div className="text-xs text-gray-500">view</div>
                </div>
              </div>
              <div className={cn("text-sm font-bold", s.text)}>{s.label}</div>
              {variant === "admin" && <div className="mt-0.5 text-xs text-gray-500">{s.sub}</div>}
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="hidden h-5 w-5 shrink-0 text-gray-300 sm:inline" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
