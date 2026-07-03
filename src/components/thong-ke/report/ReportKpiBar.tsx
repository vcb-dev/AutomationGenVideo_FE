import React, { useMemo } from 'react';
import {
  Trophy, TrendingUp, TrendingDown, Video,
  Eye, XCircle, Zap, BarChart2
} from 'lucide-react';
import { TeamData } from '../types';

interface ReportKpiBarProps {
  teamsData: Record<string, TeamData>;
  activeTab: string;
  filterMode: 'all' | 'week' | 'month';
  selectedWeek: 'all' | '1' | '2' | '3' | '4';
}

function fmtViews(viewsStr: string): string {
  if (!viewsStr || viewsStr === '-') return '-';
  const clean = viewsStr.replace(/\s*views/gi, '').trim();
  const mM = clean.match(/^([\d.]+)\s*M/i);
  if (mM) return `${parseFloat(mM[1]).toFixed(1)}M`;
  const mK = clean.match(/^([\d.]+)\s*K/i);
  if (mK) return `${parseFloat(mK[1]).toFixed(0)}K`;
  const n = parseInt(clean.replace(/[^\d]/g, ''), 10);
  if (isNaN(n)) return clean;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function viewsToNum(viewsStr: string): number {
  const clean = viewsStr.replace(/\s*views/gi, '').trim();
  const mM = clean.match(/^([\d.]+)\s*M/i);
  if (mM) return parseFloat(mM[1]) * 1_000_000;
  const mK = clean.match(/^([\d.]+)\s*K/i);
  if (mK) return parseFloat(mK[1]) * 1_000;
  return parseInt(clean.replace(/[^\d]/g, ''), 10) || 0;
}

function sumViews(list: string[]): string {
  const total = list.reduce((s, v) => s + viewsToNum(v), 0);
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `${(total / 1_000).toFixed(0)}K`;
  return total.toString();
}

export default function ReportKpiBar({ teamsData, activeTab, filterMode, selectedWeek }: ReportKpiBarProps) {
  const baseData = teamsData[activeTab];

  const stats = useMemo(() => {
    const wins = baseData.videos;
    const fails = baseData.failVideos;
    const total = wins.length + fails.length;
    const winRate = total > 0 ? (wins.length / total) * 100 : 0;
    const failRate = total > 0 ? (fails.length / total) * 100 : 0;
    const totalViews = sumViews(wins.map(v => v.views));
    const topViews = wins.length > 0
      ? wins.reduce((a, b) => viewsToNum(a.views) > viewsToNum(b.views) ? a : b).views
      : '0';
    const totalMade = baseData.editorPerformance.reduce((s, e) => s + (e.totalVideos || 0), 0);
    const totalWinNew = baseData.editorPerformance.reduce((s, e) => s + (e.winVideos || 0), 0);
    const newWinRate = totalMade > 0 ? (totalWinNew / totalMade) * 100 : 0;
    return {
      wins: wins.length, fails: fails.length, total, winRate, failRate,
      totalViews, topViews, newWinRate, totalMade, totalWinNew,
    };
  }, [baseData, filterMode, selectedWeek]);

  const cards = [
    {
      id: 'total', label: 'Tổng video', value: stats.total.toString(),
      sub: `${stats.wins} win · ${stats.fails} fail`, icon: Video,
      iconCls: 'bg-blue-500/15 border-blue-500/25 text-blue-400', border: 'border-blue-500/20',
      glow: 'shadow-[0_0_18px_rgba(59,130,246,0.07)]', trend: null as string | null,
      bar: 'bg-blue-500', barPct: Math.min(100, (stats.total / 10) * 100),
    },
    {
      id: 'win', label: 'Content Win', value: stats.wins.toString(),
      sub: `Tỷ lệ ${stats.winRate.toFixed(1).replace('.', ',')}%`, icon: Trophy,
      iconCls: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400', border: 'border-emerald-500/20',
      glow: 'shadow-[0_0_18px_rgba(16,185,129,0.07)]',
      trend: (stats.winRate >= 30 ? 'up' : stats.winRate < 15 ? 'down' : null) as string | null,
      bar: 'bg-emerald-500', barPct: Math.min(100, stats.winRate),
    },
    {
      id: 'fail', label: 'Content Fail', value: stats.fails.toString(),
      sub: `Tỷ lệ ${stats.failRate.toFixed(1).replace('.', ',')}%`, icon: XCircle,
      iconCls: 'bg-rose-500/15 border-rose-500/25 text-rose-400', border: 'border-rose-500/20',
      glow: 'shadow-[0_0_18px_rgba(244,63,94,0.07)]',
      trend: (stats.failRate >= 60 ? 'down' : stats.failRate <= 40 ? 'up' : null) as string | null,
      bar: 'bg-rose-500', barPct: Math.min(100, stats.failRate),
    },
    {
      id: 'winrate', label: 'Win Rate',
      value: `${stats.winRate.toFixed(1).replace('.', ',')}%`,
      sub: stats.winRate >= 30 ? 'Vượt chỉ tiêu' : stats.winRate >= 15 ? 'Đạt chỉ tiêu' : 'Dưới chỉ tiêu',
      icon: BarChart2,
      iconCls: stats.winRate >= 30 ? 'bg-amber-500/15 border-amber-500/25 text-amber-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400',
      border: stats.winRate >= 30 ? 'border-amber-500/20' : 'border-slate-500/15',
      glow: stats.winRate >= 30 ? 'shadow-[0_0_18px_rgba(245,158,11,0.09)]' : '',
      trend: (stats.winRate >= 30 ? 'up' : stats.winRate < 15 ? 'down' : null) as string | null,
      bar: stats.winRate >= 30 ? 'bg-amber-500' : stats.winRate >= 15 ? 'bg-slate-500' : 'bg-rose-500',
      barPct: Math.min(100, stats.winRate),
    },
    {
      id: 'views', label: 'Tổng lượt xem', value: stats.totalViews,
      sub: `Top: ${fmtViews(stats.topViews)}`, icon: Eye,
      iconCls: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400', border: 'border-cyan-500/20',
      glow: 'shadow-[0_0_18px_rgba(6,182,212,0.07)]', trend: null as string | null,
      bar: 'bg-cyan-500', barPct: 70,
    },
    {
      id: 'newwin', label: 'Win Rate mới',
      value: `${stats.newWinRate.toFixed(1).replace('.', ',')}%`,
      sub: `${stats.totalWinNew} / ${stats.totalMade} video`, icon: Zap,
      iconCls: 'bg-purple-500/15 border-purple-500/25 text-purple-400', border: 'border-purple-500/20',
      glow: 'shadow-[0_0_18px_rgba(168,85,247,0.07)]',
      trend: (stats.newWinRate >= 20 ? 'up' : stats.newWinRate < 10 ? 'down' : null) as string | null,
      bar: 'bg-purple-500', barPct: Math.min(100, stats.newWinRate * 2),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-1">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`relative bg-[#0c1322] border ${card.border} rounded-2xl p-4 flex flex-col gap-2 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 overflow-hidden group ${card.glow}`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.015] to-transparent pointer-events-none rounded-2xl" />
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${card.iconCls}`}>
                <Icon className="w-4 h-4" />
              </div>
              {card.trend === 'up' && (
                <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                  <TrendingUp className="w-2.5 h-2.5" />
                  Tốt
                </span>
              )}
              {card.trend === 'down' && (
                <span className="flex items-center gap-0.5 text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
                  <TrendingDown className="w-2.5 h-2.5" />
                  Yếu
                </span>
              )}
            </div>
            <div>
              <div className="text-xl font-black text-white leading-none tracking-tight">{card.value}</div>
              <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mt-0.5">{card.label}</div>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold leading-snug">{card.sub}</div>
            <div className="h-1 w-full bg-white/[0.04] rounded-full overflow-hidden mt-auto">
              <div
                className={`h-full ${card.bar} rounded-full transition-all duration-700`}
                style={{ width: `${card.barPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
