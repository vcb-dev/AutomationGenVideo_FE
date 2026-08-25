import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Heart, MessageCircle, Share2, Eye, Loader2, VideoOff, Play, Volume2, VolumeX, Trash2, Sparkles, Shuffle, BookmarkCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';
import { fetchFeedPage, type FeedVideo } from '@/lib/feed-source';
import { planPlayback } from '@/lib/video-playback';
import { dedupeById } from '@/lib/dedupe-pages';
import { fetchWithAuth } from '@/lib/api-client';
import { scraperService } from '@/services/scraperService';
import { useSubmitVideoToLibrary } from '@/hooks/useProposeVideo';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

function compact(n: number): string {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

/**
 * Một video chiếm trọn màn hình.
 *
 * `active` = đang là video người dùng nhìn thấy. Chỉ video active mới được phát, và chỉ
 * video active + video kế tiếp mới được gắn `src` — nếu gắn hết thì trình duyệt tải song song
 * hàng chục video, tốn băng thông và giật.
 */
function Slide({
    video,
    active,
    shouldLoad,
    nearby,
    token,
    tatTieng,
    setTatTieng,
    hoiLyDo,
    lyDoChung,
    onPropose,
    isProposed,
    onDelete,
}: {
    video: FeedVideo;
    active: boolean;
    shouldLoad: boolean;
    /** false = khung ở xa, chỉ vẽ ảnh bìa cho nhẹ. */
    nearby: boolean;
    /** Đi kèm vào URL phát — thẻ <video> không gửi được header Authorization. */
    token: string;
    tatTieng: boolean;
    setTatTieng: (v: (prev: boolean) => boolean) => void;
    hoiLyDo: () => void;
    lyDoChung: string;
    onPropose?: (video: FeedVideo) => void;
    isProposed?: boolean;
    onDelete?: (video: FeedVideo) => void;
}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [failed, setFailed] = useState(false);
    const [dangTai, setDangTai] = useState(false);
    const [tamDung, setTamDung] = useState(false);
    const plan = useMemo(
        () => planPlayback(video.platform, video.videoId, video.url, API_URL, token),
        [video.platform, video.videoId, video.url, token],
    );

    const tuPhat = useCallback(() => {
        const el = videoRef.current;
        if (!el) return;
        el.muted = tatTieng;
        el.play().then(() => setTamDung(false)).catch(() => {
            if (el.muted) return;
            el.muted = true;
            setTatTieng(() => true);
            el.play().then(() => setTamDung(false)).catch(() => {});
        });
    }, [tatTieng, setTatTieng]);

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        if (active && shouldLoad) tuPhat();
        else { el.pause(); setTamDung(false); }
    }, [active, shouldLoad, tuPhat]);

    const ganVideo = useCallback((el: HTMLVideoElement | null) => {
        if (!el) videoRef.current?.pause();
        videoRef.current = el;
    }, []);

    const doiTrangThai = useCallback(() => {
        const el = videoRef.current;
        if (!el) return;
        if (el.paused) {
            el.play().then(() => setTamDung(false)).catch(() => {});
        } else {
            el.pause();
            setTamDung(true);
        }
    }, []);

    return (
        <section className="relative flex h-full w-full snap-start snap-always items-center justify-center bg-black">
            <div className="relative flex h-full w-full max-w-[480px] items-center justify-center overflow-hidden bg-slate-950">
            {nearby && plan.mode === 'proxy' && (
                <>
                    <video
                        ref={ganVideo}
                        src={shouldLoad ? plan.src : undefined}
                        poster={video.thumbnail}
                        playsInline
                        loop
                        preload={shouldLoad ? 'auto' : 'none'}
                        onClick={doiTrangThai}
                        onError={() => {
                            setDangTai(false);
                            setFailed(true);
                            hoiLyDo();
                        }}
                        onLoadStart={() => setDangTai(true)}
                        onWaiting={() => setDangTai(true)}
                        onPlaying={() => setDangTai(false)}
                        onCanPlay={() => {
                            setDangTai(false);
                            if (active) tuPhat();
                        }}
                        className={`h-full w-full cursor-pointer object-contain ${failed ? 'hidden' : ''}`}
                    />

                    {active && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setTatTieng((prev) => !prev);
                            }}
                            className="absolute right-4 top-20 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-all hover:bg-black/80 hover:scale-110 active:scale-95 shadow-lg"
                            title={tatTieng ? 'Bật tiếng' : 'Tắt tiếng'}
                        >
                            {tatTieng ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                        </button>
                    )}
                </>
            )}

            {/* Trạng thái tạm dừng */}
            {nearby && active && tamDung && !dangTai && !failed && (
                <button
                    type="button"
                    onClick={doiTrangThai}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25"
                    aria-label="Tiếp tục phát"
                >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
                        <Play className="ml-1 h-8 w-8" />
                    </div>
                </button>
            )}

            {/* Báo đang tải */}
            {nearby && active && plan.mode === 'proxy' && !failed && shouldLoad && dangTai && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45">
                    <Loader2 className="h-8 w-8 animate-spin text-white/90" />
                    <p className="text-xs text-white/80">Đang tải video...</p>
                </div>
            )}

            {nearby && plan.mode === 'embed' && shouldLoad && (
                <iframe
                    src={plan.src}
                    className="h-full w-full border-0"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    title={video.title || video.videoId}
                />
            )}

            {nearby && (plan.mode === 'unsupported' || failed) && (
                <div className="flex flex-col items-center gap-3 px-8 text-center">
                    {video.thumbnail && (
                        <img src={video.thumbnail} alt="" className="max-h-[45vh] rounded-xl object-contain opacity-60" />
                    )}
                    <VideoOff className="h-8 w-8 text-slate-500" />
                    <p className="max-w-md text-sm text-slate-300">
                        {lyDoChung || (failed ? 'Không phát được video này.' : plan.reason)}
                    </p>
                    <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                    >
                        <ExternalLink className="h-4 w-4" /> Mở trên nền tảng gốc
                    </a>
                </div>
            )}

            {/* Thanh tác vụ nhanh bên phải (Đề xuất vào kho, Xoá video) */}
            {nearby && (
                <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center gap-3">
                    {/* Nút Đề xuất vào Kho Video */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPropose?.(video);
                        }}
                        title="Đề xuất vào Kho Video"
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-full backdrop-blur-md transition-all shadow-xl active:scale-95 ${
                            isProposed
                                ? 'bg-emerald-600 text-white'
                                : 'bg-black/60 text-white hover:bg-violet-600 hover:scale-110'
                        }`}
                    >
                        {isProposed ? <BookmarkCheck className="h-5 w-5" /> : <Sparkles className="h-5 w-5 text-amber-300" />}
                        <span className="text-[10px] font-semibold">{isProposed ? 'Đã thêm' : 'Đề xuất'}</span>
                    </button>

                    {/* Nút Xoá video */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(video);
                        }}
                        title="Xoá video này"
                        className="flex flex-col items-center gap-1 p-2.5 rounded-full bg-black/60 text-white hover:bg-rose-600 hover:scale-110 active:scale-95 backdrop-blur-md transition-all shadow-xl"
                    >
                        <Trash2 className="h-5 w-5 text-rose-400" />
                        <span className="text-[10px] font-semibold">Xoá</span>
                    </button>
                </div>
            )}

            {/* Thông tin đè lên video */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-14">
                <div className="pr-14">
                    <p className="text-sm font-bold text-white tracking-wide">{video.authorName || 'Không rõ kênh'}</p>
                    {video.title && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-200 leading-relaxed">{video.title}</p>
                    )}
                    <div className="mt-2.5 flex items-center gap-3.5 text-xs text-slate-300">
                        {video.views > 0 && (
                            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-slate-400" />{compact(video.views)}</span>
                        )}
                        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-400" />{compact(video.likes)}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 text-sky-400" />{compact(video.comments)}</span>
                        {video.shares > 0 && (
                            <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5 text-amber-400" />{compact(video.shares)}</span>
                        )}
                        <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pointer-events-auto ml-auto flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 hover:bg-white/20"
                        >
                            <ExternalLink className="h-3.5 w-3.5" /> Gốc
                        </a>
                    </div>
                </div>
            </div>
            </div>
        </section>
    );
}

function WatchInner() {
    const params = useSearchParams();
    const router = useRouter();
    const { token, isAuthenticated } = useAuthStore();
    const { submit: submitToLibrary } = useSubmitVideoToLibrary();

    const platform = (params?.get('platform') || 'douyin').toLowerCase();
    const startId = params?.get('start') || '';

    const containerRef = useRef<HTMLDivElement | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [tatTieng, setTatTieng] = useState(true);

    const [isShuffled, setIsShuffled] = useState(true);
    const [shuffleSeed, setShuffleSeed] = useState(1);
    const [proposedIds, setProposedIds] = useState<Set<string>>(new Set());

    const [lyDoChung, setLyDoChung] = useState('');
    const daHoiLyDo = useRef(false);
    const hoiLyDo = useCallback(() => {
        if (daHoiLyDo.current) return;
        daHoiLyDo.current = true;
        fetchWithAuth(`${API_URL}/scraper/stream/trang-thai`)
            .then((r) => (r.status === 402 ? r.json() : null))
            .then((j) => { if (j?.message) setLyDoChung(j.message); })
            .catch(() => {});
    }, []);

    const query = useInfiniteQuery({
        queryKey: ['watch-feed', platform],
        initialPageParam: 1,
        queryFn: ({ pageParam }) => fetchFeedPage(platform, token || '', pageParam as number),
        getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
        enabled: isAuthenticated,
    });

    const rawVideos = useMemo(
        () => dedupeById(query.data?.pages.flatMap((p) => p.videos) || []),
        [query.data],
    );

    const [shuffledVideos, setShuffledVideos] = useState<FeedVideo[]>([]);

    useEffect(() => {
        if (!rawVideos.length) {
            setShuffledVideos([]);
            return;
        }
        if (isShuffled) {
            const arr = [...rawVideos];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            setShuffledVideos(arr);
        } else {
            setShuffledVideos(rawVideos);
        }
    }, [rawVideos, isShuffled, shuffleSeed]);

    const videos = shuffledVideos.length > 0 ? shuffledVideos : rawVideos;

    // Nhảy tới đúng video người dùng bấm từ trang khám phá
    const jumpedRef = useRef(false);
    useEffect(() => {
        if (jumpedRef.current || !startId || !videos.length) return;
        const idx = videos.findIndex((v) => v.videoId === startId);
        if (idx < 0) return;
        jumpedRef.current = true;
        setActiveIndex(idx);
        requestAnimationFrame(() => {
            containerRef.current?.children[idx]?.scrollIntoView({ block: 'start' });
        });
    }, [startId, videos]);

    // Xử lý Đề xuất video vào Kho video
    const handlePropose = async (v: FeedVideo) => {
        if (proposedIds.has(v.videoId)) {
            toast('Video này đã được đề xuất', { icon: 'ℹ️' });
            return;
        }
        try {
            await submitToLibrary({
                platform: v.platform,
                video_url: v.url,
                video_id: v.videoId,
                title: v.title || `${v.platform} - ${v.authorName}`,
                author_name: v.authorName,
                author_username: v.authorName,
                thumbnail_url: v.thumbnail || '',
                views_count: v.views,
                likes_count: v.likes,
                comments_count: v.comments,
                shares_count: v.shares,
                source: 'SCRAPED',
            });
            setProposedIds((prev) => new Set(prev).add(v.videoId));
            toast.success('Đã đề xuất video vào Kho Video!');
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi đề xuất video');
        }
    };

    // Xử lý Xoá video khỏi cơ sở dữ liệu
    const handleDelete = async (v: FeedVideo) => {
        if (!token) return;
        const confirmDelete = window.confirm(`Bạn có chắc muốn xoá video "${v.title || v.videoId}" khỏi hệ thống?`);
        if (!confirmDelete) return;

        try {
            await scraperService.deleteScrapedVideo(token, v.platform, v.videoId);
            setShuffledVideos((prev) => prev.filter((item) => item.videoId !== v.videoId));
            toast.success('Đã xoá video khỏi cơ sở dữ liệu!');
            if (activeIndex < videos.length - 1) {
                containerRef.current?.children[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi xoá video');
        }
    };

    // Video nào đang chiếm màn hình thì video đó phát
    const observerRef = useRef<IntersectionObserver | null>(null);
    const slideRef = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        observerRef.current?.observe(node);
    }, []);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting && e.intersectionRatio > 0.6) {
                        const idx = Number((e.target as HTMLElement).dataset.index);
                        if (!Number.isNaN(idx)) setActiveIndex(idx);
                    }
                }
            },
            { root, threshold: [0.6] },
        );
        observerRef.current = io;
        Array.from(root.children).forEach((c) => io.observe(c));
        return () => io.disconnect();
    }, [videos.length]);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        for (const khung of Array.from(root.children)) {
            if (Number((khung as HTMLElement).dataset.index) === activeIndex) continue;
            khung.querySelector('video')?.pause();
        }
    }, [activeIndex]);

    const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
    useEffect(() => {
        if (activeIndex >= videos.length - 3 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [activeIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const daXinTruoc = useRef(new Set<string>());
    useEffect(() => {
        if (!token || !videos.length) return;
        for (let i = activeIndex + 1; i <= activeIndex + 3 && i < videos.length; i++) {
            const v = videos[i];
            const plan = planPlayback(v.platform, v.videoId, v.url, API_URL, token);
            if (plan.mode !== 'proxy') continue;
            const key = `${v.platform}:${v.videoId}`;
            if (daXinTruoc.current.has(key)) continue;
            daXinTruoc.current.add(key);
            fetch(plan.src, { headers: { Range: 'bytes=0-1' } }).catch(() => {
                daXinTruoc.current.delete(key);
            });
        }
    }, [activeIndex, videos, token]);

    if (!token) {
        return <div className="flex h-screen items-center justify-center bg-black text-slate-400">Cần đăng nhập.</div>;
    }

    return (
        <div className="fixed inset-0 z-[2000] bg-black">
            {/* Header top bar: Nút Quay lại */}
            <div className="absolute left-4 top-4 z-40 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center gap-2 rounded-full bg-black/70 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-md hover:bg-black/90 shadow-lg transition-all"
                >
                    <ArrowLeft className="h-4 w-4" /> Quay lại
                </button>
            </div>

            {/* Header top bar: Nút Xáo trộn + Đếm số video */}
            <div className="absolute right-4 top-4 z-40 flex items-center gap-2.5">
                <button
                    type="button"
                    onClick={() => {
                        setShuffleSeed((s) => s + 1);
                        setIsShuffled(true);
                        toast.success('Đã xáo trộn danh sách video!', { icon: '🔀' });
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-violet-600/90 hover:bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md shadow-lg transition-all active:scale-95"
                    title="Xáo trộn ngẫu nhiên video"
                >
                    <Shuffle className="h-3.5 w-3.5" /> Xáo trộn
                </button>

                <div className="rounded-full bg-black/70 px-3 py-2 text-xs font-medium text-slate-300 backdrop-blur-md shadow-lg">
                    {videos.length ? `${activeIndex + 1} / ${videos.length}` : ''}
                </div>
            </div>

            {query.isLoading && (
                <div className="flex h-full items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {!query.isLoading && videos.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                    <VideoOff className="h-8 w-8" />
                    <p>Chưa có video nào để xem.</p>
                </div>
            )}

            <div
                ref={containerRef}
                className="h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
            >
                {videos.map((v, i) => (
                    <div
                        key={`${v.platform}:${v.videoId}`}
                        data-index={i}
                        ref={slideRef}
                        className="h-full w-full"
                    >
                        <Slide
                            video={v}
                            active={i === activeIndex}
                            shouldLoad={Math.abs(i - activeIndex) <= 1}
                            nearby={Math.abs(i - activeIndex) <= 2}
                            token={token}
                            tatTieng={tatTieng}
                            setTatTieng={setTatTieng}
                            hoiLyDo={hoiLyDo}
                            lyDoChung={lyDoChung}
                            onPropose={handlePropose}
                            isProposed={proposedIds.has(v.videoId)}
                            onDelete={handleDelete}
                        />
                    </div>
                ))}
            </div>

            {query.isFetchingNextPage && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            )}
        </div>
    );
}

export default function WatchPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black text-slate-400">Đang tải...</div>}>
            <WatchInner />
        </Suspense>
    );
}
