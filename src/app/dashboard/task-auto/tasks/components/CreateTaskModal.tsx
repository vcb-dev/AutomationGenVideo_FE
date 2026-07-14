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
// ── Fallback helpers cho FK references ──
// Hỗ trợ cả 3 tầng: editor item (source_editor_*), team item (source_editor_*), global item (source_team_* → source_editor_*)
function getProductName(p: any): string {
  return p.name
    || p.source_editor_product?.name      // TeamProduct FK → EditorProduct
    || p.source_team_product?.name        // Product FK → TeamProduct
    || p.source_team_product?.source_editor_product?.name  // Product → TeamProduct → EditorProduct
    || 'Unknown'
}

function getProductSku(p: any): string | undefined {
  return p.sku
    || p.source_editor_product?.sku
    || p.source_team_product?.sku
    || p.source_team_product?.source_editor_product?.sku
    || undefined
}

function getContentTitle(c: any): string {
  return c.title
    || c.source_editor_content?.title     // TeamContent FK → EditorContent
    || c.source_team_content?.title       // Content FK → TeamContent
    || c.source_team_content?.source_editor_content?.title  // Content → TeamContent → EditorContent
    || 'Unknown'
}

function getContentCode(c: any): string | undefined {
  return c.code
    || c.source_editor_content?.code
    || c.source_team_content?.code
    || c.source_team_content?.source_editor_content?.code
    || undefined
}

