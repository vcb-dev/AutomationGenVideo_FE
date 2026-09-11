'use client';

import { useState } from 'react';
import { ArrowsClockwise, CircleNotch } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';
import { type DeletableChannelPlatform } from '@/lib/scrape/delete-channel';
import ConfirmModal from './ConfirmModal';

interface Props {
  platform: DeletableChannelPlatform;
  /** Số kênh đang có, để hộp xác nhận nói đúng quy mô sắp cào. */
  channelCount: number;
  onStarted?: () => void;
}

/**
 * Nút "Đồng bộ tất cả" cho một nền tảng.
 *
 * Thay cho việc bấm cào từng kênh một khi có hàng chục kênh. BE chạy nền và trả về ngay,
 * nên nút chỉ báo "đã bắt đầu" chứ không chờ xong — cào 59 kênh mất vài phút vì mỗi kênh
 * nghỉ 5 giây giữa các lượt để không dồn dập gọi API bên thứ ba.
 *
 * Ẩn khi danh sách rỗng: không có gì để đồng bộ mà vẫn cho bấm thì chỉ tổ gọi API vô ích.
 */
export default function SyncAllChannelsButton({ platform, channelCount, onStarted }: Props) {
  const { token } = useAuthStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('No token');
      return scraperService.syncAllExternalChannels(token, platform);
    },
    onSuccess: (data) => {
      if (data.already_running) toast(data.message, { icon: '⏳' });
      else toast.success(data.message);
      onStarted?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (channelCount <= 0) return null;

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={mutation.isPending}
        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-md transition-all whitespace-nowrap shadow-sm disabled:opacity-50 cursor-pointer"
        title="Chỉ cào video mới cho các kênh đã được bật icon đồng hồ (Kênh chú ý)"
      >
        {mutation.isPending ? (
          <CircleNotch size={14} weight="bold" className="animate-spin" />
        ) : (
          <ArrowsClockwise size={14} weight="bold" />
        )}
        {mutation.isPending ? 'Đang cào...' : 'Cào video kênh chú ý'}
      </button>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          mutation.mutate();
        }}
        title="Cào video kênh chú ý"
        description={
          <div className="space-y-2">
            <p>
              Hệ thống sẽ tiến hành cào video mới cho <strong>{channelCount}</strong> kênh trong danh sách{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Kênh chú ý</strong>.
            </p>
            <p className="text-slate-400">
              Tiến trình cào chạy ngầm và sẽ gửi thông báo đến bạn khi hoàn tất.
            </p>
          </div>
        }
        icon={<ArrowsClockwise size={22} weight="bold" />}
        confirmText="Bắt đầu cào"
        cancelText="Hủy"
        variant="emerald"
        isLoading={mutation.isPending}
      />
    </>
  );
}

