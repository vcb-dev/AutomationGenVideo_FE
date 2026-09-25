'use client';

import { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  Eye,
  ChatCircle,
  VideoCamera,
  ArrowsClockwise,
  BookmarkSimple,
  Timer,
  CircleNotch,
  SealCheck,
  MagnifyingGlass,
  X,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { SiThreads } from 'react-icons/si';

import { useAuthStore } from '@/store/auth-store';
import { scraperService, ThreadsPost, ThreadsToggleField } from '@/services/scraperService';
import { useSubmitVideoToLibrary } from '@/hooks/useProposeVideo';

function proxyImg(url?: string): string {
  if (!url) return '';
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function formatNum(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n, 10) || 0 : n;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

function ThreadsPostCard({ post, authorUsername }: { post: ThreadsPost; authorUsername: string }) {
  const { submit, successMessage, actionLabel, doneLabel } = useSubmitVideoToLibrary();

  const proposeMutation = useMutation({
    mutationFn: () => {
      return submit({
        video_id: post.post_id,
        platform: 'threads',
        title: post.text?.slice(0, 150) || 'Bài viết Threads',
        description: post.text || '',
        video_url: post.url,
        author_username: authorUsername,
        thumbnail_url: post.thumbnail_url || undefined,
        views_count: Number(post.views_count) || 0,
        likes_count: Number(post.likes_count) || 0,
        comments_count: Number(post.replies_count) || 0,
        source: 'SCRAPED',
      });
    },
    onSuccess: () => toast.success(successMessage),
    onError: (e: Error) => toast.error(e.message),
  });

  const isVideo = post.media_type === 'VIDEO';

  return (
    <div className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col justify-between">
      <div>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden"
        >
          {post.thumbnail_url ? (
            <img
              src={proxyImg(post.thumbnail_url)}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
              <SiThreads size={36} className="mb-2 opacity-50" />
              <span className="text-xs text-slate-400 line-clamp-3">{post.text || 'Bài viết chữ'}</span>
            </div>
          )}

          {isVideo && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-white text-[10px] flex items-center gap-1 font-medium">
              <VideoCamera size={11} weight="fill" />
              <span>Video</span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pb-2 pt-6">
            <div className="flex items-center gap-2.5 text-white text-xs font-medium">
              {Number(post.views_count) > 0 && (
                <span className="flex items-center gap-1">
                  <Eye size={12} weight="fill" />
                  {formatNum(post.views_count)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Heart size={12} weight="fill" />
                {formatNum(post.likes_count)}
              </span>
              <span className="flex items-center gap-1">
                <ChatCircle size={12} weight="fill" />
                {formatNum(post.replies_count)}
              </span>
            </div>
          </div>
        </a>

        <div className="p-3 flex flex-col gap-1.5">
          <p className="text-xs text-foreground line-clamp-3 leading-relaxed">
            {post.text || <span className="text-slate-400 italic">Không có nội dung chữ</span>}
          </p>
        </div>
      </div>

      <div className="p-3 pt-0 flex items-center justify-between gap-2 border-t border-border/50 mt-2">
        <span className="text-[11px] text-slate-400">
          {new Date(post.date_posted).toLocaleDateString('vi-VN')}
        </span>
        <button
          onClick={() => proposeMutation.mutate()}
          disabled={proposeMutation.isPending}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
        >
          {proposeMutation.isPending ? (
            <CircleNotch size={12} className="animate-spin" />
          ) : (
            <PaperPlaneTilt size={12} />
          )}
          <span>Đề xuất</span>
        </button>
      </div>
    </div>
  );
}

export default function ThreadsProfileDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const resolvedParams = use(params);
  const profileId = resolvedParams.profileId;
  const { token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [mediaType, setMediaType] = useState<'ALL' | 'VIDEO' | 'IMAGE'>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'views' | 'replies'>('date');
  const [page, setPage] = useState(1);

  // Query Profile Details
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['threads-profile-detail', profileId],
    queryFn: () => {
      if (!token) throw new Error('No token');
      return scraperService.getThreadsProfileDetail(token, profileId);
    },
    enabled: !!token && !!profileId,
  });

  // Query Posts
  const { data: postsData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['threads-profile-posts', profileId, search, mediaType, sortBy, page],
    queryFn: () => {
      if (!token) throw new Error('No token');
      return scraperService.getThreadsProfilePosts(token, profileId, {
        search: search || undefined,
        media_type: mediaType,
        sort_by: sortBy,
        page,
        limit: 24,
      });
    },
    enabled: !!token && !!profileId,
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: ({ field, value }: { field: ThreadsToggleField; value: boolean }) => {
      if (!token) throw new Error('No token');
      return scraperService.toggleThreadsProfile(token, profileId, field, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads-profile-detail', profileId] });
      queryClient.invalidateQueries({ queryKey: ['threads-profiles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Rescrape Mutation
  const rescrapeMutation = useMutation({
    mutationFn: () => {
      if (!token || !profile) throw new Error('No token or profile');
      return scraperService.scrapeThreadsProfile(token, profile.username, 50);
    },
    onSuccess: (data) => {
      toast.success(`Đã cập nhật bài viết mới! (+${data.items_returned || 0} bài)`);
      queryClient.invalidateQueries({ queryKey: ['threads-profile-detail', profileId] });
      queryClient.invalidateQueries({ queryKey: ['threads-profile-posts', profileId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <CircleNotch size={32} className="animate-spin mb-2" />
        <span className="text-xs">Đang tải thông tin kênh Threads...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500 mb-4">Không tìm thấy thông tin kênh Threads này.</p>
        <button
          onClick={() => router.push('/dashboard/externalChannels/threads')}
          className="px-4 py-2 text-xs bg-primary text-primary-foreground rounded-lg font-medium"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const posts = postsData?.items || [];
  const totalPosts = postsData?.total || 0;
  const totalPages = postsData?.total_pages || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar: Back button */}
      <div>
        <button
          onClick={() => router.push('/dashboard/externalChannels/threads')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft size={14} />
          <span>Quay lại danh sách kênh Threads</span>
        </button>
      </div>

      {/* Profile Banner */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={proxyImg(profile.avatar_url)}
                alt={profile.username}
                className="w-16 h-16 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <SiThreads size={32} />
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold text-foreground">{profile.name || profile.username}</h1>
                {profile.is_verified && <SealCheck size={16} weight="fill" className="text-blue-500" />}
              </div>
              <a
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-primary transition-colors inline-block mt-0.5"
              >
                @{profile.username} ↗
              </a>
              {profile.biography && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-xl leading-relaxed">
                  {profile.biography}
                </p>
              )}
            </div>
          </div>

          {/* Stats & Actions */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => rescrapeMutation.mutate()}
              disabled={rescrapeMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground rounded-lg transition-colors"
            >
              <ArrowsClockwise size={14} className={rescrapeMutation.isPending ? 'animate-spin' : ''} />
              <span>Cào thêm bài</span>
            </button>

            <button
              onClick={() => toggleMutation.mutate({ field: 'is_tracked', value: !profile.is_tracked })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                profile.is_tracked
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-foreground'
              }`}
            >
              <Timer size={14} weight={profile.is_tracked ? 'fill' : 'regular'} />
              <span>{profile.is_tracked ? 'Đang chú ý' : 'Theo dõi'}</span>
            </button>

            <button
              onClick={() => toggleMutation.mutate({ field: 'is_bookmarked', value: !profile.is_bookmarked })}
              className={`p-2 text-xs font-medium rounded-lg transition-colors ${
                profile.is_bookmarked
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-500 border border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-foreground'
              }`}
            >
              <BookmarkSimple size={15} weight={profile.is_bookmarked ? 'fill' : 'regular'} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border">
          <div>
            <span className="text-xs text-slate-400 block">Người theo dõi</span>
            <span className="text-sm font-bold text-foreground">{formatNum(profile.followers_count)}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Bài viết trong kho</span>
            <span className="text-sm font-bold text-foreground">{profile.posts_count || 0}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Trạng thái cào</span>
            <span className="text-xs font-medium text-emerald-600">
              {profile.scraping_status === 'completed' ? 'Đã hoàn thành' : profile.scraping_status}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Cập nhật lần cuối</span>
            <span className="text-xs text-slate-500">
              {profile.last_scraped_at ? new Date(profile.last_scraped_at).toLocaleDateString('vi-VN') : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Media filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => { setMediaType('ALL'); setPage(1); }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                mediaType === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              Tất cả ({totalPosts})
            </button>
            <button
              onClick={() => { setMediaType('VIDEO'); setPage(1); }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                mediaType === 'VIDEO'
                  ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              Video
            </button>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e: any) => { setSortBy(e.target.value); setPage(1); }}
            className="py-1 px-2.5 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none"
          >
            <option value="date">Mới nhất</option>
            <option value="likes">Nhiều like nhất</option>
            <option value="views">Nhiều view nhất</option>
            <option value="replies">Nhiều bình luận nhất</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo nội dung bài viết..."
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-slate-400 focus:outline-none"
          />
          <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      {isLoadingPosts ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <CircleNotch size={32} className="animate-spin mb-2" />
          <span className="text-xs">Đang tải danh sách bài viết...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border rounded-xl">
          <p className="text-xs text-slate-500">Chưa có bài viết nào phù hợp với bộ lọc.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {posts.map((post) => (
              <ThreadsPostCard
                key={post.id}
                post={post}
                authorUsername={profile.username}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-slate-500">
              <span>
                Trang {page} / {totalPages} (Tổng {totalPosts} bài viết)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
