'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Heart, MessageCircle, Share2, Eye, Loader2, VideoOff, Play, Volume2, VolumeX } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { fetchFeedPage, type FeedVideo } from '@/lib/feed-source';
import { planPlayback } from '@/lib/video-playback';
import { dedupeById } from '@/lib/dedupe-pages';

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
}: {
    video: FeedVideo;
    active: boolean;
    shouldLoad: boolean;
    /** false = khung ở xa, chỉ vẽ ảnh bìa cho nhẹ. */
    nearby: boolean;
    /** Đi kèm vào URL phát — thẻ <video> không gửi được header Authorization. */
    token: string;
    /** Do trang cha giữ, KHÔNG để mỗi khung tự giữ: bật tiếng ở video này rồi cuộn xuống
     *  video sau lại bị tắt tiếng, phải bật đi bật lại từng cái. */
    tatTieng: boolean;
    setTatTieng: (v: (prev: boolean) => boolean) => void;
    /** Hỏi server vì sao hỏng — do trang cha giữ để CẢ TRANG chỉ hỏi một lần. */
    hoiLyDo: () => void;
    /** Lý do dùng chung cho mọi khung, vì hết số dư là cả 4 nền tảng cùng chết. */
    lyDoChung: string;
}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [failed, setFailed] = useState(false);
    // Video của 4 nền tảng đi qua trung gian mất 2-16 GIÂY mới có khung hình đầu: server phải
    // đi xin link phát từ nền tảng gốc trước. Không báo gì trong lúc đó thì người dùng chỉ
    // thấy màn hình đen và tưởng hỏng — đã bị hiểu nhầm đúng như vậy một lần.
    const [dangTai, setDangTai] = useState(false);
    const [tamDung, setTamDung] = useState(false);
    const plan = useMemo(
        () => planPlayback(video.platform, video.videoId, video.url, API_URL, token),
        [video.platform, video.videoId, video.url, token],
    );

    /**
     * Tự phát khi cuộn tới.
     *
     * Phải phụ thuộc cả `shouldLoad`, không chỉ `active`: lúc video vừa thành video-đang-xem
     * thì link phát có thể CHƯA kịp gắn, play() trượt và trước đây không có gì gọi lại → người
     * dùng phải bấm tay mới chạy. Ngoài ra còn gọi lại ở onCanPlay bên dưới, phòng trường hợp
     * media sẵn sàng muộn hơn.
     */
    const tuPhat = useCallback(() => {
        const el = videoRef.current;
        if (!el) return;
        // Trình duyệt chặn tự phát có tiếng — muốn tự chạy thì phải tắt tiếng.
        el.muted = tatTieng;
        el.play().then(() => setTamDung(false)).catch(() => {
            // Tới đây gần như luôn là vì người dùng ĐÃ BẬT TIẾNG: trình duyệt chỉ cho tự phát
            // khi tắt tiếng, nên video sau bị từ chối và đứng im chờ bấm — đúng cái phiền mà
            // người dùng gặp. Hạ xuống tắt tiếng để video vẫn chạy khi cuộn tới.
            if (el.muted) return;      // đã tắt tiếng mà vẫn trượt thì do cuộn quá nhanh, kệ.
            el.muted = true;
            // Đổi luôn trạng thái chung, nếu không thì loa vẫn vẽ "đang có tiếng" trong khi
            // thực tế đã tắt — bấm vào lại thành tắt lần nữa, nhìn như nút hỏng.
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

    /**
     * Gắn/gỡ thẻ video — PHẢI dừng ngay lúc gỡ.
     *
     * Cuộn nhanh thì khung đang phát nhảy thẳng từ "đang xem" sang "ở xa" trong một lượt vẽ,
     * thẻ <video> bị gỡ khỏi trang luôn. Lúc đó hiệu ứng ở trên chạy thì `videoRef.current` đã
     * rỗng (React xoá ref TRƯỚC khi hiệu ứng chạy) nên nhánh `el.pause()` không tới lượt —
     * thẻ video đã tách khỏi trang VẪN CHẠY TIẾP và tiếng vẫn phát chồng lên video mới.
     *
     * Hàm ref là chỗ duy nhất còn cầm được phần tử ngay khoảnh khắc bị gỡ.
     */
    const ganVideo = useCallback((el: HTMLVideoElement | null) => {
        if (!el) videoRef.current?.pause();
        videoRef.current = el;
    }, []);

    /** Bấm vào video để dừng / chạy lại — như TikTok. */
    const doiTrangThai = useCallback(() => {
        const el = videoRef.current;
        if (!el) return;
        if (el.paused) { el.play().catch(() => {}); setTamDung(false); }
        else { el.pause(); setTamDung(true); }
    }, []);

    return (
        <section className="relative h-full w-full snap-start snap-always flex items-center justify-center bg-black py-3">
            {/*
              Khung video dựng đứng, luôn nằm TRỌN trong màn hình.
              Trước đây thẻ <video> trải kín cả vùng nên phần trên bị thanh menu (z-1000) che
              và phần dưới bị tràn khỏi mép — nhìn như video bị phóng to và cắt mất.
              aspect-[9/16] + h-full giữ đúng tỉ lệ dọc; màn hình hẹp thì w-full lo phần còn lại.
            */}
            {/*
              KHÔNG bo góc / cắt viền quanh thẻ <video>: bo góc buộc trình duyệt bỏ đường vẽ
              nhanh dành riêng cho video và phải ghép hình lại từng khung — đây là nguyên nhân
              giật quen thuộc. Nền đã đen sẵn nên bỏ bo góc gần như không đổi gì về nhìn.
            */}
            <div className="relative flex h-full max-h-full w-full max-w-[calc(100vh*9/16)] items-center justify-center bg-black">
            {!nearby && (
                video.thumbnail
                    ? <img src={video.thumbnail} alt="" className="h-full w-full object-contain opacity-70" />
                    : <div className="h-full w-full bg-black" />
            )}

            {nearby && plan.mode === 'proxy' && !failed && (
                <video
                    ref={ganVideo}
                    // Chỉ nạp khi tới lượt — tránh tải song song cả danh sách.
                    src={shouldLoad ? plan.src : undefined}
                    poster={video.thumbnail || undefined}
                    className="h-full w-full cursor-pointer object-contain"
                    playsInline
                    loop
                    // muted ngay từ đầu (không chỉ gán trong effect): trình duyệt quyết định
                    // cho tự phát hay không NGAY lúc gọi play(), gán muộn là bị chặn.
                    muted={tatTieng}
                    // KHÔNG dùng `controls`: có thanh điều khiển thì bấm vào video không
                    // dừng/chạy được, phải nhắm đúng nút — trái với thói quen lướt.
                    // Video ĐANG XEM để 'auto' cho trình duyệt đệm sẵn thật nhiều — để
                    // 'metadata' thì nó chỉ đệm trước ~6 giây, mạng chớp một cái là khựng.
                    // Video kề chỉ 'metadata' để không tải song song tốn băng thông.
                    preload={active ? 'auto' : shouldLoad ? 'metadata' : 'none'}
                    onClick={doiTrangThai}
                    onLoadStart={() => setDangTai(true)}
                    onWaiting={() => setDangTai(true)}
                    onCanPlay={() => { setDangTai(false); if (active) tuPhat(); }}
                    onPlaying={() => { setDangTai(false); setTamDung(false); }}
                    onPause={() => setTamDung(true)}
                    onError={() => {
                        setDangTai(false);
                        setFailed(true);
                        hoiLyDo();
                    }}
                />
            )}

            {/* Dấu tạm dừng ở giữa — chỉ hiện khi người dùng chủ động dừng.
                PHẢI kèm `active`: lúc cuộn qua, khung cũ bị pause() và sự kiện `pause` về
                MUỘN HƠN lệnh xoá cờ, nên khung vừa lướt qua đọng lại dấu tạm dừng — cuộn tới
                lui sẽ thấy nút Play nhấp nháy ở khung bên cạnh. */}
            {nearby && active && plan.mode === 'proxy' && !failed && tamDung && !dangTai && (
                <button
                    type="button"
                    onClick={doiTrangThai}
                    aria-label="Phát tiếp"
                    className="absolute inset-0 flex items-center justify-center bg-black/20"
                >
                    <Play className="h-16 w-16 fill-white/90 text-white/90 drop-shadow-lg" />
                </button>
            )}

            {/* Bật/tắt tiếng. Tự phát bắt buộc phải tắt tiếng, nên cần chỗ để bật lại. */}
            {nearby && active && plan.mode === 'proxy' && !failed && shouldLoad && (
                <button
                    type="button"
                    onClick={() => setTatTieng((v) => !v)}
                    aria-label={tatTieng ? 'Bật tiếng' : 'Tắt tiếng'}
                    className="absolute right-3 top-3 rounded-full bg-black/55 p-2 text-white backdrop-blur transition-colors hover:bg-black/75"
                >
                    {tatTieng ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
            )}

            {/* Báo đang tải — đè lên ảnh bìa, không chắn nút điều khiển ở dưới. */}
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

            {/* Thông tin đè lên video, nằm TRONG khung video chứ không tràn ra nền đen hai
                bên. pointer-events-none để không chắn nút điều khiển của thẻ <video>; riêng
                các link con thì bật lại. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pb-16">
                <div>
                    <p className="text-sm font-semibold text-white">{video.authorName || 'Không rõ kênh'}</p>
                    {video.title && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-200">{video.title}</p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
                        {video.views > 0 && (
                            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{compact(video.views)}</span>
                        )}
                        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{compact(video.likes)}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{compact(video.comments)}</span>
                        {video.shares > 0 && (
                            <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" />{compact(video.shares)}</span>
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
    const { token } = useAuthStore();

    const platform = (params?.get('platform') || 'douyin').toLowerCase();
    const startId = params?.get('start') || '';

    const containerRef = useRef<HTMLDivElement | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    // Giữ ở đây chứ không ở từng khung: bật tiếng một lần là giữ nguyên cho các video sau.
    const [tatTieng, setTatTieng] = useState(true);

    /**
     * Vì sao video hỏng — hỏi ĐÚNG MỘT LẦN cho cả trang.
     *
     * Bản đầu tôi để mỗi khung tự hỏi trong onError. Nhưng mỗi lần hỏi là một request đi
     * hết đường xuống server và có thể kéo theo một lượt gọi TikHub TÍNH PHÍ. Cuộn qua
     * mười video hỏng là mười lượt — đúng thứ vừa mới ngồi cắt giảm.
     *
     * Mà hỏi nhiều cũng vô nghĩa: hết số dư thì CẢ BỐN nền tảng cùng chết, lý do y hệt nhau.
     */
    const [lyDoChung, setLyDoChung] = useState('');
    const daHoiLyDo = useRef(false);
    const hoiLyDo = useCallback(() => {
        if (daHoiLyDo.current || !token) return;
        daHoiLyDo.current = true;
        fetch(`${API_URL}/scraper/stream/trang-thai?t=${encodeURIComponent(token)}`)
            .then((r) => (r.status === 402 ? r.json() : null))
            .then((j) => { if (j?.message) setLyDoChung(j.message); })
            .catch(() => {});
    }, [token]);

    const query = useInfiniteQuery({
        queryKey: ['watch-feed', platform],
        initialPageParam: 1,
        queryFn: ({ pageParam }) => fetchFeedPage(platform, token!, pageParam as number),
        getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
        enabled: !!token,
    });

    // Lọc trùng vì phân trang LIMIT/OFFSET: video mới cào về sẽ đẩy danh sách và làm trang
    // sau lặp lại phần cuối trang trước (xem dedupe-pages.ts).
    const videos = useMemo(
        () => dedupeById(query.data?.pages.flatMap((p) => p.videos) || []),
        [query.data],
    );

    // Nhảy tới đúng video người dùng bấm từ trang khám phá.
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

    // Video nào đang chiếm màn hình thì video đó phát.
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

    /**
     * Chốt chặn: chỉ khung đang xem được phát, mọi khung khác dừng.
     *
     * Mỗi khung đã tự dừng mình rồi, nhưng chỉ cần MỘT đường đi lọt (cuộn quá nhanh, khung bị
     * gỡ giữa chừng, sau này thêm nhánh vẽ mới) là có hai video cùng ra tiếng — lỗi này rất
     * khó lần vì nghe thì rõ mà nhìn vào trang không thấy gì bất thường. Quét ở đây rẻ: cùng
     * lắm chỉ có 5 thẻ video trong trang.
     *
     * Chạy SAU các khung con (React luôn chạy hiệu ứng con trước cha) nên không cắt ngang lệnh
     * phát của khung đang xem — miễn là bỏ qua đúng khung đó.
     */
    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        for (const khung of Array.from(root.children)) {
            if (Number((khung as HTMLElement).dataset.index) === activeIndex) continue;
            khung.querySelector('video')?.pause();
        }
    }, [activeIndex]);

    // Gần hết danh sách thì tải thêm.
    // Tách sẵn ra biến thay vì để cả `query` trong danh sách phụ thuộc: đối tượng `query` là
    // đối tượng mới sau MỖI lần vẽ lại, để nguyên thì hiệu ứng này chạy lại liên tục vô ích.
    const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
    useEffect(() => {
        if (activeIndex >= videos.length - 3 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [activeIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    /**
     * Xin trước link phát cho vài video sắp tới.
     *
     * Chỗ tốn thời gian nhất KHÔNG phải tải video mà là bước server đi hỏi nền tảng gốc lấy
     * link phát — đo được 2 đến 16 giây. Ở đây chỉ xin 2 byte đầu (Range 0-1) để server làm
     * xong bước đó và nhớ vào bộ đệm; lúc người dùng cuộn tới thì video chạy gần như ngay.
     * Xin 2 byte nên gần như không tốn băng thông.
     */
    const daXinTruoc = useRef(new Set<string>());
    useEffect(() => {
        if (!token || !videos.length) return;
        for (let i = activeIndex + 1; i <= activeIndex + 3 && i < videos.length; i++) {
            const v = videos[i];
            const plan = planPlayback(v.platform, v.videoId, v.url, API_URL, token);
            if (plan.mode !== 'proxy') continue;             // nền tảng nhúng không cần
            const key = `${v.platform}:${v.videoId}`;
            if (daXinTruoc.current.has(key)) continue;
            daXinTruoc.current.add(key);
            fetch(plan.src, { headers: { Range: 'bytes=0-1' } }).catch(() => {
                // Hỏng thì bỏ qua — đây chỉ là bước làm ấm, video vẫn tải lại được khi tới lượt.
                daXinTruoc.current.delete(key);
            });
        }
    }, [activeIndex, videos, token]);

    if (!token) {
        return <div className="flex h-screen items-center justify-center bg-black text-slate-400">Cần đăng nhập.</div>;
    }

    // z phải CAO HƠN thanh menu của dashboard (z-1000) và khung nhắc cài app (z-300).
    // Để z-50 như trước thì menu đè lên và che mất phần trên của video — nhìn tưởng video
    // bị phóng to và cắt mất đầu.
    return (
        <div className="fixed inset-0 z-[2000] bg-black">
            <button
                type="button"
                onClick={() => router.back()}
                className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-sm text-white backdrop-blur hover:bg-black/80"
            >
                <ArrowLeft className="h-4 w-4" /> Quay lại
            </button>
            <div className="absolute right-4 top-4 z-10 rounded-full bg-black/60 px-3 py-2 text-xs text-slate-300 backdrop-blur">
                {videos.length ? `${activeIndex + 1} / ${videos.length}` : ''}
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
                            // Nạp video đang xem + 1 video kế, để cuộn xuống là có ngay.
                            shouldLoad={Math.abs(i - activeIndex) <= 1}
                            // Chỉ dựng thẻ video/iframe cho các khung ở gần. Lướt lâu thì danh
                            // sách lên hàng chục khung; để nguyên chừng ấy thẻ video trong trang
                            // là trình duyệt phải ghép hình cho tất cả và bắt đầu giật.
                            nearby={Math.abs(i - activeIndex) <= 2}
                            token={token}
                            tatTieng={tatTieng}
                            setTatTieng={setTatTieng}
                            hoiLyDo={hoiLyDo}
                            lyDoChung={lyDoChung}
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
