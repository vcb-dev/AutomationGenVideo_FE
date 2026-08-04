'use client';

import { useState } from 'react';
import { Eye, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '@/lib/lucky-spin/api';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { ConfirmDialog } from '@/components/lucky-spin/ConfirmDialog';

/**
 * Cho biết ai đang điều khiển vòng quay và cho phép giữ / nhả quyền.
 *
 * Luôn hiện, kể cả khi chưa ai giữ khóa: người sắp dẫn chương trình cần thấy nút để giữ chỗ
 * trước giờ G, chứ không phải đợi tới lúc bị người khác chiếm mới biết có cơ chế này.
 */
export function ControlBanner({ store }: { store: LuckySpinStore }) {
  const [askTakeover, setAskTakeover] = useState(false);

  const claim = async () => {
    try {
      await store.takeControl();
      toast.success('Bạn đang điều khiển vòng quay.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không giữ được quyền điều khiển.'));
    }
  };

  const release = async () => {
    try {
      await store.releaseControl();
      toast.success('Đã nhả quyền điều khiển.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không nhả được quyền.'));
    }
  };

  const takeover = async () => {
    setAskTakeover(false);
    try {
      await store.takeControl(true);
      toast.success('Bạn đang điều khiển vòng quay.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không tiếp quản được.'));
    }
  };

  if (store.isController) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#F4B63D]/40 bg-[#FFF8E7] px-5 py-3.5">
        <span className="flex items-center gap-2.5 text-[15px] font-medium text-[#8A6410]">
          <Lock className="h-4 w-4" strokeWidth={2} />
          Bạn đang điều khiển vòng quay — người khác chỉ xem được.
        </span>
        <ActionButton variant="secondary" className="!h-9 !text-[13px]" onClick={release}>
          <Unlock className="h-3.5 w-3.5" strokeWidth={1.8} />
          Nhả quyền
        </ActionButton>
      </div>
    );
  }

  if (!store.canControl) {
    return (
      <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#E8EBEF] bg-white px-5 py-3.5 dark:border-white/[0.07] dark:bg-[#141821]">
          <span className="flex items-center gap-2.5 text-[15px] text-[#6B7280] dark:text-gray-400">
            <Eye className="h-4 w-4" strokeWidth={1.8} />
            <span>
              <b className="font-semibold text-[#111827] dark:text-white">{store.control.controllerName}</b> đang điều
              khiển. Bạn xem được kết quả trực tiếp nhưng không thao tác được.
            </span>
          </span>
          <ActionButton variant="secondary" className="!h-9 !text-[13px]" onClick={() => setAskTakeover(true)}>
            Tiếp quản
          </ActionButton>
        </div>

        <ConfirmDialog
          open={askTakeover}
          title="Tiếp quản quyền điều khiển?"
          description={`${store.control.controllerName} sẽ mất quyền thao tác ngay lập tức. Chỉ nên làm khi họ đã rời đi hoặc máy gặp sự cố.`}
          confirmLabel="Tiếp quản"
          onConfirm={takeover}
          onCancel={() => setAskTakeover(false)}
        />
      </>
    );
  }

  // Khóa đang trống: vẫn thao tác được ngay, nhưng nên giữ chỗ trước khi bắt đầu buổi sự kiện.
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#E8EBEF] bg-white px-5 py-3.5 dark:border-white/[0.07] dark:bg-[#141821]">
      <span className="flex items-center gap-2.5 text-[15px] text-[#6B7280] dark:text-gray-400">
        <Unlock className="h-4 w-4" strokeWidth={1.8} />
        Chưa có ai điều khiển. Giữ quyền trước khi bắt đầu để người khác không thao tác nhầm.
      </span>
      <ActionButton className="!h-9 !text-[13px]" onClick={claim}>
        <Lock className="h-3.5 w-3.5" strokeWidth={2} />
        Giữ quyền điều khiển
      </ActionButton>
    </div>
  );
}
