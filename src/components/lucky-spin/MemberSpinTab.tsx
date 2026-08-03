'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import { keepSelected } from '@/lib/lucky-spin/selection';
import { recordMemberWin, recordTeamWin, resetSpinStatuses } from '@/lib/lucky-spin/spin-history';
import { nextRotation, SPIN_DURATION_MS } from '@/lib/lucky-spin/spin-rotation';
import { SpinMode, WheelSegment } from '@/types/lucky-spin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { ResultAction } from '@/components/lucky-spin/ResultAction';
import { ResultDialog } from '@/components/lucky-spin/ResultDialog';
import { SegToggle } from '@/components/lucky-spin/SegToggle';
import { SpinWheel } from '@/components/lucky-spin/SpinWheel';
import { fieldLabelClass, railClass, selectClass } from '@/components/lucky-spin/styles';

const ALL_SCOPE = '__all__';

export function MemberSpinTab({ store }: { store: LuckySpinStore }) {
  const { state, patchState } = store;
  const [spinMode, setSpinMode] = useState<SpinMode>('members');
  const [scope, setScope] = useState(ALL_SCOPE);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelSegment | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // Team đang chọn có thể vừa bị xóa ở tab Thành viên, khi đó coi như quay toàn bộ.
  const activeScope = keepSelected(scope, [ALL_SCOPE, ...state.teams.map((t) => t.id)], ALL_SCOPE);

  const pool = useMemo<WheelSegment[]>(() => {
    if (spinMode === 'team') {
      return state.teams.filter((t) => t.status !== 'done').map((t) => ({ id: t.id, name: t.name }));
    }
    return state.members
      .filter((m) => m.status === 'active' && (activeScope === ALL_SCOPE || m.teamId === activeScope))
      .map((m) => ({ id: m.id, name: m.name }));
  }, [spinMode, activeScope, state.teams, state.members]);

  const handleSpin = () => {
    if (spinning) return;
    if (pool.length < 2) {
      toast.error(
        spinMode === 'team' ? 'Cần ít nhất 2 team để quay.' : 'Cần ít nhất 2 thành viên trong phạm vi để quay.',
      );
      return;
    }
    setSpinning(true);
    const winnerIndex = Math.floor(Math.random() * pool.length);
    const picked = pool[winnerIndex];
    setRotation(nextRotation(rotation, winnerIndex, pool.length));
    timerRef.current = setTimeout(() => {
      setSpinning(false);
      setWinner(picked);
    }, SPIN_DURATION_MS);
  };

  const recordWin = (removeFromPool: boolean) => {
    if (!winner) return;

    patchState((prev) =>
      spinMode === 'team'
        ? recordTeamWin(prev, winner, removeFromPool)
        : recordMemberWin(prev, winner, removeFromPool),
    );

    toast.success(
      removeFromPool
        ? `${winner.name} đã được ghi nhận vào lịch sử.`
        : `${winner.name} đã được ghi nhận vào lịch sử, vẫn giữ trong vòng quay.`,
    );
    setWinner(null);
  };

  const resetStatuses = () => {
    patchState((prev) => resetSpinStatuses(prev, spinMode));
    toast.success(
      spinMode === 'team'
        ? 'Đã đặt lại: tất cả team có thể được quay lại.'
        : 'Đã đặt lại: tất cả thành viên có thể được quay lại.',
    );
  };

  const cancelResult = () => {
    setWinner(null);
    toast('Đã hủy kết quả, có thể quay lại.');
  };

  let winnerSubtitle = '';
  if (winner) {
    if (spinMode === 'team') {
      winnerSubtitle = `${state.members.filter((m) => m.teamId === winner.id).length} thành viên`;
    } else {
      const member = state.members.find((m) => m.id === winner.id);
      const team = state.teams.find((t) => t.id === member?.teamId);
      winnerSubtitle = team ? team.name : 'Không thuộc team nào';
    }
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[260px_1fr]">
      <div className={railClass}>
        <SegToggle
          className="mb-4"
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

        <div className="mb-5 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[#C68F1E]">{pool.length}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {spinMode === 'team' ? 'team còn lại chưa quay' : 'người còn lại trong phạm vi'}
          </span>
        </div>

        <ActionButton className="w-full" onClick={handleSpin} disabled={spinning || pool.length < 2}>
          {spinning ? 'Đang quay...' : 'Quay ngay'}
        </ActionButton>
        <ActionButton accent="ghost" className="mt-2.5 w-full" onClick={resetStatuses}>
          {spinMode === 'team'
            ? 'Đặt lại trạng thái team (đưa tất cả về chưa quay)'
            : 'Đặt lại trạng thái (đưa tất cả về chưa quay)'}
        </ActionButton>
      </div>

      <SpinWheel
        segments={pool}
        rotation={rotation}
        accent="gold"
        hubLabel="QUAY"
        emptyText={
          spinMode === 'team' ? 'Không có team nào để quay.' : 'Không có thành viên nào trong phạm vi này để quay.'
        }
      />

      <ResultDialog
        open={!!winner}
        accent="gold"
        eyebrow="Kết quả quay"
        name={winner?.name ?? ''}
        subtitle={winnerSubtitle}
      >
        <ResultAction variant="confirm" onClick={() => recordWin(true)}>
          Xác nhận, xóa khỏi vòng quay
        </ResultAction>
        <ResultAction variant="continue" onClick={() => recordWin(false)}>
          Tiếp tục quay (vẫn lưu vào lịch sử)
        </ResultAction>
        <ResultAction variant="cancel" onClick={cancelResult}>
          Hủy, quay lại
        </ResultAction>
      </ResultDialog>
    </div>
  );
}
