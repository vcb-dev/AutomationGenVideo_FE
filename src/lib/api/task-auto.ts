import { apiClient } from '@/lib/api-client'
import type {
  BrandType,
  Task,
  TaskStatus,
  TasksQuery,
  TaskHeaderCountsQuery,
  TaskHeaderCounts,
  Team,
  TeamKind,
  EditorApproval,
  TeamKpi,
  EditorKpi,
  EditorDailyKpi,
  ContentCreatorKpi,
  ContentCreatorDailyKpi,
  ContentCreatorReportRow,
  ContentWinFailStats,
  ContentTranslation,
  ContentLine,
  ProductLine,
  Material,
  ProductClassification,
  ContentClassification,
  Product,
  ProductsQuery,
  OmsProductListResponse,
  OmsProductDetail,
  OmsProductQuery,
  Content,
  ContentsQuery,
  Source,
  SourcesQuery,
  TeamSource,
  TeamSourcesQuery,
  AssignmentRun,
  AutoAssignSetting,
  DailyPlanQuickCreateResult,
  DailyPlanSearchContent,
  DailyPlanSearchCreateBody,
  DailyPlanSearchKind,
  DailyPlanSearchMarket,
  DailyPlanSearchResult,
  DailyPlanSearchVideo,
  MyDailyPlans,
  LarkWebhookGlobalSetting,
  PaginatedResult,
  UserBasic,
  TeamProduct,
  TeamContent,
  TeamPushRequest,
  TaskContentApproval,
  ContentApprovalsQuery,
  Notification,
  PublishedLink,
  PerformanceGoal,
  PerformanceGoalHistory,
  PerformanceGoalListResponse,
  PerformanceGoalDirection,
  PerformanceGoalMetricType,
  PerformanceGoalStatus,
  PerformanceGoalType,
  PerformanceKpiGroup,
  TaskVideoMatchRunResult,
  ComplianceHistoryQuery,
  ComplianceDayDetail,
  ComplianceHistoryResponse,
} from '@/types/task-auto'

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const getTasks = (q: TasksQuery = {}) =>
  apiClient.get<PaginatedResult<Task>>(`/task-auto/tasks${qs(q as any)}`).then(r => r.data)

async function blobToText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

export async function exportApprovedTasksExcel(q: TasksQuery = {}): Promise<{ blob: Blob; filename: string }> {
  const res = await apiClient.get(`/task-auto/tasks/export${qs(q as any)}`, { responseType: 'blob' })
  const blob = res.data as Blob

  if (blob.type.includes('json')) {
    const text = await blobToText(blob)
    let message = 'Xuất Excel thất bại'
    try { message = JSON.parse(text)?.message || message } catch {}
    throw new Error(message)
  }

  const cd = String(res.headers['content-disposition'] ?? '')
  const m = /filename\*=UTF-8''([^;]+)/i.exec(cd) ?? /filename="([^"]+)"/i.exec(cd)
  return { blob, filename: m ? decodeURIComponent(m[1]) : 'task-da-hoan-thanh.xlsx' }
}

// Gộp 3 lượt đếm limit:1 (header "N task" + badge "Video chờ duyệt"/"Content chờ duyệt") thành
// 1 request count()-thuần ở BE — xem tasks/page.tsx (headerCounts) và tasks.controller.ts.
export const getTaskHeaderCounts = (q: TaskHeaderCountsQuery = {}) =>
  apiClient.get<TaskHeaderCounts>(`/task-auto/tasks/header-counts${qs(q as any)}`).then(r => r.data)

export const getTask = (id: string) =>
  apiClient.get<Task>(`/task-auto/tasks/${id}`).then(r => r.data)

export const createTask = (body: Partial<Task>) =>
  apiClient.post<Task>('/task-auto/tasks', body).then(r => r.data)

export const updateTask = (id: string, body: Partial<Task>) =>
  apiClient.put<Task>(`/task-auto/tasks/${id}`, body).then(r => r.data)

export const submitTask = (id: string, resultUrl?: string) =>
  apiClient.post<Task>(`/task-auto/tasks/${id}/submit`, { result_url: resultUrl }).then(r => r.data)

export const approveTask = (id: string) =>
  apiClient.post<Task>(`/task-auto/tasks/${id}/review`, { action: 'APPROVED' }).then(r => r.data)

export const rejectTask = (id: string, reason: string) =>
  apiClient.post<Task>(`/task-auto/tasks/${id}/review`, { action: 'REJECTED', reject_reason: reason }).then(r => r.data)

// stats là dữ liệu server tự tính (không cho client ghi) — chỉ gửi lên id/platform/url,
// BE tự quyết định giữ lại stats cũ hay fetch mới dựa trên có đổi url/platform hay không.
export const updateTaskPublishedLinks = (id: string, links: PublishedLink[]) =>
  apiClient.patch<Task>(`/task-auto/tasks/${id}/published-links`, {
    links: links.map(({ id, platform, url }) => ({ id, platform, url })),
  }).then(r => r.data)

export const refreshPublishedLinkStats = (taskId: string, linkId: string) =>
  apiClient.post<Task>(`/task-auto/tasks/${taskId}/published-links/${linkId}/refresh-stats`).then(r => r.data)

export const startTask = (id: string) =>
  apiClient.put<Task>(`/task-auto/tasks/${id}`, { status: 'IN_PROGRESS' }).then(r => r.data)

export const cancelTask = (id: string) =>
  apiClient.put<Task>(`/task-auto/tasks/${id}`, { status: 'CANCELLED' }).then(r => r.data)

export const deleteTask = (id: string) =>
  apiClient.delete(`/task-auto/tasks/${id}`).then(r => r.data)

/** Chạy tay cùng matcher mà cron hằng ngày sử dụng; BE tự thu hẹp phạm vi theo role. */
export const runTaskVideoMapping = (
  body: {
    since_days?: number
    max_videos?: number
    date_from?: string
    date_to?: string
    team_id?: string
    assignee_id?: string
    content_line_id?: string
    product_line_id?: string
    task_type?: 'auto' | 'extra' | 'manual'
    status?: TaskStatus
    search?: string
    search_target?: 'task' | 'video'
  } = {},
) => apiClient.post<TaskVideoMatchRunResult>('/task-auto/tasks/match-videos', body).then(r => r.data)

// ── Task Video (pending → Drive on approval) ─────────────────────────────────

export const promoteTaskVideo = (taskId: string) =>
  apiClient.post(`/task-auto/tasks/${taskId}/promote-video`, {}).then(r => r.data)

