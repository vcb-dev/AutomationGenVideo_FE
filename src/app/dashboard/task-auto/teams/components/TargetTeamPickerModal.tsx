'use client'

import { DarkModal } from '@/components/task-auto/DarkModal'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import type { Team } from '@/types/task-auto'

interface Props {
  title: string
  subtitle: string
  teams: Team[]
  value: string
  onChange: (teamId: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function TargetTeamPickerModal({ title, subtitle, teams, value, onChange, onCancel, onConfirm }: Props) {
  return (
    <DarkModal
      open
      onClose={onCancel}
      title={title}
      subtitle={subtitle}
      size="sm"
      footer={
        <>
          <button
            onClick={onCancel}
            className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={!value}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            Tiếp tục
          </button>
        </>
      }
    >
      <CustomSelect
        label="Đội nhóm *"
        value={value}
        onChange={onChange}
        options={teams.map(t => ({ value: t.id, label: t.name }))}
        placeholder="Chọn đội nhóm"
        searchable
      />
    </DarkModal>
  )
}
