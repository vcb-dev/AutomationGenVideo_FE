'use client'

import { Link2, Package } from 'lucide-react'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { Section } from './Section'
import { SourceRow } from './SourceRow'
import type { Source, SourceType, Task } from '@/types/task-auto'

type AnyTaskSource =
  | NonNullable<Task['source_outro']>
  | NonNullable<Task['team_source_outro']>

function resolveSource(s: AnyTaskSource | null | undefined): { id: string; name: string; link: string | null; type: SourceType; nas_link?: string | null } | null {
  if (!s) return null
  // team FK: source_editor_source; global FK: source_team_source → source_editor_source
  const es = 'source_editor_source' in s ? s.source_editor_source : undefined
  const ts = 'source_team_source' in s ? s.source_team_source : undefined
  const ts_es = ts && 'source_editor_source' in ts ? ts.source_editor_source : undefined
  return {
    id:       s.id,
    name:     (s.name ?? es?.name ?? ts?.name ?? ts_es?.name ?? '—') as string,
    link:     s.link ?? es?.link ?? ts?.link ?? ts_es?.link ?? null,
    type:     (s.type ?? es?.type ?? ts?.type ?? ts_es?.type ?? 'PRODUCT_STOCK') as SourceType,
    nas_link: s.nas_link ?? es?.nas_link ?? ts?.nas_link ?? ts_es?.nas_link ?? null,
  }
}

interface EditSourcesProps {
  form: {
    source_outro_id: string
    source_collected_id: string
    source_workshop_id: string
    source_huyk_id: string
  }
  onChange: (patch: Partial<EditSourcesProps['form']>) => void
  outroSources: Source[]
  collectedSrcs: Source[]
  workshopSrcs: Source[]
  huykSrcs: Source[]
  productSources: Source[]
  hasProduct: boolean
  scopeSwitch?: React.ReactNode
}

interface Props {
  editMode: boolean
  task: Task
  edit: EditSourcesProps
}

export function SourcesSection({
  editMode,
  task,
  edit,
}: Props) {
  const productSources = task.product_sources ?? []

  const hasTaskSources =
    !!task.source_outro         || !!task.source_extra         ||
    !!task.source_workshop      || !!task.source_huyk          ||
    !!task.editor_source_outro  || !!task.editor_source_extra  ||
    !!task.editor_source_workshop || !!task.editor_source_huyk ||
    !!task.team_source_outro    || !!task.team_source_extra    ||
    !!task.team_source_workshop || !!task.team_source_huyk

  const hasProductSources = productSources.length > 0

  return (
    <Section
      icon={<Link2 className="w-4 h-4" />}
      title="Sources"
      bgColor="bg-teal-50"
      iconColor="text-teal-600"
      className="flex-1"
    >
      {editMode ? (<div className="p-4 space-y-4">
        {edit.scopeSwitch && (
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">Nguồn source</p>
            <div className="flex-1 h-px bg-gray-100" />
            {edit.scopeSwitch}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
        <CustomSelect
          label="Outro"
          value={edit.form.source_outro_id}
          onChange={(v) =>
            edit.onChange({ source_outro_id: v })
          }
          options={[
            { value: '', label: '-- Không chọn --' },
            ...edit.outroSources.map((s) => ({
              value: s.id,
              label: s.name,
            })),
          ]}
          searchable
        />

        <CustomSelect
          label="Sưu tầm"
          value={edit.form.source_collected_id}
          onChange={(v) =>
            edit.onChange({ source_collected_id: v })
          }
          options={[
            { value: '', label: '-- Không chọn --' },
            ...edit.collectedSrcs.map((s) => ({
              value: s.id,
              label: s.name,
            })),
          ]}
          searchable
        />

        <CustomSelect
          label="Chế tác"
          value={edit.form.source_workshop_id}
          onChange={(v) =>
            edit.onChange({ source_workshop_id: v })
          }
          options={[
            { value: '', label: '-- Không chọn --' },
            ...edit.workshopSrcs.map((s) => ({
              value: s.id,
              label: s.name,
            })),
          ]}
          searchable
        />

        <CustomSelect
          label="Huy-K"
          value={edit.form.source_huyk_id}
          onChange={(v) =>
            edit.onChange({ source_huyk_id: v })
          }
          options={[
            { value: '', label: '-- Không chọn --' },
            ...edit.huykSrcs.map((s) => ({
              value: s.id,
              label: s.name,
            })),
          ]}
          searchable
        />
      </div>

        {hasProductSources && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  Source gắn với sản phẩm
                </span>
              </div>

              <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                {productSources.length}
              </span>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto">
              {productSources.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  showType
                />
              ))}
            </div>
          </div>
        )}
      </div>
      ) : (
        <div className="p-3 space-y-4">
          {hasTaskSources && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">
                  Source gắn với Task
                </span>
              </div>

              <div className="space-y-1">
                {resolveSource(task.source_outro ?? task.editor_source_outro ?? task.team_source_outro) && (
                  <SourceRow
                    source={resolveSource(task.source_outro ?? task.editor_source_outro ?? task.team_source_outro)!}
                    label="Outro"
                  />
                )}
                {resolveSource(task.source_extra ?? task.editor_source_extra ?? task.team_source_extra) && (
                  <SourceRow
                    source={resolveSource(task.source_extra ?? task.editor_source_extra ?? task.team_source_extra)!}
                    label="Sưu tầm"
                  />
                )}
                {resolveSource(task.source_workshop ?? task.editor_source_workshop ?? task.team_source_workshop) && (
                  <SourceRow
                    source={resolveSource(task.source_workshop ?? task.editor_source_workshop ?? task.team_source_workshop)!}
                    label="Chế tác"
                  />
                )}
                {resolveSource(task.source_huyk ?? task.editor_source_huyk ?? task.team_source_huyk) && (
                  <SourceRow
                    source={resolveSource(task.source_huyk ?? task.editor_source_huyk ?? task.team_source_huyk)!}
                    label="Huy-K"
                  />
                )}
              </div>
            </div>
          )}

          {hasProductSources && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">
                    Source gắn với sản phẩm
                  </span>
                </div>

                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  {productSources.length}
                </span>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {productSources.map((source) => (
                  <SourceRow
                    key={source.id}
                    source={source}
                    showType
                  />
                ))}
              </div>
            </div>
          )}

          {!hasTaskSources && !hasProductSources && (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400 italic">
                Task chưa gắn source nào
              </p>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}
