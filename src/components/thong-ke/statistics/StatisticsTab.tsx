'use client';
import React, { useState } from 'react';
import {
  TrendingUp, Eye, Trophy, Video, Flame, Award, Share2,
  Target, Sparkles, XCircle, CheckCircle, FileDown, Download,
  X, MessageSquare, Wrench
} from 'lucide-react';
import { TeamData } from '../types';
import { TEAMS_DATA } from '../constants';

interface StatisticsTabProps {
  teamsData: Record<string, TeamData>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  platformFilter: 'All' | 'TikTok' | 'Instagram Reels' | 'YouTube Shorts';
  setPlatformFilter: (filter: 'All' | 'TikTok' | 'Instagram Reels' | 'YouTube Shorts') => void;
  editorSearchQuery: string;
  setEditorSearchQuery: (query: string) => void;
  editorSortBy: 'winRate' | 'totalVideos' | 'avgViews';
  setEditorSortBy: (sort: 'winRate' | 'totalVideos' | 'avgViews') => void;
  selectedEditorDetail: any | null;
  setSelectedEditorDetail: (detail: any | null) => void;
  isExporting: boolean;
  exportProgress: number;
  exportType: 'pdf' | 'excel' | null;
  handleStartExport: (type: 'pdf' | 'excel') => void;
}

