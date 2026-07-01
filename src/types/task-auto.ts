// ─────────────────────────────────────────────
//  TASK AUTO MODULE — TypeScript Types
//  Matches AutomationGenVideo_BE Prisma schema
// ─────────────────────────────────────────────

export type TaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export type ContentUsageStatus = 'AVAILABLE' | 'IN_TASK' | 'USED' | 'ARCHIVED'
export type ContentMarket = 'VIETNAM' | 'INDONESIA' | 'JAPAN' | 'THAILAND'
export type TeamMarket = 'VIETNAM' | 'INDONESIA' | 'JAPAN' | 'THAILAND'
export type SourceType = 'PRODUCT_STOCK' | 'COLLECTED' | 'OUTRO' | 'WORKSHOP' | 'HUYK'
export type KpiAllocationType = 'CONTENT_LINE' | 'PRODUCT_LINE'
export type AssignmentOutcome = 'COMPLETED' | 'OVERDUE' | 'REASSIGNED' | 'CANCELLED'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

// ── User Basic ──────────────────────────────────

export interface UserBasic {
  id: string
  full_name: string
  email: string
  image_url?: string | null
  roles?: string[]
}

// ── Teams ───────────────────────────────────────

export interface Team {
  id: string
  name: string
  leader_id: string | null
  brand_type: BrandType
  market: TeamMarket
  is_active: boolean
  created_at: string
  updated_at: string
  leader?: UserBasic | null
  members?: TeamMember[]
  _count?: { tasks: number; members: number }
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  joined_at: string
  user?: UserBasic
  team?: Pick<Team, 'id' | 'name'>
}

// ── Team Products (standalone — không reference bảng products) ──────────────

export interface TeamProduct {
  id: string
  team_id: string
  // Inline product data (null khi record là FK-reference từ kho editor)
  sku: string | null
  name: string | null
  brand_type: BrandType
  image_url: string | null
  image_urls: string[]
  price: string | null
  market: string | null
  price_segment: string | null
  priority_score: number
  material_id: string | null
  product_line_id: string | null
  is_active: boolean
  /** null = tạo mới từ team; có giá trị = copy từ kho tổng */
  source_product_id: string | null
  /** có giá trị = đẩy từ kho cá nhân (FK reference) */
  source_editor_product_id: string | null
  added_by_id: string
  added_at: string
  updated_at: string
  // Relations
  material?: { id: string; name: string } | null
  product_line?: { id: string; name: string } | null
  added_by?: Pick<UserBasic, 'id' | 'full_name'>
  source_editor_product?: {
    id: string; sku: string; name: string
    image_url: string | null; image_urls: string[]
    price: string | null; market: string | null; price_segment: string | null
    priority_score: number; material_id: string | null; product_line_id: string | null
    brand_type: BrandType; is_active: boolean
  } | null
}

// ── Team Contents (standalone — không reference bảng contents) ──────────────

export interface TeamContent {
  id: string
  team_id: string
  // Inline content data (null khi record là FK-reference từ kho editor)
  brand_type: BrandType
  market: string | null
  title: string | null
  body: string | null
  script: string | null
  file_content_url: string | null
  voice_url: string | null
  content_line_id: string | null
  status: ContentUsageStatus | null
  /** null = tạo mới từ team; có giá trị = copy từ kho tổng */
  source_content_id: string | null
  /** có giá trị = đẩy từ kho cá nhân (FK reference) */
  source_editor_content_id: string | null
  added_by_id: string
  added_at: string
  updated_at: string
  // Relations
  content_line?: { id: string; name: string } | null
  added_by?: Pick<UserBasic, 'id' | 'full_name'>
  source_editor_content?: {
    id: string; title: string | null; body: string | null; script: string | null
    file_content_url: string | null; voice_url: string | null
    content_line_id: string | null; brand_type: BrandType
    market: string | null; status: ContentUsageStatus | null
    content_line?: { id: string; name: string } | null
  } | null
}

// ── Editor Approvals ────────────────────────────

export interface EditorApproval {
  id: string
  user_id: string
  status: ApprovalStatus
  approved_by_id: string | null
  approved_at: string | null
  note: string | null
  created_at: string
  user?: UserBasic
  approved_by?: UserBasic | null
}

// ── KPI ─────────────────────────────────────────

export interface TeamKpi {
  id: string
  team_id: string
  month: string
  note: string | null
  created_by_id: string
  created_at: string
  updated_at: string
  team?: Pick<Team, 'id' | 'name'>
  created_by?: UserBasic
  allocations?: TeamKpiAllocation[]
}

