'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { ChevronRight, ChevronLeft, Edit2, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  TeamMember, FormData, RoleBadge, Avatar, SkeletonRows, HRModal, formatDate,
} from '../shared';

export default function UnassignedTeamPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [unassigned, setUnassigned] = useState<TeamMember[]>([]);
  const [managers, setManagers] = useState<TeamMember[]>([]);
  const [leaders, setLeaders] = useState<TeamMember[]>([]);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  // /users/unassigned is a shared pool (not scoped by team_leader_id), since a fresh
  // signup hasn't been claimed by anyone yet — any ADMIN/MANAGER/LEADER can see it.
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
      // MANAGER needs the full team/leader picker; LEADER's team field is locked, no need.
      // Fire requests concurrently instead of waiting on unassigned before starting team-members.
      const [unassignedRes, teamRes, teamsRes] = await Promise.all([
        fetch(`${apiBase}/users/unassigned`, { headers: { Authorization: `Bearer ${token}` } }),
        callerRole === 'MANAGER'
          ? fetch(`${apiBase}/users/team-members`, { headers: { Authorization: `Bearer ${token}` } })
          : Promise.resolve(null),
        callerRole === 'MANAGER'
          ? fetch(`${apiBase}/task-auto/teams`, { headers: { Authorization: `Bearer ${token}` } })
          : Promise.resolve(null),
      ]);
      if (!unassignedRes.ok) throw new Error('Không thể tải danh sách nhân sự');
      const data = await unassignedRes.json();
      setUnassigned(Array.isArray(data) ? data : []);

      if (teamRes) {
        const teamData = teamRes.ok ? await teamRes.json() : [];
        const all: TeamMember[] = Array.isArray(teamData) ? teamData : [];
        setManagers(all.filter(m => m.roles.some(r => r === UserRole.MANAGER || r === UserRole.ADMIN)));
        setLeaders(all.filter(m => m.roles.includes(UserRole.LEADER)));
      }
      if (teamsRes) {
        // Danh sách team từ bảng Team thật — team chưa có leader vẫn chọn được khi gán member.
        const teamsData = teamsRes.ok ? await teamsRes.json() : [];
        setTeamNames(Array.isArray(teamsData) ? teamsData.map((t: any) => String(t.name)) : []);
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [token, apiBase, callerRole]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleSave = async (formData: FormData) => {
    const payload: any = {
      full_name: formData.full_name, email: formData.email,
      // null (not undefined) so clearing the field in the form actually clears it server-side too.
      team: formData.team || null,
      manager_id: formData.manager_id || null,
    };
    // LEADER can't change roles — backend rejects the request outright if the field is even present.
    if (callerRole === 'MANAGER') payload.roles = formData.roles;
    const res = await fetch(`${apiBase}/users/${editing!.id}/hr`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message ?? 'Cập nhật thất bại');
    }
    const updated = await res.json();
    // Claiming always sets a team, so the member leaves this pool — drop them locally instead
    // of re-fetching the whole unassigned list. If team somehow stayed null (e.g. a manager
    // saved without picking one), just merge the response in so the row isn't stale.
    setUnassigned(prev => (
      updated.team
        ? prev.filter(m => m.id !== editing!.id)
        : prev.map(m => (m.id === editing!.id ? { ...m, ...updated } : m))
    ));
    toast.success('Đã gán team thành công');
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">

      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-1.5 text-sm mb-2">
          <Link href="/dashboard/hr-management" className="text-gray-500 hover:text-gray-700">Nhân sự</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-medium">Chưa phân team</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Nhân sự chưa phân team</h1>
          <Link href="/dashboard/hr-management"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-sm font-medium text-gray-700 rounded-xl transition">
            <ChevronLeft className="w-4 h-4" /> Quay lại
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-5 text-sm text-slate-500 uppercase tracking-wide font-semibold">Nhân sự</th>
                <th className="text-left px-5 py-5 text-sm text-slate-500 uppercase tracking-wide font-semibold">Vai trò</th>
                <th className="text-left px-5 py-5 text-sm text-slate-500 uppercase tracking-wide font-semibold">Ngày tham gia</th>
                <th className="text-left px-5 py-5 text-sm text-slate-500 uppercase tracking-wide font-semibold">Trạng thái</th>
                <th className="px-5 py-5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <SkeletonRows columns={5} />
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-red-500 text-base">{error}</td>
                </tr>
              ) : unassigned.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
                      <UserCog className="w-10 h-10 opacity-20" />
                      <span className="text-base">Tất cả nhân sự đã được phân team</span>
                    </div>
                  </td>
                </tr>
              ) : (
                unassigned.map(member => (
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
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditing(member); setModalOpen(true); }}
                          title="Gán team"
                          className="p-2 hover:bg-indigo-100 rounded-xl transition-colors text-indigo-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HRModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        onSave={handleSave} editing={editing}
        callerRole={callerRole} managers={managers} leaders={leaders}
        teams={teamNames}
        selfTeam={user?.team}
      />
    </div>
  );
}
