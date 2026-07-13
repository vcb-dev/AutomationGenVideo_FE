'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Film, Loader2, Trash2, CheckCircle, Download, Music, Scissors, Database, Zap, Info, RefreshCw, Plus, FolderOpen, X, Package, Eye } from 'lucide-react';
import { VirtualMixPlayer } from './VirtualMixPlayer';
import { toast } from 'react-hot-toast';

const BE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001';

// 10 folder types cố định (theo logic mix video) - Mỗi tên phải unique!
const FOLDER_TYPES = [
    'Sản phẩm',
    'HuyK',
    'Chế tác',
    'Sản phẩm HT',
    'Outtrol',
];

const DEFAULT_PATHS: { [key: string]: string } = {
    'Sản phẩm': '/volume1/MEDIA VCB folder/Generate Video/Video Sản Phẩm',
    'HuyK': '/volume1/MEDIA VCB folder/Generate Video/Source HUYK/Source chế tác sản phẩm',
    'Chế tác': '/volume1/MEDIA VCB folder/Generate Video/Chế tác sản phẩm',
    'Sản phẩm HT': '/volume1/MEDIA VCB folder/Generate Video/Video Sản Phẩm',
    'Outtrol': '/volume1/MEDIA VCB folder/SOURCE HUYK/OUTRO HUYK',
};


interface CacheStats {
    indexed_videos: number;
    cached_clips: number;
    cache_size_gb: number;
    by_folder: { [key: string]: number };
    gpu_available: boolean;
}

interface FolderInput {
    id: string;
    folder_type: string;
    path: string;
}

interface Voice {
    id: number;
    name: string;
    voice_id: string;
    provider: string;
    language: string;
    gender: string;
    is_cloned: boolean;
}

interface SmartMixProps {
    generatedScript?: string;  // Script from content generation step
    contentType?: string;  // A1, A2, A3, A4, A5
    productId?: string;
    productSku?: string;
    productCategory?: string;
}