export interface TeamKpiAllocation {
  id: string
  team_kpi_id: string
  type: KpiAllocationType
  content_line_id: string | null
  product_line_id: string | null
  percent: number
  content_line?: ContentLine | null
  product_line?: ProductLine | null
}

export interface EditorKpi {
  id: string
  user_id: string
  team_id?: string | null
  month: string
  // ── Video production (Số video sản xuất đạt tiêu chuẩn) ──
  total_target: number    // Tổng video sản xuất (drives auto-assign)
  video_win: number
  video_fail: number
  // ── Content ──
  kpi_extra: number       // KPI sáng tạo (chỉ thông báo)
  content_new: number
  content_collected: number
  content_win_cover: number
  // ── Product ──
  product_planned: number
  product_win_collect: number
  set_by_id: string
  created_at: string
  updated_at: string
  user?: UserBasic
  set_by?: UserBasic
  team?: { id: string; name: string }
  allocations?: EditorKpiAllocation[]
}

export interface EditorKpiAllocation {
  id: string
  editor_kpi_id: string
  type: KpiAllocationType
  content_line_id: string | null
  product_line_id: string | null
  percent: number
  content_line?: ContentLine | null
  product_line?: ProductLine | null
}

// ── Catalog ─────────────────────────────────────

export interface ContentLine {
  id: string
  name: string
  /** A1 | A2 | A3 | A4 | A5 — phân loại tuyến nội dung */
  a_type?: string | null
  _count?: { contents: number; tasks: number }
}

export interface ProductLine {
  id: string
  name: string
  /** TRAFFIC | GMV | PROFIT — phân loại dòng sản phẩm */
  video_category?: string | null
  _count?: { products: number }
}

export interface Material {
  id: string
  name: string
  _count?: { products: number }
}

export interface Product {
  id: string
  sku: string
  name: string
  brand_type: BrandType
  image_url: string | null
  image_urls: string[]
  price: string | null
  market: string | null
  price_segment: string | null
  priority_score: number
  material_id: string | null
  product_line_id: string | null
  /** null = kho chung; có giá trị = sản phẩm riêng của editor */
  user_id: string | null
  /** Có khi response là EditorProduct/TeamProduct — global Product.id để gắn vào Task */
  source_product_id?: string | null
  added_by_id: string
  lark_record_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  material?: Material | null
  product_line?: ProductLine | null
  owner_user?: Pick<UserBasic, 'id' | 'full_name'> | null
  added_by?: UserBasic
  _count?: { contents: number; tasks: number }
  source_team_product_id?: string | null
  source_team_product?: {
    id: string; sku: string | null; name: string | null; image_url: string | null; image_urls: string[]
    price: string | null; market: string | null; price_segment: string | null; priority_score: number
    material?: { id: string; name: string } | null; product_line?: { id: string; name: string } | null
    source_editor_product?: {
      id: string; sku: string | null; name: string | null; image_url: string | null; image_urls: string[]
      price: string | null; market: string | null; price_segment: string | null; priority_score: number
      material?: { id: string; name: string } | null; product_line?: { id: string; name: string } | null
    } | null
  } | null
}

export interface Content {
  id: string
  brand_type: BrandType
  market: string
  title: string | null
  body: string | null
  script: string | null
  file_content_url: string | null
  voice_url: string | null
  voice_id: string | null
  content_line_id: string | null
  /** null = kho chung; có giá trị = content riêng của editor */
  user_id: string | null
  /** Có khi response là EditorContent/TeamContent — global Content.id để gắn vào Task */
  source_content_id?: string | null
  status: ContentUsageStatus
  view_count: string
  approved_content_id: string | null
  added_by_id: string
  lark_record_id: string | null
  created_at: string
  updated_at: string
  content_line?: ContentLine | null
  owner_user?: Pick<UserBasic, 'id' | 'full_name'> | null
  added_by?: UserBasic
  source_team_content_id?: string | null
  source_team_content?: {
    id: string; title: string | null; market: string | null; script: string | null; body: string | null
    file_content_url: string | null; voice_url: string | null
    content_line?: ContentLine | null
    source_editor_content?: {
      id: string; title: string | null; market: string | null; script: string | null; body: string | null
      file_content_url: string | null; voice_url: string | null
      content_line?: ContentLine | null
    } | null
  } | null
}

