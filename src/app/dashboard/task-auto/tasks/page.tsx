'use client'

import { useEffect, useState, type ElementType } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Users, User, Kanban, Rows3, Gauge, CheckCircle2, Facebook, ListTodo, Hourglass, Film, FileText,
  FileSpreadsheet, Link2, Plus,
} from 'lucide-react'
import { todayString } from '@/components/task-auto/DateRangeFilter'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

import { useWarehouseEmptyNotice } from './components/WarehouseEmptyBanner'
import { DailyPlanPanel } from './components/DailyPlanPanel'
import { TaskFilters } from './components/TaskFilters'
import { TaskToolsMenu, type TaskToolItem } from './components/TaskToolsMenu'
import { TasksKanbanBoard } from './components/TasksKanbanBoard'
import { TasksTable } from './components/TasksTable'
import { SubmittedVideosGrid } from './components/SubmittedVideosGrid'
import { ApprovedVideosGrid } from './components/ApprovedVideosGrid'
import { ContentApprovalList } from './components/ContentApprovalList'
import { ContentScoringDialog } from './components/ContentScoringDialog'
import { DEFAULT_PUBLISHED_VIEW, PublishedVideosTab, type PublishedViewState } from './components/PublishedVideosTab'
import { TaskDetailPanel } from './components/TaskDetailPanel'
import { VideoMappingModal } from './components/VideoMappingModal'
import { CreateTaskModal } from './components/TaskModals'
import { prefillFromDailyPlan, prefillFromTask, type CreateTaskPrefill } from './components/CreateTaskModal'
import { exportApprovedTasksExcel, getApprovals, getContentLines, getProductLines, getTaskHeaderCounts, getTasks, getTeams, runTaskVideoMapping } from '@/lib/api/task-auto'
import { TASK_STATUS_LABELS, TaskStatus, type TaskVideoMatchRunResult } from '@/types/task-auto'
import { UserRole } from '@/types/auth'

type ViewMode = 'team' | 'mine'
// 'pending' = video đã nộp đang chờ duyệt (status SUBMITTED) · 'approved' = video đã nộp VÀ đã
// được duyệt (status APPROVED) — 2 tab tách biệt vì trước đây gộp chung "Video đã nộp" khiến
// người dùng không phân biệt được việc gì còn cần xử lý.
// 'published-videos' = video đã lên page Facebook nội bộ (không phải task) — có bộ lọc riêng.
type PageTab = 'table' | 'pending' | 'approved' | 'published-videos' | 'content-approval'
type TaskLayout = 'kanban' | 'list'

// 5 màn hình trên gom thành 3 tab theo việc người dùng vào trang để làm: làm/giao task · xử lý thứ
// đang chờ duyệt · xem kết quả. Tab có nhiều màn thì chọn màn bằng nút con ở bên phải hàng tab.
type TabGroup = 'tasks' | 'review' | 'results'
interface TabView { key: PageTab; label: string; icon: ElementType }
const TAB_GROUPS: { key: TabGroup; label: string; icon: ElementType; views: TabView[] }[] = [
  { key: 'tasks', label: 'Nhiệm vụ', icon: ListTodo, views: [{ key: 'table', label: 'Nhiệm vụ', icon: ListTodo }] },
  {
    key: 'review', label: 'Chờ duyệt', icon: Hourglass, views: [
      { key: 'pending', label: 'Video', icon: Film },
      { key: 'content-approval', label: 'Nội dung', icon: FileText },
    ],
  },
  {
    key: 'results', label: 'Kết quả', icon: CheckCircle2, views: [
      { key: 'approved', label: 'Video đã duyệt', icon: CheckCircle2 },
      { key: 'published-videos', label: 'Bài đăng Facebook', icon: Facebook },
    ],
  },
]
const GROUP_OF = Object.fromEntries(
  TAB_GROUPS.flatMap(g => g.views.map(v => [v.key, g.key])),
) as Record<PageTab, TabGroup>

const TABLE_LIMIT = 20

// Bộ lọc ngày chung — mỗi tab lọc theo cột ngày có nghĩa với nó; nhãn nói rõ đang lọc theo gì.
const DATE_FILTER_BY_TAB: Record<PageTab, { label: string; tooltip: string }> = {
  table: { label: 'Ngày', tooltip: 'Lọc theo hạn chót của task — task chưa đặt hạn thì tính theo ngày tạo' },
  pending: { label: 'Ngày', tooltip: 'Lọc theo hạn chót của task — task chưa đặt hạn thì tính theo ngày tạo' },
  approved: { label: 'Ngày duyệt', tooltip: 'Lọc theo thời điểm video được duyệt' },
  'published-videos': { label: 'Ngày đăng', tooltip: 'Lọc theo ngày bài được đăng lên page' },
  'content-approval': { label: 'Ngày gửi duyệt', tooltip: 'Lọc theo ngày gửi yêu cầu duyệt content' },
}

