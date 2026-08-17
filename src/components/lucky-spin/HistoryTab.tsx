'use client';

import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, History, Search, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import {
  formatSpinTime,
  giftHistoryToExcelRows,
  giftHistoryToPdfBody,
  memberHistoryToExcelRows,
  memberHistoryToPdfBody,
} from '@/lib/lucky-spin/export-rows';
import { apiErrorMessage } from '@/lib/lucky-spin/api';
import { keepSelected } from '@/lib/lucky-spin/selection';
import { exportRowsToExcel, exportTableToPdf } from '@/lib/lucky-spin/sheet-io';
import { GiftRecord, HistoryTabId, WinRecord } from '@/types/lucky-spin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { ConfirmDialog } from '@/components/lucky-spin/ConfirmDialog';
import { EmptyRow } from '@/components/lucky-spin/EmptyRow';
import { PanelCard } from '@/components/lucky-spin/PanelCard';
import { RowActionButton } from '@/components/lucky-spin/RowActionButton';
import { SegToggle } from '@/components/lucky-spin/SegToggle';
import { TeamTag } from '@/components/lucky-spin/TeamTag';
import { useConfirmDialog } from '@/components/lucky-spin/useConfirmDialog';
import { inputClass, monoCellClass, selectClass, tdClass, thClass, trClass } from '@/components/lucky-spin/styles';

const ALL_TEAMS = '__all__';