export interface Source {
  id: string
  brand_type: BrandType
  type: SourceType
  name: string
  link: string
  nas_link?: string | null
  code: string | null
  product_id: string | null
  editor_product_id?: string | null
  /** null = không thuộc editor; có giá trị = source riêng của editor */
  user_id: string | null
  added_by_id: string
  lark_record_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  product?: Pick<Product, 'id' | 'sku' | 'name'> | null
  editor_product?: Pick<Product, 'id' | 'name'> | null
  owner_user?: UserBasic | null
  added_by?: UserBasic
  source_team_source_id?: string | null
  source_team_source?: {
    id: string; type: SourceType | null; name: string | null; link: string | null; nas_link?: string | null; code?: string | null; is_active?: boolean
    source_editor_source?: { id: string; type: SourceType; name: string; link: string; nas_link?: string | null; code?: string | null; is_active?: boolean } | null
  } | null
}

export interface TeamSource {
  id: string
  team_id: string
  brand_type: BrandType
  // nullable khi record là FK-reference từ kho editor
  type: SourceType | null
  name: string | null
  link: string | null
  nas_link?: string | null
  code: string | null
  product_id: string | null
  team_product_id: string | null
  /** null = tạo mới từ team; có giá trị = copy từ source gốc trong kho tổng */
  source_source_id: string | null
  /** có giá trị = đẩy từ kho cá nhân (FK reference) */
  source_editor_source_id: string | null
  added_by_id: string
  is_active: boolean
  added_at: string
  updated_at: string
  product?: Pick<Product, 'id' | 'sku' | 'name'> | null
  editor_product?: Pick<Product, 'id' | 'name'> | null
  team_product?: Pick<TeamProduct, 'id' | 'sku' | 'name'> | null
  source_source?: Pick<Source, 'id' | 'name'> | null
  added_by?: UserBasic
  source_editor_source?: {
    id: string; type: SourceType; name: string; link: string
    nas_link: string | null; code: string | null
    brand_type: BrandType; is_active: boolean
    product_id: string | null; editor_product_id: string | null
  } | null
}

// ── Tasks ────────────────────────────────────────

