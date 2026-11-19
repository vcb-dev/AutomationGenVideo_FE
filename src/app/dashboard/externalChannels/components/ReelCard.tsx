'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, ThumbsUp, ChatCircle, ShareNetwork, PaperPlaneTilt, CircleNotch, Trash } from '@phosphor-icons/react';
import { ScrapedReel, scraperService } from '@/services/scraperService';
import { useAuthStore } from '@/store/auth-store';
import { videoLibraryService } from '@/services/videoLibraryService';
import { useSubmitVideoToLibrary } from '@/hooks/useProposeVideo';
interface ReelCardProps {
  reel: ScrapedReel;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function renderCaption(text: string) {
  if (!text) return null;
  return text.split(/(#\S+)/g).map((part, i) =>
    part.startsWith('#')
      ? <span key={i} className="text-blue-500 font-medium">{part}</span>
      : <span key={i}>{part}</span>
  );
}

export default function ReelCard({ reel }: ReelCardProps) {
  // Leader/Admin them thang vao Bo Suu Tap, con lai vao hang cho duyet — xem useProposeVideo.ts
  const { submit, successMessage, actionLabel, doneLabel } = useSubmitVideoToLibrary();
  const proposeMutation = useMutation({
    mutationFn: () => {
      return submit({
        video_id: reel.post_id,
        platform: 'facebook',
        title: reel.content?.slice(0, 200) || '',
        description: reel.content || '',
        video_url: reel.url,
        author_username: reel.fanpage?.handle || '',
        author_name: reel.fanpage?.name || '',
        thumbnail_url: reel.thumbnail_url || undefined,
        views_count: reel.views_count,
        likes_count: reel.likes_count,
        comments_count: reel.comments_count,
        shares_count: reel.shares_count,
        hashtags: reel.hashtags,
        source: 'SCRAPED',
      });
    },
    onSuccess: () => toast.success(successMessage),
    onError: (e: Error) => toast.error(e.message),
  });

  const { token } = useAuthStore();
  const [isDeleted, setIsDeleted] = useState(false);

  const hideMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Chưa đăng nhập');
      return scraperService.hideVideo(token, 'facebook', reel.post_id);
    },
    onSuccess: () => {
      setIsDeleted(true);
      toast(
        (t) => (
          <div className="flex items-center justify-between gap-3 text-xs">
            <span>Đã ẩn Reel khỏi danh sách</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                restoreMutation.mutate();
              }}
              className="px-2 py-0.5 font-bold bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity cursor-pointer"
            >
              Hoàn tác
            </button>
          </div>
        ),
        { duration: 5000, icon: '🗑️' }
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Chưa đăng nhập');
      return scraperService.restoreVideo(token, 'facebook', reel.post_id);
    },
    onSuccess: () => {
      setIsDeleted(false);
      toast.success('Đã khôi phục Reel về danh sách');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isDeleted) return null;

  return (
    <div className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col relative">
      {/* Thumbnail */}
      <a
        href={reel.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden"
      >
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500">
          <Eye size={32} />
        </div>
        {reel.thumbnail_url && reel.thumbnail_url !== 'FAILED' ? (
          <img
            src={reel.thumbnail_url}
            alt=""
            referrerPolicy="no-referrer"
            className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}

        {/* Nút xoá nhanh trên ảnh preview khi hover */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              hideMutation.mutate();
            }}
            disabled={hideMutation.isPending}
            title="Xoá / Ẩn Reel không phù hợp"
            className="p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-md backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all shadow-sm cursor-pointer"
          >
            {hideMutation.isPending ? (
              <CircleNotch size={14} className="animate-spin" />
            ) : (
              <Trash size={14} weight="bold" />
            )}
          </button>
        </div>

        {/* Metrics overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pb-2.5 pt-8">
          <div className="flex items-center gap-2.5 text-white text-xs">
            <span className="flex items-center gap-1">
              <Eye size={12} weight="fill" />
              {formatNum(reel.views_count)}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp size={12} weight="fill" />
              {formatNum(reel.likes_count)}
            </span>
            <span className="flex items-center gap-1">
              <ChatCircle size={12} weight="fill" />
              {formatNum(reel.comments_count)}
            </span>
          </div>
        </div>
      </a>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Caption */}
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
          {renderCaption(reel.content)}
        </p>

        {/* Fanpage info */}
        {reel.fanpage && (
          <div className="flex items-center gap-1.5 pt-1.5">
            {reel.fanpage.avatar_url && reel.fanpage.avatar_url !== 'FAILED' ? (
              <img
                src={reel.fanpage.avatar_url}
                alt=""
                referrerPolicy="no-referrer"
                className="w-4 h-4 rounded-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : null}
            <span className="text-xs text-slate-500 truncate">{reel.fanpage.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          {/* Date */}
          <p className="text-xs text-slate-400">
            {new Date(reel.date_posted).toLocaleDateString('vi-VN')}
          </p>
          <button
            onClick={() => proposeMutation.mutate()}
            disabled={proposeMutation.isPending || proposeMutation.isSuccess}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/10 disabled:opacity-50 transition-colors flex-shrink-0 cursor-pointer"
          >
            {proposeMutation.isPending ? (
              <CircleNotch size={12} weight="bold" className="animate-spin" />
            ) : (
              <PaperPlaneTilt size={12} weight="bold" />
            )}
            {proposeMutation.isSuccess ? doneLabel : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
