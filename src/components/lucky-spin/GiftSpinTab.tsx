'use client';

import { useMemo, useState } from 'react';
import { Gift as GiftIcon, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import { useRoundPlayback } from '@/hooks/useRoundPlayback';
import { apiErrorMessage } from '@/lib/lucky-spin/api';
import { stopApplause } from '@/lib/lucky-spin/spin-effects';
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
import { GiftRecipientMode, SpinRoundView, WheelSegment } from '@/types/lucky-spin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { ConfirmDialog } from '@/components/lucky-spin/ConfirmDialog';
import { PanelCard } from '@/components/lucky-spin/PanelCard';
import { PresentationStage } from '@/components/lucky-spin/PresentationStage';
import { ResultAction } from '@/components/lucky-spin/ResultAction';
import { ResultDialog } from '@/components/lucky-spin/ResultDialog';
import { SegToggle } from '@/components/lucky-spin/SegToggle';
import { showUndoToast } from '@/components/lucky-spin/showUndoToast';
import { SpinWheel } from '@/components/lucky-spin/SpinWheel';
import { counterLabelClass, counterNumberClass, fieldLabelClass, selectClass } from '@/components/lucky-spin/styles';

export function GiftSpinTab({ store }: { store: LuckySpinStore }) {
  const { state, actions, canControl, setPollPaused } = store;
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const [askReset, setAskReset] = useState(false);
  const [presenting, setPresenting] = useState(false);
  /** Lượt do chính máy này bốc — có ngay, không phải đợi nhịp poll kế tiếp. */
  const [ownRound, setOwnRound] = useState<SpinRoundView | null>(null);
  const [result, setResult] = useState<SpinRoundView | null>(null);

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

  // Người điều khiển dùng lượt của mình, người xem dùng lượt server báo về.
  const round = ownRound ?? (state.activeRound && state.activeRound.kind === 'gift' ? state.activeRound : null);
  const { rotation, spinning, revealed, transitionMs } = useRoundPlayback(round, (finished) => {
    setPollPaused(false);
    if (ownRound?.id === finished.id) setResult(finished);
  });

  const availableGifts = useMemo(() => state.gifts.filter((g) => g.remaining > 0), [state.gifts]);
  const idleSegments: WheelSegment[] = availableGifts.map((g) => ({ id: g.id, name: g.name }));
  const segments = round ? round.pool : idleSegments;

  const handleSpin = async () => {
    if (spinning) return;
    if (!activeRecipientId) {
      toast.error(recipientMode === 'team' ? 'Chọn team nhận quà trước.' : 'Chọn người nhận quà trước.');
      return;
    }
    try {
      setPollPaused(true);
      setOwnRound(
        await actions.drawRound({ kind: 'gift', recipientId: activeRecipientId, recipientType: recipientMode }),
      );
    } catch (err) {
      setPollPaused(false);
      toast.error(apiErrorMessage(err, 'Không quay được, thử lại.'));
    }
  };

  const wonGift = result ? result.pool[result.winnerIndexes[0] ?? 0] : null;

  const closeResult = () => {
    // Bấm nút là xong khoảnh khắc công bố — cắt tiếng vỗ tay ngay thay vì để chạy hết file.
    // Không bấm gì thì cứ để nó phát tự nhiên tới hết.
    stopApplause();
    setResult(null);
    setOwnRound(null);
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

  const confirmGift = async () => {
    if (!result || !wonGift) return;
    const roundId = result.id;
    const giftName = wonGift.name;
    const nguoiNhan = recipientSubtitle;
    closeResult();
    try {
      const res: any = await actions.confirmRound(roundId, false);
      const id = res.data?.entries?.[0]?.id;
      showUndoToast(`Đã trao "${giftName}" cho ${nguoiNhan}.`, () =>
        id ? actions.deleteHistoryEntry('gifts', id) : Promise.resolve(),
      );
    } catch (err) {
      // Hay gặp nhất: người khác vừa nhận mất món quà cuối cùng — server trả lời rõ ràng.
      toast.error(apiErrorMessage(err, 'Không trao được quà, thử lại.'));
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

  const resetGifts = async () => {
    setAskReset(false);
    try {
      await actions.resetGifts();
      toast.success('Đã khôi phục số lượng quà và trạng thái nhận quà.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không khôi phục được, thử lại.'));
    }
  };

  const spinDisabled = spinning || availableGifts.length < 1 || !activeRecipientId;

  return (
    <div className="grid gap-7 lg:grid-cols-[260px_1fr]">
      <PanelCard>
        <SegToggle
          className="mb-6"
          value={recipientMode}
          onChange={changeMode}
          options={[
            { value: 'member', label: 'Cá nhân' },
            { value: 'team', label: 'Team' },
          ]}
        />

        {recipientMode === 'member' && (
          <div className="mb-5">
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

        <div className="mb-6">
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

        <div className="mb-6 flex items-baseline gap-2.5">
          <span className={counterNumberClass}>{availableGifts.length}</span>
          <span className={counterLabelClass}>loại quà còn hàng</span>
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
          Khôi phục số lượng quà
        </ActionButton>
      </PanelCard>

      <SpinWheel
        segments={segments}
        rotation={rotation}
        colorOffset={1}
        spinning={spinning}
        transitionMs={transitionMs}
        hubLabel="QUÀ"
        onSpin={handleSpin}
        spinDisabled={availableGifts.length < 1 || !activeRecipientId}
        emptyIcon={GiftIcon}
        emptyText="Chưa có quà nào còn hàng. Thêm quà ở tab Quà tặng."
      />

      <PresentationStage
        open={presenting}
        onClose={() => setPresenting(false)}
        poolCount={availableGifts.length}
        poolLabel="loại quà còn hàng"
      >
        <SpinWheel
          segments={segments}
          rotation={rotation}
          colorOffset={1}
          spinning={spinning}
          transitionMs={transitionMs}
          sizeClass="h-[min(70vh,70vw)] w-[min(70vh,70vw)]"
          hubLabel="QUÀ"
          onSpin={handleSpin}
          spinDisabled={availableGifts.length < 1 || !activeRecipientId}
          emptyIcon={GiftIcon}
          emptyText="Chưa có quà nào còn hàng."
        />
        <p className="text-[17px] text-white/50">
          Người nhận: <b className="font-semibold text-white">{recipientSubtitle}</b>
        </p>
      </PresentationStage>

      <ConfirmDialog
        open={askReset}
        title="Khôi phục toàn bộ số lượng quà?"
        description="Tồn kho mọi món quà về lại số ban đầu và xóa dấu đã nhận quà của tất cả mọi người. Lịch sử trao quà vẫn giữ nguyên."
        confirmLabel="Khôi phục"
        onConfirm={resetGifts}
        onCancel={() => setAskReset(false)}
      />

      <ResultDialog
        open={!!result}
        eyebrow="Kết quả quay quà"
        name={wonGift?.name ?? ''}
        subtitle={`Trao cho: ${recipientSubtitle}`}
        avatarUrl={recipientMode === 'member' ? state.members.find((m) => m.id === activeRecipientId)?.avatarUrl : undefined}
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
