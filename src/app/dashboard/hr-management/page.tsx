'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import {
  UserCog, Plus, Search, Edit2, Bell,
  Users, UserCheck, UserX, Crown, ChevronLeft, ChevronRight,
  X, Loader2, TrendingUp, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  team: string | null;
  manager_id: string | null;
  team_leader_id: string | null;
  is_active: boolean;
  image_url: string | null;
  employee_id: string | null;
  employee_position: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  full_name: string;
  email: string;
  password: string;
  roles: UserRole[];
  team: string;
  manager_id: string;
  team_leader_id: string;
}

const EMPTY_FORM: FormData = {
  full_name: '', email: '', password: '',
  roles: [UserRole.MEMBER], team: '', manager_id: '', team_leader_id: '',
};

const STATUS_TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'active', label: 'Hoạt động' },
  { key: 'inactive', label: 'Không hoạt động' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS_VI: Record<string, string> = {
  ADMIN: 'Quản trị', MANAGER: 'Quản lý', LEADER: 'Trưởng nhóm', MEMBER: 'Thành viên',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', MANAGER: 'Manager', LEADER: 'Leader', MEMBER: 'Member',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN:   'bg-red-50 text-red-600 border border-red-200',
  MANAGER: 'bg-purple-50 text-purple-600 border border-purple-200',
  LEADER:  'bg-blue-50 text-blue-600 border border-blue-200',
  MEMBER:  'bg-emerald-50 text-emerald-600 border border-emerald-200',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-500'}`}>
      {role === 'LEADER' && <Crown className="w-2.5 h-2.5" />}
      {ROLE_LABELS_VI[role] ?? role}
    </span>
  );
}

function Avatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const initials = name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
  const COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500'];
  const color = COLORS[(name.charCodeAt(0) ?? 0) % COLORS.length];
  if (imageUrl) return <img src={imageUrl} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

