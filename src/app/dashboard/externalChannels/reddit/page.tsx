'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowsClockwise,
  CircleNotch,
  Database,
  Flame,
  MagnifyingGlass,
  RedditLogo,
  Trash,
  UsersThree,
  X,
} from '@phosphor-icons/react';

import FilterSelect from '../components/FilterSelect';
import ConfirmModal from '../components/ConfirmModal';
import RedditPostCard from '../components/RedditPostCard';
import { useAuthStore } from '@/store/auth-store';
import {
  scraperService,
  type RedditPost,
  type RedditScrapeOptions,
  type RedditSort,
  type RedditSubreddit,
  type RedditTimeRange,
} from '@/services/scraperService';
import {
  REDDIT_MEDIA_LABELS,
  REDDIT_SEARCH_SORT_OPTIONS,
  REDDIT_SUBREDDIT_SORT_OPTIONS,
  REDDIT_TIME_OPTIONS,
  SUBREDDITS_PER_PAGE,
  canScrapeReddit,
  clampPage,
  filterRedditPostsByMedia,
  formatRedditCount,
  normalizeSubredditInput,
  parseScrapeCount,
} from '@/lib/scrape/reddit-helpers';
import { NumberedPagination } from '@/components/ui/NumberedPagination';

const POSTS_PAGE_SIZE = 24;
const MAX_COUNT = 1000;

const REPO_SORT_OPTIONS = [
  { value: 'score', label: 'Điểm cao nhất' },
  { value: 'comments', label: 'Nhiều bình luận' },
  { value: 'date', label: 'Mới đăng nhất' },
];

const MEDIA_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Mọi loại bài' },
  ...Object.entries(REDDIT_MEDIA_LABELS).map(([value, label]) => ({ value, label })),
];