export const deleteTaskPendingVideo = (taskId: string) =>
  apiClient.delete(`/task-auto/tasks/${taskId}/pending-video`).then(r => r.data)

// ── Task Video Script (AI content — DeepSeek, cache theo task) ──────────────

export interface VideoScriptTranslation {
  language: string
  content: string
  hashtags: string[]
}

export interface VideoScript {
  content: string
  hashtags: string[]
  translation?: VideoScriptTranslation | null
}

export interface GenerateVideoScriptParams {
  fileUrl?: string | null
  scriptText?: string | null
  contentTitle?: string | null
  contentLine?: string | null
  contentMarket?: string | null
  productName?: string | null
  productSku?: string | null
  productPrice?: string | null
  productMaterial?: string | null
  productPriceSegment?: string | null
  productLine?: string | null
  productMarket?: string | null
}

export const getTaskVideoScript = (taskId: string) =>
  apiClient.get<{ script: VideoScript | null }>(`/task-auto/tasks/${taskId}/video-script`).then(r => r.data.script)

export const generateTaskVideoScript = (taskId: string, params: GenerateVideoScriptParams, force = false) =>
  apiClient
    .post<{ script: VideoScript; cached: boolean }>(`/task-auto/tasks/${taskId}/video-script`, { ...params, force })
    .then(r => r.data)

export const updateTaskVideoScript = (
  taskId: string,
  body: { content: string; hashtags?: string[]; translation?: { content: string; hashtags?: string[] } },
) =>
  apiClient
    .patch<{ script: VideoScript }>(`/task-auto/tasks/${taskId}/video-script`, body)
    .then(r => r.data.script)

export const translateTaskVideoScript = (taskId: string, market?: string | null) =>
  apiClient
    .post<{ script: VideoScript }>(`/task-auto/tasks/${taskId}/video-script/translate`, { market })
    .then(r => r.data.script)

// ── Content Approval (duyệt content mới trước khi làm task) ─────────────────

export const getTaskContentApproval = (taskId: string) =>
  apiClient.get<TaskContentApproval | null>(`/task-auto/tasks/${taskId}/content-approval`).then(r => r.data)

export const requestTaskContentApproval = (taskId: string) =>
  apiClient.post<TaskContentApproval>(`/task-auto/tasks/${taskId}/content-approval`, {}).then(r => r.data)

export const reviewTaskContentApproval = (approvalId: string, action: 'APPROVED' | 'REJECTED', reject_reason?: string) =>
  apiClient.post<TaskContentApproval>(`/task-auto/content-approvals/${approvalId}/review`, { action, reject_reason }).then(r => r.data)

export const getContentApprovals = (q: ContentApprovalsQuery = {}) =>
  apiClient.get<PaginatedResult<TaskContentApproval>>(`/task-auto/content-approvals${qs(q as any)}`).then(r => r.data)

// ── Teams ─────────────────────────────────────────────────────────────────────

export const getTeams = () =>
  apiClient.get<Team[]>('/task-auto/teams').then(r => r.data)

/** `teamId` đặc biệt cho API danh sách kho team (sản phẩm/content/source/yêu cầu đẩy kho): gộp mọi team, chỉ ADMIN/MANAGER — khớp BE (team-membership.util.ts). */
export const ALL_TEAMS_ID = 'all'

/** Tên các team được cấp quyền quản lý source ở kho ngang với ADMIN/MANAGER — khớp với BE (team-membership.util.ts). */
export const PRIVILEGED_SOURCE_TEAM_NAMES = ['Scale Data', 'MEDIA']

/** True nếu user là thành viên của một team có quyền quản lý source đặc biệt (Scale Data, MEDIA). */
export const isPrivilegedSourceTeamMember = (teams: Team[] | undefined, userId: string | undefined) =>
  !!teams?.some(t => PRIVILEGED_SOURCE_TEAM_NAMES.includes(t.name) && t.members?.some((m: any) => m.user_id === userId))

/** True nếu user là thành viên (hoặc leader) của một team có team_kind = CONTENT ("Content Team"). */
export const isContentTeamMember = (teams: Team[] | undefined, userId: string | undefined) =>
  !!teams?.some(t => t.team_kind === 'CONTENT' && (t.leader_id === userId || t.members?.some((m: any) => m.user_id === userId)))

export const getTeam = (id: string) =>
  apiClient.get<Team>(`/task-auto/teams/${id}`).then(r => r.data)

export const createTeam = (body: { name: string; leader_id?: string | null; brand_type?: BrandType; team_kind?: TeamKind; member_ids?: string[] }) =>
  apiClient.post<Team>('/task-auto/teams', body).then(r => r.data)

export const updateTeam = (id: string, body: Partial<Team> & { member_ids?: string[] }) =>
  apiClient.put<Team>(`/task-auto/teams/${id}`, body).then(r => r.data)

export const deleteTeam = (id: string) =>
  apiClient.delete(`/task-auto/teams/${id}`).then(r => r.data)

export const addTeamMember = (teamId: string, userId: string) =>
  apiClient.post(`/task-auto/teams/${teamId}/members`, { user_id: userId }).then(r => r.data)

export const removeTeamMember = (teamId: string, userId: string) =>
  apiClient.delete(`/task-auto/teams/${teamId}/members/${userId}`).then(r => r.data)

export const setMemberEditorRole = (teamId: string, userId: string, isEditor: boolean) =>
  apiClient.patch(`/task-auto/teams/${teamId}/members/${userId}/editor`, { is_editor: isEditor }).then(r => r.data)

export const setMemberContentCreatorRole = (teamId: string, userId: string, isContentCreator: boolean) =>
  apiClient.patch(`/task-auto/teams/${teamId}/members/${userId}/content-creator`, { is_content_creator: isContentCreator }).then(r => r.data)

// ── Team Products (standalone) ────────────────────────────────────────────────

export interface TeamListOpts {
  search?: string
  page?: number
  limit?: number
  product_line_id?: string
  classification_id?: string
  content_line_id?: string
  market?: string
}

// Không truyền `opts.page` → trả mảng đầy đủ như trước (dùng bởi dropdown chọn sản phẩm khi
// tạo task...). Truyền `opts.page` → BE chuyển sang chế độ phân trang + search.
export function getTeamProducts(teamId: string, brandType?: string, month?: string): Promise<TeamProduct[]>
export function getTeamProducts(teamId: string, brandType: string | undefined, month: string | undefined, opts: TeamListOpts & { page: number }): Promise<PaginatedResult<TeamProduct>>
export function getTeamProducts(teamId: string, brandType?: string, month?: string, opts?: TeamListOpts) {
  const query = qs({ brand_type: brandType, month, search: opts?.search, page: opts?.page, limit: opts?.limit, product_line_id: opts?.product_line_id, classification_id: opts?.classification_id })
  return apiClient.get<any>(`/task-auto/teams/${teamId}/products${query}`).then(r => r.data)
}

