'use client'

import {
  Users, XCircle, CheckCircle2, Send, Activity, FileText, Package,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { ProductVideoStats } from '@/lib/api/task-auto'
import { KpiProgress } from './KpiProgress'
import { DashboardCard, KpiTile, SectionHeader, StatusDonut, MonthPacingHint } from './DashboardUI'
import { VideoByLineCard } from './VideoByLineCard'
import { ContentByClassificationCard } from './ContentByClassificationCard'
import { ProductVideoBreakdownCard } from './ProductVideoBreakdownCard'
import { TONE, CATEGORY, rateTone, type Tone } from './tokens'

const TASKS_HREF = '/dashboard/task-auto/tasks'

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `tháng ${m}/${y}`
}

// ─── Hiệu suất trong kỳ ──────────────────────────────────────────────────────

function TeamPerformanceTiles({ tasks, members, focusName }: {
  tasks: any; members: any[]
  /** Đang lọc 1 thành viên — "Đang hoạt động x/1" vô nghĩa nên đổi sang số task đang làm. */
  focusName?: string
}) {
  const total     = tasks.total ?? 0
  const approved  = tasks.approved ?? 0
  const rejected  = tasks.rejected ?? 0
  const submitted = tasks.submitted ?? 0
  const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0
  const activeMembers  = members.filter(m => (m.in_progress + m.submitted + (m.pending ?? 0)) > 0).length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiTile
        label="Tỷ lệ hoàn thành" value={`${completionRate}%`} icon={CheckCircle2} tone="success"
        hint={`${approved}/${total} task đã duyệt`}
        progress={completionRate} progressTone={rateTone(completionRate)}
      />
      <KpiTile
        label="Chờ bạn duyệt" value={submitted} icon={Send} tone="violet"
        alert={submitted > 0}
        hint={submitted > 0 ? 'Mở danh sách để duyệt' : 'Không có task chờ duyệt'}
        href={TASKS_HREF}
      />
      <KpiTile
        label="Bị từ chối" value={rejected} icon={XCircle} tone="danger"
        alert={rejected > 0}
        hint={rejected > 0 ? (focusName ? `Nhắc ${focusName} sửa và nộp lại` : 'Nhắc thành viên sửa và nộp lại') : 'Không có task bị từ chối'}
      />
      {focusName ? (
        <KpiTile
          label="Đang làm" value={tasks.in_progress ?? 0} icon={Activity} tone="warning"
          hint="Task đang thực hiện"
        />
      ) : (
        <KpiTile
          label="Thành viên đang làm" value={`${activeMembers}/${members.length}`} icon={Activity} tone="brand"
          hint="Có task chờ, đang làm hoặc đã nộp"
        />
      )}
    </div>
  )
}

// ─── KPI tháng ───────────────────────────────────────────────────────────────

function KpiTargetRow({ icon: Icon, label, value, category }: {
  icon: any; label: string; value: number; category: keyof typeof CATEGORY
}) {
  const c = CATEGORY[category]
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', c.bg, c.text)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="flex-1 text-sm text-slate-600">{label}</span>
      <span className="text-sm text-slate-500">
        <span className="text-base font-bold tabular-nums text-slate-900">{value ?? 0}</span> mục tiêu
      </span>
    </div>
  )
}

function TeamKpiCard({ kpi, focusName }: { kpi: any; focusName?: string }) {
  return (
    <DashboardCard
      title={focusName ? `KPI của ${focusName}` : 'KPI cả team'}
      subtitle={`Tính theo ${formatMonth(kpi.month)}, không theo bộ lọc ngày`}
      action={{ href: '/dashboard/task-auto/kpi', label: 'Xem KPI' }}
      className="flex flex-col"
    >
      <div className="flex flex-1 flex-col gap-4 px-5 py-5">
        <KpiProgress completed={kpi.completed} total_target={kpi.total_target} />
        <MonthPacingHint
          completed={kpi.completed} target={kpi.total_target}
          achievedLabel={focusName ? `${focusName} đã đạt KPI tháng này!` : 'Team đã đạt KPI tháng này!'}
        />
        <div className="mt-auto divide-y divide-slate-100 border-t border-slate-100">
          <KpiTargetRow icon={FileText} label="Content mới" value={kpi.content_new ?? 0} category="content" />
          <KpiTargetRow icon={Package} label="Sản phẩm GMV" value={kpi.product_gmv ?? 0} category="product" />
        </div>
      </div>
    </DashboardCard>
  )
}