function getCurrentQuarter() {
  const q = Math.floor(new Date().getMonth() / 3) + 1;
  const labels = ['I', 'II', 'III', 'IV'];
  return `Quý ${labels[q - 1]}/${new Date().getFullYear()}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {[200, '80%', '60%', '70%', '50%', '60%', 24].map((w, j) => (
            <td key={j} className="px-5 py-5">
              <div className="h-5 bg-gray-100 rounded animate-pulse" style={{ width: typeof w === 'number' ? w : w }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, iconBg,
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; iconBg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
  editing: TeamMember | null;
  callerRole: 'MANAGER' | 'LEADER';
  managers: TeamMember[];
  leaders: TeamMember[];
}

function HRModal({ open, onClose, onSave, editing, callerRole, managers, leaders }: ModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamLeaderMap = leaders.reduce<Record<string, TeamMember[]>>((acc, l) => {
    const t = l.team ?? '';
    if (!acc[t]) acc[t] = [];
    acc[t].push(l);
    return acc;
  }, {});

  const existingTeams = Object.keys(teamLeaderMap).filter(Boolean).sort();
  const filteredLeaders = form.team && teamLeaderMap[form.team] ? teamLeaderMap[form.team] : leaders;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        full_name: editing.full_name, email: editing.email, password: '',
        roles: editing.roles, team: editing.team ?? '',
        manager_id: editing.manager_id ?? '', team_leader_id: editing.team_leader_id ?? '',
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setError(null);
  }, [open, editing]);

  const allowedRoles: UserRole[] = callerRole === 'MANAGER'
    ? [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER, UserRole.MEMBER]
    : [UserRole.MEMBER];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err: any) { setError(err.message ?? 'Có lỗi xảy ra'); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  const isEdit = !!editing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Chỉnh sửa nhân sự' : 'Thêm nhân sự mới'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Họ và tên <span className="text-red-500">*</span></label>
              <input type="text" required value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className={isEdit ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" required disabled={isEdit} value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@vcb.com"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
            </div>

            {!isEdit && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                <input type="password" required minLength={8} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vai trò <span className="text-red-500">*</span></label>
              <select value={form.roles[0] ?? UserRole.MEMBER} disabled={callerRole === 'LEADER'}
                onChange={e => setForm(f => ({ ...f, roles: [e.target.value as UserRole], manager_id: '', team_leader_id: '' }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                {allowedRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Đội nhóm</label>
              {callerRole === 'MANAGER' && form.roles[0] === UserRole.MEMBER && existingTeams.length > 0 ? (
                <select value={form.team}
                  onChange={e => {
                    const t = e.target.value;
                    const tl = teamLeaderMap[t] ?? [];
                    setForm(f => ({ ...f, team: t, team_leader_id: tl.length === 1 ? tl[0].id : '' }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Chọn team —</option>
                  {existingTeams.map(t => {
                    const tl = teamLeaderMap[t] ?? [];
                    return <option key={t} value={t}>{t}{tl.length ? ` (Leader: ${tl.map(l => l.full_name).join(', ')})` : ''}</option>;
                  })}
                </select>
              ) : (
                <input type="text" value={form.team}
                  onChange={e => setForm(f => ({ ...f, team: e.target.value, team_leader_id: '' }))}
                  placeholder="VD: Global Thái Lan..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>
          </div>

          {callerRole === 'MANAGER' && form.roles[0] === UserRole.LEADER && managers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Manager phụ trách</label>
              <select value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Không chọn —</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>)}
              </select>
            </div>
          )}

          {callerRole === 'MANAGER' && form.roles[0] === UserRole.MEMBER && filteredLeaders.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Team Leader
                {form.team && teamLeaderMap[form.team] && (
                  <span className="ml-1 text-blue-500 font-normal">({teamLeaderMap[form.team].length} leader)</span>
                )}
              </label>
              <select value={form.team_leader_id} onChange={e => setForm(f => ({ ...f, team_leader_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Không chọn —</option>
                {filteredLeaders.map(l => <option key={l.id} value={l.id}>{l.full_name} ({l.email})</option>)}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Lưu thay đổi' : 'Thêm nhân sự'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HRManagementPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const callerRole: 'MANAGER' | 'LEADER' =
    (user?.roles?.includes(UserRole.ADMIN) || user?.roles?.includes(UserRole.MANAGER))
      ? 'MANAGER' : 'LEADER';

  useEffect(() => {
    if (!user) return;
    const allowed: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER];
    if (!user.roles?.some(r => allowed.includes(r))) router.push('/dashboard/ai');
  }, [user, router]);

  const fetchMembers = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${apiBase}/users/team-members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể tải danh sách nhân sự');
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [token, apiBase]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const managers = members.filter(m => m.roles.some(r => r === UserRole.MANAGER || r === UserRole.ADMIN));
  const leaders = members.filter(m => m.roles.includes(UserRole.LEADER));

  const filtered = members.filter(m => {
    if (search) {
      const q = search.toLowerCase();
      if (!m.full_name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    }
    if (filterStatus === 'active' && !m.is_active) return false;
    if (filterStatus === 'inactive' && m.is_active) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [search, filterStatus]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCount = members.length;
  const activeCount = members.filter(m => m.is_active).length;
  const activePercent = totalCount ? Math.round((activeCount / totalCount) * 100) : 0;

  const now = new Date();
  const cm = now.getMonth(); const cy = now.getFullYear();
  const newThisMonth = members.filter(m => {
    const d = new Date(m.created_at);
    return d.getMonth() === cm && d.getFullYear() === cy;
  }).length;

  const lm = cm === 0 ? 11 : cm - 1;
  const ly = cm === 0 ? cy - 1 : cy;
  const newLastMonth = members.filter(m => {
    const d = new Date(m.created_at);
    return d.getMonth() === lm && d.getFullYear() === ly;
  }).length;
  const newMemberPct = newLastMonth > 0
    ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
    : (newThisMonth > 0 ? 100 : 0);

  const growthRate = totalCount ? Math.round((newThisMonth / totalCount) * 100) : 0;

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (formData: FormData) => {
    const payload: any = {
      full_name: formData.full_name, email: formData.email,
      roles: formData.roles,
      team: formData.team || undefined,
      manager_id: formData.manager_id || undefined,
      team_leader_id: formData.team_leader_id || undefined,
    };
    if (!editing && formData.password) payload.password = formData.password;

    const res = await fetch(editing ? `${apiBase}/users/${editing.id}/hr` : `${apiBase}/users/hr`, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message ?? (editing ? 'Cập nhật thất bại' : 'Thêm thất bại'));
    }
    await fetchMembers();
  };

  const handleToggleActive = async (member: TeamMember) => {
    setActionLoading(member.id);
    try {
      const endpoint = member.is_active ? 'deactivate' : 'reactivate';
      const res = await fetch(`${apiBase}/users/${member.id}/${endpoint}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.message ?? 'Thao tác thất bại'); return; }
      await fetchMembers();
    } finally { setActionLoading(null); }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">

      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-sm mb-2">
            <span className="text-gray-500">VCB Portal</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-900 font-medium">Nhân sự</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý nhân sự</h1>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button className="relative p-2.5 rounded-xl hover:bg-white hover:shadow-sm text-gray-400 hover:text-gray-600 transition">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition shadow-sm shadow-blue-100">
            <Plus className="w-4 h-4" /> Thêm nhân sự
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5 text-blue-600" />}
            iconBg="bg-blue-50"
            label="Tổng nhân sự"
            value={totalCount}
            sub={newThisMonth > 0 ? `+${newThisMonth} tháng này` : 'Chưa có thêm tháng này'}
          />
          <StatCard
            icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-50"
            label="Đang hoạt động"
            value={activeCount}
            sub={`${activePercent}% tổng số`}
          />
          <StatCard
            icon={<UserPlus className="w-5 h-5 text-violet-600" />}
            iconBg="bg-violet-50"
            label="Mới tháng này"
            value={newThisMonth}
            sub={newMemberPct >= 0 ? `+${newMemberPct}% so với tháng trước` : `${newMemberPct}% so với tháng trước`}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
            iconBg="bg-amber-50"
            label="Tỷ lệ tăng trưởng"
            value={`${growthRate}%`}
            sub={getCurrentQuarter()}
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm nhân sự..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
        </div>

        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 shadow-sm p-1">
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${filterStatus === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-sm text-gray-500 font-medium">{filtered.length} kết quả</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-5 text-sm text-slate-500 uppercase tracking-wide font-semibold">Nhân sự</th>
                <th className="text-left px-5 py-5 text-sm text-slate-500 uppercase tracking-wide font-semibold">Vai trò</th>
                <th className="text-left px-5 py-5 text-sm text-slate-500 uppercase tracking-wide font-semibold">Đội nhóm</th>
                <th className="text-left px-5 py-5 text-sm text-slate-500 uppercase tracking-wide font-semibold">Liên hệ</th>
                <th className="text-left px-5 py-5 text-sm text-slate-500 uppercase tracking-wide font-semibold">Ngày tham gia</th>
                <th className="text-left px-5 py-5 text-sm text-slate-500 uppercase tracking-wide font-semibold">Trạng thái</th>
                <th className="px-5 py-5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <SkeletonRows />
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-red-500 text-base">{error}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
                      <UserCog className="w-10 h-10 opacity-20" />
                      <span className="text-base">Không tìm thấy nhân sự nào</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map(member => (
                  <tr
                    key={member.id}
                    className={`text-slate-700 hover:bg-indigo-50/30 transition-colors cursor-pointer group ${!member.is_active ? 'opacity-60' : ''}`}
                    onClick={() => { setEditing(member); setModalOpen(true); }}
                  >
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.full_name} imageUrl={member.image_url} />
                        <div>
                          <p className="font-semibold text-slate-800 text-base leading-tight">{member.full_name}</p>
                          <p className="text-sm text-slate-400 mt-0.5 leading-tight">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex flex-wrap gap-1">
                        {member.roles.map(r => <RoleBadge key={r} role={r} />)}
                      </div>
                    </td>
                    <td className="px-5 py-5 text-base text-slate-600">
                      {member.team ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-5 text-base text-slate-600">
                      {member.email}
                    </td>
                    <td className="px-5 py-5 text-base text-slate-600 whitespace-nowrap">
                      {formatDate(member.created_at)}
                    </td>
                    <td className="px-5 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${member.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {member.is_active ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td className="px-5 py-5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditing(member); setModalOpen(true); }}
                          title="Chỉnh sửa"
                          className="p-2 hover:bg-indigo-100 rounded-xl transition-colors text-indigo-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(member)}
                          disabled={actionLoading === member.id}
                          title={member.is_active ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                          className={`p-2 rounded-xl transition-colors disabled:opacity-50 ${member.is_active ? 'hover:bg-red-100 text-red-500' : 'hover:bg-emerald-100 text-emerald-600'}`}>
                          {actionLoading === member.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : member.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-5 border-t border-gray-100 bg-gray-50">
            <p className="text-base text-slate-500">
              Trang{' '}
              <span className="font-semibold text-slate-800">{page}</span>
              {' '}/{' '}{totalPages}
              {' '}·{' '}
              <span className="font-semibold text-slate-800">{filtered.length}</span> nhân sự
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-1.5 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Trước
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-1.5 transition-colors">
                Sau <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <HRModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        onSave={handleSave} editing={editing}
        callerRole={callerRole} managers={managers} leaders={leaders}
      />
    </div>
  );
}
