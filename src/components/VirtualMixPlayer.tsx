'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Loader2, RefreshCw, Eye } from 'lucide-react';

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001';

interface ClipInfo {
    video_id: number;
    slot: number;
    slot_name: string;
    duration: number;
    stream_url: string;
    folder_type: string;
}

interface Manifest {
    output_index: number;
    clips: ClipInfo[];
    audio_url: string;
    total_duration: number;
    slot_count: number;
}

// ── Slot color mapping ──
const getSlotColor = (folderType: string) => {
    const colors: { [key: string]: string } = {
        'Sản phẩm': 'bg-blue-500',
        'HuyK': 'bg-green-500',
        'Chế tác': 'bg-orange-500',
        'Sản phẩm HT': 'bg-purple-500',
        'Outtrol': 'bg-pink-500',
    };
    return colors[folderType] || 'bg-gray-500';
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};


// ═══════════════════════════════════════════════════════════════
// Virtual Mix Player - plays clips sequentially with audio sync
// ═══════════════════════════════════════════════════════════════
export function VirtualMixPlayer({ manifest }: { manifest: Manifest }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentClipIndex, setCurrentClipIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [globalTime, setGlobalTime] = useState(0);
    const [clipElapsed, setClipElapsed] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const rafRef = useRef<number>();

    const currentClip = manifest.clips[currentClipIndex];

    // Get cumulative time offset before a clip index
    const getTimeOffset = useCallback((idx: number) => {
        let t = 0;
        for (let i = 0; i < idx && i < manifest.clips.length; i++) {
            t += manifest.clips[i].duration;
        }
        return t;
    }, [manifest.clips]);

    // Build full video URL
    const clipUrl = useCallback((clip: ClipInfo) => {
        return `${AI_SERVICE_URL}${clip.stream_url}`;
    }, []);

    // Load clip into video element
    const loadClip = useCallback((idx: number) => {
        if (idx < 0 || idx >= manifest.clips.length) return;
        const clip = manifest.clips[idx];
        const video = videoRef.current;
        if (!video || !clip) return;

        setIsLoading(true);
        setError('');
        setClipElapsed(0);
        setCurrentClipIndex(idx);

        video.src = clipUrl(clip);
        video.load();
    }, [manifest.clips, clipUrl]);

    // When video is ready to play
    const onCanPlay = () => {
        setIsLoading(false);
        if (isPlaying) {
            videoRef.current?.play().catch(() => { });
        }
    };

    // When video pauses (e.g. buffering)
    const onPause = () => {
        // If we are technically "playing" but the video paused to buffer,
        // we should pause the audio too so they don't get out of sync.
        if (isPlaying && audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
        }
    };

    // When video resumes playing
    const onPlay = () => {
        if (isPlaying && audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => { });
        }
    };

    // When video errors
    const onError = () => {
        setIsLoading(false);
        const clip = manifest.clips[currentClipIndex];
        const url = clip ? clipUrl(clip) : '';
        console.warn('Video load error for slot:', clip?.slot_name, '\nURL:', url);

        // Retry 1 lần sau 1.5s (on-the-fly generation cần thêm thời gian)
        setError(`⏳ Đang tải clip ${clip?.slot}: ${clip?.slot_name}...`);

        setTimeout(() => {
            const video = videoRef.current;
            if (!video) return;

            // Retry: reload cùng src
            const currentSrc = video.src;
            video.src = '';
            video.src = currentSrc;
            video.load();

            // Nếu 5s sau vẫn loading → bỏ qua sang slot tiếp theo
            setTimeout(() => {
                if (video.readyState < 2) {
                    // Vẫn chưa load được → skip
                    setError(`❌ Slot ${clip?.slot} (${clip?.slot_name}): clip chưa sẵn sàng, bỏ qua...`);
                    setTimeout(() => {
                        setError('');
                        if (currentClipIndex < manifest.clips.length - 1) {
                            loadClip(currentClipIndex + 1);
                        } else {
                            setIsPlaying(false);
                            audioRef.current?.pause();
                        }
                    }, 1500);
                }
            }, 5000);
        }, 1500);
    };

    // When the current clip's video naturally ends
    const onVideoEnded = () => {
        if (currentClipIndex < manifest.clips.length - 1) {
            loadClip(currentClipIndex + 1);
        } else {
            setIsPlaying(false);
            audioRef.current?.pause();
        }
    };

    // Monitor playback: track time, auto-advance when clip duration reached
    useEffect(() => {
        const tick = () => {
            const video = videoRef.current;
            if (!video || !isPlaying) return;

            // Only advance elapsed time if video is actively playing (not stalled state)
            const elapsed = video.currentTime;
            setClipElapsed(elapsed);

            // Compute global time but ensure we don't go backwards
            const gt = getTimeOffset(currentClipIndex) + elapsed;
            setGlobalTime(prevGt => Math.max(prevGt, gt));

            // Sync audio smoothly - only jump if difference is large 
            // Avoid syncing if video is effectively paused/stalled
            if (audioRef.current && !isLoading && !video.paused) {
                const diff = Math.abs(audioRef.current.currentTime - gt);
                if (diff > 0.5) {
                    audioRef.current.currentTime = gt;
                }
            }

            // Auto-advance when clip duration reached
            if (currentClip && elapsed >= currentClip.duration) {
                if (currentClipIndex < manifest.clips.length - 1) {
                    loadClip(currentClipIndex + 1);
                } else {
                    setIsPlaying(false);
                    audioRef.current?.pause();
                }
                return;
            }

            rafRef.current = requestAnimationFrame(tick);
        };

        if (isPlaying) {
            rafRef.current = requestAnimationFrame(tick);
        }
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isPlaying, currentClipIndex, currentClip, getTimeOffset, loadClip, manifest.clips.length, isLoading]);

    // Load first clip
    useEffect(() => {
        loadClip(0);
        setGlobalTime(0);
        setIsPlaying(false);
    }, [manifest]);

    // Play / Pause
    const togglePlay = () => {
        if (isPlaying) {
            videoRef.current?.pause();
            audioRef.current?.pause();
            setIsPlaying(false);
        } else {
            videoRef.current?.play().catch(() => { });
            if (audioRef.current) {
                audioRef.current.currentTime = globalTime;
                audioRef.current.play().catch(() => { });
            }
            setIsPlaying(true);
        }
    };

    // Skip to clip
    const skipTo = (idx: number) => {
        if (idx < 0 || idx >= manifest.clips.length) return;
        const wasPlaying = isPlaying;
        loadClip(idx);
        const t = getTimeOffset(idx);
        setGlobalTime(t);
        if (audioRef.current) audioRef.current.currentTime = t;
        if (wasPlaying) {
            setTimeout(() => {
                videoRef.current?.play().catch(() => { });
                audioRef.current?.play().catch(() => { });
                setIsPlaying(true);
            }, 200);
        }
    };

    const clipProgress = currentClip ? Math.min(clipElapsed / currentClip.duration, 1) : 0;

    return (
        <div className="bg-[#0a0a0a] rounded-2xl border border-gray-800 overflow-hidden">
            {/* Video */}
            <div className="relative aspect-[9/16] max-h-[500px] mx-auto bg-black">
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    onCanPlay={onCanPlay}
                    onPlay={onPlay}
                    onPause={onPause}
                    onWaiting={onPause} // Wait explicitly for buffering
                    onPlaying={onPlay}  // Resume explicitly after buffering
                    onError={onError}
                    onEnded={onVideoEnded}
                    muted
                    playsInline
                    crossOrigin="anonymous"
                />

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                )}

                {currentClip && (
                    <div className="absolute top-3 left-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getSlotColor(currentClip.folder_type)}`}>
                            Slot {currentClip.slot}: {currentClip.slot_name}
                        </span>
                    </div>
                )}

                {!isPlaying && !isLoading && (
                    <button onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                    </button>
                )}

                {error && (
                    <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 text-white px-3 py-2 rounded-lg text-xs">
                        {error}
                    </div>
                )}
            </div>

            {/* Hidden audio */}
            <audio
                ref={audioRef}
                src={`${AI_SERVICE_URL}${manifest.audio_url}`}
                preload="auto"
                muted={isMuted}
                crossOrigin="anonymous"
            />

            {/* Timeline segments */}
            <div className="px-4 pt-3">
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-800 gap-[1px]">
                    {manifest.clips.map((clip, idx) => {
                        const w = (clip.duration / manifest.total_duration) * 100;
                        const active = idx === currentClipIndex;
                        const done = idx < currentClipIndex;
                        return (
                            <button key={idx} onClick={() => skipTo(idx)}
                                className={`h-full relative ${getSlotColor(clip.folder_type)} ${active ? 'opacity-100' : done ? 'opacity-60' : 'opacity-30'} hover:opacity-80 transition-opacity`}
                                style={{ width: `${w}%` }}
                                title={`${clip.slot_name} (${clip.duration.toFixed(1)}s)`}
                            >
                                {active && (
                                    <div className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
                                        style={{ width: `${clipProgress * 100}%` }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Controls */}
            <div className="px-4 py-3 flex items-center gap-3">
                <button onClick={() => skipTo(currentClipIndex - 1)} disabled={currentClipIndex === 0}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30">
                    <SkipBack className="w-4 h-4 text-white" />
                </button>

                <button onClick={togglePlay}
                    className="p-3 bg-white rounded-full hover:bg-gray-200 transition-colors">
                    {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
                </button>

                <button onClick={() => skipTo(currentClipIndex + 1)} disabled={currentClipIndex >= manifest.clips.length - 1}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30">
                    <SkipForward className="w-4 h-4 text-white" />
                </button>

                <span className="text-xs text-gray-400 font-mono flex-1">
                    {formatTime(globalTime)} / {formatTime(manifest.total_duration)}
                </span>

                <button onClick={() => setIsMuted(!isMuted)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                    {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-white" />}
                </button>
            </div>

            {/* Clip list */}
            <div className="px-4 pb-4">
                <div className="bg-[#141414] rounded-lg p-2 space-y-1 max-h-36 overflow-y-auto">
                    {manifest.clips.map((clip, idx) => (
                        <button key={idx} onClick={() => skipTo(idx)}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${idx === currentClipIndex ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'}`}>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getSlotColor(clip.folder_type)}`} />
                            <span className="text-xs text-white flex-1 truncate">
                                {clip.slot}. {clip.slot_name}
                            </span>
                            <span className="text-[10px] text-gray-500">{clip.duration.toFixed(1)}s</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════
// Virtual Mix Section - wraps the player with generate button
// ═══════════════════════════════════════════════════════════════
interface VirtualMixSectionProps {
    audioFile: File | null;
    productId?: string;
    productSku?: string;
    numOutputs: number;
    useA4Formula: boolean;
    disabled?: boolean;
}

export function VirtualMixSection({
    audioFile, productId, productSku, numOutputs, useA4Formula, disabled = false,
}: VirtualMixSectionProps) {
    const [manifests, setManifests] = useState<Manifest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [needPregen, setNeedPregen] = useState(false);
    const [pregenRunning, setPregenRunning] = useState(false);
    const [pregenMessage, setPregenMessage] = useState('');
    const [generationTime, setGenerationTime] = useState(0);
    const [selectedOutput, setSelectedOutput] = useState(0);

    const generateVirtualMix = async () => {
        if (!audioFile) return;
        setLoading(true);
        setError('');
        setNeedPregen(false);
        setManifests([]);

        try {
            const formData = new FormData();
            formData.append('audio', audioFile);
            formData.append('num_outputs', numOutputs.toString());
            formData.append('use_a4_formula', useA4Formula.toString());
            if (productId) formData.append('product_id', productId);
            if (productSku) formData.append('product_sku', productSku);

            const response = await fetch(`${AI_SERVICE_URL}/api/videos/virtual-mix/`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error === 'preview_not_ready') {
                    setNeedPregen(true);
                    setError(data.message || 'Thiếu các video đã cache. Vui lòng chạy Pre-generate.');
                } else if (data.need_pregen) {
                    setNeedPregen(true);
                    setError(data.error || 'Cần chạy Pre-generation trước');
                } else {
                    throw new Error(data.error || data.message || 'Virtual mix failed');
                }
                return;
            }

            setManifests(data.manifests || []);
            setGenerationTime(data.generation_time_ms || 0);
            setSelectedOutput(0);
        } catch (err: any) {
            setError(err.message || 'Error creating virtual mix');
        } finally {
            setLoading(false);
        }
    };

    // Trigger pre-generation and poll status
    const startPregen = async () => {
        setPregenRunning(true);
        setPregenMessage('Đang khởi tạo pre-generation...');

        try {
            await fetch(`${AI_SERVICE_URL}/api/videos/pregen/start/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clip_duration: 12.0 }),
            });

            // Poll pregen status
            const pollPregen = async () => {
                try {
                    const res = await fetch(`${AI_SERVICE_URL}/api/videos/pregen/status/`);
                    const data = await res.json();

                    setPregenMessage(
                        `Pre-generating: ${data.done || 0}/${data.total || 0} clips ` +
                        `(${data.percent || 0}%) — ${data.generated || 0} mới, ${data.cached || 0} đã có`
                    );

                    if (data.status === 'completed') {
                        setPregenRunning(false);
                        setPregenMessage(`✅ Hoàn tất! ${data.done} clips đã sẵn sàng.`);
                        setNeedPregen(false);
                        setError('');
                        return;
                    }

                    if (data.status === 'error') {
                        setPregenRunning(false);
                        setPregenMessage(`❌ Lỗi: ${data.message}`);
                        return;
                    }

                    setTimeout(pollPregen, 2000);
                } catch {
                    setTimeout(pollPregen, 3000);
                }
            };

            setTimeout(pollPregen, 2000);
        } catch (err: any) {
            setPregenRunning(false);
            setPregenMessage(`❌ Lỗi: ${err.message}`);
        }
    };

    return (
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-cyan-500/20">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Eye className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        ⚡ Virtual Preview
                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-full border border-cyan-500/30">
                            INSTANT
                        </span>
                    </h3>
                    <p className="text-xs text-gray-400">
                        Xem trước video ngay — clips được cache sẵn, không cần chờ encode!
                    </p>
                </div>
            </div>

            {/* Generate button (Disabled per user request) */}
            {manifests.length === 0 && !needPregen && (
                <button onClick={generateVirtualMix} disabled={true}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30">
                    {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" />Đang tạo preview (~7 clips, 1-2 phút lần đầu)...</>
                    ) : (
                        <><Eye className="w-5 h-5" />⚡ XEM TRƯỚC NGAY (instant!)</>
                    )}
                </button>
            )}

            {/* Need Pre-generation notice */}
            {needPregen && (
                <div className="space-y-3">
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <p className="text-sm text-yellow-400 font-semibold mb-2">
                            ⚠️ Chưa có cached clips!
                        </p>
                        <p className="text-xs text-gray-400 mb-3">
                            Videos đã được indexed nhưng chưa tạo clips preview.
                            Cần chạy Pre-generation 1 lần (chạy nền, ~10-30 phút).
                            Sau đó preview sẽ luôn instant!
                        </p>

                        {!pregenRunning ? (
                            <button onClick={startPregen} disabled={disabled}
                                className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl text-white font-semibold hover:from-yellow-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5" />
                                🚀 BẮT ĐẦU PRE-GENERATION (chạy nền)
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-yellow-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {pregenMessage}
                                </div>
                                <p className="text-[10px] text-gray-500">
                                    Đang chạy nền — bạn có thể dùng nút "BẮT ĐẦU MIX" bên dưới song song!
                                </p>
                            </div>
                        )}
                    </div>

                    {!pregenRunning && (
                        <button onClick={generateVirtualMix}
                            className="w-full py-2 bg-[#0a0a0a] rounded-lg text-gray-400 text-sm hover:text-white transition-colors">
                            🔄 Thử lại Virtual Preview
                        </button>
                    )}
                </div>
            )}

            {/* Pre-gen progress (when running but previews already showing) */}
            {pregenRunning && manifests.length > 0 && (
                <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-yellow-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {pregenMessage}
                    </div>
                </div>
            )}

            {/* Result */}
            {manifests.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                        <span className="text-sm text-green-400">
                            ✅ {manifests.length} previews tạo trong <strong>{generationTime}ms</strong> ⚡
                        </span>
                        <button onClick={generateVirtualMix} className="p-1.5 hover:bg-green-500/20 rounded transition-colors">
                            <RefreshCw className="w-4 h-4 text-green-400" />
                        </button>
                    </div>

                    {manifests.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {manifests.map((_, idx) => (
                                <button key={idx} onClick={() => setSelectedOutput(idx)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${idx === selectedOutput ? 'bg-cyan-500 text-white' : 'bg-[#0a0a0a] text-gray-400 hover:text-white'}`}>
                                    Video {idx + 1}
                                </button>
                            ))}
                        </div>
                    )}

                    {manifests[selectedOutput] && (
                        <VirtualMixPlayer manifest={manifests[selectedOutput]} />
                    )}
                </div>
            )}

            {error && !needPregen && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}
        </div>
    );
}

export default VirtualMixSection;
