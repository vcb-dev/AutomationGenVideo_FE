'use client';

import { useEffect, useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import type { StylesConfig, MultiValue } from 'react-select';
import { UserRole } from '@/types/auth';
import { UserCog, Crown, X, Loader2, UserMinus } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  /** Có thể nhiều team, phân cách dấu phẩy (vd "Team A,Team B") — 1 người có thể ở nhiều team. */
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
  /** Nhiều team, phân cách dấu phẩy — backend tự suy ra team_leader_id từ Team/TeamMember. */
  team: string;
  manager_id: string;
}

export const EMPTY_FORM: FormData = {
  full_name: '', email: '', password: '',
  roles: [UserRole.MEMBER], team: '', manager_id: '',
};

// ─── Team multi-select ────────────────────────────────────────────────────────

interface TeamOption { value: string; label: string; }

const parseTeamNames = (s: string): string[] => s.split(',').map(t => t.trim()).filter(Boolean);
const joinTeamNames = (names: string[]): string => names.join(',');

const teamSelectStyles: StylesConfig<TeamOption, true> = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? '#3b82f6' : '#e5e7eb',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
    minHeight: '38px',
    fontSize: '0.875rem',
    '&:hover': { borderColor: '#d1d5db' },
  }),
  menu: (base) => ({ ...base, zIndex: 50, borderRadius: '0.75rem', overflow: 'hidden' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  multiValue: (base) => ({ ...base, borderRadius: '0.5rem', backgroundColor: '#eff6ff' }),
  multiValueLabel: (base) => ({ ...base, color: '#1e40af', fontSize: '0.8rem' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#dbeafe' : state.isFocused ? '#f3f4f6' : 'white',
    color: '#111827',
    fontSize: '0.875rem',
    cursor: 'pointer',
  }),
  placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
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
  /** Tên các Team từ bảng Team thật (GET /task-auto/teams) — nguồn chính cho options; team chưa có leader vẫn hiện. */
  teams?: string[];
  /** The logged-in LEADER's own team — when set, the team field locks to it instead of free text. */
  selfTeam?: string | null;
}

export function HRModal({ open, onClose, onSave, editing, callerRole, managers, leaders, teams, selfTeam }: ModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Một leader có thể quản lý nhiều team (l.team = "Team A,Team B") — tách ra để mỗi tên team
  // là 1 key riêng, leader đó xuất hiện dưới tất cả các team mình quản lý.
  const teamLeaderMap = leaders.reduce<Record<string, TeamMember[]>>((acc, l) => {
    for (const t of parseTeamNames(l.team ?? '')) {
      if (!acc[t]) acc[t] = [];
      acc[t].push(l);
    }
    return acc;
  }, {});

  // Hợp nhất: bảng Team thật (nguồn chính — gồm cả team chưa có leader) + team suy từ leaders
  // (phòng khi API teams chưa tải xong hoặc dữ liệu lệch).
  const existingTeams = [...new Set([...(teams ?? []), ...Object.keys(teamLeaderMap)])].sort();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        full_name: editing.full_name, email: editing.email, password: '',
        roles: editing.roles, team: editing.team ?? (callerRole === 'LEADER' ? (selfTeam ?? '') : ''),
        manager_id: editing.manager_id ?? '',
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
                onChange={e => {
                  const r = e.target.value as UserRole;
                  setForm(f => ({
                    ...f,
                    roles: [r],
                    manager_id: '',
                    // Rời role LEADER thì loại các team gõ tay chưa tồn tại (chỉ LEADER được tạo
                    // team mới) — nếu giữ lại, backend sẽ từ chối khi lưu.
                    team: r === UserRole.LEADER
                      ? f.team
                      : joinTeamNames(parseTeamNames(f.team).filter(t => existingTeams.includes(t))),
                  }));
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                {allowedRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Đội nhóm
                <span className="ml-1 text-gray-400 font-normal">(có thể chọn nhiều)</span>
              </label>
              <CreatableSelect<TeamOption, true>
                isMulti
                isDisabled={callerRole === 'LEADER'}
                value={parseTeamNames(form.team).map(t => ({ value: t, label: t }))}
                options={existingTeams.map(t => ({ value: t, label: t }))}
                onChange={(selected: MultiValue<TeamOption>) =>
                  setForm(f => ({ ...f, team: joinTeamNames((selected ?? []).map(o => o.value)) }))
                }
                formatOptionLabel={(opt: TeamOption, meta: { context: 'menu' | 'value' }) => {
                  if (meta.context === 'value') return opt.label;
                  const tl = teamLeaderMap[opt.value] ?? [];
                  return tl.length ? `${opt.value} (Leader: ${tl.map(l => l.full_name).join(', ')})` : opt.value;
                }}
                isValidNewOption={(input: string) =>
                  // Chỉ LEADER được tạo team mới; cấm dấu phẩy vì đó là ký tự phân cách multi-team.
                  form.roles[0] === UserRole.LEADER && input.trim() !== '' && !input.includes(',')
                }
                formatCreateLabel={(input: string) => `Tạo team mới "${input}"`}
                placeholder={form.roles[0] === UserRole.LEADER ? 'Chọn hoặc gõ để tạo team mới...' : 'Chọn team...'}
                noOptionsMessage={() => 'Chưa có team nào'}
                styles={teamSelectStyles}
                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                classNamePrefix="team-select"
              />
              {/* Leader can release their own member back to the shared "unassigned" pool (for
                  another leader to claim), but can't redirect them straight to a specific team —
                  that still requires a manager, hence the field above stays locked. */}
              {callerRole === 'LEADER' && isEdit && editing?.team && (
                <div className="mt-2">
                  {form.team ? (
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, team: '' }))}
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
                        onClick={() => setForm(f => ({ ...f, team: editing.team ?? '' }))}
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
