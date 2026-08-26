/**
 * Âm thanh và confetti cho vòng quay.
 *
 * Tự tổng hợp bằng Web Audio và tự vẽ confetti bằng canvas, không nạp file mp3 hay thư viện
 * ngoài — trang này đã có 2MB thư viện xlsx/jsPDF, không nên thêm nữa cho một hiệu ứng.
 * Mọi thứ đều bọc try/catch: hỏng hiệu ứng thì thôi, tuyệt đối không được làm hỏng lượt quay.
 */

const MUTE_KEY = 'vcbi_lucky_spin_muted';

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* trình duyệt chặn localStorage — bỏ qua, chỉ mất việc nhớ lựa chọn */
  }
}

let audioCtx: AudioContext | null = null;

/** Trình duyệt chỉ cho tạo AudioContext sau một thao tác thật của người dùng — gọi từ onClick. */
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function blip(at: number, freq: number, duration: number, gain: number, type: OscillatorType = 'triangle') {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(gain, at);
  vol.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(vol).connect(ac.destination);
  osc.start(at);
  osc.stop(at + duration);
}

/** Tiếng gảy kim / tạch nhẹ khi bánh xe lướt qua vạch ranh giới */
export function playTickSound() {
  if (isMuted()) return;
  try {
    const ac = ctx();
    if (!ac) return;
    blip(ac.currentTime, 520, 0.05, 0.18, 'sine');
  } catch {
    /* bỏ qua */
  }
}


const SPIN_MUSIC_URL = '/vendor/lucky-spin/spin-music.mp3';
const APPLAUSE_URL = '/vendor/lucky-spin/applause.mp3';
/** Vuốt nhỏ tiếng thay vì cắt phựt khi bánh xe dừng. */
const FADE_MS = 400;

let spinAudio: HTMLAudioElement | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;

function audio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!spinAudio) {
      spinAudio = new Audio(SPIN_MUSIC_URL);
      spinAudio.preload = 'auto';
      // Bản nhạc ngắn hơn một lượt quay thì lặp lại cho tới khi bánh xe dừng.
      spinAudio.loop = true;
    }
    return spinAudio;
  } catch {
    return null;
  }
}

let applauseAudio: HTMLAudioElement | null = null;

function applause(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!applauseAudio) {
      applauseAudio = new Audio(APPLAUSE_URL);
      applauseAudio.preload = 'auto';
    }
    return applauseAudio;
  } catch {
    return null;
  }
}

/** Tải sẵn từ lúc mở trang để lượt quay đầu tiên không bị câm mất mấy giây đầu. */
export function preloadSpinMusic() {
  audio()?.load();
  applause()?.load();
}

function clearTimers() {
  if (stopTimer) clearTimeout(stopTimer);
  if (fadeTimer) clearInterval(fadeTimer);
  stopTimer = null;
  fadeTimer = null;
}

export function stopSpinMusic() {
  const a = spinAudio;
  clearTimers();
  if (!a) return;
  try {
    const step = a.volume / Math.max(1, FADE_MS / 40);
    fadeTimer = setInterval(() => {
      a.volume = Math.max(0, a.volume - step);
      if (a.volume <= 0.01) {
        clearTimers();
        a.pause();
        a.currentTime = 0;
      }
    }, 40);
  } catch {
    /* bỏ qua */
  }
}

/**
 * Nhạc nền trong lúc bánh xe quay, tự tắt đúng lúc bánh xe dừng.
 *
 * `play()` có thể bị trình duyệt từ chối khi trang chưa có thao tác nào của người dùng — đúng
 * trường hợp người đang xem thấy lượt quay do người khác bấm. Nuốt lỗi để màn hình của họ vẫn
 * quay bình thường, chỉ là không có tiếng.
 */
export function playSpinMusic(durationMs: number) {
  if (isMuted()) return;
  const a = audio();
  if (!a) return;
  try {
    clearTimers();
    stopApplause();
    a.volume = 0.85;
    a.currentTime = 0;
    void a.play().catch(() => undefined);
    stopTimer = setTimeout(() => stopSpinMusic(), Math.max(0, durationMs - FADE_MS));
  } catch {
    /* bỏ qua */
  }
}

/**
 * Tiếng vỗ tay khi công bố người trúng.
 *
 * Nhạc nền bị tắt trước để hai file không chồng lên nhau — khoảnh khắc công bố phải sạch tiếng.
 */
export function playApplause() {
  if (isMuted()) return;
  stopSpinMusic();
  const a = applause();
  if (!a) return;
  try {
    a.volume = 0.9;
    a.currentTime = 0;
    void a.play().catch(() => undefined);
  } catch {
    /* bỏ qua */
  }
}

/** Dừng tiếng vỗ tay khi bắt đầu lượt mới, tránh chồng lên nhạc nền. */
export function stopApplause() {
  try {
    if (applauseAudio) {
      applauseAudio.pause();
      applauseAudio.currentTime = 0;
    }
  } catch {
    /* bỏ qua */
  }
}

const CONFETTI_COLORS = ['#F4B63D', '#E9A616', '#22C55E', '#3B6FD9', '#D44876', '#8B5CC6'];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
}

/** Confetti rơi từ mép trên, tự dọn canvas khi hết. */
export function fireConfetti(durationMs = 2600) {
  if (typeof document === 'undefined') return;
  try {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:95';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const c = canvas.getContext('2d');
    if (!c) {
      canvas.remove();
      return;
    }

    const pieces: Piece[] = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 2 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.22,
      w: 6 + Math.random() * 6,
      h: 9 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      c.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.02; // trọng lực nhẹ
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.globalAlpha = Math.max(0, 1 - elapsed / durationMs);
        c.fillStyle = p.color;
        c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        c.restore();
      }

      if (elapsed < durationMs) requestAnimationFrame(tick);
      else canvas.remove();
    };
    requestAnimationFrame(tick);
  } catch {
    /* bỏ qua */
  }
}