/** Copy từ kho tổng: truyền { source_product_id }. Tạo mới: truyền full product data */
export const addTeamProduct = (teamId: string, data: { source_product_id?: string; name?: string; sku?: string; brand_type?: string; [key: string]: any }) =>
  apiClient.post<TeamProduct>(`/task-auto/teams/${teamId}/products`, data).then(r => r.data)

export const updateTeamProduct = (teamId: string, teamProductId: string, data: Partial<TeamProduct>) =>
  apiClient.patch<TeamProduct>(`/task-auto/teams/${teamId}/products/${teamProductId}`, data).then(r => r.data)

export const removeTeamProduct = (teamId: string, teamProductId: string) =>
  apiClient.delete(`/task-auto/teams/${teamId}/products/${teamProductId}`).then(r => r.data)

export const pushTeamProductToGlobal = (teamId: string, teamProductId: string) =>
  apiClient.patch(`/task-auto/teams/${teamId}/products/${teamProductId}/push`).then(r => r.data)

// ── Team Contents (standalone) ────────────────────────────────────────────────

export function getTeamContents(teamId: string, brandType?: string, month?: string): Promise<TeamContent[]>
export function getTeamContents(teamId: string, brandType: string | undefined, month: string | undefined, opts: TeamListOpts & { page: number }): Promise<PaginatedResult<TeamContent>>
export function getTeamContents(teamId: string, brandType?: string, month?: string, opts?: TeamListOpts) {
  const query = qs({ brand_type: brandType, month, search: opts?.search, page: opts?.page, limit: opts?.limit, content_line_id: opts?.content_line_id, classification_id: opts?.classification_id, market: opts?.market })
  return apiClient.get<any>(`/task-auto/teams/${teamId}/contents${query}`).then(r => r.data)
}

export const getTeamContent = (teamId: string, teamContentId: string) =>
  apiClient.get<TeamContent>(`/task-auto/teams/${teamId}/contents/${teamContentId}`).then(r => r.data)

/** Copy từ kho tổng: truyền { source_content_id }. Tạo mới: truyền full content data */
export const addTeamContent = (teamId: string, data: { source_content_id?: string; brand_type?: string; [key: string]: any }) =>
  apiClient.post<TeamContent>(`/task-auto/teams/${teamId}/contents`, data).then(r => r.data)
export const updateTeamContent = (teamId: string, teamContentId: string, data: Partial<TeamContent>) =>
  apiClient.patch<TeamContent>(`/task-auto/teams/${teamId}/contents/${teamContentId}`, data).then(r => r.data)

export const removeTeamContent = (teamId: string, teamContentId: string) =>
  apiClient.delete(`/task-auto/teams/${teamId}/contents/${teamContentId}`).then(r => r.data)

export const pushTeamContentToGlobal = (teamId: string, teamContentId: string) =>
  apiClient.patch(`/task-auto/teams/${teamId}/contents/${teamContentId}/push`).then(r => r.data)

// ── Team Sources ──────────────────────────────────────────────────────────────

// Không truyền `q.page` → trả mảng đầy đủ như trước. Truyền `q.page` → BE chuyển sang phân trang + search.
export function getTeamSources(teamId: string, q?: TeamSourcesQuery & { page?: undefined }): Promise<TeamSource[]>
export function getTeamSources(teamId: string, q: TeamSourcesQuery & { page: number }): Promise<PaginatedResult<TeamSource>>
export function getTeamSources(teamId: string, q: TeamSourcesQuery = {}) {
  return apiClient.get<any>(`/task-auto/teams/${teamId}/sources${qs(q as any)}`).then(r => r.data)
}

export const addTeamSource = (teamId: string, data: { source_source_id?: string; brand_type?: string; type?: string; name?: string; link?: string; [key: string]: any }) =>
  apiClient.post<TeamSource>(`/task-auto/teams/${teamId}/sources`, data).then(r => r.data)

export const updateTeamSource = (teamId: string, teamSourceId: string, data: Partial<TeamSource>) =>
  apiClient.patch<TeamSource>(`/task-auto/teams/${teamId}/sources/${teamSourceId}`, data).then(r => r.data)

export const removeTeamSource = (teamId: string, teamSourceId: string) =>
  apiClient.delete(`/task-auto/teams/${teamId}/sources/${teamSourceId}`).then(r => r.data)

export const pushTeamSourceToGlobal = (teamId: string, teamSourceId: string) =>
  apiClient.patch(`/task-auto/teams/${teamId}/sources/${teamSourceId}/push`).then(r => r.data)

// ── Users ─────────────────────────────────────────────────────────────────────

export const getUsers = (role?: string) =>
  apiClient.get<UserBasic[]>(`/task-auto/users${qs({ role })}`).then(r => r.data)

// ── Dashboard ─────────────────────────────────────────────────────────────────

export type TaskAutoDashboard = {
  scope: 'global' | 'team' | 'personal'
  tasks?: {
    total: number
    pending?: number
    assigned?: number
    in_progress?: number
    submitted?: number
    approved?: number
    rejected?: number
    cancelled?: number
  }
  today_deadline?: number
  overdue?: number
  monthly_completed?: number
  daily_kpi_target?: number
  editors?: { total: number; approved: number; pending_approval: number }
  /** Số video (task đã duyệt) trong kỳ, gộp theo tuyến nội dung A1-A5. */
  video_by_line?: { line: string; count: number }[]
  traffic_month?: number
  team?: { id: string; name: string; member_count: number } | null
  members?: Array<{
    user_id: string; full_name: string; email: string
    pending: number; in_progress: number; submitted: number; approved: number
    kpi_completed: number
    kpi_target: number; kpi_content_new: number; kpi_product_gmv: number
  }>
  /** LEADER: lựa chọn cho dropdown "Thành viên" — luôn đủ cả team, không co lại khi đang lọc 1 người. */
  member_options?: { user_id: string; full_name: string }[]
  /** LEADER: thành viên BE đã áp bộ lọc (null = đang xem cả team, kể cả khi assignee_id không hợp lệ). */
  focus_member?: { user_id: string; full_name: string } | null
  kpi?: {
    month: string; total_target: number; completed: number
    // Content
    kpi_extra?: number; content_new?: number; content_paast_analyzed?: number; content_win_cover?: number
    // Product
    product_gmv?: number; product_traffic?: number; product_profit?: number
    product_collect_test_win?: number
    total_actual?: number
    content_new_actual?: number
    content_paast_analyzed_actual?: number
    content_win_cover_actual?: number
    product_gmv_actual?: number
    product_traffic_actual?: number
    product_profit_actual?: number
    product_collect_test_win_actual?: number
    content_allocations?: { id: string; name: string; weight: number }[]
    product_allocations?: { id: string; name: string; weight: number }[]
  } | null
}