export function HistoryTab({ store }: { store: LuckySpinStore }) {
  const { state, actions } = store;
  const [tab, setTab] = useState<HistoryTabId>('members');
  const [memberFilterName, setMemberFilterName] = useState('');
  const [memberFilterTeam, setMemberFilterTeam] = useState(ALL_TEAMS);
  const [teamFilterName, setTeamFilterName] = useState('');
  const [giftFilterName, setGiftFilterName] = useState('');
  const [giftFilterTeam, setGiftFilterTeam] = useState(ALL_TEAMS);
  const [exporting, setExporting] = useState(false);
  const [askClear, setAskClear] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

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
    runExport(async () => {
      // Bảng chỉ hiển thị phần gần nhất; file xuất ra phải có đủ mọi dòng đã ghi.
      const all = await actions.fetchFullHistory<WinRecord>('members');
      const q = memberFilterName.trim().toLowerCase();
      const rows = all.filter(
        (h) =>
          (!q || h.name.toLowerCase().includes(q)) &&
          (activeMemberFilterTeam === ALL_TEAMS || h.team === activeMemberFilterTeam),
      );
      return
      kind === 'excel'
        ? exportRowsToExcel(
            memberHistoryToExcelRows(rows),
            'Thanh vien trung',
            `lich-su-thanh-vien-trung-${Date.now()}.xlsx`,
          )
        : exportTableToPdf({
            title: 'Lịch sử thành viên trúng',
            head: ['Tên', 'Team', 'Thời gian'],
            body: memberHistoryToPdfBody(rows),
            headFillColor: [240, 185, 60],
            fileName: `lich-su-thanh-vien-trung-${Date.now()}.pdf`,
          });
    });
  };

  const exportGifts = (kind: 'excel' | 'pdf') => {
    if (giftRows.length === 0) {
      toast.error('Không có dữ liệu để xuất.');
      return;
    }
    runExport(async () => {
      const all = await actions.fetchFullHistory<GiftRecord>('gifts');
      const q = giftFilterName.trim().toLowerCase();
      const rows = all.filter(
        (h) =>
          (!q || h.name.toLowerCase().includes(q)) &&
          (activeGiftFilterTeam === ALL_TEAMS || h.team === activeGiftFilterTeam),
      );
      return
      kind === 'excel'
        ? exportRowsToExcel(giftHistoryToExcelRows(rows), 'Qua tang da trao', `lich-su-qua-tang-${Date.now()}.xlsx`)
        : exportTableToPdf({
            title: 'Lịch sử quà tặng đã trao',
            head: ['Người nhận', 'Team', 'Quà', 'Thời gian'],
            body: giftHistoryToPdfBody(rows),
            headFillColor: [63, 184, 147],
            fileName: `lich-su-qua-tang-${Date.now()}.pdf`,
          });
    });
  };

  const clearCurrent = async () => {
    setAskClear(false);
    const rows =
      tab === 'members' ? state.history : tab === 'teams' ? state.teamHistory : state.giftHistory;
    if (rows.length === 0) return;

    try {
      await actions.clearHistory(tab);
      toast.success(
        tab === 'members'
          ? 'Đã xóa lịch sử thành viên trúng.'
          : tab === 'teams'
            ? 'Đã xóa lịch sử team trúng.'
            : 'Đã xóa lịch sử quà tặng.',
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không xóa được lịch sử.'));
    }
  };

  /**
   * Xóa một dòng lịch sử nay đồng nghĩa HỦY kết quả đó, nên phải nói rõ hậu quả trước khi bấm:
   * người trúng quay lại vòng quay, phần quà về lại kho.
   */
  const removeRow = async (kind: HistoryTabId, id: string, label: string) => {
    const hauQua =
      kind === 'gifts'
        ? 'Phần quà được hoàn lại kho và người nhận mất dấu "đã nhận quà".'
        : 'Người trúng sẽ quay trở lại vòng quay và có thể trúng ở lượt sau.';
    const ok = await confirm({
      title: `Hủy kết quả của "${label}"?`,
      description: `${hauQua} Thao tác này không hoàn tác được.`,
      confirmLabel: 'Hủy kết quả',
      danger: true,
    });
    if (!ok) return;
    try {
      await actions.deleteHistoryEntry(kind, id);
      toast.success('Đã hủy kết quả.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không hủy được kết quả.'));
    }
  };

  const shownCount =
    tab === 'members' ? state.history.length : tab === 'teams' ? state.teamHistory.length : state.giftHistory.length;
  const totalCount =
    tab === 'members'
      ? state.historyCounts.members
      : tab === 'teams'
        ? state.historyCounts.teams
        : state.historyCounts.gifts;
  const truncated = totalCount > shownCount;

  const clearLabel =
    tab === 'members' ? 'thành viên trúng' : tab === 'teams' ? 'team trúng' : 'quà tặng đã trao';
  const clearCount =
    tab === 'members' ? state.history.length : tab === 'teams' ? state.teamHistory.length : state.giftHistory.length;

  return (
    <PanelCard>
      {dialog}
      <ConfirmDialog
        open={askClear}
        danger
        title={`Xóa toàn bộ lịch sử ${clearLabel}?`}
        description={`${clearCount} dòng sẽ bị xóa vĩnh viễn khỏi server và mọi người cùng mất. Nên xuất Excel trước khi xóa.`}
        confirmLabel="Xóa vĩnh viễn"
        onConfirm={clearCurrent}
        onCancel={() => setAskClear(false)}
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SegToggle
          value={tab}
          onChange={setTab}
          options={[
            { value: 'members', label: 'Thành viên trúng' },
            { value: 'teams', label: 'Team trúng' },
            { value: 'gifts', label: 'Quà tặng đã trao' },
          ]}
        />
        <ActionButton variant="secondary" className="!h-10 !text-[14px] !font-medium" onClick={() => setAskClear(true)}>
          Xóa lịch sử đang xem
        </ActionButton>
      </div>

      {truncated && (
        <p className="mb-4 rounded-xl bg-[#F8FAFC] px-4 py-2.5 text-[13px] text-[#6B7280] dark:bg-white/[0.04] dark:text-gray-400">
          Đang hiển thị {shownCount} dòng gần nhất trên tổng {totalCount}. File Excel và PDF xuất ra vẫn có đủ.
        </p>
      )}

      {tab === 'members' && (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
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
            <ActionButton variant="secondary" onClick={() => exportMembers('excel')} disabled={exporting}>
              <FileSpreadsheet className="h-4 w-4" strokeWidth={1.8} />
              Excel
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => exportMembers('pdf')} disabled={exporting}>
              <FileText className="h-4 w-4" strokeWidth={1.8} />
              PDF
            </ActionButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
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
                  <EmptyRow colSpan={4} icon={History}>Chưa có lượt trúng nào. Kết quả sẽ hiện ở đây sau khi bạn xác nhận một lượt quay.</EmptyRow>
                ) : memberRows.length === 0 ? (
                  <EmptyRow colSpan={4} icon={Search}>Không có kết quả nào khớp bộ lọc hiện tại.</EmptyRow>
                ) : (
                  memberRows.map((h) => (
                    <tr key={h.id} className={trClass}>
                      <td className={tdClass}>{h.name}</td>
                      <td className={tdClass}>
                        <TeamTag name={h.team} />
                      </td>
                      <td className={monoCellClass}>{formatSpinTime(h.time)}</td>
                      <td className={tdClass}>
                        <RowActionButton
                          action="delete"
                          title="Hủy kết quả này"
                          onClick={() => removeRow('members', h.id, h.name)}
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
          <div className="mb-5 flex flex-wrap gap-3">
            <input
              className={`${inputClass} min-w-[140px] flex-1`}
              placeholder="Tìm theo tên team..."
              value={teamFilterName}
              onChange={(e) => setTeamFilterName(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={thClass}>Team</th>
                  <th className={thClass}>Thời gian</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {state.teamHistory.length === 0 ? (
                  <EmptyRow colSpan={3} icon={Trophy}>Chưa có team nào được quay trúng.</EmptyRow>
                ) : teamRows.length === 0 ? (
                  <EmptyRow colSpan={3} icon={Search}>Không có team nào khớp từ khoá tìm kiếm.</EmptyRow>
                ) : (
                  teamRows.map((h) => (
                    <tr key={h.id} className={trClass}>
                      <td className={tdClass}>{h.name}</td>
                      <td className={monoCellClass}>{formatSpinTime(h.time)}</td>
                      <td className={tdClass}>
                        <RowActionButton
                          action="delete"
                          title="Hủy kết quả này"
                          onClick={() => removeRow('teams', h.id, h.name)}
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
          <div className="mb-5 flex flex-wrap gap-3">
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
            <ActionButton variant="secondary" onClick={() => exportGifts('excel')} disabled={exporting}>
              <FileSpreadsheet className="h-4 w-4" strokeWidth={1.8} />
              Excel
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => exportGifts('pdf')} disabled={exporting}>
              <FileText className="h-4 w-4" strokeWidth={1.8} />
              PDF
            </ActionButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
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
                  <EmptyRow colSpan={5} icon={History}>Chưa có quà nào được trao. Sang tab Quay quà để bắt đầu.</EmptyRow>
                ) : giftRows.length === 0 ? (
                  <EmptyRow colSpan={5} icon={Search}>Không có kết quả nào khớp bộ lọc hiện tại.</EmptyRow>
                ) : (
                  giftRows.map((h) => (
                    <tr key={h.id} className={trClass}>
                      <td className={tdClass}>{h.name}</td>
                      <td className={tdClass}>
                        <TeamTag name={h.team} />
                      </td>
                      <td className={tdClass}>{h.gift}</td>
                      <td className={monoCellClass}>{formatSpinTime(h.time)}</td>
                      <td className={tdClass}>
                        <RowActionButton
                          action="delete"
                          title="Hủy kết quả này"
                          onClick={() => removeRow('gifts', h.id, `${h.gift} — ${h.name}`)}
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