export default function SmartMixVideo({ generatedScript, contentType, productId, productSku, productCategory }: SmartMixProps) {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [bgMusicFile, setBgMusicFile] = useState<File | null>(null);
    const [bgMusicVolume, setBgMusicVolume] = useState(10); // 10% volume
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [numOutputs, setNumOutputs] = useState(5);
    const [useGpu, setUseGpu] = useState<'auto' | 'true' | 'false'>('auto');
    const [useA4Formula, setUseA4Formula] = useState(false);
    const [mixLoading, setMixLoading] = useState(false);
    const [mixProgress, setMixProgress] = useState(0);
    const [mixMessage, setMixMessage] = useState('');
    const [mixError, setMixError] = useState('');
    const [mixResult, setMixResult] = useState<any>(null);

    const [forcedProductVideoId, setForcedProductVideoId] = useState<number | null>(null);
    const [forcedProductVideoPath, setForcedProductVideoPath] = useState<string | null>(null);

    // Voice & Audio generation
    const [voices, setVoices] = useState<Voice[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [loadingVoices, setLoadingVoices] = useState(false);
    const [generatingAudio, setGeneratingAudio] = useState(false);
    const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

    const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [isAutoReindexing, setIsAutoReindexing] = useState(false);
    const [autoReindexMsg, setAutoReindexMsg] = useState('');
    const hasAutoReindexedRef = useRef(false);
    const autoReindexPollRef = useRef<NodeJS.Timeout | null>(null);

    // Pregen (background caching) state
    const [pregenStatus, setPregenStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [pregenProgress, setPregenProgress] = useState(0);
    const [pregenMessage, setPregenMessage] = useState('');
    const [pregenTotal, setPregenTotal] = useState(0);
    const [pregenDone, setPregenDone] = useState(0);
    const pregenPollRef = useRef<NodeJS.Timeout | null>(null);

    // Preview state
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewClips, setPreviewClips] = useState<any[]>([]);
    const [previewError, setPreviewError] = useState('');
    const [selectedPreviewIdx, setSelectedPreviewIdx] = useState(0);

    // Fallback: Get product category from localStorage if not provided via props
    const [actualProductCategory, setActualProductCategory] = useState<string | undefined>(productCategory);

    useEffect(() => {
        // Priority: productCategory prop > localStorage
        if (productCategory) {
            console.log('📦 Using product category from props:', productCategory);
            setActualProductCategory(productCategory);
        } else {
            // Try to get from localStorage
            const selectedProduct = localStorage.getItem('selectedProduct');
            if (selectedProduct) {
                try {
                    const product = JSON.parse(selectedProduct);
                    if (product.category) {
                        console.log('📦 Using product category from localStorage:', product.category);
                        setActualProductCategory(product.category);
                    }
                } catch (e) {
                    console.error('Failed to parse selectedProduct from localStorage', e);
                }
            }
        }
    }, [productCategory]);
    const [showIndexPanel, setShowIndexPanel] = useState(false);

    // Indexing state - Pre-fill 10 folder types + custom folders
    const [folderInputs, setFolderInputs] = useState<FolderInput[]>(
        FOLDER_TYPES.map((type, idx) => ({
            id: `folder-${idx}`,
            folder_type: type,
            path: DEFAULT_PATHS[type] || ''
        }))
    );
    const [customFolders, setCustomFolders] = useState<FolderInput[]>([]);
    const [isIndexing, setIsIndexing] = useState(false);
    const [isClearingIndex, setIsClearingIndex] = useState(false);
    const [indexingProgress, setIndexingProgress] = useState('');
    const [videosPerFolder, setVideosPerFolder] = useState(1000);


    const audioInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const hasAutoIndexedRef = useRef(false);

    // Load cache stats and voices on mount
    useEffect(() => {
        loadCacheStats();
        loadVoices();
    }, []);

    // AUTO-SCAN IF EMPTY INDEX
    useEffect(() => {
        if (cacheStats && cacheStats.indexed_videos === 0 && !isIndexing && !hasAutoIndexedRef.current) {
            hasAutoIndexedRef.current = true;
            console.log('Index trống! Tự động chạy Auto-Scan Default Folders (1 lần)...');
            const folders: { [key: string]: string } = {};

            // Chỉ index HuyK (chung). Sản phẩm/Sản phẩm HT/Chế tác → index theo SKU qua index-manufacturing-folder
            const huykPath = DEFAULT_PATHS['HuyK'];
            if (huykPath) folders['HuyK'] = huykPath;

            // Call indexing API
            const runAutoIndex = async () => {
                setIsIndexing(true);
                setIndexingProgress('⏳ Auto-indexing HuyK (Sản phẩm/Chế tác sẽ index theo SKU)...');
                try {
                    // 1. Index default folders (HuyK, Chế tác...)
                    // Call AI service directly for indexing
                    const response = await fetch(`${AI_SERVICE_URL}/api/videos/index-folders/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            folders,
                            sku: productSku,
                            category: actualProductCategory,
                            videos_per_folder: 50 // Fast scan
                        })
                    });

                    if (response.ok) {
                        setIndexingProgress('⏳ Đang tìm folder Outro...');

                        // 2. Trigger smart Outro indexing
                        const outroResponse = await fetch(`${AI_SERVICE_URL}/api/videos/index-outro/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        });

                        if (!outroResponse.ok) {
                            console.warn('⚠️ Could not index Outro folder');
                        }

                        toast.success('✅ Đã chuẩn bị xong dữ liệu nền!');
                        loadCacheStats(true);
                    }
                } catch (e) {
                    console.error('Auto-index failed', e);
                } finally {
                    setIsIndexing(false);
                }
            };

            runAutoIndex();
        }
    }, [cacheStats]);

    // AUTO RE-INDEX khi có folder slot bị 0
    useEffect(() => {
        if (!cacheStats || isAutoReindexing || hasAutoReindexedRef.current) return;
        if (!productSku && !actualProductCategory) return;

        const byFolder = cacheStats.by_folder || {};
        const zeroSlots = Object.entries(byFolder)
            .filter(([, count]) => (count as number) === 0)
            .map(([name]) => name);

        if (zeroSlots.length === 0) return;

        // Có slot bị 0 → trigger re-index
        hasAutoReindexedRef.current = true;
        console.log('⚠️ Phát hiện slot bị 0:', zeroSlots, '→ Tự động re-index...');

        const runReindex = async () => {
            setIsAutoReindexing(true);
            setAutoReindexMsg(`⏳ Đang re-index ${zeroSlots.join(', ')}...`);
            // Reset pregen state khi bắt đầu re-index
            setPregenStatus('idle');
            setPregenProgress(0);
            setPregenMessage('');
            setPregenDone(0);
            setPregenTotal(0);

            try {
                // Trigger index lại manufacturing folder cho SKU hiện tại
                if (productSku) {
                    await fetch(`${AI_SERVICE_URL}/api/videos/index-manufacturing-folder/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            category: actualProductCategory || '',
                            sku: productSku,
                            force: true
                        })
                    });
                }

                // Trigger index Outro nếu bị 0
                if (zeroSlots.includes('Outtrol') || zeroSlots.includes('Outro')) {
                    await fetch(`${AI_SERVICE_URL}/api/videos/index-outro/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                // Trigger index HuyK nếu bị 0
                if (zeroSlots.includes('HuyK')) {
                    const folders: { [k: string]: string } = {};
                    if (DEFAULT_PATHS['HuyK']) folders['HuyK'] = DEFAULT_PATHS['HuyK'];
                    await fetch(`${AI_SERVICE_URL}/api/videos/index-folders/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ folders, videos_per_folder: 50 })
                    });
                }

                // Poll cache stats mỗi 3s cho đến khi slot không còn 0
                let attempts = 0;
                const poll = () => {
                    attempts++;
                    setAutoReindexMsg(`⏳ Đang index... (${attempts * 3}s)`);
                    loadCacheStats(true);
                    if (attempts < 10) {
                        autoReindexPollRef.current = setTimeout(poll, 3000);
                    } else {
                        setIsAutoReindexing(false);
                        setAutoReindexMsg('');
                    }
                };
                autoReindexPollRef.current = setTimeout(poll, 3000);

            } catch (e) {
                console.error('Auto re-index failed:', e);
                setIsAutoReindexing(false);
                setAutoReindexMsg('');
            }
        };

        runReindex();

        return () => {
            if (autoReindexPollRef.current) clearTimeout(autoReindexPollRef.current);
        };
    }, [cacheStats?.by_folder]);

    // Dừng polling khi tất cả slot đã có video
    useEffect(() => {
        if (!isAutoReindexing || !cacheStats?.by_folder) return;
        const stillZero = Object.values(cacheStats.by_folder).some(c => (c as number) === 0);
        if (!stillZero) {
            if (autoReindexPollRef.current) clearTimeout(autoReindexPollRef.current);
            setIsAutoReindexing(false);
            setAutoReindexMsg('');
            toast.success('✅ Tất cả slot đã có video!', { duration: 3000 });
        }
    }, [cacheStats?.by_folder, isAutoReindexing]);

    // AUTO CACHE KHI THIẾU CLIP
    const hasAutoCachedRef = useRef<{ missing: number; isTriggered: boolean }>({ missing: 0, isTriggered: false });
    
    useEffect(() => {
        if (!cacheStats || isIndexing) return;
        
        const missing = cacheStats.indexed_videos - cacheStats.cached_clips;
        
        // Reset nếu đã cache đủ
        if (missing <= 0) {
            hasAutoCachedRef.current = { missing: 0, isTriggered: false };
            return;
        }

        // Nếu mới có thêm video được index (số lượng thiếu tăng lên đáng kể) -> Cho phép trigger lại
        if (hasAutoCachedRef.current.isTriggered && missing > hasAutoCachedRef.current.missing + 5) {
            hasAutoCachedRef.current = { missing, isTriggered: false };
        }

        // Tự động trigger nếu chưa chạy và đang thiếu
        if (missing > 0 && pregenStatus === 'idle' && !hasAutoCachedRef.current.isTriggered) {
            hasAutoCachedRef.current = { missing, isTriggered: true };
            console.log(`Auto cache trigger: Missing ${missing} clips. Current status: ${pregenStatus}`);
            
            const startCache = async () => {
                try {
                    const res = await fetch(`${AI_SERVICE_URL}/api/videos/pregen/start/`, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ clip_duration: 12.0 }) 
                    });
                    if (res.ok) {
                        toast.success(`⚡ Tự động cache ${missing} video mới...`);
                        setPregenStatus('running');
                        startPregenPolling();
                    }
                } catch (e) { 
                    console.error('Không thể auto cache', e); 
                }
            };
            
            // Đợi 1s rồi mới trigger để tránh spam
            setTimeout(startCache, 1000);
        }
    }, [cacheStats, pregenStatus, isIndexing]);

    // Auto-activate A4 formula when content type is A4
    useEffect(() => {
        if (contentType === 'A4') {
            setUseA4Formula(true);
        }
    }, [contentType]);

    const pollCleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (productSku) {
            // Khi vào Mix Video: luôn quét indexed để lưu 1 lần nữa
            triggerAutoIndexManufacturing(actualProductCategory || '', productSku);
            checkProductVideo(productSku);
        }
        return () => {
            pollCleanupRef.current?.();
        };
    }, [productSku, actualProductCategory]);

    const triggerAutoIndexManufacturing = async (category: string, sku: string) => {
        try {
            console.log(`🛠️ [Go to Mix Video] Quét indexed cho SKU: ${sku}...`);
            const res = await fetch(`${AI_SERVICE_URL}/api/videos/index-manufacturing-folder/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: category,
                    sku: sku
                })
            });
            if (res.ok) toast.success('Đang quét video Sản phẩm...');

            // Poll loadCacheStats ngầm để cập nhật số liệu (không flash loading)
            pollCleanupRef.current?.();
            const delays = [1500, 3000, 6000, 10000, 15000, 20000];
            const timeouts: NodeJS.Timeout[] = [];
            delays.forEach((ms) => {
                timeouts.push(setTimeout(() => loadCacheStats(true), ms));
            });
            pollCleanupRef.current = () => timeouts.forEach((t) => clearTimeout(t));
        } catch (e) {
            console.error("Auto-index triggering failed:", e);
            toast.error('Không thể quét folder Sản phẩm. Vui lòng thử lại.');
        }
    };

    const checkProductVideo = async (sku: string) => {
        try {
            const res = await fetch(`${AI_SERVICE_URL}/api/products/find-video/?sku=${encodeURIComponent(sku)}`);
            const data = await res.json();
            if (data.success) {
                setForcedProductVideoId(data.video_id);
                setForcedProductVideoPath(data.video_path);
                toast.success(`✅ Đã tìm thấy video cho SKU: ${sku}`, { duration: 5000 });
            }
        } catch (e) {
            console.error('Error finding product video:', e);
        }
    };

    const loadVoices = async () => {
        setLoadingVoices(true);
        try {
            const response = await fetch(`${AI_SERVICE_URL}/api/videos/voices/`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.voices) {
                    setVoices(data.voices);
                    if (data.voices.length > 0 && !selectedVoiceId) {
                        setSelectedVoiceId(data.voices[0].voice_id);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load voices:', error);
        } finally {
            setLoadingVoices(false);
        }
    };

    const [audioElapsed, setAudioElapsed] = useState<number>(0);
    const audioTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleGenerateAudio = async () => {
        if (!generatedScript || !selectedVoiceId) {
            toast.error('❌ Cần có script và voice để generate audio!');
            return;
        }

        setGeneratingAudio(true);
        setAudioElapsed(0);

        // Start elapsed timer
        const startTime = Date.now();
        audioTimerRef.current = setInterval(() => {
            setAudioElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        try {
            const response = await fetch(`${AI_SERVICE_URL}/api/videos/generate-audio/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    script: generatedScript,
                    voice_id: selectedVoiceId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate audio');
            }

            const data = await response.json();
            if (data.success && data.audio_url) {
                setGeneratedAudioUrl(data.audio_url);

                // Download and convert to File object
                const audioRes = await fetch(data.audio_url);
                const blob = await audioRes.blob();
                setAudioFile(new File([blob], 'generated_audio.mp3', { type: 'audio/mpeg' }));

                if (data.cached) {
                    toast.success(`⚡ Cache HIT! Audio trả về tức thì (${data.elapsed}s)`, { duration: 3000 });
                } else {
                    const chunkInfo = data.chunks > 1 ? ` (${data.chunks} chunks song song)` : '';
                    toast.success(`✅ Đã tạo audio trong ${data.elapsed}s${chunkInfo} — voice: ${data.voice_name}`);
                }
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setGeneratingAudio(false);
            if (audioTimerRef.current) {
                clearInterval(audioTimerRef.current);
                audioTimerRef.current = null;
            }
        }
    };

    const loadCacheStats = async (silent = false): Promise<CacheStats | null> => {
        if (!silent) setLoadingStats(true);
        try {
            const response = await fetch(`${BE_API_URL}/ai/cache-stats`);
            if (response.ok) {
                const data = await response.json();
                setCacheStats(data);
                return data as CacheStats;
            }
            return null;
        } catch (error) {
            console.error('Failed to load cache stats:', error);
            return null;
        } finally {
            setLoadingStats(false);
        }
    };

    const handleClearIndex = async () => {
        if (!confirm('⚠️ Bạn có chắc muốn XOÁ TOÀN BỘ index? Cần phải index lại từ đầu sau khi xoá!')) return;
        setIsClearingIndex(true);
        try {
            const response = await fetch(`${AI_SERVICE_URL}/api/videos/clear-index/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clear_clips: true })
            });
            const data = await response.json();
            if (data.success) {
                toast.success(`🗑️ ${data.message}`, { duration: 4000 });
                // Reset pregen state
                setPregenStatus('idle');
                setPregenProgress(0);
                setPregenMessage('');
                setPregenDone(0);
                setPregenTotal(0);
                // Chặn auto-scan: nếu không set thì sau khi load stats thấy 0 → auto-scan trigger lại
                hasAutoIndexedRef.current = true;
                // Delay nhỏ để DB commit xong
                await new Promise(r => setTimeout(r, 500));
                setCacheStats(null);
                await loadCacheStats();
                setShowIndexPanel(true); // Mở panel index để re-index ngay
            } else {
                toast.error(`❌ ${data.error || 'Clear index thất bại'}`);
            }
        } catch (error: any) {
            toast.error(`❌ Không thể clear index: ${error.message}`);
        } finally {
            setIsClearingIndex(false);
        }
    };

    // Folder input handlers - Chỉ cho phép update path (folder_type đã fix sẵn)
    const updateFolderPath = (id: string, path: string) => {
        setFolderInputs(folderInputs.map(f =>
            f.id === id ? { ...f, path } : f
        ));
    };

    // Custom folder handlers
    const addCustomFolder = () => {
        setCustomFolders([...customFolders, {
            id: `custom-${Date.now()}`,
            folder_type: '',
            path: ''
        }]);
    };

    const removeCustomFolder = (id: string) => {
        setCustomFolders(customFolders.filter(f => f.id !== id));
    };

    const updateCustomFolder = (id: string, field: 'folder_type' | 'path', value: string) => {
        setCustomFolders(customFolders.map(f =>
            f.id === id ? { ...f, [field]: value } : f
        ));
    };

    // ── Pregen polling ────────────────────────────────────────────────────────
    const startPregenPolling = () => {
        if (pregenPollRef.current) clearInterval(pregenPollRef.current);
        pregenPollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${AI_SERVICE_URL}/api/videos/pregen/status/`);
                if (!res.ok) return;
                const data = await res.json();
                setPregenStatus(data.status);
                setPregenProgress(data.percent || 0);
                setPregenMessage(data.message || '');
                setPregenTotal(data.total || 0);
                setPregenDone(data.done || 0);

                // Refresh cacheStats ngầm (không flash loading)
                await loadCacheStats(true);

                if (data.status === 'completed' || data.status === 'idle') {
                    if (pregenPollRef.current) clearInterval(pregenPollRef.current);
                    if (data.status === 'completed') {
                        const freshStats = await loadCacheStats(true);
                        const indexed = freshStats?.indexed_videos ?? cacheStats?.indexed_videos ?? 0;
                        const cached = freshStats?.cached_clips ?? data.done ?? 0;
                        if (indexed > 0 && cached < indexed * 0.9) {
                            setPregenStatus('partial' as any);
                            toast(`⚠️ Cache ${cached}/${indexed} clips — còn ${indexed - cached} video chưa cache`, { duration: 5000 });
                        } else {
                            toast.success(`✅ Cache hoàn tất! ${cached}/${indexed} clips sẵn sàng — Preview đã được mở khoá!`, { duration: 5000 });
                        }
                    }
                }
                if (data.status === 'error') {
                    if (pregenPollRef.current) clearInterval(pregenPollRef.current);
                }
            } catch (e) {
                // ignore
            }
        }, 3000);
    };

    // Khi mount, kiểm tra xem pregen đang chạy chưa
    useEffect(() => {
        const checkInitialPregen = async () => {
            try {
                const res = await fetch(`${AI_SERVICE_URL}/api/videos/pregen/status/`);
                if (!res.ok) return;
                const data = await res.json();
                setPregenStatus(data.status);
                setPregenProgress(data.percent || 0);
                setPregenMessage(data.message || '');
                setPregenTotal(data.total || 0);
                setPregenDone(data.done || 0);
                if (data.status === 'running') {
                    startPregenPolling();
                }
            } catch (e) { /* ignore */ }
        };
        checkInitialPregen();
        return () => {
            if (pregenPollRef.current) clearInterval(pregenPollRef.current);
        };
    }, []);

    const handleStartIndexing = async () => {
        // Combine default + custom folders
        const allFolders = [...folderInputs, ...customFolders];

        // Validate - Chỉ cần ít nhất 5 folders có đủ type và path
        const validFolders = allFolders.filter(f => f.folder_type.trim() && f.path.trim());
        if (validFolders.length < 5) {
            toast.error('Vui lòng nhập ít nhất 5 folders để có thể mix video!');
            return;
        }

        // Check duplicates
        const types = validFolders.map(f => f.folder_type);
        const uniqueTypes = new Set(types);
        if (types.length !== uniqueTypes.size) {
            // Find duplicates
            const duplicates = types.filter((item, index) => types.indexOf(item) !== index);
            toast.error(`⚠️ Tên folder bị trùng: "${duplicates[0]}". Mỗi tên phải unique!`);
            return;
        }

        setIsIndexing(true);
        setIndexingProgress('Đang bắt đầu indexing...');
        // Reset pregen state
        setPregenStatus('idle');
        setPregenProgress(0);
        setPregenMessage('');
        setPregenDone(0);
        setPregenTotal(0);

        try {
            // Convert to object format
            const folders: { [key: string]: string } = {};
            validFolders.forEach(f => {
                folders[f.folder_type] = f.path;
            });

            const response = await fetch(`${BE_API_URL}/ai/index-folders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folders,
                    videos_per_folder: videosPerFolder
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Indexing failed');
            }

            const data = await response.json();

            setIndexingProgress(`✅ Hoàn tất! Index ${data.total_indexed || 0} videos — Đang cache tự động...`);
            toast.success(`🎉 Index ${data.total_indexed || 0} videos! Đang cache background...`);

            // Reload stats ngầm & start pregen polling (tránh flash "Đang tải...")
            setTimeout(() => {
                loadCacheStats(true);
                setShowIndexPanel(false);
            }, 2000);

            // Start polling pregen status (backend đã gọi start_background_pregen trong index_folders)
            setTimeout(() => {
                setPregenStatus('running');
                startPregenPolling();
            }, 1500);

        } catch (error: any) {
            setIndexingProgress(`❌ Lỗi: ${error.message}`);
            toast.error(error.message);
        } finally {
            setIsIndexing(false);
        }
    };

    const handleMix = async () => {
        // Cần có voice audio (generated hoặc upload)
        if (!generatedAudioUrl && !audioFile) {
            toast.error('❌ Vui lòng generate audio giọng đọc trước!');
            return;
        }

        if (!cacheStats || cacheStats.indexed_videos === 0) {
            toast.error('❌ Chưa index videos! Vui lòng chạy indexing trước.');
            setShowIndexPanel(true);
            return;
        }

        setMixLoading(true);
        setMixProgress(0);
        setMixMessage('');
        setMixError('');
        setMixResult(null);

        try {
            const formData = new FormData();
            // Ưu tiên dùng audio_path (tránh upload lại)
            if (generatedAudioUrl) {
                // generatedAudioUrl là URL như /media/tts_cache/xxx.mp3
                formData.append('audio_path', generatedAudioUrl);
            } else if (audioFile) {
                formData.append('audio', audioFile);
            }
            // Nhạc nền optional (volume thấp)
            if (bgMusicFile) {
                formData.append('background_music', bgMusicFile);
                formData.append('bg_music_volume', (bgMusicVolume / 100).toString());
            }
            if (coverImage) {
                formData.append('cover_image', coverImage);
            }
            formData.append('num_outputs', numOutputs.toString());
            formData.append('width', '540');
            formData.append('height', '960');
            formData.append('use_gpu', useGpu);
            formData.append('use_a4_formula', useA4Formula.toString());

            if (forcedProductVideoId) {
                formData.append('forced_product_video_id', forcedProductVideoId.toString());
            }

            if (actualProductCategory) {
                formData.append('product_category', actualProductCategory);
            }

            if (productId) {
                formData.append('product_id', productId);
            }

            if (productSku) {
                formData.append('product_sku', productSku);
            }

            // Debug logging
            console.log('🎯 Smart Mix Config:', {
                num_outputs: numOutputs,
                use_a4_formula: useA4Formula,
                audio: generatedAudioUrl || audioFile?.name || 'none',
                bg_music: bgMusicFile?.name || 'none',
                bg_volume: bgMusicVolume + '%',
                product_category: actualProductCategory,
                product_id: productId,
                product_sku: productSku
            });

            // Call smart-mix endpoint
            const response = await fetch(`${AI_SERVICE_URL}/api/videos/smart-mix/`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Smart mix failed');
            }

            const data = await response.json();
            const progressId = data.progress_id;

            if (useA4Formula) {
                toast.success('🎯 Mix theo công thức A4 V2 (7 slots, flexible duration)...');
            } else {
                toast.success('⚡ Smart mix bắt đầu (5-13 giây)...');
            }

            // Poll progress
            await pollMixProgress(progressId);

        } catch (error: any) {
            setMixError(error.message || 'Lỗi khi mix video');
            toast.error(error.message);
        } finally {
            setMixLoading(false);
        }
    };

    const pollMixProgress = async (progressId: string) => {
        return new Promise<void>((resolve) => {
            const poll = async () => {
                try {
                    const response = await fetch(`${AI_SERVICE_URL}/api/videos/smart-mix/status/${progressId}/`);

                    if (response.status === 404) {
                        throw new Error('404 Not Found');
                    }

                    const data = await response.json();

                    setMixProgress(data.percent || 0);
                    setMixMessage(data.message || '');

                    if (data.status === 'completed' && data.output_urls) {
                        setMixResult(data);
                        toast.success('🎉 Mix hoàn tất!');
                        resolve();
                        return;
                    }

                    if (data.status === 'error') {
                        setMixError(data.error || 'Lỗi không xác định');
                        toast.error(`❌ ${data.error}`);
                        resolve();
                        return;
                    }

                    setTimeout(poll, 1000); // Poll every 1s
                } catch (error: any) {
                    if (error.message.includes('404')) {
                        console.warn('⚠️ Polling stopped because progress ID not found (likely server restart)');
                        setMixError('Server không tìm thấy progress ID (Vui lòng thử lại)');
                        toast.error('❌ Mất kết nối tiến trình');
                        resolve();
                        return;
                    }

                    // Retry for network errors
                    setTimeout(poll, 2000);
                }
            };
            poll();
        });
    };

    const isReady = cacheStats && cacheStats.indexed_videos > 0;
    const needsIndexing = !cacheStats || cacheStats.indexed_videos === 0;
    // Cache ready: dùng số liệu DB thực tế (không tin pregenStatus vì nó có thể sai)
    // Chỉ ready khi cached_clips >= 90% indexed_videos (cho phép tối đa 10% fail)
    const cacheRatio = cacheStats && cacheStats.indexed_videos > 0
        ? cacheStats.cached_clips / cacheStats.indexed_videos
        : 0;
    const isCacheReady = cacheStats != null &&
        cacheStats.indexed_videos > 0 &&
        cacheRatio >= 0.9;


    if (!cacheStats && loadingStats) {
        return (
            <div className="bg-[#141414] rounded-2xl border border-gray-800 p-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                <p className="text-gray-400 font-medium">Đang tải thông tin index...</p>
                <p className="text-xs text-gray-600">Đang đồng bộ với AI Service</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Indexing Status Overlay */}
            {isIndexing && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                    <div className="bg-[#141414] border border-green-500/30 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl shadow-green-900/30">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
                            <div className="relative w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Đang thiết lập hệ thống...</h3>
                        <p className="text-green-400 text-sm">{indexingProgress}</p>
                        <div className="mt-6 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full animate-pulse w-full" />
                        </div>
                    </div>
                </div>
            )}

            {/* ──── HEADER ──── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0d1f17] to-[#0a1a2e] rounded-2xl border border-green-500/20 p-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full -translate-y-32 translate-x-32 pointer-events-none" />
                <div className="relative flex items-center gap-4">
                    <div className="p-3 bg-green-500/15 rounded-xl border border-green-500/20">
                        <Zap className="w-7 h-7 text-green-400" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-white">Smart Mix Video</h2>
                            <span className="px-2.5 py-0.5 bg-green-500/15 text-green-400 text-xs font-bold rounded-full border border-green-500/25 tracking-wider">20-30× FASTER</span>
                        </div>
                        <p className="text-gray-400 text-sm">Mix trong <strong className="text-green-400">5–13 giây</strong> với pre-processing + lazy loading + GPU acceleration</p>
                    </div>
                </div>
            </div>

            {/* Product Banner */}
            {forcedProductVideoId && (
                <div className="bg-purple-900/20 px-5 py-4 rounded-xl border border-purple-500/25 flex items-center gap-4">
                    <div className="p-2 bg-purple-500/15 rounded-lg border border-purple-500/20">
                        <Package className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                            Video sản phẩm đã khớp
                            <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-mono">{productSku}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Slot "Sản phẩm" sẽ ưu tiên dùng video này.</p>
                        {forcedProductVideoPath && (
                            <p className="text-[10px] text-gray-600 mt-1 font-mono truncate">{forcedProductVideoPath}</p>
                        )}
                    </div>
                    <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                </div>
            )}

            {/* ──── STEP 1: Cache Status ──── */}
            <div className="bg-[#111111] rounded-2xl border border-gray-800/60 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60 bg-[#0d0d0d]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold">1</div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Database className="w-4 h-4 text-blue-400" />
                            Video Index & Cache
                        </h3>
                        {isReady && !isAutoReindexing && (
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20 uppercase tracking-wider">Ready</span>
                        )}
                        {isReady && isAutoReindexing && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20 flex items-center gap-1">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />Đang sync
                            </span>
                        )}
                        {needsIndexing && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20 uppercase tracking-wider">Cần setup</span>
                        )}
                    </div>
                    <button onClick={() => loadCacheStats()} disabled={loadingStats}
                        className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40">
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingStats ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="p-5">
                    {cacheStats && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Indexed Videos', value: cacheStats.indexed_videos, color: 'text-white' },
                                    { label: 'Cached Clips', value: cacheStats.cached_clips, color: 'text-green-400' },
                                    { label: 'Cache Size', value: `${cacheStats.cache_size_gb.toFixed(2)} GB`, color: 'text-purple-400' },
                                    { label: 'GPU', value: cacheStats.gpu_available ? 'Available' : 'No GPU', color: cacheStats.gpu_available ? 'text-green-400' : 'text-amber-400' },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-[#0a0a0a] rounded-xl p-3.5 border border-gray-800/50">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                                        <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {cacheStats.by_folder && Object.keys(cacheStats.by_folder).length > 0 && (
                                <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800/50">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Phân bổ theo folder</p>
                                        {isAutoReindexing && (
                                            <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                                <Loader2 className="w-2.5 h-2.5 animate-spin" />{autoReindexMsg}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(cacheStats.by_folder).map(([type, count]) => {
                                            const isZero = (count as number) === 0;
                                            return (
                                                <div key={type} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isZero
                                                    ? 'bg-amber-500/8 border-amber-500/25'
                                                    : 'bg-[#141414] border-gray-800'
                                                    }`}>
                                                    <span className={`text-xs ${isZero ? 'text-amber-400' : 'text-gray-400'}`}>{type}</span>
                                                    {isZero && isAutoReindexing ? (
                                                        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                                                    ) : (
                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isZero
                                                            ? 'text-amber-400 bg-amber-500/15'
                                                            : 'text-white bg-gray-700'
                                                            }`}>{count as number}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {isAutoReindexing && (
                                        <div className="mt-3 h-0.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse w-full" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pregen (background caching) progress bar */}
                            {(pregenStatus === 'running' || pregenStatus === 'completed' || pregenStatus === 'error' || (pregenStatus as string) === 'partial') && (() => {
                                const _cached = cacheStats?.cached_clips ?? 0;
                                const _indexed = cacheStats?.indexed_videos ?? 0;
                                const _isFullyCached = _indexed > 0 && _cached >= _indexed * 0.9;
                                const effectiveStatus = (pregenStatus === 'completed' && !_isFullyCached) ? 'partial' : pregenStatus;
                                return (
                                <div className={`rounded-xl p-4 border ${effectiveStatus === 'completed'
                                        ? 'bg-green-500/8 border-green-500/25'
                                        : effectiveStatus === 'partial'
                                            ? 'bg-amber-500/8 border-amber-500/25'
                                            : effectiveStatus === 'error'
                                                ? 'bg-red-500/8 border-red-500/25'
                                                : 'bg-blue-500/8 border-blue-500/20'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {effectiveStatus === 'running'
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                                                : effectiveStatus === 'completed'
                                                    ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                                    : effectiveStatus === 'partial'
                                                        ? <span className="text-amber-400 text-xs">⚠️</span>
                                                        : <span className="text-red-400 text-xs">❌</span>
                                            }
                                            <span className={`text-xs font-semibold ${effectiveStatus === 'completed' ? 'text-green-400'
                                                    : effectiveStatus === 'partial' ? 'text-amber-400'
                                                        : effectiveStatus === 'error' ? 'text-red-400'
                                                            : 'text-blue-400'}`}>
                                                {(() => {
                                                    const cached = cacheStats?.cached_clips ?? 0;
                                                    const indexed = cacheStats?.indexed_videos ?? 0;
                                                    const isFullyCached = indexed > 0 && cached >= indexed * 0.9;
                                                    if (pregenStatus === 'completed' && isFullyCached) return '✅ Cache hoàn tất — Preview đã mở khoá!';
                                                    if (pregenStatus === 'completed' && !isFullyCached) return `⚠️ Cache chưa đủ — ${indexed - cached} video chưa cache`;
                                                    if ((pregenStatus as string) === 'partial') return `⚠️ Cache chưa đủ — ${indexed - cached} video không cache được`;
                                                    if (pregenStatus === 'error') return '❌ Cache bị lỗi';
                                                    return '⚡ Đang cache videos...';
                                                })()}
                                            </span>
                                        </div>
                                        <span className={`text-xs font-bold ${effectiveStatus === 'completed' ? 'text-green-400'
                                                : effectiveStatus === 'partial' ? 'text-amber-400'
                                                    : effectiveStatus === 'error' ? 'text-red-400'
                                                        : 'text-blue-400'}`}>
                                            {(() => {
                                                const liveDone = cacheStats?.cached_clips ?? pregenDone;
                                                const liveTotal = cacheStats?.indexed_videos ?? pregenTotal;
                                                const livePct = liveTotal > 0 ? Math.round(liveDone / liveTotal * 100) : pregenProgress;
                                                return `${liveDone}/${liveTotal} (${livePct}%)`;
                                            })()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${effectiveStatus === 'completed'
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                                    : effectiveStatus === 'partial'
                                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                                        : effectiveStatus === 'error'
                                                            ? 'bg-gradient-to-r from-red-500 to-red-400'
                                                            : 'bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse'}`}
                                            style={{ width: `${cacheStats
                                                ? Math.round((cacheStats.cached_clips / (cacheStats.indexed_videos || 1)) * 100)
                                                : pregenProgress}%` }}
                                        />
                                    </div>
                                    {pregenMessage && (
                                        <p className="text-[10px] text-gray-500 mt-1.5 truncate">{pregenMessage}</p>
                                    )}
                                </div>
                                );
                            })()}

                            <div className="flex gap-2">
                                <button onClick={() => setShowIndexPanel(!showIndexPanel)}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
                                    <Database className="w-4 h-4" />
                                    {showIndexPanel ? 'Đóng' : 'Quản lý Folders'}
                                </button>
                                <button onClick={handleClearIndex} disabled={isClearingIndex}
                                    className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 rounded-xl text-red-400 text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isClearingIndex ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {needsIndexing && !loadingStats && (
                        <div className="p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl flex items-center justify-between mt-2">
                            <div>
                                <p className="text-amber-400 text-sm font-semibold mb-0.5">⚠️ Chưa có videos index!</p>
                                <p className="text-amber-300/60 text-xs">Cần index videos trước khi mix.</p>
                            </div>
                            <button onClick={() => setShowIndexPanel(!showIndexPanel)}
                                className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 rounded-lg text-amber-400 text-sm font-semibold transition-colors whitespace-nowrap">
                                {showIndexPanel ? 'Đóng' : 'Bắt đầu Index'}
                            </button>
                        </div>
                    )}

                    {/* Tiến trình Auto-Cache */}
                    {!needsIndexing && pregenStatus === 'idle' && cacheStats && cacheStats.indexed_videos > 0 && cacheStats.cached_clips < cacheStats.indexed_videos && (
                        <div className="p-3.5 bg-blue-500/8 border border-blue-500/20 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                <div>
                                    <p className="text-blue-400 text-xs font-semibold mb-0.5">Đang kích hoạt Auto-Cache...</p>
                                    <p className="text-gray-500 text-[10px]">
                                        Hệ thống phát hiện {cacheStats.indexed_videos - cacheStats.cached_clips} video mới và đang tự động xử lý.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Index Panel */}
                    {showIndexPanel && (
                        <div className="mt-4 space-y-4 bg-gradient-to-br from-blue-900/10 to-purple-900/10 border border-blue-500/15 rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                                    <Database className="w-4 h-4" />
                                    {needsIndexing ? 'Thiết lập Index (lần đầu)' : 'Quản lý & Re-index'}
                                </h4>
                                <button onClick={() => setShowIndexPanel(false)} className="p-1.5 hover:bg-gray-800 rounded-lg">
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            {!needsIndexing && (
                                <div className="p-3 bg-green-500/8 border border-green-500/15 rounded-lg text-xs text-green-400">
                                    ✅ Đã có <strong>{cacheStats?.indexed_videos}</strong> videos. Re-index khi có videos mới.
                                </div>
                            )}

                            {/* Default Folders */}
                            <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FolderOpen className="w-3.5 h-3.5" />Folders mặc định
                                </p>
                                <div className="space-y-2">
                                    {folderInputs.map((folder, idx) => (
                                        <div key={folder.id} className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg px-3 py-2.5 border border-gray-800/60">
                                            <span className="w-5 h-5 flex-shrink-0 text-[10px] font-bold text-purple-400 bg-purple-500/10 rounded-md flex items-center justify-center border border-purple-500/20">{idx + 1}</span>
                                            <span className="text-xs text-gray-300 w-28 flex-shrink-0 font-medium truncate">{folder.folder_type}</span>
                                            <input type="text"
                                                placeholder={`Đường dẫn folder "${folder.folder_type}"`}
                                                value={folder.path}
                                                onChange={(e) => updateFolderPath(folder.id, e.target.value)}
                                                disabled={isIndexing}
                                                className="flex-1 px-3 py-1.5 bg-[#141414] border border-gray-700/60 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500/60 disabled:opacity-50 font-mono"
                                            />
                                            {folder.path.trim() ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> : <div className="w-4 h-4 flex-shrink-0" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Folders */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                        <Plus className="w-3.5 h-3.5" />Folders tùy chỉnh ({customFolders.length})
                                    </p>
                                    <button onClick={addCustomFolder} disabled={isIndexing}
                                        className="px-3 py-1 bg-purple-500/15 hover:bg-purple-500/25 rounded-lg text-purple-400 text-xs font-semibold transition-colors flex items-center gap-1">
                                        <Plus className="w-3 h-3" />Thêm
                                    </button>
                                </div>
                                {customFolders.length === 0 ? (
                                    <div className="border border-dashed border-gray-800 rounded-lg py-3 text-center">
                                        <p className="text-xs text-gray-600">Chưa có folder tùy chỉnh.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {customFolders.map((folder, idx) => (
                                            <div key={folder.id} className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg px-3 py-2.5 border border-purple-500/15">
                                                <span className="w-5 h-5 flex-shrink-0 text-[10px] font-bold text-purple-400 bg-purple-500/15 rounded-md flex items-center justify-center">+{idx + 1}</span>
                                                <input type="text" placeholder="Tên loại"
                                                    value={folder.folder_type}
                                                    onChange={(e) => updateCustomFolder(folder.id, 'folder_type', e.target.value)}
                                                    disabled={isIndexing}
                                                    className="w-24 px-2.5 py-1.5 bg-[#141414] border border-purple-700/40 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500 disabled:opacity-50"
                                                />
                                                <input type="text" placeholder="Đường dẫn folder"
                                                    value={folder.path}
                                                    onChange={(e) => updateCustomFolder(folder.id, 'path', e.target.value)}
                                                    disabled={isIndexing}
                                                    className="flex-1 px-2.5 py-1.5 bg-[#141414] border border-purple-700/40 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500 disabled:opacity-50 font-mono"
                                                />
                                                <button onClick={() => removeCustomFolder(folder.id)} disabled={isIndexing}
                                                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
                                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#0a0a0a] p-3 rounded-lg border border-gray-800/50">
                                    <label className="text-xs text-gray-500 font-medium block mb-1.5">Max videos/folder</label>
                                    <input type="number" min={10} max={5000} value={videosPerFolder}
                                        onChange={(e) => setVideosPerFolder(parseInt(e.target.value) || 50)}
                                        disabled={isIndexing}
                                        className="w-full px-3 py-2 bg-[#141414] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                                    />
                                </div>
                                <div className="bg-[#0a0a0a] p-3 rounded-lg border border-gray-800/50 flex items-end">
                                    <div className="text-xs text-gray-500">
                                        <p>Mặc định: <span className="text-blue-400 font-bold">{folderInputs.filter(f => f.path.trim()).length}</span></p>
                                        <p>Tùy chỉnh: <span className="text-purple-400 font-bold">{customFolders.filter(f => f.folder_type.trim() && f.path.trim()).length}</span></p>
                                    </div>
                                </div>
                            </div>

                            {indexingProgress && (
                                <div className="p-3 bg-blue-500/8 border border-blue-500/15 rounded-lg text-blue-400 text-xs">{indexingProgress}</div>
                            )}

                            <button onClick={handleStartIndexing} disabled={isIndexing}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white text-sm font-bold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                                {isIndexing ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Đang index...</>
                                ) : (
                                    <><Database className="w-4 h-4" />{needsIndexing ? 'BẮT ĐẦU INDEXING' : 'RE-INDEX (Cập nhật)'}</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ──── STEP 2: Config ──── */}
            <div className="bg-[#111111] rounded-2xl border border-gray-800/60 overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800/60 bg-[#0d0d0d]">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-bold">2</div>
                    <h3 className="text-sm font-semibold text-white">Cấu hình Mix</h3>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800/50">
                        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Số video output</label>
                        <input type="number" min={1} max={20} value={numOutputs}
                            onChange={(e) => setNumOutputs(parseInt(e.target.value) || 5)}
                            className="w-full px-3 py-2.5 bg-[#141414] border border-gray-700/60 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                        <p className="text-[10px] text-gray-600 mt-1.5">Số video sẽ tạo ra</p>
                    </div>

                    <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800/50">
                        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                            GPU Acceleration <Info className="w-3.5 h-3.5 text-blue-400" />
                        </label>
                        <select value={useGpu} onChange={(e) => setUseGpu(e.target.value as any)}
                            className="w-full px-3 py-2.5 bg-[#141414] border border-gray-700/60 rounded-lg text-white text-sm focus:outline-none focus:border-green-500">
                            <option value="auto">Auto (khuyến nghị)</option>
                            <option value="true">Force GPU</option>
                            <option value="false">Force CPU</option>
                        </select>
                        <p className={`text-[10px] mt-1.5 ${cacheStats?.gpu_available ? 'text-green-500' : 'text-amber-500'}`}>
                            {cacheStats?.gpu_available ? '✓ GPU khả dụng' : '⚠ Không có GPU'}
                        </p>
                    </div>

                    {/* A4 Formula Toggle */}
                    <div className={`rounded-xl p-4 border-2 transition-all cursor-pointer ${useA4Formula ? 'bg-orange-500/8 border-orange-500/50 shadow-lg shadow-orange-900/10' : 'bg-[#0a0a0a] border-gray-800/50 hover:border-orange-500/30'}`}
                        onClick={() => {
                            setUseA4Formula(!useA4Formula);
                            if (!useA4Formula) {
                                toast.success('✅ BẬT công thức A4 V3 - 7 slots, flexible duration', { duration: 3000 });
                            } else {
                                toast('○ Tắt A4 - dùng Random mode', { duration: 2000 });
                            }
                        }}>
                        <div className="flex items-center justify-between mb-2">
                            <label className={`text-xs font-semibold uppercase tracking-wider ${useA4Formula ? 'text-orange-400' : 'text-gray-500'}`}>
                                Công thức A4 V3
                            </label>
                            {contentType === 'A4' && (
                                <span className="text-[9px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full border border-green-500/25">Khuyên dùng</span>
                            )}
                        </div>
                        <div className={`w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${useA4Formula ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white' : 'bg-[#141414] text-gray-500 border border-gray-700'}`}>
                            {useA4Formula ? '✅ A4 ACTIVE (7 slots)' : '○ Bật A4 Formula'}
                        </div>
                    </div>
                </div>

                {/* A4 Slots Info */}
                {useA4Formula && (
                    <div className="px-5 pb-5">
                        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-orange-500/15">
                            <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider mb-3">Timeline A4 V3 (7 slots)</p>
                            <div className="flex gap-1.5 flex-wrap">
                                {[
                                    { slot: 1, name: 'Sản phẩm', color: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
                                    { slot: 2, name: 'HuyK', color: 'bg-green-500/20 border-green-500/30 text-green-300' },
                                    { slot: 3, name: 'Chế tác', color: 'bg-orange-500/20 border-orange-500/30 text-orange-300' },
                                    { slot: 4, name: 'HuyK', color: 'bg-green-500/20 border-green-500/30 text-green-300' },
                                    { slot: 5, name: 'Chế tác', color: 'bg-orange-500/20 border-orange-500/30 text-orange-300' },
                                    { slot: 6, name: 'SP HT', color: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
                                    { slot: 7, name: 'Outro', color: 'bg-pink-500/20 border-pink-500/30 text-pink-300' },
                                ].map(item => (
                                    <div key={item.slot} className={`flex-1 min-w-0 rounded-lg border px-2 py-2 text-center ${item.color}`}>
                                        <p className="text-[8px] opacity-60 mb-0.5">#{item.slot}</p>
                                        <p className="text-[10px] font-bold truncate">{item.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Cover Image */}
                <div className="px-5 pb-5">
                    <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800/50">
                        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                            <Film className="w-3.5 h-3.5 text-pink-400" /> Ảnh bìa (Cover Image) - <span className="text-gray-600 font-normal">Optional</span>
                        </label>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) { 
                                    if (!file.type.startsWith('image/')) {
                                        toast.error('❌ Vui lòng chọn file ảnh!');
                                        return;
                                    }
                                    setCoverImage(file); 
                                    toast.success(`✅ Đã chọn ảnh bìa: ${file.name}`); 
                                }
                            }} />
                        
                        {!coverImage ? (
                            <button onClick={() => coverInputRef.current?.click()}
                                className="w-full py-4 flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-pink-400 hover:bg-pink-500/3 transition-all group border border-dashed border-gray-800 rounded-lg">
                                <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold">Tải ảnh bìa lên (để làm frame đầu tiên)</span>
                                <span className="text-[10px] text-gray-700">★ Khi đăng, các nền tảng sẽ tự động lấy frame này làm thumbnail.</span>
                            </button>
                        ) : (
                            <div className="flex items-center justify-between bg-[#141414] border border-gray-800 rounded-lg p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded overflow-hidden border border-gray-700">
                                        <img src={URL.createObjectURL(coverImage)} alt="Cover preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white text-xs font-semibold truncate">{coverImage.name}</p>
                                        <p className="text-[10px] text-gray-500">{(coverImage.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button onClick={() => setCoverImage(null)} className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all">
                                    ✕ Xóa
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ──── STEP 3: Audio ──── */}
            <div className="bg-[#111111] rounded-2xl border border-gray-800/60 overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800/60 bg-[#0d0d0d]">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 text-xs font-bold">3</div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Music className="w-4 h-4 text-pink-400" />
                        Audio
                    </h3>
                    {audioFile && (
                        <span className="ml-auto px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20">✓ Đã có file</span>
                    )}
                </div>

                <div className="p-5 space-y-4">
                    {/* Generate from Script */}
                    {generatedScript && (
                        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-purple-500/15">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Generate Audio từ Script AI</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <select value={selectedVoiceId} onChange={(e) => setSelectedVoiceId(e.target.value)}
                                    disabled={loadingVoices || generatingAudio}
                                    className="w-full px-3 py-2.5 bg-[#141414] border border-gray-700/60 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50">
                                    {voices.map(voice => (
                                        <option key={voice.voice_id} value={voice.voice_id}>
                                            {voice.name}{(voice.gender || voice.language) && ` (${voice.gender || '?'}, ${voice.language || '?'})`}
                                            {voice.is_cloned && ' • Clone'}
                                        </option>
                                    ))}
                                </select>

                                <button onClick={handleGenerateAudio}
                                    disabled={!generatedScript || !selectedVoiceId || generatingAudio}
                                    className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {generatingAudio ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo... {audioElapsed}s</>
                                    ) : (
                                        <><Zap className="w-4 h-4" />Generate Audio</>
                                    )}
                                </button>
                            </div>

                            {generatingAudio && (
                                <div className="mt-3 space-y-1.5">
                                    <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000 animate-pulse"
                                            style={{ width: `${Math.min((audioElapsed / (generatedScript && generatedScript.length > 1000 ? 15 : 8)) * 100, 90)}%` }} />
                                    </div>
                                    <p className="text-[10px] text-gray-600 text-center">
                                        {generatedScript && generatedScript.length > 500 ? `⚡ Chia ${Math.ceil(generatedScript.length / 500)} chunks song song` : '📡 Gọi HeyGen API...'}
                                    </p>
                                </div>
                            )}

                            {generatedAudioUrl && (
                                <div className="mt-3 p-2.5 bg-green-500/8 border border-green-500/15 rounded-lg">
                                    <p className="text-green-400 text-xs flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Audio đã tạo thành công!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Background Music Upload (optional) */}
                    <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) { setBgMusicFile(file); toast.success(`✅ Nhạc nền: ${file.name}`); }
                        }} />

                    {/* Background music optional section */}
                    <div className="border border-gray-800/50 rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-900/40 flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                                <Music className="w-3.5 h-3.5" />
                                Nhạc nền <span className="text-gray-600 font-normal">(optional)</span>
                            </span>
                            {bgMusicFile && (
                                <button onClick={() => setBgMusicFile(null)} className="text-xs text-red-400 hover:text-red-300">
                                    ✕ Xóa
                                </button>
                            )}
                        </div>

                        {!bgMusicFile ? (
                            <button onClick={() => audioInputRef.current?.click()}
                                className="w-full py-4 flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-pink-400 hover:bg-pink-500/3 transition-all group">
                                <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="text-xs">Upload nhạc nền (mp3, wav, m4a)</span>
                                <span className="text-[10px] text-gray-700">★ Nếu không upload, video chỉ có giọng HuyK</span>
                            </button>
                        ) : (
                            <div className="p-3 flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-pink-500/15 rounded-lg">
                                        <Music className="w-4 h-4 text-pink-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-xs font-medium truncate">{bgMusicFile.name}</p>
                                        <p className="text-[10px] text-gray-500">{(bgMusicFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                {/* Volume slider */}
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-gray-500 w-20">Volume nhạc nền</span>
                                    <input type="range" min={2} max={30} value={bgMusicVolume}
                                        onChange={(e) => setBgMusicVolume(parseInt(e.target.value))}
                                        className="flex-1 h-1.5 accent-pink-500" />
                                    <span className="text-xs text-pink-400 w-8 text-right">{bgMusicVolume}%</span>
                                </div>
                                <p className="text-[10px] text-gray-600">⚠ Giọng HuyK luôn to hơn. Nhạc chỉ là nền.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ──── STEP 3.5: Preview ──── */}
            <div className="bg-[#111111] rounded-2xl border border-gray-800/60 overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800/60 bg-[#0d0d0d]">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold">4</div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Eye className="w-4 h-4 text-cyan-400" />
                        Xem trước ngay
                        {previewClips.length > 0 && (
                            <span className="text-xs text-cyan-400 font-normal">({previewClips.length} video)</span>
                        )}
                    </h3>
                    {isCacheReady && (
                        <span className="ml-auto px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20">✓ Sẵn sàng</span>
                    )}
                </div>

                <div className="p-5">
                    {!isCacheReady ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                            {pregenStatus === 'running' ? (
                                <>
                                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                    <p className="text-blue-400 text-sm font-semibold">Đang cache videos...</p>
                                    <p className="text-gray-500 text-xs">{pregenDone}/{pregenTotal} ({pregenProgress}%) — Preview sẽ mở sau khi xong</p>
                                    <div className="w-full max-w-xs bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full animate-pulse transition-all" style={{ width: `${pregenProgress}%` }} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Eye className="w-8 h-8 text-gray-600" />
                                    <p className="text-gray-500 text-sm">Preview chưa khả dụng</p>
                                    <p className="text-gray-600 text-xs">
                                        {needsIndexing ? '⚠ Cần index videos trước (bước 1)' : '⚠ Cần cache xong mới xem được — bấm "Cache ngay" ở bước 1'}
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-400">
                                Xem trước <strong className="text-cyan-400">{numOutputs} video</strong> trước khi mix chính thức. Preview dùng cached clips nên hiển thị tức thì.
                            </p>

                            {/* Nút bấm */}
                            <button
                                id="btn-preview-now"
                                onClick={async () => {
                                    if (!audioFile) {
                                        toast.error('⚠ Cần generate audio trước (bước 3)');
                                        return;
                                    }
                                    setPreviewLoading(true);
                                    setPreviewClips([]);
                                    setPreviewError('');
                                    try {
                                        // Gọi virtual-mix với đúng số lượng numOutputs
                                        const formData = new FormData();
                                        formData.append('audio', audioFile);
                                        formData.append('num_outputs', numOutputs.toString());
                                        formData.append('use_a4_formula', useA4Formula ? 'true' : 'false');
                                        if (productSku) formData.append('product_sku', productSku);

                                        const resp = await fetch(`${AI_SERVICE_URL}/api/videos/virtual-mix/`, {
                                            method: 'POST',
                                            body: formData,
                                        });
                                        const data = await resp.json();
                                        if (!resp.ok || data.error) {
                                            setPreviewError(data.message || data.error || 'Preview thất bại');
                                            toast.error(data.message || data.error || 'Preview thất bại');
                                            return;
                                        }
                                        // Lưu toàn bộ manifest để VirtualMixPlayer render đầy đủ tất cả slots
                                        const manifests = (data.manifests || []).filter((m: any) => m.clips?.length > 0);
                                        if (manifests.length === 0) {
                                            setPreviewError('Không có clip để preview. Kiểm tra lại cache.');
                                        } else {
                                            setPreviewClips(manifests);
                                            setSelectedPreviewIdx(0);
                                            toast.success(`✅ Preview ${manifests.length}/${numOutputs} video sẵn sàng!`);
                                        }
                                    } catch (err: any) {
                                        setPreviewError(`Lỗi preview: ${err.message}`);
                                        toast.error(`Lỗi preview: ${err.message}`);
                                    } finally {
                                        setPreviewLoading(false);
                                    }
                                }}
                                disabled={!audioFile || previewLoading}
                                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-xl text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20"
                            >
                                {previewLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo {numOutputs} preview...</>
                                ) : (
                                    <><Eye className="w-4 h-4" />Xem trước ngay ({numOutputs} video)</>
                                )}
                            </button>

                            {/* Hint audio */}
                            {!audioFile && (
                                <p className="text-xs text-center text-amber-500">⚠ Cần generate audio trước (bước 3)</p>
                            )}

                            {/* Lỗi preview */}
                            {previewError && (
                                <div className="p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-red-400 text-xs">{previewError}</div>
                            )}

                            {/* Kết quả preview - tabs Video 1, 2, 3... */}
                            {previewClips.length > 0 && (
                                <div className="space-y-3">
                                    {/* Tab selector */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mr-1">Preview</span>
                                        {previewClips.map((_: any, idx: number) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedPreviewIdx(idx)}
                                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                                    selectedPreviewIdx === idx
                                                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                                                        : 'bg-gray-800/60 border border-gray-700/40 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                                                }`}
                                            >
                                                Video {idx + 1}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Player cho video đang chọn */}
                                    {previewClips[selectedPreviewIdx] && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-600 px-1">
                                                {previewClips[selectedPreviewIdx].slot_count && (
                                                    <span>{previewClips[selectedPreviewIdx].slot_count} slots</span>
                                                )}
                                                {previewClips[selectedPreviewIdx].total_duration && (
                                                    <span className="ml-1">· {previewClips[selectedPreviewIdx].total_duration.toFixed(1)}s</span>
                                                )}
                                            </p>
                                            <VirtualMixPlayer manifest={previewClips[selectedPreviewIdx]} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ──── STEP 5: Mix ──── */}
            <div className="bg-[#111111] rounded-2xl border border-gray-800/60 overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800/60 bg-[#0d0d0d]">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold">5</div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-green-400" />
                        Tiến hành Mix
                        {useA4Formula && <span className="text-orange-400 text-xs font-normal">(A4 Formula)</span>}
                    </h3>
                </div>

                <div className="p-5 space-y-4">
                    {mixError && (
                        <div className="p-3 bg-red-500/8 border border-red-500/15 rounded-xl text-red-400 text-sm">{mixError}</div>
                    )}

                    {!mixLoading && !mixResult && (
                        <button onClick={handleMix} disabled={(!generatedAudioUrl && !audioFile) || needsIndexing || isIndexing || isAutoReindexing || !isCacheReady}
                            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-bold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-green-900/30 text-base">
                            <Zap className="w-5 h-5" />
                            {useA4Formula ? '🎯 BẮT ĐẦU MIX A4 (7 slots)' : '⚡ SMART MIX (5–13s)'}
                        </button>
                    )}
                    {(!generatedAudioUrl && !audioFile) && (
                        <p className="text-xs text-center text-gray-600">⚠ Cần generate audio giọng đọc trước</p>
                    )}
                    {needsIndexing && (
                        <p className="text-xs text-center text-amber-600">⚠ Cần index videos trước (bước 1)</p>
                    )}
                    {!isCacheReady && !needsIndexing && (
                        <p className="text-xs text-center text-blue-500">⚠ Cần cache xong mới mix được — chờ cache ở bước 1</p>
                    )}

                    {/* Progress */}
                    {mixLoading && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 text-xs">{mixMessage || 'Đang xử lý...'}</span>
                                <span className="text-green-400 font-bold">{mixProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500 relative overflow-hidden"
                                    style={{ width: `${mixProgress}%` }}>
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-600 text-center flex items-center justify-center gap-1.5">
                                <Zap className="w-3 h-3 text-green-400" />Smart preprocessing đang hoạt động...
                            </p>
                        </div>
                    )}

                    {/* Results */}
                    {mixResult && (
                        <div className="bg-green-500/8 rounded-xl border border-green-500/20 overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-green-500/15 bg-green-500/5">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-semibold text-green-400">
                                    {useA4Formula ? '🎯 Mix A4 thành công!' : '⚡ Smart Mix hoàn tất!'}
                                    {mixMessage && ` — ${mixMessage}`}
                                </span>
                            </div>
                            {mixResult.output_urls && mixResult.output_urls.length > 0 && (
                                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {mixResult.output_urls.map((url: string, idx: number) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-3 px-3 py-2.5 bg-[#0a0a0a] hover:bg-[#141414] rounded-lg transition-colors border border-gray-800/60 group">
                                            <Film className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                                            <span className="text-sm text-gray-300 flex-1">Video {idx + 1}</span>
                                            <Download className="w-4 h-4 text-green-400" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Info Footer */}
            <div className="bg-[#0d1520] rounded-xl border border-blue-500/10 p-4">
                <p className="text-xs text-blue-400 font-semibold flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4" />Smart Mix hoạt động thế nào?
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {[
                        ['Lần đầu', 'Generate clips (10s) + Mix (3s) ≈ 13s'],
                        ['Lần sau', 'Cached clips + Mix (3s) ≈ 5s'],
                        ['Có GPU', 'Nhanh gấp 3× so với CPU'],
                        ['Cache', 'Tự động LRU cleanup khi đầy'],
                    ].map(([k, v]) => (
                        <div key={k} className="flex items-start gap-1.5">
                            <span className="text-green-400 text-[10px] mt-0.5">•</span>
                            <p className="text-[10px] text-gray-500"><strong className="text-gray-400">{k}:</strong> {v}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
