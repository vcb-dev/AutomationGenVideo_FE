'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import { importMembersFromRows, isImportError } from '@/lib/lucky-spin/import-rows';
import { keepSelected } from '@/lib/lucky-spin/selection';
import { SheetRow } from '@/lib/lucky-spin/sheet-io';
import { uid } from '@/lib/lucky-spin/storage';
import { Member } from '@/types/lucky-spin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { BulkImportPanel } from '@/components/lucky-spin/BulkImportPanel';
import { EmptyRow } from '@/components/lucky-spin/EmptyRow';
import { PanelCard } from '@/components/lucky-spin/PanelCard';
import { RowActionButton } from '@/components/lucky-spin/RowActionButton';
import { TeamTag } from '@/components/lucky-spin/TeamTag';
import { inputClass, monoCellClass, selectClass, tdClass, thClass } from '@/components/lucky-spin/styles';

const ALL_TEAMS = '__all__';

export function MembersTab({ store }: { store: LuckySpinStore }) {
  const { state, patchState, winCountFor, giftCountFor, teamIndexByName } = store;
  const [newTeamName, setNewTeamName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberTeamId, setNewMemberTeamId] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterTeam, setFilterTeam] = useState(ALL_TEAMS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', teamId: '' });

  const teamIds = state.teams.map((t) => t.id);
  // Team vừa chọn có thể vừa bị xóa ngay bên trên; giữ id đã chết sẽ tạo thành viên mồ côi.
  const selectedTeamId = keepSelected(newMemberTeamId, teamIds, state.teams[0]?.id ?? '');
  const activeFilterTeam = keepSelected(filterTeam, [ALL_TEAMS, ...teamIds], ALL_TEAMS);

  const addTeam = () => {
    const name = newTeamName.trim();
    if (!name) {
      toast.error('Nhập tên team.');
      return;
    }
    patchState((prev) => ({ teams: [...prev.teams, { id: uid(), name, status: 'active' as const }] }));
    setNewTeamName('');
    toast.success('Đã thêm team.');
  };

  const removeTeam = (id: string) => {
    if (state.members.some((m) => m.teamId === id)) {
      toast.error('Không thể xóa team còn thành viên. Hãy xóa hoặc chuyển thành viên trước.');
      return;
    }
    patchState((prev) => ({ teams: prev.teams.filter((t) => t.id !== id) }));
  };

  const addMember = () => {
    const name = newMemberName.trim();
    if (!name) {
      toast.error('Nhập tên thành viên.');
      return;
    }
    if (state.teams.length === 0) {
      toast.error('Thêm ít nhất một team trước khi thêm thành viên.');
      return;
    }
    patchState((prev) => ({
      members: [
        ...prev.members,
        { id: uid(), name, teamId: selectedTeamId, status: 'active' as const, giftReceived: false },
      ],
    }));
    setNewMemberName('');
    toast.success('Đã thêm thành viên.');
  };

  const importRows = (rows: SheetRow[]) => {
    const result = importMembersFromRows(rows, state.teams);
    if (isImportError(result)) {
      toast.error(result.error);
      return;
    }

    patchState((prev) => ({
      teams: [...prev.teams, ...result.teams],
      members: [...prev.members, ...result.members],
    }));

    const parts = [`Đã nhập ${result.members.length} thành viên`];
    if (result.teams.length > 0) parts.push(`tạo mới ${result.teams.length} team`);
    if (result.skipped > 0) parts.push(`bỏ qua ${result.skipped} dòng thiếu dữ liệu`);
    toast.success(parts.join(', ') + '.');
  };

  const startEdit = (member: Member) => {
    if (state.teams.length === 0) {
      toast.error('Chưa có team nào để chọn.');
      return;
    }
    setEditingId(member.id);
    setDraft({ name: member.name, teamId: member.teamId });
  };

  const saveEdit = (id: string) => {
    const name = draft.name.trim();
    if (!name) {
      toast.error('Tên không được để trống.');
      return;
    }
    patchState((prev) => ({
      members: prev.members.map((m) => (m.id === id ? { ...m, name, teamId: draft.teamId } : m)),
    }));
    setEditingId(null);
    toast.success('Đã cập nhật thành viên.');
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
      <div className="space-y-5">
        <PanelCard title="Thêm team">
          <input
            className={`${inputClass} mb-3`}
            placeholder="Tên team, ví dụ: Team Sales"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTeam()}
          />
          <ActionButton className="w-full" onClick={addTeam}>
            Thêm team
          </ActionButton>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {state.teams.length === 0 ? (
              <span className="text-sm text-gray-400 dark:text-gray-500">Chưa có team nào.</span>
            ) : (
              state.teams.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-950"
                >
                  {t.name}
                  <span className="text-gray-400">({state.members.filter((m) => m.teamId === t.id).length})</span>
                  <button
                    type="button"
                    onClick={() => removeTeam(t.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Xóa team"
                  >
                    <X className="h-3.5 w-3.5" />
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
          <select
            className={`${selectClass} mb-3`}
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
              File cần có dòng tiêu đề với cột <b>Tên</b> và <b>Team</b>. Team chưa tồn tại sẽ được tự động tạo mới.
            </>
          }
        />
      </div>

      <PanelCard title="Danh sách thành viên">
        <div className="mb-3.5 flex flex-wrap gap-2.5">
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
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={thClass}>Tên</th>
                <th className={thClass}>Team</th>
                <th className={thClass}>Trạng thái</th>
                <th className={thClass}>Số lần trúng</th>
                <th className={thClass}>Số lần nhận quà</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {state.members.length === 0 ? (
                <EmptyRow colSpan={6}>Chưa có thành viên nào. Thêm thành viên ở bên trái.</EmptyRow>
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={6}>Không tìm thấy thành viên phù hợp.</EmptyRow>
              ) : (
                filtered.map((m) => {
                  const team = state.teams.find((t) => t.id === m.teamId);

                  if (editingId === m.id) {
                    return (
                      <tr key={m.id}>
                        <td className={tdClass}>
                          <input
                            className={inputClass}
                            value={draft.name}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
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
                    <tr key={m.id}>
                      <td className={tdClass}>{m.name}</td>
                      <td className={tdClass}>
                        {team ? <TeamTag name={team.name} teamIndex={teamIndexByName.get(team.name) ?? -1} /> : '—'}
                      </td>
                      <td className={`${tdClass} ${m.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {m.status === 'active' ? 'Đang trong vòng quay' : 'Đã trúng'}
                      </td>
                      <td className={monoCellClass}>{winCountFor(m.id)}</td>
                      <td className={monoCellClass}>{giftCountFor(m.id)}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <RowActionButton action="edit" title="Sửa thành viên" onClick={() => startEdit(m)} />
                        <RowActionButton
                          action="delete"
                          title="Xóa thành viên"
                          onClick={() => patchState((prev) => ({ members: prev.members.filter((x) => x.id !== m.id) }))}
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
