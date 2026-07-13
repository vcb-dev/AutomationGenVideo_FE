"use client";

import { cn } from "@/lib/utils";

interface AdminHeaderProps {
    tab: number;
    onTabChange: (i: number) => void;
}

export function AdminHeader({ tab, onTabChange }: AdminHeaderProps) {
    return (
        <header className="mb-4 border-b border-gray-200 py-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="min-w-0" aria-hidden />
                <nav className="flex shrink-0 justify-center gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1">
                    <button
                        type="button"
                        onClick={() => onTabChange(0)}
                        className={cn(
                            "rounded-lg px-5 py-2 text-sm font-medium",
                            tab === 0 ? "bg-indigo-600 text-white shadow" : "text-gray-500 hover:bg-gray-50",
                        )}
                    >
                        Tổng quan
                    </button>
                    <button
                        type="button"
                        onClick={() => onTabChange(1)}
                        className={cn(
                            "rounded-lg px-5 py-2 text-sm font-medium",
                            tab === 1 ? "bg-indigo-600 text-white shadow" : "text-gray-500 hover:bg-gray-50",
                        )}
                    >
                        KPI & Phân bổ
                    </button>
                </nav>
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
                    <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs">Tháng 3/2026</span>
                    <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        Admin
                    </span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                        AD
                    </div>
                </div>
            </div>
        </header>
    );
}
