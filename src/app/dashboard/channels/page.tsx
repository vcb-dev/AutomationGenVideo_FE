'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import PageTableRow from './PageTableRow';
import { useAuthStore } from '@/store/auth-store';
import { FacebookPage, PaginatedPages, PageFilters } from '@/types/facebook';
import { facebookService } from '@/services/facebookService';

export default function ChannelsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const autoSyncDone = useRef(false);

  // Data
  const [data, setData] = useState<PaginatedPages | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [minFollowers, setMinFollowers] = useState('');
  const [minLikes, setMinLikes] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search
  const searchTimerRef = useRef<NodeJS.Timeout>();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  // Fetch pages
  const fetchPages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const filters: PageFilters = {
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        status: status || undefined,
        min_followers: minFollowers ? Number(minFollowers) : undefined,
        min_likes: minLikes ? Number(minLikes) : undefined,
      };
      const result = await facebookService.getPages(token, filters);

      // Auto-import nếu DB trống lần đầu
      if (result.count === 0 && !autoSyncDone.current && !debouncedSearch && !status) {
        autoSyncDone.current = true;
        setSyncing(true);
        const synced = await facebookService.syncAndGetPages(token);
        if (synced.length > 0) toast.success(`Đã tìm thấy ${synced.length} kênh Facebook!`);
        setSyncing(false);
        // Re-fetch after import
        const freshResult = await facebookService.getPages(token, filters);
        setData(freshResult);
      } else {
        setData(result);
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi tải danh sách kênh');
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch, status, minFollowers, minLikes]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  // Handlers
  // const handleSyncPages = async () => {
  //   if (!token) return;
  //   setSyncing(true);
  //   try {
  //     await facebookService.syncAndGetPages(token);
  //     toast.success('Đã cập nhật danh sách kênh!');
  //     fetchPages();
  //   } catch (e: any) {
  //     toast.error(e.message);
  //   } finally { setSyncing(false); }
  // };

  const handleViewVideos = (pg: FacebookPage) => {
    router.push(`/dashboard/channels/${pg.page_id}/videos`);
  };

  const handleTriggerScrape = async (pg: FacebookPage) => {
    if (!token) return;
    try {
      const res = await facebookService.triggerScrape(token, pg.page_id);
      toast.success(res.message);
      pollUntilDone(pg.page_id);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleBackfill = async (pg: FacebookPage) => {
    if (!token) return;
    try {
      const res = await facebookService.triggerBackfill(token, pg.page_id);
      toast.success(res.message);
      pollUntilDone(pg.page_id);
    } catch (e: any) { toast.error(e.message); }
  };

  const pollUntilDone = (pageId: string) => {
    setData(prev => prev ? {
      ...prev,
      pages: prev.pages.map(p => p.page_id === pageId ? { ...p, is_scraping: true } : p)
    } : prev);

    const interval = setInterval(async () => {
      if (!token) return;
      try {
        // Fetch ALL pages (không phân trang) để luôn tìm được target dù nó ở trang nào
        const all = await facebookService.getPages(token, { page: 1, page_size: 1000 });
        const target = all.pages.find(p => p.page_id === pageId);
        if (target && !target.is_scraping) {
          clearInterval(interval);
          // Re-fetch trang hiện tại để cập nhật UI đúng
          fetchPages();
          toast.success(`Cào xong ${target.name}: ${target.video_count || 0} video`);
        }
      } catch { clearInterval(interval); }
    }, 5000);
    setTimeout(() => clearInterval(interval), 300_000);
  };

  const pages = data?.pages || [];
  const totalPages = data?.total_pages || 1;
  const totalCount = data?.count || 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kênh Facebook</h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} kênh</p>
        </div>
        {/* <button
          onClick={handleSyncPages}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {syncing ? 'Đang đồng bộ...' : 'Thêm kênh'}
        </button> */}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên kênh..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={e => { setStatus(e.target.value as any); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Min Followers */}
        <input
          type="number"
          placeholder="Min followers"
          value={minFollowers}
          onChange={e => { setMinFollowers(e.target.value); setPage(1); }}
          className="w-32 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />

        {/* Min Likes */}
        <input
          type="number"
          placeholder="Min likes"
          value={minLikes}
          onChange={e => { setMinLikes(e.target.value); setPage(1); }}
          className="w-32 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Table */}
      {loading || syncing ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">{syncing ? 'Đang đồng bộ...' : 'Đang tải...'}</p>
        </div>
      ) : pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-xl border border-slate-200">
          <h3 className="text-base font-semibold text-slate-700">
            {debouncedSearch || status ? 'Không tìm thấy kết quả' : 'Chưa có kênh nào'}
          </h3>
          <p className="text-sm text-slate-400 text-center max-w-sm">
            {debouncedSearch || status
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
              : 'Bấm "Thêm kênh" để import từ Facebook.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span className="w-10"></span>
              <span>Kênh</span>
              <span className="w-28 text-center">Followers</span>
              <span className="w-20 text-center">Likes</span>
              <span className="w-28 text-center">Trạng thái</span>
              <span className="w-48 text-center">Hành động</span>
            </div>

            <div className="divide-y divide-slate-100">
              {pages.map(p => (
                <PageTableRow
                  key={p.page_id}
                  page={p}
                  onViewVideos={handleViewVideos}
                  onTriggerScrape={handleTriggerScrape}
                  onBackfill={handleBackfill}
                  loadingVideos={false}
                  selectedPageId={undefined}
                />
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Trang {page}/{totalPages} ({totalCount} kênh)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sau <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
