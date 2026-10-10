'use client'

import { forwardRef, useId } from 'react'
import { AlertTriangle, Loader2, Maximize2, Plus, Wand2 } from 'lucide-react'
import { DarkInput, DarkTextarea, CustomSelect, CreatableSelect } from '@/components/task-auto/DarkInput'
import type { ContentLine } from '@/types/task-auto'
import type { ContentDraft, DraftHints } from './CreateTaskModal'

interface Props {
  draft: ContentDraft
  hints: DraftHints
  onChange: (patch: Partial<ContentDraft>) => void
  onBodyPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  lines: ContentLine[] | undefined
  loadingLines: boolean
  classifications: { value: string; label: string }[]
  loadingClassifications: boolean
  onCreateClassification: (name: string) => Promise<{ id: string; label: string }>
  /** Tên tuyến của kế hoạch đang lọc — để ghi rõ tuyến được tự chọn theo đâu */
  planLineName?: string
  marketLabel: string
  /** Content trùng tiêu đề đã có trong kho cá nhân */
  duplicate: { title: string; code?: string } | null
  onUseDuplicate: () => void
  onOpenFullForm: () => void
  /** Chọn nhiều: lưu content này rồi viết tiếp content khác */
  onAddToList?: () => void
  adding?: boolean
  /** Chọn nhiều: ô chọn sản phẩm đi kèm riêng content này */
  productSlot?: React.ReactNode
}

function AutoHint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1 pl-1 text-xs text-indigo-700">
      <Wand2 className="w-3 h-3 shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}

/** Form gọn viết content mới ngay trong modal tạo nhiệm vụ — chỉ các ô hay dùng; file/voice/chấm điểm ở form đầy đủ. */
export const NewContentFields = forwardRef<HTMLInputElement, Props>(function NewContentFields({
  draft, hints, onChange, onBodyPaste,
  lines, loadingLines, classifications, loadingClassifications, onCreateClassification,
  planLineName, marketLabel, duplicate, onUseDuplicate, onOpenFullForm, onAddToList, adding, productSlot,
}, titleRef) {
  const id = useId()
  const titleHintId = `${id}-title-hint`
  const codeHintId = `${id}-code-hint`
  const dupId = `${id}-dup`

  const lineHint = hints.line === 'search' ? 'Tự chọn theo từ khoá đang tìm'
    : hints.line === 'plan' ? `Tự chọn theo kế hoạch ${planLineName ?? ''}`.trim()
    : hints.line === 'last' ? 'Giống lần viết content trước'
    : null

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Chọn nhiều: Enter ở ô tiêu đề = lưu & viết tiếp. Bỏ qua lúc bộ gõ (Telex/VNI) đang ghép chữ.
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.metaKey || e.ctrlKey || !onAddToList) return
    e.preventDefault()
    if (draft.title.trim() && !adding) onAddToList()
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_11rem] gap-3">
        <div className="space-y-1.5">
          <label htmlFor={`${id}-title`} className="block text-base font-semibold text-slate-700">Tiêu đề content *</label>
          <DarkInput
            ref={titleRef}
            id={`${id}-title`}
            data-autofocus
            placeholder="Nhập tiêu đề — hoặc dán nội dung bên dưới, tiêu đề tự lấy dòng đầu"
            value={draft.title}
            onChange={e => onChange({ title: e.target.value })}
            onKeyDown={handleTitleKeyDown}
            aria-describedby={[hints.title && titleHintId, duplicate && dupId].filter(Boolean).join(' ') || undefined}
          />
          {hints.title === 'search' && <AutoHint id={titleHintId}>Lấy từ ô tìm kiếm — sửa lại nếu cần</AutoHint>}
          {hints.title === 'body' && <AutoHint id={titleHintId}>Lấy từ dòng đầu nội dung — sửa lại nếu cần</AutoHint>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-code`} className="block text-base font-semibold text-slate-700">Mã content</label>
          <DarkInput
            id={`${id}-code`}
            placeholder="VD: CT-101"
            value={draft.code}
            onChange={e => onChange({ code: e.target.value })}
            aria-describedby={hints.code ? codeHintId : undefined}
          />
          {hints.code === 'search' && <AutoHint id={codeHintId}>Lấy từ ô tìm kiếm</AutoHint>}
        </div>
      </div>

      {duplicate && (
        <div id={dupId} role="status" className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="flex-1 min-w-0">
            Kho cá nhân đã có content cùng tiêu đề
            {duplicate.code && <span className="font-mono"> ({duplicate.code})</span>}.
            Tạo mới sẽ thành 2 bản trùng.
          </p>
          <button
            type="button"
            onClick={onUseDuplicate}
            className="shrink-0 h-8 px-3 rounded-lg bg-white border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Dùng content có sẵn
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <CustomSelect
            label="Tuyến nội dung"
            value={draft.content_line_id}
            onChange={v => onChange({ content_line_id: v })}
            options={[
              { value: '', label: '-- Không chọn --' },
              ...(lines?.map(l => ({ value: l.id, label: l.name })) ?? []),
            ]}
            searchable
            loading={loadingLines}
          />
          {lineHint && draft.content_line_id && <AutoHint id={`${id}-line-hint`}>{lineHint}</AutoHint>}
        </div>
        <CreatableSelect
          label="Phân loại nội dung"
          value={draft.classification_id}
          onChange={v => onChange({ classification_id: v })}
          options={classifications}
          createLabel="Thêm phân loại nội dung"
          loading={loadingClassifications}
          onCreate={onCreateClassification}
        />
      </div>

      {productSlot}

      <div className="space-y-1.5">
        <label htmlFor={`${id}-body`} className="block text-base font-semibold text-slate-700">Nội dung / Script</label>
        <DarkTextarea
          id={`${id}-body`}
          autoGrow
          rows={4}
          maxHeight={260}
          placeholder="Dán kịch bản vào đây..."
          value={draft.body}
          onChange={e => onChange({ body: e.target.value })}
          onPaste={onBodyPaste}
          className="bg-white"
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500">
          Lưu vào <span className="font-semibold text-slate-700">kho cá nhân</span> của bạn · thị trường {marketLabel}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFullForm}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            Form đầy đủ (file, voice, chấm điểm)
          </button>
          {onAddToList && (
            <button
              type="button"
              onClick={onAddToList}
              disabled={!draft.title.trim() || adding}
              aria-busy={adding}
              aria-keyshortcuts="Enter"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
              Lưu & viết tiếp
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