export const getDashboard = (params?: {
  date_from?: string
  date_to?: string
  /** Khoan sâu về 1 team/1 thành viên. ADMIN/MANAGER: cả 2; LEADER: chỉ assignee_id (thành viên
   * team mình lead); MEMBER: BE bỏ qua. */
  team_id?: string
  assignee_id?: string
}) => apiClient.get<TaskAutoDashboard>(`/task-auto/dashboard${qs(params ?? {})}`).then(r => r.data)

export interface ProductVideoItem {
  id: string
  name: string
  sku: string | null
  category: string | null
  video_count: number
}

export interface ProductVideoStats {
  video_by_product_line: { category: string; count: number }[]
  products_with_video: number
  products_with_video_by_line: { category: string; count: number }[]
  products_with_video_list: ProductVideoItem[]
}

/** Tách riêng khỏi getDashboard() — tự khoanh phạm vi theo role, giống hệt getDashboard()
 * (ADMIN/MANAGER: toàn hệ thống + team_id/assignee_id; LEADER: team đang lead; MEMBER: chính mình). */
export const getProductVideoStats = (params?: {
  date_from?: string; date_to?: string
  team_id?: string; assignee_id?: string
}) =>
  apiClient.get<ProductVideoStats>(`/task-auto/product-video-stats${qs(params ?? {})}`).then(r => r.data)

export interface TrafficTrendDay {
  /** "YYYY-MM-DD" theo giờ VN. */
  date: string
  /** Traffic phát sinh trong ngày; null = không ai trong phạm vi báo cáo ngày này. */
  daily: number | null
  /** Luỹ kế từ đầu tháng tới ngày này. */
  cumulative: number | null
  reporters: number
  /** Phần của `daily` là số dồn của những ngày bỏ trống trước đó (báo cáo bù / lần đầu trong tháng). */
  catch_up: number
}

export interface TrafficTrendSummary {
  daily_sum: number
  latest_cumulative: number
  reported_days: number
  reporters: number
}

export interface TrafficTrend {
  range: { from: string; to: string }
  /** 'team': toàn hệ thống tách theo team; 'member': 1 team tách theo thành viên; null: 1 người. */
  breakdown_kind: 'team' | 'member' | null
  days: TrafficTrendDay[]
  summary: TrafficTrendSummary
  breakdown: (TrafficTrendSummary & {
    /** Team id hoặc user id — null khi không khớp được (vd "Chưa có team"). */
    id: string | null
    label: string
    /** Phát sinh theo từng ngày, cùng thứ tự `days`. */
    daily: (number | null)[]
    /** Luỹ kế tháng theo từng ngày, cùng thứ tự `days` (null = ngày đó không báo cáo). */
    cumulative: (number | null)[]
  })[]
}

/** Traffic theo ngày từ lịch sử báo cáo tay — phạm vi theo role, giống getProductVideoStats(). */
export const getTrafficTrend = (params?: {
  date_from?: string; date_to?: string
  team_id?: string; assignee_id?: string
}) =>
  apiClient.get<TrafficTrend>(`/task-auto/traffic-trend${qs(params ?? {})}`).then(r => r.data)

// ── Editor Approvals ──────────────────────────────────────────────────────────

export const getApprovals = (status?: string) =>
  apiClient.get<EditorApproval[]>(`/task-auto/editor-approvals${qs({ status })}`).then(r => r.data)

// Ai cũng gọi được (không cần role ADMIN/MANAGER/LEADER) — chỉ trả trạng thái approval của chính mình
export const getMyEditorApproval = () =>
  apiClient.get<{ status: 'PENDING' | 'APPROVED' | 'REJECTED' | null }>('/task-auto/editor-approvals/me').then(r => r.data)

export const requestEditorApproval = () =>
  apiClient.post<EditorApproval>('/task-auto/editor-approvals', {}).then(r => r.data)

export const updateApproval = (id: string, body: { status: 'APPROVED' | 'REJECTED'; note?: string }) =>
  apiClient.put<EditorApproval>(`/task-auto/editor-approvals/${id}`, {
    action: body.status,
    note: body.note,
  }).then(r => r.data)

// ── KPI ───────────────────────────────────────────────────────────────────────

export const getTeamKpis = (month?: string) =>
  apiClient.get<TeamKpi[]>(`/task-auto/kpi/teams${qs({ month })}`).then(r => r.data)

export const createTeamKpi = (body: Partial<TeamKpi> & { allocations?: any[] }) =>
  apiClient.post<TeamKpi>('/task-auto/kpi/teams', body).then(r => r.data)

/** Upsert — same endpoint as create */
export const updateTeamKpi = (_id: string, body: Partial<TeamKpi> & { allocations?: any[] }) =>
  apiClient.post<TeamKpi>('/task-auto/kpi/teams', body).then(r => r.data)

export const deleteTeamKpi = (id: string) =>
  apiClient.delete(`/task-auto/kpi/teams/${id}`).then(r => r.data)

export const getEditorKpis = (month?: string) =>
  apiClient.get<EditorKpi[]>(`/task-auto/kpi/editors${qs({ month })}`).then(r => r.data)

export const createEditorKpi = (body: Partial<EditorKpi>) =>
  apiClient.post<EditorKpi>('/task-auto/kpi/editors', body).then(r => r.data)

/** Upsert — same endpoint as create */
export const updateEditorKpi = (_id: string, body: Partial<EditorKpi>) =>
  apiClient.post<EditorKpi>('/task-auto/kpi/editors', body).then(r => r.data)

export const deleteEditorKpi = (id: string) =>
  apiClient.delete(`/task-auto/kpi/editors/${id}`).then(r => r.data)

export interface PerformanceGoalPayload {
  user_id: string
  team_id: string
  month: string
  type: PerformanceGoalType
  kpi_group_id?: string | null
  title: string
  description?: string
  metric_type?: PerformanceGoalMetricType
  unit?: string
  direction?: PerformanceGoalDirection
  target_value: number
  actual_manual?: number | null
  status?: PerformanceGoalStatus
}

