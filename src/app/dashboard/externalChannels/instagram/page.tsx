'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleNotch, MagnifyingGlassPlus, UserCircle } from '@phosphor-icons/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import InstagramProfileCard from '../components/InstagramProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';

const PAGE_SIZE = 12;

export default function InstagramExternalPage() {
  const { token, user } = useAuthStore();
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;
  const queryClient = useQueryClient();
  const router = useRouter();

  // State
  const [profileUsername, setProfileUsername] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'followers' | 'recent'>('followers');
  const searchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // ─── Profiles Query ───────────────────────────────────
  const profilesQuery = useQuery({
    queryKey: ['instagram-profiles', page, debouncedSearch],
    queryFn: () => token ? scraperService.getInstagramProfiles(token, {
      page, page_size: PAGE_SIZE, search: debouncedSearch || undefined,
    }) : Promise.reject('No token'),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const profiles = profilesQuery.data?.profiles || [];
  const totalPages = profilesQuery.data?.total_pages || 1;
  const total = profilesQuery.data?.count || 0;

  // ─── Mutations ────────────────────────────────────────
  const handleScrapeSuccess = (data: { message: string; is_scraping?: boolean; already_exists?: boolean; profile_id: number }) => {
    if (data.already_exists) {
      toast(data.message, { icon: '📋' });
      router.push(`/dashboard/externalChannels/instagram/${data.profile_id}`);
    } else if (data.is_scraping) {
      toast(data.message, { icon: '⏳' });
    } else {
      toast.success(data.message);
    }
    setProfileUsername('');
    queryClient.invalidateQueries({ queryKey: ['instagram-profiles'] });
  };

  const scrapeMutation = useMutation({
    mutationFn: (username: string) => {
      if (!token) throw new Error('No token');
      return scraperService.instagramProfileScrape(token, username);
    },
    onSuccess: handleScrapeSuccess,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field }: { id: number; field: 'is_bookmarked' | 'is_tracked' }) => {
      if (!token) throw new Error('No token');
      return scraperService.toggleInstagramProfile(token, id, field);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instagram-profiles'] }),
  });

  const rescrapeMutation = useMutation({
    mutationFn: (p: { id: number; username: string }) => {
      if (!token) throw new Error('No token');
      return scraperService.instagramProfileScrape(token, p.username);
    },
    onSuccess: handleScrapeSuccess,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Input username — admin only */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xl">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500 text-sm font-semibold select-none">@</span>
              <input
                type="text"
                value={profileUsername}
                onChange={e => setProfileUsername(e.target.value.replace('@', ''))}
                onKeyDown={e => { if (e.key === 'Enter' && profileUsername.trim()) scrapeMutation.mutate(profileUsername.trim()); }}
                placeholder="Nhập Instagram username (vd: lanh_1403_)"
                className="w-full pl-8 pr-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <button
              onClick={() => scrapeMutation.mutate(profileUsername.trim())}
              disabled={scrapeMutation.isPending || !profileUsername.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-sm hover:shadow-md transition-all"
            >
              {scrapeMutation.isPending ? (
                <CircleNotch size={16} weight="bold" className="animate-spin" />
              ) : (
                <MagnifyingGlassPlus size={16} weight="bold" />
              )}
              {scrapeMutation.isPending ? 'Đang gửi...' : 'Cào Profile'}
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 border border-border rounded-xl p-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo username..."
          className="flex-1 min-w-[180px] max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'followers' | 'recent')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="followers">Nhiều followers nhất</option>
          <option value="recent">Mới thêm gần đây</option>
        </select>
      </div>

      {/* Count */}
      <h2 className="text-sm font-semibold text-foreground">
        Profiles {total > 0 && <span className="font-normal text-slate-500">({total})</span>}
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
          <p className="text-sm text-foreground font-medium">Chưa có profile nào</p>
          <p className="text-xs text-slate-400 text-center max-w-sm">Nhập Instagram username ở trên để bắt đầu cào.</p>
        </div>
      )}

      {/* Grid */}
      {profiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map(p => (
            <InstagramProfileCard
              key={p.id}
              profile={p}
              onScrape={isAdmin ? () => rescrapeMutation.mutate({ id: p.id, username: p.username }) : undefined}
              onToggleBookmark={() => toggleMutation.mutate({ id: p.id, field: 'is_bookmarked' })}
              onToggleTracked={() => toggleMutation.mutate({ id: p.id, field: 'is_tracked' })}
              onViewDetail={() => router.push(`/dashboard/externalChannels/instagram/${p.id}`)}
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