export interface Task {
  id: string
  team_id: string
  content_id: string | null
  editor_content_id: string | null
  team_content_id: string | null
  product_id: string | null
  editor_product_id: string | null
  team_product_id: string | null
  content_line_id: string | null
  source_outro_id:             string | null
  source_extra_id:             string | null
  source_workshop_id:          string | null
  source_huyk_id:              string | null
  editor_source_outro_id:      string | null
  editor_source_extra_id:      string | null
  editor_source_workshop_id:   string | null
  editor_source_huyk_id:       string | null
  team_source_outro_id:        string | null
  team_source_extra_id:        string | null
  team_source_workshop_id:     string | null
  team_source_huyk_id:         string | null
  status: TaskStatus
  assignee_id: string | null
  assigned_at: string | null
  deadline: string | null
  is_auto: boolean
  is_extra: boolean
  is_planned: boolean
  run_id: string | null
  result_url: string | null
  submitted_at: string | null
  reviewed_by_id: string | null
  reviewed_at: string | null
  reject_reason: string | null
  lark_record_id: string | null
  created_at: string
  updated_at: string
  // Relations
  team?: Pick<Team, 'id' | 'name'>
  content?: Pick<Content, 'id' | 'title' | 'script' | 'file_content_url' | 'market'> & {
    content_line?: ContentLine | null
    source_team_content?: {
      id: string; title?: string | null; market?: string | null; script?: string | null; body?: string | null
      file_content_url?: string | null; voice_url?: string | null; content_line?: ContentLine | null
      source_editor_content?: { id: string; title?: string | null; market?: string | null; script?: string | null; body?: string | null; file_content_url?: string | null; voice_url?: string | null; content_line?: ContentLine | null } | null
    } | null
  } | null
  team_content?: Pick<TeamContent, 'id' | 'title' | 'script' | 'file_content_url' | 'market' | 'body' | 'voice_url'> & {
    content_line?: ContentLine | null
    source_editor_content?: { title?: string | null; market?: string | null; script?: string | null; body?: string | null; file_content_url?: string | null; voice_url?: string | null; content_line?: ContentLine | null } | null
  } | null
  editor_content?: Pick<Content, 'id' | 'title' | 'script' | 'file_content_url' | 'market' | 'body' | 'voice_url'> & { content_line?: ContentLine | null } | null
  product?: Pick<Product, 'id' | 'sku' | 'name' | 'image_url' | 'image_urls' | 'price' | 'market' | 'price_segment' | 'priority_score'> & {
    material?: { id: string; name: string } | null
    product_line?: { id: string; name: string } | null
    source_team_product?: {
      id: string; sku: string | null; name: string | null; image_url: string | null; image_urls?: string[] | null
      price?: any | null; market?: string | null; price_segment?: string | null; priority_score?: number | null
      material?: { id: string; name: string } | null; product_line?: { id: string; name: string } | null
      source_editor_product?: { sku: string | null; name: string | null; image_url: string | null; image_urls?: string[] | null; price?: any | null; market?: string | null; price_segment?: string | null; priority_score?: number | null; material?: { id: string; name: string } | null; product_line?: { id: string; name: string } | null } | null
    } | null
  } | null
  editor_product?: Pick<Product, 'id' | 'sku' | 'name' | 'image_url' | 'image_urls' | 'price' | 'market' | 'price_segment' | 'priority_score'> & { material?: { id: string; name: string } | null; product_line?: { id: string; name: string } | null } | null
  team_product?: Pick<TeamProduct, 'id' | 'sku' | 'name' | 'image_url' | 'image_urls' | 'price' | 'market' | 'price_segment' | 'priority_score'> & {
    material?: { id: string; name: string } | null
    product_line?: { id: string; name: string } | null
    source_editor_product?: { sku: string | null; name: string | null; image_url: string | null; image_urls?: string[] | null; price?: any | null; market?: string | null; price_segment?: string | null; priority_score?: number | null; material?: { id: string; name: string } | null; product_line?: { id: string; name: string } | null } | null
  } | null
  content_line?: ContentLine | null
  source_outro?:           ({ id: string; name: string | null; link: string | null; type: SourceType; nas_link?: string | null } & { source_team_source?: { id: string; name: string | null; link: string | null; type: SourceType | null; nas_link?: string | null; source_editor_source?: { id: string; name: string; link: string; type: SourceType; nas_link?: string | null } | null } | null }) | null
  source_extra?:           ({ id: string; name: string | null; link: string | null; type: SourceType; nas_link?: string | null } & { source_team_source?: { id: string; name: string | null; link: string | null; type: SourceType | null; nas_link?: string | null; source_editor_source?: { id: string; name: string; link: string; type: SourceType; nas_link?: string | null } | null } | null }) | null
  source_workshop?:        ({ id: string; name: string | null; link: string | null; type: SourceType; nas_link?: string | null } & { source_team_source?: { id: string; name: string | null; link: string | null; type: SourceType | null; nas_link?: string | null; source_editor_source?: { id: string; name: string; link: string; type: SourceType; nas_link?: string | null } | null } | null }) | null
  source_huyk?:            ({ id: string; name: string | null; link: string | null; type: SourceType; nas_link?: string | null } & { source_team_source?: { id: string; name: string | null; link: string | null; type: SourceType | null; nas_link?: string | null; source_editor_source?: { id: string; name: string; link: string; type: SourceType; nas_link?: string | null } | null } | null }) | null
  editor_source_outro?:    Pick<Source, 'id' | 'name' | 'link' | 'type' | 'nas_link'> | null
  editor_source_extra?:    Pick<Source, 'id' | 'name' | 'link' | 'type' | 'nas_link'> | null
  editor_source_workshop?: Pick<Source, 'id' | 'name' | 'link' | 'type' | 'nas_link'> | null
  editor_source_huyk?:     Pick<Source, 'id' | 'name' | 'link' | 'type' | 'nas_link'> | null
  team_source_outro?:      { id: string; name: string | null; link: string | null; type: SourceType | null; nas_link?: string | null; source_editor_source?: { name: string; link: string; type: SourceType; nas_link?: string | null } | null } | null
  team_source_extra?:      { id: string; name: string | null; link: string | null; type: SourceType | null; nas_link?: string | null; source_editor_source?: { name: string; link: string; type: SourceType; nas_link?: string | null } | null } | null
  team_source_workshop?:   { id: string; name: string | null; link: string | null; type: SourceType | null; nas_link?: string | null; source_editor_source?: { name: string; link: string; type: SourceType; nas_link?: string | null } | null } | null
  team_source_huyk?:       { id: string; name: string | null; link: string | null; type: SourceType | null; nas_link?: string | null; source_editor_source?: { name: string; link: string; type: SourceType; nas_link?: string | null } | null } | null
  assignee?: UserBasic | null
  reviewed_by?: UserBasic | null
  assignments?: TaskAssignment[]
  pending_video?: TaskPendingVideo | null
  product_sources?: Source[]
}

