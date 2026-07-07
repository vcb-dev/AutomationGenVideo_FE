import { apiClient } from '@/lib/api-client'
import type {
  Task,
  TasksQuery,
  Team,
  EditorApproval,
  TeamKpi,
  EditorKpi,
  ContentLine,
  ProductLine,
  Material,
  Product,
  ProductsQuery,
  Content,
  ContentsQuery,
  Source,
  SourcesQuery,
  TeamSource,
  TeamSourcesQuery,
  AssignmentRun,
  AutoAssignSetting,
  PaginatedResult,
  UserBasic,
  TeamProduct,
  TeamContent,
  TeamPushRequest,
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

export const getTask = (id: string) =>
  apiClient.get<Task>(`/task-auto/tasks/${id}`).then(r => r.data)

export const createTask = (body: Partial<Task>) =>{
  console.log( body)
  return apiClient.post<Task>('/task-auto/tasks', body).then(r => r.data)
}

export const updateTask = (id: string, body: Partial<Task>) =>
  apiClient.put<Task>(`/task-auto/tasks/${id}`, body).then(r => r.data)

export const submitTask = (id: string, resultUrl?: string) =>
  apiClient.post<Task>(`/task-auto/tasks/${id}/submit`, { result_url: resultUrl }).then(r => r.data)

export const approveTask = (id: string) =>
  apiClient.post<Task>(`/task-auto/tasks/${id}/review`, { action: 'APPROVED' }).then(r => r.data)

export const rejectTask = (id: string, reason: string) =>
  apiClient.post<Task>(`/task-auto/tasks/${id}/review`, { action: 'REJECTED', reject_reason: reason }).then(r => r.data)

export const startTask = (id: string) =>
  apiClient.put<Task>(`/task-auto/tasks/${id}`, { status: 'IN_PROGRESS' }).then(r => r.data)

export const cancelTask = (id: string) =>
  apiClient.put<Task>(`/task-auto/tasks/${id}`, { status: 'CANCELLED' }).then(r => r.data)

export const deleteTask = (id: string) =>
  apiClient.delete(`/task-auto/tasks/${id}`).then(r => r.data)

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

// ── Teams ─────────────────────────────────────────────────────────────────────

export const getTeams = () =>
  apiClient.get<Team[]>('/task-auto/teams').then(r => r.data)

export const getTeam = (id: string) =>
  apiClient.get<Team>(`/task-auto/teams/${id}`).then(r => r.data)

export const createTeam = (body: { name: string; leader_id?: string | null; member_ids?: string[] }) =>
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

// ── Team Products (standalone) ────────────────────────────────────────────────

export const getTeamProducts = (teamId: string, brandType?: string, month?: string) =>
  apiClient.get<TeamProduct[]>(`/task-auto/teams/${teamId}/products${qs({ brand_type: brandType, month })}`).then(r => r.data)

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

export const getTeamContents = (teamId: string, brandType?: string, month?: string) =>
  apiClient.get<TeamContent[]>(`/task-auto/teams/${teamId}/contents${qs({ brand_type: brandType, month })}`).then(r => r.data)

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

export const getTeamSources = (teamId: string, q: TeamSourcesQuery = {}) =>
  apiClient.get<TeamSource[]>(`/task-auto/teams/${teamId}/sources${qs(q as any)}`).then(r => r.data)

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
  contents?: { available: number; in_task: number; used: number; archived: number }
  editors?: { total: number; approved: number; pending_approval: number }
  team?: { id: string; name: string; member_count: number } | null
  members?: Array<{
    user_id: string; full_name: string; email: string
    pending: number; in_progress: number; submitted: number; approved: number
    kpi_target: number; kpi_video_win: number; kpi_content_new: number; kpi_product_planned: number
  }>
  kpi?: {
    month: string; total_target: number; completed: number
    // Video
    video_win?: number; video_fail?: number
    // Content
    kpi_extra?: number; content_new?: number; content_collected?: number; content_win_cover?: number
    // Product
    product_planned?: number; product_win_collect?: number
    content_allocations?: { id: string; name: string; weight: number }[]
    product_allocations?: { id: string; name: string; weight: number }[]
  } | null
}

