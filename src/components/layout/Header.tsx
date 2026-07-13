"use client";

import { Suspense } from "react";
import { HeaderProps } from "./header/types";
import HeaderInner from "./header/HeaderInner";

function HeaderSkeleton() {
    return (
        <header className="sticky top-0 z-[1000] bg-[#0d1424] border-b border-white/[0.06] shadow-lg shadow-black/20">
            <div className="flex items-center h-16 px-3 gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-md bg-white/[0.06]" />
                <div className="w-24 h-4 rounded bg-white/[0.06] hidden sm:block" />
                <div className="flex-1" />
                <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
            </div>
        </header>
    );
}

export default function Header(props: HeaderProps) {
    return (
        <Suspense fallback={<HeaderSkeleton />}>
            <HeaderInner {...props} />
        </Suspense>
    );
}
