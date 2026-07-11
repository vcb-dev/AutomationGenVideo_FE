'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleNotch, MagnifyingGlassPlus, UserCircle } from '@phosphor-icons/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import YoutubeProfileCard from '../components/YoutubeProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';
import { useProfileScrapeNotification } from '@/hooks/useProfileScrapeNotification';
import { UserRole } from '@/types/auth';

const PAGE_SIZE = 12;

export default function YoutubeExternalPage() {
  const { token, user } = useAuthStore();
  const isAdmin = user?.roles?.includes(UserRole.ADMIN) ?? false;
  const queryClient = useQueryClient();
  const router = useRouter();
  const { start: startProfileScrapeNotif } = useProfileScrapeNotification('youtube');

  // State
  const [channelId, setChannelId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'subscribers' | 'recent'>('subscribers');
  const searchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const hasFilters = !!search || sortBy !== 'subscribers';
  const clearFilters = () => { setSearch(''); setSortBy('subscribers'); };

  // ─── Profiles Query ───────────────────────────────────
  const profilesQuery = useQuery({
    queryKey: ['youtube-profiles', page, debouncedSearch, sortBy],
    queryFn: () => token ? scraperService.getYoutubeProfiles(token, {
      page, page_size: PAGE_SIZE, search: debouncedSearch || undefined, sort_by: sortBy,
    }) : Promise.reject('No token'),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const profiles = profilesQuery.data?.profiles || [];
  const totalPages = profilesQuery.data?.total_pages || 1;
  const total = profilesQuery.data?.count || 0;

  // ─── Mutations ────────────────────────────────────────
  const handleScrapeSuccess = (data: { message: string; is_scraping?: boolean; already_exists?: boolean; newly_scraped?: boolean; profile_id: number }, label?: string, before = 0) => {
    if (data.already_exists) {
      toast(data.message, { icon: '📋' });
      router.push(`/dashboard/externalChannels/youtube/${data.profile_id}`);
    } else if (data.newly_scraped) {
      toast.success(data.message);
      router.push(`/dashboard/externalChannels/youtube/${data.profile_id}`);
    } else {
      toast(data.message, { icon: '⏳' });
      startProfileScrapeNotif({
        label: label || channelId.trim(),
        before,
        fetchStatus: async () => {
          const d = await scraperService.getYoutubeProfileDetail(token!, data.profile_id);
          return { scraping_status: d.scraping_status, count: d.shorts_in_db };
        },
      });
    }
    setChannelId('');
    queryClient.invalidateQueries({ queryKey: ['youtube-profiles'] });
  };

  const scrapeMutation = useMutation({
    mutationFn: (raw: string) => {
      if (!token) throw new Error('No token');
      return scraperService.youtubeChannelScrape(token, raw);
    },
    onSuccess: (data) => handleScrapeSuccess(data, channelId.trim()),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field }: { id: number; field: 'is_bookmarked' | 'is_tracked' }) => {
      if (!token) throw new Error('No token');
      return scraperService.toggleYoutubeProfile(token, id, field);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['youtube-profiles'] }),
  });

  const rescrapeMutation = useMutation({
    mutationFn: (p: { id: number; channel_id: string }) => {
      if (!token) throw new Error('No token');
      return scraperService.youtubeChannelScrape(token, p.channel_id);
    },
    onSuccess: (data, vars) => {
      const before = profiles.find(pr => pr.id === vars.id)?.shorts_in_db ?? 0;
      handleScrapeSuccess(data, vars.channel_id, before);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Input channel_id — admin only */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xl">
              <input
                type="text"
                value={channelId}
                onChange={e => setChannelId(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && channelId.trim()) scrapeMutation.mutate(channelId.trim()); }}
                placeholder="Channel ID (UCxxxx...) hoặc link youtube.com/channel/UCxxxx"
                className="w-full pl-3 pr-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <button
              onClick={() => scrapeMutation.mutate(channelId.trim())}
              disabled={scrapeMutation.isPending || !channelId.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-sm hover:shadow-md transition-all"
            >
              {scrapeMutation.isPending ? (
                <CircleNotch size={16} weight="bold" className="animate-spin" />
              ) : (
                <MagnifyingGlassPlus size={16} weight="bold" />
              )}
              {scrapeMutation.isPending ? 'Đang gửi...' : 'Cào Channel'}
            </button>
          </div>
          <p className="text-xs text-slate-400">Chưa hỗ trợ resolve từ @handle — cần channel ID dạng UCxxxx...</p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 border border-border rounded-xl p-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên kênh..."
          className="flex-1 min-w-[180px] max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'subscribers' | 'recent')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="subscribers">Nhiều subscriber nhất</option>
          <option value="recent">Mới thêm gần đây</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50">
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Count */}
      <h2 className="text-sm font-semibold text-foreground">
        Kênh YouTube {total > 0 && <span className="font-normal text-slate-500">({total})</span>}
      </h2>

      {/* Loading */}
      {profilesQuery.isLoading && (
        <div className="flex justify-center py-12">
          <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
        </div>
      )}

      {/* Empty */}
      {!profilesQuery.isLoading && profiles.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
          <UserCircle size={40} className="text-slate-300" />
          <p className="text-sm text-foreground font-medium">Chưa có kênh nào</p>
          <p className="text-xs text-slate-400 text-center max-w-sm">Nhập channel ID ở trên để bắt đầu cào.</p>
        </div>
      )}

      {/* Grid */}
      {profiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map(p => (
            <YoutubeProfileCard
              key={p.id}
              profile={p}
              onScrape={isAdmin ? () => rescrapeMutation.mutate({ id: p.id, channel_id: p.channel_id }) : undefined}
              onToggleBookmark={() => toggleMutation.mutate({ id: p.id, field: 'is_bookmarked' })}
              onToggleTracked={() => toggleMutation.mutate({ id: p.id, field: 'is_tracked' })}
              onViewDetail={() => router.push(`/dashboard/externalChannels/youtube/${p.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">Trang {page}/{totalPages}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft size={12} /> Trước
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-slate-50 disabled:opacity-40">
              Sau <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
