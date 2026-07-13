'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

interface TeamSelectorProps {
  selectedTeam: string;
  onTeamChange: (team: string) => void;
}

export function useUserTeams(): string[] {
  const user = useAuthStore((s) => s.user);
  if (!user?.team) return [];
  return user.team
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function TeamSelector({ selectedTeam, onTeamChange }: TeamSelectorProps) {
  const teams = useUserTeams();

  if (teams.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
      <button
        onClick={() => onTeamChange('')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
          !selectedTeam
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Tất cả
      </button>
      {teams.map((team) => (
        <button
          key={team}
          onClick={() => onTeamChange(team)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            selectedTeam === team
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {team}
        </button>
      ))}
    </div>
  );
}
