'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, DarkTextarea, CustomSelect, ServerSearchSelect } from '@/components/task-auto/DarkInput'
import { rejectTask, createTask, getContents, getProducts, getSources } from '@/lib/api/task-auto'
import type { Task, Team, Source } from '@/types/task-auto'

export { SubmitModal } from './TaskSubmitModal'

// ── Reject Modal ──────────────────────────────────

interface RejectModalProps {
  task: Task
  onClose: () => void
  onSuccess: () => void
}

export function RejectModal({ task, onClose, onSuccess }: RejectModalProps) {
  const [reason, setReason] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => rejectTask(task.id, reason),
    onSuccess: () => {
      toast.success('Đã từ chối task')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', task.id] })
      onSuccess()
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  return (
    <DarkModal
      open
      onClose={onClose}
      title="Từ chối task"
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !reason.trim()}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            {mutation.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
          </button>
        </>
      }
    >
      <DarkTextarea
        label="Lý do từ chối *"
        rows={3}
        placeholder="Nhập lý do từ chối..."
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
    </DarkModal>
  )
}

// ── Create Task Modal ─────────────────────────────

interface CreateForm {
  content_id: string
  product_id: string
  team_id: string
  assignee_id: string
  deadline: string
  source_outro_id: string
  source_extra_id: string
}

