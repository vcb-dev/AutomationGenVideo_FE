import React from 'react';

interface TeamSelectorProps {
  teams: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TeamSelector({ teams, activeTab, onTabChange }: TeamSelectorProps) {
  return (
    <div className="flex bg-card border border-border p-1 rounded-xl w-full max-w-xs shadow-inner">
      {teams.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === tab
            ? 'bg-primary text-primary-foreground shadow-md scale-100'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
