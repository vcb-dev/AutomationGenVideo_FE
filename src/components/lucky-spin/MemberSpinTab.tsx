'use client';

import { useMemo, useState } from 'react';
import { Maximize2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import { useRoundPlayback } from '@/hooks/useRoundPlayback';
import { apiErrorMessage } from '@/lib/lucky-spin/api';
import { stopApplause } from '@/lib/lucky-spin/spin-effects';
import { keepSelected } from '@/lib/lucky-spin/selection';
import { SpinMode, SpinRoundView, WheelSegment } from '@/types/lucky-spin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { ConfirmDialog } from '@/components/lucky-spin/ConfirmDialog';
import { PanelCard } from '@/components/lucky-spin/PanelCard';
import { PresentationStage } from '@/components/lucky-spin/PresentationStage';
import { ResultAction } from '@/components/lucky-spin/ResultAction';
import { ResultDialog } from '@/components/lucky-spin/ResultDialog';
import { SegToggle } from '@/components/lucky-spin/SegToggle';
import { showUndoToast } from '@/components/lucky-spin/showUndoToast';
import { RoundProgress } from '@/components/lucky-spin/RoundProgress';
import { SpinWheel } from '@/components/lucky-spin/SpinWheel';
import {
  counterLabelClass,
  counterNumberClass,
  fieldLabelClass,
  inputClass,
  selectClass,
} from '@/components/lucky-spin/styles';

const ALL_SCOPE = '__all__';

export function MemberSpinTab({ store }: { store: LuckySpinStore }) {
  const { state, actions, canControl, setPollPaused } = store;
  const [spinMode, setSpinMode] = useState<SpinMode>('members');
  const [scope, setScope] = useState(ALL_SCOPE);
  const [drawCount, setDrawCount] = useState('1');
  const [askReset, setAskReset] = useState(false);
  const [presenting, setPresenting] = useState(false);
  /** Lượt do chính máy này bốc — có ngay, không phải đợi nhịp poll kế tiếp. */
  const [ownRound, setOwnRound] = useState<SpinRoundView | null>(null);
  const [result, setResult] = useState<SpinRoundView | null>(null);

  // Team đang chọn có thể vừa bị xóa ở tab Thành viên, khi đó coi như quay toàn bộ.
  const activeScope = keepSelected(scope, [ALL_SCOPE, ...state.teams.map((t) => t.id)], ALL_SCOPE);

  // Người điều khiển dùng lượt của mình, người xem dùng lượt server báo về — cùng một dữ liệu
  // nên bánh xe trên mọi màn hình có cùng thứ tự ô và dừng cùng một chỗ.
  const round = ownRound ?? (state.activeRound && state.activeRound.kind !== 'gift' ? state.activeRound : null);

  const { rotation, spinning, revealed, transitionMs } = useRoundPlayback(round, (finished) => {
    setPollPaused(false);
    if (ownRound?.id === finished.id) setResult(finished);
  });

  /** Danh sách chờ quay khi chưa có lượt nào chạy — để xem trước và đếm số. */
  const idlePool = useMemo<WheelSegment[]>(() => {
    if (spinMode === 'team') {
      return state.teams.filter((t) => t.status !== 'done').map((t) => ({ id: t.id, name: t.name }));
    }
    return state.members
      .filter((m) => m.status === 'active' && (activeScope === ALL_SCOPE || m.teamId === activeScope))
      .map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }));
  }, [spinMode, activeScope, state.teams, state.members]);

  const segments = round ? round.pool : idlePool;
  /** Số vòng của lượt đang chạy — bốc 3 người thì quay 3 vòng. */
  const totalSpins = round?.winnerIndexes.length ?? 0;
  /** Người đã quay ra tới thời điểm này, hiện dần cho khán giả theo dõi. */
  const revealedNames = round
    ? round.winnerIndexes.slice(0, revealed).map((i) => round.pool[i]?.name).filter(Boolean)
    : [];
  const count = Math.max(1, parseInt(drawCount, 10) || 1);

  const handleSpin = async () => {
    if (spinning) return;
    try {
      setPollPaused(true);
      setOwnRound(
        await actions.drawRound({
          kind: spinMode === 'team' ? 'team' : 'member',
          count,
          ...(spinMode === 'members' && activeScope !== ALL_SCOPE ? { scopeTeamId: activeScope } : {}),
        }),
      );
    } catch (err) {
      setPollPaused(false);
      toast.error(apiErrorMessage(err, 'Không quay được, thử lại.'));
    }
  };

  const winners = result ? result.winnerIndexes.map((i) => result.pool[i]).filter(Boolean) : [];

  const winnersWithDetails = useMemo(() => {
    if (!result) return [];
    return result.winnerIndexes
      .map((i) => {
        const item = result.pool[i];
        if (!item) return null;
        if (spinMode === 'team') {
          const team = state.teams.find((t) => t.id === item.id);
          const memberCount = state.members.filter((m) => m.teamId === item.id).length;
          return {
            id: item.id,
            name: item.name,
            teamName: `${memberCount} thành viên`,
          };
        }
        const member = state.members.find((m) => m.id === item.id);
        const team = state.teams.find((t) => t.id === member?.teamId);
        return {
          id: item.id,
          name: item.name,
          avatarUrl: member?.avatarUrl || item.avatarUrl,
          teamName: team?.name,
        };
      })
      .filter(Boolean) as { id: string; name: string; avatarUrl?: string; teamName?: string }[];
  }, [result, spinMode, state.members, state.teams]);

  const closeResult = () => {
    // Bấm nút là xong khoảnh khắc công bố — cắt tiếng vỗ tay ngay thay vì để chạy hết file.
    // Không bấm gì thì cứ để nó phát tự nhiên tới hết.
    stopApplause();
    setResult(null);
    setOwnRound(null);
  };

  const confirmWin = async (removeFromPool: boolean) => {
    if (!result) return;
    const roundId = result.id;
    const names = winners.map((w) => w.name).join(', ');
    closeResult();
    try {
      const res: any = await actions.confirmRound(roundId, removeFromPool);
      const ids: string[] = (res.data?.entries ?? []).map((e: any) => e.id).filter(Boolean);
      showUndoToast(
        removeFromPool ? `${names} đã được ghi nhận vào lịch sử.` : `${names} đã được ghi nhận, vẫn giữ trong vòng quay.`,
        async () => {
          for (const id of ids) await actions.deleteHistoryEntry(spinMode === 'team' ? 'teams' : 'members', id);
        },
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không ghi được kết quả, thử lại.'));
    }
  };

  const cancelResult = async () => {
    if (!result) return;
    const roundId = result.id;
    closeResult();
    try {
      await actions.cancelRound(roundId);
      toast('Đã hủy kết quả, có thể quay lại.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không hủy được lượt quay.'));
    }
  };

  const resetStatuses = async () => {
    setAskReset(false);
    try {
      await actions.resetStatuses(spinMode);
      toast.success(
        spinMode === 'team'
          ? 'Đã đặt lại: tất cả team có thể được quay lại.'
          : 'Đã đặt lại: tất cả thành viên có thể được quay lại.',
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không đặt lại được, thử lại.'));
    }
  };

  const winnerSubtitle = (() => {
    if (winners.length > 1) return `${winners.length} người trúng lượt này`;
    const only = winners[0];
    if (!only) return '';
    if (spinMode === 'team') return `${state.members.filter((m) => m.teamId === only.id).length} thành viên`;
    const member = state.members.find((m) => m.id === only.id);
    const team = state.teams.find((t) => t.id === member?.teamId);
    return team ? team.name : 'Không thuộc team nào';
  })();

  const poolLabel = spinMode === 'team' ? 'team chưa quay' : 'người trong phạm vi';

  return (
    <div className="grid gap-7 lg:grid-cols-[260px_1fr]">
      <PanelCard>
        <SegToggle
          className="mb-6"
          value={spinMode}
          onChange={setSpinMode}
          options={[
            { value: 'members', label: 'Thành viên' },
            { value: 'team', label: 'Team' },
          ]}
        />

        {spinMode === 'members' && (
          <div className="mb-5">
            <label className={fieldLabelClass}>Phạm vi quay</label>
            <select className={selectClass} value={activeScope} onChange={(e) => setScope(e.target.value)}>
              <option value={ALL_SCOPE}>Tất cả thành viên</option>
              {state.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-6">
          <label className={fieldLabelClass}>Bốc mấy người một lượt</label>
          <input
            type="number"
            min={1}
            max={20}
            className={inputClass}
            value={drawCount}
            onChange={(e) => setDrawCount(e.target.value)}
          />
        </div>

        <div className="mb-6 flex items-baseline gap-2.5">
          <span className={counterNumberClass}>{idlePool.length}</span>
          <span className={counterLabelClass}>{poolLabel}</span>
        </div>

        <ActionButton
          variant="secondary"
          className="w-full !text-[14px] !font-medium"
          onClick={() => setPresenting(true)}
        >
          <Maximize2 className="h-4 w-4" strokeWidth={1.8} />
          Trình chiếu
        </ActionButton>
        <ActionButton
          variant="secondary"
          className="mt-3 w-full !text-[14px] !font-medium"
          onClick={() => setAskReset(true)}
        >
          {spinMode === 'team' ? 'Đặt lại trạng thái team' : 'Đặt lại trạng thái'}
        </ActionButton>
      </PanelCard>

      <div className="flex flex-col items-center">
        <SpinWheel
          segments={segments}
          rotation={rotation}
          spinning={spinning}
          transitionMs={transitionMs}
          hubLabel="QUAY"
          onSpin={handleSpin}
          spinDisabled={idlePool.length < 2}
          emptyIcon={Users}
          emptyText={spinMode === 'team' ? 'Chưa có team nào để quay.' : 'Chưa có thành viên nào trong phạm vi này.'}
        />
        <RoundProgress total={totalSpins} revealed={revealed} names={revealedNames} />
      </div>

      <PresentationStage
        open={presenting}
        onClose={() => setPresenting(false)}
        poolCount={idlePool.length}
        poolLabel={poolLabel}
      >
        <SpinWheel
          segments={segments}
          rotation={rotation}
          spinning={spinning}
          transitionMs={transitionMs}
          sizeClass="h-[min(74vh,74vw)] w-[min(74vh,74vw)]"
          hubLabel="QUAY"
          onSpin={handleSpin}
          spinDisabled={idlePool.length < 2}
          emptyIcon={Users}
          emptyText="Chưa có ai trong vòng quay."
        />
        <RoundProgress total={totalSpins} revealed={revealed} names={revealedNames} onDark />
      </PresentationStage>

      <ConfirmDialog
        open={askReset}
        title={spinMode === 'team' ? 'Đặt lại trạng thái tất cả team?' : 'Đặt lại trạng thái tất cả thành viên?'}
        description="Mọi người đã trúng sẽ quay lại vòng quay và có thể trúng tiếp. Lịch sử vẫn được giữ nguyên."
        confirmLabel="Đặt lại"
        onConfirm={resetStatuses}
        onCancel={() => setAskReset(false)}
      />

      <ResultDialog
        open={!!result}
        eyebrow={winners.length > 1 ? `Kết quả — ${winners.length} người` : 'Kết quả quay'}
        name={winners.length > 1 ? winners.map((w) => w.name).join(', ') : (winners[0]?.name ?? '')}
        subtitle={winnerSubtitle}
        avatarUrl={winnersWithDetails[0]?.avatarUrl}
        winners={winnersWithDetails}
      >
        <ResultAction variant="confirm" onClick={() => confirmWin(true)}>
          Xác nhận, xóa khỏi vòng quay
        </ResultAction>
        <ResultAction variant="continue" onClick={() => confirmWin(false)}>
          Tiếp tục quay (vẫn lưu vào lịch sử)
        </ResultAction>
        <ResultAction variant="cancel" onClick={cancelResult}>
          Hủy, quay lại
        </ResultAction>
      </ResultDialog>
    </div>
  );
}
