'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadialBarChart, RadialBar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, CheckCircle, XCircle, Clock,
  Send, BarChart3, Target, Zap, Calendar, RefreshCw,
  Award, AlertTriangle, Activity, Hash, X, Users, Shield,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { socialApi, SocialPost, PLATFORM_META, SocialPlatform, HistoryMember } from '@/lib/api/social';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useSocialLang } from '@/contexts/SocialLanguageContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  FACEBOOK:  '#1877F2',
  INSTAGRAM: '#E1306C',
  TIKTOK:    '#010101',
  THREADS:   '#000000',
  YOUTUBE:   '#FF0000',
  ZALO:      '#0068FF',
};

function fmt(n: number) { return n.toLocaleString('vi'); }
function pct(a: number, b: number) { return b === 0 ? 0 : Math.round((a / b) * 100); }

const RANGE_OPTIONS = [
  { key: 'range7d' as const, value: 7 },
  { key: 'range30d' as const, value: 30 },
  { key: 'range90d' as const, value: 90 },
  { key: 'rangeAll' as const, value: 0 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: any; label: string; value: string | number; sub?: string;
  color: string; trend?: { value: number; label: string };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
            trend.value >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-sm font-semibold text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-bold text-slate-800">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { user } = useAuthStore();
  const { t } = useSocialLang();

  // Phân quyền
  const isAdmin  = user?.roles?.some((r: string) => ['ADMIN', 'MANAGER'].includes(r)) ?? false;
  const isLeader = !isAdmin && (user?.roles?.some((r: string) => r === 'LEADER') ?? false);
  const canFilter = isAdmin || isLeader;

  const [posts, setPosts]       = useState<SocialPost[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeDays, setRangeDays] = useState(30);

  // Bộ lọc team / thành viên (chỉ admin/leader)
  const [teams, setTeams]               = useState<string[]>([]);
  const [members, setMembers]           = useState<HistoryMember[]>([]);
  const [teamFilter, setTeamFilter]     = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');

  // Tải danh sách teams + members khi mount (nếu có quyền)
  useEffect(() => {
    if (!canFilter) return;
    socialApi.history.teams().then(setTeams).catch(() => {});
    socialApi.history.members().then(setMembers).catch(() => {});
  }, [canFilter]);

  // Khi đổi team → reload members theo team
  useEffect(() => {
    if (!canFilter) return;
    socialApi.history.members(teamFilter !== 'all' ? teamFilter : undefined)
      .then(setMembers)
      .catch(() => {});
    setMemberFilter('all');
  }, [teamFilter, canFilter]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const data = await socialApi.history.list({
        limit: 1000,
        ...(teamFilter !== 'all'   ? { team: teamFilter }         : {}),
        ...(memberFilter !== 'all' ? { employeeId: memberFilter } : {}),
      });
      setPosts(data);
    } catch {
      toast.error(t.stats.loadFailed);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [teamFilter, memberFilter]);

  useEffect(() => { load(); }, [load]);

  // Apply range filter
  const rangedPosts = useMemo(() => {
    if (rangeDays === 0) return posts;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays);
    return posts.filter(p => new Date(p.created_at) >= cutoff);
  }, [posts, rangeDays]);

  // ── KPI calculations ──
  const total     = rangedPosts.length;
  const success   = rangedPosts.filter(p => p.status === 'COMPLETED').length;
  const failed    = rangedPosts.filter(p => p.status === 'FAILED').length;
  const pending   = rangedPosts.filter(p => p.status === 'PENDING').length;
  const scheduled = rangedPosts.filter(p => p.source === 'SCHEDULED').length;
  const immediate = rangedPosts.filter(p => p.source === 'IMMEDIATE').length;
  const successRate = pct(success, total);
  const days = rangeDays || Math.max(1,
    Math.ceil((Date.now() - Math.min(...rangedPosts.map(p => new Date(p.created_at).getTime()))) / 86400000) + 1
  );
  const avgPerDay = total === 0 ? 0 : (total / days).toFixed(1);

  // Best platform (by success rate, min 2 posts)
  const platformStats = useMemo(() => {
    const map: Record<string, { total: number; success: number; failed: number; pending: number }> = {};
    rangedPosts.forEach(p => {
      if (!map[p.platform]) map[p.platform] = { total: 0, success: 0, failed: 0, pending: 0 };
      map[p.platform].total++;
      if (p.status === 'COMPLETED') map[p.platform].success++;
      else if (p.status === 'FAILED') map[p.platform].failed++;
      else map[p.platform].pending++;
    });
    return Object.entries(map)
      .map(([platform, s]) => ({
        platform,
        ...s,
        rate: pct(s.success, s.total),
        meta: (PLATFORM_META as any)[platform] || { label: platform, emoji: '📱', color: 'bg-slate-500' },
        color: PLATFORM_COLORS[platform] || '#94a3b8',
      }))
      .sort((a, b) => b.total - a.total);
  }, [rangedPosts]);

  const bestPlatform = [...platformStats].sort((a, b) => b.rate - a.rate).find(p => p.total >= 2);

  // ── Posts per day chart (last N days) ──
  const trendData = useMemo(() => {
    const n = rangeDays === 0 ? 30 : rangeDays;
    return Array.from({ length: Math.min(n, 60) }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (Math.min(n, 60) - 1 - i));
      const label = d.toLocaleDateString('vi', { day: '2-digit', month: '2-digit' });
      const dayPosts = rangedPosts.filter(p => {
        const pd = new Date(p.created_at);
        return pd.getFullYear() === d.getFullYear() &&
               pd.getMonth() === d.getMonth() &&
               pd.getDate() === d.getDate();
      });
      return {
        label,
        [t.stats.success]: dayPosts.filter(p => p.status === 'COMPLETED').length,
        [t.stats.failed]:  dayPosts.filter(p => p.status === 'FAILED').length,
        [t.stats.pending]: dayPosts.filter(p => p.status === 'PENDING').length,
        total: dayPosts.length,
      };
    });
  }, [rangedPosts, rangeDays, t]);

  // ── Hourly distribution ──
  const hourlyData = useMemo(() => {
    const map: Record<number, { success: number; failed: number }> = {};
    for (let h = 0; h < 24; h++) map[h] = { success: 0, failed: 0 };
    rangedPosts.forEach(p => {
      const h = new Date(p.created_at).getHours();
      if (p.status === 'COMPLETED') map[h].success++;
      else if (p.status === 'FAILED') map[h].failed++;
    });
    return Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, '0')}h`,
      [t.stats.success]: map[h].success,
      [t.stats.failed]: map[h].failed,
      total: map[h].success + map[h].failed,
    }));
  }, [rangedPosts, t]);

  const peakHour = hourlyData.reduce((a, b) => (b.total > a.total ? b : a), hourlyData[0]);

  // ── Day of week ──
  const dowData = useMemo(() => {
    const map = Array.from({ length: 7 }, () => ({ success: 0, failed: 0 }));
    rangedPosts.forEach(p => {
      const d = new Date(p.created_at).getDay();
      if (p.status === 'COMPLETED') map[d].success++;
      else if (p.status === 'FAILED') map[d].failed++;
    });
    return map.map((v, i) => ({
      label: t.stats.dowLabels[i],
      [t.stats.success]: v.success,
      [t.stats.failed]: v.failed,
      total: v.success + v.failed,
    }));
  }, [rangedPosts, t]);

  // ── Success rate radial data ──
  const radialData = [{ name: t.stats.rate, value: successRate, fill: successRate >= 80 ? '#10b981' : successRate >= 50 ? '#f59e0b' : '#ef4444' }];

  // ── Member stats (admin/manager only) ──
  const memberStats = useMemo(() => {
    if (!isAdmin) return [];
    const map: Record<string, {
      user: { id: string; full_name: string; team?: string; image_url?: string };
      total: number; success: number; failed: number; pending: number;
    }> = {};
    rangedPosts.forEach(p => {
      if (!p.user) return;
      if (!map[p.user_id]) map[p.user_id] = { user: p.user, total: 0, success: 0, failed: 0, pending: 0 };
      map[p.user_id].total++;
      if (p.status === 'COMPLETED') map[p.user_id].success++;
      else if (p.status === 'FAILED') map[p.user_id].failed++;
      else map[p.user_id].pending++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rangedPosts, isAdmin]);

  // ── Recent failures ──
  const recentFailed = rangedPosts
    .filter(p => p.status === 'FAILED')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // ── Hashtag stats ──
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [hashtagLimit, setHashtagLimit] = useState(15);

  const hashtagStats = useMemo(() => {
    const map: Record<string, { total: number; success: number; failed: number; pending: number; posts: SocialPost[] }> = {};
    rangedPosts.forEach(p => {
      const tags = (p.message || '').match(/#(\w+)/g) || [];
      tags.forEach(raw => {
        const tag = raw.toLowerCase(); // normalize
        if (!map[tag]) map[tag] = { total: 0, success: 0, failed: 0, pending: 0, posts: [] };
        map[tag].total++;
        map[tag].posts.push(p);
        if (p.status === 'COMPLETED') map[tag].success++;
        else if (p.status === 'FAILED') map[tag].failed++;
        else map[tag].pending++;
      });
    });
    return Object.entries(map)
      .map(([tag, s]) => ({ tag, ...s, rate: pct(s.success, s.total) }))
      .sort((a, b) => b.total - a.total);
  }, [rangedPosts]);

  const selectedHashtagData = useMemo(() =>
    selectedHashtag ? hashtagStats.find(h => h.tag === selectedHashtag) : null,
  [selectedHashtag, hashtagStats]);

  // Posts of selected hashtag grouped by platform
  const selectedHashtagPlatformBreakdown = useMemo(() => {
    if (!selectedHashtagData) return [];
    const map: Record<string, { success: number; failed: number; total: number }> = {};
    selectedHashtagData.posts.forEach(p => {
      if (!map[p.platform]) map[p.platform] = { success: 0, failed: 0, total: 0 };
      map[p.platform].total++;
      if (p.status === 'COMPLETED') map[p.platform].success++;
      else if (p.status === 'FAILED') map[p.platform].failed++;
    });
    return Object.entries(map)
      .map(([platform, s]) => ({
        platform,
        ...s,
        meta: (PLATFORM_META as any)[platform] || { label: platform, emoji: '📱' },
      }))
      .sort((a, b) => b.total - a.total);
  }, [selectedHashtagData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{t.stats.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-7xl py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900">{t.stats.pageTitle}</h1>
                <p className="text-xs text-slate-500">
                  {t.stats.postsInRange(fmt(total))}
                  {canFilter && teamFilter !== 'all' && ` · Team: ${teamFilter}`}
                  {canFilter && memberFilter !== 'all' && ` · ${members.find(m => m.id === memberFilter)?.full_name || t.stats.member}`}
                  {!canFilter && <span className="ml-1 text-indigo-400 font-medium">{t.stats.yourPosts}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Range selector */}
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                {RANGE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRangeDays(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      rangeDays === opt.value
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.stats[opt.key]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                title={t.stats.refresh}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/dashboard/social/compose"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> {t.stats.createPost}
              </Link>
            </div>
          </div>

          {/* Bộ lọc role — chỉ hiện với admin/manager/leader */}
          {canFilter && (
            <div className="flex items-center gap-3 flex-wrap pt-1 pb-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <Shield className="w-3.5 h-3.5" />
                {isAdmin ? 'Admin / Manager' : 'Leader'}
              </div>

              {/* Team filter — chỉ admin thấy nhiều team */}
              {isAdmin && teams.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500 whitespace-nowrap">{t.stats.teamLabel}</label>
                  <select
                    value={teamFilter}
                    onChange={e => setTeamFilter(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="all">{t.stats.allTeams}</option>
                    {teams.map(team => <option key={team} value={team}>{team}</option>)}
                  </select>
                </div>
              )}

              {/* Member filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 whitespace-nowrap">
                  <Users className="w-3 h-3 inline mr-1" />{t.stats.memberLabel}
                </label>
                <select
                  value={memberFilter}
                  onChange={e => setMemberFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white max-w-[200px]"
                >
                  <option value="all">{t.stats.allMembers}</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}{m.team ? ` (${m.team})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {(teamFilter !== 'all' || memberFilter !== 'all') && (
                <button
                  onClick={() => { setTeamFilter('all'); setMemberFilter('all'); }}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 border border-indigo-200 rounded-lg bg-indigo-50"
                >
                  <X className="w-3 h-3" /> {t.stats.clearFilter}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-6 space-y-6">

        {total === 0 ? (
          <div className="text-center py-32">
            <BarChart3 className="w-20 h-20 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-600 mb-2">{t.stats.noDataTitle}</h3>
            <p className="text-slate-400 mb-6">{t.stats.noDataSub}</p>
            <Link href="/dashboard/social/compose"
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
              {t.stats.postNow}
            </Link>
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Activity}     label={t.stats.totalPosts}     value={fmt(total)}        color="bg-blue-600"    sub={t.stats.postsPerDay(avgPerDay)} />
              <KpiCard icon={CheckCircle}  label={t.stats.success}        value={fmt(success)}      color="bg-emerald-500" sub={t.stats.successRateSub(successRate)} />
              <KpiCard icon={XCircle}      label={t.stats.failed}         value={fmt(failed)}       color="bg-red-500"     sub={failed > 0 ? t.stats.errorRateSub(pct(failed, total)) : t.stats.noErrors} />
              <KpiCard icon={Target}       label={t.stats.successRate}    value={`${successRate}%`} color={successRate >= 80 ? 'bg-emerald-500' : successRate >= 50 ? 'bg-amber-500' : 'bg-red-500'} sub={successRate >= 80 ? t.stats.veryGood : successRate >= 50 ? t.stats.needsImprovement : t.stats.needsAttention} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Calendar}  label={t.stats.scheduled}      value={fmt(scheduled)}  color="bg-indigo-500" sub={t.stats.percentOfTotal(pct(scheduled, total))} />
              <KpiCard icon={Zap}       label={t.stats.immediate}      value={fmt(immediate)}  color="bg-violet-500" sub={t.stats.percentOfTotal(pct(immediate, total))} />
              <KpiCard icon={Clock}     label={t.stats.pending}        value={fmt(pending)}    color="bg-amber-500"  sub={t.stats.notProcessed} />
              <KpiCard icon={Award}     label={t.stats.bestPlatform}   value={bestPlatform ? `${bestPlatform.meta.emoji} ${bestPlatform.meta.label}` : '—'} color="bg-pink-500" sub={bestPlatform ? t.stats.successRateSimple(bestPlatform.rate) : t.stats.notEnoughData} />
            </div>

            {/* ── Member leaderboard (admin/manager only) ── */}
            {isAdmin && memberStats.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-sm">{t.stats.memberStatsTitle}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{t.stats.memberStatsSummary(memberStats.length, fmt(total))}</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {memberStats.map((ms, idx) => {
                    const rate = pct(ms.success, ms.total);
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                    const initials = ms.user.full_name.split(' ').map((n: string) => n[0]).slice(-2).join('').toUpperCase();
                    return (
                      <div key={ms.user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                        {/* Rank */}
                        <div className="w-7 text-center flex-shrink-0">
                          {medal
                            ? <span className="text-lg">{medal}</span>
                            : <span className="text-xs font-black text-slate-400">{idx + 1}</span>}
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600">
                          {ms.user.image_url
                            ? <img src={ms.user.image_url} alt={ms.user.full_name} className="w-full h-full object-cover" />
                            : <span className="text-white text-xs font-bold">{initials}</span>}
                        </div>

                        {/* Name + Team + progress bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-800 truncate">{ms.user.full_name}</span>
                            {ms.user.team && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                                {ms.user.team}
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 max-w-[200px]">
                            <div className="h-full flex">
                              <div className="bg-emerald-400" style={{ width: `${pct(ms.success, ms.total)}%` }} />
                              <div className="bg-red-400"     style={{ width: `${pct(ms.failed,  ms.total)}%` }} />
                              <div className="bg-amber-300"   style={{ width: `${pct(ms.pending, ms.total)}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Stat numbers */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-center hidden sm:block">
                            <p className="text-sm font-black text-emerald-600">{ms.success}</p>
                            <p className="text-[10px] text-slate-400">{t.stats.success}</p>
                          </div>
                          <div className="text-center hidden sm:block">
                            <p className="text-sm font-black text-red-500">{ms.failed}</p>
                            <p className="text-[10px] text-slate-400">{t.stats.failed}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black text-slate-800">{ms.total}</p>
                            <p className="text-[10px] text-slate-400">{t.stats.totalLabel}</p>
                          </div>
                          <div className={`text-sm font-black w-10 text-right ${rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                            {rate}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Trend + Radial ── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Trend chart */}
              <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-slate-800 text-sm">{t.stats.trendTitle}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{t.stats.trendSub(rangeDays || t.stats.allDaysWord)}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData} barSize={rangeDays <= 7 ? 20 : rangeDays <= 30 ? 10 : 5}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                      interval={rangeDays <= 7 ? 0 : rangeDays <= 30 ? 4 : 9} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey={t.stats.success} stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey={t.stats.failed}   stackId="a" fill="#f87171" radius={[0, 0, 0, 0]} />
                    <Bar dataKey={t.stats.pending}   stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Success rate radial */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col items-center justify-center">
                <h2 className="font-bold text-slate-800 text-sm mb-1">{t.stats.successRate}</h2>
                <p className="text-xs text-slate-400 mb-4">{t.stats.overview}</p>
                <div className="relative">
                  <ResponsiveContainer width={160} height={160}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%"
                      data={[{ value: 100, fill: '#f1f5f9' }, ...radialData]}
                      startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" cornerRadius={8} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-black ${successRate >= 80 ? 'text-emerald-600' : successRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {successRate}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{t.stats.success}</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 w-full">
                  {[
                    { label: t.stats.success, value: success, color: 'bg-emerald-500' },
                    { label: t.stats.failed,   value: failed,  color: 'bg-red-400' },
                    { label: t.stats.pending,   value: pending, color: 'bg-amber-400' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.color}`} />
                      <span className="text-slate-500 flex-1">{s.label}</span>
                      <span className="font-bold text-slate-700">{fmt(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Platform stats ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Platform bar chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h2 className="font-bold text-slate-800 text-sm mb-1">{t.stats.postsByPlatform}</h2>
                <p className="text-xs text-slate-400 mb-4">{t.stats.postsByPlatformSub}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={platformStats} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="platform"
                      tick={({ x, y, payload }) => {
                        const meta = (PLATFORM_META as any)[payload.value] || {};
                        return <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#64748b">{meta.emoji} {meta.label || payload.value}</text>;
                      }}
                      width={90} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="success" name={t.stats.success} fill="#10b981" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="failed"  name={t.stats.failed}   fill="#f87171" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="pending" name={t.stats.pending}   fill="#fbbf24" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Platform table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h2 className="font-bold text-slate-800 text-sm mb-1">{t.stats.platformDetailTitle}</h2>
                <p className="text-xs text-slate-400 mb-4">{t.stats.platformDetailSub}</p>
                <div className="space-y-3">
                  {platformStats.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">{t.stats.noData}</p>
                  ) : platformStats.map(ps => (
                    <div key={ps.platform} className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${ps.meta.color} rounded-lg flex items-center justify-center text-white text-base flex-shrink-0`}>
                        {ps.meta.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-700">{ps.meta.label}</span>
                          <span className="text-xs font-black text-slate-500">{t.stats.postsCount(fmt(ps.total))}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full flex">
                            <div className="bg-emerald-400 transition-all" style={{ width: `${pct(ps.success, ps.total)}%` }} />
                            <div className="bg-red-400 transition-all"     style={{ width: `${pct(ps.failed, ps.total)}%` }} />
                            <div className="bg-amber-300 transition-all"   style={{ width: `${pct(ps.pending, ps.total)}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className={`text-xs font-black w-10 text-right ${ps.rate >= 80 ? 'text-emerald-600' : ps.rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {ps.rate}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Hour + Day of week ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Hourly */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-slate-800 text-sm">{t.stats.hourlyTitle}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{t.stats.hourlySub}</p>
                  </div>
                  {peakHour.total > 0 && (
                    <div className="text-right">
                      <p className="text-lg font-black text-blue-600">{peakHour.label}</p>
                      <p className="text-[10px] text-slate-400">{t.stats.peakHour}</p>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={hourlyData} barSize={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={24} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey={t.stats.success} stackId="h" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey={t.stats.failed}   stackId="h" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Day of week */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-slate-800 text-sm">{t.stats.dowTitle}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{t.stats.dowSub}</p>
                  </div>
                  {(() => {
                    const peak = dowData.reduce((a, b) => b.total > a.total ? b : a, dowData[0]);
                    return peak.total > 0 ? (
                      <div className="text-right">
                        <p className="text-lg font-black text-purple-600">{peak.label}</p>
                        <p className="text-[10px] text-slate-400">{t.stats.peakDay}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dowData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={24} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey={t.stats.success} stackId="d" fill="#818cf8" radius={[0, 0, 0, 0]} />
                    <Bar dataKey={t.stats.failed}   stackId="d" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Hashtag stats ── */}
            {hashtagStats.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                        <Hash className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-800 text-sm">{t.stats.hashtagStatsTitle}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{t.stats.hashtagStatsSub(hashtagStats.length)}</p>
                      </div>
                    </div>
                    {selectedHashtag && (
                      <button
                        onClick={() => setSelectedHashtag(null)}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 bg-slate-100 rounded-xl transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> {t.stats.deselect}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

                  {/* Left: bar chart + tag cloud */}
                  <div className="p-5 space-y-4">
                    {/* Bar chart top hashtags */}
                    <ResponsiveContainer width="100%" height={Math.min(hashtagStats.slice(0, hashtagLimit).length * 36, 400)}>
                      <BarChart
                        data={hashtagStats.slice(0, hashtagLimit).map(h => ({
                          tag: h.tag,
                          [t.stats.success]: h.success,
                          [t.stats.failed]:   h.failed,
                          [t.stats.pending]:   h.pending,
                          total: h.total,
                        }))}
                        layout="vertical"
                        barSize={14}
                        onClick={(data: any) => {
                          if (data?.activePayload?.[0]) {
                            const tag = data.activePayload[0].payload.tag;
                            setSelectedHashtag(prev => prev === tag ? null : tag);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis
                          type="category"
                          dataKey="tag"
                          width={100}
                          axisLine={false}
                          tickLine={false}
                          tick={({ x, y, payload }) => {
                            const isSelected = selectedHashtag === payload.value;
                            return (
                              <text x={x} y={y} dy={4} textAnchor="end" fontSize={11}
                                fill={isSelected ? '#ec4899' : '#64748b'}
                                fontWeight={isSelected ? 700 : 400}>
                                {payload.value}
                              </text>
                            );
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey={t.stats.success} stackId="h" fill="#10b981"
                          radius={[0, 0, 0, 0]}
                          onClick={(data: any) => setSelectedHashtag(prev => prev === data.tag ? null : data.tag)}
                        />
                        <Bar dataKey={t.stats.failed}   stackId="h" fill="#f87171" radius={[0, 0, 0, 0]} />
                        <Bar dataKey={t.stats.pending}   stackId="h" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    {hashtagStats.length > hashtagLimit && (
                      <button
                        onClick={() => setHashtagLimit(l => l + 15)}
                        className="w-full py-2 text-xs font-bold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                      >
                        {t.stats.showMoreHashtags(Math.min(hashtagStats.length - hashtagLimit, 15))}
                      </button>
                    )}

                    {/* Tag cloud */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.stats.allHashtags}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {hashtagStats.map(h => {
                          const isSelected = selectedHashtag === h.tag;
                          const intensity = Math.max(0.3, Math.min(1, h.total / (hashtagStats[0]?.total || 1)));
                          return (
                            <button
                              key={h.tag}
                              onClick={() => setSelectedHashtag(prev => prev === h.tag ? null : h.tag)}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                                isSelected
                                  ? 'bg-pink-500 border-pink-500 text-white shadow-md'
                                  : h.rate >= 80
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                  : h.rate >= 50
                                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                  : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                              }`}
                              style={{ opacity: 0.5 + intensity * 0.5 }}
                            >
                              {h.tag} <span className="opacity-60">({h.total})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: detail panel */}
                  <div className="p-5">
                    {!selectedHashtag ? (
                      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                          <Hash className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">{t.stats.selectHashtag}</p>
                        <p className="text-xs text-slate-400 mt-1">{t.stats.selectHashtagHint}</p>
                      </div>
                    ) : selectedHashtagData && (
                      <div className="space-y-5">
                        {/* Hashtag header */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                            <Hash className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-900">{selectedHashtagData.tag}</h3>
                            <p className="text-xs text-slate-400">{t.stats.postsCount(selectedHashtagData.total)}</p>
                          </div>
                          <div className={`ml-auto text-2xl font-black ${
                            selectedHashtagData.rate >= 80 ? 'text-emerald-600' :
                            selectedHashtagData.rate >= 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {selectedHashtagData.rate}%
                          </div>
                        </div>

                        {/* KPI mini */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: t.stats.success, value: selectedHashtagData.success, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: t.stats.failed,   value: selectedHashtagData.failed,  color: 'text-red-600',     bg: 'bg-red-50' },
                            { label: t.stats.pending,   value: selectedHashtagData.pending, color: 'text-amber-600',   bg: 'bg-amber-50' },
                          ].map(s => (
                            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5">{s.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.stats.rate}</p>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full flex">
                              <div className="bg-emerald-400" style={{ width: `${pct(selectedHashtagData.success, selectedHashtagData.total)}%` }} />
                              <div className="bg-red-400"     style={{ width: `${pct(selectedHashtagData.failed,  selectedHashtagData.total)}%` }} />
                              <div className="bg-amber-300"   style={{ width: `${pct(selectedHashtagData.pending, selectedHashtagData.total)}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Platform breakdown for this hashtag */}
                        {selectedHashtagPlatformBreakdown.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{t.stats.byPlatform}</p>
                            <div className="space-y-2.5">
                              {selectedHashtagPlatformBreakdown.map(pb => (
                                <div key={pb.platform} className="flex items-center gap-3">
                                  <div className={`w-7 h-7 ${pb.meta.color} rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0`}>
                                    {pb.meta.emoji}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="font-semibold text-slate-600">{pb.meta.label}</span>
                                      <span className="font-bold text-slate-700">{t.stats.postsCount(pb.total)}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full flex">
                                        <div className="bg-emerald-400" style={{ width: `${pct(pb.success, pb.total)}%` }} />
                                        <div className="bg-red-400"     style={{ width: `${pct(pb.failed,  pb.total)}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`text-xs font-black w-8 text-right ${
                                    pct(pb.success, pb.total) >= 80 ? 'text-emerald-600' :
                                    pct(pb.success, pb.total) >= 50 ? 'text-amber-600' : 'text-red-500'
                                  }`}>
                                    {pct(pb.success, pb.total)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recent posts with this hashtag */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{t.stats.recentPosts}</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {selectedHashtagData.posts
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .slice(0, 6)
                              .map(post => {
                                const meta = (PLATFORM_META as any)[post.platform] || {};
                                const isOk = post.status === 'COMPLETED';
                                return (
                                  <div key={post.id} className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs ${
                                    isOk ? 'bg-emerald-50 border-emerald-100' :
                                    post.status === 'FAILED' ? 'bg-red-50 border-red-100' :
                                    'bg-slate-50 border-slate-100'
                                  }`}>
                                    <span className="text-base flex-shrink-0">{meta.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-slate-700 line-clamp-1">{post.message}</p>
                                      <p className="text-slate-400 mt-0.5">
                                        {new Date(post.created_at).toLocaleString('vi', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${
                                      isOk ? 'bg-emerald-400' : post.status === 'FAILED' ? 'bg-red-400' : 'bg-amber-400'
                                    }`} />
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Post type split + Recent failures ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Source split */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h2 className="font-bold text-slate-800 text-sm mb-1">{t.stats.postTypeTitle}</h2>
                <p className="text-xs text-slate-400 mb-5">{t.stats.postTypeSub}</p>
                <div className="space-y-4">
                  {[
                    { label: t.stats.immediate,  value: immediate, color: 'bg-violet-500', pct: pct(immediate, total) },
                    { label: t.stats.scheduled,   value: scheduled, color: 'bg-indigo-500', pct: pct(scheduled, total) },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-600">{s.label}</span>
                        <span className="font-black text-slate-800">{t.stats.postsCountWithPercent(fmt(s.value), s.pct)}</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full ${s.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pie chart alternative */}
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={[
                        { name: t.stats.immediate, value: immediate },
                        { name: t.stats.scheduled,  value: scheduled },
                      ]} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#6366f1" />
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent failures */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-slate-800 text-sm">{t.stats.recentFailuresTitle}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{t.stats.recentFailuresSub}</p>
                  </div>
                  {failed > 0 && (
                    <Link href="/dashboard/social/history" className="text-xs text-blue-600 font-bold hover:underline">
                      {t.stats.viewAll}
                    </Link>
                  )}
                </div>
                {recentFailed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">{t.stats.noFailures}</p>
                    <p className="text-xs text-slate-400 mt-1">{t.stats.noFailuresSub}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentFailed.map(post => {
                      const meta = (PLATFORM_META as any)[post.platform] || {};
                      return (
                        <div key={post.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                          <div className={`w-8 h-8 ${meta.color} rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0`}>
                            {meta.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold text-slate-700">{meta.label}</span>
                              {post.account && <span className="text-[10px] text-slate-400">· {post.account.name}</span>}
                              <span className="ml-auto text-[10px] text-slate-400">
                                {new Date(post.created_at).toLocaleString('vi', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 truncate">{post.message}</p>
                            {post.error_msg && (
                              <p className="text-[10px] text-red-500 mt-0.5 truncate flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                {post.error_msg.length > 80 ? post.error_msg.slice(0, 80) + '…' : post.error_msg}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
