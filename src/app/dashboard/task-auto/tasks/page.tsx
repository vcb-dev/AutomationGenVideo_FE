'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, User, LayoutGrid, Kanban, FileClock, Rows3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

import { WarehouseEmptyBanner } from './components/WarehouseEmptyBanner'
import { TaskFilters } from './components/TaskFilters'
import { TasksKanbanBoard } from './components/TasksKanbanBoard'
import { TasksTable } from './components/TasksTable'
import { SubmittedVideosGrid } from './components/SubmittedVideosGrid'
import { ContentApprovalList } from './components/ContentApprovalList'
import { TaskDetailPanel } from './components/TaskDetailPanel'
import { CreateTaskModal } from './components/TaskModals'
import { getApprovals, getContentApprovals, getTasks, getTeams } from '@/lib/api/task-auto'
import { TaskStatus } from '@/types/task-auto'
import { UserRole } from '@/types/auth'

type ViewMode = 'team' | 'mine'
type PageTab = 'table' | 'submitted' | 'content-approval'
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
  const [taskType, setTaskType]       = useState<'auto' | 'manual' | ''>('')
  const [assigneeId, setAssigneeId]   = useState('')
  const [submittedPage, setSubmittedPage] = useState(1)
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

  // Team mà user đang là LEADER
  const leaderTeam = isLeader ? teams.find(t => t.leader_id === user?.id) ?? null : null
  const leaderTeamId = leaderTeam?.id ?? null

  const isMineView = isMember || (isLeaderEditor && viewMode === 'mine')

  // team_id thực sự dùng cho query
  const effectiveTeamId = isMineView
    ? undefined
    : isLeader
      ? (leaderTeamId ?? undefined)
      : (teamId || undefined)

  // assignee_id thực sự dùng cho mọi query bên dưới: ở view "của tôi" khóa cứng về chính user
  const effectiveAssigneeId = isMineView ? (user?.id || undefined) : (assigneeId || undefined)

  // Chỉ dùng để lấy `total` hiện ở header — nội dung task giờ do TasksKanbanBoard tự fetch
  // theo từng cột trạng thái riêng, nên limit để tối thiểu cho nhẹ.
  const { data } = useQuery({
    queryKey: ['task-auto', 'tasks', { status, effectiveTeamId, search, deadlineFrom, deadlineTo, taskType, viewMode, userId: user?.id, assigneeId }],
    queryFn: () => getTasks({
      status:        status       || undefined,
      team_id:       effectiveTeamId,
      search:        search       || undefined,
      deadline_from: deadlineFrom || undefined,
      deadline_to:   deadlineTo   || undefined,
      task_type:     taskType     || undefined,
      page: 1,
      limit: 1,
      assignee_id: effectiveAssigneeId,
    }),
    refetchOnWindowFocus: true,
  })

  const total = data?.total || 0

  // Badge đếm trên 2 tab "Video đã nộp" / "Content chờ duyệt" — thấy ngay có bao nhiêu việc
  // chờ xử lý mà không phải bấm vào từng tab. Tham số phải khớp đúng query bên trong
  // SubmittedVideosGrid / ContentApprovalList để con số không lệch với nội dung khi chuyển tab.
  const { data: submittedCountData } = useQuery({
    queryKey: ['task-auto', 'tasks', 'submitted-count', { effectiveTeamId, search, deadlineFrom, deadlineTo, effectiveAssigneeId }],
    queryFn: () => getTasks({
      status: 'SUBMITTED',
      team_id: effectiveTeamId,
      search: search || undefined,
      deadline_from: deadlineFrom || undefined,
      deadline_to: deadlineTo || undefined,
      assignee_id: effectiveAssigneeId,
      page: 1,
      limit: 1,
    }),
    refetchOnWindowFocus: true,
  })
  const submittedTotal = submittedCountData?.total ?? 0

  const { data: approvalCountData } = useQuery({
    queryKey: ['task-auto', 'content-approvals', 'pending-count', { effectiveTeamId, search, effectiveAssigneeId }],
    queryFn: () => getContentApprovals({
      status: 'PENDING',
      team_id: effectiveTeamId,
      search: search || undefined,
      assignee_id: effectiveAssigneeId,
      page: 1,
      limit: 1,
    }),
    refetchOnWindowFocus: true,
  })
  const contentApprovalTotal = approvalCountData?.total ?? 0

  // Dữ liệu cho bố cục "List" — chỉ bật khi đang ở tab bảng + layout list, phân trang
  // thường thay vì tự chia theo trạng thái như Kanban.
  const { data: tableData, isLoading: isTableLoading } = useQuery({
    queryKey: ['task-auto', 'tasks', 'list', { status, effectiveTeamId, search, deadlineFrom, deadlineTo, taskType, viewMode, userId: user?.id, assigneeId, tablePage }],
    queryFn: () => getTasks({
      status:        status       || undefined,
      team_id:       effectiveTeamId,
      search:        search       || undefined,
      deadline_from: deadlineFrom || undefined,
      deadline_to:   deadlineTo   || undefined,
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
  const assigneeScopeTeams = effectiveTeamId ? teams.filter(t => t.id === effectiveTeamId) : teams
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
  // đều được truyền xuống cả "Video đã nộp" lẫn "Content chờ duyệt" (xem props truyền cho
  // SubmittedVideosGrid/ContentApprovalList bên dưới), nên thiếu reset 1 trong 2 sẽ để lại
  // trang cũ và hiện danh sách trống dù có kết quả ở trang 1. Tab "Danh sách task" giờ là Kanban
  // (TasksKanbanBoard) tự phân trang riêng theo từng cột nên không cần reset page ở đây nữa.
  function handleStatusChange(v: TaskStatus | '')                    { setStatus(v);       setTablePage(1) }
  function handleTeamChange(v: string)                               { setTeamId(v);       setSubmittedPage(1); setContentApprovalPage(1); setTablePage(1) }
  function handleSearchChange(v: string)                             { setSearch(v);       setSubmittedPage(1); setContentApprovalPage(1); setTablePage(1) }
  function handleDeadlineFromChange(v: string)                       { setDeadlineFrom(v); setSubmittedPage(1); setTablePage(1) }
  function handleDeadlineToChange(v: string)                         { setDeadlineTo(v);   setSubmittedPage(1); setTablePage(1) }
  function handleTaskTypeChange(v: 'auto' | 'manual' | '')           { setTaskType(v);     setTablePage(1) }
  function handleAssigneeChange(v: string)                           { setAssigneeId(v);  setSubmittedPage(1); setContentApprovalPage(1); setTablePage(1) }

  const pageTitle = isMember || (isLeaderEditor && viewMode === 'mine')
    ? 'Nhiệm vụ của tôi'
    : 'Quản lý Task'

  return (
    <div className="space-y-5">
      {/* Header + Filter bar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-7 pt-5 pb-4 space-y-4">
        {/* Hàng 1: Tiêu đề + toggle phạm vi (LeaderEditor) — tách khỏi hàng tab để header
            không dồn hết điều khiển vào một hàng, đỡ rối khi màn hình hẹp */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-[160px]">
            <h1 className="text-2xl font-black text-slate-900 leading-tight">{pageTitle}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {leaderTeam && !isMineView
                ? `${leaderTeam.name} · ${total > 0 ? `${total} task` : 'Danh sách task'}`
                : total > 0 ? `${total} task` : 'Danh sách task'
              }
            </p>
          </div>

          {/* View mode toggle (LeaderEditor) — kiểu pill để phân biệt với tab nội dung bên dưới */}
          {isLeaderEditor && (
            <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => switchView('team')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors',
                  viewMode === 'team' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
                )}
              >
                <Users className="w-4 h-4" />
                Quản lý team
              </button>
              <button
                onClick={() => switchView('mine')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-l border-gray-200',
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
        <div className="flex items-end gap-x-5 gap-y-2 flex-wrap border-b border-gray-100">
          {([
            { key: 'table' as const, label: 'Danh sách task', icon: Kanban, count: null },
            { key: 'submitted' as const, label: 'Video đã nộp', icon: LayoutGrid, count: submittedTotal },
            { key: 'content-approval' as const, label: 'Content chờ duyệt', icon: FileClock, count: contentApprovalTotal },
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

        {/* Hàng 3: bộ lọc + nút Tạo task */}
        <TaskFilters
          statusFilter={status}
          teamFilter={teamId}
          searchFilter={search}
          deadlineFromFilter={deadlineFrom}
          deadlineToFilter={deadlineTo}
          taskTypeFilter={taskType}
          assigneeFilter={assigneeId}
          assigneeOptions={assigneeOptions}
          teams={teams}
          canCreate={canCreate}
          isMember={isMineView}
          hideTeamFilter={isLeader}
          // Chỉ layout "Danh sách" (bảng phẳng, không tự chia cột theo trạng thái) mới cần bộ lọc
          // Trạng thái — Kanban đã tự chia cột, còn tab "Video đã nộp"/"Content chờ duyệt" không hỗ trợ lọc này.
          hideStatusFilter={!(activeTab === 'table' && taskLayout === 'list')}
          hideDeadlineFilter={activeTab === 'content-approval'}
          onStatusChange={handleStatusChange}
          onTeamChange={handleTeamChange}
          onSearchChange={handleSearchChange}
          onDeadlineFromChange={handleDeadlineFromChange}
          onDeadlineToChange={handleDeadlineToChange}
          onTaskTypeChange={handleTaskTypeChange}
          onAssigneeChange={handleAssigneeChange}
          onCreateClick={() => setShowCreate(true)}
        />
      </div>

      {isMineView && <WarehouseEmptyBanner enabled={isMineView} />}

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
      ) : activeTab === 'submitted' ? (
        <SubmittedVideosGrid
          teamId={effectiveTeamId}
          search={search || undefined}
          deadlineFrom={deadlineFrom || undefined}
          deadlineTo={deadlineTo || undefined}
          assigneeId={effectiveAssigneeId}
          page={submittedPage}
          onPageChange={setSubmittedPage}
          onViewTask={setSelectedTaskId}
          canApproveReject={canApproveReject}
        />
      ) : (
        <ContentApprovalList
          teamId={effectiveTeamId}
          search={search || undefined}
          assigneeId={effectiveAssigneeId}
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
