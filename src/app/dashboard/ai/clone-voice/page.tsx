'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Mic,
    AudioLines,
    Volume2,
    Globe,
    Download,
    Upload,
    Trash2,
    ChevronDown,
    Wand2,
    RefreshCw,
    FolderOpen,
    Check,
    CreditCard,
    ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ────────────────────────── Constants ──────────────────────── */
const LANGUAGES = [
    'Tiếng Việt', 'English', '日本語', '한국어', '中文 (简体)',
    'Español', 'Français', 'Deutsch', 'Português', 'ภาษาไทย',
];

// Maps UI language labels to the `language_boost` value Minimax's TTS API expects.
const LANGUAGE_TO_MINIMAX: Record<string, string> = {
    'Tiếng Việt': 'Vietnamese',
    'English': 'English',
    '日本語': 'Japanese',
    '한국어': 'Korean',
    '中文 (简体)': 'Chinese',
    'Español': 'Spanish',
    'Français': 'French',
    'Deutsch': 'German',
    'Português': 'Portuguese',
    'ภาษาไทย': 'Thai',
};

// Trang nạp tiền / gia hạn gói của MiniMax (mở tab mới, cần đăng nhập tài khoản MiniMax công ty)
const MINIMAX_RECHARGE_URL = 'https://www.minimax.io/platform/user-center/payment/recharge';

// Đơn giá mặc định khi BE chưa cấu hình env MINIMAX_VND_PER_1K_CHARS:
// gói 250.000đ / 500.000 ký tự → 500đ mỗi 1.000 ký tự. BE trả giá khác 0 thì dùng giá BE.
const DEFAULT_VND_PER_1K_CHARS = 500;

// Helper to get API URL
const getApiUrl = () => {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
};

