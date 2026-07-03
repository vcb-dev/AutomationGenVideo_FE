'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Loader2, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';

type Platform = 'tiktok' | 'instagram' | 'douyin' | 'xiaohongshu';

const PLATFORM_CONFIG: Record<Platform, {
  inputLabel: string;
  inputPlaceholder: string;
  detailPath: (id: number) => string;
}> = {
  tiktok: {
    inputLabel: 'TikTok username',
    inputPlaceholder: '@mixigaming hoặc mixigaming',
    detailPath: (id) => `/dashboard/externalChannels/tiktok/${id}`,
  },
  instagram: {
    inputLabel: 'Instagram username',
    inputPlaceholder: 'lanh_1403_',
    detailPath: (id) => `/dashboard/externalChannels/instagram/${id}`,
  },
  douyin: {
    inputLabel: 'Douyin sec_user_id',
    inputPlaceholder: 'MS4wLjABAAAA...',
    detailPath: (id) => `/dashboard/externalChannels/douyin/${id}`,
  },
  xiaohongshu: {
    inputLabel: 'Xiaohongshu user_id',
    inputPlaceholder: '61b46d790000000010008153',
    detailPath: (id) => `/dashboard/externalChannels/xiaohongshu/${id}`,
  },
};

function getProfileName(p: any) {
  return p.nickname || p.username || p.full_name || p.user_id || '—';
}
function getProfileSub(p: any) {
  if (p.username) return `@${p.username}`;
  if (p.sec_user_id) return p.sec_user_id.slice(0, 20) + '…';
  return p.user_id || '';
}
function getVideosCount(p: any) {
  return p.videos_in_db ?? p.reels_in_db ?? p.videos_count ?? 0;
}
function getFollowers(p: any) {
  return p.followers_count ?? 0;
}

export default function OwnedChannelList({ platform }: { platform: Platform }) {
  const { token } = useAuthStore();
  const config = PLATFORM_CONFIG[platform];

  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newId, setNewId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const timerRef = useRef<NodeJS.Timeout>();
  useEffect(() => {
    timerRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  const fetchProfiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const baseParams = { is_owned: true, page, page_size: pageSize };
      let result: any;

      if (platform === 'tiktok') {
        result = await scraperService.getTiktokProfiles(token, { ...baseParams, search: debouncedSearch || undefined });
      } else if (platform === 'instagram') {
        result = await scraperService.getInstagramProfiles(token, { ...baseParams, search: debouncedSearch || undefined });
      } else if (platform === 'douyin') {
        result = await scraperService.getDouyinProfiles(token, { ...baseParams, search: debouncedSearch || undefined });
      } else {
        result = await scraperService.getXhsProfiles(token, { ...baseParams, q: debouncedSearch || undefined });
      }

      setProfiles(result.profiles);
      setTotal(result.count);
    } catch (e: any) {
      toast.error(e.message || 'Lỗi tải danh sách kênh');
    } finally {
      setLoading(false);
    }
  }, [token, platform, debouncedSearch, page]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  useEffect(() => {
    const scraping = profiles.some(p => p.scraping_status === 'processing');
    if (!scraping) return;
    const interval = setInterval(fetchProfiles, 8000);
    return () => clearInterval(interval);
  }, [profiles, fetchProfiles]);

  const handleAdd = async () => {
    if (!token || !newId.trim()) return;
    setSubmitting(true);
    try {
      if (platform === 'tiktok') {
        await scraperService.tiktokProfileScrape(token, newId.trim(), true);
      } else if (platform === 'instagram') {
        await scraperService.instagramProfileScrape(token, newId.trim(), true);
      } else if (platform === 'douyin') {
        await scraperService.douyinProfileScrape(token, newId.trim(), 600, true);
      } else {
        await scraperService.xhsProfileScrape(token, newId.trim(), 600, true);
      }
      toast.success('Đang cào kênh, vui lòng đợi...');
      setNewId('');
      setAdding(false);
      fetchProfiles();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi thêm kênh');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Actions row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{total} kênh nội bộ</p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={15} /> Thêm kênh
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="flex items-end gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex-1">
            <label className="block text-xs font-medium text-blue-700 mb-1.5">
              {config.inputLabel}
            </label>
            <input
              type="text"
              placeholder={config.inputPlaceholder}
              value={newId}
              onChange={e => setNewId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newId.trim() || submitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Thêm
          </button>
          <button
            onClick={() => { setAdding(false); setNewId(''); }}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm theo tên..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-700">
            {debouncedSearch ? 'Không tìm thấy kết quả' : 'Chưa có kênh nội bộ'}
          </p>
          <p className="text-sm text-slate-400 text-center max-w-xs">
            {debouncedSearch
              ? 'Thử thay đổi từ khóa tìm kiếm.'
              : 'Bấm "Thêm kênh" để bắt đầu theo dõi.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {profiles.map((p: any) => (
              <Link
                key={p.id}
                href={config.detailPath(p.id)}
                className="group flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <img
                  src={p.avatar_url || ''}
                  alt={getProfileName(p)}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  className="w-12 h-12 rounded-full object-cover bg-slate-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {getProfileName(p)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{getProfileSub(p)}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {getFollowers(p) > 0 && (
                      <span className="text-xs text-slate-600">
                        {getFollowers(p).toLocaleString()} followers
                      </span>
                    )}
                    <span className="text-xs text-slate-600">{getVideosCount(p)} videos</span>
                  </div>
                </div>
                {p.scraping_status === 'processing' && (
                  <Loader2 size={14} className="animate-spin text-blue-500 flex-shrink-0" />
                )}
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Trang {page}/{totalPages} ({total} kênh)
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
