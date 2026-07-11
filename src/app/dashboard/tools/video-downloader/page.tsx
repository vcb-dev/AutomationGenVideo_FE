'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Download,
    Link2,
    Music,
    Film,
    Loader2,
    Clock,
    User,
    Puzzle,
    CheckCircle2,
    HardDrive,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AI_SERVICE_URL = (process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001').replace(/\/$/, '');
const POLL_INTERVAL_MS = 1200;

const SUPPORTED = [
    'YouTube', 'TikTok', 'Facebook', 'Instagram', 'X (Twitter)',
    'Douyin', 'Bilibili', 'Reddit', 'Vimeo', 'Dailymotion', 'SoundCloud',
];

interface VideoInfo {
    title?: string;
    thumbnail?: string;
    duration?: number;
    uploader?: string;
    extractor?: string;
    best_height?: number | null;
    filesize_approx?: number | null;
}

interface JobProgress {
    status: 'queued' | 'downloading' | 'done' | 'error' | 'delivered';
    percent: number;
    message?: string;
    error?: string | null;
}

function formatDuration(sec?: number) {
    if (!sec && sec !== 0) return '';
    const s = Math.round(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
        : `${m}:${String(r).padStart(2, '0')}`;
}

function formatBytes(bytes?: number | null) {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb >= 1024 ? `~${(mb / 1024).toFixed(1)} GB` : `~${mb.toFixed(0)} MB`;
}

function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function VideoDownloaderInner() {
    const searchParams = useSearchParams();
    const [url, setUrl] = useState('');
    const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
    const [quality, setQuality] = useState<'best' | '1080' | '720'>('best');
    const [info, setInfo] = useState<VideoInfo | null>(null);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [job, setJob] = useState<JobProgress | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    // Nhận ?url= từ Chrome extension
    useEffect(() => {
        const fromExt = searchParams.get('url');
        if (fromExt) {
            setUrl(fromExt);
            void fetchInfo(fromExt);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchInfo = async (targetUrl?: string) => {
        const u = (targetUrl ?? url).trim();
        if (!/^https?:\/\//.test(u)) {
            toast.error('Vui lòng dán link video hợp lệ (bắt đầu bằng http/https)');
            return;
        }
        setLoadingInfo(true);
        setInfo(null);
        try {
            const res = await fetch(`${AI_SERVICE_URL}/api/tools/video-downloader/info/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ url: u }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Không đọc được thông tin video');
            setInfo(data);
        } catch (e: any) {
            toast.error(e.message || 'Không đọc được thông tin video');
        } finally {
            setLoadingInfo(false);
        }
    };

    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    const fetchFinishedFile = async (jobId: string) => {
        try {
            const res = await fetch(`${AI_SERVICE_URL}/api/tools/video-downloader/jobs/${jobId}/file/`, {
                headers: getAuthHeaders(),
            });
            if (!res.ok) {
                let msg = 'Tải thất bại';
                try { msg = (await res.json()).error || msg; } catch { /* binary response */ }
                throw new Error(msg);
            }
            const blob = await res.blob();
            const cd = res.headers.get('Content-Disposition') || '';
            const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
            const filename = m ? decodeURIComponent(m[1]) : `video.${format}`;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
            toast.success('Tải xong!');
        } catch (e: any) {
            toast.error(e.message || 'Tải thất bại');
        } finally {
            setJob(null);
        }
    };

    const handleDownload = async () => {
        const u = url.trim();
        if (!/^https?:\/\//.test(u)) {
            toast.error('Vui lòng dán link video hợp lệ');
            return;
        }
        if (!getAuthHeaders().Authorization) {
            toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
            return;
        }
        setJob({ status: 'queued', percent: 0, message: 'Đang khởi tạo...' });
        try {
            const res = await fetch(`${AI_SERVICE_URL}/api/tools/video-downloader/jobs/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ url: u, type: format, quality }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Không khởi tạo được tiến trình tải');

            const jobId = data.job_id as string;
            pollRef.current = setInterval(async () => {
                try {
                    const sres = await fetch(`${AI_SERVICE_URL}/api/tools/video-downloader/jobs/${jobId}/`, {
                        headers: getAuthHeaders(),
                    });
                    const sdata = await sres.json();
                    if (!sres.ok) throw new Error(sdata.error || 'Không kiểm tra được tiến trình');

                    setJob(sdata);
                    if (sdata.status === 'done') {
                        stopPolling();
                        void fetchFinishedFile(jobId);
                    } else if (sdata.status === 'error') {
                        stopPolling();
                        toast.error(sdata.error || 'Tải thất bại');
                        setJob(null);
                    }
                } catch (e: any) {
                    stopPolling();
                    toast.error(e.message || 'Mất kết nối khi theo dõi tiến trình tải');
                    setJob(null);
                }
            }, POLL_INTERVAL_MS);
        } catch (e: any) {
            toast.error(e.message || 'Không khởi tạo được tiến trình tải');
            setJob(null);
        }
    };

    const downloading = job !== null;

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Download className="w-6 h-6 text-violet-600" />
                    Tải video MXH
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Dán link video từ mạng xã hội để tải về dạng MP4 hoặc trích âm thanh MP3.
                </p>
            </div>

            {/* Input */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-sm">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
                            placeholder="https://www.tiktok.com/@user/video/..."
                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                        />
                    </div>
                    <button
                        onClick={() => fetchInfo()}
                        disabled={loadingInfo}
                        className="px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
                    >
                        {loadingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kiểm tra'}
                    </button>
                </div>

                {/* Format chọn */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFormat('mp4')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition ${format === 'mp4'
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                    >
                        <Film className="w-4 h-4" /> Video MP4
                    </button>
                    <button
                        onClick={() => setFormat('mp3')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition ${format === 'mp3'
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                    >
                        <Music className="w-4 h-4" /> Âm thanh MP3
                    </button>
                </div>

                {/* Chất lượng (chỉ áp dụng cho MP4) */}
                {format === 'mp4' && (
                    <div className="space-y-1.5">
                        <div className="flex gap-2">
                            {([
                                ['best', info?.best_height ? `Tốt nhất (${info.best_height}p)` : 'Tốt nhất'],
                                ['1080', '1080p'],
                                ['720', '720p (nhanh)'],
                            ] as const).map(([q, label]) => (
                                <button
                                    key={q}
                                    onClick={() => setQuality(q)}
                                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${quality === q
                                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {info?.best_height != null && quality !== 'best' && Number(quality) > info.best_height && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                Nguồn chỉ có tối đa {info.best_height}p — hệ thống sẽ tự tải đúng mức cao nhất hiện có.
                            </p>
                        )}
                    </div>
                )}

                {!downloading ? (
                    <button
                        onClick={handleDownload}
                        disabled={!url.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-50"
                    >
                        <Download className="w-5 h-5" /> Tải {format.toUpperCase()}
                    </button>
                ) : (
                    <div className="space-y-2">
                        <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                                className="h-full bg-violet-600 transition-all duration-300 ease-out"
                                style={{ width: `${Math.max(4, job.percent)}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {job.message || 'Đang xử lý...'} {job.percent > 0 && `(${job.percent}%)`}
                        </p>
                    </div>
                )}
            </div>

            {/* Info preview */}
            {info && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex gap-4 shadow-sm">
                    {info.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={info.thumbnail} alt="" className="w-32 h-20 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{info.title}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                            {info.uploader && <span className="flex items-center gap-1"><User className="w-3 h-3" />{info.uploader}</span>}
                            {info.duration != null && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(info.duration)}</span>}
                            {info.filesize_approx != null && <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{formatBytes(info.filesize_approx)}</span>}
                            {info.extractor && <span>{info.extractor}</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* Nền tảng hỗ trợ */}
            <div className="flex flex-wrap gap-2">
                {SUPPORTED.map((p) => (
                    <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {p}
                    </span>
                ))}
            </div>

            {/* Extension */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3 shadow-sm">
                <h2 className="font-semibold flex items-center gap-2">
                    <Puzzle className="w-5 h-5 text-violet-600" /> Chrome Extension — tải bằng 1 cú click
                </h2>
                <p className="text-sm text-gray-500">
                    Cài extension để khi đang xem video trên bất kỳ nền tảng nào, chỉ cần bấm icon extension là
                    tự động mở trang này với link video đã điền sẵn.
                </p>
                <a
                    href="/extensions/vcb-video-downloader.zip"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
                >
                    <Download className="w-4 h-4" /> Tải extension (.zip)
                </a>
                <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-1.5 mt-2">
                    {[
                        'Giải nén file zip vừa tải.',
                        'Mở chrome://extensions (Chrome/Edge/Brave đều được).',
                        'Bật "Chế độ dành cho nhà phát triển" (Developer mode) ở góc phải.',
                        'Bấm "Tải tiện ích đã giải nén" (Load unpacked) và chọn thư mục vừa giải nén.',
                        'Bấm icon extension trên thanh công cụ → mở trang Cài đặt → dán đúng địa chỉ trang web này rồi Lưu.',
                        'Xong! Mở video bất kỳ và bấm icon để tải.',
                    ].map((step, i) => (
                        <li key={i} className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                            <span>{step}</span>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

export default function VideoDownloaderPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-400">Đang tải...</div>}>
            <VideoDownloaderInner />
        </Suspense>
    );
}
