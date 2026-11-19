"use client";

import { RefreshCw } from "lucide-react";

// ── KPI Cards Skeleton ─────────────────────────────────────────────────────────
// Dùng ở: UserActivityPage (KPI bar), PersonalCharts (khi chưa có data)
export const KpiCardsSkeleton = ({ count = 4 }: { count?: number }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200/60 p-3 animate-pulse">
                <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 rounded-full bg-slate-100" />
                    <div className="flex-1">
                        <div className="h-8 w-20 bg-slate-200 rounded mb-2" />
                        <div className="h-3 w-28 bg-slate-100 rounded" />
                    </div>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between">
                    <div className="h-6 w-16 bg-slate-100 rounded" />
                    <div className="h-6 w-16 bg-slate-100 rounded" />
                </div>
            </div>
        ))}
    </div>
);

// ── User Activity Card Skeleton ────────────────────────────────────────────────
// Dùng ở: PersonalCharts (danh sách thẻ nhân viên)
export const UserActivityCardSkeleton = () => (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-3 animate-pulse">
        <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3 bg-slate-100 rounded w-4/5" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
            </div>
        </div>
        <div className="border-t border-slate-50" />
        <div className="flex flex-col gap-2">
            <div className="h-2.5 bg-slate-100 rounded w-[90%]" />
            <div className="h-2.5 bg-slate-100 rounded w-[70%]" />
            <div className="h-2.5 bg-slate-100 rounded w-[80%]" />
        </div>
        <div className="flex items-center justify-between">
            <div className="h-5 bg-slate-100 rounded-full w-16" />
            <div className="h-2.5 bg-slate-100 rounded w-10" />
        </div>
    </div>
);

// ── Employee Card Grid Skeleton ────────────────────────────────────────────────
// Wrapper cho lưới thẻ nhân viên, dùng ở PersonalCharts
export const EmployeeCardGridSkeleton = ({ count = 8 }: { count?: number }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-8">
        {Array.from({ length: count }).map((_, i) => (
            <UserActivityCardSkeleton key={i} />
        ))}
    </div>
);

// ── Page Fallback ──────────────────────────────────────────────────────────────
// Dùng ở: Suspense fallback trong UserActivityPage
export const PageLoadingFallback = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-blue-600" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu...</p>
        </div>
    </div>
);