'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, User, LayoutGrid, Kanban, FileClock, Rows3, Gauge, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

import { WarehouseEmptyBanner } from './components/WarehouseEmptyBanner'
import { TaskFilters } from './components/TaskFilters'
import { TasksKanbanBoard } from './components/TasksKanbanBoard'
import { TasksTable } from './components/TasksTable'
import { SubmittedVideosGrid } from './components/SubmittedVideosGrid'
import { ApprovedVideosGrid } from './components/ApprovedVideosGrid'
import { ContentApprovalList } from './components/ContentApprovalList'
import { ContentScoringTab } from './components/ContentScoringTab'
import { TaskDetailPanel } from './components/TaskDetailPanel'
import { CreateTaskModal } from './components/TaskModals'
import { getApprovals, getTaskHeaderCounts, getTasks, getTeams } from '@/lib/api/task-auto'
import { TaskStatus } from '@/types/task-auto'
import { UserRole } from '@/types/auth'

type ViewMode = 'team' | 'mine'
// 'pending' = video đã nộp đang chờ duyệt (status SUBMITTED) · 'approved' = video đã nộp VÀ đã
// được duyệt (status APPROVED) — 2 tab tách biệt vì trước đây gộp chung "Video đã nộp" khiến
// người dùng không phân biệt được việc gì còn cần xử lý.
type PageTab = 'table' | 'pending' | 'approved' | 'content-approval' | 'content-scoring'
type TaskLayout = 'kanban' | 'list'

