// Phát 1 tiếng "ting" ngắn bằng Web Audio API khi có thông báo mới lúc tab đang mở.
// Dùng oscillator thay vì file mp3 để khỏi phải quản lý asset — chỉ cần chạy trong browser.
let audioCtx: AudioContext | null = null

export function playNotificationSound() {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!audioCtx) audioCtx = new Ctx()
    // Trình duyệt tự suspend AudioContext nếu chưa có tương tác người dùng nào trên trang.
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})

    const ctx = audioCtx
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(660, now + 0.12)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.3)
  } catch {
    // Âm thanh chỉ là phụ trợ — không được làm hỏng luồng nhận thông báo chính.
  }
}