export const getPerformanceGoals = (params: {
  month: string
  team_id?: string
  user_id?: string
  type?: PerformanceGoalType
  kpi_group_id?: string
  include_archived?: boolean
}) => apiClient
  .get<PerformanceGoalListResponse>(`/task-auto/performance-goals${qs(params)}`)
  .then(r => r.data)

export const createPerformanceGoal = (body: PerformanceGoalPayload) =>
  apiClient.post<PerformanceGoal>('/task-auto/performance-goals', body).then(r => r.data)

export const updatePerformanceGoal = (
  id: string,
  body: Partial<Omit<PerformanceGoalPayload, 'user_id' | 'team_id' | 'month'>> & {
    expected_revision: number
    change_reason?: string
  },
) => apiClient.patch<PerformanceGoal>(`/task-auto/performance-goals/${id}`, body).then(r => r.data)

export const archivePerformanceGoal = (id: string, revision: number, reason: string) =>
  apiClient.delete<{ id: string; archived: true }>(
    `/task-auto/performance-goals/${id}${qs({ revision, reason })}`,
  ).then(r => r.data)

export const getPerformanceGoalHistory = (id: string) =>
  apiClient.get<PerformanceGoalHistory[]>(`/task-auto/performance-goals/${id}/history`).then(r => r.data)

export const getPerformanceKpiGroups = (params: { team_id?: string; include_archived?: boolean } = {}) =>
  apiClient.get<PerformanceKpiGroup[]>(`/task-auto/performance-kpi-groups${qs(params)}`).then(r => r.data)

export const createPerformanceKpiGroup = (body: {
  team_id: string
  name: string
  description?: string
  color?: PerformanceKpiGroup['color']
  icon?: PerformanceKpiGroup['icon']
  sort_order?: number
}) => apiClient.post<PerformanceKpiGroup>('/task-auto/performance-kpi-groups', body).then(r => r.data)

export const updatePerformanceKpiGroup = (
  id: string,
  body: Partial<Pick<PerformanceKpiGroup, 'name' | 'description' | 'color' | 'icon' | 'sort_order'>>,
) => apiClient.patch<PerformanceKpiGroup>(`/task-auto/performance-kpi-groups/${id}`, body).then(r => r.data)

export const archivePerformanceKpiGroup = (id: string) =>
  apiClient.delete<{ id: string; archived: true }>(`/task-auto/performance-kpi-groups/${id}`).then(r => r.data)

// ── Editor Daily KPI (KPI ngày set tay) ───────────────────────────────────────

export const getEditorDailyKpis = (params: {
  date?: string      // YYYY-MM-DD
  from?: string
  to?: string
  team_id?: string
  user_id?: string
}) =>
  apiClient.get<EditorDailyKpi[]>(`/task-auto/kpi/editors/daily${qs(params)}`).then(r => r.data)

/** Upsert theo lô: cả team cho 1 ngày (target = 0 nghĩa là bỏ set → BE fallback logic cũ) */
export const upsertEditorDailyKpis = (body: {
  team_id: string
  date: string       // YYYY-MM-DD
  entries: { user_id: string; target: number; note?: string }[]
}) =>
  apiClient.post<EditorDailyKpi[]>('/task-auto/kpi/editors/daily', body).then(r => r.data)

export const deleteEditorDailyKpi = (id: string) =>
  apiClient.delete(`/task-auto/kpi/editors/daily/${id}`).then(r => r.data)

// ── Content Creator KPI (target tháng thủ công + báo cáo tự tính) ──────────────

export const getContentCreatorKpis = (month?: string, userId?: string) =>
  apiClient.get<ContentCreatorKpi[]>(`/task-auto/kpi/content-creators${qs({ month, user_id: userId })}`).then(r => r.data)

export const upsertContentCreatorKpi = (body: {
  user_id: string
  team_id: string
  month: string
  content_target: number
  translation_target: number
  note?: string
}) =>
  apiClient.post<ContentCreatorKpi>('/task-auto/kpi/content-creators', body).then(r => r.data)

export const deleteContentCreatorKpi = (id: string) =>
  apiClient.delete(`/task-auto/kpi/content-creators/${id}`).then(r => r.data)

// ── Content Creator Daily KPI (KPI ngày set tay) ──────────────────────────────

export const getContentCreatorDailyKpis = (params: {
  date?: string      // YYYY-MM-DD
  from?: string
  to?: string
  team_id?: string
  user_id?: string
}) =>
  apiClient.get<ContentCreatorDailyKpi[]>(`/task-auto/kpi/content-creators/daily${qs(params)}`).then(r => r.data)

/** Upsert theo lô: cả team cho 1 ngày (target = 0 nghĩa là bỏ set) */
export const upsertContentCreatorDailyKpis = (body: {
  team_id: string
  date: string       // YYYY-MM-DD
  entries: { user_id: string; target: number; note?: string }[]
}) =>
  apiClient.post<ContentCreatorDailyKpi[]>('/task-auto/kpi/content-creators/daily', body).then(r => r.data)

export const deleteContentCreatorDailyKpi = (id: string) =>
  apiClient.delete(`/task-auto/kpi/content-creators/daily/${id}`).then(r => r.data)

export const getContentCreatorKpiReport = (params: { user_id?: string; team_id?: string; from?: string; to?: string }) =>
  apiClient.get<ContentCreatorReportRow[]>(`/task-auto/kpi/content-creators/report${qs(params)}`).then(r => r.data)

/** Chỉ số MỚI, tự tính win/fail (1 link bài đăng bất kỳ >10.000 view = win) theo content creator
 * lẫn editor — tách biệt EditorKpi.video_win/fail (nhập tay). Cần truyền user_id hoặc team_id. */
export const getContentWinFailStats = (params: { user_id?: string; team_id?: string; from?: string; to?: string; classification_id?: string }) =>
  apiClient.get<ContentWinFailStats>(`/task-auto/kpi/content-win-fail${qs(params)}`).then(r => r.data)

/** Cào lại traffic Facebook/YouTube mới nhất cho đúng scope rồi trả về win/fail đã tính lại — CHỦ
 * ĐỘNG, chỉ chạy khi user bấm nút "Cập nhật" (không tự động khi mở chi tiết 1 thành viên nữa —
 * từng gây dội hàng loạt request khi duyệt qua nhiều người, làm chậm hệ thống). Số liệu mặc định
 * đã được làm mới mỗi ngày qua cron 8:15 sáng. */
export const refreshContentWinFailStats = (params: { user_id?: string; team_id?: string; from?: string; to?: string; classification_id?: string }) =>
  apiClient.post<ContentWinFailStats>(`/task-auto/kpi/content-win-fail/refresh${qs(params)}`).then(r => r.data)

