'use client';
import React, { useState, useMemo } from 'react';
import { Users, CheckCircle2, XCircle, Clock, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { MeetingSession, AttendanceStatus, AttendanceRecord, MeetingSessionResponse } from '../types';

interface AttendanceSectionProps {
  sessionData: MeetingSessionResponse | null | undefined;
  teamMembers: string[];         // Danh sách tên thành viên team
  activeTeam: string;            // K1 – K5
  currentUserId?: string;        // ID của user đang đăng nhập (từ auth context)
  currentUserName?: string;      // Tên user đang đăng nhập
  currentUserRoles?: string[];   // Quyền của user đang đăng nhập
  onSelfCheckIn?: (sessionId: string, status: AttendanceStatus, note?: string) => Promise<void>;
  onCreateSession?: (scheduledAt: string, title?: string, notes?: string) => Promise<void>;
  onBulkUpdate?: (sessionId: string, records: { user_id: string; status: AttendanceStatus; note?: string }[]) => Promise<void>;
  onFinalizeSession?: (sessionId: string) => Promise<void>;
  onReopenSession?: (sessionId: string) => Promise<void>;
}

// ─────────────────────────────────────────────
// Badge config
// ─────────────────────────────────────────────
const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  PRESENT:  { label: 'Có mặt',    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', icon: <CheckCircle2 className="w-3 h-3" /> },
  LATE:     { label: 'Đi trễ',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   icon: <Clock className="w-3 h-3" /> },
  ABSENT:   { label: 'Vắng',      color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/25',    icon: <XCircle className="w-3 h-3" /> },
  ON_LEAVE: { label: 'Nghỉ phép', color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/25',     icon: <Calendar className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// Self Check-in Modal
// ─────────────────────────────────────────────
function SelfCheckInModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (status: AttendanceStatus, note?: string) => Promise<void>;
  loading: boolean;
}) {
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('PRESENT');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (selectedStatus === 'ON_LEAVE' && !note.trim()) {
      setError('Vui lòng nhập lý do nghỉ phép');
      return;
    }
    setError('');
    await onSubmit(selectedStatus, note.trim() || undefined);
  };

  const statusOptions: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#0e1626] border border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Điểm danh của tôi</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Chọn trạng thái tham dự buổi họp</p>
          </div>
        </div>

        {/* Status selection */}
        <div className="grid grid-cols-2 gap-2.5">
          {statusOptions.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const isSelected = selectedStatus === s;
            return (
              <button
                key={s}
                onClick={() => { setSelectedStatus(s); setError(''); }}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all duration-200 ${
                  isSelected
                    ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm scale-[1.02]`
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span className={`shrink-0 ${isSelected ? cfg.color : ''}`}>{cfg.icon}</span>
                <span className="text-[11px] font-black">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Note input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Ghi chú{selectedStatus === 'ON_LEAVE' && <span className="text-rose-400 ml-1">*bắt buộc</span>}
          </label>
          <textarea
            value={note}
            onChange={(e) => { setNote(e.target.value); setError(''); }}
            placeholder={selectedStatus === 'ON_LEAVE' ? 'Nhập lý do nghỉ phép...' : 'Ghi chú thêm (không bắt buộc)'}
            rows={2}
            className="bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 rounded-xl px-3 py-2 text-[11px] text-white outline-none resize-none placeholder-slate-500 transition-colors"
          />
          {error && <p className="text-[10px] text-rose-400 font-bold">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-[11px] font-black text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] rounded-xl transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 text-[11px] font-black text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(37,99,235,0.3)]"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Member Row
// ─────────────────────────────────────────────
function MemberRow({ record, isCurrentUser }: { record: AttendanceRecord; isCurrentUser: boolean }) {
  const initials = record.user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`flex items-center gap-2.5 py-2 px-3 rounded-xl transition-all duration-200 ${isCurrentUser ? 'bg-blue-500/[0.05] border border-blue-500/15' : 'hover:bg-white/[0.02]'}`}>
      {/* Avatar */}
      {record.user.image_url ? (
        <img src={record.user.image_url} alt={record.user.full_name} className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border border-white/10 flex items-center justify-center text-[9px] font-black text-slate-300 shrink-0">
          {initials}
        </div>
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-black truncate ${isCurrentUser ? 'text-blue-300' : 'text-slate-200'}`}>
          {record.user.full_name}{isCurrentUser && <span className="text-[9px] text-blue-400 font-bold ml-1">(bạn)</span>}
        </p>
        {record.note && (
          <p className="text-[9px] text-slate-500 font-bold truncate mt-0.5">{record.note}</p>
        )}
      </div>

      {/* Badge */}
      <StatusBadge status={record.status} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Create Session Modal (for Manager/Leader/Admin)
// ─────────────────────────────────────────────
function CreateSessionModal({
  onClose,
  onSubmit,
  loading,
  activeTeam
}: {
  onClose: () => void;
  onSubmit: (scheduledAt: string, title?: string, notes?: string) => Promise<void>;
  loading: boolean;
  activeTeam: string;
}) {
  const [scheduledAtDate, setScheduledAtDate] = useState(() => {
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    return localToday.toISOString().slice(0, 16);
  });
  const [title, setTitle] = useState(`Họp tuần team ${activeTeam}`);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!scheduledAtDate) {
      setError('Vui lòng chọn thời gian họp');
      return;
    }
    setError('');
    
    const dateObj = new Date(scheduledAtDate);
    if (isNaN(dateObj.getTime())) {
      setError('Thời gian không hợp lệ');
      return;
    }

    await onSubmit(dateObj.toISOString(), title.trim() || undefined, notes.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0e1626] border border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 text-left">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Khởi tạo buổi họp</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Tạo buổi họp tuần cho Team {activeTeam}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tiêu đề buổi họp</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 rounded-xl px-3 py-2 text-[11px] text-white outline-none placeholder-slate-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Thời gian họp (ngày & giờ)</label>
          <input
            type="datetime-local"
            value={scheduledAtDate}
            onChange={(e) => setScheduledAtDate(e.target.value)}
            className="bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 rounded-xl px-3 py-2 text-[11px] text-white outline-none placeholder-slate-500 transition-colors [color-scheme:dark]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ghi chú cuộc họp</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nội dung, tài liệu chuẩn bị..."
            rows={2}
            className="bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 rounded-xl px-3 py-2 text-[11px] text-white outline-none resize-none placeholder-slate-500 transition-colors"
          />
        </div>

        {error && <p className="text-[10px] text-rose-400 font-bold">{error}</p>}

        <div className="flex gap-2.5 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-[11px] font-black text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] rounded-xl transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 text-[11px] font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(37,99,235,0.3)]"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Khởi tạo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Bulk Update Modal (for Manager/Leader/Admin)
// ─────────────────────────────────────────────
function BulkUpdateModal({
  onClose,
  onSubmit,
  loading,
  teamMembers,
  currentAttendances
}: {
  onClose: () => void;
  onSubmit: (records: { user_id: string; status: AttendanceStatus; note?: string }[]) => Promise<void>;
  loading: boolean;
  teamMembers: { id: string; full_name: string; image_url?: string | null }[];
  currentAttendances: AttendanceRecord[];
}) {
  const [records, setRecords] = useState<{ [userId: string]: { status: AttendanceStatus; note: string } }>(() => {
    const initial: { [userId: string]: { status: AttendanceStatus; note: string } } = {};
    teamMembers.forEach(member => {
      const existing = currentAttendances.find(a => a.user_id === member.id);
      initial[member.id] = {
        status: existing?.status ?? 'PRESENT',
        note: existing?.note ?? ''
      };
    });
    return initial;
  });

  const [error, setError] = useState('');

  const handleStatusChange = (userId: string, status: AttendanceStatus) => {
    setRecords(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        status,
        note: status === 'ON_LEAVE' ? prev[userId].note : ''
      }
    }));
  };

  const handleNoteChange = (userId: string, note: string) => {
    setRecords(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        note
      }
    }));
  };

  const handleSubmit = async () => {
    let validationError = '';
    const payload: { user_id: string; status: AttendanceStatus; note?: string }[] = [];

    for (const member of teamMembers) {
      const rec = records[member.id];
      if (rec.status === 'ON_LEAVE' && !rec.note.trim()) {
        validationError = `Vui lòng nhập lý do nghỉ phép cho ${member.full_name}`;
        break;
      }
      payload.push({
        user_id: member.id,
        status: rec.status,
        note: rec.note.trim() || undefined
      });
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0e1626] border border-white/[0.08] rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] text-left gap-4">
        <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Điểm danh nhanh cả nhóm</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Cập nhật hàng loạt trạng thái của team</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[200px]">
          {teamMembers.map(member => {
            const state = records[member.id] || { status: 'PRESENT', note: '' };
            return (
              <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
                <div className="flex items-center gap-2.5 min-w-[140px]">
                  {member.image_url ? (
                    <img src={member.image_url} alt={member.full_name} className="w-7 h-7 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-300">
                      {member.full_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[11px] font-black text-slate-200 truncate">{member.full_name}</span>
                </div>

                <div className="flex flex-1 items-center gap-2">
                  <select
                    value={state.status}
                    onChange={(e) => handleStatusChange(member.id, e.target.value as AttendanceStatus)}
                    className="bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 rounded-xl px-2 py-1.5 text-[10px] text-slate-200 outline-none w-28 cursor-pointer select-none font-bold"
                  >
                    <option value="PRESENT">Có mặt</option>
                    <option value="LATE">Đi trễ</option>
                    <option value="ABSENT">Vắng</option>
                    <option value="ON_LEAVE">Nghỉ phép</option>
                  </select>

                  <input
                    type="text"
                    value={state.note}
                    onChange={(e) => handleNoteChange(member.id, e.target.value)}
                    placeholder={state.status === 'ON_LEAVE' ? 'Lý do xin nghỉ...' : 'Ghi chú (không bắt buộc)...'}
                    className={`flex-1 bg-slate-950/60 border rounded-xl px-3 py-1.5 text-[10px] text-white outline-none placeholder-slate-500 transition-colors ${
                      state.status === 'ON_LEAVE' 
                        ? 'border-sky-500/50 focus:border-sky-500' 
                        : 'border-white/[0.08] focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="text-[10px] text-rose-400 font-bold">{error}</p>}

        <div className="flex gap-2.5 border-t border-white/[0.05] pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-[11px] font-black text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] rounded-xl transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 text-[11px] font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(37,99,235,0.3)]"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Section
// ─────────────────────────────────────────────
export default function AttendanceSection({
  sessionData,
  teamMembers,
  activeTeam,
  currentUserId,
  currentUserName,
  currentUserRoles,
  onSelfCheckIn,
  onCreateSession,
  onBulkUpdate,
  onFinalizeSession,
  onReopenSession,
}: AttendanceSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [showAbsentList, setShowAbsentList] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const isManagement = currentUserRoles?.some((r) => ['ADMIN', 'MANAGER', 'LEADER'].includes(r));

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [reopenLoading, setReopenLoading] = useState(false);

  const handleCreateSession = async (scheduledAt: string, title?: string, notes?: string) => {
    if (!onCreateSession) return;
    setCreateLoading(true);
    try {
      await onCreateSession(scheduledAt, title, notes);
      setShowCreateModal(false);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleBulkUpdate = async (records: { user_id: string; status: AttendanceStatus; note?: string }[]) => {
    if (!onBulkUpdate || !sessionData?.session) return;
    setBulkLoading(true);
    try {
      await onBulkUpdate(sessionData.session.id, records);
      setShowBulkModal(false);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!onFinalizeSession || !sessionData?.session) return;
    setFinalizeLoading(true);
    try {
      await onFinalizeSession(sessionData.session.id);
    } finally {
      setFinalizeLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!onReopenSession || !sessionData?.session) return;
    setReopenLoading(true);
    try {
      await onReopenSession(sessionData.session.id);
    } finally {
      setReopenLoading(false);
    }
  };

  const canReopen = useMemo(() => {
    const session = sessionData?.session;
    if (!currentUserRoles || !session || !session.is_finalized) return false;
    if (currentUserRoles.includes('ADMIN')) return true;
    if (currentUserRoles.some((r) => ['MANAGER', 'LEADER'].includes(r))) {
      if (!session.finalized_at) return false;
      const finalizedDate = new Date(session.finalized_at);
      const currentDate = new Date();
      return (
        finalizedDate.getFullYear() === currentDate.getFullYear() &&
        finalizedDate.getMonth() === currentDate.getMonth() &&
        finalizedDate.getDate() === currentDate.getDate()
      );
    }
    return false;
  }, [currentUserRoles, sessionData]);

  // Phân loại bản ghi điểm danh
  const { presentRecords, absentRecords, unrecordedMembers, myRecord } = useMemo((): {
    presentRecords: AttendanceRecord[];
    absentRecords: AttendanceRecord[];
    unrecordedMembers: string[];
    myRecord: AttendanceRecord | null;
  } => {
    const session = sessionData?.session;
    const dbMembers = sessionData?.teamMembers || [];

    if (!sessionData || !session) {
      return { presentRecords: [], absentRecords: [], unrecordedMembers: teamMembers, myRecord: null };
    }

    const attendances = session.attendances || [];
    const present: AttendanceRecord[] = [];
    const absent: AttendanceRecord[] = [];
    let myRec: AttendanceRecord | null = null;

    attendances.forEach((r) => {
      if (currentUserId && r.user_id === currentUserId) myRec = r;
      if (r.status === 'PRESENT' || r.status === 'LATE') {
        present.push(r);
      } else {
        absent.push(r);
      }
    });

    const recordedUserIds = new Set(attendances.map((r) => r.user_id));
    
    let unrecorded: string[] = [];
    if (dbMembers.length > 0) {
      unrecorded = dbMembers
        .filter((m) => !recordedUserIds.has(m.id))
        .map((m) => m.full_name);
    } else {
      unrecorded = teamMembers.filter((name) => {
        return !attendances.some((r) => r.user.full_name === name);
      });
    }

    return { presentRecords: present, absentRecords: absent, unrecordedMembers: unrecorded, myRecord: myRec };
  }, [sessionData, teamMembers, currentUserId]);

  const session = sessionData?.session;
  const dbMembers = sessionData?.teamMembers || [];
  const totalAttendances = session?.attendances?.length ?? 0;
  const presentCount = presentRecords.length;
  const totalTeam = dbMembers.length || teamMembers.length || totalAttendances;
  const attendanceRate = totalTeam > 0 ? (presentCount / totalTeam) * 100 : 0;

  const handleSelfCheckIn = async (status: AttendanceStatus, note?: string) => {
    if (!onSelfCheckIn || !session) return;
    setCheckInLoading(true);
    try {
      await onSelfCheckIn(session.id, status, note);
      setShowModal(false);
    } finally {
      setCheckInLoading(false);
    }
  };

  // ── Hiển thị placeholder nếu chưa có session ──
  if (!sessionData || !session) {
    return (
      <>
        {showCreateModal && (
          <CreateSessionModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateSession}
            loading={createLoading}
            activeTeam={activeTeam}
          />
        )}
        <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-3 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300">
          <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
            <div className="p-2 bg-slate-700/30 border border-white/[0.06] rounded-xl text-slate-400">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider">
              Thống Kê Điểm Danh — Team {activeTeam}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 border border-white/[0.05] flex items-center justify-center mb-1">
              <Calendar className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-[12px] font-black text-slate-400">Chưa có buổi họp nào trong kỳ này</p>
              <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                {isManagement 
                  ? 'Bấm nút bên dưới để khởi tạo buổi họp và bắt đầu điểm danh' 
                  : 'Manager/Leader cần tạo buổi họp trước khi điểm danh'
                }
              </p>
            </div>
            {isManagement && onCreateSession && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-black px-5 py-2.5 rounded-xl transition-all duration-200 shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:scale-[1.02]"
              >
                Khởi tạo buổi họp
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  const scheduledAt = new Date(session.scheduled_at);
  const formattedTime = scheduledAt.toLocaleString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <>
      {showModal && (
        <SelfCheckInModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSelfCheckIn}
          loading={checkInLoading}
        />
      )}

      <div className="bg-[#0e1626]/50 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-5 shadow-xl backdrop-blur-xl hover:border-white/[0.08] transition-all duration-300">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.05] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider">
                Điểm Danh Buổi Họp — {activeTeam}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-500 font-bold">{formattedTime}</span>
              </div>
            </div>
          </div>

          {/* Self check-in & Bulk & Finalize buttons */}
          <div className="flex items-center gap-2.5">
            {!session.is_finalized && isManagement && onBulkUpdate && dbMembers.length > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1e293b]/60 border border-white/[0.08] hover:border-blue-500 rounded-xl text-[11px] font-black text-slate-300 hover:text-white transition-all shadow-sm"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Cập nhật cả nhóm
              </button>
            )}

            {!session.is_finalized && isManagement && onFinalizeSession && (
              <button
                onClick={handleFinalize}
                disabled={finalizeLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[11px] font-black transition-all duration-200 shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:scale-[1.02] disabled:opacity-50"
              >
                {finalizeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Chốt buổi họp'}
              </button>
            )}

            {onSelfCheckIn && (
              <button
                onClick={() => setShowModal(true)}
                disabled={session.is_finalized || checkInLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-200 shadow-sm ${
                  session.is_finalized
                    ? 'bg-slate-800/40 border border-white/[0.04] text-slate-500 cursor-not-allowed'
                    : myRecord
                    ? 'bg-white/[0.03] border border-white/[0.08] text-slate-300 hover:bg-white/[0.06]'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_18px_rgba(37,99,235,0.4)] hover:scale-[1.02]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {session.is_finalized
                  ? 'Đã chốt điểm danh'
                  : myRecord
                  ? `Đã điểm danh (${STATUS_CONFIG[myRecord.status].label})`
                  : 'Điểm danh của tôi'}
              </button>
            )}
          </div>
        </div>

        {/* Banner chốt điểm danh */}
        {session.is_finalized && (
          <div className="bg-amber-500/[0.03] border border-amber-500/15 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">ĐÃ CHỐT ĐIỂM DANH</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Được chốt lúc{' '}
                  {new Date(session.finalized_at!).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}{' '}
                  bởi {session.finalized_by?.full_name || 'Hệ thống'}
                </p>
              </div>
            </div>
            {canReopen && (
              <button
                onClick={handleReopen}
                disabled={reopenLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500 rounded-xl text-[10px] font-black text-rose-400 hover:text-white transition-all disabled:opacity-50"
              >
                {reopenLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                Mở lại buổi họp
              </button>
            )}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {/* Tổng có mặt */}
          <div className="bg-emerald-500/[0.05] border border-emerald-500/15 rounded-2xl p-3.5 flex flex-col gap-1 text-center">
            <span className="text-xl font-black text-emerald-400">{presentCount}</span>
            <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-wider">Có mặt</span>
          </div>

          {/* Vắng */}
          <div className="bg-rose-500/[0.05] border border-rose-500/15 rounded-2xl p-3.5 flex flex-col gap-1 text-center">
            <span className="text-xl font-black text-rose-400">{absentRecords.length}</span>
            <span className="text-[9px] font-black text-rose-500/80 uppercase tracking-wider">Vắng</span>
          </div>

          {/* Tỷ lệ */}
          <div className="bg-indigo-500/[0.05] border border-indigo-500/15 rounded-2xl p-3.5 flex flex-col gap-1 text-center">
            <span className="text-xl font-black text-indigo-400">{attendanceRate.toFixed(0)}%</span>
            <span className="text-[9px] font-black text-indigo-500/80 uppercase tracking-wider">Tỷ lệ</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tỷ lệ có mặt</span>
            <span className="text-[10px] font-bold text-slate-400">{presentCount}/{totalTeam} thành viên</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/[0.04]">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(attendanceRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Two-column attendance lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CÓ MẶT */}
          <div className="bg-[#0b111e]/40 border border-emerald-500/10 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 mb-1">
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Có mặt ({presentCount})
              </span>
            </div>
            {presentRecords.length === 0 ? (
              <p className="text-[10px] text-slate-600 font-bold text-center py-3">Chưa có ai điểm danh</p>
            ) : (
              <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {presentRecords.map((r) => (
                  <MemberRow key={r.id} record={r} isCurrentUser={currentUserId === r.user_id} />
                ))}
              </div>
            )}
          </div>

          {/* VẮNG MẶT */}
          <div className="bg-[#0b111e]/40 border border-rose-500/10 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 mb-1">
              <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                Vắng / Chưa điểm danh ({absentRecords.length + unrecordedMembers.length})
              </span>
              {unrecordedMembers.length > 0 && (
                <button
                  onClick={() => setShowAbsentList(!showAbsentList)}
                  className="text-[9px] text-slate-500 hover:text-slate-300 font-black flex items-center gap-0.5 transition-colors"
                >
                  {showAbsentList ? 'Ẩn' : 'Xem thêm'}
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showAbsentList ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Absent records (đã điểm danh vắng) */}
            {absentRecords.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {absentRecords.map((r) => (
                  <MemberRow key={r.id} record={r} isCurrentUser={currentUserId === r.user_id} />
                ))}
              </div>
            )}

            {/* Unrecorded members (chưa điểm danh gì cả) */}
            {showAbsentList && unrecordedMembers.length > 0 && (
              <div className="flex flex-col gap-0.5 border-t border-white/[0.04] pt-2 mt-1">
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-wider mb-1">Chưa điểm danh:</p>
                {unrecordedMembers.map((name) => (
                  <div key={name} className="flex items-center gap-2.5 py-1.5 px-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                    <div className="w-7 h-7 rounded-full bg-slate-800/50 border border-white/[0.06] flex items-center justify-center text-[9px] font-black text-slate-500 shrink-0">
                      {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 flex-1 truncate">{name}</span>
                    <span className="text-[9px] font-black text-slate-600 bg-slate-800/50 border border-white/[0.05] px-1.5 py-0.5 rounded-full">Chưa điểm</span>
                  </div>
                ))}
              </div>
            )}

            {absentRecords.length === 0 && !showAbsentList && unrecordedMembers.length === 0 && (
              <p className="text-[10px] text-slate-600 font-bold text-center py-3">Không có ai vắng mặt 🎉</p>
            )}

            {absentRecords.length === 0 && !showAbsentList && unrecordedMembers.length > 0 && (
              <p className="text-[10px] text-slate-600 font-bold text-center py-3">
                {unrecordedMembers.length} thành viên chưa điểm danh
              </p>
            )}
          </div>
        </div>

        {/* Session notes */}
        {session?.notes && (
          <div className="bg-slate-900/30 border border-white/[0.05] rounded-2xl p-3.5 flex gap-2.5">
            <div className="text-slate-500 shrink-0 mt-0.5">📋</div>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{session.notes}</p>
          </div>
        )}
      </div>

      {showBulkModal && (
        <BulkUpdateModal
          onClose={() => setShowBulkModal(false)}
          onSubmit={handleBulkUpdate}
          loading={bulkLoading}
          teamMembers={dbMembers}
          currentAttendances={session?.attendances || []}
        />
      )}
    </>
  );
}
