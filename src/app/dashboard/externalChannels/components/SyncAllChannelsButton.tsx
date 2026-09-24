'use client';

import { useState } from 'react';
import { Lightning, CircleNotch } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { scraperService } from '@/services/scraperService';
import { type DeletableChannelPlatform } from '@/lib/scrape/delete-channel';
import { hasPermission } from '@/lib/permissions';
import ManualSyncModal, { type ManualSyncConfig } from './ManualSyncModal';

interface Props {
  platform: DeletableChannelPlatform | 'all';
  /** Số kênh đang có, để modal nói đúng quy mô sắp cào. */
  channelCount?: number;
  onStarted?: () => void;
  className?: string;
  label?: string;
  isOwned?: boolean;
}

/**
 * Nút "Cào tay" đa năng cho một nền tảng hoặc tất cả nền tảng.
 *
 * Mở modal cấu hình cho phép người dùng chọn:
 * 1. Phạm vi kênh: Kênh chú ý (tracked), Kênh đã lưu (bookmarked), hoặc Tất cả các kênh.
 * 2. Tiêu chí cào: Chọn 1 trong 2 hình thức (Theo số lượng video HOẶC Theo ngày đăng).
 */
export default function SyncAllChannelsButton({
  platform,
  channelCount,
  onStarted,
  className,
  label,
  isOwned = false,
}: Props) {
  const { token, user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);

  const mutation = useMutation({
    mutationFn: (config: ManualSyncConfig) => {
      if (!token) throw new Error('No token');
      return scraperService.syncAllExternalChannels(token, platform, {
        scope: config.scope,
        mode: config.mode,
        count: config.count,
        days: config.days,
        is_owned: isOwned,
      });
    },
    onSuccess: (data) => {
      if (data.already_running) toast(data.message, { icon: '⏳' });
      else toast.success(data.message);
      setShowModal(false);
      onStarted?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Các điều kiện ẩn nút phải nằm SAU toàn bộ hook: auth-store khởi tạo user = null rồi mới
  // rehydrate, nên nếu return sớm ở trên useMutation thì lần render thứ hai gọi nhiều hook hơn
  // lần đầu và React ném "Rendered more hooks than during the previous render" — trắng trang.

  // Chỉ hiển thị nút nếu user có quyền cào tay
  const isLeaderOrAdmin = user?.roles?.some(r => [UserRole.ADMIN, UserRole.LEADER].includes(r as any)) ?? false;
  const hasExternalPerm = hasPermission(user, 'social:external:crawl_all');
  if (isOwned ? (!isLeaderOrAdmin && !hasExternalPerm) : !hasExternalPerm) {
    return null;
  }

  // Nếu không phải trang "all" và số kênh <= 0 thì không render để tránh gọi API vô ích
  if (platform !== 'all' && channelCount !== undefined && channelCount <= 0) {
    return null;
  }

  const defaultButtonClass =
    'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-all whitespace-nowrap shadow-xs disabled:opacity-50 cursor-pointer';

  const buttonText =
    label ||
    (mutation.isPending
      ? 'Đang gửi lệnh...'
      : platform === 'all'
      ? 'Cào tay tất cả'
      : 'Cào tay');

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        disabled={mutation.isPending}
        className={className || defaultButtonClass}
        title={isOwned ? 'Mở menu cào tất cả video kênh nội bộ' : 'Mở menu cào tay dữ liệu kênh (chọn kênh chú ý, kênh đã lưu hoặc tất cả)'}
      >
        {mutation.isPending ? (
          <CircleNotch size={14} weight="bold" className="animate-spin" />
        ) : (
          <Lightning size={14} weight="fill" className="text-amber-500" />
        )}
        <span>{buttonText}</span>
      </button>

      <ManualSyncModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={(config) => mutation.mutate(config)}
        platform={platform}
        channelCount={channelCount}
        isLoading={mutation.isPending}
        isOwned={isOwned}
      />
    </>
  );
}
