import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  icon: Icon,
  children,
  className,
  iconClassName,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-base font-bold text-gray-900", className)}>
      <Icon className={cn("h-5 w-5 shrink-0 text-gray-600", iconClassName)} aria-hidden />
      <span>{children}</span>
    </div>
  );
}
