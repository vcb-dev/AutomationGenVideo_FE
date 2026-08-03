'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLuckySpin } from '@/hooks/useLuckySpin';
import { WORKSPACES } from '@/lib/lucky-spin/storage';
import { SpinAccent, TabId } from '@/types/lucky-spin';
import { GiftSpinTab } from '@/components/lucky-spin/GiftSpinTab';
import { GiftsTab } from '@/components/lucky-spin/GiftsTab';
import { HistoryTab } from '@/components/lucky-spin/HistoryTab';
import { MemberSpinTab } from '@/components/lucky-spin/MemberSpinTab';
import { MembersTab } from '@/components/lucky-spin/MembersTab';
import { selectClass } from '@/components/lucky-spin/styles';

const TABS: { id: TabId; label: string; accent: SpinAccent }[] = [
  { id: 'spin', label: 'Vòng quay may mắn', accent: 'gold' },
  { id: 'giftspin', label: 'Quay quà', accent: 'teal' },
  { id: 'members', label: 'Thành viên', accent: 'gold' },
  { id: 'gifts', label: 'Quà tặng', accent: 'gold' },
  { id: 'history', label: 'Lịch sử', accent: 'gold' },
];

const TAB_ACTIVE_CLASS: Record<SpinAccent, string> = {
  gold: 'bg-[#F0B93C] text-[#2A2000]',
  teal: 'bg-[#3FB893] text-[#0E2B21]',
};

export default function LuckySpinPage() {
  const store = useLuckySpin();
  const [tab, setTab] = useState<TabId>('spin');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-[#C68F1E]" />
            Vòng quay may mắn
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Quay chọn thành viên, quay team và quay quà tặng cho sự kiện nội bộ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            className={cn(selectClass, 'w-auto min-w-[150px]')}
            value={store.workspaceId}
            onChange={(e) => store.switchWorkspace(e.target.value)}
          >
            {WORKSPACES.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <nav className="flex flex-wrap gap-1 rounded-full border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  tab === t.id
                    ? TAB_ACTIVE_CLASS[t.accent]
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Dữ liệu nằm trong localStorage nên chỉ đọc được sau khi mount — chờ để tránh nháy bảng rỗng. */}
      {!store.hydrated ? (
        <div className="py-20 text-center text-sm text-gray-400">Đang tải dữ liệu vòng quay...</div>
      ) : (
        // key theo workspace: đổi vòng quay là dựng lại tab từ đầu, đóng hộp kết quả đang mở và
        // đưa bánh xe về 0. Nếu không, bấm "Xác nhận" sau khi đổi sẽ ghi người trúng của vòng
        // quay cũ vào lịch sử vòng quay mới.
        <div key={store.workspaceId}>
          {tab === 'spin' && <MemberSpinTab store={store} />}
          {tab === 'giftspin' && <GiftSpinTab store={store} />}
          {tab === 'members' && <MembersTab store={store} />}
          {tab === 'gifts' && <GiftsTab store={store} />}
          {tab === 'history' && <HistoryTab store={store} />}
        </div>
      )}
    </div>
  );
}
