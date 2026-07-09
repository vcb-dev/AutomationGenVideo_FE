'use client';
import React, { useState, useMemo } from 'react';
import {
  TrendingUp, Eye, Trophy, Video, Flame, Award, Share2,
  Target, Sparkles, XCircle, CheckCircle, FileDown, Download,
  X, MessageSquare, Wrench, Calendar, BarChart3, History
} from 'lucide-react';
import { TeamData, AttendanceStatus } from '../types';
import { TEAMS_DATA } from '../constants';
import AttendanceSection from './AttendanceSection';
import AttendanceHistorySection from './AttendanceHistorySection';

interface StatisticsTabProps {
  teamsData: Record<string, TeamData>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  platformFilter: 'All' | 'TikTok' | 'Instagram Reels' | 'YouTube Shorts';
  setPlatformFilter: (filter: 'All' | 'TikTok' | 'Instagram Reels' | 'YouTube Shorts') => void;
  editorSearchQuery: string;
  setEditorSearchQuery: (query: string) => void;
  editorSortBy: 'winRate' | 'totalVideos' | 'avgViews' | 'avgQualityScore';
  setEditorSortBy: (sort: 'winRate' | 'totalVideos' | 'avgViews' | 'avgQualityScore') => void;
  selectedEditorDetail: any | null;
  setSelectedEditorDetail: (detail: any | null) => void;
  isExporting: boolean;
  exportProgress: number;
  exportType: 'pdf' | 'excel' | null;
  handleStartExport: (type: 'pdf' | 'excel') => void;
  filterMode?: 'all' | 'week' | 'month';
  periodsList?: any[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserRoles?: string[];
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export default function StatisticsTab({
  teamsData, activeTab, onTabChange,
  platformFilter, setPlatformFilter,
  editorSearchQuery, setEditorSearchQuery,
  editorSortBy, setEditorSortBy,
  selectedEditorDetail, setSelectedEditorDetail,
  isExporting, exportProgress, exportType, handleStartExport,
  filterMode, periodsList = [],
  currentUserId, currentUserName, currentUserRoles, showToast,
}: StatisticsTabProps) {

  const baseData = teamsData[activeTab] || TEAMS_DATA[activeTab];
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [attendanceView, setAttendanceView] = useState<'current' | 'history'>('current');

  // teamsList derived from teamsData keys
  const teamsList = Object.keys(teamsData).length > 0 ? Object.keys(teamsData) : ['K1', 'K2', 'K3', 'K4', 'K5'];

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
      return `${formatted}M`;
    }
    if (num >= 1000) {
      const thousands = num / 1000;
      const formatted = Math.floor(thousands * 10) / 10;
      return `${formatted}K`;
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

  // Combine all sources of editors to build a complete list of team members / active editors
  const allTeamEditorsList = useMemo(() => {
    const names = new Set<string>();
    
    // 1. Add names from members list
    (baseData.members || []).forEach((name: string) => names.add(name));
    
    // 2. Add names from actual videos
    (baseData.videos || []).forEach((v: any) => { if (v.editor) names.add(v.editor); });
    (baseData.failVideos || []).forEach((v: any) => { if (v.editor) names.add(v.editor); });
    
    // 3. Add names from editorPerformance table
    (baseData.editorPerformance || []).forEach((ep: any) => { if (ep.editor) names.add(ep.editor); });
    
    return Array.from(names);
  }, [baseData.members, baseData.videos, baseData.failVideos, baseData.editorPerformance]);

  // Group and sum editor performance records by Editor Name
  const baseEditorPerfMap = useMemo(() => {
    const map = new Map<string, { totalVideos: number; winVideos: number; rawObject?: any }>();
    (baseData.editorPerformance || []).forEach((p: any) => {
      if (!p.editor) return;
      if (map.has(p.editor)) {
        const existing = map.get(p.editor)!;
        existing.totalVideos += p.totalVideos || 0;
        existing.winVideos += p.winVideos || 0;
      } else {
        map.set(p.editor, {
          totalVideos: p.totalVideos || 0,
          winVideos: p.winVideos || 0,
          rawObject: p
        });
      }
    });
    return map;
  }, [baseData.editorPerformance]);

  const uniqueEditorPerf = useMemo(() => {
    return allTeamEditorsList.map(name => {
      const dbPerf = baseEditorPerfMap.get(name);
      
      const winsCount = (baseData.videos || []).filter((v: any) => v.editor === name).length;
      const failsCount = (baseData.failVideos || []).filter((v: any) => v.editor === name).length;
      
      const totalVideos = dbPerf ? dbPerf.totalVideos : (winsCount + failsCount);
      const winVideos = dbPerf ? dbPerf.winVideos : winsCount;
      const rawObject = dbPerf ? dbPerf.rawObject : null;
      
      return {
        ...rawObject,
        editor: name,
        totalVideos,
        winVideos
      };
    });
  }, [allTeamEditorsList, baseEditorPerfMap, baseData.videos, baseData.failVideos]);

  // Editor performance mapping
  const rankedPerformance = uniqueEditorPerf.map((perf: any) => {
    const editorWins = (baseData.videos || []).filter((v: any) => v.editor === perf.editor);
    const editorFails = (baseData.failVideos || []).filter((v: any) => v.editor === perf.editor);
    const editorTotalInList = editorWins.length + editorFails.length;

    const editorPlatformShare = platformFilter === 'All' ? 1 : editorTotalInList > 0
      ? (editorWins.filter((v: any) => v.platform === platformFilter).length + editorFails.filter((v: any) => v.platform === platformFilter).length) / editorTotalInList : 0.33;

    const total = Math.max(0, Math.round(perf.totalVideos * editorPlatformShare));
    const win = Math.round(perf.winVideos * editorPlatformShare);
    const fail = Math.max(0, total - win);
    const winRateNum = total > 0 ? (win / total) * 100 : 0;
    const winRate = `${winRateNum.toFixed(1).replace('.', ',')}%`;

    const allViews = [...editorWins, ...editorFails].map((v: any) => parseViewsToNum(v.views));
    const avgViewsNum = allViews.length > 0 ? Math.round(allViews.reduce((a: number, b: number) => a + b, 0) / allViews.length) : 0;
    const avgViews = formatViewsCompact(avgViewsNum);

    // Calculate average quality score from scores
    const allEditorVideos = [...editorWins, ...editorFails];
    const scoredVideos = allEditorVideos.filter(v => v.scores && v.scores.length > 0);
    let avgQualityScoreNum = 0;
    if (scoredVideos.length > 0) {
      let totalScoreSum = 0;
      let totalScoresCount = 0;
      scoredVideos.forEach(v => {
        v.scores?.forEach((s: any) => {
          totalScoreSum += s.score_total;
          totalScoresCount += 1;
        });
      });
      avgQualityScoreNum = totalScoresCount > 0 ? totalScoreSum / totalScoresCount : 0;
    }
    const avgQualityScore = avgQualityScoreNum > 0 ? `${avgQualityScoreNum.toFixed(1)}/10` : '-';

    return { ...perf, total, win, fail, winRate, winRateNum, avgViewsNum, avgViews, avgQualityScoreNum, avgQualityScore };
  });

  const totalVal = rankedPerformance.reduce((sum, p) => sum + p.total, 0);
  const winVal = rankedPerformance.reduce((sum, p) => sum + p.win, 0);
  const failVal = Math.max(0, totalVal - winVal);
  const winPct = totalVal > 0 ? (winVal / totalVal) * 100 : 0;
  const winRatePercent = `${winPct.toFixed(1).replace('.', ',')}%`;

  const filteredRankedPerformance = rankedPerformance
    .filter((perf: any) => perf.editor.toLowerCase().includes(editorSearchQuery.toLowerCase().trim()))
    .sort((a: any, b: any) => {
      if (editorSortBy === 'winRate') {
        if (b.winRateNum !== a.winRateNum) return b.winRateNum - a.winRateNum;
        // Tie-breaker 1: Views TB
        if (b.avgViewsNum !== a.avgViewsNum) return b.avgViewsNum - a.avgViewsNum;
        // Tie-breaker 2: Quality Score TB
        return b.avgQualityScoreNum - a.avgQualityScoreNum;
      }
      if (editorSortBy === 'totalVideos') {
        if (b.total !== a.total) return b.total - a.total;
        return b.avgViewsNum - a.avgViewsNum;
      }
      if (editorSortBy === 'avgViews') {
        if (b.avgViewsNum !== a.avgViewsNum) return b.avgViewsNum - a.avgViewsNum;
        return b.winRateNum - a.winRateNum;
      }
      if (editorSortBy === 'avgQualityScore') {
        if (b.avgQualityScoreNum !== a.avgQualityScoreNum) return b.avgQualityScoreNum - a.avgQualityScoreNum;
        return b.winRateNum - a.winRateNum;
      }
      return 0;
    });

  const actionsList = (baseData as any).actions || [];

  const topWinReasons: string[] = [];
  filteredVideos.slice(0, 3).forEach((v: any) => { if (v.analysis) topWinReasons.push(v.analysis); });
  const topImprovements: string[] = [];
  filteredFailVideos.slice(0, 3).forEach((v: any) => { if (v.failReason) topImprovements.push(v.failReason); });

  // Trend values based on trendMode (Week vs Month)
  const [trendMode, setTrendMode] = useState<'week' | 'month'>('week');
  const [selectedStatWeek, setSelectedStatWeek] = useState<string>('Tuần 1');

  const trendPoints = useMemo(() => {
    if (trendMode === 'week') {
      const w1 = Math.round(totalViewsNum * 0.62);
      const w2 = Math.round(totalViewsNum * 0.76);
      const w3 = Math.round(totalViewsNum * 0.94);
      const w4 = Math.round(totalViewsNum * 0.88);
      const w5 = totalViewsNum;
      return [w1, w2, w3, w4, w5];
    } else {
      const m1 = Math.round(totalViewsNum * 0.45); // Tháng 5
      const m2 = Math.round(totalViewsNum * 0.78); // Tháng 6
      const m3 = totalViewsNum; // Tháng 7
      return [m1, m2, m3];
    }
  }, [totalViewsNum, trendMode]);

  const maxTrendVal = Math.max(...trendPoints, 1);
  const minTrendVal = Math.min(...trendPoints, 0);
  const trendRange = maxTrendVal - minTrendVal;
  // ============================================
  // CALCULATE OVERALL COMPANY METRICS (K1 - K5)
  // ============================================
  const companyMetrics = useMemo(() => {
    let totalWin = 0;
    let totalFail = 0;
    let totalViews = 0;

    let scoredVideosCount = 0;
    let totalScoreSum = 0;

    const teamPerfList = Object.keys(teamsData).map(tId => {
      const tData = teamsData[tId];
      const winCount = tData?.videos?.length || 0;
      const failCount = tData?.failVideos?.length || 0;
      const totalCount = winCount + failCount;
      const winRate = totalCount > 0 ? (winCount / totalCount) * 100 : 0;
      
      let tViews = 0;
      (tData?.videos || []).forEach((v: any) => { tViews += parseViewsToNum(v.views); });
      (tData?.failVideos || []).forEach((v: any) => { tViews += parseViewsToNum(v.views); });

      totalWin += winCount;
      totalFail += failCount;
      totalViews += tViews;

      // Quality score for this team
      const allTeamVideos = [...(tData?.videos || []), ...(tData?.failVideos || [])];
      let tScoreSum = 0;
      let tScoreCount = 0;
      allTeamVideos.forEach((v: any) => {
        if (v.scores && v.scores.length > 0) {
          v.scores.forEach((s: any) => {
            if (typeof s.score_total === 'number') {
              tScoreSum += s.score_total;
              tScoreCount += 1;
              totalScoreSum += s.score_total;
              scoredVideosCount += 1;
            }
          });
        }
      });
      const avgScore = tScoreCount > 0 ? tScoreSum / tScoreCount : 0;

      return {
        teamId: tId,
        teamName: tData?.teamName || `Team ${tId}`,
        winCount,
        failCount,
        totalCount,
        winRate,
        totalViews: tViews,
        avgScore
      };
    });

    const totalVideos = totalWin + totalFail;
    const overallWinRate = totalVideos > 0 ? (totalWin / totalVideos) * 100 : 0;
    const overallAvgScore = scoredVideosCount > 0 ? totalScoreSum / scoredVideosCount : 0;

    // Determine Most Creative Team (Team Sáng Tạo Nhất)
    // Primary: highest average score. Secondary: highest win rate. Tertiary: total production.
    const sortedTeams = [...teamPerfList].sort((a, b) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalCount - a.totalCount;
    });

    const mostCreativeTeam = sortedTeams[0] || null;

    return {
      totalWin,
      totalFail,
      totalVideos,
      overallWinRate,
      overallAvgScore,
      scoredVideosCount,
      mostCreativeTeam,
    };
  }, [teamsData]);

  // ============================================
  // CALCULATE WEEKLY COMPARISON STATS
  // ============================================
  const weeklyStats = useMemo(() => {
    const activeTeam = teamsData[activeTab];
    const winVideos = (activeTeam?.videos || []).map((v: any) => ({ ...v, status: 'WIN' }));
    const failVideos = (activeTeam?.failVideos || []).map((v: any) => ({ ...v, status: 'FAIL' }));
    const allVideos = [...winVideos, ...failVideos];

    // Initialize 4 weeks
    const weeks = [
      { key: 'Tuần 1', label: 'Tuần 1', total: 0, win: 0, fail: 0, winRate: 0, views: 0, avgScore: 0, scoredCount: 0, scoreSum: 0 },
      { key: 'Tuần 2', label: 'Tuần 2', total: 0, win: 0, fail: 0, winRate: 0, views: 0, avgScore: 0, scoredCount: 0, scoreSum: 0 },
      { key: 'Tuần 3', label: 'Tuần 3', total: 0, win: 0, fail: 0, winRate: 0, views: 0, avgScore: 0, scoredCount: 0, scoreSum: 0 },
      { key: 'Tuần 4', label: 'Tuần 4', total: 0, win: 0, fail: 0, winRate: 0, views: 0, avgScore: 0, scoredCount: 0, scoreSum: 0 },
    ];

    allVideos.forEach((v: any) => {
      let day = 1;
      if (v.postDate) {
        const d = new Date(v.postDate);
        if (!isNaN(d.getTime())) {
          day = d.getDate();
        }
      }

      let weekIdx = 0;
      if (day > 21) weekIdx = 3;
      else if (day > 14) weekIdx = 2;
      else if (day > 7) weekIdx = 1;

      const w = weeks[weekIdx];
      w.total += 1;
      if (v.status === 'WIN') {
        w.win += 1;
      } else {
        w.fail += 1;
      }
      
      // views helper parsing views to num
      let tViews = 0;
      if (typeof v.views === 'number') {
        tViews = v.views;
      } else if (v.views) {
        const clean = String(v.views).replace(/\s*views/gi, '').trim();
        const mM = clean.match(/^([\d.]+)\s*M/i);
        if (mM) tViews = Math.round(parseFloat(mM[1]) * 1_000_000);
        else {
          const mK = clean.match(/^([\d.]+)\s*K/i);
          if (mK) tViews = Math.round(parseFloat(mK[1]) * 1_000);
          else tViews = parseInt(clean.replace(/[^\d]/g, ''), 10) || 0;
        }
      }
      w.views += tViews;

      // Score processing
      if (v.scores && v.scores.length > 0) {
        v.scores.forEach((s: any) => {
          if (typeof s.score_total === 'number') {
            w.scoreSum += s.score_total;
            w.scoredCount += 1;
          }
        });
      }
    });

    return weeks.map(w => {
      return {
        ...w,
        winRate: w.total > 0 ? (w.win / w.total) * 100 : 0,
        avgScore: w.scoredCount > 0 ? w.scoreSum / w.scoredCount : 0
      };
    });
  }, [teamsData, activeTab]);

  const getX = (idx: number) => {
    const pointsCount = trendPoints.length;
    const startX = 60;
    const endX = 480;
    const step = pointsCount > 1 ? (endX - startX) / (pointsCount - 1) : 0;
    return startX + idx * step;
  };

  const getY = (val: number) => 130 - (trendRange > 0 ? ((val - minTrendVal) / trendRange) * 100 : 50);

  const generateSvgPath = (points: number[], fill: boolean) => {
    if (points.length === 0) return '';
    let path = `M ${getX(0)} ${getY(points[0])}`;
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(points[i]);
      const x2 = getX(i + 1);
      const y2 = getY(points[i + 1]);
      const cp1x = x1 + (x2 - x1) / 3;
      const cp1y = y1;
      const cp2x = x1 + 2 * (x2 - x1) / 3;
      const cp2y = y2;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }
    if (fill) {
      path += ` L ${getX(points.length - 1)} 130 L ${getX(0)} 130 Z`;
    }
    return path;
  };

