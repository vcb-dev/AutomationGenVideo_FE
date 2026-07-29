"use client";

interface LeaderHeaderProps {
  teamName: string;
  monthLabel: string;
}

export function LeaderHeader({ teamName, monthLabel }: LeaderHeaderProps) {
  return (
    <header className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-5">
      <h1 className="text-center text-lg font-extrabold uppercase tracking-tight text-amber-900 sm:text-2xl">
        Báo cáo team {teamName} {monthLabel}
      </h1>
    </header>
  );
}
