import React from 'react';

interface TeamSelectorProps {
  teams: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TeamSelector({ teams, activeTab, onTabChange }: TeamSelectorProps) {
  return (
    <div className="flex bg-[#121929] border border-white/[0.08] p-1 rounded-xl w-full max-w-xs shadow-inner">
      {teams.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === tab
            ? 'bg-[#bfdbfe] text-[#1e3a8a] shadow-md scale-100'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