  return (
    <>
      {/* Dashboard Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#0e1626]/80 via-[#121b2e]/80 to-[#0e1626]/80 border border-white/[0.06] p-6 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden group transition-all duration-300">
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
      <div className="flex items-center gap-1.5 bg-[#0b101d]/60 border border-white/[0.05] p-1 rounded-2xl self-start shadow-inner">
        {(['All', 'TikTok', 'Instagram Reels', 'YouTube Shorts'] as const).map((filter) => {
          const isActive = platformFilter === filter;
          return (
            <button key={filter} onClick={() => setPlatformFilter(filter)}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all duration-300 relative ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)] scale-100' : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'}`}>
              {filter === 'All' ? 'Tất cả nền tảng' : filter}
            </button>
          );
        })}
      </div>

      {/* Main Statistics Content */}
      <div className="flex flex-col gap-6 mt-4 pb-16">
        {/* Company Overall Statistics & Crown Section */}
        <div className="bg-[#0e1626]/30 border border-white/[0.04] p-6 rounded-3xl shadow-xl backdrop-blur-xl flex flex-col gap-5 hover:border-white/[0.07] transition-all duration-300">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
            <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Phân Tích Hiệu Suất & Đánh Giá Toàn Công Ty (K1 - K5)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Tổng Sản Lượng Công Ty */}
            <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-1 shadow hover:border-blue-500/20 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/[0.02] rounded-full blur-lg pointer-events-none" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-400" /> Tổng Sản Lượng
              </span>
              <span className="text-2xl font-black text-white mt-2 tracking-tight">{companyMetrics.totalVideos} Video</span>
              <span className="text-[10px] text-slate-500 font-bold mt-1">
                {companyMetrics.totalWin} Win · {companyMetrics.totalFail} Fail
              </span>
            </div>