// ─── Bảng thành viên ─────────────────────────────────────────────────────────

const KPI_LEVEL: { min: number; tone: Tone; label: string }[] = [
  { min: 70, tone: 'success', label: 'Tốt' },
  { min: 40, tone: 'warning', label: 'Cần cố gắng' },
  { min: 0,  tone: 'danger',  label: 'Chậm' },
]

function MemberKpiCell({ approved, kpiTarget }: { approved: number; kpiTarget: number }) {
  if (!kpiTarget) return <span className="text-xs text-slate-400">Chưa đặt KPI</span>
  const pct = Math.min(100, Math.round((approved / kpiTarget) * 100))
  const level = KPI_LEVEL.find(l => pct >= l.min) ?? KPI_LEVEL[KPI_LEVEL.length - 1]
  const t = TONE[level.tone]

  return (
    <div className="min-w-[180px]">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="tabular-nums text-slate-500">
          <span className="font-bold text-slate-900">{approved}</span>/{kpiTarget}
          <span className="ml-1 text-slate-400">· {pct}%</span>
        </span>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', t.bg, t.text)}>{level.label}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div className={cn('h-full rounded-full transition-[width] duration-500', t.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CountCell({ value, tone }: { value: number; tone?: Tone }) {
  if (value <= 0) return <span className="text-slate-300" aria-label="0">–</span>
  if (tone) {
    const t = TONE[tone]
    return <span className={cn('inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums', t.bg, t.text)}>{value}</span>
  }
  return <span className="text-sm font-semibold tabular-nums text-slate-800">{value}</span>
}

const MEMBER_COLS: { key: string; label: string; tone?: Tone }[] = [
  { key: 'pending',     label: 'Chờ xử lý' },
  { key: 'in_progress', label: 'Đang làm' },
  { key: 'submitted',   label: 'Đã nộp', tone: 'violet' },
  { key: 'approved',    label: 'Đã duyệt' },
  { key: 'rejected',    label: 'Từ chối', tone: 'danger' },
]

function MembersTable({ members, className }: { members: any[]; className?: string }) {
  return (
    <DashboardCard
      title={`Thành viên (${members.length})`}
      subtitle="Số task trong kỳ đã chọn · KPI tính theo tháng"
      action={{ href: '/dashboard/task-auto/teams', label: 'Quản lý' }}
      className={className}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {/* Cột tên dính trái — trên màn hẹp bảng cuộn ngang mà vẫn biết đang xem dòng của ai */}
              <th scope="col" className="sticky left-0 z-10 bg-slate-50 px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Thành viên</th>
              {MEMBER_COLS.map(c => (
                <th key={c.key} scope="col" className="whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold text-slate-500">{c.label}</th>
              ))}
              <th scope="col" className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">KPI tháng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.length === 0 ? (
              <tr>
                <td colSpan={MEMBER_COLS.length + 2} className="py-12 text-center text-sm text-slate-500">
                  <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden />
                  Chưa có thành viên
                </td>
              </tr>
            ) : members.map((m: any) => (
              <tr key={m.user_id} className="group transition-colors hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white px-5 py-3 transition-colors group-hover:bg-slate-50">
                  <div className="flex items-center gap-3" title={m.email}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700" aria-hidden>
                      {m.full_name?.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <p className="max-w-[180px] truncate font-semibold text-slate-800">{m.full_name}</p>
                  </div>
                </td>
                {MEMBER_COLS.map(c => (
                  <td key={c.key} className="px-3 py-3 text-center">
                    <CountCell value={m[c.key] ?? 0} tone={c.tone} />
                  </td>
                ))}
                <td className="px-5 py-3">
                  <MemberKpiCell approved={m.kpi_completed} kpiTarget={m.kpi_target} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  )
}

// ─── TeamDashboard ────────────────────────────────────────────────────────────

export function TeamDashboard({ d, productStats, trafficCard }: {
  d: any
  /** Tải riêng qua GET /task-auto/product-video-stats (xem page.tsx) — undefined khi đang tải lần đầu. */
  productStats?: ProductVideoStats
  /** Biểu đồ "Traffic theo ngày" (TrafficTrendCard) — page.tsx dựng sẵn theo bộ lọc ngày/thành viên. */
  trafficCard?: ReactNode
}) {
  const tasks: any    = d.tasks ?? { total: 0 }
  const members: any[] = d.members ?? []
  const kpi = d.kpi
  // Dropdown "Thành viên" ở page.tsx — BE đã thu hẹp mọi số liệu về người này, chỉ cần đổi nhãn.
  const focusName: string | undefined = d.focus_member?.full_name || undefined
  const scopeName: string | undefined = focusName ?? d.team?.name

  return (
    <div className="space-y-8">

      {/* ── Hiệu suất trong kỳ ── */}
      <section aria-label="Hiệu suất trong kỳ">
        <SectionHeader title="Hiệu suất trong kỳ" description={`${scopeName ?? 'Team'} · task có hạn chót trong kỳ đã chọn`} />
        <TeamPerformanceTiles tasks={tasks} members={members} focusName={focusName} />
      </section>

      {/* ── Traffic theo ngày ── */}
      {trafficCard && (
        <section aria-label="Traffic theo ngày">
          <SectionHeader title="Traffic" description={`${scopeName ?? 'Team'} · theo báo cáo traffic hằng ngày`} />
          {trafficCard}
        </section>
      )}

      {/* ── KPI & thành viên ── */}
      <section aria-label="KPI và thành viên">
        <SectionHeader title={focusName ? 'KPI & tiến độ cá nhân' : 'KPI & thành viên'} description="Ai đang chậm KPI, ai có task cần xử lý" />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {kpi && <TeamKpiCard kpi={kpi} focusName={focusName} />}
          <MembersTable members={members} className={kpi ? 'xl:col-span-2' : 'xl:col-span-3'} />
        </div>
      </section>

      {/* ── Nhiệm vụ & video ── */}
      <section aria-label="Nhiệm vụ và video">
        <SectionHeader title="Nhiệm vụ & video" description={scopeName} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <DashboardCard
            title="Phân bố trạng thái"
            subtitle="Theo hạn chót trong kỳ"
            action={{ href: TASKS_HREF, label: 'Xem task' }}
            className="flex flex-col lg:col-span-2"
          >
            <div className="p-5 flex-1 flex flex-col justify-center">
              <StatusDonut tasks={tasks} size="md" layout="row" />
            </div>
          </DashboardCard>
          {/* Theo đúng bộ lọc ngày, không khoá cứng theo tháng KPI; cột mờ = mục tiêu KPI theo tuyến */}
          <VideoByLineCard
            data={d.video_by_line}
            subtitle="Video đã duyệt so với mục tiêu KPI theo tuyến"
            className="lg:col-span-3"
          />
        </div>
      </section>

      {/* ── Sản phẩm & content — như màn Admin, thu hẹp về đúng team/thành viên này ── */}
      <section aria-label="Sản phẩm và content">
        <SectionHeader title="Sản phẩm & content" description="Video đã duyệt, phân loại content và sản phẩm được làm video trong kỳ" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          <VideoByLineCard
            data={(productStats?.video_by_product_line ?? []).map(p => ({ line: p.category, count: p.count }))}
            title="Video theo dòng sản phẩm"
            subtitle="GMV · Traffic · Profit"
            itemLabel="Dòng" unitLabel="video đã duyệt"
            emptyLabel="Chưa có video nào được duyệt theo dòng sản phẩm"
          />
          <ContentByClassificationCard data={d.content_by_classification} subtitle={scopeName ?? 'Team'} />
          <ProductVideoBreakdownCard
            byProduct={productStats?.products_with_video_list ?? []}
            byLine={productStats?.products_with_video_by_line ?? []}
            total={productStats?.products_with_video ?? 0}
            scopeLabel={scopeName ?? 'Team'}
          />
        </div>
      </section>

    </div>
  )
}
