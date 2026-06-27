'use client';

import { useEffect, useState } from 'react';
import { UserRole } from '@/types/auth';
import { UserCog, Crown, X, Loader2, UserMinus } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamMember {
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

export interface FormData {
  full_name: string;
  email: string;
  password: string;
  roles: UserRole[];
  team: string;
  manager_id: string;
  team_leader_id: string;
}

export const EMPTY_FORM: FormData = {
  full_name: '', email: '', password: '',
  roles: [UserRole.MEMBER], team: '', manager_id: '', team_leader_id: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const ROLE_LABELS_VI: Record<string, string> = {
  ADMIN: 'Quản trị', MANAGER: 'Quản lý', LEADER: 'Trưởng nhóm', MEMBER: 'Thành viên',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', MANAGER: 'Manager', LEADER: 'Leader', MEMBER: 'Member',
};

export const ROLE_COLORS: Record<string, string> = {
  ADMIN:   'bg-red-50 text-red-600 border border-red-200',
  MANAGER: 'bg-purple-50 text-purple-600 border border-purple-200',
  LEADER:  'bg-blue-50 text-blue-600 border border-blue-200',
  MEMBER:  'bg-emerald-50 text-emerald-600 border border-emerald-200',
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-500'}`}>
      {role === 'LEADER' && <Crown className="w-2.5 h-2.5" />}
      {ROLE_LABELS_VI[role] ?? role}
    </span>
  );
}

export function Avatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const initials = name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
  const COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500'];
  // charCodeAt(0) on an empty string returns NaN, which `??` does not catch (only null/undefined do) —
  // use `||` so an empty name falls back to index 0 instead of an invalid `bg-undefined` class.
  const color = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
  if (imageUrl) return <img src={imageUrl} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function SkeletonRows({ columns = 7 }: { columns?: number }) {
  const widths = [200, '80%', '60%', '70%', '50%', '60%', 24].slice(0, columns);
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {widths.map((w, j) => (
            <td key={j} className="px-5 py-5">
              <div className="h-5 bg-gray-100 rounded animate-pulse" style={{ width: typeof w === 'number' ? w : w }} />
            </td>
          ))}
        </tr>
      ))}
    </>
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
  /** The logged-in LEADER's own team — when set, the team field locks to it instead of free text. */
  selfTeam?: string | null;
}

export function HRModal({ open, onClose, onSave, editing, callerRole, managers, leaders, selfTeam }: ModalProps) {
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
        roles: editing.roles, team: editing.team ?? (callerRole === 'LEADER' ? (selfTeam ?? '') : ''),
        manager_id: editing.manager_id ?? '', team_leader_id: editing.team_leader_id ?? '',
      });
    } else {
      setForm({ ...EMPTY_FORM, team: callerRole === 'LEADER' ? (selfTeam ?? '') : '' });
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
              {(callerRole === 'LEADER' || (callerRole === 'MANAGER' && form.roles[0] === UserRole.MEMBER)) && existingTeams.length > 0 ? (
                <select value={form.team}
                  onChange={e => {
                    const t = e.target.value;
                    const tl = teamLeaderMap[t] ?? [];
                    setForm(f => ({ ...f, team: t, team_leader_id: tl.length === 1 ? tl[0].id : '' }));
                  }}
                  disabled={callerRole === 'LEADER'}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                  <option value="">— Chọn team —</option>
                  {existingTeams.map(t => {
                    const tl = teamLeaderMap[t] ?? [];
                    return <option key={t} value={t}>{t}{tl.length ? ` (Leader: ${tl.map(l => l.full_name).join(', ')})` : ''}</option>;
                  })}
                </select>
              ) : (
                <input type="text" value={form.team}
                  onChange={e => setForm(f => ({ ...f, team: e.target.value, team_leader_id: '' }))}
                  disabled={callerRole === 'LEADER'}
                  placeholder="VD: Global Thái Lan..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
              )}
              {/* Leader can release their own member back to the shared "unassigned" pool (for
                  another leader to claim), but can't redirect them straight to a specific team —
                  that still requires a manager, hence the field above stays locked. */}
              {callerRole === 'LEADER' && isEdit && editing?.team && (
                <div className="mt-2">
                  {form.team ? (
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, team: '', team_leader_id: '' }))}
                      className="px-4 py-2 rounded-xl text-sm font-medium border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition flex items-center gap-2">
                      <UserMinus className="w-4 h-4" />
                      Thả về pool chung
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-700">
                      <span className="flex items-center gap-2 font-medium">
                        <UserMinus className="w-4 h-4" />
                        Sẽ thả về pool chung sau khi lưu
                      </span>
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, team: editing.team ?? '', team_leader_id: editing.team_leader_id ?? '' }))}
                        className="px-3 py-1 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-100 transition">
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
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
