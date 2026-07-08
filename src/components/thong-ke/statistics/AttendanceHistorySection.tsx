'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, CheckCircle2, XCircle, Clock, Calendar,
  Loader2, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Lock, HelpCircle, X, User,
  TrendingUp, BarChart3,
} from 'lucide-react';
import {
  AttendanceHistoryResponse,
  AttendanceHistoryMember,
  AttendanceHistorySession,
  AttendanceHistoryCellData,
  UserAttendanceHistoryResponse,
  AttendanceStatus,
} from '../types';
import { apiClient } from '../../../lib/api-client';

// ─────────────────────────────────────────────
// Status config (5 trạng thái bao gồm NO_RECORD)
// ─────────────────────────────────────────────
type CellStatus = AttendanceStatus | 'NO_RECORD';

interface StatusCfg {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

const STATUS_CFG: Record<CellStatus, StatusCfg> = {
  PRESENT:   { label: 'Có mặt',         shortLabel: 'Có mặt',   color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  LATE:      { label: 'Đi trễ',         shortLabel: 'Trễ',      color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   icon: <Clock className="w-3.5 h-3.5" /> },
  ABSENT:    { label: 'Vắng',           shortLabel: 'Vắng',     color: 'text-rose-400',    bg: 'bg-rose-500/15',    border: 'border-rose-500/30',    icon: <XCircle className="w-3.5 h-3.5" /> },
  ON_LEAVE:  { label: 'Nghỉ phép',      shortLabel: 'Phép',     color: 'text-sky-400',     bg: 'bg-sky-500/15',     border: 'border-sky-500/30',     icon: <Calendar className="w-3.5 h-3.5" /> },
  NO_RECORD: { label: 'Chưa điểm danh', shortLabel: 'Chưa ĐD',  color: 'text-slate-500',   bg: 'bg-slate-700/20',   border: 'border-slate-600/20',   icon: <HelpCircle className="w-3.5 h-3.5" /> },
};

function StatusCell({ cell, onClick }: { cell: AttendanceHistoryCellData | null; onClick?: () => void }) {
  const key: CellStatus = cell ? cell.status : 'NO_RECORD';
  const cfg = STATUS_CFG[key];
  return (
    <div
      onClick={onClick}
      title={cfg.label}
      className={`
        mx-auto w-8 h-8 flex items-center justify-center rounded-xl border
        ${cfg.bg} ${cfg.border} ${cfg.color}
        ${onClick ? 'cursor-pointer hover:scale-110 transition-transform duration-150' : ''}
      `}
    >
      {cfg.icon}
    </div>
  );
}

// ─────────────────────────────────────────────
// Cell Popover
// ─────────────────────────────────────────────
function CellPopover({
  cell, session, member, onClose,
}: {
  cell: AttendanceHistoryCellData | null;
  session: AttendanceHistorySession;
  member: AttendanceHistoryMember;
  onClose: () => void;
}) {
  const key: CellStatus = cell ? cell.status : 'NO_RECORD';
  const cfg = STATUS_CFG[key];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-[#0e1626] border border-white/[0.1] rounded-2xl p-5 w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${cfg.bg} ${cfg.border} ${cfg.color}`}>{cfg.icon}</div>
            <div>
              <p className="text-[11px] font-black text-white">{member.full_name}</p>
              <p className="text-[10px] text-slate-400">{session.week_label || session.title || 'Buổi họp'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black mb-4 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
          {cfg.icon} {cfg.label}
        </div>
        {cell ? (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Ngày họp</span>
              <span className="text-slate-200 font-bold">
                {new Date(session.scheduled_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {cell.note && (
              <div className="flex flex-col gap-0.5 text-[10px]">
                <span className="text-slate-400">Ghi chú</span>
                <p className="text-slate-200 bg-slate-800/50 rounded-lg px-2.5 py-1.5 leading-relaxed">{cell.note}</p>
              </div>
            )}
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Xác nhận bởi</span>
              <span className="text-slate-200 font-bold">{cell.marked_by.full_name}</span>
            </div>
            {session.is_finalized && (
              <div className="flex items-center gap-1 mt-1 text-[9px] text-amber-400 font-bold">
                <Lock className="w-3 h-3" /> Buổi họp đã được chốt
              </div>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 italic">Thành viên chưa điểm danh cho buổi họp này.</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Member Detail Modal (View 2)
// ─────────────────────────────────────────────
function MemberDetailModal({ data, onClose }: { data: UserAttendanceHistoryResponse; onClose: () => void }) {
  const { user, period, sessions, summary } = data;
  const statCards = [
    { displayLabel: 'Có mặt',  value: summary.present,   cfg: STATUS_CFG.PRESENT },
    { displayLabel: 'Đi trễ',  value: summary.late,       cfg: STATUS_CFG.LATE },
    { displayLabel: 'Nghỉ phép', value: summary.on_leave, cfg: STATUS_CFG.ON_LEAVE },
    { displayLabel: 'Vắng',    value: summary.absent,     cfg: STATUS_CFG.ABSENT },
    { displayLabel: 'Chưa ĐD', value: summary.no_record,  cfg: STATUS_CFG.NO_RECORD },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#0a0f1e] border border-white/[0.08] rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
            {user.image_url
              ? <img src={user.image_url} alt={user.full_name} className="w-full h-full object-cover" />
              : <User className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-white truncate">{user.full_name}</h3>
            <p className="text-[10px] text-slate-400 font-bold">Tháng {period.month}/{period.year}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Summary */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400 font-bold">Tỉ lệ chuyên cần</span>
                <span className={`text-sm font-black ${summary.attendance_rate >= 80 ? 'text-emerald-400' : summary.attendance_rate >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {summary.attendance_rate}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${summary.attendance_rate >= 80 ? 'bg-emerald-500' : summary.attendance_rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${summary.attendance_rate}%` }}
                />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-slate-400">Tổng buổi</p>
              <p className="text-sm font-black text-white">{summary.total_sessions}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {statCards.map((s) => (
              <div key={s.displayLabel} className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border ${s.cfg.bg} ${s.cfg.border}`}>
                <span className={`text-base font-black ${s.cfg.color}`}>{s.value}</span>
                <span className={`text-[8px] font-bold ${s.cfg.color} opacity-80`}>{s.cfg.shortLabel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-2.5">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Calendar className="w-8 h-8 text-slate-600" />
              <p className="text-[11px] text-slate-500 font-bold">Không có buổi họp nào trong tháng này</p>
            </div>
          ) : sessions.map((item, idx) => {
            const status: CellStatus = item.attendance ? item.attendance.status : 'NO_RECORD';
            const cfg = STATUS_CFG[status];
            return (
              <div key={item.session_id} className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div className={`w-2.5 h-2.5 rounded-full border-2 ${cfg.border} ${cfg.bg} flex-shrink-0`} />
                  {idx < sessions.length - 1 && <div className="w-px flex-1 bg-white/[0.05] mt-1" />}
                </div>
                <div className="flex-1 pb-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-white truncate">{item.week_label || item.title || 'Buổi họp'}</p>
                      <p className="text-[9px] text-slate-500 font-bold mt-0.5">
                        {new Date(item.scheduled_at).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                        {' · '}{item.team.name}
                      </p>
                    </div>
                    <div className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                      {cfg.icon} {cfg.shortLabel}
                    </div>
                  </div>
                  {item.attendance?.note && (
                    <p className="text-[9px] text-slate-400 mt-1 italic">"{item.attendance.note}"</p>
                  )}
                  {item.attendance && (
                    <p className="text-[9px] text-slate-600 mt-0.5">Xác nhận bởi: {item.attendance.marked_by.full_name}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
interface AttendanceHistorySectionProps {
  activeTeam: string;
  teamsList: string[];
  onTeamChange: (team: string) => void;
  currentUserId?: string;
  currentUserRoles?: string[];
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function AttendanceHistorySection({
  activeTeam, teamsList, onTeamChange, currentUserId, currentUserRoles, showToast,
}: AttendanceHistorySectionProps) {
  // Local team state: decoupled from global activeTab to prevent full-page
  // unmount/remount (which destroys attendanceView state in parent).
  // Only syncs when the PARENT changes activeTeam (e.g. via main team tabs).
  const [localTeam, setLocalTeam] = useState(activeTeam);
  useEffect(() => { setLocalTeam(activeTeam); }, [activeTeam]);
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState(now.getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | null>('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<AttendanceHistoryResponse | null>(null);

  const [popoverTarget, setPopoverTarget] = useState<{
    cell: AttendanceHistoryCellData | null;
    session: AttendanceHistorySession;
    member: AttendanceHistoryMember;
  } | null>(null);

  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [memberDetail, setMemberDetail] = useState<UserAttendanceHistoryResponse | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!localTeam) return;
    setLoading(true);
    setError(null);
    setHistoryData(null);
    try {
      const res = await apiClient.get(
        `/content-report/attendance/history?team=${localTeam}&month=${historyMonth}&year=${historyYear}`
      );
      setHistoryData(res.data);
      setSelectedWeekIdx(0);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải lịch sử điểm danh';
      setError(msg);
      if (showToast) showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [localTeam, historyMonth, historyYear, showToast]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const fetchMemberDetail = useCallback(async (userId: string) => {
    setMemberDetailLoading(true);
    try {
      const res = await apiClient.get(
        `/content-report/attendance/history/${userId}?month=${historyMonth}&year=${historyYear}`
      );
      setMemberDetail(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải chi tiết';
      if (showToast) {
        showToast(msg, 'error');
      } else {
        console.error(msg);
      }
    } finally {
      setMemberDetailLoading(false);
    }
  }, [historyMonth, historyYear, showToast]);

  const visibleSessions = useMemo(() => {
    if (!historyData) return [];
    if (viewMode === 'month') return historyData.sessions;
    if (historyData.sessions.length === 0) return [];
    return [historyData.sessions[Math.min(selectedWeekIdx, historyData.sessions.length - 1)]];
  }, [historyData, viewMode, selectedWeekIdx]);

  const sortedMembers = useMemo(() => {
    if (!historyData) return [];
    const members = [...historyData.members];
    if (sortOrder === 'desc') members.sort((a, b) => b.summary.attendance_rate - a.summary.attendance_rate);
    else if (sortOrder === 'asc') members.sort((a, b) => a.summary.attendance_rate - b.summary.attendance_rate);
    return members;
  }, [historyData, sortOrder]);

  const teamOverallStats = useMemo(() => {
    if (!historyData || historyData.members.length === 0) return null;
    const total = historyData.members.length;
    const avgRate = Math.round(historyData.members.reduce((acc, m) => acc + m.summary.attendance_rate, 0) / total);
    return { total, avgRate, totalSessions: historyData.sessions.length };
  }, [historyData]);

  const handleSortToggle = () => setSortOrder((p) => p === 'desc' ? 'asc' : p === 'asc' ? null : 'desc');
  const SortIcon = sortOrder === 'desc' ? ArrowDown : sortOrder === 'asc' ? ArrowUp : ArrowUpDown;

  const yearOptions = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="flex flex-col gap-5">
      {/* ─── Header & Filters ─── */}
      <div className="bg-[#0e1626]/50 border border-white/[0.06] rounded-3xl p-5 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[13px] font-black text-white">Lịch sử Điểm Danh</h3>
                <p className="text-[10px] text-slate-400 font-bold">Bảng chuyên cần cả team theo tháng • click ô để xem chi tiết</p>
              </div>
            </div>
            {teamOverallStats && (
              <div className="text-right">
                <p className={`text-lg font-black ${teamOverallStats.avgRate >= 80 ? 'text-emerald-400' : teamOverallStats.avgRate >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {teamOverallStats.avgRate}%
                </p>
                <p className="text-[9px] text-slate-500 font-bold">TB chuyên cần</p>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Team tabs */}
            <div className="flex items-center gap-1 bg-slate-900/50 rounded-xl p-1 border border-white/[0.05]">
              {teamsList.map((t) => (
                <button key={t} onClick={() => setLocalTeam(t)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all duration-200 ${localTeam === t ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Month + Year */}
            <select value={historyMonth} onChange={(e) => setHistoryMonth(Number(e.target.value))}
              className="bg-slate-900/60 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-[10px] text-slate-200 outline-none font-bold cursor-pointer">
              {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
            <select value={historyYear} onChange={(e) => setHistoryYear(Number(e.target.value))}
              className="bg-slate-900/60 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-[10px] text-slate-200 outline-none font-bold cursor-pointer">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Month/Week toggle */}
            <div className="flex items-center gap-0.5 bg-slate-900/50 rounded-xl p-0.5 border border-white/[0.05] ml-auto">
              {(['month', 'week'] as const).map((mode) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all duration-200 ${viewMode === mode ? 'bg-indigo-500/80 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                  {mode === 'month' ? 'Theo Tháng' : 'Theo Tuần'}
                </button>
              ))}
            </div>
          </div>

          {/* Week navigator */}
          {viewMode === 'week' && historyData && historyData.sessions.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedWeekIdx((i) => Math.max(0, i - 1))} disabled={selectedWeekIdx === 0}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-black text-white">
                {historyData.sessions[selectedWeekIdx]?.week_label || historyData.sessions[selectedWeekIdx]?.title || `Tuần ${selectedWeekIdx + 1}`}
              </span>
              <button onClick={() => setSelectedWeekIdx((i) => Math.min(historyData.sessions.length - 1, i + 1))} disabled={selectedWeekIdx >= historyData.sessions.length - 1}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-[9px] text-slate-500 font-bold ml-1">{selectedWeekIdx + 1} / {historyData.sessions.length} buổi</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Legend ─── */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {(Object.entries(STATUS_CFG) as [CellStatus, StatusCfg][]).map(([key, cfg]) => (
          <div key={key} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            {cfg.icon} {cfg.label}
          </div>
        ))}
      </div>

      {/* ─── States ─── */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 bg-[#0e1626]/30 rounded-3xl border border-white/[0.05]">
          <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
          <p className="text-[11px] text-slate-400 font-bold">Đang tải lịch sử điểm danh...</p>
        </div>
      )}
      {!loading && error && (
        <div className="flex flex-col items-center gap-2 py-12 bg-rose-900/10 rounded-3xl border border-rose-500/20">
          <AlertTriangle className="w-6 h-6 text-rose-400" />
          <p className="text-[11px] text-rose-300 font-bold">{error}</p>
        </div>
      )}
      {!loading && !error && historyData && historyData.sessions.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 bg-[#0e1626]/30 rounded-3xl border border-white/[0.05]">
          <Calendar className="w-8 h-8 text-slate-600" />
          <p className="text-[12px] font-black text-slate-400">Chưa có buổi họp nào</p>
          <p className="text-[10px] text-slate-500 font-bold">Team {activeTeam} chưa tạo buổi họp nào trong Tháng {historyMonth}/{historyYear}</p>
        </div>
      )}

      {/* ─── Matrix Table ─── */}
      {!loading && !error && historyData && historyData.sessions.length > 0 && (
        <div className="bg-[#0e1626]/50 border border-white/[0.06] rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: `${240 + visibleSessions.length * 100}px` }}>
              {/* ── HEADER ── */}
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="sticky left-0 z-20 bg-[#0a0f1e] px-4 py-3 text-left min-w-[220px]" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Thành viên</span>
                      <button onClick={handleSortToggle} title="Sắp xếp theo % chuyên cần"
                        className={`ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-black transition-all ${sortOrder ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                        <SortIcon className="w-3 h-3" /> {sortOrder ? '% CC' : 'Sắp xếp'}
                      </button>
                    </div>
                  </th>
                  {visibleSessions.map((session) => (
                    <th key={session.id} className="bg-[#0a0f1e] px-2 py-3 text-center min-w-[90px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-black text-slate-300 leading-tight">{session.week_label || session.title || 'Buổi họp'}</span>
                        <span className="text-[8px] text-slate-500 font-bold">{new Date(session.scheduled_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                        {session.is_finalized && (
                          <span className="inline-flex items-center gap-0.5 text-[7px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5">
                            <Lock className="w-2 h-2" /> Chốt
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="bg-[#0a0f1e] px-3 py-3 text-center min-w-[110px]" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng kết</span>
                    </div>
                  </th>
                </tr>
              </thead>

              {/* ── BODY ── */}
              <tbody>
                {sortedMembers.map((member, rowIdx) => {
                  const rate = member.summary.attendance_rate;
                  const rateColor = rate >= 80 ? 'text-emerald-400' : rate >= 60 ? 'text-amber-400' : 'text-rose-400';
                  const barColor = rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                  return (
                    <tr key={member.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${rowIdx % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                      {/* Sticky name cell */}
                      <td className="sticky left-0 z-10 bg-[#0a0f1e] px-4 py-3" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                        <button onClick={() => fetchMemberDetail(member.id)} className="flex items-center gap-2 group text-left w-full">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/[0.08] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {member.image_url
                              ? <img src={member.image_url} alt={member.full_name} className="w-full h-full object-cover" />
                              : <User className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
                          <span className="text-[11px] font-black text-slate-200 group-hover:text-white truncate max-w-[140px] transition-colors">
                            {member.full_name}
                          </span>
                        </button>
                      </td>
                      {/* Attendance cells */}
                      {visibleSessions.map((session) => {
                        const cell = member.attendance_map[session.id];
                        return (
                          <td key={session.id} className="px-2 py-2.5 text-center">
                            <StatusCell cell={cell !== undefined ? cell : null} onClick={() => setPopoverTarget({ cell: cell ?? null, session, member })} />
                          </td>
                        );
                      })}
                      {/* Summary cell */}
                      <td className="px-3 py-2.5 text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[13px] font-black ${rateColor}`}>{rate}%</span>
                          <span className="text-[8px] text-slate-500 font-bold">{member.summary.present + member.summary.late}/{member.summary.total_sessions} buổi</span>
                          <div className="w-14 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ── FOOTER ── */}
              <tfoot>
                <tr className="border-t border-white/[0.08] bg-[#070b14]">
                  <td className="sticky left-0 z-10 bg-[#070b14] px-4 py-2.5" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">% Cả Team</span>
                  </td>
                  {visibleSessions.map((session) => {
                    const ss = historyData.session_summaries[session.id];
                    if (!ss) return <td key={session.id} className="px-2 py-2.5 text-center"><span className="text-[10px] text-slate-600">—</span></td>;
                    const rColor = ss.rate >= 80 ? 'text-emerald-400' : ss.rate >= 60 ? 'text-amber-400' : 'text-rose-400';
                    return <td key={session.id} className="px-2 py-2.5 text-center"><span className={`text-[11px] font-black ${rColor}`}>{ss.rate}%</span></td>;
                  })}
                  <td className="px-3 py-2.5 text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                    {teamOverallStats && (
                      <span className={`text-[11px] font-black ${teamOverallStats.avgRate >= 80 ? 'text-emerald-400' : teamOverallStats.avgRate >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {teamOverallStats.avgRate}% TB
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── Popover ─── */}
      {popoverTarget && (
        <CellPopover cell={popoverTarget.cell} session={popoverTarget.session} member={popoverTarget.member} onClose={() => setPopoverTarget(null)} />
      )}

      {/* ─── Member detail loading ─── */}
      {memberDetailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-[11px] text-slate-300 font-bold">Đang tải chi tiết...</p>
          </div>
        </div>
      )}

      {/* ─── Member detail modal ─── */}
      {memberDetail && !memberDetailLoading && (
        <MemberDetailModal data={memberDetail} onClose={() => setMemberDetail(null)} />
      )}
    </div>
  );
}