const TABLE_LIMIT = 20

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TasksPage() {
  const { user } = useAuthStore()
  const router = useRouter()
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
  // Bố cục hiển thị của tab "Danh sách task": Kanban (mặc định, chia theo trạng thái)
  // hoặc List (bảng phẳng, có thể lọc theo trạng thái + phân trang thường).
  const [taskLayout, setTaskLayout] = useState<TaskLayout>('kanban')

  const [status, setStatus]           = useState<TaskStatus | ''>('')
  const [teamId, setTeamId]           = useState('')
  const [search, setSearch]           = useState('')
  const [deadlineFrom, setDeadlineFrom] = useState(todayString())
  const [deadlineTo, setDeadlineTo]     = useState(todayString())
  // Bộ lọc ngày riêng cho tab "Video đã nộp" (status APPROVED) — lọc theo reviewed_at, không dùng
  // chung deadlineFrom/To vì đó là hạn chót/ngày tạo, không phải ngày duyệt. Mặc định để trống
  // (không giới hạn ngày) vì đây là tab xem lại lịch sử, không như deadlineFrom/To mặc định "hôm nay".
  const [approvedFrom, setApprovedFrom] = useState('')
  const [approvedTo, setApprovedTo]     = useState('')
  // Bộ lọc ngày riêng cho tab "Video chờ duyệt" (status SUBMITTED) — vẫn lọc theo cùng field
  // hạn chót/ngày tạo như tab "Danh sách task" (deadlineFrom/To) nhưng KHÔNG dùng chung state:
  // video chờ duyệt cần xử lý ngay bất kể hạn chót ban đầu là ngày nào, mặc định "hôm nay" của
  // deadlineFrom/To sẽ che khuất phần lớn video đang chờ (hạn chót không rơi đúng hôm nay).
  // Mặc định để trống (không giới hạn ngày), giống approvedFrom/To.
  const [pendingFrom, setPendingFrom] = useState('')
  const [pendingTo, setPendingTo]     = useState('')
  const [taskType, setTaskType]       = useState<'auto' | 'manual' | ''>('')
  const [assigneeId, setAssigneeId]   = useState('')
  // Bộ lọc "Quá hạn" — chỉ áp dụng khi ở layout Danh sách (bảng phẳng). Kanban không lọc theo cờ
  // này (task quá hạn vẫn hiện đủ trong 4 cột trạng thái, chỉ kèm badge cảnh báo); bấm số "Quá hạn"
  // trên KanbanStatsBar sẽ tự chuyển sang layout Danh sách và bật cờ này (xem onShowOverdueList).
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [submittedPage, setSubmittedPage] = useState(1)
  const [approvedPage, setApprovedPage] = useState(1)
  const [contentApprovalPage, setContentApprovalPage] = useState(1)
  const [tablePage, setTablePage] = useState(1)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => searchParams?.get('taskId') ?? null)
  const [showCreate, setShowCreate]   = useState(false)

  // Cho phép mở thẳng task khi truy cập từ thông báo (?taskId=...)
  const taskIdParam = searchParams?.get('taskId') ?? null
  useEffect(() => {
    if (taskIdParam) setSelectedTaskId(taskIdParam)
  }, [taskIdParam])

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

  // TẤT CẢ team mà user đang là LEADER — 1 leader có thể quản lý nhiều team cùng lúc (khớp
  // getLeaderDashboard ở BE dùng findMany cùng lý do), trước đây dùng .find() nên chỉ lấy được
  // đúng 1 team, làm mất hẳn task/thành viên của các team còn lại.
  const leaderTeams = isLeader ? teams.filter(t => t.leader_id === user?.id) : []
  const leaderTeamIds = leaderTeams.map(t => t.id)
  // Team cụ thể đang chọn lọc trong số các team leader quản lý (rỗng = xem gộp tất cả team của mình)
  const selectedLeaderTeam = isLeader ? leaderTeams.find(t => t.id === teamId) ?? null : null

  const isMineView = isMember || (isLeaderEditor && viewMode === 'mine')

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
  // FE chỉ cần con số — xem tasks.controller.ts: GET tasks/header-counts). Badge dùng pendingFrom/To
  // (mặc định trống = mọi ngày) cho "Video chờ duyệt", KHÔNG dùng chung deadlineFrom/To (mặc định
  // "hôm nay") của header vì cần thấy đủ số lượng thật đang chờ xử lý, không chỉ phần hạn hôm nay.
  const { data: headerCounts } = useQuery({
    queryKey: ['task-auto', 'tasks', 'header-counts', { status, effectiveTeamId, search, deadlineFrom, deadlineTo, pendingFrom, pendingTo, taskType, viewMode, userId: user?.id, assigneeId }],
    queryFn: () => getTaskHeaderCounts({
      status:        status       || undefined,
      team_id:       effectiveTeamId,
      search:        search       || undefined,
      deadline_from: deadlineFrom || undefined,
      deadline_to:   deadlineTo   || undefined,
      pending_from:  pendingFrom  || undefined,
      pending_to:    pendingTo    || undefined,
      task_type:     taskType     || undefined,
      assignee_id: effectiveAssigneeId,
    }),
    refetchOnWindowFocus: true,
  })
  const total = headerCounts?.total ?? 0
  const submittedTotal = headerCounts?.submittedTotal ?? 0
  const contentApprovalTotal = headerCounts?.contentApprovalTotal ?? 0

  // Dữ liệu cho bố cục "List" — chỉ bật khi đang ở tab bảng + layout list, phân trang
  // thường thay vì tự chia theo trạng thái như Kanban.
  const { data: tableData, isLoading: isTableLoading } = useQuery({
    queryKey: ['task-auto', 'tasks', 'list', { status, effectiveTeamId, search, deadlineFrom, deadlineTo, taskType, viewMode, userId: user?.id, assigneeId, tablePage, overdueOnly }],
    queryFn: () => getTasks({
      // "Quá hạn" là bộ lọc ảo ở BE (findAll q.overdue): khi bật, status/deadline_from/to bị bỏ qua
      // hoàn toàn nên không truyền lên để tránh gây hiểu nhầm — xem tasks.service.ts findAll.
      ...(overdueOnly
        ? { overdue: true }
        : {
            status:        status       || undefined,
            deadline_from: deadlineFrom || undefined,
            deadline_to:   deadlineTo   || undefined,
          }),
      team_id:       effectiveTeamId,
      search:        search       || undefined,
      task_type:     taskType     || undefined,
      page: tablePage,
      limit: TABLE_LIMIT,
      assignee_id: effectiveAssigneeId,
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

  // Mỗi filter reset về trang 1 cho MỌI tab mà nó thực sự ảnh hưởng tới — team/search/assignee
  // đều được truyền xuống cả "Video chờ duyệt"/"Video đã nộp" lẫn "Content chờ duyệt" (xem props
  // truyền cho SubmittedVideosGrid/ApprovedVideosGrid/ContentApprovalList bên dưới), nên thiếu
  // reset 1 trong các tab sẽ để lại trang cũ và hiện danh sách trống dù có kết quả ở trang 1.
  // Tab "Danh sách task" giờ là Kanban (TasksKanbanBoard) tự phân trang riêng theo từng cột nên
  // không cần reset page ở đây nữa.
  function handleStatusChange(v: TaskStatus | '')                    { setStatus(v);       setTablePage(1) }
  function handleTeamChange(v: string)                               { setTeamId(v);       setSubmittedPage(1); setApprovedPage(1); setContentApprovalPage(1); setTablePage(1) }
  function handleSearchChange(v: string)                             { setSearch(v);       setSubmittedPage(1); setApprovedPage(1); setContentApprovalPage(1); setTablePage(1) }
  function handleDeadlineFromChange(v: string)                       { setDeadlineFrom(v); setTablePage(1) }
  function handleDeadlineToChange(v: string)                         { setDeadlineTo(v);   setTablePage(1) }
  function handleApprovedFromChange(v: string)                       { setApprovedFrom(v); setApprovedPage(1) }
  function handleApprovedToChange(v: string)                         { setApprovedTo(v);   setApprovedPage(1) }
  function handlePendingFromChange(v: string)                        { setPendingFrom(v);  setSubmittedPage(1) }
  function handlePendingToChange(v: string)                          { setPendingTo(v);    setSubmittedPage(1) }
  function handleTaskTypeChange(v: 'auto' | 'manual' | '')           { setTaskType(v);     setTablePage(1) }
  function handleAssigneeChange(v: string)                           { setAssigneeId(v);  setSubmittedPage(1); setApprovedPage(1); setContentApprovalPage(1); setTablePage(1) }
  function handleOverdueChange(v: boolean)                           { setOverdueOnly(v);  setTablePage(1) }

  const pageTitle = isMember || (isLeaderEditor && viewMode === 'mine')
    ? 'Nhiệm vụ của tôi'
    : 'Quản lý Task'

  return (
    <div className="space-y-3">
      {/* Header + Filter bar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 pt-4 pb-3.5 space-y-3">
        {/* Hàng 1: Tiêu đề (kèm số task inline, gọn 1 dòng) + toggle phạm vi (LeaderEditor) */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-baseline gap-2.5 min-w-[160px]">
            <h1 className="text-xl font-black text-slate-900 leading-tight">{pageTitle}</h1>
            <span className="text-sm text-slate-400 whitespace-nowrap">
              {leaderTeams.length > 0 && !isMineView
                ? `${selectedLeaderTeam ? selectedLeaderTeam.name : leaderTeams.map(t => t.name).join(', ')} · ${total > 0 ? `${total} task` : 'Danh sách task'}`
                : total > 0 ? `${total} task` : 'Danh sách task'
              }
            </span>
          </div>

          {/* View mode toggle (LeaderEditor) — kiểu pill để phân biệt với tab nội dung bên dưới */}
          {isLeaderEditor && (
            <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => switchView('team')}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 text-sm font-semibold transition-colors',
                  viewMode === 'team' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
                )}
              >
                <Users className="w-4 h-4" />
                Quản lý team
              </button>
              <button
                onClick={() => switchView('mine')}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 text-sm font-semibold transition-colors border-l border-gray-200',
                  viewMode === 'mine' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
                )}
              >
                <User className="w-4 h-4" />
                Của tôi
              </button>
            </div>
          )}
        </div>

        {/* Hàng 2: tab nội dung (kèm badge số việc chờ xử lý) + toggle bố cục Kanban/List
            cùng nằm trên một đường kẻ chân để nhóm điều khiển "đang xem gì" về một chỗ */}
        <div className="flex items-end gap-x-5 gap-y-1.5 flex-wrap border-b border-gray-100">
          {([
            { key: 'table' as const, label: 'Danh sách task', icon: Kanban, count: null },
            { key: 'pending' as const, label: 'Video chờ duyệt', icon: LayoutGrid, count: submittedTotal },
            { key: 'approved' as const, label: 'Video đã nộp', icon: CheckCircle2, count: null },
            { key: 'content-approval' as const, label: 'Content chờ duyệt', icon: FileClock, count: contentApprovalTotal },
            { key: 'content-scoring' as const, label: 'Chấm điểm content', icon: Gauge, count: null },
          ]).map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 pb-2.5 -mb-px border-b-2 text-sm font-semibold transition-colors',
                  active
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold',
                    active ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </button>
            )
          })}

          {/* Toggle bố cục Kanban / List — chỉ có ý nghĩa ở tab "Danh sách task" */}
          {activeTab === 'table' && (
            <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0 ml-auto mb-2">
              <button
                type="button"
                onClick={() => setTaskLayout('kanban')}
                title="Xem dạng Kanban"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors',
                  taskLayout === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
                )}
              >
                <Kanban className="w-4 h-4" />
                <span className="hidden md:inline">Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskLayout('list')}
                title="Xem dạng danh sách"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-l border-gray-200',
                  taskLayout === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
                )}
              >
                <Rows3 className="w-4 h-4" />
                <span className="hidden md:inline">Danh sách</span>
              </button>
            </div>
          )}
        </div>

        {/* Hàng 3: bộ lọc + nút Tạo task — không áp dụng cho tab chấm điểm content (công cụ độc lập, không lọc theo task) */}
        {activeTab !== 'content-scoring' && (
        <TaskFilters
          statusFilter={status}
          teamFilter={teamId}
          searchFilter={search}
          dateFromFilter={activeTab === 'approved' ? approvedFrom : activeTab === 'pending' ? pendingFrom : deadlineFrom}
          dateToFilter={activeTab === 'approved' ? approvedTo : activeTab === 'pending' ? pendingTo : deadlineTo}
          taskTypeFilter={taskType}
          assigneeFilter={assigneeId}
          assigneeOptions={assigneeOptions}
          teams={isLeader ? leaderTeams : teams}
          canCreate={canCreate}
          isMember={isMineView}
          // Leader chỉ quản lý 1 team thì không có gì để lọc thêm (ẩn như cũ); quản lý ≥2 team thì
          // hiện bộ lọc nhưng giới hạn lựa chọn về đúng các team của họ (options = leaderTeams ở trên).
          hideTeamFilter={isLeader && leaderTeams.length <= 1}
          // Chỉ layout "Danh sách" (bảng phẳng, không tự chia cột theo trạng thái) mới cần bộ lọc
          // Trạng thái — Kanban đã tự chia cột, còn tab "Video chờ duyệt"/"Video đã nộp"/"Content chờ duyệt" không hỗ trợ lọc này.
          hideStatusFilter={!(activeTab === 'table' && taskLayout === 'list')}
          hideDateFilter={activeTab === 'content-approval'}
          // "Quá hạn" chỉ có ý nghĩa ở layout Danh sách (bảng phẳng) — Kanban hiện task quá hạn
          // ngay trong cột trạng thái kèm cảnh báo trên thẻ, không cần bộ lọc riêng ở đây nữa.
          showOverdueFilter={activeTab === 'table' && taskLayout === 'list'}
          overdueFilter={overdueOnly}
          // Tab "Video đã nộp" lọc theo ngày duyệt (reviewed_at) — khác hạn chót/ngày tạo của các tab
          // còn lại. "Video chờ duyệt" vẫn lọc theo hạn chót/ngày tạo như "Danh sách task" nhưng
          // KHÔNG mặc định "hôm nay" (xem khai báo pendingFrom/To) — cả 2 đều là tab xem việc cần
          // xử lý ngay nên không nên bị 1 khung ngày mặc định che khuất.
          dateFilterLabel={activeTab === 'approved' ? 'Ngày duyệt' : 'Ngày'}
          dateFilterTooltip={activeTab === 'approved'
            ? 'Lọc theo thời điểm video được duyệt'
            : 'Lọc theo hạn chót của task — task chưa đặt hạn thì tính theo ngày tạo'}
          dateFilterDefaultPreset={activeTab === 'approved' || activeTab === 'pending' ? 'all' : 'today'}
          onStatusChange={handleStatusChange}
          onTeamChange={handleTeamChange}
          onSearchChange={handleSearchChange}
          onDateFromChange={activeTab === 'approved' ? handleApprovedFromChange : activeTab === 'pending' ? handlePendingFromChange : handleDeadlineFromChange}
          onDateToChange={activeTab === 'approved' ? handleApprovedToChange : activeTab === 'pending' ? handlePendingToChange : handleDeadlineToChange}
          onTaskTypeChange={handleTaskTypeChange}
          onAssigneeChange={handleAssigneeChange}
          onOverdueChange={handleOverdueChange}
          onCreateClick={() => setShowCreate(true)}
        />
        )}
      </div>

      {isMineView && activeTab !== 'content-scoring' && <WarehouseEmptyBanner enabled={isMineView} />}

      {activeTab === 'table' ? (
        taskLayout === 'kanban' ? (
          <TasksKanbanBoard
            teamId={effectiveTeamId}
            search={search || undefined}
            deadlineFrom={deadlineFrom || undefined}
            deadlineTo={deadlineTo || undefined}
            taskType={taskType}
            assigneeId={effectiveAssigneeId}
            currentUserId={user?.id}
            canApproveReject={canApproveReject}
            onViewTask={setSelectedTaskId}
            onClearDateFilter={() => { handleDeadlineFromChange(''); handleDeadlineToChange('') }}
            onShowOverdueList={() => { setTaskLayout('list'); setOverdueOnly(true); setTablePage(1) }}
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
          deadlineFrom={pendingFrom || undefined}
          deadlineTo={pendingTo || undefined}
          assigneeId={effectiveAssigneeId}
          page={submittedPage}
          onPageChange={setSubmittedPage}
          onViewTask={setSelectedTaskId}
          canApproveReject={canApproveReject}
        />
      ) : activeTab === 'approved' ? (
        <ApprovedVideosGrid
          teamId={effectiveTeamId}
          search={search || undefined}
          reviewedFrom={approvedFrom || undefined}
          reviewedTo={approvedTo || undefined}
          assigneeId={effectiveAssigneeId}
          page={approvedPage}
          onPageChange={setApprovedPage}
          onViewTask={setSelectedTaskId}
        />
      ) : activeTab === 'content-approval' ? (
        <ContentApprovalList
          teamId={effectiveTeamId}
          search={search || undefined}
          assigneeId={effectiveAssigneeId}
          page={contentApprovalPage}
          onPageChange={setContentApprovalPage}
          canApproveReject={canApproveReject}
        />
      ) : (
        <ContentScoringTab />
      )}

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          onClose={closeTaskDetail}
          userRoles={userRoles}
          currentUserId={user?.id}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          teams={teams}
          userId={user?.id}
          isLeader={isLeader}
          isAdminOrManager={isAdmin || isManager}
          isMember={isMember}
          onClose={() => setShowCreate(false)}
          onSuccess={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