export const getDashboard = (params?: { date_from?: string; date_to?: string }) =>
  apiClient.get<TaskAutoDashboard>(`/task-auto/dashboard${qs(params ?? {})}`).then(r => r.data)

// ── Editor Approvals ──────────────────────────────────────────────────────────

export const getApprovals = (status?: string) =>
  apiClient.get<EditorApproval[]>(`/task-auto/editor-approvals${qs({ status })}`).then(r => r.data)

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

export const getAssignmentRuns = (limit = 50) =>
  apiClient.get<AssignmentRun[]>(`/task-auto/assignment-runs${qs({ limit })}`).then(r => r.data)

// ── Warehouse — Kho tháng ─────────────────────────────────────────────────────

export type WarehouseCatalogType = 'products' | 'contents' | 'sources'

export interface WarehouseData {
  month: string
  products: Product[]
  contents: Content[]
  sources: Source[]
}

export interface TeamWarehouseData extends WarehouseData {
  team_id: string
}

export interface EditorWarehouseData extends WarehouseData {
  editor_id: string
}

// Global
export const getGlobalWarehouse = (month: string, brandType?: string) =>
  apiClient.get<WarehouseData>(`/task-auto/warehouse/global${qs({ month, brand_type: brandType })}`).then(r => r.data)

export const addGlobalWarehouse = (type: WarehouseCatalogType, month: string, ids: string[]) =>
  apiClient.post(`/task-auto/warehouse/global/${type}`, { month, ids }).then(r => r.data)

export const removeGlobalWarehouse = (type: WarehouseCatalogType, month: string, ids: string[]) =>
  apiClient.delete(`/task-auto/warehouse/global/${type}`, { data: { month, ids } }).then(r => r.data)

export const autoCarryGlobal = (month: string) =>
  apiClient.post('/task-auto/warehouse/auto-carry', { month }).then(r => r.data)

// Team
export const getTeamWarehouse = (teamId: string, month: string) =>
  apiClient.get<TeamWarehouseData>(`/task-auto/warehouse/teams/${teamId}${qs({ month })}`).then(r => r.data)

export const addTeamWarehouse = (teamId: string, type: WarehouseCatalogType, month: string, ids: string[]) =>
  apiClient.post(`/task-auto/warehouse/teams/${teamId}/${type}`, { month, ids }).then(r => r.data)

export const removeTeamWarehouse = (teamId: string, type: WarehouseCatalogType, month: string, ids: string[]) =>
  apiClient.delete(`/task-auto/warehouse/teams/${teamId}/${type}`, { data: { month, ids } }).then(r => r.data)

export const pushTeamToMonth = (teamId: string, fromMonth: string, toMonth: string, ids?: string[]) =>
  apiClient.post(`/task-auto/warehouse/teams/${teamId}/push`, { from_month: fromMonth, to_month: toMonth, ids }).then(r => r.data)

// Editor
export const getEditorWarehouse = (editorId: string, month: string) =>
  apiClient.get<EditorWarehouseData>(`/task-auto/warehouse/editors/${editorId}${qs({ month })}`).then(r => r.data)

export const addEditorWarehouse = (editorId: string, type: WarehouseCatalogType, month: string, ids: string[]) =>
  apiClient.post(`/task-auto/warehouse/editors/${editorId}/${type}`, { month, ids }).then(r => r.data)

export const removeEditorWarehouse = (editorId: string, type: WarehouseCatalogType, month: string, ids: string[]) =>
  apiClient.delete(`/task-auto/warehouse/editors/${editorId}/${type}`, { data: { month, ids } }).then(r => r.data)

export const pushEditorToMonth = (editorId: string, fromMonth: string, toMonth: string, ids?: string[]) =>
  apiClient.post(`/task-auto/warehouse/editors/${editorId}/push`, { from_month: fromMonth, to_month: toMonth, ids }).then(r => r.data)

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
