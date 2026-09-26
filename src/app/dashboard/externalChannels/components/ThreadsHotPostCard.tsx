'use client';

import React, { useState } from 'react';
import {
  Heart,
  ChatCircle,
  Repeat,
  Eye,
  Copy,
  Check,
  ArrowSquareOut,
  Play,
  VideoCamera,
  Image as ImageIcon,
  FileText,
  BookmarkSimple,
  CircleNotch,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { ThreadsPost } from '@/services/scraperService';

function proxyImg(url?: string): string {
  if (!url) return '';
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

interface ThreadsHotPostCardProps {
  post: ThreadsPost;
  onSavePost?: (post: ThreadsPost) => void;
  isSaving?: boolean;
  onExploreAuthor?: (username: string) => void;
}

export default function ThreadsHotPostCard({
  post,
  onSavePost,
  isSaving,
  onExploreAuthor,
}: ThreadsHotPostCardProps) {
  const [copied, setCopied] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.text) {
      toast.error('Bài viết không có nội dung chữ');
      return;
    }
    navigator.clipboard.writeText(post.text);
    setCopied(true);
    toast.success('Đã sao chép nội dung bài viết!');
    setTimeout(() => setCopied(false), 2000);
  };

  const likes = typeof post.likes_count === 'number' ? post.likes_count : parseInt(String(post.likes_count) || '0', 10);
  const replies = typeof post.replies_count === 'number' ? post.replies_count : parseInt(String(post.replies_count) || '0', 10);
  const views = typeof post.views_count === 'number' ? post.views_count : parseInt(String(post.views_count) || '0', 10);
  const reposts = typeof post.reposts_count === 'number' ? post.reposts_count : parseInt(String(post.reposts_count) || '0', 10);

  const isVideo = post.media_type === 'VIDEO' || Boolean(post.video_url);
  const isImage = post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL';

  const wordCount = (post.text || '').trim().split(/\s+/).filter(Boolean).length;
  const isStory = wordCount >= 50 || (post.text || '').length >= 150;
  const isHiddenGem = isStory && likes < 50;

  const authorUsername = post.author_username || post.profile?.username || '';
  const authorName = post.author_name || post.profile?.name || authorUsername || 'Ẩn danh';
  const authorAvatar = post.author_avatar || post.profile?.avatar_url;

  return (
    <>
      <div className="flex flex-col justify-between bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
        <div>
          {/* Header: Author + Media badge */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-border">
                {authorAvatar && !avatarError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={proxyImg(authorAvatar)}
                    alt={authorUsername || 'Threads user'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-inner">
                    {(authorName || 'T')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-semibold text-foreground truncate">
                  {authorName}
                </span>
                <span className="text-[11px] text-slate-500 truncate">
                  @{authorUsername || 'threads_user'}
                </span>
              </div>
            </div>

            {/* Media Type Badge */}
            <div className="shrink-0">
              {isVideo ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  <VideoCamera size={12} weight="fill" />
                  <span>Video</span>
                </span>
              ) : isImage ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  <ImageIcon size={12} weight="fill" />
                  <span>Ảnh</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <FileText size={12} weight="fill" />
                  <span>Chữ</span>
                </span>
              )}
            </div>
          </div>

          {/* Media preview (if video or image) */}
          {(isVideo || isImage) && (post.thumbnail_url || post.video_url) && (
            <div
              onClick={() => {
                if (isVideo && post.video_url) setShowVideoModal(true);
              }}
              className={`relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 mb-3 border border-border/50 group ${
                isVideo && post.video_url ? 'cursor-pointer' : ''
              }`}
            >
              {post.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxyImg(post.thumbnail_url)}
                  alt="Post media"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <VideoCamera size={32} />
                </div>
              )}

              {isVideo && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play size={18} weight="fill" className="ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Story / Hidden Gem badge */}
          {(isStory || isHiddenGem) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {isStory && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40 shadow-2xs">
                  <span>📖</span>
                  <span>Bài kể chuyện ({wordCount} từ)</span>
                </span>
              )}
              {isHiddenGem && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/40 shadow-2xs"
                  title="Bài viết hay có ít like, rất thích hợp làm kịch bản video độc quyền"
                >
                  <span>💎</span>
                  <span>Hidden Gem ({likes} like)</span>
                </span>
              )}
            </div>
          )}

          {/* Post text / caption */}
          <div className="text-xs text-foreground/90 mb-3 break-words whitespace-pre-line leading-relaxed">
            {post.text ? (

              <>
                {isExpanded || post.text.length <= 160 ? post.text : `${post.text.slice(0, 160)}... `}
                {post.text.length > 160 && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-primary hover:underline font-medium ml-1 inline-block"
                  >
                    {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                  </button>
                )}
              </>
            ) : (
              <span className="text-slate-400 italic">Không có chú thích</span>
            )}
          </div>
        </div>

        <div>
          {/* Engagement Metrics */}
          <div className="grid grid-cols-4 gap-1 py-2 border-y border-border/60 text-slate-500 text-[11px] mb-3">
            <div className="flex items-center justify-center gap-1" title="Lượt xem">
              <Eye size={13} className="text-slate-400" />
              <span>{views > 0 ? views.toLocaleString('vi-VN') : '—'}</span>
            </div>
            <div className="flex items-center justify-center gap-1" title="Lượt thích">
              <Heart size={13} className="text-red-500" weight="fill" />
              <span>{likes.toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex items-center justify-center gap-1" title="Bình luận">
              <ChatCircle size={13} className="text-blue-500" weight="fill" />
              <span>{replies.toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex items-center justify-center gap-1" title="Chia sẻ / Repost">
              <Repeat size={13} className="text-emerald-500" weight="bold" />
              <span>{reposts.toLocaleString('vi-VN')}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground rounded-lg transition-colors"
              title="Sao chép nội dung bài viết để làm kịch bản"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Đã chép' : 'Chép content'}</span>
            </button>

            <button
              type="button"
              onClick={() => onSavePost && onSavePost(post)}
              disabled={isSaving}
              className="flex items-center justify-center gap-1 py-1.5 px-2.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800/50"
              title="Bài viết này đã được tự động lưu vào kho dữ liệu hệ thống"
            >
              <Check size={14} weight="bold" />
              <span>Đã lưu</span>
            </button>

            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Mở bài viết trên Threads"
              >
                <ArrowSquareOut size={16} />
              </a>
            )}

            {onExploreAuthor && authorUsername && (
              <button
                type="button"
                onClick={() => onExploreAuthor(authorUsername)}
                className="text-[11px] text-slate-500 hover:text-primary px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={`Xem toàn bộ kênh @${authorUsername}`}
              >
                Kênh
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Modal Preview */}
      {showVideoModal && post.video_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="relative max-w-lg w-full bg-background rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Xem trước video (@{post.author_username})
              </span>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-xs text-slate-400 hover:text-foreground px-2 py-1 rounded-md"
              >
                Đóng
              </button>
            </div>
            <video
              src={post.video_url}
              controls
              autoPlay
              className="w-full max-h-[70vh] rounded-lg bg-black object-contain"
            />
            {post.text && (
              <p className="text-xs text-slate-600 dark:text-slate-300 max-h-24 overflow-y-auto">
                {post.text}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-foreground rounded-lg"
              >
                <Copy size={14} />
                <span>Sao chép kịch bản</span>
              </button>
              <a
                href={post.video_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90"
              >
                Tải video gốc
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
