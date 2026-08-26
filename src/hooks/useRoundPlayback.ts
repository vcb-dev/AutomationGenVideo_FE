import { useEffect, useRef, useState } from 'react';
import {
  nextSpinTarget,
  REVEAL_DELAY_MS,
  SPIN_DURATION_MS,
  SPIN_EASING,
} from '@/lib/lucky-spin/spin-rotation';
import {
  fireConfetti,
  playApplause,
  playSpinMusic,
  playTickSound,
  stopApplause,
  stopSpinMusic,
} from '@/lib/lucky-spin/spin-effects';
import { SpinRoundView } from '@/types/lucky-spin';

/** Khoảng dừng giữa hai vòng để khán giả kịp nhìn xem mũi tên chỉ vào ai. */
const REVEAL_GAP_MS = 1200;

/**
 * Quay bánh xe theo một lượt do server bốc.
 *
 * Diễn hoạt 30s liền mạch không khựng ngắt nhịp:
 * - 30% tỉ lệ: Bật ngược (vọt sang đầu ô ông B rồi quán tính hồi nhẹ lại dính ô ông A).
 * - 35% tỉ lệ: Bò chậm 12+ giây qua ô ông A rồi nhích qua vạch vào sát đầu ô ông B.
 * - 35% tỉ lệ: Bò chậm trong ô ông A và dừng ngay sát vạch cuối ô ông A.
 *
 * Dùng chung cho người điều khiển và người xem nên bánh xe mọi màn hình dừng ở cùng những ô đó.
 */
export function useRoundPlayback(round: SpinRoundView | null, onSettled?: (round: SpinRoundView) => void) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [easing, setEasing] = useState<string>(SPIN_EASING);
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
      const target = nextSpinTarget(rotationRef.current, indexes[indexes.length - 1], poolLen);
      setRotation(target.rotation);
      rotationRef.current = target.rotation;
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
      const target = nextSpinTarget(rotationRef.current, indexes[i], poolLen);
      rotationRef.current = target.rotation;

      // Kích hoạt cú quay với đường cong tương ứng
      timers.push(
        setTimeout(() => {
          setInstant(false);
          setSpinning(true);
          setEasing(target.easing);
          setRotation(target.rotation);
        }, delay),
      );

      // Âm thanh gảy kim khi lướt qua các vạch ở giai đoạn giảm tốc sâu và nhích chậm
      timers.push(
        setTimeout(() => {
          playTickSound();
        }, delay + Math.floor(SPIN_DURATION_MS * 0.40)),
      );
      timers.push(
        setTimeout(() => {
          playTickSound();
        }, delay + Math.floor(SPIN_DURATION_MS * 0.55)),
      );
      timers.push(
        setTimeout(() => {
          playTickSound();
        }, delay + Math.floor(SPIN_DURATION_MS * 0.70)),
      );
      timers.push(
        setTimeout(() => {
          playTickSound();
        }, delay + Math.floor(SPIN_DURATION_MS * 0.82)),
      );
      timers.push(
        setTimeout(() => {
          playTickSound();
        }, delay + Math.floor(SPIN_DURATION_MS * 0.90)),
      );
      timers.push(
        setTimeout(() => {
          playTickSound();
        }, delay + Math.floor(SPIN_DURATION_MS * 0.96)),
      );

      delay += SPIN_DURATION_MS;

      // Bánh xe dừng hẳn — để lặng một nhịp rồi mới công bố
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

  return {
    rotation,
    spinning,
    revealed,
    transitionMs: instant ? 0 : SPIN_DURATION_MS,
    easing: instant ? 'linear' : easing,
  };
}



