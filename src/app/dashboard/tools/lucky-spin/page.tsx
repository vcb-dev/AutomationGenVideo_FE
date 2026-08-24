'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLuckySpin } from '@/hooks/useLuckySpin';
import { isMuted, preloadSpinMusic, setMuted } from '@/lib/lucky-spin/spin-effects';
import {
  loadShowNames,
  saveShowNames,
  WheelNamesProvider,
} from '@/components/lucky-spin/WheelNamesContext';
import { TabId } from '@/types/lucky-spin';
import { GiftSpinTab } from '@/components/lucky-spin/GiftSpinTab';
import { GiftsTab } from '@/components/lucky-spin/GiftsTab';
import { HistoryTab } from '@/components/lucky-spin/HistoryTab';
import { MemberSpinTab } from '@/components/lucky-spin/MemberSpinTab';
import { MembersTab } from '@/components/lucky-spin/MembersTab';
import { SpinReadOnlyProvider } from '@/components/lucky-spin/ReadOnlyContext';
import { mutedClass, pageTitleClass, selectClass } from '@/components/lucky-spin/styles';

const TABS: { id: TabId; label: string }[] = [
  { id: 'spin', label: 'Vòng quay may mắn' },
  { id: 'giftspin', label: 'Quay quà' },
  { id: 'members', label: 'Thành viên' },
  { id: 'gifts', label: 'Quà tặng' },
  { id: 'history', label: 'Lịch sử' },
];

export default function LuckySpinPage() {
  const store = useLuckySpin();
  const [tab, setTab] = useState<TabId>('spin');
  // localStorage chỉ đọc được sau khi mount, nếu đọc ngay lúc dựng state sẽ lệch với HTML server.
  const [muted, setMutedState] = useState(false);
  const [showNames, setShowNames] = useState(true);
  useEffect(() => {
    setMutedState(isMuted());
    setShowNames(loadShowNames());
    preloadSpinMusic();
  }, []);

  const toggleNames = () => {
    const next = !showNames;
    setShowNames(next);
    saveShowNames(next);
  };

  const toggleSound = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] dark:bg-[#0B0E14]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-9 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className={cn(pageTitleClass, 'flex items-center gap-3')}>
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#FFF8E7] dark:bg-[#F4B63D]/12">
                <Sparkles className="h-5 w-5 text-[#F4B63D]" strokeWidth={2} />
              </span>
              Vòng quay may mắn
            </h1>
            <p className={cn(mutedClass, 'mt-2.5')}>
              Quay chọn thành viên, quay team và quay quà tặng cho sự kiện nội bộ.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleNames}
              title={showNames ? 'Ẩn tên trên vòng quay' : 'Hiện tên trên vòng quay'}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#DCE1E7] bg-white text-[#6B7280] transition-colors hover:border-[#F4B63D] hover:text-[#111827] dark:border-white/[0.09] dark:bg-white/[0.03]"
            >
              {showNames ? <Eye className="h-4.5 w-4.5" strokeWidth={1.8} /> : <EyeOff className="h-4.5 w-4.5" strokeWidth={1.8} />}
            </button>

            <button
              type="button"
              onClick={toggleSound}
              title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#DCE1E7] bg-white text-[#6B7280] transition-colors hover:border-[#F4B63D] hover:text-[#111827] dark:border-white/[0.09] dark:bg-white/[0.03]"
            >
              {muted ? <VolumeX className="h-4.5 w-4.5" strokeWidth={1.8} /> : <Volume2 className="h-4.5 w-4.5" strokeWidth={1.8} />}
            </button>

          <select
            className={cn(selectClass, 'w-auto min-w-[168px]')}
            value={store.workspaceId}
            onChange={(e) => store.switchWorkspace(e.target.value)}
            disabled={store.workspaces.length === 0}
          >
            {store.workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          </div>
        </div>

        <nav className="mb-8 inline-flex max-w-full flex-wrap gap-1 rounded-full bg-[#F3F4F6] p-1 dark:bg-white/[0.05]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-full px-5 py-2.5 text-[14px] transition-all duration-[250ms] ease-out',
                tab === t.id
                  ? 'bg-[#F4B63D] font-semibold text-[#111827] shadow-[0_2px_8px_rgba(244,182,61,0.25)]'
                  : 'font-medium text-[#6B7280] hover:bg-[#ECEFF3] hover:text-[#111827] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {store.error ? (
          <div className="rounded-[18px] border border-[#EF4444]/25 bg-[#EF4444]/[0.06] px-6 py-5 text-[15px] text-[#B91C1C]">
            Không tải được dữ liệu vòng quay từ server. Kiểm tra kết nối rồi tải lại trang.
          </div>
        ) : store.isLoading ? (
          <div className="py-24 text-center text-[15px] text-[#9CA3AF]">Đang tải dữ liệu vòng quay...</div>
        ) : (
          // key theo workspace: đổi vòng quay là dựng lại tab từ đầu, đóng hộp kết quả đang mở và
          // đưa bánh xe về 0. Nếu không, bấm "Xác nhận" sau khi đổi sẽ ghi người trúng của vòng
          // quay cũ vào lịch sử vòng quay mới.
          <WheelNamesProvider showNames={showNames}>
            <SpinReadOnlyProvider readOnly={!store.canControl}>
              <div key={store.workspaceId}>
                {tab === 'spin' && <MemberSpinTab store={store} />}
                {tab === 'giftspin' && <GiftSpinTab store={store} />}
                {tab === 'members' && <MembersTab store={store} />}
                {tab === 'gifts' && <GiftsTab store={store} />}
                {tab === 'history' && <HistoryTab store={store} />}
              </div>
            </SpinReadOnlyProvider>
          </WheelNamesProvider>
        )}
      </div>
    </div>
  );
}