export default function TasksPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const userRoles: UserRole[] = user?.roles ?? []

  const isAdmin   = userRoles.includes(UserRole.ADMIN)
  const isManager = userRoles.includes(UserRole.MANAGER)
  const isLeader  = userRoles.includes(UserRole.LEADER)
  // isMember bắt tất cả role còn lại (MEMBER, EDITOR, CONTENT): họ chỉ xem task của mình
  const isMember  = !isAdmin && !isManager && !isLeader

  // Mọi role đều có thể tạo task (task thủ công hoặc tự nhận)
  const canCreate = true
  // Ai được duyệt/từ chối task — đồng bộ với TaskDetailPanel.tsx:326
  const canApproveReject = isAdmin || isManager || isLeader

  const { data: isApprovedEditor = false } = useQuery({
    queryKey: ['task-auto', 'my-editor-approval', user?.id],
    queryFn: async () => {
      const approvals = await getApprovals('APPROVED')
      return approvals.some(a => a.user_id === user?.id)
    },
    enabled: isLeader && !!user?.id,
  })

  const isLeaderEditor = isLeader && isApprovedEditor
  const [viewMode, setViewMode] = useState<ViewMode>('team')
  const [activeTab, setActiveTab] = useState<PageTab>('table')
  // Màn con xem gần nhất của từng tab — quay lại tab thì mở đúng màn đang xem dở
  const [lastViewOfGroup, setLastViewOfGroup] = useState<Record<TabGroup, PageTab>>({
    tasks: 'table', review: 'pending', results: 'approved',
  })
  function openView(view: PageTab) {
    setActiveTab(view)
    setLastViewOfGroup(m => ({ ...m, [GROUP_OF[view]]: view }))
  }
  // Bố cục hiển thị của tab "Tất cả nhiệm vụ": Kanban (mặc định, chia theo trạng thái)
  // hoặc List (bảng phẳng, có thể lọc theo trạng thái + phân trang thường).
  const [taskLayout, setTaskLayout] = useState<TaskLayout>('kanban')

  // ── BỘ LỌC CHUNG cho mọi tab của màn Nhiệm vụ ──
  // Nằm ở trang (không trong từng tab) nên đổi tab vẫn giữ nguyên. Mỗi tab tự hiểu khoảng ngày theo cột
  // phù hợp (xem DATE_FILTER_BY_TAB). Mặc định "Hôm nay".
  const [status, setStatus]           = useState<TaskStatus | ''>('')
  const [teamId, setTeamId]           = useState('')
  const [search, setSearch]           = useState('')
  const [dateFrom, setDateFrom]       = useState(todayString())
  const [dateTo, setDateTo]           = useState(todayString())
  const [taskType, setTaskType]       = useState<'auto' | 'manual' | ''>('')
  const [assigneeId, setAssigneeId]   = useState('')
  const [contentLineId, setContentLineId] = useState('')
  const [productLineId, setProductLineId] = useState('')
  // Bộ lọc "Quá hạn" — chỉ áp dụng khi ở layout Danh sách (bảng phẳng). Kanban không lọc theo cờ
  // này (task quá hạn vẫn hiện đủ trong 4 cột trạng thái, chỉ kèm badge cảnh báo).
  const [overdueOnly, setOverdueOnly] = useState(false)
  // Phần lọc riêng tab Video đã đăng (min view/like, sắp xếp, trang) — cũng giữ ở đây để không mất khi đổi tab
  const [publishedView, setPublishedView] = useState<PublishedViewState>(DEFAULT_PUBLISHED_VIEW)
  const [submittedPage, setSubmittedPage] = useState(1)
  const [approvedPage, setApprovedPage] = useState(1)
  const [contentApprovalPage, setContentApprovalPage] = useState(1)
  const [tablePage, setTablePage] = useState(1)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => searchParams?.get('taskId') ?? null)
  const [showCreate, setShowCreate]   = useState(false)
  // Điền sẵn modal tạo task: nhân bản từ panel chi tiết, hoặc mở từ 1 tuyến của Kế hoạch ngày
  const [createPrefill, setCreatePrefill] = useState<CreateTaskPrefill | undefined>()
  const [exporting, setExporting]     = useState(false)
  const [showMapping, setShowMapping] = useState(false)
  const [mappingPosts, setMappingPosts] = useState(false)
  const [mappingResult, setMappingResult] = useState<TaskVideoMatchRunResult | null>(null)
  const [mappingError, setMappingError] = useState<string | null>(null)
  const [showScoring, setShowScoring] = useState(false)

  // Cho phép mở thẳng task khi truy cập từ thông báo (?taskId=...)
  const taskIdParam = searchParams?.get('taskId') ?? null
  useEffect(() => {
    if (taskIdParam) setSelectedTaskId(taskIdParam)
  }, [taskIdParam])

  function openCreate(prefill?: CreateTaskPrefill) {
    setCreatePrefill(prefill)
    setShowCreate(true)
  }

  function closeTaskDetail() {
    setSelectedTaskId(null)
    if (searchParams?.get('taskId')) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('taskId')
      const query = params.toString()
      router.replace(query ? `/dashboard/task-auto/tasks?${query}` : '/dashboard/task-auto/tasks')
    }
  }

  const { data: teamsData } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })
  const teams = teamsData || []

  const { data: contentLines = [] } = useQuery({
    queryKey: ['task-auto', 'content-lines'],
    queryFn: getContentLines,
    staleTime: 10 * 60_000,
  })
  const { data: productLines = [] } = useQuery({
    queryKey: ['task-auto', 'product-lines'],
    queryFn: getProductLines,
    staleTime: 10 * 60_000,
  })
  const contentLineOptions = [...contentLines].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const productLineOptions = [...productLines].sort((a, b) => a.name.localeCompare(b.name, 'vi'))

  // TẤT CẢ team mà user đang là LEADER — 1 leader có thể quản lý nhiều team cùng lúc (khớp
  // getLeaderDashboard ở BE dùng findMany cùng lý do), trước đây dùng .find() nên chỉ lấy được
  // đúng 1 team, làm mất hẳn task/thành viên của các team còn lại.
  const leaderTeams = isLeader ? teams.filter(t => t.leader_id === user?.id) : []
  const leaderTeamIds = leaderTeams.map(t => t.id)
  // Team cụ thể đang chọn lọc trong số các team leader quản lý (rỗng = xem gộp tất cả team của mình)
  const selectedLeaderTeam = isLeader ? leaderTeams.find(t => t.id === teamId) ?? null : null

  const isMineView = isMember || (isLeaderEditor && viewMode === 'mine')
  const warehouse = useWarehouseEmptyNotice(isMineView)

  // team_id thực sự dùng cho query — với LEADER quản lý nhiều team mà chưa chọn lọc 1 team cụ
  // thể, gộp tất cả id team của họ (phân cách dấu phẩy, BE parse ở parseTeamIdFilter) để không
  // còn bị khoá cứng vào đúng 1 team như trước.
  const effectiveTeamId = isMineView
    ? undefined
    : isLeader
      ? (teamId || (leaderTeamIds.length ? leaderTeamIds.join(',') : undefined))
      : (teamId || undefined)
  const effectiveTeamIds = effectiveTeamId ? effectiveTeamId.split(',') : []

  // assignee_id thực sự dùng cho mọi query bên dưới: ở view "của tôi" khóa cứng về chính user
  const effectiveAssigneeId = isMineView ? (user?.id || undefined) : (assigneeId || undefined)

  // Đếm cho header ("N task") + 2 badge "Video chờ duyệt"/"Content chờ duyệt" — gộp thành 1 request
  // (trước đây là 3 request limit:1 riêng, mỗi request lại kéo theo cả findMany lẫn count ở BE dù
  // FE chỉ cần con số — xem tasks.controller.ts: GET tasks/header-counts). Cả 3 số dùng đúng bộ lọc
  // chung nên badge khớp với số dòng thấy được khi mở tab đó.
  const { data: headerCounts } = useQuery({
    queryKey: ['task-auto', 'tasks', 'header-counts', { status, effectiveTeamId, search, dateFrom, dateTo, taskType, viewMode, userId: user?.id, assigneeId, contentLineId, productLineId }],
    queryFn: () => getTaskHeaderCounts({
      status:        status       || undefined,
      team_id:       effectiveTeamId,
      search:        search       || undefined,
      deadline_from: dateFrom || undefined,
      deadline_to:   dateTo   || undefined,
      pending_from:  dateFrom || undefined,
      pending_to:    dateTo   || undefined,
      approval_from: dateFrom || undefined,
      approval_to:   dateTo   || undefined,
      task_type:     taskType     || undefined,
      assignee_id: effectiveAssigneeId,
      content_line_id: contentLineId || undefined,
      product_line_id: productLineId || undefined,
    }),
    refetchOnWindowFocus: true,
  })
  const total = headerCounts?.total ?? 0
  const submittedTotal = headerCounts?.submittedTotal ?? 0
  const contentApprovalTotal = headerCounts?.contentApprovalTotal ?? 0

  // Dữ liệu cho bố cục "List" — chỉ bật khi đang ở tab bảng + layout list, phân trang
  // thường thay vì tự chia theo trạng thái như Kanban.
  const { data: tableData, isLoading: isTableLoading } = useQuery({
    queryKey: ['task-auto', 'tasks', 'list', { status, effectiveTeamId, search, dateFrom, dateTo, taskType, viewMode, userId: user?.id, assigneeId, contentLineId, productLineId, tablePage, overdueOnly }],
    queryFn: () => getTasks({
      // "Quá hạn" là bộ lọc ảo ở BE (findAll q.overdue): khi bật, status/deadline_from/to bị bỏ qua
      // hoàn toàn nên không truyền lên để tránh gây hiểu nhầm — xem tasks.service.ts findAll.
      ...(overdueOnly
        ? { overdue: true }
        : {
            status:        status       || undefined,
            deadline_from: dateFrom || undefined,
            deadline_to:   dateTo   || undefined,
          }),
      team_id:       effectiveTeamId,
      search:        search       || undefined,
      task_type:     taskType     || undefined,
      page: tablePage,
      limit: TABLE_LIMIT,
      assignee_id: effectiveAssigneeId,
      content_line_id: contentLineId || undefined,
      product_line_id: productLineId || undefined,
    }),
    enabled: activeTab === 'table' && taskLayout === 'list',
    refetchOnWindowFocus: true,
  })

  // Danh sách người làm để lọc — lấy từ toàn bộ thành viên team (đúng phạm vi team đang xem),
  // không lấy từ kết quả task vì mỗi cột Kanban chỉ tải một phần nên sẽ thiếu người.
  // Ở isMineView, assignee_id đã bị khóa cứng về chính user nên không cần (và không nên) cho chọn người khác.
  const assigneeScopeTeams = effectiveTeamIds.length ? teams.filter(t => effectiveTeamIds.includes(t.id)) : teams
  const assigneeOptionsMap = new Map<string, { id: string; name: string }>()
  if (!isMineView) {
    for (const t of assigneeScopeTeams) {
      for (const m of t.members ?? []) {
        if (m.user_id && m.user?.full_name) assigneeOptionsMap.set(m.user_id, { id: m.user_id, name: m.user.full_name })
      }
    }
  }
  const assigneeOptions = Array.from(assigneeOptionsMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))

  function switchView(mode: ViewMode) {
    setViewMode(mode)
    if (mode === 'mine') setTeamId('')
  }

  // Bộ lọc chung đổi → về trang 1 ở MỌI tab (kể cả tab đang không mở), nếu không quay lại tab đó sẽ
  // đứng ở trang cũ và thấy danh sách trống dù trang 1 có kết quả. Kanban tự phân trang theo cột.
  function resetPages() {
    setTablePage(1)
    setSubmittedPage(1)
    setApprovedPage(1)
    setContentApprovalPage(1)
    setPublishedView(v => (v.page === 1 ? v : { ...v, page: 1 }))
  }
  function handleStatusChange(v: TaskStatus | '')                    { setStatus(v);        setTablePage(1) }
  function handleTeamChange(v: string)                               { setTeamId(v);        resetPages() }
  function handleSearchChange(v: string)                             { setSearch(v);        resetPages() }
  function handleDateFromChange(v: string)                           { setDateFrom(v);      resetPages() }
  function handleDateToChange(v: string)                             { setDateTo(v);        resetPages() }
  function handleTaskTypeChange(v: 'auto' | 'manual' | '')           { setTaskType(v);      resetPages() }
  function handleAssigneeChange(v: string)                           { setAssigneeId(v);    resetPages() }
  function handleOverdueChange(v: boolean)                           { setOverdueOnly(v);   setTablePage(1) }
  function handleContentLineChange(v: string)                        { setContentLineId(v); resetPages() }
  function handleProductLineChange(v: string)                        { setProductLineId(v); resetPages() }

  async function handleExportExcel() {
    if (exporting) return
    setExporting(true)
    try {
      const { blob, filename } = await exportApprovedTasksExcel({
        team_id:   effectiveTeamId,
        search:    search || undefined,
        task_type: taskType || undefined,
        assignee_id: effectiveAssigneeId,
        content_line_id: contentLineId || undefined,
        product_line_id: productLineId || undefined,
        ...(activeTab === 'approved'
          ? { reviewed_from: dateFrom || undefined, reviewed_to: dateTo || undefined }
          : { deadline_from: dateFrom || undefined, deadline_to: dateTo || undefined }),
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('Đã xuất file Excel')
    } catch (e: any) {
      toast.error(e?.message || 'Xuất Excel thất bại')
    } finally {
      setExporting(false)
    }
  }

  // Nút trên thanh lọc chỉ mở cửa sổ giới thiệu + phạm vi; việc quét (ghi link vào task) chỉ chạy
  // khi người dùng bấm "Bắt đầu" trong cửa sổ. Đang chạy dở thì mở lại để xem tiến trình.
  function handleOpenVideoMapping() {
    if (!mappingPosts) {
      setMappingResult(null)
      setMappingError(null)
    }
    setShowMapping(true)
  }

  async function handleRunVideoMapping() {
    if (mappingPosts) return
    setShowMapping(true)
    setMappingPosts(true)
    setMappingResult(null)
    setMappingError(null)
    try {
      const result = await runTaskVideoMapping({
        team_id: effectiveTeamId,
        assignee_id: effectiveAssigneeId,
        content_line_id: contentLineId || undefined,
        product_line_id: productLineId || undefined,
        task_type: taskType || undefined,
        status: status || undefined,
        // Với thao tác map, khoảng ngày luôn được hiểu là NGÀY ĐĂNG của bài FB (đã bỏ map IG).
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: search || undefined,
        search_target: activeTab === 'published-videos' ? 'video' : 'task',
      })
      setMappingResult(result)
      void queryClient.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      // Luôn báo khi xong — người dùng có thể đã đóng cửa sổ trong lúc chờ.
      if (result.matched > 0) toast.success(`Đã gắn link cho ${result.matched} video`)
      else toast('Quét xong: chưa có video mới để gắn vào task')
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || 'Gắn link video thất bại'
      setMappingError(message)
      toast.error(message)
    } finally {
      setMappingPosts(false)
    }
  }

  const pageTitle = isMember || (isLeaderEditor && viewMode === 'mine')
    ? 'Nhiệm vụ của tôi'
    : 'Quản lý nhiệm vụ'

  const formatScopeDate = (value: string) => {
    const [year, month, day] = value.split('-')
    return year && month && day ? `${day}/${month}/${year}` : value
  }
  const selectedTeamNames = effectiveTeamIds
    .map(id => teams.find(team => team.id === id)?.name)
    .filter((name): name is string => !!name)
  const selectedAssigneeName = effectiveAssigneeId
    ? (assigneeOptions.find(option => option.id === effectiveAssigneeId)?.name || (effectiveAssigneeId === user?.id ? user?.full_name : null))
    : null
  const mappingScopeLabels = [
    selectedTeamNames.length
      ? `Team: ${selectedTeamNames.join(', ')}`
      : effectiveTeamIds.length ? `${effectiveTeamIds.length} team đã chọn` : 'Tất cả team',
    selectedAssigneeName
      ? `Người làm: ${selectedAssigneeName}`
      : effectiveAssigneeId ? 'Đã lọc theo người làm' : 'Tất cả người làm',
    dateFrom && dateFrom === dateTo
      ? `Video đăng ngày ${formatScopeDate(dateFrom)}`
      : dateFrom || dateTo
        ? `Video đăng ${dateFrom ? `từ ${formatScopeDate(dateFrom)}` : ''} ${dateTo ? `đến ${formatScopeDate(dateTo)}` : ''}`.replace(/\s+/g, ' ').trim()
        : 'Video đăng trong 21 ngày gần nhất',
    contentLineId ? `Tuyến: ${contentLines.find(line => line.id === contentLineId)?.name || contentLineId}` : null,
    productLineId ? `Dòng SP: ${productLines.find(line => line.id === productLineId)?.name || productLineId}` : null,
    status ? `Trạng thái nhiệm vụ: ${TASK_STATUS_LABELS[status] ?? status}` : null,
    taskType ? `Loại nhiệm vụ: ${taskType === 'auto' ? 'Tự động' : 'Thủ công'}` : null,
    search ? `${activeTab === 'published-videos' ? 'Tìm bài đăng' : 'Tìm nhiệm vụ'}: “${search}”` : null,
  ].filter((label): label is string => !!label)

  const viewCount = (view: PageTab) =>
    view === 'pending' ? submittedTotal : view === 'content-approval' ? contentApprovalTotal : 0
  const activeGroup = TAB_GROUPS.find(g => g.key === GROUP_OF[activeTab])!

  const canExport = activeTab === 'table' || activeTab === 'approved'
  const toolItems: TaskToolItem[] = [
    {
      key: 'export',
      label: exporting ? 'Đang xuất Excel...' : 'Xuất Excel',
      description: 'Task đã hoàn thành theo bộ lọc đang chọn — mỗi người 1 tab, kèm bảng KPI tháng',
      icon: FileSpreadsheet,
      busy: exporting,
      onSelect: handleExportExcel,
      disabledReason: canExport ? undefined : 'Chỉ dùng ở tab Nhiệm vụ hoặc Kết quả › Video đã duyệt',
    },
    // API vẫn tự khóa phạm vi theo quyền: leader chỉ team phụ trách, member/editor/content chỉ task
    // và kênh của chính mình.
    ...(user ? [{
      key: 'map-posts',
      label: mappingPosts ? 'Đang gắn link video...' : 'Gắn link video',
      // Không khoá khi đang chạy: bấm lại để mở cửa sổ xem tiến trình.
      description: mappingPosts
        ? 'Bấm để xem tiến trình'
        : 'Tìm video Facebook đã đăng trên kênh và tự gắn link vào đúng task',
      icon: Link2,
      busy: mappingPosts,
      onSelect: handleOpenVideoMapping,
    }] : []),
    {
      key: 'content-scoring',
      label: 'Chấm điểm nội dung',
      description: 'Chấm PAAST cho content bất kỳ, không cần mở task',
      icon: Gauge,
      onSelect: () => setShowScoring(true),
    },
  ]

  return (
    <div className="space-y-3">
      {/* Header + Filter bar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 sm:px-6 pt-4 pb-3.5 space-y-3">
        {/* Hàng 1: Tiêu đề (kèm số task inline) · bên phải: toggle phạm vi (LeaderEditor) + menu Công cụ
            + nút chính Tạo nhiệm vụ — mọi nút hành động nằm ở đây, thanh lọc bên dưới chỉ còn lọc */}
        <div className="flex items-center justify-between gap-x-4 gap-y-2.5 flex-wrap">
          <div className="flex items-baseline gap-2.5 min-w-[160px]">
            <h1 className="text-xl font-black text-slate-900 leading-tight">{pageTitle}</h1>
            <span className="text-sm text-slate-400 whitespace-nowrap">
              {leaderTeams.length > 0 && !isMineView
                ? `${selectedLeaderTeam ? selectedLeaderTeam.name : leaderTeams.map(t => t.name).join(', ')} · ${total > 0 ? `${total} nhiệm vụ` : 'Tất cả nhiệm vụ'}`
                : total > 0 ? `${total} nhiệm vụ` : 'Tất cả nhiệm vụ'
              }
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View mode toggle (LeaderEditor) — kiểu pill để phân biệt với tab nội dung bên dưới */}
            {isLeaderEditor && (
              <div className="flex h-10 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                <button
                  type="button"
                  aria-pressed={viewMode === 'team'}
                  onClick={() => switchView('team')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 text-sm font-semibold transition-colors',
                    viewMode === 'team' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
                  )}
                >
                  <Users className="w-4 h-4" aria-hidden="true" />
                  Quản lý team
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'mine'}
                  onClick={() => switchView('mine')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 text-sm font-semibold transition-colors border-l border-gray-200',
                    viewMode === 'mine' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
                  )}
                >
                  <User className="w-4 h-4" aria-hidden="true" />
                  Của tôi
                </button>
              </div>
            )}

            <TaskToolsMenu items={toolItems} />

            {canCreate && (
              <button
                type="button"
                onClick={() => openCreate()}
                className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 text-sm font-semibold flex items-center gap-2 transition-colors flex-shrink-0 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Tạo nhiệm vụ
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: 3 tab (kèm badge số việc chờ xử lý) · bên phải: chọn màn con của tab (Video/Nội
            dung, Video đã duyệt/Bài đăng FB) hoặc bố cục Kanban/Danh sách ở tab Nhiệm vụ */}
        <div className="flex items-end gap-x-5 gap-y-1.5 flex-wrap border-b border-gray-100">
          {TAB_GROUPS.map(group => {
            const Icon = group.icon
            const active = activeGroup.key === group.key
            const count = group.views.reduce((s, v) => s + viewCount(v.key), 0)
            return (
              <button
                key={group.key}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => openView(lastViewOfGroup[group.key])}
                className={cn(
                  'flex items-center gap-2 pb-2.5 -mb-px border-b-2 text-sm font-semibold transition-colors',
                  active
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {/* Icon ẩn ở màn hẹp để 3 tab vừa 1 hàng */}
                <Icon className="hidden sm:block w-4 h-4" aria-hidden="true" />
                {group.label}
                {count > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold',
                    active ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            )
          })}

          {activeGroup.views.length > 1 ? (
            <div
              role="group"
              aria-label={`Chọn màn trong tab ${activeGroup.label}`}
              className="flex rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0 ml-auto mb-2"
            >
              {activeGroup.views.map((view, i) => {
                const Icon = view.icon
                const active = activeTab === view.key
                const count = viewCount(view.key)
                return (
                  <button
                    key={view.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => openView(view.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors',
                      i > 0 && 'border-l border-gray-200',
                      active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {view.label}
                    {count > 0 && (
                      <span className={cn(
                        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                        active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                      )}>
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            // Toggle bố cục Kanban / List — chỉ có ở tab "Nhiệm vụ"
            <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0 ml-auto mb-2">
              <button
                type="button"
                aria-pressed={taskLayout === 'kanban'}
                onClick={() => setTaskLayout('kanban')}
                title="Xem dạng Kanban"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors',
                  taskLayout === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
                )}
              >
                <Kanban className="w-4 h-4" aria-hidden="true" />
                <span className="hidden md:inline">Kanban</span>
              </button>
              <button
                type="button"
                aria-pressed={taskLayout === 'list'}
                onClick={() => setTaskLayout('list')}
                title="Xem dạng danh sách"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-l border-gray-200',
                  taskLayout === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
                )}
              >
                <Rows3 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden md:inline">Danh sách</span>
              </button>
            </div>
          )}
        </div>

        {/* Hàng 3: BỘ LỌC CHUNG — một thanh duy nhất cho mọi tab, giữ nguyên khi đổi tab */}
        <TaskFilters
          statusFilter={status}
          teamFilter={teamId}
          searchFilter={search}
          dateFromFilter={dateFrom}
          dateToFilter={dateTo}
          taskTypeFilter={taskType}
          assigneeFilter={assigneeId}
          assigneeOptions={assigneeOptions}
          teams={isLeader ? leaderTeams : teams}
          isMember={isMineView}
          // Leader chỉ quản lý 1 team thì không có gì để lọc thêm (ẩn như cũ); quản lý ≥2 team thì
          // hiện bộ lọc nhưng giới hạn lựa chọn về đúng các team của họ (options = leaderTeams ở trên).
          hideTeamFilter={isLeader && leaderTeams.length <= 1}
          // Chỉ layout "Danh sách" (bảng phẳng, không tự chia cột theo trạng thái) mới cần bộ lọc
          // Trạng thái — Kanban đã tự chia cột, các tab còn lại vốn đã cố định 1 trạng thái.
          hideStatusFilter={!(activeTab === 'table' && taskLayout === 'list')}
          // "Quá hạn" chỉ có ý nghĩa ở layout Danh sách (bảng phẳng) — Kanban hiện task quá hạn
          // ngay trong cột trạng thái kèm cảnh báo trên thẻ, không cần bộ lọc riêng ở đây nữa.
          showOverdueFilter={activeTab === 'table' && taskLayout === 'list'}
          overdueFilter={overdueOnly}
          dateFilterLabel={DATE_FILTER_BY_TAB[activeTab].label}
          dateFilterTooltip={DATE_FILTER_BY_TAB[activeTab].tooltip}
          dateFilterDefaultPreset="today"
          searchPlaceholder={activeTab === 'published-videos' ? 'Tìm theo chú thích, hashtag...' : 'Tìm theo tiêu đề nhiệm vụ...'}
          onStatusChange={handleStatusChange}
          onTeamChange={handleTeamChange}
          onSearchChange={handleSearchChange}
          onDateFromChange={handleDateFromChange}
          onDateToChange={handleDateToChange}
          onTaskTypeChange={handleTaskTypeChange}
          onAssigneeChange={handleAssigneeChange}
          onOverdueChange={handleOverdueChange}
          contentLineFilter={contentLineId}
          productLineFilter={productLineId}
          contentLineOptions={contentLineOptions}
          productLineOptions={productLineOptions}
          onContentLineChange={handleContentLineChange}
          onProductLineChange={handleProductLineChange}
          productLineDisabledReason={activeTab === 'published-videos'
            ? 'Bài đăng không gắn dòng sản phẩm — bộ lọc này không áp dụng ở Bài đăng Facebook (vẫn giữ khi quay lại tab khác)'
            : undefined}
        />
      </div>

      {/* Kế hoạch ngày (kèm cảnh báo kho SP trống) — chỉ ở tab Nhiệm vụ của view cá nhân: đây là
          việc cần làm hôm nay, các tab Chờ duyệt/Kết quả không cần */}
      {isMineView && activeTab === 'table' && (
        <DailyPlanPanel
          enabled={isMineView}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onOpenTask={setSelectedTaskId}
          onCreateManual={plan => openCreate(plan ? prefillFromDailyPlan(plan, user?.id) : undefined)}
          warehouseNotice={warehouse.notice}
          onDismissWarehouseNotice={warehouse.dismiss}
        />
      )}

      {activeTab === 'table' ? (
        taskLayout === 'kanban' ? (
          <TasksKanbanBoard
            teamId={effectiveTeamId}
            search={search || undefined}
            deadlineFrom={dateFrom || undefined}
            deadlineTo={dateTo || undefined}
            taskType={taskType}
            assigneeId={effectiveAssigneeId}
            contentLineId={contentLineId || undefined}
            productLineId={productLineId || undefined}
            currentUserId={user?.id}
            canApproveReject={canApproveReject}
            onViewTask={setSelectedTaskId}
            onClearDateFilter={() => { handleDateFromChange(''); handleDateToChange('') }}
          />
        ) : (
          <TasksTable
            tasks={tableData?.data ?? []}
            total={tableData?.total ?? 0}
            page={tablePage}
            limit={TABLE_LIMIT}
            totalPages={tableData?.totalPages ?? 1}
            isLoading={isTableLoading}
            onViewTask={setSelectedTaskId}
            onPageChange={setTablePage}
          />
        )
      ) : activeTab === 'pending' ? (
        <SubmittedVideosGrid
          teamId={effectiveTeamId}
          search={search || undefined}
          deadlineFrom={dateFrom || undefined}
          deadlineTo={dateTo || undefined}
          assigneeId={effectiveAssigneeId}
          contentLineId={contentLineId || undefined}
          productLineId={productLineId || undefined}
          page={submittedPage}
          onPageChange={setSubmittedPage}
          onViewTask={setSelectedTaskId}
          canApproveReject={canApproveReject}
        />
      ) : activeTab === 'approved' ? (
        <ApprovedVideosGrid
          teamId={effectiveTeamId}
          search={search || undefined}
          reviewedFrom={dateFrom || undefined}
          reviewedTo={dateTo || undefined}
          assigneeId={effectiveAssigneeId}
          contentLineId={contentLineId || undefined}
          productLineId={productLineId || undefined}
          page={approvedPage}
          onPageChange={setApprovedPage}
          onViewTask={setSelectedTaskId}
          currentUserId={user?.id}
          canApproveReject={canApproveReject}
        />
      ) : activeTab === 'published-videos' ? (
        <PublishedVideosTab
          teamId={effectiveTeamId}
          ownerId={effectiveAssigneeId}
          search={search || undefined}
          dateFrom={dateFrom || undefined}
          dateTo={dateTo || undefined}
          contentLine={contentLines.find(l => l.id === contentLineId)?.name}
          view={publishedView}
          onViewChange={patch => setPublishedView(v => ({ ...v, ...patch }))}
          scopeTeamIds={isLeader ? leaderTeamIds : []}
          lockedOwnerId={isMineView ? user?.id : undefined}
          currentUserId={user?.id}
          canAttachAnyTask={canApproveReject}
          onViewTask={setSelectedTaskId}
        />
      ) : (
        <ContentApprovalList
          teamId={effectiveTeamId}
          search={search || undefined}
          assigneeId={effectiveAssigneeId}
          contentLineId={contentLineId || undefined}
          productLineId={productLineId || undefined}
          dateFrom={dateFrom || undefined}
          dateTo={dateTo || undefined}
          page={contentApprovalPage}
          onPageChange={setContentApprovalPage}
          canApproveReject={canApproveReject}
        />
      )}

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          onClose={closeTaskDetail}
          userRoles={userRoles}
          currentUserId={user?.id}
          onDuplicate={task => {
            closeTaskDetail()
            openCreate(prefillFromTask(task))
          }}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          teams={teams}
          userId={user?.id}
          isLeader={isLeader}
          isAdminOrManager={isAdmin || isManager}
          isMember={isMember}
          prefill={createPrefill}
          onClose={() => setShowCreate(false)}
          onSuccess={() => setShowCreate(false)}
        />
      )}

      <ContentScoringDialog open={showScoring} onClose={() => setShowScoring(false)} />

      <VideoMappingModal
        open={showMapping}
        running={mappingPosts}
        result={mappingResult}
        error={mappingError}
        scopeLabels={mappingScopeLabels}
        canToggleAi={isAdmin || isManager}
        onClose={() => setShowMapping(false)}
        onRun={handleRunVideoMapping}
        onViewTask={taskId => {
          setShowMapping(false)
          setSelectedTaskId(taskId)
        }}
      />
    </div>
  )
}
