import { apiClient } from '@/lib/api-client'
import type {
  Task,
  TasksQuery,
  Team,
  EditorApproval,
  TeamKpi,
  EditorKpi,
  EditorWeekendKpi,
  ContentLine,
  ProductLine,
  Material,
  Product,
  ProductsQuery,
  Content,
  ContentsQuery,
  Source,
  SourcesQuery,
  AssignmentRun,
  AutoAssignSetting,
  PaginatedResult,
  UserBasic,
  TeamProduct,
  TeamContent,
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

export const startTask = (id: string) =>
  apiClient.put<Task>(`/task-auto/tasks/${id}`, { status: 'IN_PROGRESS' }).then(r => r.data)

export const cancelTask = (id: string) =>
  apiClient.put<Task>(`/task-auto/tasks/${id}`, { status: 'CANCELLED' }).then(r => r.data)

export const deleteTask = (id: string) =>
  apiClient.delete(`/task-auto/tasks/${id}`).then(r => r.data)

// ── Task Video (pending storage) ──────────────────────────────────────────────

export const attachTaskVideo = (
  taskId: string,
  data: { filename: string; originalname: string; mimetype: string; size: number; url: string; storage: string },
) => apiClient.post(`/task-auto/tasks/${taskId}/attach-video`, data).then(r => r.data)

export const promoteTaskVideo = (taskId: string) =>
  apiClient.post(`/task-auto/tasks/${taskId}/promote-video`, {}).then(r => r.data)

export const deleteTaskPendingVideo = (taskId: string) =>
  apiClient.delete(`/task-auto/tasks/${taskId}/pending-video`).then(r => r.data)

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

// ── Team Products ─────────────────────────────────────────────────────────────

export const getTeamProducts = (teamId: string) =>
  apiClient.get<TeamProduct[]>(`/task-auto/teams/${teamId}/products`).then(r => r.data)

export const addTeamProduct = (teamId: string, productId: string) =>
  apiClient.post<TeamProduct>(`/task-auto/teams/${teamId}/products`, { product_id: productId }).then(r => r.data)

export const removeTeamProduct = (teamId: string, productId: string) =>
  apiClient.delete(`/task-auto/teams/${teamId}/products/${productId}`).then(r => r.data)

// ── Team Contents ─────────────────────────────────────────────────────────────

export const getTeamContents = (teamId: string) =>
  apiClient.get<TeamContent[]>(`/task-auto/teams/${teamId}/contents`).then(r => r.data)

export const addTeamContent = (teamId: string, contentId: string) =>
  apiClient.post<TeamContent>(`/task-auto/teams/${teamId}/contents`, { content_id: contentId }).then(r => r.data)

export const removeTeamContent = (teamId: string, contentId: string) =>
  apiClient.delete(`/task-auto/teams/${teamId}/contents/${contentId}`).then(r => r.data)

export const pushTeamContentToGlobal = (teamId: string, contentId: string) =>
  apiClient.patch(`/task-auto/teams/${teamId}/contents/${contentId}/push`).then(r => r.data)

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
    pending: number; in_progress: number; submitted: number; approved: number; kpi_target: number
  }>
  kpi?: {
    month: string; total_target: number; completed: number
    kpi_day?: number; kpi_weekend?: number; kpi_extra?: number
  } | null
}

export const getDashboard = () =>
  apiClient.get<TaskAutoDashboard>('/task-auto/dashboard').then(r => r.data)

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

export const getEditorWeekendKpis = (month?: string) =>
  apiClient.get<EditorWeekendKpi[]>(`/task-auto/kpi/weekend-editors${qs({ month })}`).then(r => r.data)

export const upsertEditorWeekendKpi = (body: { user_id: string; date: string; kpi: number }) =>
  apiClient.post<EditorWeekendKpi>('/task-auto/kpi/weekend-editors', body).then(r => r.data)

export const deleteEditorWeekendKpi = (id: string) =>
  apiClient.delete(`/task-auto/kpi/weekend-editors/${id}`).then(r => r.data)

export const deleteEditorKpi = (id: string) =>
  apiClient.delete(`/task-auto/kpi/editors/${id}`).then(r => r.data)

// ── Catalog — Lookup Tables ────────────────────────────────────────────────────

export const getProductLines = () =>
  apiClient.get<ProductLine[]>('/task-auto/product-lines').then(r => r.data)

export const createProductLine = (name: string) =>
  apiClient.post<ProductLine>('/task-auto/product-lines', { name }).then(r => r.data)

export const deleteProductLine = (id: string) =>
  apiClient.delete(`/task-auto/product-lines/${id}`).then(r => r.data)

export const getMaterials = () =>
  apiClient.get<Material[]>('/task-auto/materials').then(r => r.data)

export const createMaterial = (name: string) =>
  apiClient.post<Material>('/task-auto/materials', { name }).then(r => r.data)

export const deleteMaterial = (id: string) =>
  apiClient.delete(`/task-auto/materials/${id}`).then(r => r.data)

export const getContentLines = () =>
  apiClient.get<ContentLine[]>('/task-auto/content-lines').then(r => r.data)

export const createContentLine = (name: string) =>
  apiClient.post<ContentLine>('/task-auto/content-lines', { name }).then(r => r.data)

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