export interface TaskPendingVideo {
  id: string
  task_id: string
  uploader_id: string
  filename: string
  originalname: string
  mimetype: string
  size: number
  url: string
  storage: string
  created_at: string
}

export interface TaskAssignment {
  id: string
  task_id: string
  user_id: string
  assigned_at: string
  deadline: string
  outcome: AssignmentOutcome | null
  run_id: string | null
  note: string | null
  user?: UserBasic
}

// ── Assignment Runs ─────────────────────────────

export interface AssignmentRun {
  id: string
  run_at: string
  status: string
  total_assigned: number
  total_skipped: number
  details: Record<string, unknown> | null
  error_msg: string | null
  finished_at: string | null
}

// ── Auto-Assign Settings ────────────────────────

export interface AutoAssignSetting {
  id: number
  schedule_time: string
  timezone: string
  weekend_enabled: boolean
  is_active: boolean
  updated_by: string | null
  updated_at: string
}

// ── Notifications ───────────────────────────────

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  task_id: string | null
  is_read: boolean
  created_at: string
  task?: Pick<Task, 'id' | 'status'> | null
}

// ── Pagination ──────────────────────────────────

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── Query Params ────────────────────────────────

export interface TasksQuery {
  status?: TaskStatus | ''
  team_id?: string
  assignee_id?: string
  month?: string
  deadline_date?: string
  task_type?: 'auto' | 'extra' | 'manual' | ''
  page?: number
  limit?: number
  search?: string
}

export type BrandType = 'DO_DA' | 'TRANG_SUC'

export interface ProductsQuery {
  brand_type?: BrandType
  product_line_id?: string
  team_id?: string
  user_id?: string
  owner?: 'global' | 'personal' | 'all' | ''
  is_active?: boolean
  page?: number
  limit?: number
  search?: string
  month?: string
}

export interface ContentsQuery {
  brand_type?: BrandType
  status?: ContentUsageStatus | ''
  content_line_id?: string
  market?: string
  user_id?: string
  owner?: 'global' | 'personal' | 'all' | ''
  page?: number
  limit?: number
  search?: string
  month?: string
}

export interface SourcesQuery {
  brand_type?: BrandType
  type?: SourceType | ''
  product_id?: string
  user_id?: string
  owner?: 'global' | 'editor' | 'all' | ''
  is_active?: boolean
  page?: number
  limit?: number
  search?: string
  month?: string
}

export interface TeamSourcesQuery {
  brand_type?: BrandType
  type?: SourceType | ''
  product_id?: string
  team_product_id?: string
  is_active?: boolean
  search?: string
  month?: string
}

// ── Dashboard Stats ─────────────────────────────

export interface TaskAutoDashboard {
  scope: 'global' | 'team' | 'personal'
  // Global (ADMIN / MANAGER)
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
  contents?: { available: number; in_task: number; used: number; archived: number }
  editors?: { total: number; approved: number; pending_approval: number }
  today_deadline?: number
  overdue?: number
  monthly_completed?: number
  // Team (LEADER)
  team?: { id: string; name: string; member_count: number } | null
  members?: Array<{
    user_id: string
    full_name: string
    email: string
    pending: number
    in_progress: number
    submitted: number
    approved: number
    kpi_target: number
  }>
  kpi?: {
    month: string
    total_target: number
    completed: number
    // personal only
    kpi_day?: number
    kpi_weekend?: number
    kpi_extra?: number
  } | null
}

// ── Status Labels ───────────────────────────────

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'Chờ xử lý',
  ASSIGNED: 'Đã giao',
  IN_PROGRESS: 'Đang làm',
  SUBMITTED: 'Đã nộp',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
}

export const CONTENT_STATUS_LABELS: Record<ContentUsageStatus, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_TASK: 'Đang dùng',
  USED: 'Đã dùng',
  ARCHIVED: 'Lưu trữ',
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  PRODUCT_STOCK: 'Source sản phẩm',
  COLLECTED: 'Source sản phẩm sưu tầm',
  OUTRO: 'Source Outro',
  WORKSHOP: 'Source chế tác',
  HUYK: 'Source Huy-K',
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  SUBMITTED: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}
