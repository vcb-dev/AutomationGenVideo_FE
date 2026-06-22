'use client'

import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2, AlertTriangle, Clock, Flame, ArrowRight, 
  Video, FileText, Package, Zap, Sparkles, Target, Trophy
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getTasks } from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import type { Task, TaskStatus } from '@/types/task-auto'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `Tháng ${m}/${y}`
}

function isOverdue(task: Task) {
  if (!task.deadline) return false
  if (['APPROVED', 'CANCELLED'].includes(task.status)) return false
  return new Date(task.deadline) < new Date()
}

function getDeadlineLabel(deadline: string | null) {
  if (!deadline) return null
  const d = new Date(deadline)
  const diffMs = d.getTime() - Date.now()
  const diffH = Math.floor(diffMs / 3_600_000)
  const diffM = Math.floor(diffMs / 60_000)
  if (diffMs < 0) {
    const h = Math.abs(diffH)
    return { text: h > 0 ? `Quá ${h}h` : `Quá ${Math.abs(diffM)}p`, danger: true }
  }
  if (diffH < 1) return { text: `Còn ${diffM}p`, danger: true }
  if (diffH < 4) return { text: `Còn ${diffH}h`, danger: true }
  if (diffH < 12) return { text: `Còn ${diffH}h`, danger: false }
  return { text: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), danger: false }
}

function getGreeting(hour: number, completionPercent: number) {
  let period = ''
  if (hour < 12) period = 'sáng'
  else if (hour < 17) period = 'chiều'
  else period = 'tối'

  let encouragement = ''
  if (completionPercent === 100) encouragement = ' 🎉 Hoàn thành ngày hôm nay rồi!'
  else if (completionPercent >= 70) encouragement = ' 💪 Gần hoàn thành rồi!'
  else if (completionPercent >= 50) encouragement = ' 🔥 Tiếp tục cố gắng!'
  else if (completionPercent >= 30) encouragement = ' 💼 Hãy bắt đầu!'
  else encouragement = ' ⏰ Hôm nay có task chờ xử lý'

  return `Chào ${period}${encouragement}`
}

const STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Chờ xử lý', color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock },
  ASSIGNED: { label: 'Đã giao', color: 'text-blue-500', bg: 'bg-blue-100', icon: CheckCircle2 },
  IN_PROGRESS: { label: 'Đang làm', color: 'text-amber-500', bg: 'bg-amber-100', icon: Zap },
  SUBMITTED: { label: 'Đã nộp', color: 'text-violet-500', bg: 'bg-violet-100', icon: CheckCircle2 },
  APPROVED: { label: 'Đã duyệt', color: 'text-emerald-500', bg: 'bg-emerald-100', icon: CheckCircle2 },
  REJECTED: { label: 'Từ chối', color: 'text-red-500', bg: 'bg-red-100', icon: AlertTriangle },
  CANCELLED: { label: 'Đã hủy', color: 'text-slate-400', bg: 'bg-slate-100', icon: Clock },
}

// ─── AnimatedCircleProgress ─────────────────────────────────────────────────

function AnimatedCircleProgress({ 
  percentage, 
  done,
  total,
  size = 240
}: { 
  percentage: number
  done: number
  total: number
  size?: number
}) {
  const radius = size / 2 - 20
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  const getGradientId = () => {
    if (percentage === 100) return '#gradGreen'
    if (percentage >= 70) return '#gradBlue'
    if (percentage >= 40) return '#gradPurple'
    return '#gradOrange'
  }

  return (
    <svg width={size} height={size} className="drop-shadow-sm" style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.08))' }}>
      <defs>
        <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="gradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="12"
      />
      
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={getGradientId()}
        strokeWidth="12"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1500 ease-out"
        style={{ transformOrigin: `${size / 2}px ${size / 2}px`, transform: 'rotateZ(-90deg)' }}
      />
    </svg>
  )
}

// ─── QuickStat ─────────────────────────────────────────────────────────────

function QuickStat({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string
  value: number
  icon: any
  color: string 
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-3 py-4 bg-white rounded-xl border border-slate-200 transition-all hover:border-slate-300 hover:shadow-md flex-1">
      <div className={cn('p-3 rounded-lg', color.replace('text-', 'bg-').replace('500', '100'))}>
        <Icon className={cn('w-5 h-5', color)} strokeWidth={2.5} />
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-black text-slate-900 leading-none mt-1">{value}</p>
      </div>
    </div>
  )
}

// ─── TaskRowCompact ────────────────────────────────────────────────────────