function getContentLine(c: any): string | undefined {
  if (!c) return undefined
  return c.content_line?.name
    || c.source_editor_content?.content_line?.name
    || c.source_team_content?.content_line?.name
    || c.source_team_content?.source_editor_content?.content_line?.name
    || undefined
}
export function CreateTaskModal({ teams, userId, isLeader, isAdminOrManager, isMember, onClose, onSuccess }: Props) {
  const qc = useQueryClient()

  // Tất cả team mà user thuộc (leader hoặc member), dùng cho non-admin
  const myTeams = !isAdminOrManager && userId
    ? teams.filter(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))
    : []
  // Nếu chỉ thuộc 1 team → khóa cứng; nếu thuộc nhiều team → cho chọn
  const lockedTeam = myTeams.length === 1 ? myTeams[0] : undefined

  const [form, setForm] = useState<CreateForm>({
    content_id: '', product_id: '', team_id: lockedTeam?.id ?? myTeams[0]?.id ?? '',
    assignee_id: '', deadline: '',
    source_outro_id: '', source_collected_id: '', source_workshop_id: '', source_huyk_id: '',
  })

  // brandType derive từ team đang chọn (hoặc team duy nhất của user)
  const selectedTeam = teams.find(t => t.id === form.team_id)
  const brandType: BrandType = selectedTeam?.brand_type ?? lockedTeam?.brand_type ?? 'DO_DA'
  // team dùng để load kho team (kho team của team đang chọn, không phải myTeams[0])
  const activeTeamForWarehouse = selectedTeam ?? lockedTeam

  const [contentScope, setContentScope] = useState<Scope>('personal')
  const [productScope, setProductScope] = useState<Scope>('personal')
  const [contentSearch, setContentSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [showContentModal, setShowContentModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [contentActualId, setContentActualId] = useState('')
  const [productActualId, setProductActualId] = useState('')
  const [sourceScope, setSourceScope] = useState<'personal' | 'team' | 'global' | 'all'>('all')
  const [prevBrandType, setPrevBrandType] = useState<BrandType>(brandType)

  useEffect(() => {
    if (lockedTeam && !form.team_id) setForm(f => ({ ...f, team_id: lockedTeam.id }))
  }, [lockedTeam?.id])

  // Reset content/product/sources khi brandType thay đổi (do đổi team)
  useEffect(() => {
    if (brandType !== prevBrandType) {
      setPrevBrandType(brandType)
      setForm(f => ({
        ...f,
        content_id: '', product_id: '',
        source_outro_id: '', source_collected_id: '', source_workshop_id: '', source_huyk_id: '',
      }))
      setProductActualId('')
    }
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
    queryKey: ['task-auto', 'create-contents-team', activeTeamForWarehouse?.id, brandType],
    queryFn: () => getTeamContents(activeTeamForWarehouse!.id, brandType),
    enabled: !!activeTeamForWarehouse?.id && contentScope === 'team',
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
    queryKey: ['task-auto', 'create-products-team', activeTeamForWarehouse?.id, brandType],
    queryFn: () => getTeamProducts(activeTeamForWarehouse!.id, brandType),
    enabled: !!activeTeamForWarehouse?.id && productScope === 'team',
  })

  const { data: productSourcesData } = useQuery({
    queryKey: ['task-auto', 'product-sources', form.product_id, productActualId, productScope, form.team_id, userId],
    queryFn: async () => {
      if (productScope === 'personal' && userId)
        return getEditorSources(userId, { editor_product_id: productActualId || form.product_id, is_active: true, limit: 50 } as any)
      if (productScope === 'team' && form.team_id) {
        const data = await getTeamSources(form.team_id, { team_product_id: productActualId || form.product_id, is_active: true })
        return { data: data as unknown as Source[], total: data.length }
      }
      return getSources({ product_id: form.product_id, is_active: true, limit: 50 })
    },
    enabled: !!form.product_id,
  })
  const { data: personalSourcesData } = useQuery({
    queryKey: ['task-auto', 'sources-personal', userId, brandType],
    queryFn: () => getEditorSources(userId!, { brand_type: brandType, is_active: true, limit: 200 }),
    enabled: !!userId,
  })
  const { data: teamSourcesRaw } = useQuery({
    queryKey: ['task-auto', 'team-sources-select', form.team_id, brandType],
    queryFn: () => getTeamSources(form.team_id, { brand_type: brandType, is_active: true }),
    enabled: !!form.team_id,
  })
  const { data: globalSourcesData } = useQuery({
    queryKey: ['task-auto', 'sources-global', brandType],
    queryFn: () => getSources({ brand_type: brandType, is_active: true, limit: 200 }),
  })

  const teamContents: Content[] = (teamContentsRaw ?? [])
    .map(tc => tc as unknown as Content)
    .filter(c => !contentSearch ||
      getContentTitle(c).toLowerCase().includes(contentSearch.toLowerCase()) ||
      getContentCode(c)?.toLowerCase().includes(contentSearch.toLowerCase()))

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
      getProductName(p).toLowerCase().includes(productSearch.toLowerCase()) ||  // ✅
      getProductSku(p)?.toLowerCase().includes(productSearch.toLowerCase())) 
  const products: Product[] =
    productScope === 'personal' ? (personalProductsData?.data ?? []) :
    productScope === 'global'   ? (globalProductsData?.data ?? []) :
    teamProducts

  const loadingProducts =
    productScope === 'personal' ? loadingPersonalProducts :
    productScope === 'global'   ? loadingGlobalProducts :
    loadingTeamProducts

  // Mỗi source được tag với prefix để phân biệt kho khi submit
  // value: 'editor:${id}' | 'team:${id}' | 'global:${id}'
  const personalSrcs: Source[] = (personalSourcesData?.data ?? [])
    .map((es: any) => ({ ...es, id: `editor:${es.id}` } as unknown as Source))
  const teamSrcs: Source[] = (teamSourcesRaw ?? [])
    .map((ts: TeamSource) => ({
      ...ts, id: `team:${ts.id}`, user_id: null,
      lark_record_id: null, created_at: ts.added_at,
    } as unknown as Source))
  const globalSrcs: Source[] = (globalSourcesData?.data ?? [])
    .map((s: Source) => ({ ...s, id: `global:${s.id}` }))

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
  const teamMembers     = selectedTeam?.members ?? []

  function resolveSourceField(prefixedId: string, fieldBase: 'outro' | 'extra' | 'workshop' | 'huyk'): Record<string, string | undefined> {
    if (!prefixedId) return {}
    const [prefix, rawId] = prefixedId.split(':', 2)
    if (!rawId) return {}
    if (prefix === 'global')  return { [`source_${fieldBase}_id`]: rawId }
    if (prefix === 'editor')  return { [`editor_source_${fieldBase}_id`]: rawId }
    if (prefix === 'team')    return { [`team_source_${fieldBase}_id`]: rawId }
    return {}
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Partial<Task> = {
        team_id:     form.team_id     || undefined,
        assignee_id: form.assignee_id || undefined,
        deadline:    form.deadline    || undefined,
        ...resolveSourceField(form.source_outro_id,     'outro'),
        ...resolveSourceField(form.source_collected_id, 'extra'),
        ...resolveSourceField(form.source_workshop_id,  'workshop'),
        ...resolveSourceField(form.source_huyk_id,      'huyk'),
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

        {/* ── Nhóm sản phẩm ── chỉ hiển thị với admin/manager, tự động theo team */}
        {!isMember && !isLeader && (
          <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">Nhóm sản phẩm</span>
            <span className={cn(
              'px-3 py-1 rounded-lg text-sm font-semibold border',
              brandType === 'DO_DA'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            )}>
              {brandType === 'DO_DA' ? 'Đồ da' : 'Trang sức'}
            </span>
            {!form.team_id && (
              <span className="text-xs text-slate-400 italic">Chọn team để xác định nhóm sản phẩm</span>
            )}
          </div>
        )}

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
              label: getContentTitle(c),
              sublabel: getContentCode(c),
            }))}
            searchValue={contentSearch}
            onSearchChange={setContentSearch}
            loading={loadingContents}
            placeholder={`Tìm trong ${scopeLabel[contentScope]}...`}
            clearLabel="-- Không chọn --"
            searchPlaceholder="Tìm theo mã hoặc tiêu đề..."
            createLabel="Tạo content mới..."
            onCreateClick={() => setShowContentModal(true)}
            filterSlot={<ScopeSwitch value={contentScope} onChange={setContentScope} hasTeam={!!activeTeamForWarehouse} />}
          />
          {getContentLine(selectedContent) && (
            <div className="flex items-center gap-2 pl-1">
              <span className="text-xs text-slate-400">Tuyến:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                {getContentLine(selectedContent)}
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
                label: getProductName(p),  // ✅ Dùng helper
                sublabel: getProductSku(p),  // ✅ Cũng fix SKU
              }))}
            searchValue={productSearch}
            onSearchChange={setProductSearch}
            loading={loadingProducts}
            placeholder={`Tìm trong ${scopeLabel[productScope]}...`}
            clearLabel="-- Không chọn --"
            searchPlaceholder="Tìm theo tên hoặc SKU..."
            createLabel="Tạo sản phẩm mới..."
            onCreateClick={() => setShowProductModal(true)}
            filterSlot={<ScopeSwitch value={productScope} onChange={setProductScope} hasTeam={!!activeTeamForWarehouse} />}
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
            ) : myTeams.length > 1 ? (
              <CustomSelect
                label="Đội nhóm *"
                value={form.team_id}
                onChange={v => setForm(f => ({ ...f, team_id: v, assignee_id: '', content_id: '', product_id: '', source_outro_id: '', source_collected_id: '', source_workshop_id: '', source_huyk_id: '' }))}
                options={[
                  { value: '', label: '-- Chọn team --' },
                  ...myTeams.map(t => ({ value: t.id, label: t.name })),
                ]}
                searchable
              />
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
                { key: 'team',     label: 'Kho team',  disabled: !form.team_id },
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
