'use client'

import { CheckCircle2, XCircle, Send, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ProductVideoStats } from '@/lib/api/task-auto'
import { DashboardCard, KpiTile, LiveAlertTiles, SectionHeader, StatusDonut } from './DashboardUI'
import { VideoByLineCard } from './VideoByLineCard'
import { ProductVideoBreakdownCard } from './ProductVideoBreakdownCard'
import { rateTone } from './tokens'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GlobalData {
  tasks:              Record<string, number> & { total: number }
  today_deadline:     number
  overdue:             number
  monthly_completed:  number
  video_by_line:       { line: string; count: number }[]
}

export function buildGlobal(d: any): GlobalData {
  return {
    tasks:              d.tasks              ?? { total: 0 },
    today_deadline:      d.today_deadline      ?? 0,
    overdue:             d.overdue             ?? 0,
    monthly_completed:   d.monthly_completed   ?? 0,
    video_by_line:       d.video_by_line       ?? [],
  }
}

const TASKS_HREF = '/dashboard/task-auto/tasks'

// ─── Hiệu suất trong kỳ ──────────────────────────────────────────────────────

function PerformanceTiles({ tasks }: { tasks: GlobalData['tasks'] }) {
  const total          = tasks.total ?? 0
  const cancelled      = tasks.cancelled ?? 0
  const approved       = tasks.approved ?? 0
  const submitted      = tasks.submitted ?? 0
  const rejected       = tasks.rejected ?? 0
  const assigned       = tasks.assigned ?? 0
  const inProgress     = tasks.in_progress ?? 0
  const effective      = total - cancelled
  const completionRate = effective > 0 ? Math.round((approved / effective) * 100) : 0
  const rejectionRate  = effective > 0 ? Math.round((rejected / effective) * 100) : 0

  return (
    <div className="grid flex-1 grid-cols-2 md:grid-cols-4 gap-3">
      <KpiTile
        label="Tỷ lệ hoàn thành" value={`${completionRate}%`} icon={CheckCircle2} tone="success"
        hint={`${approved}/${effective} task đã duyệt`}
        progress={completionRate} progressTone={rateTone(completionRate)}
        title="Trong số task của kỳ đang chọn (khớp tab Nhiệm vụ, không tính task đã huỷ), bao nhiêu % đã được duyệt"
      />
      <KpiTile
        label="Đang thực hiện" value={assigned + inProgress} icon={Zap} tone="info"
        hint={`${assigned} đã giao · ${inProgress} đang làm`}
        title="Task trong kỳ đang ở trạng thái Đã giao hoặc Đang làm"
      />
      <KpiTile
        label="Chờ duyệt" value={submitted} icon={Send} tone="violet"
        hint="Editor đã nộp, chờ leader duyệt"
        href={TASKS_HREF}
        title="Task trong kỳ đang ở trạng thái Đã nộp — khớp cột 'Đã nộp' ở tab Nhiệm vụ"
      />
      <KpiTile
        label="Bị từ chối" value={rejected} icon={XCircle} tone="danger"
        alert={rejectionRate > 20}
        hint={`${rejectionRate}% số task trong kỳ`}
        title="Task trong kỳ đang ở trạng thái Từ chối, cần editor sửa và nộp lại"
      />
    </div>
  )
}

// ─── GlobalDashboard ──────────────────────────────────────────────────────────

export function GlobalDashboard({ d, scopeLabel = 'Toàn hệ thống', productStats, trafficCard }: {
  d: GlobalData
  /** "Toàn hệ thống" / "Team: X" / "Thành viên: Y" — phản ánh đúng ScopeFilter đang chọn ở page.tsx,
   * để subtitle các card không nói "Toàn hệ thống" trong khi đã bị khoan sâu về 1 team/1 người. */
  scopeLabel?: string
  /** Tải riêng qua GET /task-auto/product-video-stats (xem page.tsx) — undefined khi đang tải lần đầu. */
  productStats?: ProductVideoStats
  /** Biểu đồ "Traffic theo ngày" (TrafficTrendCard) — page.tsx dựng sẵn theo bộ lọc ngày/team/thành viên. */
  trafficCard?: ReactNode
}) {
  const tasks = d.tasks

  return (
    <div className="space-y-8">

      {/* ── Hàng 1: Cần xử lý ngay (live) | Hiệu suất trong kỳ ──
          Section flex-col + lưới flex-1: 2 nhóm ô cao bằng nhau dù "Tỷ lệ hoàn thành" có thêm thanh tiến độ. */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-x-5 gap-y-8">
        <section aria-label="Cần xử lý ngay" className="flex flex-col">
          <SectionHeader title="Cần xử lý ngay" description="Tính đến hiện tại" live />
          <LiveAlertTiles overdue={d.overdue} todayDeadline={d.today_deadline} className="flex-1" />
        </section>
        <section aria-label="Hiệu suất trong kỳ" className="flex flex-col xl:col-span-2">
          <SectionHeader title="Hiệu suất trong kỳ" description="Task có hạn chót trong kỳ đã chọn — khớp tab Nhiệm vụ" />
          <PerformanceTiles tasks={tasks} />
        </section>
      </div>

      {/* ── Traffic theo ngày ── */}
      {trafficCard && (
        <section aria-label="Traffic theo ngày">
          <SectionHeader title="Traffic" description={`${scopeLabel} · theo báo cáo traffic hằng ngày`} />
          {trafficCard}
        </section>
      )}

      {/* ── Tiến độ nhiệm vụ & video ── */}
      <section aria-label="Nhiệm vụ và video">
        <SectionHeader title="Nhiệm vụ & video" description={scopeLabel} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <DashboardCard
            title="Phân bố trạng thái"
            subtitle="Theo hạn chót, không gồm task quá hạn"
            action={{ href: TASKS_HREF, label: 'Xem task' }}
            className="flex flex-col lg:col-span-2"
          >
            <div className="p-5 flex-1 flex flex-col justify-center">
              <StatusDonut tasks={tasks} size="md" layout="row" />
            </div>
          </DashboardCard>

          <VideoByLineCard data={d.video_by_line} subtitle="Video đã duyệt theo tuyến A1–A5" className="lg:col-span-3" />
        </div>
      </section>

      {/* ── Sản phẩm ── */}
      <section aria-label="Sản phẩm">
        <SectionHeader title="Sản phẩm" description="Video đã duyệt và sản phẩm được làm video trong kỳ" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Đếm theo task — 1 sản phẩm làm lại nhiều video vẫn tính đủ */}
          <VideoByLineCard
            data={(productStats?.video_by_product_line ?? []).map(p => ({ line: p.category, count: p.count }))}
            title="Video theo dòng sản phẩm"
            subtitle="GMV · Traffic · Profit"
            itemLabel="Dòng" unitLabel="video đã duyệt"
            emptyLabel="Chưa có video nào được duyệt theo dòng sản phẩm"
          />
          {/* Đếm SẢN PHẨM RIÊNG BIỆT, không đếm theo video */}
          <ProductVideoBreakdownCard
            byProduct={productStats?.products_with_video_list ?? []}
            byLine={productStats?.products_with_video_by_line ?? []}
            total={productStats?.products_with_video ?? 0}
            scopeLabel={scopeLabel}
          />
        </div>
      </section>

    </div>
  )
}
