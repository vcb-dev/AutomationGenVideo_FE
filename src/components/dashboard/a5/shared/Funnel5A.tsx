import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { A5NotAvailable } from "./A5NotAvailable";

const STEPS = [
  { key: "a1", label: "A1. NHẬN DIỆN", sub: "Tiếp cận đại chúng", border: "border-a1", text: "text-a1", bg: "bg-pink-50" },
  { key: "a2", label: "A2. THẨM QUYỀN", sub: "Kiến thức chuyên môn", border: "border-a2", text: "text-a2", bg: "bg-blue-50" },
  { key: "a3", label: "A3. TIN CẬY", sub: "Bằng chứng & Niềm tin", border: "border-a3", text: "text-a3", bg: "bg-emerald-50" },
  { key: "a4", label: "A4. CHUYỂN ĐỔI", sub: "Hành động mua hàng", border: "border-a4", text: "text-a4", bg: "bg-amber-50" },
  { key: "a5", label: "A5. TÀI SẢN", sub: "Nội dung cốt lõi", border: "border-a5", text: "text-a5", bg: "bg-purple-50" },
] as const;

interface Funnel5AProps {
  /** Admin: hiện mô tả dưới mỗi bước; Leader: chỉ tiêu đề */
  variant?: "admin" | "leader";
  note: string;
}

export function Funnel5A({ variant = "admin", note }: Funnel5AProps) {
  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-base font-bold">
        <Filter className="h-5 w-5 shrink-0 text-a1" aria-hidden />
        <span>Phễu 5A — Hành trình khách hàng</span>
      </div>
      <div className="mb-4">
        <A5NotAvailable note={note} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 opacity-50 md:px-4">
        {STEPS.map((s) => (
          <div key={s.key} className="flex min-w-[100px] flex-1 flex-wrap items-center justify-center gap-2">
            <div className="flex min-w-[88px] flex-1 flex-col items-center text-center">
              <div
                className={cn(
                  "mx-auto mb-2 flex h-[96px] w-[96px] items-center justify-center rounded-full border-[6px]",
                  s.border,
                  s.bg,
                )}
              >
                <div className="text-xl font-extrabold text-gray-300">—</div>
              </div>
              <div className={cn("text-sm font-bold", s.text)}>{s.label}</div>
              {variant === "admin" && <div className="mt-0.5 text-xs text-gray-500">{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