function TaskRowCompact({ task }: { task: Task }) {
  const cfg = STATUS_CFG[task.status]
  const overdue = isOverdue(task)
  const dl = getDeadlineLabel(task.deadline)
  const title = task.content?.title || task.product?.name || `Task #${task.id.slice(-6)}`
  const StatusIcon = cfg.icon

  return (
    <Link
      href={`/dashboard/task-auto/tasks?id=${task.id}`}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200',
        overdue
          ? 'bg-red-50 border-red-200 hover:border-red-300 hover:shadow-md hover:bg-red-50'
          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md hover:bg-slate-50'
      )}
    >
      {/* Status indicator */}
      <StatusIcon className={cn('w-4 h-4 flex-shrink-0', cfg.color)} strokeWidth={2} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold truncate', overdue ? 'text-red-700' : 'text-slate-800')}>
          {title}
        </p>
        <p className={cn('text-xs font-medium mt-0.5', cfg.color)}>
          {cfg.label}
        </p>
      </div>

      {/* Deadline badge */}
      {dl && (
        <span className={cn(
          'text-xs font-bold px-2.5 py-1 rounded-md flex-shrink-0 whitespace-nowrap',
          dl.danger 
            ? 'bg-red-100 text-red-600' 
            : 'bg-blue-100 text-blue-600'
        )}>
          {dl.text}
        </span>
      )}

      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
    </Link>
  )
}

// ─── DailyProgress ─────────────────────────────────────────────────────────

