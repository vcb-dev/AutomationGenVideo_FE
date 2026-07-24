import { Info } from "lucide-react";

/** Banner chuẩn cho mọi bảng/biểu đồ dựa trên mô hình 5A (A1-A5) — hệ thống chưa có dữ liệu thật. */
export function A5NotAvailable({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{note}</span>
    </div>
  );
}
