'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, CustomSelect, ServerSearchSelect } from '@/components/task-auto/DarkInput'
import { ContentFormModal } from '@/components/task-auto/ContentFormModal'
import { ProductFormModal } from '@/components/task-auto/ProductFormModal'
import {
  createTask, getContents, getProducts, getSources,
  getEditorContents, getEditorProducts, getEditorSources,
  getTeamContents, getTeamProducts, getTeamSources,
} from '@/lib/api/task-auto'
import type { BrandType, Content, Product, Source, Task, Team, TeamSource } from '@/types/task-auto'

type Scope = 'personal' | 'global' | 'team'

interface CreateForm {
  content_id: string
  product_id: string
  team_id: string
  assignee_id: string
  deadline: string
  source_outro_id: string
  source_collected_id: string
  source_workshop_id: string
  source_huyk_id: string
}

interface Props {
  teams: Team[]
  userId?: string
  isLeader?: boolean
  isAdminOrManager?: boolean
  isMember?: boolean
  onClose: () => void
  onSuccess: () => void
}

function SectionHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">{label}</p>
      <div className="flex-1 h-px bg-gray-100" />
      {children}
    </div>
  )
}

function ScopeSwitch({ value, onChange, hasTeam }: {
  value: Scope
  onChange: (s: Scope) => void
  hasTeam: boolean
}) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg ml-auto">
      {([
        { key: 'personal' as Scope, label: 'Cá nhân',  disabled: false },
        { key: 'global'   as Scope, label: 'Kho tổng', disabled: false },
        { key: 'team'     as Scope, label: 'Kho team', disabled: !hasTeam },
      ]).map(({ key, label, disabled }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(key)}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
            value === key
              ? 'bg-white shadow-sm text-indigo-700'
              : 'text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function CreateTaskModal({ teams, userId, isLeader, isAdminOrManager, isMember, onClose, onSuccess }: Props) {
  const qc = useQueryClient()

  const leaderTeam = isLeader && !isAdminOrManager
    ? teams.find(t => t.leader_id === userId)
    : undefined
  const memberTeam = isMember && userId
    ? teams.find(t => t.members?.some(m => m.user_id === userId))
    : undefined
  const lockedTeam = leaderTeam ?? memberTeam
  const myTeam = lockedTeam ?? teams.find(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))

  const [form, setForm] = useState<CreateForm>({
    content_id: '', product_id: '', team_id: lockedTeam?.id ?? '',
    assignee_id: '', deadline: '',
    source_outro_id: '', source_collected_id: '', source_workshop_id: '', source_huyk_id: '',
  })
  const [brandType, setBrandType] = useState<BrandType>('DO_DA')
  const [contentScope, setContentScope] = useState<Scope>('personal')
  const [productScope, setProductScope] = useState<Scope>('personal')
  const [contentSearch, setContentSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [showContentModal, setShowContentModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [contentActualId, setContentActualId] = useState('')
  const [productActualId, setProductActualId] = useState('')
  const [sourceScope, setSourceScope] = useState<'personal' | 'team' | 'global' | 'all'>('all')

  useEffect(() => {
    if (lockedTeam && !form.team_id) setForm(f => ({ ...f, team_id: lockedTeam.id }))
  }, [lockedTeam?.id])

  useEffect(() => {
    setForm(f => ({ ...f, content_id: '', product_id: '' }))
    setProductActualId('')
  }, [brandType])

  useEffect(() => { setForm(f => ({ ...f, content_id: '' })); setContentActualId('') }, [contentScope])
  useEffect(() => { setForm(f => ({ ...f, product_id: '' })); setProductActualId('') }, [productScope])

  const { data: personalContentsData, isLoading: loadingPersonalContents } = useQuery({
    queryKey: ['task-auto', 'create-contents-personal', brandType, contentSearch, userId],
    queryFn: () => getEditorContents(userId!, { brand_type: brandType, search: contentSearch || undefined, limit: 50 }),
    enabled: !!userId && contentScope === 'personal',
  })
  const { data: globalContentsData, isLoading: loadingGlobalContents } = useQuery({
    queryKey: ['task-auto', 'create-contents-global', brandType, contentSearch],
    queryFn: () => getContents({ brand_type: brandType, search: contentSearch || undefined, limit: 50 }),
    enabled: contentScope === 'global',
  })
  const { data: teamContentsRaw, isLoading: loadingTeamContents } = useQuery({
    queryKey: ['task-auto', 'create-contents-team', myTeam?.id, brandType],
    queryFn: () => getTeamContents(myTeam!.id, brandType),
    enabled: !!myTeam?.id && contentScope === 'team',
  })

  const { data: personalProductsData, isLoading: loadingPersonalProducts } = useQuery({
    queryKey: ['task-auto', 'create-products-personal', brandType, productSearch, userId],
    queryFn: () => getEditorProducts(userId!, { brand_type: brandType, search: productSearch || undefined, limit: 50 }),
    enabled: !!userId && productScope === 'personal',
  })
  const { data: globalProductsData, isLoading: loadingGlobalProducts } = useQuery({
    queryKey: ['task-auto', 'create-products-global', brandType, productSearch],
    queryFn: () => getProducts({ brand_type: brandType, search: productSearch || undefined, limit: 50 }),
    enabled: productScope === 'global',
  })
  const { data: teamProductsRaw, isLoading: loadingTeamProducts } = useQuery({
    queryKey: ['task-auto', 'create-products-team', myTeam?.id, brandType],
    queryFn: () => getTeamProducts(myTeam!.id, brandType),
    enabled: !!myTeam?.id && productScope === 'team',
  })

  const { data: productSourcesData } = useQuery({
    queryKey: ['task-auto', 'product-sources', form.product_id, productActualId, productScope, myTeam?.id, userId],
    queryFn: async () => {
      if (productScope === 'personal' && userId)
        return getEditorSources(userId, { editor_product_id: productActualId || form.product_id, is_active: true, limit: 50 } as any)
      if (productScope === 'team' && myTeam?.id) {
        const data = await getTeamSources(myTeam.id, { team_product_id: productActualId || form.product_id, is_active: true })
        return { data: data as unknown as Source[], total: data.length }
      }
      return getSources({ product_id: form.product_id, is_active: true, limit: 50 })
    },
    enabled: !!form.product_id,
  })
  const { data: personalSourcesData } = useQuery({
    queryKey: ['task-auto', 'sources-personal', userId],
    queryFn: () => getEditorSources(userId!, { is_active: true, limit: 200 }),
    enabled: !!userId,
  })
  const { data: teamSourcesRaw } = useQuery({
    queryKey: ['task-auto', 'team-sources-select', myTeam?.id],
    queryFn: () => getTeamSources(myTeam!.id, { is_active: true }),
    enabled: !!myTeam?.id,
  })
  const { data: globalSourcesData } = useQuery({
    queryKey: ['task-auto', 'sources-global'],
    queryFn: () => getSources({ is_active: true, limit: 200 }),
  })

  const teamContents: Content[] = (teamContentsRaw ?? [])
    .map(tc => tc as unknown as Content)
    .filter(c => !contentSearch || c.title?.toLowerCase().includes(contentSearch.toLowerCase()))

  const contents: Content[] =
    contentScope === 'personal' ? (personalContentsData?.data ?? []) :
    contentScope === 'global'   ? (globalContentsData?.data ?? []) :
    teamContents

  const loadingContents =
    contentScope === 'personal' ? loadingPersonalContents :
    contentScope === 'global'   ? loadingGlobalContents :
    loadingTeamContents

  const teamProducts: Product[] = (teamProductsRaw ?? [])
    .map(tp => tp as unknown as Product)
    .filter(p => !productSearch ||
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase()))

  const products: Product[] =
    productScope === 'personal' ? (personalProductsData?.data ?? []) :
    productScope === 'global'   ? (globalProductsData?.data ?? []) :
    teamProducts

  const loadingProducts =
    productScope === 'personal' ? loadingPersonalProducts :
    productScope === 'global'   ? loadingGlobalProducts :
    loadingTeamProducts

  const personalSrcs: Source[] = personalSourcesData?.data ?? []
  const teamSrcs: Source[] = (teamSourcesRaw ?? [])
    .filter((ts: TeamSource) => !!ts.source_source_id)
    .map((ts: TeamSource) => ({
      ...ts, id: ts.source_source_id!, user_id: null,
      lark_record_id: null, created_at: ts.added_at,
    } as unknown as Source))
  const globalSrcs: Source[]   = globalSourcesData?.data ?? []

  const seenSourceIds = new Set<string>()
  const allSources: Source[] = []
  for (const s of [...personalSrcs, ...teamSrcs, ...globalSrcs]) {
    if (!seenSourceIds.has(s.id)) { seenSourceIds.add(s.id); allSources.push(s) }
  }

  const scopedSources =
    sourceScope === 'personal' ? personalSrcs :
    sourceScope === 'team'     ? teamSrcs :
    sourceScope === 'global'   ? globalSrcs :
    allSources

  const productSources = (productSourcesData?.data ?? []).filter(s => s.type === 'PRODUCT_STOCK')
  const outroSources   = scopedSources.filter(s => s.type === 'OUTRO')
  const collectedSrcs  = scopedSources.filter(s => s.type === 'COLLECTED')
  const workshopSrcs   = scopedSources.filter(s => s.type === 'WORKSHOP')
  const huykSrcs       = scopedSources.filter(s => s.type === 'HUYK')

  const selectedContent = contents.find(c => c.id === form.content_id)
  const selectedTeam    = teams.find(t => t.id === form.team_id)
  const teamMembers     = selectedTeam?.members ?? []

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Partial<Task> = {
        team_id:            form.team_id            || undefined,
        assignee_id:        form.assignee_id        || undefined,
        deadline:           form.deadline           || undefined,
        source_outro_id:    form.source_outro_id    || undefined,
        source_extra_id:    form.source_collected_id || undefined,
        source_workshop_id: form.source_workshop_id || undefined,
        source_huyk_id:     form.source_huyk_id     || undefined,
      }
      if (form.content_id) {
        if (contentScope === 'personal') {
          payload.editor_content_id = contentActualId || form.content_id
        } else if (contentScope === 'team') {
          payload.team_content_id = contentActualId || form.content_id
        } else {
          payload.content_id = form.content_id
        }
      }
      if (form.product_id) {
        if (productScope === 'personal') {
          payload.editor_product_id = productActualId || form.product_id
        } else if (productScope === 'team') {
          payload.team_product_id = productActualId || form.product_id
        } else {
          payload.product_id = form.product_id
        }
      }
      return createTask(payload)
    },
    onSuccess: () => {
      toast.success('Tạo task thành công!')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      onSuccess()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Tạo task thất bại'
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    },
  })

  const canSubmit = !!form.content_id && !!form.product_id && !!form.team_id && !mutation.isPending

  const scopeLabel: Record<Scope, string> = { personal: 'cá nhân', global: 'kho tổng', team: 'kho team' }

  return (
    <>
    <DarkModal
      open
      onClose={onClose}
      title="Tạo task thủ công"
      size="lg"
      footer={
        <>
          <button onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
            Huỷ
          </button>
          <button onClick={() => mutation.mutate()} disabled={!canSubmit}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
            {mutation.isPending ? 'Đang tạo...' : 'Tạo task'}
          </button>
        </>
      }
    >
      <div className="space-y-6">

        {/* ── Nhóm sản phẩm ── */}
        <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">Nhóm sản phẩm</span>
          <div className="flex gap-1.5">
            {([
              { key: 'DO_DA' as BrandType,     label: 'Đồ da' },
              { key: 'TRANG_SUC' as BrandType, label: 'Trang sức' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setBrandType(key)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border',
                  brandType === key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Nội dung ── */}
        <div className="space-y-3">
          <SectionHeader label="Nội dung" />
          <ServerSearchSelect
            label="Content *"
            value={form.content_id}
            onChange={v => {
              setContentActualId(v)
              setForm(f => ({ ...f, content_id: v }))
            }}
            items={contents.map(c => ({
              value: c.id,
              label: c.title || c.id,
              sublabel: c.content_line?.name ?? undefined,
            }))}
            searchValue={contentSearch}
            onSearchChange={setContentSearch}
            loading={loadingContents}
            placeholder={`Tìm trong ${scopeLabel[contentScope]}...`}
            clearLabel="-- Không chọn --"
            searchPlaceholder="Tìm theo tiêu đề..."
            createLabel="Tạo content mới..."
            onCreateClick={() => setShowContentModal(true)}
            filterSlot={<ScopeSwitch value={contentScope} onChange={setContentScope} hasTeam={!!myTeam} />}
          />
          {selectedContent?.content_line && (
            <div className="flex items-center gap-2 pl-1">
              <span className="text-xs text-slate-400">Tuyến:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                {selectedContent.content_line.name}
              </span>
            </div>
          )}
        </div>

        {/* ── Sản phẩm ── */}
        <div className="space-y-3">
          <SectionHeader label="Sản phẩm" />
          <ServerSearchSelect
            label="Sản phẩm *"
            value={form.product_id}
            onChange={v => {
                const scopedProduct = products.find(p => (p.source_product_id ?? p.id) === v)
                setProductActualId(scopedProduct?.id ?? v)
                setForm(f => ({ ...f, product_id: v, source_collected_id: '', source_workshop_id: '', source_huyk_id: '' }))
              }}
            items={products.map(p => ({
                value: p.source_product_id ?? p.id,
                label: p.name,
                sublabel: p.sku,
              }))}
            searchValue={productSearch}
            onSearchChange={setProductSearch}
            loading={loadingProducts}
            placeholder={`Tìm trong ${scopeLabel[productScope]}...`}
            clearLabel="-- Không chọn --"
            searchPlaceholder="Tìm theo tên hoặc SKU..."
            createLabel="Tạo sản phẩm mới..."
            onCreateClick={() => setShowProductModal(true)}
            filterSlot={<ScopeSwitch value={productScope} onChange={setProductScope} hasTeam={!!myTeam} />}
          />
          {form.product_id && productSources.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-1">
              <span className="text-xs text-slate-400 self-center">Source kèm:</span>
              {productSources.map(s => (
                <a key={s.id} href={s.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-full transition-colors">
                  {s.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* ── Phân công ── */}
        <div className="space-y-3">
          <SectionHeader label="Phân công" />
          <div className={!isMember ? 'grid grid-cols-2 gap-3' : ''}>
            {lockedTeam ? (
              <div className="space-y-2">
                <label className="block text-base font-semibold text-slate-700">Đội nhóm *</label>
                <div className="flex items-center gap-2 px-4 py-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-700">
                  {lockedTeam.name}
                  <span className="ml-auto text-xs font-normal text-indigo-400">Team của bạn</span>
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
            {!isMember && (
              <CustomSelect
                label="Người được giao"
                value={form.assignee_id}
                onChange={v => setForm(f => ({ ...f, assignee_id: v }))}
                options={[
                  { value: '', label: form.team_id ? '-- Không chỉ định --' : '-- Chọn team trước --' },
                  ...teamMembers.map(m => ({ value: m.user_id, label: m.user?.full_name ?? m.user_id })),
                ]}
              />
            )}
          </div>
          <DarkInput
            label="Deadline"
            type="datetime-local"
            value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
          />
        </div>

        {/* ── Nguồn source ── */}
        <div className="space-y-3">
          <SectionHeader label="Nguồn source">
            <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
              {([
                { key: 'personal', label: 'Cá nhân',  disabled: false },
                { key: 'team',     label: 'Kho team',  disabled: !myTeam },
                { key: 'global',   label: 'Kho chung', disabled: false },
                { key: 'all',      label: 'Tất cả',    disabled: false },
              ] as const).map(({ key, label, disabled }) => (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSourceScope(key)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                    sourceScope === key
                      ? 'bg-white shadow-sm text-indigo-700'
                      : 'text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </SectionHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Outro
                {outroSources.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{outroSources.length}</span>}
              </label>
              <CustomSelect
                value={form.source_outro_id}
                onChange={v => setForm(f => ({ ...f, source_outro_id: v }))}
                options={[{ value: '', label: '-- Không chọn --' }, ...outroSources.map(s => ({ value: s.id, label: s.name }))]}
                searchable
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Sưu tầm
                {collectedSrcs.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{collectedSrcs.length}</span>}
              </label>
              <CustomSelect
                value={form.source_collected_id}
                onChange={v => setForm(f => ({ ...f, source_collected_id: v }))}
                options={[{ value: '', label: '-- Không chọn --' }, ...collectedSrcs.map(s => ({ value: s.id, label: s.name }))]}
                searchable
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Chế tác
                {workshopSrcs.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{workshopSrcs.length}</span>}
              </label>
              <CustomSelect
                value={form.source_workshop_id}
                onChange={v => setForm(f => ({ ...f, source_workshop_id: v }))}
                options={[{ value: '', label: '-- Không chọn --' }, ...workshopSrcs.map(s => ({ value: s.id, label: s.name }))]}
                searchable
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Huy-K
                {huykSrcs.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{huykSrcs.length}</span>}
              </label>
              <CustomSelect
                value={form.source_huyk_id}
                onChange={v => setForm(f => ({ ...f, source_huyk_id: v }))}
                options={[{ value: '', label: '-- Không chọn --' }, ...huykSrcs.map(s => ({ value: s.id, label: s.name }))]}
                searchable
              />
            </div>
          </div>
        </div>

      </div>
    </DarkModal>

    {showContentModal && (
      <ContentFormModal
        open
        userId={userId}
        brandType={brandType}
        onClose={() => setShowContentModal(false)}
        onSuccess={(content: Content) => {
          qc.invalidateQueries({ queryKey: ['task-auto', 'create-contents-personal'] })
          setContentActualId(content.id)
          setForm(f => ({ ...f, content_id: content.id }))
          setContentScope('personal')
          setShowContentModal(false)
        }}
      />
    )}

    {showProductModal && (
      <ProductFormModal
        open
        userId={userId}
        defaultBrandType={brandType}
        onClose={() => setShowProductModal(false)}
        onSuccess={(product: Product) => {
          qc.invalidateQueries({ queryKey: ['task-auto', 'create-products-personal'] })
          setForm(f => ({ ...f, product_id: product.source_product_id ?? product.id }))
          setProductScope('personal')
          setShowProductModal(false)
        }}
      />
    )}
    </>
  )
}
