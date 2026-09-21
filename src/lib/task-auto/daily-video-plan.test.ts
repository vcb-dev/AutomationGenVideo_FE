import { buildDailyVideoPlan, CONTENT_LINES } from './daily-video-plan'

describe('buildDailyVideoPlan', () => {
  it('chia đều KPI còn thiếu và giữ Chủ nhật trong bảng dưới dạng ngày nghỉ', () => {
    const plan = buildDailyVideoPlan({
      monthlyTarget: 100,
      completed: 72,
      month: '2026-09',
      contentLineTargets: { A1: 40, A2: 30, A3: 20, A4: 10, A5: 0 },
      now: new Date('2026-09-15T05:00:00.000Z'),
    })

    expect(plan.remaining).toBe(28)
    expect(plan.workingDays).toBe(14)
    expect(plan.averagePerDay).toBe(2)
    expect(plan.items).toHaveLength(16)
    expect(plan.items[0]).toMatchObject({ date: '2026-09-15', target: 2, isToday: true, isRestDay: false })
    expect(plan.items.filter(item => item.isRestDay).map(item => item.date)).toEqual(['2026-09-20', '2026-09-27'])
    expect(plan.items.filter(item => item.isRestDay).every(item => item.target === 0)).toBe(true)
    expect(plan.items.reduce((sum, item) => sum + item.target, 0)).toBe(28)
  })

  it('giữ tổng từng hàng và từng cột A1–A5 khớp chính xác', () => {
    const plan = buildDailyVideoPlan({
      monthlyTarget: 77,
      completed: 50,
      month: '2026-09',
      contentLineTargets: { A1: 30, A2: 20, A3: 10, A4: 12, A5: 5 },
      now: new Date('2026-09-15T05:00:00.000Z'),
    })

    for (const item of plan.items) {
      expect(CONTENT_LINES.reduce((sum, line) => sum + item.lineTargets[line], 0)).toBe(item.target)
    }
    for (const line of CONTENT_LINES) {
      expect(plan.items.reduce((sum, item) => sum + item.lineTargets[line], 0)).toBe(plan.lineTotals[line])
    }
    expect(Object.values(plan.lineTotals).reduce((sum, value) => sum + value, 0)).toBe(27)
  })

  it('bắt đầu bằng dòng Nghỉ nếu hôm nay là Chủ nhật', () => {
    const plan = buildDailyVideoPlan({
      monthlyTarget: 10,
      completed: 0,
      month: '2026-09',
      now: new Date('2026-09-20T05:00:00.000Z'),
    })

    expect(plan.items[0]).toMatchObject({ date: '2026-09-20', target: 0, isRestDay: true, isToday: true })
    expect(plan.items[1]).toMatchObject({ date: '2026-09-21', isRestDay: false })
  })

  it('trả về mục tiêu 0 cho các ngày còn lại khi đã đạt KPI', () => {
    const plan = buildDailyVideoPlan({
      monthlyTarget: 20,
      completed: 25,
      month: '2026-09',
      now: new Date('2026-09-15T05:00:00.000Z'),
    })

    expect(plan.remaining).toBe(0)
    expect(plan.items.every(item => item.target === 0)).toBe(true)
  })
})
