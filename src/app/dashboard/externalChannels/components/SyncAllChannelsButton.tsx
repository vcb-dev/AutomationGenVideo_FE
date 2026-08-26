'use client';

import { ArrowsClockwise, CircleNotch } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';
import { buildSyncAllConfirm, type DeletableChannelPlatform } from '@/lib/scrape/delete-channel';

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

  const handleClick = () => {
    if (!window.confirm(buildSyncAllConfirm(channelCount))) return;
    mutation.mutate();
  };

  return (
    <button
      onClick={handleClick}
      disabled={mutation.isPending}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      title={`Cào lại toàn bộ ${channelCount} kênh`}
    >
      {mutation.isPending ? (
        <CircleNotch size={15} weight="bold" className="animate-spin" />
      ) : (
        <ArrowsClockwise size={15} weight="bold" />
      )}
      Đồng bộ tất cả
    </button>
  );
}
