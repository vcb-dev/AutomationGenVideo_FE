'use client';

import { useEffect, useRef, useState } from 'react';
import { nextRotation, REVEAL_DELAY_MS, SPIN_DURATION_MS } from '@/lib/lucky-spin/spin-rotation';
import { fireConfetti, playApplause, playSpinMusic, stopApplause, stopSpinMusic } from '@/lib/lucky-spin/spin-effects';
import { SpinRoundView } from '@/types/lucky-spin';

/** Khoảng dừng giữa hai vòng để khán giả kịp nhìn xem mũi tên chỉ vào ai. */
const REVEAL_GAP_MS = 1100;

/**
 * Quay bánh xe theo một lượt do server bốc.
 *
 * Bốc mấy người thì quay bấy nhiêu vòng, mỗi vòng dừng ở một người. Gộp lại thành một vòng rồi
 * đọc danh sách thì khán giả không thấy được từng người trúng.
 *
 * Dùng chung cho người điều khiển và người xem nên bánh xe mọi màn hình dừng ở cùng những ô đó.
 */
export function useRoundPlayback(round: SpinRoundView | null, onSettled?: (round: SpinRoundView) => void) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  /** Đã quay xong mấy người — để hiện "đang quay người 2/3". */
  const [revealed, setRevealed] = useState(0);
  /** Bỏ animation khi cần nhảy thẳng tới kết quả (màn hình vào quá muộn). */
  const [instant, setInstant] = useState(false);

  const playedRef = useRef<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rotationRef = useRef(0);
  rotationRef.current = rotation;
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useEffect(() => {
    if (!round || playedRef.current === round.id) return;
    playedRef.current = round.id;

    const timers = timersRef.current;
    timers.forEach(clearTimeout);
    timers.length = 0;

    const poolLen = Math.max(round.pool.length, 1);
    const indexes = round.winnerIndexes.length > 0 ? round.winnerIndexes : [0];
    const perSpin = SPIN_DURATION_MS + REVEAL_GAP_MS;
    const totalMs = indexes.length * perSpin - REVEAL_GAP_MS;

    const elapsed = Date.now() - new Date(round.startedAt).getTime();

    // Màn hình vào quá muộn: chốt luôn ở người cuối, không diễn lại từ đầu.
    if (elapsed >= totalMs) {
      setInstant(true);
      setRotation((prev) => nextRotation(prev, indexes[indexes.length - 1], poolLen));
      setRevealed(indexes.length);
      settledRef.current?.(round);
      return;
    }

    setInstant(false);
    playSpinMusic(Math.max(0, totalMs - elapsed));
    setSpinning(true);
    setRevealed(Math.max(0, Math.min(indexes.length - 1, Math.floor(elapsed / perSpin))));

    let delay = 0;
    for (let i = 0; i < indexes.length; i++) {
      const isLast = i === indexes.length - 1;

      timers.push(
        setTimeout(() => {
          setSpinning(true);
          setRotation((prev) => nextRotation(prev, indexes[i], poolLen));
        }, delay),
      );
      delay += SPIN_DURATION_MS;

      // Bánh xe dừng hẳn — để lặng một nhịp rồi mới công bố, đừng nổ hết cùng lúc.
      timers.push(
        setTimeout(() => {
          setRevealed(i + 1);
          if (isLast) setSpinning(false);
        }, delay),
      );

      if (isLast) {
        timers.push(
          setTimeout(() => {
            playApplause();
            fireConfetti();
            settledRef.current?.(round);
          }, delay + REVEAL_DELAY_MS),
        );
      } else {
        delay += REVEAL_GAP_MS;
      }
    }

    return () => {
      timers.forEach(clearTimeout);
      timers.length = 0;
    };
  }, [round]);

  // Rời trang giữa lúc đang quay thì tắt hết tiếng, không để chạy nền.
  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      stopSpinMusic();
      stopApplause();
    },
    [],
  );

  return { rotation, spinning, revealed, transitionMs: instant ? 0 : SPIN_DURATION_MS };
}