// Helper to build auth header (voice endpoints require a logged-in user)
const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ────────────────────────── Sub-components ─────────────────── */
function SelectDropdown({
    icon: Icon,
    value,
    options,
    onChange,
    label,
}: {
    icon: React.ElementType;
    value: string;
    options: string[];
    onChange: (v: string) => void;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    return (
        <div className="relative" ref={containerRef}>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">{label}</p>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 shadow-sm"
            >
                <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-left truncate">{value}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/10 z-20 max-h-52 overflow-y-auto">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            onClick={() => { onChange(opt); setOpen(false); }}
                            className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors duration-100 first:rounded-t-xl last:rounded-b-xl
                                ${opt === value
                                    ? 'text-violet-700 bg-violet-50 font-medium'
                                    : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Right panel: cloned voice directory + upload ── */
function VoiceContextPanel({
    voices,
    selectedVoiceId,
    onSelectVoiceId,
    cloneFile,
    fileInputRef,
    onFileChange,
    onFileClear,
    cloneVoiceName,
    onCloneVoiceNameChange,
    cloneGender,
    onCloneGenderChange,
    isCloning,
    onCloneSubmit,
    onRefreshVoices,
}: {
    voices: any[];
    selectedVoiceId: string;
    onSelectVoiceId: (id: string) => void;
    cloneFile: File | null;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onFileChange: (f: File | null) => void;
    onFileClear: () => void;
    cloneVoiceName: string;
    onCloneVoiceNameChange: (v: string) => void;
    cloneGender: 'male' | 'female';
    onCloneGenderChange: (g: 'male' | 'female') => void;
    isCloning: boolean;
    onCloneSubmit: () => void;
    onRefreshVoices: () => void;
}) {
    // Chỉ voice Minimax dùng được với endpoint TTS này — voice clone của provider
    // khác (vd HeyGen) nếu hiển thị ở đây sẽ bị BE trả 400 khi generate.
    const clonedVoices = voices.filter(v => v.is_cloned && (v.provider ?? 'minimax') === 'minimax');

    return (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                {/* Directory header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span className="font-medium">Thư mục giọng mẫu ({clonedVoices.length})</span>
                    </div>
                    <button
                        onClick={onRefreshVoices}
                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
                        title="Tải lại danh sách"
                    >
                        <RefreshCw className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                    </button>
                </div>

                {/* Cloned voice list */}
                {clonedVoices.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {clonedVoices.map((voice) => {
                            const isSelected = selectedVoiceId === voice.voice_id;
                            return (
                                <button
                                    key={voice.voice_id}
                                    onClick={() => onSelectVoiceId(voice.voice_id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left border transition-all duration-150
                                        ${isSelected
                                            ? 'bg-cyan-50 border-cyan-300 text-cyan-800 font-medium'
                                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Mic className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-cyan-600' : 'text-gray-400'}`} />
                                        <div className="truncate">
                                            <p className="text-xs font-semibold leading-tight truncate">{voice.name}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5 capitalize leading-none">{voice.gender ?? '—'} · {voice.provider ?? '—'}</p>
                                        </div>
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-2 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                        <p className="text-xs text-gray-400">Chưa có giọng clone nào.</p>
                    </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">hoặc tải giọng mới</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* New clone parameters */}
                <div className="space-y-2.5">
                    <div>
                        <p className="text-[10px] text-gray-500 mb-1 font-medium">Tên giọng nói mới</p>
                        <input
                            type="text"
                            value={cloneVoiceName}
                            onChange={(e) => onCloneVoiceNameChange(e.target.value)}
                            placeholder="Nhập tên KOC / tên bạn..."
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 placeholder-gray-400 shadow-sm
                                focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all duration-200"
                        />
                    </div>

                    <div>
                        <p className="text-[10px] text-gray-500 mb-1 font-medium">Giới tính giọng</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => onCloneGenderChange('female')}
                                className={`py-1.5 rounded-lg border text-xs font-medium transition-all
                                    ${cloneGender === 'female'
                                        ? 'bg-pink-50 border-pink-300 text-pink-700'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                Nữ (Female)
                            </button>
                            <button
                                onClick={() => onCloneGenderChange('male')}
                                className={`py-1.5 rounded-lg border text-xs font-medium transition-all
                                    ${cloneGender === 'male'
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                Nam (Male)
                            </button>
                        </div>
                    </div>

                    {/* Upload zone */}
                    <div
                        onClick={() => !isCloning && fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isCloning) return;
                            const dropped = e.dataTransfer.files?.[0];
                            if (dropped) onFileChange(dropped);
                        }}
                        className={`flex flex-col items-center justify-center gap-2.5 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                            ${cloneFile
                                ? 'border-cyan-300 bg-cyan-50'
                                : 'border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/50'}
                            ${isCloning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            disabled={isCloning}
                            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                        />
                        {cloneFile ? (
                            <>
                                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                                    <AudioLines className="w-4 h-4 text-cyan-600" />
                                </div>
                                <div className="text-center px-2">
                                    <p className="text-[11px] font-semibold text-gray-800 truncate max-w-[200px]">{cloneFile.name}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">{(cloneFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onFileClear(); }}
                                    disabled={isCloning}
                                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" /> Xóa file
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <Upload className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="text-center px-2">
                                    <p className="text-xs font-medium text-gray-600">Chọn hoặc thả file audio</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Hỗ trợ MP3, WAV (tối đa 20MB)</p>
                                </div>
                            </>
                        )}
                    </div>

                    {cloneFile && (
                        <button
                            onClick={onCloneSubmit}
                            disabled={isCloning || !cloneVoiceName.trim()}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
                                ${isCloning || !cloneVoiceName.trim()
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-md shadow-cyan-200 hover:-translate-y-0.5'}`}
                        >
                            {isCloning ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Đang Clone Giọng AI...
                                </>
                            ) : (
                                <>
                                    <AudioLines className="w-4 h-4" />
                                    Clone Giọng Minimax
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        );
}

/* ─────────────────────────── Page ──────────────────────────── */
export default function CloneVoicePage() {
    const [voices, setVoices] = useState<any[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('3f7bd9c515cb40cead3a233461c713ca'); // default HuyK
    const [text, setText] = useState('');
    const [translateLang, setTranslateLang] = useState('Tiếng Việt');
    const [ttsLang, setTtsLang] = useState('Tiếng Việt');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    // Link riêng cho nút tải về (proxy BE + ?download=1 → server trả Content-Disposition
    // attachment). Thuộc tính download của <a> bị trình duyệt bỏ qua với link cross-origin
    // nên không dựa vào nó được.
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    // Tên file tải về, dạng "<tên giọng>_<ngày>_<giờ phút>.mp3" — BE nhận qua ?filename=
    const [downloadName, setDownloadName] = useState<string | null>(null);
    // Đơn giá VND / 1000 ký tự (BE trả kèm trong /ai/voice/list; 0 = chưa cấu hình → ẩn phần tiền)
    const [vndPer1kChars, setVndPer1kChars] = useState(0);

    // Cloning states
    const [cloneFile, setCloneFile] = useState<File | null>(null);
    const [cloneVoiceName, setCloneVoiceName] = useState('');
    const [cloneGender, setCloneGender] = useState<'male' | 'female'>('female');
    const [isCloning, setIsCloning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const charCount = text.length;
    const maxChars = 5000;
    // MiniMax tính phí theo ký tự ("điểm âm thanh") — ước tính tiền cho đoạn text hiện tại.
    // BE chưa cấu hình giá thì dùng giá mặc định để ô tiền luôn hiển thị.
    const effectiveVndPer1k = vndPer1kChars > 0 ? vndPer1kChars : DEFAULT_VND_PER_1K_CHARS;
    const estimatedCostVnd = Math.round((charCount / 1000) * effectiveVndPer1k);

    // Fetch voices on mount
    const fetchVoices = async () => {
        try {
            const res = await fetch(`${getApiUrl()}/ai/voice/list`, {
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Không thể lấy danh sách giọng nói');
            const data = await res.json();
            if (data.success && data.voices) {
                setVoices(data.voices);
                setVndPer1kChars(Number(data.pricing?.vnd_per_1k_chars) || 0);

                // Select the first cloned voice if the current selection isn't a cloned voice
                const cloned = data.voices.filter((v: any) => v.is_cloned && (v.provider ?? 'minimax') === 'minimax');
                if (cloned.length > 0) {
                    const exists = cloned.some((v: any) => v.voice_id === selectedVoiceId);
                    if (!exists) {
                        setSelectedVoiceId(cloned[0].voice_id);
                    }
                }
            }
        } catch (error: any) {
            console.error('Fetch voices error:', error);
            toast.error(error.message || 'Lỗi khi tải danh sách giọng nói');
        }
    };

    useEffect(() => {
        fetchVoices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const MAX_CLONE_FILE_SIZE = 20 * 1024 * 1024; // 20MB, matches UI copy + BE limit

    const handleFileSelect = (f: File | null) => {
        if (!f) {
            setCloneFile(null);
            return;
        }
        if (!f.type.startsWith('audio/')) {
            toast.error('Vui lòng chọn file audio (MP3, WAV...)');
            return;
        }
        if (f.size > MAX_CLONE_FILE_SIZE) {
            toast.error('File audio vượt quá 20MB');
            return;
        }
        setCloneFile(f);
    };

    const clearCloneFile = () => {
        setCloneFile(null);
        // Reset the native input value too, otherwise re-selecting the same file
        // afterwards doesn't fire a change event.
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Handle voice cloning. Chạy nền + poll trạng thái thay vì 1 request chờ trực
    // tiếp — mạng tới Minimax có thể chập chờn vài phút, request đồng bộ dễ bị
    // BE/trình duyệt tự timeout dù cuối cùng Minimax vẫn xử lý xong.
    const handleCloneSubmit = async () => {
        if (!cloneFile || !cloneVoiceName.trim()) {
            toast.error('Vui lòng điền tên giọng và chọn file audio mẫu');
            return;
        }

        // Chặn sớm clone trùng tên (server cũng chặn) — mỗi lần clone đều tính phí
        // MiniMax và tạo voice_id mới, trùng tên gần như luôn là thao tác nhầm.
        const dupe = voices.find(
            (v) => v.is_cloned && (v.name || '').trim().toLowerCase() === cloneVoiceName.trim().toLowerCase(),
        );
        if (dupe) {
            toast.error(`Đã có giọng clone tên "${dupe.name}". Đặt tên khác hoặc xoá giọng cũ trước khi clone lại (mỗi lần clone đều tính phí).`);
            return;
        }

        setIsCloning(true);
        const loadingToast = toast.loading('Đang tải audio lên...');

        try {
            const formData = new FormData();
            formData.append('file', cloneFile);
            formData.append('voice_name', cloneVoiceName);
            formData.append('gender', cloneGender);

            const startRes = await fetch(`${getApiUrl()}/ai/voice/clone/start`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });

            if (!startRes.ok) {
                // BE Nest trả { message }, AI service (Django) trả { error } — đọc cả hai
                const errMessage = await startRes.json().then((d) => d.error || d.message).catch(() => null);
                throw new Error(errMessage || 'Lỗi khi bắt đầu clone giọng nói');
            }

            const startData = await startRes.json();
            const jobId = startData.job_id;
            if (!jobId) {
                throw new Error('Không nhận được job_id từ server');
            }

            // Poll trạng thái — mạng xấu có thể khiến job mất vài phút mới xong.
            const POLL_INTERVAL_MS = 4000;
            const MAX_POLL_MS = 10 * 60 * 1000; // 10 phút
            const startedAt = Date.now();

            // eslint-disable-next-line no-constant-condition
            while (true) {
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

                const statusRes = await fetch(`${getApiUrl()}/ai/voice/clone/status/${jobId}`, {
                    headers: getAuthHeaders(),
                });
                if (!statusRes.ok) {
                    throw new Error('Không thể kiểm tra trạng thái clone');
                }
                const statusData = await statusRes.json();

                if (statusData.status === 'completed') {
                    toast.success(`Đã clone giọng "${statusData.voice?.name}" thành công!`, { id: loadingToast });
                    clearCloneFile();
                    setCloneVoiceName('');
                    if (statusData.voice?.voice_id) setSelectedVoiceId(statusData.voice.voice_id);
                    await fetchVoices();
                    break;
                }
                if (statusData.status === 'error') {
                    throw new Error(statusData.message || 'Clone thất bại');
                }
                if (Date.now() - startedAt > MAX_POLL_MS) {
                    throw new Error('Clone đang mất nhiều thời gian hơn dự kiến — mạng tới Minimax có thể đang chập chờn. Vui lòng thử lại sau.');
                }
                toast.loading(statusData.message || 'Đang xử lý...', { id: loadingToast });
            }
        } catch (error: any) {
            console.error('Clone error:', error);
            toast.error(error.message || 'Lỗi khi clone giọng nói', { id: loadingToast });
        } finally {
            setIsCloning(false);
        }
    };

    // Handle TTS generation
    const handleGenerate = async () => {
        if (!text.trim()) {
            toast.error('Vui lòng nhập văn bản cần đọc');
            return;
        }

        const usable = voices.some(
            (v) => v.voice_id === selectedVoiceId && v.is_cloned && (v.provider ?? 'minimax') === 'minimax',
        );
        if (!usable) {
            toast.error('Vui lòng chọn một giọng đã clone (Minimax) trong danh sách, hoặc clone giọng mới trước.');
            return;
        }

        setIsGenerating(true);
        const generatingToast = toast.loading('Đang chuyển văn bản thành giọng nói...');

        try {
            const res = await fetch(`${getApiUrl()}/ai/voice/tts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({
                    text,
                    voice_id: selectedVoiceId,
                    speed: 1.0,
                    pitch: 0,
                    volume: 100,
                    language: LANGUAGE_TO_MINIMAX[ttsLang],
                }),
            });

            if (!res.ok) {
                const errMessage = await res.json().then((d) => d.error || d.message).catch(() => null);
                throw new Error(errMessage || 'Không thể tạo giọng nói');
            }

            const data = await res.json();
            if (data.success && data.audio_url) {
                // Có audio_file_id (đã upload Drive) → phát + tải qua proxy stream của BE.
                // Link Drive uc?export=download không stream chuẩn cho <audio> (player
                // hiện 00:00) và tải về hay lỗi; link gốc chỉ giữ làm fallback.
                // Drive chưa cấu hình → BE trả audio_file_name, phát/tải qua proxy
                // stream thẳng từ AI (link /media/... gốc chết trên production).
                const proxyUrl = data.audio_file_id
                    ? `${getApiUrl()}/ai/voice/tts/audio/${data.audio_file_id}`
                    : data.audio_file_name
                        ? `${getApiUrl()}/ai/voice/tts/stream/${data.audio_file_name}`
                        : null;

                // Tên file tải về: "<tên giọng>_<ngày>_<giờ phút>.mp3", bỏ ký tự cấm trong tên file
                const voiceName = (voices.find((v) => v.voice_id === selectedVoiceId)?.name || 'voice')
                    .replace(/[\/\\:*?"<>|]+/g, ' ')
                    .trim();
                const now = new Date();
                const pad = (n: number) => String(n).padStart(2, '0');
                const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
                const fileName = `${voiceName}_${stamp}.mp3`;

                setGeneratedUrl(proxyUrl ?? data.audio_url);
                setDownloadUrl(
                    proxyUrl
                        ? `${proxyUrl}?download=1&filename=${encodeURIComponent(fileName)}`
                        : data.audio_url,
                );
                setDownloadName(fileName);
                toast.success('Đã tạo giọng nói thành công!', { id: generatingToast });
            } else {
                throw new Error(data.error || 'Tạo giọng nói thất bại');
            }
        } catch (error: any) {
            console.error('TTS error:', error);
            toast.error(error.message || 'Lỗi khi tạo giọng nói', { id: generatingToast });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 -m-6">
            {/* Main content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

                    {/* ── Left panel ── */}
                    <div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            {/* Card header */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                                    <Mic className="w-5 h-5 text-violet-600" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-semibold text-gray-800">Text to Speech (Minimax AI)</h2>
                                    <p className="text-xs text-gray-500">Nhập văn bản, chọn ngôn ngữ và tạo giọng nói tự nhiên</p>
                                </div>
                                {/* Hết token / hết hạn gói MiniMax → nạp tiền hoặc gia hạn ngay tại đây */}
                                <a
                                    href={MINIMAX_RECHARGE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Mở trang nạp tiền / gia hạn gói MiniMax (cần đăng nhập tài khoản MiniMax của công ty)"
                                    className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors whitespace-nowrap flex-shrink-0"
                                >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    Nạp tiền / Gia hạn MiniMax
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                </a>
                            </div>

                            {/* Textarea */}
                            <p className="text-xs text-gray-500 mb-2 font-medium">Kịch bản / Văn bản</p>
                            <div className="relative">
                                <textarea
                                    id="tts-text-input"
                                    value={text}
                                    onChange={(e) => setText(e.target.value.slice(0, maxChars))}
                                    placeholder="Nhập văn bản cần đọc..."
                                    rows={9}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-700 placeholder-gray-400 resize-none shadow-sm
                                        focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all duration-200"
                                />
                                <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs">
                                    <span
                                        className="px-2 py-0.5 rounded-md bg-green-50 border border-green-200 text-green-700 font-semibold cursor-help"
                                        title={`Đơn giá ${effectiveVndPer1k.toLocaleString('vi-VN')}đ / 1.000 ký tự${vndPer1kChars > 0 ? '' : ' (giá mặc định gói 250.000đ/500.000 ký tự — chỉnh qua env MINIMAX_VND_PER_1K_CHARS của BE)'}`}
                                    >
                                        💰 ≈ {estimatedCostVnd.toLocaleString('vi-VN')}đ
                                    </span>
                                    <span className="text-gray-400">{charCount} / {maxChars} ký tự</span>
                                </div>
                            </div>

                            {/* Language selects */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                <SelectDropdown
                                    icon={Globe}
                                    label="Dịch sang"
                                    value={translateLang}
                                    options={LANGUAGES}
                                    onChange={setTranslateLang}
                                />
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <SelectDropdown
                                            icon={Volume2}
                                            label="Ngôn ngữ đọc (TTS)"
                                            value={ttsLang}
                                            options={LANGUAGES}
                                            onChange={setTtsLang}
                                        />
                                    </div>
                                    <button
                                        onClick={() => toast('Tính năng dịch kịch bản chưa được hỗ trợ', { icon: 'ℹ️' })}
                                        className="mb-0.5 px-3.5 py-2.5 bg-violet-50 border border-violet-200 hover:bg-violet-100 rounded-xl text-xs text-violet-600 font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        Dịch kịch bản
                                    </button>
                                </div>
                            </div>

                            {/* Generate button */}
                            <button
                                id="generate-voice-btn"
                                onClick={handleGenerate}
                                disabled={!text.trim() || isGenerating}
                                className={`mt-5 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200
                                    ${text.trim() && !isGenerating
                                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-200 hover:-translate-y-0.5'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Đang tạo giọng nói...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4" />
                                        Tạo giọng nói
                                    </>
                                )}
                            </button>

                            {/* Audio result */}
                            {generatedUrl && (
                                <div className="mt-4 p-3.5 bg-violet-50 border border-violet-200 rounded-xl">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                                <AudioLines className="w-4 h-4 text-violet-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-800">Giọng nói đã tạo</p>
                                                <p className="text-[11px] text-gray-500">{downloadName ?? 'minimax_voice.mp3'}</p>
                                            </div>
                                        </div>
                                        <a
                                            href={downloadUrl ?? generatedUrl}
                                            download={downloadName ?? 'minimax_voice.mp3'}
                                            rel="noreferrer"
                                            className="w-8 h-8 rounded-lg bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition-colors"
                                            title="Tải xuống"
                                        >
                                            <Download className="w-3.5 h-3.5 text-violet-600" />
                                        </a>
                                    </div>
                                    {/* Player nghe trực tiếp trên web — không cần tải về */}
                                    <audio
                                        ref={audioRef}
                                        src={generatedUrl}
                                        controls
                                        autoPlay
                                        className="w-full mt-3 h-10"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right panel ── */}
                    <div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            {/* Section header */}
                            <div className="flex items-center gap-2 mb-4">
                                <Mic className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-semibold text-gray-700">Giọng đã clone</span>
                            </div>

                            {/* Cloned voice panel */}
                            <VoiceContextPanel
                                voices={voices}
                                selectedVoiceId={selectedVoiceId}
                                onSelectVoiceId={setSelectedVoiceId}
                                cloneFile={cloneFile}
                                fileInputRef={fileInputRef}
                                onFileChange={handleFileSelect}
                                onFileClear={clearCloneFile}
                                cloneVoiceName={cloneVoiceName}
                                onCloneVoiceNameChange={setCloneVoiceName}
                                cloneGender={cloneGender}
                                onCloneGenderChange={setCloneGender}
                                isCloning={isCloning}
                                onCloneSubmit={handleCloneSubmit}
                                onRefreshVoices={fetchVoices}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