export default function StatisticsTab({
  teamsData, activeTab, onTabChange,
  platformFilter, setPlatformFilter,
  editorSearchQuery, setEditorSearchQuery,
  editorSortBy, setEditorSortBy,
  selectedEditorDetail, setSelectedEditorDetail,
  isExporting, exportProgress, exportType, handleStartExport
}: StatisticsTabProps) {

  const baseData = teamsData[activeTab] || TEAMS_DATA[activeTab];

  // Helper functions
  const parseViewsToNum = (vStr: string): number => {
    if (!vStr) return 0;
    const clean = vStr.replace(/\s*views/gi, '').replace(/\./g, '').replace(/,/g, '').trim();
    const matchM = clean.match(/^([\d.]+)\s*M/i);
    if (matchM) return Math.round(parseFloat(matchM[1]) * 1000000);
    const matchK = clean.match(/^([\d.]+)\s*K/i);
    if (matchK) return Math.round(parseFloat(matchK[1]) * 1000);
    const parsed = parseInt(clean.replace(/[^\d.]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatViewsCompact = (num: number): string => {
    if (num >= 1000000) {
      const millions = num / 1000000;
      const formatted = Math.floor(millions * 10) / 10;
      return `${formatted.toString().replace('.', ',')}M`;
    }
    if (num >= 1000) {
      const thousands = num / 1000;
      const formatted = Math.floor(thousands * 10) / 10;
      return `${formatted.toString().replace('.', ',')}K`;
    }
    return num.toString();
  };

  // Filter lists based on selected platform filter
  const filteredVideos = (baseData.videos || []).filter((v: any) => platformFilter === 'All' || v.platform === platformFilter);
  const filteredFailVideos = (baseData.failVideos || []).filter((v: any) => platformFilter === 'All' || v.platform === platformFilter);
  const filteredCaseStudies = (baseData.caseStudies || []).filter((c: any) => platformFilter === 'All' || c.platform === platformFilter);

  // 1. Platform Distribution
  const platformStats = {
    'TikTok': { count: 0, views: 0, win: 0, fail: 0 },
    'Instagram Reels': { count: 0, views: 0, win: 0, fail: 0 },
    'YouTube Shorts': { count: 0, views: 0, win: 0, fail: 0 }
  } as any;

  (baseData.videos || []).forEach((v: any) => {
    const pf = v.platform || 'TikTok';
    if (platformStats[pf]) { platformStats[pf].count += 1; platformStats[pf].views += parseViewsToNum(v.views); platformStats[pf].win += 1; }
  });
  (baseData.failVideos || []).forEach((v: any) => {
    const pf = v.platform || 'TikTok';
    if (platformStats[pf]) { platformStats[pf].count += 1; platformStats[pf].views += parseViewsToNum(v.views); platformStats[pf].fail += 1; }
  });

  let dominantPlatform = 'TikTok';
  let maxPlatformViews = -1;
  Object.keys(platformStats).forEach(key => {
    if (platformStats[key].views > maxPlatformViews) { maxPlatformViews = platformStats[key].views; dominantPlatform = key; }
  });

  let totalViewsNum = 0;
  filteredVideos.forEach((v: any) => { totalViewsNum += parseViewsToNum(v.views); });
  filteredFailVideos.forEach((v: any) => { totalViewsNum += parseViewsToNum(v.views); });
  filteredCaseStudies.forEach((c: any) => { totalViewsNum += parseViewsToNum(c.views); });
  const formattedTotalViews = formatViewsCompact(totalViewsNum);

  const totalListVideos = (baseData.videos || []).length + (baseData.failVideos || []).length;
  const platformShare = platformFilter === 'All' ? 1 : totalListVideos > 0 ? (filteredVideos.length + filteredFailVideos.length) / totalListVideos : 0.33;

  const totalVal = Math.round(baseData.win5Stats.total * platformShare);
  const winVal = Math.round(baseData.win5Stats.win * platformShare);
  const failVal = Math.max(0, totalVal - winVal);
  const winPct = totalVal > 0 ? (winVal / totalVal) * 100 : 0;
  const winRatePercent = `${winPct.toFixed(1).replace('.', ',')}%`;

  // Editor performance
  const rankedPerformance = (baseData.editorPerformance || []).map((perf: any) => {
    const editorWins = (baseData.videos || []).filter((v: any) => v.editor === perf.editor);
    const editorFails = (baseData.failVideos || []).filter((v: any) => v.editor === perf.editor);
    const editorTotalInList = editorWins.length + editorFails.length;

    const editorPlatformShare = platformFilter === 'All' ? 1 : editorTotalInList > 0
      ? (editorWins.filter((v: any) => v.platform === platformFilter).length + editorFails.filter((v: any) => v.platform === platformFilter).length) / editorTotalInList : 0.33;

    const total = Math.max(1, Math.round(perf.totalVideos * editorPlatformShare));
    const win = Math.round(perf.winVideos * editorPlatformShare);
    const fail = Math.max(0, total - win);
    const winRateNum = total > 0 ? (win / total) * 100 : 0;
    const winRate = `${winRateNum.toFixed(1).replace('.', ',')}%`;

    const allViews = [...editorWins, ...editorFails].map((v: any) => parseViewsToNum(v.views));
    const avgViewsNum = allViews.length > 0 ? Math.round(allViews.reduce((a: number, b: number) => a + b, 0) / allViews.length) : 50000;
    const avgViews = formatViewsCompact(avgViewsNum);

    return { ...perf, total, win, fail, winRate, winRateNum, avgViewsNum, avgViews };
  });

  const filteredRankedPerformance = rankedPerformance
    .filter((perf: any) => perf.editor.toLowerCase().includes(editorSearchQuery.toLowerCase().trim()))
    .sort((a: any, b: any) => {
      if (editorSortBy === 'winRate') return b.winRateNum - a.winRateNum;
      if (editorSortBy === 'totalVideos') return b.total - a.total;
      if (editorSortBy === 'avgViews') return b.avgViewsNum - a.avgViewsNum;
      return 0;
    });

  const actionsList = (baseData as any).actions || [];

  const topWinReasons: string[] = [];
  filteredVideos.slice(0, 3).forEach((v: any) => { if (v.analysis) topWinReasons.push(v.analysis); });
  const topImprovements: string[] = [];
  filteredFailVideos.slice(0, 3).forEach((v: any) => { if (v.failReason) topImprovements.push(v.failReason); });

  // Trend values
  const w5 = totalViewsNum;
  const w4 = Math.round(totalViewsNum * 0.88);
  const w3 = Math.round(totalViewsNum * 0.94);
  const w2 = Math.round(totalViewsNum * 0.76);
  const w1 = Math.round(totalViewsNum * 0.62);
  const trendPoints = [w1, w2, w3, w4, w5];
  const maxTrendVal = Math.max(...trendPoints, 1);
  const minTrendVal = Math.min(...trendPoints, 0);
  const trendRange = maxTrendVal - minTrendVal;
  const getX = (idx: number) => 60 + idx * 105;
  const getY = (val: number) => 130 - (trendRange > 0 ? ((val - minTrendVal) / trendRange) * 100 : 50);

  return (
    <>
      {/* Dashboard Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#111827]/80 via-[#131d31]/80 to-[#111827]/80 border border-white/[0.08] p-6 rounded-2xl backdrop-blur-md shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-indigo-500/15 border border-blue-500/35 rounded-2xl text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.25)] group-hover:scale-105 transition-transform duration-300">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              TRUNG TÂM PHÂN TÍCH HIỆU SUẤT
              <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> Live
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Báo cáo hiệu quả chiến dịch sản xuất video và hoạt động nhóm</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 self-start lg:self-auto">
          <div className="flex items-center gap-2 mr-2">
            <button onClick={() => handleStartExport('pdf')} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] text-slate-300 hover:text-white rounded-lg text-xs font-bold transition shadow-md disabled:opacity-50" title="Xuất báo cáo PDF tổng hợp">
              <FileDown className="w-3.5 h-3.5 text-rose-400" /> PDF Report
            </button>
            <button onClick={() => handleStartExport('excel')} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] text-slate-300 hover:text-white rounded-lg text-xs font-bold transition shadow-md disabled:opacity-50" title="Xuất bảng số liệu Excel">
              <Download className="w-3.5 h-3.5 text-emerald-400" /> Excel Data
            </button>
          </div>
          <div className="flex bg-slate-950/60 border border-white/[0.08] p-1 rounded-xl shadow-inner shrink-0">
            {Object.keys(teamsData).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button key={tab} onClick={() => { onTabChange(tab); setSelectedEditorDetail(null); }}
                  className={`px-5 py-2 text-xs font-black rounded-lg transition-all duration-300 relative ${isActive ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-100' : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'}`}>
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Platform Filter */}
      <div className="flex items-center gap-2 bg-[#121929] border border-white/[0.06] p-1.5 rounded-xl self-start shadow-inner">
        {(['All', 'TikTok', 'Instagram Reels', 'YouTube Shorts'] as const).map((filter) => {
          const isActive = platformFilter === filter;
          return (
            <button key={filter} onClick={() => setPlatformFilter(filter)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
              {filter === 'All' ? 'Tất cả nền tảng' : filter}
            </button>
          );
        })}
      </div>

      {/* Main Statistics Content */}
      <div className="flex flex-col gap-6 mt-4 pb-16">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Tổng Views */}
          <div className="bg-[#131d31]/40 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1 shadow-xl relative overflow-hidden group hover:border-blue-500/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-blue-400" /> Tổng Lượt Xem</span>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">↑ 14.5%</span>
            </div>
            <span className="text-3xl font-black text-white mt-2.5 tracking-tight">{formattedTotalViews}</span>
            <span className="text-[10px] text-slate-500 font-bold mt-1.5">Lọc theo nền tảng đang chọn</span>
          </div>

          {/* KPI 2: Tỷ Lệ Win */}
          <div className="bg-[#131d31]/40 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1 shadow-xl relative overflow-hidden group hover:border-[#10b981]/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#10b981]/10 transition-colors" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-[#10b981]" /> Tỷ Lệ Win Chung</span>
            {(() => {
              const radius = 18;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (Math.min(winPct, 100) / 100) * circumference;
              return (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-3xl font-black text-[#10b981] tracking-tight">{winRatePercent}</span>
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center mr-1">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="22" cy="22" r={radius} className="stroke-slate-800" strokeWidth="3.5" fill="transparent" />
                      <circle cx="22" cy="22" r={radius} className="stroke-[#10b981] transition-all duration-500" strokeWidth="3.5" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))' }} />
                    </svg>
                    <span className="absolute text-[8px] font-black text-[#10b981]">WIN</span>
                  </div>
                </div>
              );
            })()}
            <span className="text-[10px] text-slate-500 font-bold mt-1">Đạt KPI trên tổng số video của nhóm</span>
          </div>

          {/* KPI 3: Quy Mô Nội Dung */}
          <div className="bg-[#131d31]/40 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1 shadow-xl relative overflow-hidden group hover:border-[#8b5cf6]/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#8b5cf6]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#8b5cf6]/10 transition-colors" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Video className="w-3.5 h-3.5 text-[#8b5cf6]" /> Quy Mô Nội Dung</span>
            <div className="flex flex-col gap-2.5 mt-2">
              <span className="text-3xl font-black text-white tracking-tight">{totalVal} <span className="text-sm text-slate-400 font-bold">Video</span></span>
              <div className="flex flex-col gap-1">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex border border-white/[0.04]">
                  <div className="h-full bg-emerald-500" style={{ width: `${winPct}%` }} />
                  <div className="h-full bg-rose-500" style={{ width: `${100 - winPct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[8px] font-black text-slate-500">
                  <span className="text-emerald-400">{winVal} Win ({winPct.toFixed(0)}%)</span>
                  <span className="text-rose-400">{failVal} Fail</span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI 4: Kênh Chủ Đạo */}
          <div className="bg-[#131d31]/40 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1 shadow-xl relative overflow-hidden group hover:border-[#f43f5e]/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#f43f5e]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#f43f5e]/10 transition-colors" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-[#f43f5e]" /> Kênh Chủ Đạo</span>
            {(() => {
              const pfViews = platformStats[dominantPlatform]?.views || 0;
              const totalViewsSum = Object.keys(platformStats).reduce((a: number, k: string) => a + platformStats[k].views, 0) || 1;
              const pfPercentage = (pfViews / totalViewsSum) * 100;
              let brandColor = 'text-cyan-400';
              let brandBg = 'bg-cyan-500/10 border-cyan-500/20';
              if (dominantPlatform.includes('Reels') || dominantPlatform.includes('Instagram')) { brandColor = 'text-pink-400'; brandBg = 'bg-pink-500/10 border-pink-500/20'; }
              else if (dominantPlatform.includes('Shorts') || dominantPlatform.includes('YouTube')) { brandColor = 'text-red-400'; brandBg = 'bg-red-500/10 border-red-500/20'; }
              return (
                <div className="flex flex-col gap-1 mt-1.5">
                  <span className={`text-2xl font-black tracking-tight ${brandColor} uppercase truncate`}>{dominantPlatform}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-500 font-bold">Thị phần views:</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${brandBg} ${brandColor}`}>{pfPercentage.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* View Trend Line Chart */}
        <div className="bg-[#131d31]/40 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Xu Hướng Tăng Trưởng Views Lũy Kế
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Đơn vị: Lượt xem</span>
          </div>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[550px] h-[160px] relative flex justify-center py-2">
              <svg className="w-full h-full max-w-[520px]" viewBox="0 0 520 150">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <line x1="60" y1="30" x2="480" y2="30" stroke="white" strokeOpacity="0.04" strokeDasharray="3" />
                <line x1="60" y1="80" x2="480" y2="80" stroke="white" strokeOpacity="0.04" strokeDasharray="3" />
                <line x1="60" y1="130" x2="480" y2="130" stroke="white" strokeOpacity="0.06" />
                <path d={`M ${getX(0)} 130 L ${getX(0)} ${getY(w1)} C ${getX(0) + 35} ${getY(w1)}, ${getX(1) - 35} ${getY(w2)}, ${getX(1)} ${getY(w2)} C ${getX(1) + 35} ${getY(w2)}, ${getX(2) - 35} ${getY(w3)}, ${getX(2)} ${getY(w3)} C ${getX(2) + 35} ${getY(w3)}, ${getX(3) - 35} ${getY(w4)}, ${getX(3)} ${getY(w4)} C ${getX(3) + 35} ${getY(w4)}, ${getX(4) - 35} ${getY(w5)}, ${getX(4)} ${getY(w5)} L ${getX(4)} 130 Z`} fill="url(#chartGradient)" />
                <path d={`M ${getX(0)} ${getY(w1)} C ${getX(0) + 35} ${getY(w1)}, ${getX(1) - 35} ${getY(w2)}, ${getX(1)} ${getY(w2)} C ${getX(1) + 35} ${getY(w2)}, ${getX(2) - 35} ${getY(w3)}, ${getX(2)} ${getY(w3)} C ${getX(2) + 35} ${getY(w3)}, ${getX(3) - 35} ${getY(w4)}, ${getX(3)} ${getY(w4)} C ${getX(3) + 35} ${getY(w4)}, ${getX(4) - 35} ${getY(w5)}, ${getX(4)} ${getY(w5)}`} fill="none" stroke="#3b82f6" strokeWidth="3" filter="url(#glow)" />
                {trendPoints.map((val, idx) => (
                  <g key={idx} className="cursor-pointer group/dot">
                    <circle cx={getX(idx)} cy={getY(val)} r="5" className="fill-blue-500 stroke-slate-900 stroke-2 hover:r-7 transition-all" />
                    <text x={getX(idx)} y={getY(val) - 12} textAnchor="middle" className="text-[9px] font-black fill-slate-300 opacity-0 group-hover/dot:opacity-100 transition-opacity">{formatViewsCompact(val)}</text>
                  </g>
                ))}
                {['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'].map((w, idx) => (
                  <text key={idx} x={getX(idx)} y="148" textAnchor="middle" className="text-[9px] font-bold fill-slate-500 uppercase">{w}</text>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Leaderboard & Platforms */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Editor Performance Leaderboard */}
          <div className="lg:col-span-7 bg-[#131d31]/40 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-3 gap-3">
              <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" /> Bảng Xếp Hạng Editor ({activeTab})
              </span>
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Tìm Editor..." value={editorSearchQuery} onChange={(e) => setEditorSearchQuery(e.target.value)} className="bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 rounded-lg px-2.5 py-1 text-[11px] text-white outline-none w-32 focus:w-40 transition-all placeholder-slate-500" />
                <select value={editorSortBy} onChange={(e: any) => setEditorSortBy(e.target.value)} className="bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 rounded-lg px-2 py-1 text-[11px] text-slate-300 outline-none cursor-pointer">
                  <option value="winRate">Sắp xếp: % Win</option>
                  <option value="totalVideos">Sắp xếp: Tổng Video</option>
                  <option value="avgViews">Sắp xếp: Views TB</option>
                </select>
              </div>
            </div>

            {/* Top 3 Podium */}
            <div className="flex items-end justify-center gap-3 sm:gap-6 pt-5 pb-3 border-b border-white/[0.04] mb-2 bg-slate-950/20 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/[0.02] to-transparent pointer-events-none" />
              {/* Silver */}
              {filteredRankedPerformance[1] && (() => {
                const perf = filteredRankedPerformance[1];
                const initials = perf.editor.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div onClick={() => setSelectedEditorDetail(perf)} className="flex flex-col items-center w-24 sm:w-28 group relative cursor-pointer">
                    <div className="relative mb-2 flex items-center justify-center">
                      <div className="absolute -top-3 right-0 bg-slate-300 text-slate-900 text-[8px] font-black px-1 py-0.5 rounded-full border border-white">#2</div>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-800 text-xs font-black shadow-[0_0_15px_rgba(148,163,184,0.3)] group-hover:scale-105 transition-transform duration-300">{initials}</div>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 truncate w-full text-center">{perf.editor}</span>
                    <span className="text-[10px] font-bold text-slate-400">{perf.winRate} Win</span>
                    <div className="w-full bg-gradient-to-t from-slate-800/80 to-slate-700/40 border border-slate-600/20 h-16 rounded-t-xl mt-2 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/20" />
                      <span className="text-lg font-black text-slate-300">2</span>
                      <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mt-0.5">BẠC</span>
                    </div>
                  </div>
                );
              })()}
              {/* Gold */}
              {filteredRankedPerformance[0] && (() => {
                const perf = filteredRankedPerformance[0];
                const initials = perf.editor.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div onClick={() => setSelectedEditorDetail(perf)} className="flex flex-col items-center w-28 sm:w-32 group z-10 relative cursor-pointer">
                    <div className="relative mb-2.5 flex items-center justify-center">
                      <div className="absolute -top-3.5 right-0 bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white flex items-center gap-0.5 animate-bounce">👑 #1</div>
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-200 border-2 border-amber-300 flex items-center justify-center text-amber-950 text-sm font-black shadow-[0_0_20px_rgba(245,158,11,0.4)] group-hover:scale-105 transition-transform duration-300 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        {initials}
                      </div>
                    </div>
                    <span className="text-xs font-black text-white truncate w-full text-center">{perf.editor}</span>
                    <span className="text-[11px] font-black text-amber-400">{perf.winRate} Win</span>
                    <div className="w-full bg-gradient-to-t from-amber-700/80 to-amber-600/40 border border-amber-500/20 h-22 rounded-t-xl mt-2 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/20" />
                      <span className="text-xl font-black text-amber-200">1</span>
                      <span className="text-[7.5px] font-black text-amber-300 uppercase tracking-widest mt-0.5">VÀNG</span>
                    </div>
                  </div>
                );
              })()}
              {/* Bronze */}
              {filteredRankedPerformance[2] && (() => {
                const perf = filteredRankedPerformance[2];
                const initials = perf.editor.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div onClick={() => setSelectedEditorDetail(perf)} className="flex flex-col items-center w-24 sm:w-28 group relative cursor-pointer">
                    <div className="relative mb-2 flex items-center justify-center">
                      <div className="absolute -top-3 right-0 bg-[#b45309] text-amber-50 text-[8px] font-black px-1 py-0.5 rounded-full border border-white">#3</div>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#92400e] to-[#d97706] border-2 border-[#b45309] flex items-center justify-center text-amber-50 text-xs font-black shadow-[0_0_15px_rgba(180,83,9,0.3)] group-hover:scale-105 transition-transform duration-300">{initials}</div>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 truncate w-full text-center">{perf.editor}</span>
                    <span className="text-[10px] font-bold text-slate-400">{perf.winRate} Win</span>
                    <div className="w-full bg-gradient-to-t from-[#7c2d12]/80 to-[#9a3412]/40 border border-[#9a3412]/20 h-13 rounded-t-xl mt-2 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/10" />
                      <span className="text-base font-black text-amber-300">3</span>
                      <span className="text-[7.5px] font-black text-amber-500 uppercase tracking-widest mt-0.5">ĐỒNG</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Editor Table List */}
            <div className="overflow-x-auto w-full custom-scrollbar">
              <table className="w-full border-collapse text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-400 font-black tracking-wider uppercase text-[9px]">
                    <th className="py-2.5 px-2 text-center w-12">Hạng</th>
                    <th className="py-2.5 px-3">Editor</th>
                    <th className="py-2.5 px-3">Tỷ lệ Win</th>
                    <th className="py-2.5 px-3">Phân tách Win/Fail</th>
                    <th className="py-2.5 px-3 text-center w-16">Tổng Video</th>
                    <th className="py-2.5 px-3 text-right w-24">Views TB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {filteredRankedPerformance.map((perf: any, index: number) => {
                    const winPercent = perf.total > 0 ? (perf.win / perf.total) * 100 : 0;
                    return (
                      <tr key={perf.editor} onClick={() => setSelectedEditorDetail(perf)} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                        <td className="py-3 px-2 text-center font-black text-slate-500">{index + 1}</td>
                        <td className="py-3 px-3 font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{perf.editor}</td>
                        <td className="py-3 px-3 font-black text-[#10b981]">{perf.winRate}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1 w-full max-w-[140px]">
                            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-white/[0.04]">
                              <div className="h-full bg-emerald-500 rounded-l" style={{ width: `${winPercent}%` }} />
                              <div className="h-full bg-rose-500/70 rounded-r" style={{ width: `${100 - winPercent}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[8px] font-bold text-slate-500">
                              <span className="text-emerald-400">{perf.win} Win</span>
                              <span className="text-rose-400">{perf.fail} Fail</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-300">{perf.total}</td>
                        <td className="py-3 px-3 text-right font-black text-blue-400">{perf.avgViews || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Platform Analytics */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#131d31]/40 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-md flex-1">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-blue-400" /> Ma Trận Nền Tảng (Nhấn để Lọc nhanh)
                </span>
              </div>
              <div className="flex flex-col gap-4.5 justify-center flex-1 py-1">
                {Object.keys(platformStats).map((platformKey) => {
                  const stats = platformStats[platformKey];
                  const total = stats.win + stats.fail;
                  const winRateNum = total > 0 ? (stats.win / total) * 100 : 0;
                  const formattedWinRate = `${winRateNum.toFixed(1).replace('.', ',')}%`;
                  const totalViewsSum = Object.keys(platformStats).reduce((a: number, k: string) => a + platformStats[k].views, 0) || 1;
                  const viewsPct = (stats.views / totalViewsSum) * 100;

                  let themeColor = 'from-cyan-500 to-blue-600';
                  let borderTheme = 'border-cyan-500/20 bg-cyan-950/20';
                  let progressBg = 'bg-cyan-500';
                  let icon = <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.99 1.15 2.37 1.93 3.86 2.19v3.81c-1.63-.09-3.2-.66-4.51-1.67-.32-.24-.62-.51-.89-.8-.08 2.65-.03 5.3-.06 7.95-.08 1.93-.7 3.84-1.85 5.38-1.51 1.97-3.92 3.04-6.38 3.06-2.58.01-5.11-1.12-6.62-3.23-1.63-2.18-2.07-5.09-1.2-7.66.77-2.39 2.62-4.32 5.01-5.1 1.07-.37 2.21-.49 3.33-.36V7.47c-1.39-.24-2.88.08-3.99.98-1.15.91-1.79 2.34-1.74 3.82.02 1.45.69 2.84 1.8 3.73 1.18.98 2.79 1.34 4.27.97 1.47-.35 2.71-1.51 3.19-2.94.24-.68.32-1.4.3-2.11-.01-3.69-.01-7.39-.01-11.08-.01-.27.03-.56-.06-.82z" /></svg>;

                  if (platformKey.includes('Reels') || platformKey.includes('Instagram')) {
                    themeColor = 'from-pink-500 to-rose-600'; borderTheme = 'border-pink-500/20 bg-pink-950/20'; progressBg = 'bg-pink-500';
                    icon = <svg className="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
                  } else if (platformKey.includes('Shorts') || platformKey.includes('YouTube')) {
                    themeColor = 'from-red-500 to-orange-600'; borderTheme = 'border-red-500/20 bg-red-950/20'; progressBg = 'bg-red-500';
                    icon = <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.163c-.272-1.016-1.071-1.815-2.087-2.087C19.565 3.5 12 3.5 12 3.5s-7.565 0-9.411.576C1.573 4.348.774 5.147.502 6.163.003 8.01.003 12 .003 12s0 3.99.499 5.837c.272 1.016 1.071 1.815 2.087 2.087 1.846.576 9.411.576 9.411.576s7.565 0 9.411-.576c1.016-.272 1.815-1.071 2.087-2.087.499-1.847.499-5.837.499-5.837s0-3.99-.499-5.837z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98" fill="#0c1322" /></svg>;
                  }

                  const isFilterActive = platformFilter === platformKey;

                  return (
                    <div key={platformKey} onClick={() => setPlatformFilter(isFilterActive ? 'All' : platformKey as any)}
                      className={`border rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 hover:scale-[1.01] hover:bg-slate-900/30 cursor-pointer ${isFilterActive ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-950/10' : borderTheme}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-slate-950/50 rounded-xl border border-white/[0.04]">{icon}</div>
                          <span className="text-xs font-black uppercase tracking-wider text-slate-200">{platformKey}</span>
                        </div>
                        <span className="text-xs font-black text-white">{formatViewsCompact(stats.views)} views</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>Tỷ trọng lượt xem:</span>
                          <span className="text-white font-extrabold">{viewsPct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/[0.04]">
                          <div className={`h-full bg-gradient-to-r ${themeColor} rounded-full`} style={{ width: `${viewsPct}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-white/[0.04] pt-2.5 mt-0.5">
                        <span className="bg-slate-950/40 px-2 py-0.5 rounded border border-white/[0.03]">{total} Video đã đăng</span>
                        <span className="text-emerald-400 font-extrabold">{stats.win} Win / {stats.fail} Fail ({formattedWinRate})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Checklist & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#131d31]/40 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-md">
            <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
              <Target className="w-4 h-4 text-cyan-400" /> Nhiệm Vụ Tuần Tới (Checklist)
            </span>
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {actionsList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-bold">Không có nhiệm vụ nào</div>
              ) : (
                actionsList.map((action: any) => {
                  let priorityColor = 'text-slate-400 bg-slate-500/10 border-slate-500/30';
                  if (action.priority === 'Cao') priorityColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
                  else if (action.priority === 'Trung bình') priorityColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                  let statusColor = 'text-slate-500';
                  if (action.status === 'Đang tiến hành') statusColor = 'text-blue-400 font-black';
                  else if (action.status === 'Hoàn thành') statusColor = 'text-emerald-400 font-black';
                  return (
                    <div key={action.id} className="flex gap-3 p-3 bg-[#0c1322]/40 rounded-xl border border-white/[0.02] hover:border-blue-500/10 transition-colors group">
                      <div className="mt-0.5 shrink-0">
                        {action.status === 'Hoàn thành' ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.3)]"><CheckCircle className="w-3.5 h-3.5 stroke-[3px]" /></div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-transparent hover:border-blue-400 hover:text-blue-400/35 transition-colors cursor-pointer text-[8px] font-bold">✓</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-black truncate ${action.status === 'Hoàn thành' ? 'line-through text-slate-500' : 'text-slate-200'}`}>{action.title}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 flex items-center gap-1 ${priorityColor}`}>
                            {action.priority === 'Cao' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                            {action.priority}
                          </span>
                        </div>
                        <p className={`text-[10.5px] leading-relaxed font-semibold ${action.status === 'Hoàn thành' ? 'text-slate-500' : 'text-slate-400'}`}>{action.description}</p>
                        <div className="flex items-center justify-between text-[10px] mt-1.5 text-slate-500 font-bold">
                          <span>Thời hạn: <span className="text-slate-300">{action.deadline}</span></span>
                          <span className={statusColor}>{action.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-[#131d31]/40 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-md">
            <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
              <Sparkles className="w-4 h-4 text-amber-400" /> Đánh Giá & Bài Học Rút Ra
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
              <div className="bg-[#0f2d24]/60 border border-emerald-500/20 rounded-xl p-3.5 flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1"><Trophy className="w-3 h-3 text-emerald-400" /> Bài học Win hàng đầu</span>
                <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar text-[10px] text-slate-300 font-bold leading-relaxed">
                  {topWinReasons.length === 0 ? (<span className="text-slate-500 text-xs italic font-medium py-4 text-center block">Đang tổng hợp dữ liệu...</span>) : (
                    topWinReasons.map((reason, i) => (<div key={i} className="flex gap-2 p-2.5 bg-[#0c1322]/40 rounded-xl border border-white/[0.01] hover:bg-[#0c1322]/60 transition-colors"><span className="text-emerald-400 font-black shrink-0">✓</span><span className="flex-1 font-semibold text-slate-300">{reason}</span></div>))
                  )}
                </div>
              </div>
              <div className="bg-[#341b1b]/60 border border-rose-500/20 rounded-xl p-3.5 flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1"><XCircle className="w-3 h-3 text-rose-400" /> Điểm Fail cần khắc phục</span>
                <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar text-[10px] text-slate-300 font-bold leading-relaxed">
                  {topImprovements.length === 0 ? (<span className="text-slate-500 text-xs italic font-medium py-4 text-center block">Đang tổng hợp dữ liệu...</span>) : (
                    topImprovements.map((improvement, i) => (<div key={i} className="flex gap-2 p-2.5 bg-[#0c1322]/40 rounded-xl border border-white/[0.01] hover:bg-[#0c1322]/60 transition-colors"><span className="text-rose-400 font-black shrink-0">✗</span><span className="flex-1 font-semibold text-slate-300">{improvement}</span></div>))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Progress Toast */}
        {isExporting && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] border border-white/[0.08] p-4.5 rounded-2xl flex items-center gap-4.5 shadow-2xl backdrop-blur-md animate-fade-in w-72">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <div className="w-4.5 h-4.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-xs font-black text-white uppercase tracking-wider">Đang xuất báo cáo {exportType === 'pdf' ? 'PDF' : 'Excel'}...</span>
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/[0.04] mt-0.5">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-150" style={{ width: `${exportProgress}%` }} />
              </div>
              <span className="text-[9px] text-slate-500 font-bold text-right">{exportProgress}%</span>
            </div>
          </div>
        )}

        {/* Editor Details Modal */}
        {selectedEditorDetail && (() => {
          const wins = (baseData.videos || []).filter((v: any) => v.editor === selectedEditorDetail.editor);
          const fails = (baseData.failVideos || []).filter((v: any) => v.editor === selectedEditorDetail.editor);
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[#0f172a] border border-white/[0.08] rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-6 shadow-2xl relative custom-scrollbar">
                <button onClick={() => setSelectedEditorDetail(null)} className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/85 hover:text-red-400 text-slate-400 transition-all border border-white/[0.04]" title="Đóng cửa sổ"><X className="w-4.5 h-4.5" /></button>
                <div className="flex items-center gap-4.5 border-b border-white/[0.06] pb-4.5">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400 flex items-center justify-center text-white text-xl font-black shadow-lg">{selectedEditorDetail.editor.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Hồ Sơ Editor ({activeTab})</span>
                    <h2 className="text-xl font-black text-white truncate leading-tight mt-0.5">{selectedEditorDetail.editor}</h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs font-black text-emerald-400">Tỷ lệ Win: {selectedEditorDetail.winRate}</span>
                      <span className="text-[10px] text-slate-500 font-bold">•</span>
                      <span className="text-xs font-bold text-slate-400">{selectedEditorDetail.total} Video đã làm</span>
                      <span className="text-[10px] text-slate-500 font-bold">•</span>
                      <span className="text-xs font-bold text-slate-400">Views TB: {selectedEditorDetail.avgViews}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#1e293b]/30 border border-white/[0.04] p-3.5 rounded-2xl text-center shadow"><span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Video Win</span><p className="text-lg font-black text-emerald-400 mt-1">{selectedEditorDetail.win}</p></div>
                  <div className="bg-[#1e293b]/30 border border-white/[0.04] p-3.5 rounded-2xl text-center shadow"><span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Video Fail</span><p className="text-lg font-black text-rose-400 mt-1">{selectedEditorDetail.fail}</p></div>
                  <div className="bg-[#1e293b]/30 border border-white/[0.04] p-3.5 rounded-2xl text-center shadow"><span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Lượt xem TB</span><p className="text-lg font-black text-blue-400 mt-1">{selectedEditorDetail.avgViews}</p></div>
                </div>
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-white/[0.04] pb-1.5"><Trophy className="w-3.5 h-3.5 text-amber-400" /> Các Video Win Nổi Bật ({wins.length})</span>
                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {wins.length === 0 ? (<span className="text-slate-600 text-xs italic font-medium">Chưa ghi nhận video win nào trong danh sách</span>) : (
                      wins.map((w: any) => (<div key={w.id} className="p-3 bg-[#072419]/35 border border-emerald-500/10 rounded-xl flex flex-col gap-1"><div className="flex items-center justify-between"><span className="text-xs font-black text-white">{w.label} - {w.views}</span><span className="text-[9.5px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">{w.platform}</span></div><p className="text-[10.5px] text-slate-300 font-semibold mt-0.5 leading-relaxed">{w.content}</p><p className="text-[10px] text-emerald-400/90 font-medium italic mt-1 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/5"><strong>Lý do win:</strong> {w.analysis}</p></div>))
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-white/[0.04] pb-1.5"><XCircle className="w-3.5 h-3.5 text-rose-400" /> Các Video Fail cần khắc phục ({fails.length})</span>
                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {fails.length === 0 ? (<span className="text-slate-600 text-xs italic font-medium">Không có video fail nào trong danh sách</span>) : (
                      fails.map((f: any) => (<div key={f.id} className="p-3 bg-[#240d0d]/35 border border-rose-500/10 rounded-xl flex flex-col gap-1"><div className="flex items-center justify-between"><span className="text-xs font-black text-white">{f.label} - {f.views}</span><span className="text-[9.5px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full">{f.platform}</span></div><p className="text-[10.5px] text-slate-300 font-semibold mt-0.5 leading-relaxed">{f.content}</p><p className="text-[10px] text-rose-400/90 font-medium italic mt-1 bg-rose-500/5 p-2 rounded-lg border border-rose-500/5"><strong>Điểm yếu:</strong> {f.failReason}</p></div>))
                    )}
                  </div>
                </div>
                <div className="bg-purple-950/20 border border-purple-500/15 p-4 rounded-2xl flex flex-col gap-1.5 mt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Lời khuyên & Định hướng từ Leader</span>
                  <p className="text-xs leading-relaxed text-slate-300 font-medium italic">&quot;{selectedEditorDetail.editor} có thế mạnh lớn về {wins[0] ? 'phát triển concept hình ảnh' : 'dựng nhịp điệu nhanh'}. Cần chú ý hoàn thiện các lỗi nhỏ về {fails[0] ? 'âm thanh nền hoặc captions' : 'hook giữ chân 3 giây đầu'} để tỷ lệ win tăng trưởng mạnh mẽ trong tuần tiếp theo.&quot;</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
