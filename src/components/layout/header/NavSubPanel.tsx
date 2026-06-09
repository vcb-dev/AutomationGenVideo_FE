import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NavItem } from "./types";

interface NavSubPanelProps {
    item: NavItem;
    onMouseEnter: () => void;
}

export default function NavSubPanel({ item, onMouseEnter }: NavSubPanelProps) {
    if (!item.subPanel) return null;

    // Group cards by group field (optional), fallback: all in one group
    const groups: { label: string; items: typeof item.subPanel }[] = [];

    item.subPanel.forEach((card) => {
        const groupLabel = (card as any).group ?? "";
        const existing = groups.find((g) => g.label === groupLabel);
        if (existing) {
            existing.items.push(card);
        } else {
            groups.push({ label: groupLabel, items: [card] });
        }
    });

    return (
        <div
            className="border-l border-white/[0.06] bg-[#0d1424] flex flex-col"
            style={{ width: "380px" }}
            onMouseEnter={onMouseEnter}
        >
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-white/[0.05]">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400">
                    Báo cáo
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                    Báo cáo hiệu suất cho Leader & Member
                </p>
            </div>

            {/* Cards */}
            <div className="flex flex-col p-3 gap-1 flex-1">
                {groups.map((group) => (
                    <div key={group.label}>
                        {/* Group label (only if non-empty) */}
                        {group.label && (
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 px-2.5 pt-2 pb-1">
                                {group.label}
                            </p>
                        )}

                        {group.items.map((card) => {
                            const isBlue = card.accentColor === "blue";
                            const accentText = isBlue ? "text-blue-400" : "text-indigo-400";
                            const accentBg = isBlue
                                ? "bg-slate-900 border-slate-800 text-blue-400 group-hover/card:bg-blue-600 group-hover/card:border-blue-500 group-hover/card:text-white"
                                : "bg-slate-900 border-slate-800 text-indigo-400 group-hover/card:bg-indigo-600 group-hover/card:border-indigo-500 group-hover/card:text-white";
                            const accentHover = isBlue
                                ? "hover:bg-blue-500/[0.07] hover:border-blue-500/30"
                                : "hover:bg-indigo-500/[0.07] hover:border-indigo-500/30";

                            return (
                                <Link
                                    key={card.label}
                                    href={card.href}
                                    onClick={() => {
                                        if (card.href.includes("tab=daily_report&report=daily")) {
                                            window.dispatchEvent(
                                                new CustomEvent("resetUserActivityDailyReport", {
                                                    detail: { type: "daily" },
                                                })
                                            );
                                        } else if (card.href.includes("tab=daily_report&report=monthly")) {
                                            window.dispatchEvent(
                                                new CustomEvent("resetUserActivityDailyReport", {
                                                    detail: { type: "monthly" },
                                                })
                                            );
                                        }
                                    }}
                                    className={`
                                        group/card flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent
                                        transition-all duration-150 ${accentHover}
                                    `}
                                >
                                    {/* Icon */}
                                    <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border transition-colors duration-200 ${accentBg}`}
                                    >
                                        <card.icon className="w-4 h-4" />
                                    </div>

                                    {/* Text */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-200 leading-tight group-hover/card:text-white transition-colors">
                                            {card.label}
                                        </p>
                                        {card.description && (
                                            <p className="text-xs text-slate-600 mt-0.5 leading-tight truncate">
                                                {card.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Arrow */}
                                    <ChevronRight
                                        className={`w-3.5 h-3.5 flex-shrink-0 transition-all duration-150 ${accentText} opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-0.5`}
                                    />
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}