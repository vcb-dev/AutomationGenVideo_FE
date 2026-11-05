'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowFatUp, ArrowSquareOut, ChatCircle, Check, Copy, Play } from '@phosphor-icons/react';
import type { RedditPost } from '@/services/scraperService';
import { REDDIT_MEDIA_LABELS, formatRedditCount } from '@/lib/scrape/reddit-helpers';

interface RedditPostCardProps {
  post: RedditPost;
  /** Bấm "r/tên" để lọc kho theo cộng đồng đó. */
  onSubredditClick?: (name: string) => void;
}

export default function RedditPostCard({ post, onSubredditClick }: RedditPostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isVideo = post.media_type === 'VIDEO';
  const showMedia = Boolean(post.thumbnail_url) && !imageError;
  const longText = post.text.length > 280;

  const handleCopy = async () => {
    await navigator.clipboard.writeText([post.title, post.text].filter(Boolean).join('\n\n'));
    setCopied(true);
    toast.success('Đã sao chép tiêu đề và nội dung bài!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
      {/* Cộng đồng · tác giả · ngày đăng */}
      <div className="flex items-center justify-between gap-2 mb-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={() => onSubredditClick?.(post.subreddit_name)}
            disabled={!onSubredditClick}
            title={onSubredditClick ? `Lọc kho theo r/${post.subreddit_name}` : undefined}
            className="font-semibold text-orange-600 dark:text-orange-400 hover:underline disabled:hover:no-underline truncate"
          >
            r/{post.subreddit_name}
          </button>
          <span>·</span>
          <span className="truncate">u/{post.author || '[deleted]'}</span>
        </div>
        <span className="shrink-0">{new Date(post.date_posted).toLocaleDateString('vi-VN')}</span>
      </div>

      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5">{post.title}</h3>

      {post.text && (
        <div className="mb-2">
          <p className={`text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line ${expanded ? '' : 'line-clamp-4'}`}>
            {post.text}
          </p>
          {longText && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] font-medium text-primary hover:underline mt-0.5"
            >
              {expanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </div>
      )}

      {showMedia && (
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`relative block rounded-lg overflow-hidden bg-slate-900 mb-2 ${isVideo ? 'aspect-[9/16] max-h-80 mx-auto w-full max-w-[180px]' : 'aspect-[4/3]'}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.thumbnail_url!}
            alt={post.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImageError(true)}
            className={`w-full h-full ${isVideo ? 'object-cover' : 'object-contain'}`}
          />
          {isVideo && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center">
                <Play size={18} weight="fill" />
              </span>
            </span>
          )}
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
            {REDDIT_MEDIA_LABELS[post.media_type] ?? post.media_type}
          </span>
        </a>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1" title="Điểm (upvote − downvote)">
            <ArrowFatUp size={14} weight="fill" className="text-orange-500" />
            {formatRedditCount(post.score)}
          </span>
          <span className="flex items-center gap-1" title="Bình luận">
            <ChatCircle size={14} />
            {formatRedditCount(post.comments_count)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            title="Sao chép tiêu đề + nội dung"
            className="p-1.5 rounded-md text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Mở bài trên Reddit"
            className="p-1.5 rounded-md text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowSquareOut size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
