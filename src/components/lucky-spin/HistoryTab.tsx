'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import {
  formatSpinTime,
  giftHistoryToExcelRows,
  giftHistoryToPdfBody,
  memberHistoryToExcelRows,
  memberHistoryToPdfBody,
} from '@/lib/lucky-spin/export-rows';
import { keepSelected } from '@/lib/lucky-spin/selection';
import { exportRowsToExcel, exportTableToPdf } from '@/lib/lucky-spin/sheet-io';
import { HistoryTabId } from '@/types/lucky-spin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { EmptyRow } from '@/components/lucky-spin/EmptyRow';
import { PanelCard } from '@/components/lucky-spin/PanelCard';
import { RowActionButton } from '@/components/lucky-spin/RowActionButton';
import { SegToggle } from '@/components/lucky-spin/SegToggle';
import { TeamTag } from '@/components/lucky-spin/TeamTag';
import { inputClass, monoCellClass, selectClass, tdClass, thClass } from '@/components/lucky-spin/styles';

const ALL_TEAMS = '__all__';

export function HistoryTab({ store }: { store: LuckySpinStore }) {
  const { state, patchState, teamIndexByName } = store;
  const [tab, setTab] = useState<HistoryTabId>('members');
  const [memberFilterName, setMemberFilterName] = useState('');
  const [memberFilterTeam, setMemberFilterTeam] = useState(ALL_TEAMS);
  const [teamFilterName, setTeamFilterName] = useState('');
  const [giftFilterName, setGiftFilterName] = useState('');
  const [giftFilterTeam, setGiftFilterTeam] = useState(ALL_TEAMS);
  const [exporting, setExporting] = useState(false);

  const memberTeamOptions = useMemo(
    () => [...new Set(state.history.map((h) => h.team))].sort((a, b) => a.localeCompare(b, 'vi')),
    [state.history],
  );

  // Team trong bộ lọc biến mất khi dòng cuối cùng của team đó bị xóa — không chốt lại thì bảng
  // rỗng dù lịch sử vẫn còn dữ liệu.
  const activeMemberFilterTeam = keepSelected(memberFilterTeam, [ALL_TEAMS, ...memberTeamOptions], ALL_TEAMS);

  const memberRows = useMemo(() => {
    const q = memberFilterName.trim().toLowerCase();
    return state.history.filter((h) => {
      if (q && !h.name.toLowerCase().includes(q)) return false;
      if (activeMemberFilterTeam !== ALL_TEAMS && h.team !== activeMemberFilterTeam) return false;
      return true;
    });
  }, [state.history, memberFilterName, activeMemberFilterTeam]);

  const teamRows = useMemo(() => {
    const q = teamFilterName.trim().toLowerCase();
    return state.teamHistory.filter((h) => !q || h.name.toLowerCase().includes(q));
  }, [state.teamHistory, teamFilterName]);

  const giftTeamOptions = useMemo(
    () => [...new Set(state.giftHistory.map((h) => h.team))].sort((a, b) => a.localeCompare(b, 'vi')),
    [state.giftHistory],
  );

  const activeGiftFilterTeam = keepSelected(giftFilterTeam, [ALL_TEAMS, ...giftTeamOptions], ALL_TEAMS);

  const giftRows = useMemo(() => {
    const q = giftFilterName.trim().toLowerCase();
    return state.giftHistory.filter((h) => {
      if (q && !h.name.toLowerCase().includes(q)) return false;
      if (activeGiftFilterTeam !== ALL_TEAMS && h.team !== activeGiftFilterTeam) return false;
      return true;
    });
  }, [state.giftHistory, giftFilterName, activeGiftFilterTeam]);

  const runExport = async (task: () => Promise<void>) => {
    setExporting(true);
    try {
      await task();
      toast.success('Đã xuất file.');
    } catch (err: any) {
      toast.error(err?.message || 'Không xuất được file.');
    } finally {
      setExporting(false);
    }
  };

  const exportMembers = (kind: 'excel' | 'pdf') => {
    if (memberRows.length === 0) {
      toast.error('Không có dữ liệu để xuất.');
      return;
    }
    runExport(() =>
      kind === 'excel'
        ? exportRowsToExcel(
            memberHistoryToExcelRows(memberRows),
            'Thanh vien trung',
            `lich-su-thanh-vien-trung-${Date.now()}.xlsx`,
          )
        : exportTableToPdf({
            title: 'Lịch sử thành viên trúng',
            head: ['Tên', 'Team', 'Thời gian'],
            body: memberHistoryToPdfBody(memberRows),
            headFillColor: [240, 185, 60],
            fileName: `lich-su-thanh-vien-trung-${Date.now()}.pdf`,
          }),
    );
  };

  const exportGifts = (kind: 'excel' | 'pdf') => {
    if (giftRows.length === 0) {
      toast.error('Không có dữ liệu để xuất.');
      return;
    }
    runExport(() =>
      kind === 'excel'
        ? exportRowsToExcel(giftHistoryToExcelRows(giftRows), 'Qua tang da trao', `lich-su-qua-tang-${Date.now()}.xlsx`)
        : exportTableToPdf({
            title: 'Lịch sử quà tặng đã trao',
            head: ['Người nhận', 'Team', 'Quà', 'Thời gian'],
            body: giftHistoryToPdfBody(giftRows),
            headFillColor: [63, 184, 147],
            fileName: `lich-su-qua-tang-${Date.now()}.pdf`,
          }),
    );
  };

  const clearCurrent = () => {
    if (tab === 'members') {
      if (state.history.length === 0) return;
      patchState(() => ({ history: [] }));
      toast.success('Đã xóa lịch sử thành viên trúng.');
    } else if (tab === 'teams') {
      if (state.teamHistory.length === 0) return;
      patchState(() => ({ teamHistory: [] }));
      toast.success('Đã xóa lịch sử team trúng.');
    } else {
      if (state.giftHistory.length === 0) return;
      patchState(() => ({ giftHistory: [] }));
      toast.success('Đã xóa lịch sử quà tặng.');
    }
  };

  return (
    <PanelCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegToggle
          value={tab}
          onChange={setTab}
          accent={tab === 'gifts' ? 'teal' : 'gold'}
          options={[
            { value: 'members', label: 'Thành viên trúng' },
            { value: 'teams', label: 'Team trúng' },
            { value: 'gifts', label: 'Quà tặng đã trao' },
          ]}
        />
        <ActionButton accent="ghost" className="!py-2" onClick={clearCurrent}>
          Xóa lịch sử đang xem
        </ActionButton>
      </div>

      {tab === 'members' && (
        <>
          <div className="mb-3.5 flex flex-wrap gap-2.5">
            <input
              className={`${inputClass} min-w-[140px] flex-1`}
              placeholder="Tìm theo tên..."
              value={memberFilterName}
              onChange={(e) => setMemberFilterName(e.target.value)}
            />
            <select
              className={`${selectClass} min-w-[140px] flex-1`}
              value={activeMemberFilterTeam}
              onChange={(e) => setMemberFilterTeam(e.target.value)}
            >
              <option value={ALL_TEAMS}>Tất cả team</option>
              {memberTeamOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ActionButton onClick={() => exportMembers('excel')} disabled={exporting}>
              Xuất Excel
            </ActionButton>
            <ActionButton onClick={() => exportMembers('pdf')} disabled={exporting}>
              Xuất PDF
            </ActionButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass}>Tên</th>
                  <th className={thClass}>Team</th>
                  <th className={thClass}>Thời gian</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {state.history.length === 0 ? (
                  <EmptyRow colSpan={4}>Chưa có lượt trúng nào được ghi nhận.</EmptyRow>
                ) : memberRows.length === 0 ? (
                  <EmptyRow colSpan={4}>Không tìm thấy kết quả phù hợp.</EmptyRow>
                ) : (
                  memberRows.map((h) => (
                    <tr key={h.id}>
                      <td className={tdClass}>{h.name}</td>
                      <td className={tdClass}>
                        <TeamTag name={h.team} teamIndex={teamIndexByName.get(h.team) ?? -1} />
                      </td>
                      <td className={monoCellClass}>{formatSpinTime(h.time)}</td>
                      <td className={tdClass}>
                        <RowActionButton
                          action="delete"
                          title="Xóa dòng này"
                          onClick={() => patchState((prev) => ({ history: prev.history.filter((x) => x.id !== h.id) }))}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'teams' && (
        <>
          <div className="mb-3.5 flex flex-wrap gap-2.5">
            <input
              className={`${inputClass} min-w-[140px] flex-1`}
              placeholder="Tìm theo tên team..."
              value={teamFilterName}
              onChange={(e) => setTeamFilterName(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass}>Team</th>
                  <th className={thClass}>Thời gian</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {state.teamHistory.length === 0 ? (
                  <EmptyRow colSpan={3}>Chưa có team nào được quay trúng.</EmptyRow>
                ) : teamRows.length === 0 ? (
                  <EmptyRow colSpan={3}>Không tìm thấy kết quả phù hợp.</EmptyRow>
                ) : (
                  teamRows.map((h) => (
                    <tr key={h.id}>
                      <td className={tdClass}>{h.name}</td>
                      <td className={monoCellClass}>{formatSpinTime(h.time)}</td>
                      <td className={tdClass}>
                        <RowActionButton
                          action="delete"
                          title="Xóa dòng này"
                          onClick={() =>
                            patchState((prev) => ({ teamHistory: prev.teamHistory.filter((x) => x.id !== h.id) }))
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'gifts' && (
        <>
          <div className="mb-3.5 flex flex-wrap gap-2.5">
            <input
              className={`${inputClass} min-w-[140px] flex-1`}
              placeholder="Tìm theo tên..."
              value={giftFilterName}
              onChange={(e) => setGiftFilterName(e.target.value)}
            />
            <select
              className={`${selectClass} min-w-[140px] flex-1`}
              value={activeGiftFilterTeam}
              onChange={(e) => setGiftFilterTeam(e.target.value)}
            >
              <option value={ALL_TEAMS}>Tất cả team</option>
              {giftTeamOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ActionButton accent="teal" onClick={() => exportGifts('excel')} disabled={exporting}>
              Xuất Excel
            </ActionButton>
            <ActionButton accent="teal" onClick={() => exportGifts('pdf')} disabled={exporting}>
              Xuất PDF
            </ActionButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass}>Người nhận</th>
                  <th className={thClass}>Team</th>
                  <th className={thClass}>Quà</th>
                  <th className={thClass}>Thời gian</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {state.giftHistory.length === 0 ? (
                  <EmptyRow colSpan={5}>Chưa có quà nào được trao.</EmptyRow>
                ) : giftRows.length === 0 ? (
                  <EmptyRow colSpan={5}>Không tìm thấy kết quả phù hợp.</EmptyRow>
                ) : (
                  giftRows.map((h) => (
                    <tr key={h.id}>
                      <td className={tdClass}>{h.name}</td>
                      <td className={tdClass}>
                        <TeamTag name={h.team} teamIndex={teamIndexByName.get(h.team) ?? -1} />
                      </td>
                      <td className={tdClass}>{h.gift}</td>
                      <td className={monoCellClass}>{formatSpinTime(h.time)}</td>
                      <td className={tdClass}>
                        <RowActionButton
                          action="delete"
                          title="Xóa dòng này"
                          onClick={() =>
                            patchState((prev) => ({ giftHistory: prev.giftHistory.filter((x) => x.id !== h.id) }))
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PanelCard>
  );
}