export default function RedditExternalPage() {
  const { token, user } = useAuthStore();
  const queryClient = useQueryClient();
  const canScrape = canScrapeReddit(user?.roles);

  // ─── Tìm theo từ khoá ──────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [searchSort, setSearchSort] = useState<RedditSort>('TOP');
  const [searchTime, setSearchTime] = useState<RedditTimeRange>('month');
  const [searchCount, setSearchCount] = useState('25');

  // ─── Cào theo cộng đồng ────────────────────────────────────────────────────
  const [subredditInput, setSubredditInput] = useState('');
  const [subSort, setSubSort] = useState<RedditSort>('HOT');
  const [subTime, setSubTime] = useState<RedditTimeRange>('week');
  const [subCount, setSubCount] = useState('25');

  // ─── Khu bài ───────────────────────────────────────────────────────────────
  const [view, setView] = useState<'results' | 'repo'>('repo');
  const [results, setResults] = useState<{ label: string; posts: RedditPost[] } | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [debouncedRepoSearch, setDebouncedRepoSearch] = useState('');
  const [repoSubreddit, setRepoSubreddit] = useState('');
  const [mediaFilter, setMediaFilter] = useState('ALL');
  const [repoSort, setRepoSort] = useState('score');
  const [repoPage, setRepoPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<RedditSubreddit | null>(null);
  const [subredditPage, setSubredditPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedRepoSearch(repoSearch.trim());
      setRepoPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [repoSearch]);

  const { data: subredditsData, isLoading: loadingSubreddits } = useQuery({
    queryKey: ['reddit-subreddits', subredditPage],
    queryFn: () => scraperService.getRedditSubreddits(token!, { page: subredditPage, limit: SUBREDDITS_PER_PAGE }),
    enabled: !!token,
  });

  const { data: repoData, isLoading: loadingRepo } = useQuery({
    queryKey: ['reddit-posts', debouncedRepoSearch, repoSubreddit, mediaFilter, repoSort, repoPage],
    queryFn: () =>
      scraperService.getRedditPosts(token!, {
        search: debouncedRepoSearch || undefined,
        subreddit: repoSubreddit || undefined,
        media_type: mediaFilter !== 'ALL' ? mediaFilter : undefined,
        sort_by: repoSort,
        page: repoPage,
        limit: POSTS_PAGE_SIZE,
      }),
    enabled: !!token,
  });

  const afterScrape = (label: string, posts: RedditPost[]) => {
    setResults({ label, posts });
    setView('results');
    queryClient.invalidateQueries({ queryKey: ['reddit-posts'] });
    queryClient.invalidateQueries({ queryKey: ['reddit-subreddits'] });
  };

  const searchMutation = useMutation({
    mutationFn: ({ q, options }: { q: string; options: RedditScrapeOptions }) =>
      scraperService.searchRedditPosts(token!, q, options),
    onSuccess: (data) => {
      afterScrape(`từ khoá "${data.query}"`, data.posts);
      if (data.posts.length > 0) toast.success(`Đã lấy ${data.posts.length} bài Reddit và lưu vào kho!`);
      else toast.error('Không tìm thấy bài nào');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const subredditMutation = useMutation({
    mutationFn: ({ name, options }: { name: string; options: RedditScrapeOptions }) =>
      scraperService.scrapeRedditSubreddit(token!, name, options),
    onSuccess: (data) => {
      afterScrape(data.subreddit.display_name, data.posts);
      setSubredditInput('');
      // Cộng đồng vừa cào xếp đầu danh sách (mới cào nhất trước) → về trang 1 để thấy nó.
      setSubredditPage(1);
      toast.success(`Đã cào ${data.posts.length} bài của ${data.subreddit.display_name}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => scraperService.deleteRedditSubreddit(token!, id),
    onSuccess: (data) => {
      toast.success(`Đã xoá ${data.name} (${data.videos_deleted} bài)`);
      setDeleteTarget(null);
      if (repoSubreddit) setRepoSubreddit('');
      setSubredditPage((page) => clampPage(page, (subredditsData?.total ?? 1) - 1));
      queryClient.invalidateQueries({ queryKey: ['reddit-subreddits'] });
      queryClient.invalidateQueries({ queryKey: ['reddit-posts'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isScraping = searchMutation.isPending || subredditMutation.isPending;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const count = parseScrapeCount(searchCount, MAX_COUNT);
    if (!q) return toast.error('Vui lòng nhập từ khoá');
    if (!count) return toast.error('Số bài phải là số nguyên dương');
    searchMutation.mutate({ q, options: { sort: searchSort, time_range: searchTime, count } });
  };

  const scrapeSubreddit = (raw: string) => {
    const name = normalizeSubredditInput(raw);
    const count = parseScrapeCount(subCount, MAX_COUNT);
    if (!name) return toast.error('Nhập r/tên hoặc dán link reddit.com/r/tên');
    if (!count) return toast.error('Số bài phải là số nguyên dương');
    subredditMutation.mutate({ name, options: { sort: subSort, time_range: subTime, count } });
  };

  const showSubredditPosts = (name: string) => {
    setRepoSubreddit(name);
    setRepoPage(1);
    setView('repo');
  };

  const subreddits = subredditsData?.items ?? [];
  const posts = view === 'results' ? results?.posts ?? [] : repoData?.items ?? [];
  const visiblePosts = view === 'results' ? filterRedditPostsByMedia(posts, mediaFilter) : posts;

  const inputClass =
    'w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';
  const buttonClass =
    'flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0';

  return (
    <div className="flex flex-col gap-5">
      {!canScrape && (
        <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg px-3 py-2">
          Tìm / cào bài Reddit tính phí theo lượt gọi nên chỉ Admin và Leader thực hiện được. Bạn vẫn xem được kho bài đã lưu.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tìm theo từ khoá */}
        <form onSubmit={handleSearch} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={18} className="text-orange-500" />
            <h2 className="text-sm font-semibold text-foreground">Tìm bài theo từ khoá</h2>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Từ khoá tiếng Anh (vd: engagement ring, gold necklace)..."
            className={inputClass}
          />
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect value={searchSort} onChange={(v) => setSearchSort(v as RedditSort)} options={REDDIT_SEARCH_SORT_OPTIONS} title="Sắp xếp" />
            <FilterSelect value={searchTime} onChange={(v) => setSearchTime(v as RedditTimeRange)} options={REDDIT_TIME_OPTIONS} title="Khoảng thời gian" />
            <input
              type="number"
              min={1}
              max={MAX_COUNT}
              value={searchCount}
              onChange={(e) => setSearchCount(e.target.value)}
              title="Số bài muốn lấy"
              className="w-24 px-3 py-2 text-sm bg-background border border-border rounded-lg"
            />
            <button type="submit" disabled={!canScrape || isScraping || !query.trim()} className={buttonClass}>
              {searchMutation.isPending ? <CircleNotch size={16} className="animate-spin" /> : <Flame size={16} weight="fill" />}
              Tìm bài
            </button>
          </div>
        </form>

        {/* Cào theo cộng đồng */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            scrapeSubreddit(subredditInput);
          }}
          className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <UsersThree size={18} className="text-orange-500" />
            <h2 className="text-sm font-semibold text-foreground">Cào theo cộng đồng (subreddit)</h2>
          </div>
          <input
            value={subredditInput}
            onChange={(e) => setSubredditInput(e.target.value)}
            placeholder="r/jewelry hoặc dán link reddit.com/r/jewelry"
            className={inputClass}
          />
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect value={subSort} onChange={(v) => setSubSort(v as RedditSort)} options={REDDIT_SUBREDDIT_SORT_OPTIONS} title="Sắp xếp" />
            <FilterSelect value={subTime} onChange={(v) => setSubTime(v as RedditTimeRange)} options={REDDIT_TIME_OPTIONS} title="Khoảng thời gian" />
            <input
              type="number"
              min={1}
              max={MAX_COUNT}
              value={subCount}
              onChange={(e) => setSubCount(e.target.value)}
              title="Số bài muốn lấy"
              className="w-24 px-3 py-2 text-sm bg-background border border-border rounded-lg"
            />
            <button type="submit" disabled={!canScrape || isScraping || !subredditInput.trim()} className={buttonClass}>
              {subredditMutation.isPending ? <CircleNotch size={16} className="animate-spin" /> : <RedditLogo size={16} weight="fill" />}
              Cào cộng đồng
            </button>
          </div>
        </form>
      </div>

      {/* Cộng đồng đã lưu */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3">Cộng đồng đã lưu ({subredditsData?.total ?? 0})</h2>
        {loadingSubreddits ? (
          <CircleNotch size={18} className="animate-spin text-slate-400" />
        ) : subreddits.length === 0 ? (
          <p className="text-xs text-slate-500">Chưa có cộng đồng nào — cào một subreddit ở trên để lưu vào đây.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {subreddits.map((s) => (
              <div key={s.id} className="flex items-center gap-3 border border-border rounded-lg p-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                  {s.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.icon_url} alt={s.display_name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <RedditLogo size={22} weight="fill" className="text-orange-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => showSubredditPosts(s.name)}
                    className="text-sm font-semibold text-foreground hover:text-primary truncate block"
                    title="Xem bài của cộng đồng này trong kho"
                  >
                    {s.display_name}
                  </button>
                  <p className="text-[11px] text-slate-500 truncate">
                    {formatRedditCount(s.subscribers_count)} thành viên · {s.posts_count} bài trong kho
                    {s.last_scraped_at ? ` · cào ${new Date(s.last_scraped_at).toLocaleDateString('vi-VN')}` : ''}
                  </p>
                </div>
                {canScrape && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => scrapeSubreddit(s.name)}
                      disabled={isScraping}
                      title="Cào lại theo sắp xếp / khoảng thời gian / số bài ở ô cộng đồng"
                      className="p-1.5 rounded-md text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      <ArrowsClockwise size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(s)}
                      title="Xoá cộng đồng"
                      className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <NumberedPagination
            page={subredditPage}
            totalPages={subredditsData?.total_pages ?? 1}
            onPageChange={setSubredditPage}
          />
        </div>
      </div>

      {/* Bài viết */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl p-3 shadow-sm">
          <button
            type="button"
            onClick={() => setView('repo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${view === 'repo' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
          >
            <Database size={14} /> Kho bài đã lưu ({repoData?.total ?? 0})
          </button>
          {results && (
            <button
              type="button"
              onClick={() => setView('results')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${view === 'results' ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
            >
              <Flame size={14} /> Vừa quét theo {results.label} ({results.posts.length})
            </button>
          )}

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {view === 'repo' && repoSubreddit && (
              <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-semibold rounded-lg bg-orange-500/10 text-orange-600 border border-orange-500/20">
                r/{repoSubreddit}
                <button type="button" onClick={() => setRepoSubreddit('')} title="Bỏ lọc cộng đồng" className="p-0.5 rounded hover:bg-orange-500/20">
                  <X size={12} />
                </button>
              </span>
            )}
            {view === 'repo' && (
              <input
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Tìm trong kho..."
                className="w-44 px-3 py-1.5 text-xs bg-background border border-border rounded-lg"
              />
            )}
            <FilterSelect value={mediaFilter} onChange={(v) => { setMediaFilter(v); setRepoPage(1); }} options={MEDIA_FILTER_OPTIONS} title="Loại bài" />
            {view === 'repo' && (
              <FilterSelect value={repoSort} onChange={(v) => { setRepoSort(v); setRepoPage(1); }} options={REPO_SORT_OPTIONS} title="Sắp xếp kho" />
            )}
          </div>
        </div>

        {view === 'repo' && loadingRepo ? (
          <div className="flex justify-center py-10">
            <CircleNotch size={24} className="animate-spin text-slate-400" />
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl py-12 text-center text-sm text-slate-500">
            {view === 'repo' ? 'Kho chưa có bài phù hợp — tìm theo từ khoá hoặc cào một cộng đồng ở trên.' : 'Không có bài phù hợp bộ lọc.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {visiblePosts.map((p) => (
              <RedditPostCard key={p.post_id} post={p} onSubredditClick={showSubredditPosts} />
            ))}
          </div>
        )}

        {view === 'repo' && (repoData?.total_pages ?? 1) > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Trang {repoPage} / {repoData!.total_pages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={repoPage <= 1} onClick={() => setRepoPage((p) => p - 1)} className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40">
                Trang trước
              </button>
              <button type="button" disabled={repoPage >= repoData!.total_pages} onClick={() => setRepoPage((p) => p + 1)} className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40">
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={`Xoá ${deleteTarget?.display_name ?? ''}?`}
        description={`Xoá cộng đồng khỏi danh sách cùng ${deleteTarget?.posts_count ?? 0} bài đã cào theo cộng đồng này. Bài tìm theo từ khoá vẫn giữ.`}
        confirmText="Xoá"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