/** Top N người có nhiều content win nhất TOÀN HỆ THỐNG — mặc định cho ADMIN/MANAGER khi chưa
 * chọn team/thành viên cụ thể ở trang Tổng quan (không bắt buộc chọn team trước mới xem được). */
export const getTopContentWinFailStats = (params: { from?: string; to?: string; limit?: number; classification_id?: string }) =>
  apiClient.get<ContentWinFailStats>(`/task-auto/kpi/content-win-fail/top${qs(params)}`).then(r => r.data)

/** Nút "Cập nhật" khi đang xem bảng xếp hạng Top N (không có team_id/user_id để gọi route refresh
 * bên trên) — chỉ cào lại traffic cho top N đang hiển thị. */
export const refreshTopContentWinFailStats = (params: { from?: string; to?: string; limit?: number; classification_id?: string }) =>
  apiClient.post<ContentWinFailStats>(`/task-auto/kpi/content-win-fail/top/refresh${qs(params)}`).then(r => r.data)

// ── Catalog — Lookup Tables ────────────────────────────────────────────────────

export const getProductLines = () =>
  apiClient.get<ProductLine[]>('/task-auto/product-lines').then(r => r.data)

export const createProductLine = (name: string) =>
  apiClient.post<ProductLine>('/task-auto/product-lines', { name }).then(r => r.data)

export const updateProductLine = (id: string, body: { video_category?: string | null }) =>
  apiClient.patch<ProductLine>(`/task-auto/product-lines/${id}`, body).then(r => r.data)

export const deleteProductLine = (id: string) =>
  apiClient.delete(`/task-auto/product-lines/${id}`).then(r => r.data)

export const getMaterials = (brandType?: string) =>
  apiClient.get<Material[]>(`/task-auto/materials${brandType ? `?brand_type=${brandType}` : ''}`).then(r => r.data)

export const createMaterial = (name: string, brandType: string) =>
  apiClient.post<Material>('/task-auto/materials', { name, brand_type: brandType }).then(r => r.data)

export const deleteMaterial = (id: string) =>
  apiClient.delete(`/task-auto/materials/${id}`).then(r => r.data)

export const getContentLines = () =>
  apiClient.get<ContentLine[]>('/task-auto/content-lines').then(r => r.data)

export const createContentLine = (name: string) =>
  apiClient.post<ContentLine>('/task-auto/content-lines', { name }).then(r => r.data)

export const updateContentLine = (id: string, body: { a_type?: string | null }) =>
  apiClient.patch<ContentLine>(`/task-auto/content-lines/${id}`, body).then(r => r.data)

export const deleteContentLine = (id: string) =>
  apiClient.delete(`/task-auto/content-lines/${id}`).then(r => r.data)

export const getProductClassifications = () =>
  apiClient.get<ProductClassification[]>('/task-auto/product-classifications').then(r => r.data)

export const createProductClassification = (name: string) =>
  apiClient.post<ProductClassification>('/task-auto/product-classifications', { name }).then(r => r.data)

export const updateProductClassification = (id: string, name: string) =>
  apiClient.patch<ProductClassification>(`/task-auto/product-classifications/${id}`, { name }).then(r => r.data)

export const deleteProductClassification = (id: string) =>
  apiClient.delete(`/task-auto/product-classifications/${id}`).then(r => r.data)

export const getContentClassifications = () =>
  apiClient.get<ContentClassification[]>('/task-auto/content-classifications').then(r => r.data)

export const createContentClassification = (name: string) =>
  apiClient.post<ContentClassification>('/task-auto/content-classifications', { name }).then(r => r.data)

export const updateContentClassification = (id: string, name: string) =>
  apiClient.patch<ContentClassification>(`/task-auto/content-classifications/${id}`, { name }).then(r => r.data)

export const deleteContentClassification = (id: string) =>
  apiClient.delete(`/task-auto/content-classifications/${id}`).then(r => r.data)

// ── Catalog — Products ────────────────────────────────────────────────────────

export const getProducts = (q: ProductsQuery = {}) =>
  apiClient.get<PaginatedResult<Product>>(`/task-auto/products${qs(q as any)}`).then(r => r.data)

export const getProduct = (id: string) =>
  apiClient.get<Product>(`/task-auto/products/${id}`).then(r => r.data)

export const createProduct = (body: Partial<Product>) =>
  apiClient.post<Product>('/task-auto/products', body).then(r => r.data)

export const updateProduct = (id: string, body: Partial<Product>) =>
  apiClient.put<Product>(`/task-auto/products/${id}`, body).then(r => r.data)

export const deleteProduct = (id: string) =>
  apiClient.delete(`/task-auto/products/${id}`).then(r => r.data)

// ── OMS Integration (kho tổng — proxy trực tiếp từ OMS) ─────────────────────────

export const searchOmsProducts = (q: OmsProductQuery = {}) =>
  apiClient.get<OmsProductListResponse>(`/task-auto/oms/products${qs(q as any)}`).then(r => r.data)

export const getOmsProductDetail = (omsProductId: string) =>
  apiClient.get<OmsProductDetail>(`/task-auto/oms/products/${omsProductId}`).then(r => r.data)

export const refreshTeamProductFromOms = (teamId: string, teamProductId: string) =>
  apiClient.patch<TeamProduct>(`/task-auto/teams/${teamId}/products/${teamProductId}/refresh-from-oms`).then(r => r.data)