            {/* KPI 2: Tỷ Lệ Win Rate Trung Bình */}
            <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-1 shadow hover:border-emerald-500/20 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/[0.02] rounded-full blur-lg pointer-events-none" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Tỷ Lệ Win Rate TB
              </span>
              <span className="text-2xl font-black text-emerald-400 mt-2 tracking-tight">
                {companyMetrics.overallWinRate.toFixed(1).replace('.', ',')}%
              </span>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(companyMetrics.overallWinRate, 100)}%` }} />
              </div>
            </div>

            {/* KPI 3: Điểm Đánh Giá Trung Bình */}
            <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-1 shadow hover:border-purple-500/20 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/[0.02] rounded-full blur-lg pointer-events-none" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Điểm Đánh Giá TB
              </span>
              <span className="text-2xl font-black text-purple-400 mt-2 tracking-tight">
                {companyMetrics.overallAvgScore > 0 ? `${companyMetrics.overallAvgScore.toFixed(1)}/10` : '-'}
              </span>
              <span className="text-[10px] text-slate-500 font-bold mt-1">
                Dựa trên {companyMetrics.scoredVideosCount} video đã chấm
              </span>
            </div>

            {/* KPI 4: Team Sáng Tạo Nhất (Crowned!) */}
            <div className="bg-gradient-to-br from-amber-500/[0.05] via-[#0e1626]/50 to-amber-500/[0.02] border border-amber-500/20 rounded-3xl p-5 flex flex-col gap-1 shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/[0.05] rounded-full blur-lg pointer-events-none animate-pulse" />
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Team Sáng Tạo Nhất
              </span>
              <span className="text-2xl font-black text-amber-300 mt-2 tracking-tight flex items-center gap-1.5">
                🏆 {companyMetrics.mostCreativeTeam ? companyMetrics.mostCreativeTeam.teamName : 'Chưa có'}
              </span>
              <span className="text-[10px] text-amber-500/80 font-bold mt-1">
                {companyMetrics.mostCreativeTeam && companyMetrics.mostCreativeTeam.avgScore > 0 
                  ? `Điểm Đánh Giá TB: ${companyMetrics.mostCreativeTeam.avgScore.toFixed(1)}/10`
                  : 'Chưa có dữ liệu đánh giá'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Tổng Views */}
          <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-1 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-blue-400" /> Tổng Lượt Xem</span>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">↑ 14.5%</span>
            </div>
            <span className="text-3xl font-black text-white mt-2.5 tracking-tight">{formattedTotalViews}</span>
            <span className="text-[10px] text-slate-500 font-bold mt-1.5">Lọc theo nền tảng đang chọn</span>
          </div>

          {/* KPI 2: Tỷ Lệ Win */}
          <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-1 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden group">
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
          <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-1 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden group">
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
          <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-1 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden group">
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
        <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Xu Hướng Tăng Trưởng Views Lũy Kế
            </span>
            <div className="flex items-center gap-3">
              {/* Trend Mode Switcher */}
              <div className="flex bg-slate-950/60 border border-white/[0.08] p-0.5 rounded-lg shadow-inner mr-2 select-none">
                <button
                  onClick={() => setTrendMode('week')}
                  className={`px-3 py-1 text-[9px] font-black rounded-md transition-all ${trendMode === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Theo Tuần
                </button>
                <button
                  onClick={() => setTrendMode('month')}
                  className={`px-3 py-1 text-[9px] font-black rounded-md transition-all ${trendMode === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Theo Tháng
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-bold">Đơn vị: Lượt xem</span>
            </div>
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
                
                {/* Dynamic path rendering */}
                <path d={generateSvgPath(trendPoints, true)} fill="url(#chartGradient)" />
                <path d={generateSvgPath(trendPoints, false)} fill="none" stroke="#3b82f6" strokeWidth="3" filter="url(#glow)" />
                
                {trendPoints.map((val, idx) => (
                  <g key={idx} className="cursor-pointer group/dot">
                    <circle cx={getX(idx)} cy={getY(val)} r="5" className="fill-blue-500 stroke-slate-900 stroke-2 hover:r-7 transition-all" />
                    <text x={getX(idx)} y={getY(val) - 12} textAnchor="middle" className="text-[9px] font-black fill-slate-300 opacity-0 group-hover/dot:opacity-100 transition-opacity">{formatViewsCompact(val)}</text>
                  </g>
                ))}
                {(trendMode === 'week'
                  ? ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5']
                  : ['Tháng 5', 'Tháng 6', 'Tháng 7']
                ).map((w, idx) => (
                  <text key={idx} x={getX(idx)} y="148" textAnchor="middle" className="text-[9px] font-bold fill-slate-500 uppercase">{w}</text>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Weekly Performance Breakdown */}
        <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-400" /> Bảng phân tích hiệu suất theo Tuần (Team {activeTab})
            </span>
            
            {/* Week Switcher Pills */}
            <div className="flex bg-slate-950/60 border border-white/[0.08] p-0.5 rounded-lg shadow-inner select-none">
              {['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'].map((w) => {
                const isActive = selectedStatWeek === w;
                return (
                  <button
                    key={w}
                    onClick={() => setSelectedStatWeek(w)}
                    className={`px-3 py-1 text-[9px] font-black rounded-md transition-all ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </div>

          {(() => {
            const currentWeekStat = weeklyStats.find(w => w.key === selectedStatWeek) || weeklyStats[0];
            const winRate = currentWeekStat.winRate;
            let statusText = 'Khá';
            let statusColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            if (winRate >= 70) {
              statusText = 'Xuất Sắc';
              statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            } else if (winRate >= 50) {
              statusText = 'Tốt';
              statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            } else if (winRate > 0 && winRate < 35) {
              statusText = 'Yếu';
              statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            } else if (winRate === 0) {
              statusText = 'Chưa có dữ liệu';
              statusColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
            }

            return (
              <div className="bg-gradient-to-br from-[#0e1626]/60 via-[#121c33]/40 to-[#0e1626]/60 border border-white/[0.06] rounded-3xl p-6 shadow-2xl relative overflow-hidden group transition-all duration-300">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/[0.02] rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.05] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/35 rounded-2xl text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">{currentWeekStat.label} - Tổng Quan</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Thời gian thực tế trong kỳ báo cáo</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đánh giá chung:</span>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-wider shadow-sm ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
                  {/* Card 1: Lượt xem (Views) */}
                  <div className="bg-[#0b111e]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between hover:border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)] transition-all duration-300 relative overflow-hidden group/item h-[120px]">
                    <div className="absolute right-4 top-4 text-blue-500/[0.03] group-hover/item:text-blue-500/[0.06] transition-colors">
                      <Eye className="w-12 h-12" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-400" /> Tổng Lượt Xem
                    </span>
                    <div className="mt-4">
                      <span className="text-2xl font-black text-white tracking-tight leading-none">
                        {formatViewsCompact(currentWeekStat.views)}
                      </span>
                      <p className="text-[9px] text-slate-500 font-bold mt-2">Tổng số lượt xem tích lũy</p>
                    </div>
                  </div>

                  {/* Card 2: Sản lượng Video */}
                  <div className="bg-[#0b111e]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.05)] transition-all duration-300 relative overflow-hidden group/item h-[120px]">
                    <div className="absolute right-4 top-4 text-purple-500/[0.03] group-hover/item:text-purple-500/[0.06] transition-colors">
                      <Video className="w-12 h-12" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-purple-400" /> Sản Lượng Video
                    </span>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white tracking-tight leading-none">{currentWeekStat.total}</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase">Video</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[9px] text-emerald-400 font-black bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          {currentWeekStat.win} Win
                        </span>
                        <span className="text-[9px] text-rose-400 font-black bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                          {currentWeekStat.fail} Fail
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Tỷ Lệ Win Rate */}
                  <div className="bg-[#0b111e]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)] transition-all duration-300 relative overflow-hidden group/item h-[120px]">
                    <div className="absolute right-4 top-4 text-emerald-500/[0.03] group-hover/item:text-emerald-500/[0.06] transition-colors">
                      <Trophy className="w-12 h-12" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Tỷ Lệ Win Rate
                    </span>
                    <div className="mt-4">
                      <span className="text-2xl font-black text-emerald-400 tracking-tight leading-none">
                        {currentWeekStat.winRate.toFixed(1).replace('.', ',')}%
                      </span>
                      <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden border border-white/[0.02] mt-3">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full" style={{ width: `${currentWeekStat.winRate}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Điểm Đánh Giá TB */}
                  <div className="bg-[#0b111e]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.05)] transition-all duration-300 relative overflow-hidden group/item h-[120px]">
                    <div className="absolute right-4 top-4 text-amber-500/[0.03] group-hover/item:text-amber-500/[0.06] transition-colors">
                      <Sparkles className="w-12 h-12" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Điểm Đánh Giá TB
                    </span>
                    <div className="mt-4">
                      <span className="text-2xl font-black text-amber-400 tracking-tight leading-none">
                        {currentWeekStat.avgScore > 0 ? `${currentWeekStat.avgScore.toFixed(1)}/10` : '-'}
                      </span>
                      <p className="text-[9px] text-slate-500 font-bold mt-2 truncate">
                        {currentWeekStat.scoredCount > 0 ? `Dựa trên ${currentWeekStat.scoredCount} video đã chấm` : 'Chưa có điểm chấm'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Weekly Charts Comparison */}
        <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-400" /> Biểu đồ so sánh hiệu suất giữa các Tuần (Team {activeTab})
            </span>
            <span className="text-[10px] text-slate-400 font-bold">So sánh trực quan các chỉ số theo tuần</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Lượt xem */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Lượt xem từng tuần</span>
              <div className="flex flex-col gap-2.5">
                {weeklyStats.map((stat) => {
                  const maxViews = Math.max(...weeklyStats.map(s => s.views), 1);
                  const viewPercentage = (stat.views / maxViews) * 100;
                  return (
                    <div key={stat.key} className="flex items-center gap-3">
                      <span className="w-12 text-[11px] font-black text-slate-300">{stat.label}</span>
                      <div className="flex-1 h-3 bg-slate-950 rounded-lg overflow-hidden border border-white/[0.04] relative flex items-center">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg" style={{ width: `${viewPercentage}%` }} />
                        <span className="absolute right-2 text-[9px] font-black text-white">{formatViewsCompact(stat.views)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Sản lượng Win Rate */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tỷ lệ Win Rate</span>
              <div className="flex flex-col gap-2.5">
                {weeklyStats.map((stat) => {
                  return (
                    <div key={stat.key} className="flex items-center gap-3">
                      <span className="w-12 text-[11px] font-black text-slate-300">{stat.label}</span>
                      <div className="flex-1 h-3 bg-slate-950 rounded-lg overflow-hidden border border-white/[0.04] relative flex items-center">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg" style={{ width: `${stat.winRate}%` }} />
                        <span className="absolute right-2 text-[9px] font-black text-white">{stat.winRate.toFixed(1).replace('.', ',')}% ({stat.total} video)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Điểm Đánh Giá TB */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Điểm chất lượng trung bình</span>
              <div className="flex flex-col gap-2.5">
                {weeklyStats.map((stat) => {
                  const maxScore = 10;
                  const scorePercentage = (stat.avgScore / maxScore) * 100;
                  return (
                    <div key={stat.key} className="flex items-center gap-3">
                      <span className="w-12 text-[11px] font-black text-slate-300">{stat.label}</span>
                      <div className="flex-1 h-3 bg-slate-950 rounded-lg overflow-hidden border border-white/[0.04] relative flex items-center">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg" style={{ width: `${stat.avgScore > 0 ? scorePercentage : 0}%` }} />
                        <span className="absolute right-2 text-[9px] font-black text-white">
                          {stat.avgScore > 0 ? `${stat.avgScore.toFixed(1)}/10` : 'Chưa chấm'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Section */}
        <div className="flex flex-col gap-4">
          {/* Sub-nav: Điểm danh tuần / Lịch sử */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900/50 rounded-2xl p-1 border border-white/[0.05]">
              <button
                onClick={() => setAttendanceView('current')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
                  attendanceView === 'current'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3 h-3" />
                Điểm danh tuần này
              </button>
              <button
                onClick={() => setAttendanceView('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
                  attendanceView === 'history'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                Lịch sử điểm danh
              </button>
            </div>
          </div>

          {/* Current session view */}
          {attendanceView === 'current' && (
            <AttendanceSection
              periodsList={periodsList}
              teamsList={teamsList}
              teamMembers={baseData?.members || []}
              activeTeam={activeTab}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserRoles={currentUserRoles}
              showToast={showToast}
            />
          )}

          {/* History view */}
          {attendanceView === 'history' && (
            <AttendanceHistorySection
              activeTeam={activeTab}
              teamsList={teamsList}
              onTeamChange={onTabChange}
              currentUserId={currentUserId}
              currentUserRoles={currentUserRoles}
              showToast={showToast}
            />
          )}
        </div>

        {/* Leaderboard & Platforms */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Editor Performance Leaderboard */}
          <div className="lg:col-span-7 bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-3 gap-3">
              <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" /> Bảng Xếp Hạng Editor ({activeTab})
              </span>
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Tìm Editor..." value={editorSearchQuery} onChange={(e) => setEditorSearchQuery(e.target.value)} className="bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 rounded-lg px-2.5 py-1 text-[11px] text-white outline-none w-32 focus:w-40 transition-all placeholder-slate-500" />
                <div className="relative" onBlur={() => setTimeout(() => setIsSortDropdownOpen(false), 200)}>
                  <button
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="flex items-center justify-between gap-1.5 bg-slate-950/60 hover:bg-slate-900/60 border border-white/[0.08] rounded-lg px-2.5 py-1 text-[11px] text-slate-300 hover:text-white outline-none cursor-pointer select-none font-bold"
                  >
                    <span>
                      {editorSortBy === 'winRate' && 'Sắp xếp: % Win'}
                      {editorSortBy === 'totalVideos' && 'Sắp xếp: Tổng Video'}
                      {editorSortBy === 'avgViews' && 'Sắp xếp: Views TB'}
                      {editorSortBy === 'avgQualityScore' && 'Sắp xếp: Điểm Đánh giá'}
                    </span>
                    <svg className="w-2.5 h-2.5 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: isSortDropdownOpen ? 'rotate(180deg)' : 'none' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isSortDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-40 bg-[#0e1626]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl py-1 shadow-2xl z-30 flex flex-col overflow-hidden">
                      {[
                        { key: 'winRate', label: 'Sắp xếp: % Win' },
                        { key: 'totalVideos', label: 'Sắp xếp: Tổng Video' },
                        { key: 'avgViews', label: 'Sắp xếp: Views TB' },
                        { key: 'avgQualityScore', label: 'Sắp xếp: Điểm Đánh giá' }
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            setEditorSortBy(opt.key as any);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`px-3 py-1.5 text-[11px] text-left font-bold transition-colors cursor-pointer hover:bg-white/[0.04] ${
                            editorSortBy === opt.key ? 'text-blue-400 bg-blue-500/[0.04]' : 'text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top 3 Podium */}
            <div className="flex items-end justify-center gap-3 sm:gap-6 pt-5 pb-3 border-b border-white/[0.04] mb-2 bg-[#0c1322]/20 rounded-3xl p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/[0.02] to-transparent pointer-events-none" />
              {/* Silver */}
              {filteredRankedPerformance[1] && (() => {
                const perf = filteredRankedPerformance[1];
                const initials = perf.editor.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div onClick={() => setSelectedEditorDetail(perf)} className="flex flex-col items-center w-24 sm:w-28 group relative cursor-pointer">
                    <div className="relative mb-2 flex items-center justify-center">
                      <div className="absolute -top-3 right-0 bg-slate-400 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-slate-300">#2</div>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-800 text-xs font-black shadow-[0_0_15px_rgba(148,163,184,0.2)] group-hover:scale-105 transition-transform duration-300">{initials}</div>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 truncate w-full text-center group-hover:text-blue-400 transition-colors">{perf.editor}</span>
                    <span className="text-[10px] font-bold text-slate-400">{perf.winRate} Win</span>
                    <div className="w-full bg-gradient-to-t from-slate-500/10 to-slate-400/20 border border-slate-400/20 h-14 rounded-t-2xl mt-2 flex flex-col items-center justify-center shadow-lg relative overflow-hidden backdrop-blur-md">
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/10" />
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
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-200 border-2 border-amber-300 flex items-center justify-center text-amber-950 text-sm font-black shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform duration-300 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        {initials}
                      </div>
                    </div>
                    <span className="text-xs font-black text-white truncate w-full text-center group-hover:text-amber-400 transition-colors">{perf.editor}</span>
                    <span className="text-[11px] font-black text-amber-400">{perf.winRate} Win</span>
                    <div className="w-full bg-gradient-to-t from-amber-600/10 to-amber-500/20 border border-amber-400/30 h-20 rounded-t-2xl mt-2 flex flex-col items-center justify-center shadow-lg relative overflow-hidden backdrop-blur-md">
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/25" />
                      <span className="text-xl font-black text-amber-300">1</span>
                      <span className="text-[7.5px] font-black text-amber-400 uppercase tracking-widest mt-0.5">VÀNG</span>
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
                      <div className="absolute -top-3 right-0 bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-orange-500">#3</div>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-orange-500 to-orange-300 border-2 border-orange-400 flex items-center justify-center text-slate-800 text-xs font-black shadow-[0_0_15px_rgba(249,115,22,0.2)] group-hover:scale-105 transition-transform duration-300">{initials}</div>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 truncate w-full text-center group-hover:text-blue-400 transition-colors">{perf.editor}</span>
                    <span className="text-[10px] font-bold text-slate-400">{perf.winRate} Win</span>
                    <div className="w-full bg-gradient-to-t from-orange-700/10 to-orange-600/20 border border-orange-500/20 h-10 rounded-t-2xl mt-2 flex flex-col items-center justify-center shadow-lg relative overflow-hidden backdrop-blur-md">
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/10" />
                      <span className="text-base font-black text-orange-300">3</span>
                      <span className="text-[7.5px] font-black text-orange-400 uppercase tracking-widest mt-0.5">ĐỒNG</span>
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
                    <th className="py-2.5 px-3 text-right w-20">Views TB</th>
                    <th className="py-2.5 px-3 text-center w-16">Điểm TB</th>
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
                        <td className="py-3 px-3 text-center font-black text-purple-400">{perf.avgQualityScore}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Platform Analytics */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300 flex-1">
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
                      className={`border rounded-3xl p-4 flex flex-col gap-3 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg cursor-pointer ${isFilterActive ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-950/10' : borderTheme}`}>
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

            {/* Editor Contribution Share */}
            <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-purple-400" /> Tỷ lệ Đóng góp Sản lượng Editor
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Tổng: {totalVal} Video</span>
              </div>
              <div className="flex flex-col gap-3.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {rankedPerformance.length === 0 ? (
                  <span className="text-slate-500 text-xs italic font-medium py-4 text-center block">Không có dữ liệu đóng góp</span>
                ) : (
                  rankedPerformance.map((perf: any) => {
                    const pct = totalVal > 0 ? (perf.total / totalVal) * 100 : 0;
                    return (
                      <div key={perf.editor} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                          <span className="truncate max-w-[150px]">{perf.editor}</span>
                          <span className="text-slate-400 font-black">{perf.total} video ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/[0.04] flex">
                          <div className="h-full bg-emerald-500" style={{ width: `${pct * (perf.total > 0 ? perf.win / perf.total : 0)}%` }} />
                          <div className="h-full bg-rose-500/70" style={{ width: `${pct * (perf.total > 0 ? perf.fail / perf.total : 0)}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Checklist & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300">
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

          <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300">
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

        {/* Cross-Team Performance Overview */}
        {(() => {
          const crossTeamStats = Object.keys(teamsData).map((tName) => {
            const tData = teamsData[tName];
            const wins = tData.videos || [];
            const fails = tData.failVideos || [];
            const caseStudies = tData.caseStudies || [];
            
            let totalViews = 0;
            wins.forEach((v: any) => { totalViews += parseViewsToNum(v.views); });
            fails.forEach((v: any) => { totalViews += parseViewsToNum(v.views); });
            caseStudies.forEach((c: any) => { totalViews += parseViewsToNum(c.views); });
            
            const totalVids = wins.length + fails.length;
            const winCount = wins.length;
            const winRate = totalVids > 0 ? (winCount / totalVids) * 100 : 0;
            
            // Calculate average quality score for the team
            const allTeamVideos = [...wins, ...fails];
            let tScoreSum = 0;
            let tScoreCount = 0;
            allTeamVideos.forEach((v: any) => {
              if (v.scores && v.scores.length > 0) {
                v.scores.forEach((s: any) => {
                  if (typeof s.score_total === 'number') {
                    tScoreSum += s.score_total;
                    tScoreCount += 1;
                  }
                });
              }
            });
            const avgScore = tScoreCount > 0 ? tScoreSum / tScoreCount : 0;

            return {
              teamName: tName,
              totalViews,
              winRate,
              totalVids,
              avgScore
            };
          });

          return (
            <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Báo cáo So sánh chéo các Team (Kỳ hiện tại)
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Tổng hợp hiệu năng liên nhóm</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* View Comparison Chart */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">So sánh Tổng Lượt Xem</span>
                  <div className="flex flex-col gap-2.5">
                    {crossTeamStats.map((stat) => {
                      const maxViews = Math.max(...crossTeamStats.map(s => s.totalViews), 1);
                      const viewPercentage = (stat.totalViews / maxViews) * 100;
                      return (
                        <div key={stat.teamName} className="flex items-center gap-3">
                          <span className="w-8 text-[11px] font-black text-slate-300">{stat.teamName}</span>
                          <div className="flex-1 h-3 bg-slate-950 rounded-lg overflow-hidden border border-white/[0.04] relative flex items-center">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg" style={{ width: `${viewPercentage}%` }} />
                            <span className="absolute right-2 text-[9px] font-black text-white">{formatViewsCompact(stat.totalViews)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Win Rate Comparison Chart */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">So sánh Tỷ lệ Win Rate</span>
                  <div className="flex flex-col gap-2.5">
                    {crossTeamStats.map((stat) => {
                      return (
                        <div key={stat.teamName} className="flex items-center gap-3">
                          <span className="w-8 text-[11px] font-black text-slate-300">{stat.teamName}</span>
                          <div className="flex-1 h-3 bg-slate-950 rounded-lg overflow-hidden border border-white/[0.04] relative flex items-center">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg" style={{ width: `${stat.winRate}%` }} />
                            <span className="absolute right-2 text-[9px] font-black text-white">{stat.winRate.toFixed(1).replace('.', ',')}% ({stat.totalVids} video)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Average Score Comparison Chart */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">So sánh Điểm Đánh Giá TB</span>
                  <div className="flex flex-col gap-2.5">
                    {crossTeamStats.map((stat) => {
                      const maxScore = 10;
                      const scorePercentage = (stat.avgScore / maxScore) * 100;
                      return (
                        <div key={stat.teamName} className="flex items-center gap-3">
                          <span className="w-8 text-[11px] font-black text-slate-300">{stat.teamName}</span>
                          <div className="flex-1 h-3 bg-slate-950 rounded-lg overflow-hidden border border-white/[0.04] relative flex items-center">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg" style={{ width: `${stat.avgScore > 0 ? scorePercentage : 0}%` }} />
                            <span className="absolute right-2 text-[9px] font-black text-white">
                              {stat.avgScore > 0 ? `${stat.avgScore.toFixed(1)}/10` : 'Chưa chấm'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs font-black text-emerald-400">Tỷ lệ Win: {selectedEditorDetail.winRate}</span>
                      <span className="text-[10px] text-slate-500 font-bold">•</span>
                      <span className="text-xs font-bold text-slate-400">{selectedEditorDetail.total} Video đã làm</span>
                      <span className="text-[10px] text-slate-500 font-bold">•</span>
                      <span className="text-xs font-bold text-slate-400">Views TB: {selectedEditorDetail.avgViews}</span>
                      <span className="text-[10px] text-slate-500 font-bold">•</span>
                      <span className="text-xs font-black text-purple-400">Điểm Đánh giá: {selectedEditorDetail.avgQualityScore}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#1e293b]/30 border border-white/[0.04] p-3 rounded-2xl text-center shadow"><span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Video Win</span><p className="text-base font-black text-emerald-400 mt-1">{selectedEditorDetail.win}</p></div>
                  <div className="bg-[#1e293b]/30 border border-white/[0.04] p-3 rounded-2xl text-center shadow"><span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Video Fail</span><p className="text-base font-black text-rose-400 mt-1">{selectedEditorDetail.fail}</p></div>
                  <div className="bg-[#1e293b]/30 border border-white/[0.04] p-3 rounded-2xl text-center shadow"><span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Lượt xem TB</span><p className="text-base font-black text-blue-400 mt-1">{selectedEditorDetail.avgViews}</p></div>
                  <div className="bg-[#1e293b]/30 border border-white/[0.04] p-3 rounded-2xl text-center shadow"><span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Điểm Đánh giá</span><p className="text-base font-black text-purple-400 mt-1">{selectedEditorDetail.avgQualityScore}</p></div>
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
