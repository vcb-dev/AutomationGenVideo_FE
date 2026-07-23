'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, User, LayoutGrid, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

import { TaskStatsBar } from './components/TaskStatsBar'
import { WarehouseEmptyBanner } from './components/WarehouseEmptyBanner'
import { TaskFilters } from './components/TaskFilters'
import { TasksTable } from './components/TasksTable'
import { SubmittedVideosGrid } from './components/SubmittedVideosGrid'
import { TaskDetailPanel } from './components/TaskDetailPanel'
import { CreateTaskModal } from './components/TaskModals'
import { getApprovals, getTasks, getTeams } from '@/lib/api/task-auto'
import { TaskStatus } from '@/types/task-auto'
import { UserRole } from '@/types/auth'

type ViewMode = 'team' | 'mine'
type PageTab = 'table' | 'submitted'

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

  const [status, setStatus]           = useState<TaskStatus | ''>('')
  const [teamId, setTeamId]           = useState('')
  const [search, setSearch]           = useState('')
  const [deadlineDate, setDeadlineDate] = useState(todayString())
  const [taskType, setTaskType]       = useState<'auto' | 'manual' | ''>('')
  const [assigneeId, setAssigneeId]   = useState('')
  const [page, setPage]               = useState(1)
  const [submittedPage, setSubmittedPage] = useState(1)

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

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'tasks', { status, effectiveTeamId, search, deadlineDate, taskType, page, viewMode, userId: user?.id, assigneeId }],
    queryFn: () => getTasks({
      status:        status       || undefined,
      team_id:       effectiveTeamId,
      search:        search       || undefined,
      deadline_date: deadlineDate || undefined,
      task_type:     taskType     || undefined,
      page,
      limit: 6,
      assignee_id: isMineView ? (user?.id || undefined) : (assigneeId || undefined),
    }),
    refetchOnWindowFocus: true,
  })

  const tasks      = data?.data       || []
  const totalPages = data?.totalPages || 1
  const total      = data?.total      || 0

  // Danh sách người làm để lọc — lấy từ toàn bộ thành viên team (đúng phạm vi team đang xem),
  // không lấy từ `tasks` vì đó chỉ là 1 trang kết quả (limit: 6) nên sẽ thiếu người.
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
    setPage(1)
    if (mode === 'mine') setTeamId('')
  }

  function handleStatusChange(v: TaskStatus | '')                    { setStatus(v);       setPage(1) }
  function handleTeamChange(v: string)                               { setTeamId(v);       setPage(1); setSubmittedPage(1) }
  function handleSearchChange(v: string)                             { setSearch(v);       setPage(1); setSubmittedPage(1) }
  function handleDeadlineDateChange(v: string)                       { setDeadlineDate(v); setPage(1); setSubmittedPage(1) }
  function handleTaskTypeChange(v: 'auto' | 'manual' | '')           { setTaskType(v);    setPage(1) }
  function handleAssigneeChange(v: string)                           { setAssigneeId(v);  setPage(1) }

  const pageTitle = isMember || (isLeaderEditor && viewMode === 'mine')
    ? 'Nhiệm vụ của tôi'
    : 'Quản lý Task'

  return (
    <div className="space-y-5">
      {/* Header + Filter bar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-7 py-5 space-y-4">
        {/* Hàng 1: Tiêu đề + tab switcher + view toggle */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-shrink-0 min-w-[160px]">
            <h1 className="text-2xl font-black text-slate-900 leading-tight">{pageTitle}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {leaderTeam && !isMineView
                ? `${leaderTeam.name} · ${total > 0 ? `${total} task` : 'Danh sách task'}`
                : total > 0 ? `${total} task` : 'Danh sách task'
              }
            </p>
          </div>

          <div className="w-px h-10 bg-gray-200 flex-shrink-0 hidden sm:block" />

          {/* Tab switcher: bảng task / video đã nộp */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={() => setActiveTab('table')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors',
                activeTab === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-gray-100'
              )}
            >
              <Table2 className="w-4 h-4" />
              Danh sách task
            </button>
            <button
              onClick={() => setActiveTab('submitted')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-l border-gray-200',
                activeTab === 'submitted' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 hover:bg-gray-100'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Video đã nộp
            </button>
          </div>

          {/* View mode toggle (LeaderEditor) */}
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
                  viewMode === 'mine' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 hover:bg-gray-100'
                )}
              >
                <User className="w-4 h-4" />
                Của tôi
              </button>
            </div>
          )}
        </div>

        <div className="h-px bg-gray-100" />

        {/* Hàng 2: bộ lọc + nút Tạo task */}
        <TaskFilters
          statusFilter={status}
          teamFilter={teamId}
          searchFilter={search}
          deadlineDateFilter={deadlineDate}
          taskTypeFilter={taskType}
          assigneeFilter={assigneeId}
          assigneeOptions={assigneeOptions}
          teams={teams}
          canCreate={canCreate}
          isMember={isMineView}
          hideTeamFilter={isLeader}
          hideStatusFilter={activeTab === 'submitted'}
          onStatusChange={handleStatusChange}
          onTeamChange={handleTeamChange}
          onSearchChange={handleSearchChange}
          onDeadlineDateChange={handleDeadlineDateChange}
          onTaskTypeChange={handleTaskTypeChange}
          onAssigneeChange={handleAssigneeChange}
          onCreateClick={() => setShowCreate(true)}
        />
      </div>

      {/* <TaskStatsBar tasks={tasks} /> */}

      {isMineView && <WarehouseEmptyBanner enabled={isMineView} />}

      {activeTab === 'table' ? (
        <TasksTable
          tasks={tasks}
          total={total}
          page={page}
          totalPages={totalPages}
          isLoading={isLoading}
          onViewTask={setSelectedTaskId}
          onPageChange={setPage}
        />
      ) : (
        <SubmittedVideosGrid
          teamId={effectiveTeamId}
          teams={teams}
          search={search || undefined}
          deadlineDate={deadlineDate || undefined}
          assigneeId={isMineView ? user?.id : undefined}
          page={submittedPage}
          onPageChange={setSubmittedPage}
          onViewTask={setSelectedTaskId}
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