interface CreateTaskModalProps {
  teams: Team[]
  userId?: string
  isLeader?: boolean
  isAdminOrManager?: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateTaskModal({ teams, userId, isLeader, isAdminOrManager, onClose, onSuccess }: CreateTaskModalProps) {
  const qc = useQueryClient()

  // LEADER's team — tìm team mà họ là leader
  const leaderTeam = isLeader && !isAdminOrManager
    ? teams.find(t => t.leader_id === userId)
    : undefined

  const [form, setForm] = useState<CreateForm>({
    content_id: '',
    product_id: '',
    team_id: leaderTeam?.id ?? '',
    assignee_id: '',
    deadline: '',
    source_outro_id: '',
    source_extra_id: '',
  })
  const [contentSearch, setContentSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')

  // Khi teams load xong, LEADER tự động lock vào team của mình
  useEffect(() => {
    if (leaderTeam && !form.team_id) {
      setForm(f => ({ ...f, team_id: leaderTeam.id }))
    }
  }, [leaderTeam?.id])

  // Content không lọc theo status — với M:N, content có thể dùng cho nhiều sản phẩm khác nhau
  const { data: contentsData, isLoading: loadingContents } = useQuery({
    queryKey: ['task-auto', 'create-contents', contentSearch],
    queryFn: () => getContents({ search: contentSearch, limit: 20 }),
    enabled: contentSearch.length > 1 || !contentSearch,
  })

  // Lọc sản phẩm theo kho của team đang chọn
  const { data: productsData } = useQuery({
    queryKey: ['task-auto', 'create-products', productSearch, form.team_id],
    queryFn: () => getProducts({ search: productSearch, limit: 50, team_id: form.team_id || undefined }),
  })

  // Sources: sản phẩm đã được chọn
  const { data: productSourcesData } = useQuery({
    queryKey: ['task-auto', 'product-sources', form.product_id],
    queryFn: () => getSources({ product_id: form.product_id, is_active: true, limit: 50 }),
    enabled: !!form.product_id,
  })

  // Kho source cho dropdown (OUTRO, COLLECTED, WORKSHOP, HUYK)
  const { data: sourceLibData } = useQuery({
    queryKey: ['task-auto', 'source-library'],
    queryFn: () => getSources({ is_active: true, limit: 200 }),
  })

  const contents = contentsData?.data || []
  const products = productsData?.data || []
  const allSources: Source[] = sourceLibData?.data ?? []
  // Product section: chỉ PRODUCT_STOCK sources gắn với sản phẩm
  const productSources: Source[] = (productSourcesData?.data ?? []).filter(s => s.type === 'PRODUCT_STOCK')
  // Dropdowns: lọc theo type từ toàn bộ library, KHÔNG filter product_id
  const outroSources: Source[]     = allSources.filter(s => s.type === 'OUTRO')
  const collectedSources: Source[] = allSources.filter(s => s.type === 'COLLECTED')
  const workshopSources: Source[]  = allSources.filter(s => s.type === 'WORKSHOP')
  const huykSources: Source[]      = allSources.filter(s => s.type === 'HUYK')
  const selectedExtraSource        = allSources.find(s => s.id === form.source_extra_id)

  // Derived: selected content object (has content_line info)
  const selectedContent = contents.find(c => c.id === form.content_id)

  const selectedTeam = teams.find(t => t.id === form.team_id)
  // Assignee list: chỉ lấy từ team đã chọn
  const teamMembers = selectedTeam?.members || []

  const handleContentChange = (contentId: string) => {
    const content = contents.find(c => c.id === contentId)
    setForm(f => ({
      ...f,
      content_id: contentId,
      product_id: f.product_id || '',
    }))
  }

  const mutation = useMutation({
    mutationFn: () => createTask({
      content_id: form.content_id || undefined,
      product_id: form.product_id || undefined,
      team_id: form.team_id || undefined,
      assignee_id: form.assignee_id || undefined,
      deadline: form.deadline || undefined,
      source_outro_id: form.source_outro_id || undefined,
      source_extra_id: form.source_extra_id || undefined,
    } as Partial<Task>),
    onSuccess: () => {
      toast.success('Tạo task thành công!')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      onSuccess()
    },
    onError: () => toast.error('Tạo task thất bại'),
  })

  const canSubmit = !!form.content_id && !!form.product_id && !!form.team_id && !mutation.isPending

  return (
    <DarkModal
      open
      onClose={onClose}
      title="Tạo task mới"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            {mutation.isPending ? 'Đang tạo...' : 'Tạo task'}
          </button>
        </>
      }
    >
      <div className="space-y-4">

        {/* ── Content ── */}
        <ServerSearchSelect
          label="Content"
          required
          value={form.content_id}
          onChange={handleContentChange}
          items={contents.map(c => ({
            value: c.id,
            label: c.title || c.id,
            sublabel: c.content_line?.name ?? undefined,
          }))}
          searchValue={contentSearch}
          onSearchChange={setContentSearch}
          loading={loadingContents}
          placeholder="-- Chọn content --"
          clearLabel="-- Không chọn --"
          searchPlaceholder="Tìm kiếm content..."
        />

        {/* Content line badge — hiện khi đã chọn content */}
        {selectedContent && (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
            <span className="text-xs font-medium text-indigo-600">Tuyến nội dung:</span>
            {selectedContent.content_line ? (
              <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                {selectedContent.content_line.name}
              </span>
            ) : (
              <span className="text-xs text-indigo-400/70 italic">Chưa có</span>
            )}
          </div>
        )}

        {/* ── Sản phẩm ── */}
        <ServerSearchSelect
          label="Sản phẩm"
          required
          value={form.product_id}
          onChange={v => setForm(f => ({ ...f, product_id: v }))}
          items={products.map(p => ({
            value: p.id,
            label: p.name,
            sublabel: p.sku,
          }))}
          searchValue={productSearch}
          onSearchChange={setProductSearch}
          placeholder="-- Chọn sản phẩm --"
          clearLabel="-- Không chọn --"
          searchPlaceholder="Tìm theo tên hoặc SKU..."
        />

        {/* ── Team ── */}
        {leaderTeam ? (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Đội nhóm</label>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-700">
              {leaderTeam.name}
              <span className="ml-auto text-xs font-normal text-indigo-500">Team của bạn</span>
            </div>
          </div>
        ) : (
          <CustomSelect
            label="Đội nhóm *"
            value={form.team_id}
            onChange={v => setForm(f => ({ ...f, team_id: v, assignee_id: '' }))}
            options={[
              { value: '', label: '-- Chọn team --' },
              ...teams.map(t => ({ value: t.id, label: t.name })),
            ]}
            searchable
          />
        )}

        {/* ── Assignee ── */}
        <CustomSelect
          label="Người được giao"
          value={form.assignee_id}
          onChange={v => setForm(f => ({ ...f, assignee_id: v }))}
          options={[
            { value: '', label: form.team_id ? '-- Chọn người --' : '-- Chọn team trước --' },
            ...teamMembers.map(m => ({ value: m.user_id, label: m.user?.full_name || m.user_id })),
          ]}
        />

        {/* ── Deadline ── */}
        <DarkInput
          label="Deadline"
          type="datetime-local"
          value={form.deadline}
          onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
        />

        {/* ── Source ── */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nguồn Source</label>

          {/* 1. PRODUCT_STOCK — hiện sau khi chọn sản phẩm */}
          {form.product_id ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                  Source sản phẩm
                </span>
                <span className="text-xs text-slate-400">tự động theo sản phẩm đã chọn</span>
              </div>
              {productSources.length === 0 ? (
                <p className="text-xs text-slate-400 italic pl-1">Sản phẩm chưa có source đi kèm</p>
              ) : (
                <ul className="space-y-1.5 pl-1">
                  {productSources.map(s => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      <a href={s.link} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline truncate flex-1">
                        {s.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-slate-400 uppercase tracking-wide">
                Source sản phẩm
              </span>
              <span className="text-xs text-slate-400">— chọn sản phẩm để xem</span>
            </div>
          )}

          {/* 2. OUTRO */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wide">
                Source Outro
              </span>
              {outroSources.length > 0 && <span className="text-xs text-slate-400">{outroSources.length} source</span>}
            </div>
            <CustomSelect
              value={form.source_outro_id}
              onChange={v => setForm(f => ({ ...f, source_outro_id: v }))}
              options={[
                { value: '', label: '-- Không chọn --' },
                ...outroSources.map(s => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>

          {/* 3. COLLECTED */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100 uppercase tracking-wide">
                Source sưu tầm
              </span>
              {collectedSources.length > 0 && <span className="text-xs text-slate-400">{collectedSources.length} source</span>}
            </div>
            <CustomSelect
              value={selectedExtraSource?.type === 'COLLECTED' ? form.source_extra_id : ''}
              onChange={v => setForm(f => ({ ...f, source_extra_id: v }))}
              options={[
                { value: '', label: '-- Không chọn --' },
                ...collectedSources.map(s => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>

          {/* 4. WORKSHOP */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100 uppercase tracking-wide">
                Source chế tác
              </span>
              {workshopSources.length > 0 && <span className="text-xs text-slate-400">{workshopSources.length} source</span>}
            </div>
            <CustomSelect
              value={selectedExtraSource?.type === 'WORKSHOP' ? form.source_extra_id : ''}
              onChange={v => setForm(f => ({ ...f, source_extra_id: v }))}
              options={[
                { value: '', label: '-- Không chọn --' },
                ...workshopSources.map(s => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>

          {/* 5. HUYK */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wide">
                Source Huy-K
              </span>
              {huykSources.length > 0 && <span className="text-xs text-slate-400">{huykSources.length} source</span>}
            </div>
            <CustomSelect
              value={selectedExtraSource?.type === 'HUYK' ? form.source_extra_id : ''}
              onChange={v => setForm(f => ({ ...f, source_extra_id: v }))}
              options={[
                { value: '', label: '-- Không chọn --' },
                ...huykSources.map(s => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
        </div>
      </div>
    </DarkModal>
  )
}
