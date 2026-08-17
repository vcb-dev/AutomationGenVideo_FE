'use client';

import { useMemo, useState } from 'react';
import { UserPlus, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import { apiErrorMessage } from '@/lib/lucky-spin/api';
import { isImportError, parseMemberRows } from '@/lib/lucky-spin/import-rows';
import { keepSelected } from '@/lib/lucky-spin/selection';
import { SheetRow } from '@/lib/lucky-spin/sheet-io';
import { memberImportConfirm } from '@/lib/lucky-spin/import-confirm';
import { Member } from '@/types/lucky-spin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { BulkImportPanel } from '@/components/lucky-spin/BulkImportPanel';
import { EmptyRow } from '@/components/lucky-spin/EmptyRow';
import { PanelCard } from '@/components/lucky-spin/PanelCard';
import { RowActionButton } from '@/components/lucky-spin/RowActionButton';
import { TeamTag } from '@/components/lucky-spin/TeamTag';
import { useConfirmDialog } from '@/components/lucky-spin/useConfirmDialog';
import { inputClass, monoCellClass, selectClass, tdClass, thClass, trClass } from '@/components/lucky-spin/styles';

const ALL_TEAMS = '__all__';

export function MembersTab({ store }: { store: LuckySpinStore }) {
  const { state, actions, winCountFor, giftCountFor } = store;
  const [newTeamName, setNewTeamName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAvatarUrl, setNewMemberAvatarUrl] = useState('');
  const [newMemberTeamId, setNewMemberTeamId] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterTeam, setFilterTeam] = useState(ALL_TEAMS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', teamId: '', avatarUrl: '' });
  const { confirm, dialog } = useConfirmDialog();

  const teamIds = state.teams.map((t) => t.id);
  // Team vừa chọn có thể vừa bị xóa ngay bên trên; giữ id đã chết sẽ tạo thành viên mồ côi.
  const selectedTeamId = keepSelected(newMemberTeamId, teamIds, state.teams[0]?.id ?? '');
  const activeFilterTeam = keepSelected(filterTeam, [ALL_TEAMS, ...teamIds], ALL_TEAMS);

  const addTeam = async () => {
    const name = newTeamName.trim();
    if (!name) {
      toast.error('Nhập tên team.');
      return;
    }
    try {
      await actions.addTeam(name);
      setNewTeamName('');
      toast.success('Đã thêm team.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không thêm được team.'));
    }
  };

  const removeTeam = async (id: string) => {
    const team = state.teams.find((t) => t.id === id);
    const ok = await confirm({
      title: `Xóa team "${team?.name ?? ''}"?`,
      description: 'Team sẽ bị xóa khỏi vòng quay của cả công ty. Lịch sử trúng thưởng đã ghi vẫn được giữ nguyên.',
      confirmLabel: 'Xóa team',
      danger: true,
    });
    if (!ok) return;
    try {
      await actions.removeTeam(id);
    } catch (err) {
      // Server là nơi chặn xóa team còn thành viên, kể cả khi màn hình đang xem dữ liệu cũ.
      toast.error(apiErrorMessage(err, 'Không xóa được team.'));
    }
  };

  const addMember = async () => {
    const name = newMemberName.trim();
    if (!name) {
      toast.error('Nhập tên thành viên.');
      return;
    }
    if (state.teams.length === 0) {
      toast.error('Thêm ít nhất một team trước khi thêm thành viên.');
      return;
    }
    try {
      await actions.addMember(name, selectedTeamId, newMemberAvatarUrl.trim() || undefined);
      setNewMemberName('');
      setNewMemberAvatarUrl('');
      toast.success('Đã thêm thành viên.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không thêm được thành viên.'));
    }
  };

  const importRows = async (rows: SheetRow[]) => {
    const parsed = parseMemberRows(rows);
    if (isImportError(parsed)) {
      toast.error(parsed.error);
      return;
    }
    if (parsed.rows.length === 0) {
      toast.error('Không có dòng nào hợp lệ để nhập.');
      return;
    }

    // Nhập là THAY danh sách, không cộng dồn — hỏi lại trước khi xoá. Bỏ qua bước hỏi khi
    // chưa có ai trong danh sách: lần nhập đầu không có gì để mất.
    const canHoi = memberImportConfirm(
      { members: state.members.length, teams: state.teams.length },
      parsed.rows.length,
    );
    if (canHoi && !(await confirm(canHoi))) return;

    try {
      const res = await actions.bulkAddMembers(parsed.rows);
      const { createdMembers, createdTeams, deletedMembers } = (res as any).data;

      const parts = [`Đã nhập ${createdMembers} thành viên`];
      if (createdTeams > 0) parts.push(`tạo mới ${createdTeams} team`);
      if (deletedMembers > 0) parts.push(`thay cho ${deletedMembers} thành viên cũ`);
      if (parsed.skipped > 0) parts.push(`bỏ qua ${parsed.skipped} dòng thiếu dữ liệu`);
      toast.success(parts.join(', ') + '.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không nhập được danh sách.'));
    }
  };

  const startEdit = (member: Member) => {
    if (state.teams.length === 0) {
      toast.error('Chưa có team nào để chọn.');
      return;
    }
    setEditingId(member.id);
    setDraft({ name: member.name, teamId: member.teamId, avatarUrl: member.avatarUrl ?? '' });
  };

  const saveEdit = async (id: string) => {
    const name = draft.name.trim();
    if (!name) {
      toast.error('Tên không được để trống.');
      return;
    }
    try {
      await actions.editMember(id, {
        name,
        teamId: draft.teamId,
        avatarUrl: draft.avatarUrl.trim() || undefined,
      });
      setEditingId(null);
      toast.success('Đã cập nhật thành viên.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không cập nhật được thành viên.'));
    }
  };

  const removeMember = async (member: Member) => {
    const ok = await confirm({
      title: `Xóa "${member.name}" khỏi danh sách?`,
      description:
        'Người này biến mất khỏi vòng quay của cả công ty. Các lượt đã trúng vẫn còn trong lịch sử với tên đã ghi.',
      confirmLabel: 'Xóa thành viên',
      danger: true,
    });
    if (!ok) return;
    try {
      await actions.removeMember(member.id);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không xóa được thành viên.'));
    }
  };

  const filtered = useMemo(() => {
    const q = filterName.trim().toLowerCase();
    return state.members.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (activeFilterTeam !== ALL_TEAMS && m.teamId !== activeFilterTeam) return false;
      return true;
    });
  }, [state.members, filterName, activeFilterTeam]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      {dialog}
      <div className="space-y-6">
        <PanelCard title="Thêm team">
          <input
            className={`${inputClass} mb-4`}
            placeholder="Tên team, ví dụ: Team Sales"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTeam()}
          />
          <ActionButton className="w-full" onClick={addTeam}>
            Thêm team
          </ActionButton>
          <div className="mt-5 flex flex-wrap gap-2">
            {state.teams.length === 0 ? (
              <span className="text-[15px] text-[#9CA3AF]">Chưa có team nào.</span>
            ) : (
              state.teams.map((t) => (
                <span
                  key={t.id}
                  className="group inline-flex items-center gap-2 rounded-full bg-[#F3F4F6] py-1.5 pl-3.5 pr-2 text-[13px] font-medium text-[#111827] transition-colors hover:bg-[#ECEFF3] dark:bg-white/[0.06] dark:text-gray-200"
                >
                  {t.name}
                  <span className="text-[#9CA3AF]">{state.members.filter((m) => m.teamId === t.id).length}</span>
                  <button
                    type="button"
                    onClick={() => removeTeam(t.id)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                    title="Xóa team"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </span>
              ))
            )}
          </div>
        </PanelCard>

        <PanelCard title="Thêm thành viên">
          <input
            className={`${inputClass} mb-3`}
            placeholder="Họ và tên"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMember()}
          />
          <input
            className={`${inputClass} mb-3`}
            placeholder="Link ảnh đại diện (tùy chọn)"
            value={newMemberAvatarUrl}
            onChange={(e) => setNewMemberAvatarUrl(e.target.value)}
          />
          <select
            className={`${selectClass} mb-4`}
            value={selectedTeamId}
            onChange={(e) => setNewMemberTeamId(e.target.value)}
            disabled={state.teams.length === 0}
          >
            {state.teams.length === 0 ? (
              <option value="">Chưa có team, thêm team trước</option>
            ) : (
              state.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
          <ActionButton className="w-full" onClick={addMember}>
            Thêm thành viên
          </ActionButton>
        </PanelCard>

        <BulkImportPanel
          title="Nhập thành viên từ Excel"
          onRows={importRows}
          hint={
            <>
              File có thể gồm các cột <b>Tên</b>, <b>Team</b> và <b>Ảnh/Avatar</b> (tùy chọn). Team chưa tồn tại sẽ được tự động tạo mới.
            </>
          }
        />
      </div>

      <PanelCard title="Danh sách thành viên">
        <div className="mb-5 flex flex-wrap gap-3">
          <input
            className={`${inputClass} min-w-[140px] flex-1`}
            placeholder="Tìm theo tên..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <select
            className={`${selectClass} min-w-[140px] flex-1`}
            value={activeFilterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
          >
            <option value={ALL_TEAMS}>Tất cả team</option>
            {state.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={thClass}>Thành viên</th>
                <th className={thClass}>Team</th>
                <th className={thClass}>Trạng thái</th>
                <th className={thClass}>Số lần trúng</th>
                <th className={thClass}>Số lần nhận quà</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {state.members.length === 0 ? (
                <EmptyRow colSpan={6} icon={UserPlus}>Chưa có thành viên nào. Thêm ở khung bên trái hoặc nhập từ file Excel.</EmptyRow>
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={6} icon={Users}>Không có thành viên nào khớp bộ lọc hiện tại.</EmptyRow>
              ) : (
                filtered.map((m) => {
                  const team = state.teams.find((t) => t.id === m.teamId);

                  if (editingId === m.id) {
                    return (
                      <tr key={m.id}>
                        <td className={tdClass}>
                          <input
                            className={`${inputClass} mb-1.5`}
                            placeholder="Tên thành viên"
                            value={draft.name}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                          />
                          <input
                            className={`${inputClass} text-[12px]`}
                            placeholder="Link ảnh avatar"
                            value={draft.avatarUrl}
                            onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })}
                          />
                        </td>
                        <td className={tdClass}>
                          <select
                            className={selectClass}
                            value={draft.teamId}
                            onChange={(e) => setDraft({ ...draft, teamId: e.target.value })}
                          >
                            {state.teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={tdClass} colSpan={3} />
                        <td className={`${tdClass} whitespace-nowrap`}>
                          <RowActionButton action="save" title="Lưu" onClick={() => saveEdit(m.id)} />
                          <RowActionButton action="cancel" title="Hủy" onClick={() => setEditingId(null)} />
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={m.id} className={trClass}>
                      <td className={tdClass}>
                        <div className="flex items-center gap-2.5">
                          {m.avatarUrl ? (
                            <img
                              src={m.avatarUrl}
                              alt={m.name}
                              className="h-8 w-8 rounded-full object-cover border border-[#F4B63D]/60 flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF8E7] text-[13px] font-bold text-[#B98311] dark:bg-[#F4B63D]/15 flex-shrink-0">
                              {m.name.trim().charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="font-medium text-[#111827] dark:text-white">{m.name}</span>
                        </div>
                      </td>
                      <td className={tdClass}>
                        {team ? <TeamTag name={team.name} /> : '—'}
                      </td>
                      <td className={tdClass}>
                        <span
                          className={
                            m.status === 'active'
                              ? 'inline-flex items-center gap-1.5 rounded-full bg-[#22C55E]/10 px-2.5 py-1 text-[13px] font-medium text-[#16A34A]'
                              : 'inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[13px] font-medium text-[#6B7280] dark:bg-white/[0.06]'
                          }
                        >
                          {m.status === 'active' ? 'Trong vòng quay' : 'Đã trúng'}
                        </span>
                      </td>
                      <td className={monoCellClass}>{winCountFor(m.id)}</td>
                      <td className={monoCellClass}>{giftCountFor(m.id)}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <RowActionButton action="edit" title="Sửa thành viên" onClick={() => startEdit(m)} />
                        <RowActionButton
                          action="delete"
                          title="Xóa thành viên"
                          onClick={() => removeMember(m)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