function DailyProgress({ userId }: { userId: string }) {
  const today = new Date().toISOString().split('T')[0]
  const hour = new Date().getHours()

  const { data: todayData } = useQuery({
    queryKey: ['task-auto', 'tasks-today', userId, today],
    queryFn: () => getTasks({ assignee_id: userId, deadline_date: today, limit: 30 }),
    enabled: !!userId,
    refetchInterval: 60_000,
  })

  const { data: inProgressData } = useQuery({
    queryKey: ['task-auto', 'tasks-inprogress', userId],
    queryFn: () => getTasks({ assignee_id: userId, status: 'IN_PROGRESS', limit: 20 }),
    enabled: !!userId,
    refetchInterval: 60_000,
  })

  const seenIds = new Set<string>()
  const merged: Task[] = []
  for (const t of [...(todayData?.data ?? []), ...(inProgressData?.data ?? [])]) {
    if (!seenIds.has(t.id)) {
      seenIds.add(t.id)
      merged.push(t)
    }
  }

  const ORDER: Record<TaskStatus, number> = {
    REJECTED: 0, IN_PROGRESS: 1, ASSIGNED: 2, PENDING: 3, SUBMITTED: 4, APPROVED: 5, CANCELLED: 6,
  }
  const sorted = [...merged].sort((a, b) => {
    const aO = isOverdue(a) ? -1 : 0
    const bO = isOverdue(b) ? -1 : 0
    if (aO !== bO) return aO - bO
    return (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9)
  })

  const done = merged.filter(t => ['APPROVED', 'SUBMITTED'].includes(t.status)).length
  const total = merged.filter(t => t.status !== 'CANCELLED').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const overdueCnt = merged.filter(isOverdue).length

  const greeting = getGreeting(hour, pct)
  const topTasks = sorted.slice(0, 5)
  
  // Split greeting text for highlighting
  const greetingParts = greeting.split(' ')
  const mainGreeting = `${greetingParts[0]} ${greetingParts[1]}`
  const encouragement = greetingParts.slice(2).join(' ')

  return (
    <div className="space-y-8">
      {/* Greeting Section */}
      <div className="space-y-2">
        {/* <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight">
          Chào <span className="text-blue-600">{greetingParts[1]}</span>
        </h1> */}
        <p className="text-sm text-slate-600 flex items-center gap-2">
          {greeting.includes('🎉') && <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          {greeting.includes('💪') && <Zap className="w-4 h-4 text-blue-500 flex-shrink-0" />}
          {greeting.includes('🔥') && <Flame className="w-4 h-4 text-red-500 flex-shrink-0" />}
          {greeting.includes('💼') && <Target className="w-4 h-4 text-slate-500 flex-shrink-0" />}
          {greeting.includes('⏰') && <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          <span className="font-medium">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </p>
      </div>

      {/* Hero: Progress Circle */}
      <div className="flex flex-col items-center gap-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl border border-slate-200 p-8 sm:p-12">
        <div className="relative">
          <AnimatedCircleProgress percentage={pct} done={done} total={total} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-black text-slate-900">{pct}%</p>
            <p className="text-xs font-semibold text-slate-500 mt-2">hoàn thành</p>
          </div>
        </div>

        <div className="text-center space-y-3">
          <p className="text-xl font-bold text-slate-800">
            <span className="text-blue-600 text-2xl">{done}</span> <span className="text-slate-400">/</span> <span className="text-slate-500 text-lg">{total}</span> task
          </p>
          {overdueCnt > 0 && (
            <p className="text-sm text-red-600 font-semibold flex items-center justify-center gap-1.5">
              <Flame className="w-4 h-4" /> {overdueCnt} task quá hạn
            </p>
          )}
          {pct === 100 && total > 0 && (
            <p className="text-sm text-emerald-600 font-semibold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Hoàn thành xuất sắc! 🏆
            </p>
          )}
        </div>

        <Link
          href="/dashboard/task-auto/tasks"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all hover:shadow-lg"
        >
          Xem tất cả task <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Stats */}
      {total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickStat label="Đang làm" value={merged.filter(t => t.status === 'IN_PROGRESS').length} icon={Zap} color="text-amber-500" />
          <QuickStat label="Đã nộp" value={merged.filter(t => t.status === 'SUBMITTED').length} icon={CheckCircle2} color="text-violet-500" />
          <QuickStat label="Đã duyệt" value={done} icon={CheckCircle2} color="text-emerald-500" />
          <QuickStat label="Chờ xử lý" value={merged.filter(t => t.status === 'PENDING' || t.status === 'ASSIGNED').length} icon={Clock} color="text-slate-500" />
        </div>
      )}

      {/* Task List */}
      {topTasks.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Task ưu tiên hôm nay
            </h3>
            {topTasks.length < sorted.length && (
              <Link href="/dashboard/task-auto/tasks" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Xem {sorted.length - topTasks.length} task khác →
              </Link>
            )}
          </div>
          <div className="space-y-2.5">
            {topTasks.map(task => (
              <TaskRowCompact key={task.id} task={task} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-emerald-50 rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          <div className="text-center">
            <p className="font-bold text-emerald-900 text-lg">Không có task hôm nay!</p>
            <p className="text-sm text-emerald-700 mt-1">Hoàn thành xuất sắc! Thư giãn hoặc nhận thêm task mới.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── KPICard ──────────────────────────────────────────────────────────────

function KPICard({ kpi }: { kpi: any }) {
  if (!kpi) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 bg-slate-50 rounded-xl border border-slate-200">
        <Target className="w-12 h-12 text-slate-200" />
        <div className="text-center">
          <p className="font-bold text-slate-600">Chưa có KPI tháng này</p>
          <p className="text-sm text-slate-500 mt-1">Liên hệ Leader để được đặt KPI</p>
        </div>
      </div>
    )
  }

  const kpiPct = kpi?.total_target > 0
    ? Math.min(100, Math.round((kpi.completed / kpi.total_target) * 100))
    : 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">KPI cá nhân</p>
          <h3 className="text-xl font-black text-slate-900">{formatMonth(kpi.month)}</h3>
        </div>
        <Link
          href="/dashboard/task-auto/kpi"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          Chi tiết <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-600">Tiến độ</span>
          <span className="text-2xl font-black text-blue-600">{kpiPct}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
            style={{ width: `${kpiPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          <span className="font-bold text-slate-700">{kpi.completed}</span> / {kpi.total_target} task
        </p>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-100">
          <p className="text-xs font-semibold text-orange-700 mb-1">Video Win</p>
          <p className="text-lg font-black text-orange-600">{kpi.video_win ?? 0}</p>
        </div>
        <div className="bg-violet-50 rounded-lg p-3 text-center border border-violet-100">
          <p className="text-xs font-semibold text-violet-700 mb-1">Content</p>
          <p className="text-lg font-black text-violet-600">{kpi.content_new ?? 0}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
          <p className="text-xs font-semibold text-emerald-700 mb-1">Sản phẩm</p>
          <p className="text-lg font-black text-emerald-600">{kpi.product_planned ?? 0}</p>
        </div>
      </div>
    </div>
  )
}

// ─── PersonalDashboard ──────────────────────────────────────────────────────

export function PersonalDashboard({ d }: { d: any }) {
  const { user } = useAuthStore()
  const kpi = d.kpi

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Daily Progress - 2/3 width */}
        <div className="lg:col-span-2">
          {user?.id && <DailyProgress userId={user.id} />}
        </div>

        {/* Right: KPI + Stats - 1/3 width */}
        <div className="space-y-6">
          <KPICard kpi={kpi} />

          {/* Overall Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Tổng quan</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">Tổng task</span>
                <span className="font-black text-slate-900 text-lg">{d.tasks?.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">Đến hạn hôm nay</span>
                <span className="font-black text-blue-600 text-lg">{d.today_deadline ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">Quá hạn</span>
                <span className="font-black text-red-600 text-lg">{d.overdue ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}