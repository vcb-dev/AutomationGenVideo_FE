'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import {
  activeRecipientIdOf,
  activeScopeOf,
  ALL_TEAMS_SCOPE,
  INITIAL_SELECTION,
  recipientsOf,
  selectMode,
  selectRecipient,
  selectScope,
} from '@/lib/lucky-spin/gift-recipients';
import { awardGiftToMember, awardGiftToTeam, resetGiftStock } from '@/lib/lucky-spin/spin-history';
import { nextRotation, SPIN_DURATION_MS } from '@/lib/lucky-spin/spin-rotation';
import { Gift, GiftRecipientMode, WheelSegment } from '@/types/lucky-spin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { ResultAction } from '@/components/lucky-spin/ResultAction';
import { ResultDialog } from '@/components/lucky-spin/ResultDialog';
import { SegToggle } from '@/components/lucky-spin/SegToggle';
import { SpinWheel } from '@/components/lucky-spin/SpinWheel';
import { fieldLabelClass, railClass, selectClass } from '@/components/lucky-spin/styles';


export function GiftSpinTab({ store }: { store: LuckySpinStore }) {
  const { state, patchState } = store;
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wonGift, setWonGift] = useState<Gift | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const recipientMode = selection.mode;
  const activeScope = activeScopeOf(selection, state.teams);
  const recipients = useMemo(
    () => recipientsOf(selection, state.teams, state.members),
    [selection, state.teams, state.members],
  );
  const activeRecipientId = activeRecipientIdOf(selection, state.teams, state.members);

  const changeMode = (mode: GiftRecipientMode) =>
    setSelection((prev) => selectMode(prev, mode, state.teams, state.members));

  const changeScope = (scope: string) =>
    setSelection((prev) => selectScope(prev, scope, state.teams, state.members));

  const changeRecipient = (recipientId: string) => setSelection((prev) => selectRecipient(prev, recipientId));

  const availableGifts = useMemo(() => state.gifts.filter((g) => g.remaining > 0), [state.gifts]);
  const segments: WheelSegment[] = availableGifts.map((g) => ({ id: g.id, name: g.name }));

  const handleSpin = () => {
    if (spinning) return;
    if (!activeRecipientId) {
      toast.error(recipientMode === 'team' ? 'Chọn team nhận quà trước.' : 'Chọn người nhận quà trước.');
      return;
    }
    if (availableGifts.length < 1) {
      toast.error('Không còn quà nào để quay.');
      return;
    }
    setSpinning(true);
    const winnerIndex = Math.floor(Math.random() * availableGifts.length);
    const picked = availableGifts[winnerIndex];
    setRotation(nextRotation(rotation, winnerIndex, availableGifts.length));
    timerRef.current = setTimeout(() => {
      setSpinning(false);
      setWonGift(picked);
    }, SPIN_DURATION_MS);
  };

  const confirmGift = () => {
    if (!wonGift) return;

    const recipientName =
      recipientMode === 'team'
        ? state.teams.find((t) => t.id === activeRecipientId)?.name
        : state.members.find((m) => m.id === activeRecipientId)?.name;
    if (!recipientName) return;

    patchState((prev) =>
      recipientMode === 'team'
        ? awardGiftToTeam(prev, activeRecipientId, wonGift)
        : awardGiftToMember(prev, activeRecipientId, wonGift),
    );
    toast.success(`Đã trao "${wonGift.name}" cho ${recipientName}.`);
    setWonGift(null);
  };

  const resetGifts = () => {
    patchState(resetGiftStock);
    toast.success('Đã khôi phục số lượng quà và trạng thái nhận quà.');
  };

  const cancelResult = () => {
    setWonGift(null);
    toast('Đã hủy kết quả, có thể quay lại.');
  };

  let recipientSubtitle = '—';
  if (recipientMode === 'team') {
    const team = state.teams.find((t) => t.id === activeRecipientId);
    if (team) {
      recipientSubtitle = `${team.name} · ${state.members.filter((m) => m.teamId === team.id).length} thành viên`;
    }
  } else {
    const member = state.members.find((m) => m.id === activeRecipientId);
    if (member) {
      const team = state.teams.find((t) => t.id === member.teamId);
      recipientSubtitle = `${member.name}${team ? ' · ' + team.name : ''}`;
    }
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[260px_1fr]">
      <div className={railClass}>
        <SegToggle
          className="mb-4"
          accent="teal"
          value={recipientMode}
          onChange={changeMode}
          options={[
            { value: 'member', label: 'Cá nhân' },
            { value: 'team', label: 'Team' },
          ]}
        />

        {recipientMode === 'member' && (
          <div className="mb-4">
            <label className={fieldLabelClass}>Lọc theo team (tuỳ chọn)</label>
            <select className={selectClass} value={activeScope} onChange={(e) => changeScope(e.target.value)}>
              <option value={ALL_TEAMS_SCOPE}>Tất cả team</option>
              {state.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-5">
          <label className={fieldLabelClass}>{recipientMode === 'team' ? 'Team nhận quà' : 'Người nhận quà'}</label>
          <select
            className={selectClass}
            value={activeRecipientId}
            onChange={(e) => changeRecipient(e.target.value)}
            disabled={recipients.length === 0}
          >
            {recipients.length === 0 ? (
              <option value="">
                {recipientMode === 'team' ? 'Chưa có team nào' : 'Chưa có thành viên trong phạm vi này'}
              </option>
            ) : (
              recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="mb-5 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[#2A8768]">{availableGifts.length}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">loại quà còn hàng</span>
        </div>

        <ActionButton
          accent="teal"
          className="w-full"
          onClick={handleSpin}
          disabled={spinning || availableGifts.length < 1 || !activeRecipientId}
        >
          {spinning ? 'Đang quay...' : 'Quay quà'}
        </ActionButton>
        <ActionButton accent="ghost" className="mt-2.5 w-full" onClick={resetGifts}>
          Khôi phục số lượng quà &amp; trạng thái nhận quà
        </ActionButton>
      </div>

      <SpinWheel
        segments={segments}
        rotation={rotation}
        colorOffset={1}
        accent="teal"
        hubLabel="QUÀ"
        emptyText="Chưa có quà nào còn hàng. Thêm quà ở tab Quà tặng."
      />

      <ResultDialog
        open={!!wonGift}
        accent="teal"
        eyebrow="Kết quả quay quà"
        name={wonGift?.name ?? ''}
        subtitle={recipientSubtitle}
      >
        <ResultAction variant="confirm" onClick={confirmGift}>
          Xác nhận, trao quà
        </ResultAction>
        <ResultAction variant="cancel" onClick={cancelResult}>
          Hủy, quay lại
        </ResultAction>
      </ResultDialog>
    </div>
  );
}
