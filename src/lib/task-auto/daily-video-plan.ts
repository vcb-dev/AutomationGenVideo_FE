export const CONTENT_LINES = ['A1', 'A2', 'A3', 'A4', 'A5'] as const

export type ContentLine = typeof CONTENT_LINES[number]
export type DailyLineTargets = Record<ContentLine, number>

export interface DailyVideoPlanItem {
  date: string
  day: number
  weekday: number
  target: number
  lineTargets: DailyLineTargets
  isToday: boolean
  isRestDay: boolean
}

export interface DailyVideoPlan {
  remaining: number
  workingDays: number
  averagePerDay: number
  lineTotals: DailyLineTargets
  items: DailyVideoPlanItem[]
}

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

function emptyLineTargets(): DailyLineTargets {
  return { A1: 0, A2: 0, A3: 0, A4: 0, A5: 0 }
}

function vietnamDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value ?? 0)

  return { year: get('year'), month: get('month'), day: get('day') }
}

function apportionLineTotals(total: number, requestedWeights?: Partial<DailyLineTargets>): DailyLineTargets {
  const rawWeights = CONTENT_LINES.map(line => Math.max(0, requestedWeights?.[line] ?? 0))
  const hasConfiguredWeights = rawWeights.some(value => value > 0)
  const weights = hasConfiguredWeights ? rawWeights : CONTENT_LINES.map(() => 1)
  const weightTotal = weights.reduce((sum, value) => sum + value, 0)
  const exact = weights.map(value => total * value / weightTotal)
  const values = exact.map(Math.floor)
  const remainder = total - values.reduce((sum, value) => sum + value, 0)

  const remainderOrder = CONTENT_LINES.map((_, index) => index).sort(
    (a, b) => (exact[b] - values[b]) - (exact[a] - values[a]) || a - b,
  )
  for (let index = 0; index < remainder; index += 1) {
    values[remainderOrder[index]] += 1
  }

  return Object.fromEntries(CONTENT_LINES.map((line, index) => [line, values[index]])) as DailyLineTargets
}

function buildBalancedLineSequence(lineTotals: DailyLineTargets): ContentLine[] {
  const total = CONTENT_LINES.reduce((sum, line) => sum + lineTotals[line], 0)
  if (total === 0) return []

  const current = emptyLineTargets()
  const sequence: ContentLine[] = []

  for (let slot = 0; slot < total; slot += 1) {
    for (const line of CONTENT_LINES) current[line] += lineTotals[line]
    const selected = CONTENT_LINES.reduce((best, line) => current[line] > current[best] ? line : best)
    sequence.push(selected)
    current[selected] -= total
  }

  return sequence
}

export function buildDailyVideoPlan({
  monthlyTarget,
  completed,
  month,
  contentLineTargets,
  now = new Date(),
}: {
  monthlyTarget: number
  completed: number
  month: string
  contentLineTargets?: Partial<DailyLineTargets>
  now?: Date
}): DailyVideoPlan {
  const [year, monthNumber] = month.split('-').map(Number)
  const remaining = Math.max(0, Math.trunc(monthlyTarget) - Math.trunc(completed))
  const emptyResult: DailyVideoPlan = {
    remaining,
    workingDays: 0,
    averagePerDay: 0,
    lineTotals: emptyLineTargets(),
    items: [],
  }

  if (!year || monthNumber < 1 || monthNumber > 12) return emptyResult

  const today = vietnamDateParts(now)
  const requestedMonth = year * 12 + monthNumber
  const currentMonth = today.year * 12 + today.month

  if (requestedMonth < currentMonth) return emptyResult

  const firstDay = requestedMonth === currentMonth ? today.day : 1
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const baseDates: Omit<DailyVideoPlanItem, 'target' | 'lineTargets'>[] = []

  for (let day = firstDay; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay()
    baseDates.push({
      date: `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      day,
      weekday,
      isToday: requestedMonth === currentMonth && day === today.day,
      isRestDay: weekday === 0,
    })
  }

  const workingDays = baseDates.filter(date => !date.isRestDay).length
  if (workingDays === 0) {
    return {
      ...emptyResult,
      items: baseDates.map(date => ({ ...date, target: 0, lineTargets: emptyLineTargets() })),
    }
  }

  const baseDailyTarget = Math.floor(remaining / workingDays)
  let extraDays = remaining % workingDays
  const dailyTargets = baseDates.map(date => {
    if (date.isRestDay) return 0
    const target = baseDailyTarget + (extraDays > 0 ? 1 : 0)
    if (extraDays > 0) extraDays -= 1
    return target
  })

  const lineTotals = apportionLineTotals(remaining, contentLineTargets)
  const lineSequence = buildBalancedLineSequence(lineTotals)
  let sequenceIndex = 0
  const items = baseDates.map((date, dateIndex) => {
    const target = dailyTargets[dateIndex]
    const lineTargets = emptyLineTargets()
    for (let slot = 0; slot < target; slot += 1) {
      lineTargets[lineSequence[sequenceIndex]] += 1
      sequenceIndex += 1
    }
    return { ...date, target, lineTargets }
  })

  return {
    remaining,
    workingDays,
    averagePerDay: remaining / workingDays,
    lineTotals,
    items,
  }
}