export const uploadProductImage = (file: File): Promise<{ url: string }> => {
  const fd = new FormData()
  fd.append('image', file)
  return apiClient.post<{ url: string }>('/task-auto/upload-image', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// ── Catalog — Contents ────────────────────────────────────────────────────────

export const getContents = (q: ContentsQuery = {}) =>
  apiClient.get<PaginatedResult<Content>>(`/task-auto/contents${qs(q as any)}`).then(r => r.data)

export const getContent = (id: string) =>
  apiClient.get<Content>(`/task-auto/contents/${id}`).then(r => r.data)

export const createContent = (body: Partial<Content>) =>
  apiClient.post<Content>('/task-auto/contents', body).then(r => r.data)

export const updateContent = (id: string, body: Partial<Content>) =>
  apiClient.put<Content>(`/task-auto/contents/${id}`, body).then(r => r.data)

export const deleteContent = (id: string) =>
  apiClient.delete(`/task-auto/contents/${id}`).then(r => r.data)

// ── Content Translations (bản dịch content theo thị trường) ────────────────────

export const getContentTranslations = (contentId: string) =>
  apiClient.get<ContentTranslation[]>(`/task-auto/contents/${contentId}/translations`).then(r => r.data)

export const upsertContentTranslation = (contentId: string, body: { market: string; title?: string; body?: string; script?: string }) =>
  apiClient.post<ContentTranslation>(`/task-auto/contents/${contentId}/translations`, body).then(r => r.data)

export const deleteContentTranslation = (contentId: string, market: string) =>
  apiClient.delete(`/task-auto/contents/${contentId}/translations/${market}`).then(r => r.data)

/** AI dịch nháp title/body/script sang market đích — KHÔNG lưu, chỉ trả bản nháp để sửa rồi tự gọi upsertContentTranslation. */
export const aiTranslateContent = (contentId: string, market: string) =>
  apiClient.post<{ market: string; title: string | null; body: string | null; script: string | null }>(
    `/task-auto/contents/${contentId}/ai-translate`, { market },
  ).then(r => r.data)

export const uploadVoiceFile = (file: File): Promise<{ url: string }> => {
  const fd = new FormData()
  fd.append('voice', file)
  return apiClient.post<{ url: string }>('/task-auto/upload-voice', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const uploadContentFile = (file: File): Promise<{ url: string }> => {
  const fd = new FormData()
  fd.append('file', file)
  return apiClient.post<{ url: string }>('/task-auto/upload-content', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// ── Catalog — Sources ─────────────────────────────────────────────────────────

export const getSources = (q: SourcesQuery = {}) =>
  apiClient.get<PaginatedResult<Source>>(`/task-auto/sources${qs(q as any)}`).then(r => r.data)

export const getSource = (id: string) =>
  apiClient.get<Source>(`/task-auto/sources/${id}`).then(r => r.data)

export const createSource = (body: Partial<Source>) =>
  apiClient.post<Source>('/task-auto/sources', body).then(r => r.data)

export const updateSource = (id: string, body: Partial<Source>) =>
  apiClient.put<Source>(`/task-auto/sources/${id}`, body).then(r => r.data)

export const deleteSource = (id: string) =>
  apiClient.delete(`/task-auto/sources/${id}`).then(r => r.data)

// ── Editor Catalog — Products ─────────────────────────────────────────────────

export const getEditorProducts = (userId: string, q: Record<string, any> = {}) =>
  apiClient.get<PaginatedResult<Product>>(`/task-auto/editors/${userId}/products${qs(q as any)}`).then(r => r.data)

export const createEditorProduct = (userId: string, body: Partial<Product>) =>
  apiClient.post<Product>(`/task-auto/editors/${userId}/products`, body).then(r => r.data)

export const updateEditorProduct = (userId: string, id: string, body: Partial<Product>) =>
  apiClient.patch<Product>(`/task-auto/editors/${userId}/products/${id}`, body).then(r => r.data)

export const deleteEditorProduct = (userId: string, id: string) =>
  apiClient.delete(`/task-auto/editors/${userId}/products/${id}`).then(r => r.data)

export const pushEditorProductToTeam = (userId: string, id: string, teamId: string) =>
  apiClient.patch(`/task-auto/editors/${userId}/products/${id}/push-to-team`, { team_id: teamId }).then(r => r.data)

export const pushEditorProductToGlobal = (userId: string, id: string) =>
  apiClient.patch(`/task-auto/editors/${userId}/products/${id}/push-to-global`).then(r => r.data)

// ── Editor Catalog — Contents ─────────────────────────────────────────────────

export const getEditorContents = (userId: string, q: Record<string, any> = {}) =>
  apiClient.get<PaginatedResult<Content>>(`/task-auto/editors/${userId}/contents${qs(q as any)}`).then(r => r.data)

export const getEditorContent = (userId: string, id: string) =>
  apiClient.get<Content>(`/task-auto/editors/${userId}/contents/${id}`).then(r => r.data)

export const createEditorContent = (userId: string, body: Partial<Content>) =>
  apiClient.post<Content>(`/task-auto/editors/${userId}/contents`, body).then(r => r.data)

export const updateEditorContent = (userId: string, id: string, body: Partial<Content>) =>
  apiClient.patch<Content>(`/task-auto/editors/${userId}/contents/${id}`, body).then(r => r.data)

export const deleteEditorContent = (userId: string, id: string) =>
  apiClient.delete(`/task-auto/editors/${userId}/contents/${id}`).then(r => r.data)

export const pushEditorContentToTeam = (userId: string, id: string, teamId: string) =>
  apiClient.patch(`/task-auto/editors/${userId}/contents/${id}/push-to-team`, { team_id: teamId }).then(r => r.data)

export const pushEditorContentToGlobal = (userId: string, id: string) =>
  apiClient.patch(`/task-auto/editors/${userId}/contents/${id}/push-to-global`).then(r => r.data)

// ── Editor Catalog — Sources ──────────────────────────────────────────────────

export const getEditorSources = (userId: string, q: Record<string, any> = {}) =>
  apiClient.get<PaginatedResult<Source>>(`/task-auto/editors/${userId}/sources${qs(q as any)}`).then(r => r.data)

export const createEditorSource = (userId: string, body: Partial<Source>) =>
  apiClient.post<Source>(`/task-auto/editors/${userId}/sources`, body).then(r => r.data)

export const updateEditorSource = (userId: string, id: string, body: Partial<Source>) =>
  apiClient.patch<Source>(`/task-auto/editors/${userId}/sources/${id}`, body).then(r => r.data)

export const deleteEditorSource = (userId: string, id: string) =>
  apiClient.delete(`/task-auto/editors/${userId}/sources/${id}`).then(r => r.data)

export const pushEditorSourceToTeam = (userId: string, id: string, teamId: string) =>
  apiClient.patch(`/task-auto/editors/${userId}/sources/${id}/push-to-team`, { team_id: teamId }).then(r => r.data)

export const pushEditorSourceToGlobal = (userId: string, id: string) =>
  apiClient.patch(`/task-auto/editors/${userId}/sources/${id}/push-to-global`).then(r => r.data)

// ── Team Push Requests (duyệt đẩy kho cá nhân → kho team) ────────────────────

export const getMyPushRequests = (userId: string, status?: string) =>
  apiClient.get<TeamPushRequest[]>(`/task-auto/editors/${userId}/push-requests${qs({ status })}`).then(r => r.data)

export const getTeamPushRequests = (teamId: string, status?: string) =>
  apiClient.get<TeamPushRequest[]>(`/task-auto/teams/${teamId}/push-requests${qs({ status })}`).then(r => r.data)

export const reviewPushRequest = (id: string, action: 'APPROVED' | 'REJECTED', note?: string) =>
  apiClient.patch<TeamPushRequest>(`/task-auto/push-requests/${id}/review`, { action, note }).then(r => r.data)

// ── Personal Catalog — Push to Team (legacy aliases) ─────────────────────────

export const pushProductToTeam = (userId: string, productId: string, teamId: string) =>
  pushEditorProductToTeam(userId, productId, teamId)

export const pushContentToTeam = (userId: string, contentId: string, teamId: string) =>
  pushEditorContentToTeam(userId, contentId, teamId)

export const pushSourceToTeam = (userId: string, sourceId: string, teamId: string) =>
  pushEditorSourceToTeam(userId, sourceId, teamId)

// ── Auto-Assign Settings & Runs ────────────────────────────────────────────────

export const getAutoAssignSettings = () =>
  apiClient.get<AutoAssignSetting>('/task-auto/settings').then(r => r.data)

export const updateAutoAssignSettings = (body: Partial<AutoAssignSetting>) =>
  apiClient.put<AutoAssignSetting>('/task-auto/settings', body).then(r => r.data)

export const triggerAutoAssign = () =>
  apiClient.post<{ message: string; timestamp: string; assigned: number; skipped: number; runId: string }>(
    '/task-auto/assignment-runs/trigger', {}
  ).then(r => r.data)

// ── Kế hoạch ngày (A1/A2/A3/A5: chỉ tiêu + gợi ý content, tạo task nhanh) ─────────

/** Theo bộ lọc ngày của trang — bỏ trống cả 2 đầu = "Tất cả ngày" */
export const getMyDailyPlans = (range: { from?: string; to?: string }) =>
  apiClient.get<MyDailyPlans>(`/task-auto/daily-plans/me${range.from || range.to ? qs({ from: range.from, to: range.to }) : qs({ all: 'true' })}`).then(r => r.data)

export const quickCreateFromDailyPlan = (suggestionIds: string[]) =>
  apiClient.post<DailyPlanQuickCreateResult>('/task-auto/daily-plans/quick-create', { suggestion_ids: suggestionIds }).then(r => r.data)

/**
 * Tìm content trong kho / video win cho 1 kế hoạch — `line`: id tuyến, 'all', bỏ trống = tuyến của kế
 * hoạch; `market` bỏ trống = theo thị trường của team.
 */
export function searchForDailyPlan(
  planId: string,
  q: { kind: 'content'; q?: string; line?: string; market?: DailyPlanSearchMarket; page?: number },
): Promise<DailyPlanSearchResult<DailyPlanSearchContent>>
export function searchForDailyPlan(planId: string, q: { kind: 'video'; q?: string; line?: string; market?: DailyPlanSearchMarket; page?: number }): Promise<DailyPlanSearchResult<DailyPlanSearchVideo>>
export function searchForDailyPlan(planId: string, q: { kind: DailyPlanSearchKind; q?: string; line?: string; market?: DailyPlanSearchMarket; page?: number }) {
  return apiClient.get(`/task-auto/daily-plans/${planId}/search${qs(q)}`).then(r => r.data)
}

export const quickCreateFromDailyPlanSearch = (planId: string, body: DailyPlanSearchCreateBody) =>
  apiClient.post<{ task_id: string; reused: boolean }>(`/task-auto/daily-plans/${planId}/quick-create-item`, body).then(r => r.data)

// ── Webhook Lark chung (thông báo task/content cần duyệt) ───────────────────────

export const getLarkWebhookGlobalSetting = () =>
  apiClient.get<LarkWebhookGlobalSetting>('/task-auto/settings/lark-webhook').then(r => r.data)

/** webhook_url/webhook_secret: bỏ qua (không truyền key) = giữ nguyên, null = xoá. */
export const updateLarkWebhookGlobalSetting = (body: { webhook_url?: string | null; webhook_secret?: string | null }) =>
  apiClient.put<LarkWebhookGlobalSetting>('/task-auto/settings/lark-webhook', body).then(r => r.data)

export const getAssignmentRuns = (limit = 50) =>
  apiClient.get<AssignmentRun[]>(`/task-auto/assignment-runs${qs({ limit })}`).then(r => r.data)

// ── Lịch sử thiếu task theo ngày ────────────────────────────────────────────

export const getComplianceHistory = (q: ComplianceHistoryQuery = {}) =>
  apiClient.get<ComplianceHistoryResponse>(`/task-auto/compliance-history${qs({ from: q.from, to: q.to, team_id: q.team_id, user_id: q.user_id, page: q.page, limit: q.limit })}`).then(r => r.data)

export const getComplianceDay = (q: { date: string; user_id?: string; team_id?: string }) => apiClient.get<ComplianceDayDetail>(`/task-auto/compliance-history/day${qs(q)}`).then(r => r.data)

// ── Scale Data Team Stats ──────────────────────────────────────────────────────

export interface MemberSourceStat {
  user_id:        string
  full_name:      string
  email:          string
  image_url:      string | null
  global_sources: number
  team_sources:   number
  total:          number
}

export const getTeamMemberSourceStats = (teamId: string, month?: string) =>
  apiClient.get<MemberSourceStat[]>(`/task-auto/teams/${teamId}/member-source-stats${qs({ month })}`).then(r => r.data)

// ── Notifications ────────────────────────────────────────────────────────────

export const getTaskNotifications = (q: { unread_only?: boolean; type?: string; page?: number; limit?: number } = {}) =>
  apiClient.get<PaginatedResult<Notification>>(`/task-auto/notifications${qs(q as any)}`).then(r => r.data)

export const getTaskNotificationUnreadCount = () =>
  apiClient.get<{ count: number }>('/task-auto/notifications/unread-count').then(r => r.data)

export const markTaskNotificationRead = (id: string) =>
  apiClient.patch<Notification>(`/task-auto/notifications/${id}/read`).then(r => r.data)

export const markAllTaskNotificationsRead = () =>
  apiClient.post<{ updated: number }>('/task-auto/notifications/read-all').then(r => r.data)

// ── Web Push ─────────────────────────────────────────────────────────────

export const getPushPublicKey = () =>
  apiClient.get<{ publicKey: string | null }>('/task-auto/notifications/push/public-key').then(r => r.data)

export const subscribePush = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
  apiClient.post('/task-auto/notifications/push/subscribe', sub).then(r => r.data)

export const unsubscribePush = (endpoint: string) =>
  apiClient.post('/task-auto/notifications/push/unsubscribe', { endpoint }).then(r => r.data)
