import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  colSpan: number;
  icon: LucideIcon;
  children: ReactNode;
}

/** Ô trống của bảng: icon outline xám + một dòng gợi ý việc cần làm tiếp. */
export function EmptyRow({ colSpan, icon: Icon, children }: Props) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8FAFC] dark:bg-white/[0.04]">
            <Icon className="h-7 w-7 text-[#9CA3AF]" strokeWidth={1.5} />
          </span>
          <p className="max-w-xs text-[15px] leading-relaxed text-[#6B7280] dark:text-gray-400">{children}</p>
        </div>
      </td>
    </tr>
  );
}
