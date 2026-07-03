'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Mic,
    AudioLines,
    Zap,
    Volume2,
    Globe,
    Play,
    Download,
    Upload,
    Trash2,
    ChevronDown,
    Sliders,
    Wand2,
    Palette,
    RefreshCw,
    FolderOpen,
    Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────────────────────── Types ─────────────────────────── */
type VoiceMode = 'female-fast' | 'male-fast' | 'custom' | 'design';

interface VoiceModeConfig {
    id: VoiceMode;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    activeColor: string;
    activeBg: string;
    activeBorder: string;
    activeText: string;
}

/* ────────────────────────── Constants ──────────────────────── */
const VOICE_MODES: VoiceModeConfig[] = [
    {
        id: 'female-fast',
        label: 'Giọng nữ (nhanh)',
        sublabel: 'Free, không cần GPU',
        icon: Zap,
        activeColor: 'text-violet-600',
        activeBg: 'bg-violet-50',
        activeBorder: 'border-violet-400',
        activeText: 'text-violet-700',
    },
    {
        id: 'male-fast',
        label: 'Giọng nam (nhanh)',
        sublabel: 'Free, không cần GPU',
        icon: Zap,
        activeColor: 'text-indigo-600',
        activeBg: 'bg-indigo-50',
        activeBorder: 'border-indigo-400',
        activeText: 'text-indigo-700',
    },
    {
        id: 'custom',
        label: 'Giọng tùy chọn',
        sublabel: 'Clone (cần GPU)',
        icon: Mic,
        activeColor: 'text-cyan-600',
        activeBg: 'bg-cyan-50',
        activeBorder: 'border-cyan-400',
        activeText: 'text-cyan-700',
    },
    {
        id: 'design',
        label: 'Thiết kế giọng',
        sublabel: 'Tạo giọng tùy chỉnh',
        icon: Palette,
        activeColor: 'text-pink-600',
        activeBg: 'bg-pink-50',
        activeBorder: 'border-pink-400',
        activeText: 'text-pink-700',
    },
];

const LANGUAGES = [
    'Tiếng Việt', 'English', '日本語', '한국어', '中文 (简体)',
    'Español', 'Français', 'Deutsch', 'Português', 'ภาษาไทย',
];

// Helper to get API URL
const getApiUrl = () => {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
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
    return (
        <div className="relative">
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

function SliderControl({
    label,
    value,
    min,
    max,
    step,
    unit,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onChange: (v: number) => void;
}) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <span className="text-xs font-semibold text-violet-600">{value}{unit}</span>
            </div>
            <div className="relative h-1.5 bg-gray-200 rounded-full">
                <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                    style={{ width: `${pct}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-violet-500 shadow-md shadow-violet-200 pointer-events-none"
                    style={{ left: `calc(${pct}% - 7px)` }}
                />
            </div>
        </div>
    );
}

/* ── Right panel contextual section ── */
function VoiceContextPanel({
    mode,
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
    designPrompt,
    onDesignPromptChange,
    onRefreshVoices,
}: {
    mode: VoiceMode;
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
    designPrompt: string;
    onDesignPromptChange: (v: string) => void;
    onRefreshVoices: () => void;
}) {
    if (mode === 'design') {
        return (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div>
                    <p className="text-xs text-gray-600 font-medium mb-1.5">Mô tả giọng (tiếng Anh)</p>
                    <input
                        type="text"
                        value={designPrompt}
                        onChange={(e) => onDesignPromptChange(e.target.value)}
                        placeholder="female, calm, vietnamese accent"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 shadow-sm
                            focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all duration-200"
                    />
                    <p className="text-[11px] text-gray-400 mt-1.5">gender, age, pitch, accent, style...</p>
                </div>
            </div>
        );
    }

    if (mode === 'custom') {
        // Filter cloned voices (e.g. minimax provider or HeyGen custom ones)
        const clonedVoices = voices.filter(v => v.is_cloned);

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
                                            <p className="text-[10px] text-gray-400 mt-0.5 capitalize leading-none">{voice.gender} · {voice.provider}</p>
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

    return null;
}

/* ─────────────────────────── Page ──────────────────────────── */
export default function CloneVoicePage() {
    const [selectedMode, setSelectedMode] = useState<VoiceMode>('female-fast');
    const [voices, setVoices] = useState<any[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('3f7bd9c515cb40cead3a233461c713ca'); // default HuyK
    const [text, setText] = useState('');
    const [translateLang, setTranslateLang] = useState('Tiếng Việt');
    const [ttsLang, setTtsLang] = useState('Tiếng Việt');
    const [speed, setSpeed] = useState(1.0);
    const [pitch, setPitch] = useState(0);
    const [volume, setVolume] = useState(100);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    
    // Cloning states
    const [cloneFile, setCloneFile] = useState<File | null>(null);
    const [cloneVoiceName, setCloneVoiceName] = useState('');
    const [cloneGender, setCloneGender] = useState<'male' | 'female'>('female');
    const [isCloning, setIsCloning] = useState(false);
    const [designPrompt, setDesignPrompt] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const charCount = text.length;
    const maxChars = 5000;

    // Fetch voices on mount
    const fetchVoices = async () => {
        try {
            const res = await fetch(`${getApiUrl()}/ai/voice/list`);
            if (!res.ok) throw new Error('Không thể lấy danh sách giọng nói');
            const data = await res.json();
            if (data.success && data.voices) {
                setVoices(data.voices);
                
                // If in custom mode, select the first cloned voice if current selected isn't cloned
                const cloned = data.voices.filter((v: any) => v.is_cloned);
                if (selectedMode === 'custom' && cloned.length > 0) {
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
    }, [selectedMode]);

    // Handle voice cloning
    const handleCloneSubmit = async () => {
        if (!cloneFile || !cloneVoiceName.trim()) {
            toast.error('Vui lòng điền tên giọng và chọn file audio mẫu');
            return;
        }

        setIsCloning(true);
        const loadingToast = toast.loading('Đang upload và clone giọng nói bằng Minimax...');

        try {
            const formData = new FormData();
            formData.append('file', cloneFile);
            formData.append('voice_name', cloneVoiceName);
            formData.append('gender', cloneGender);

            const res = await fetch(`${getApiUrl()}/ai/voice/clone`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Lỗi khi clone giọng nói');
            }

            const data = await res.json();
            if (data.success && data.voice) {
                toast.success(`Đã clone giọng "${data.voice.name}" thành công!`, { id: loadingToast });
                setCloneFile(null);
                setCloneVoiceName('');
                
                // Update selected voice to the new voice
                setSelectedVoiceId(data.voice.voice_id);
                // Refresh list
                await fetchVoices();
            } else {
                throw new Error(data.error || 'Clone thất bại');
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

        setIsGenerating(true);
        const generatingToast = toast.loading('Đang chuyển văn bản thành giọng nói...');

        // Map system modes to Minimax system voice IDs or use selected cloned voice
        let activeVoiceId = selectedVoiceId;
        if (selectedMode === 'female-fast') {
            activeVoiceId = 'female-tianmei'; // Standard Minimax system female
        } else if (selectedMode === 'male-fast') {
            activeVoiceId = 'male-qn-qingse'; // Standard Minimax system male
        } else if (selectedMode === 'design') {
            activeVoiceId = 'female-yujie'; // Standard designed voice fallback
        }

        try {
            const res = await fetch(`${getApiUrl()}/ai/voice/tts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    voice_id: activeVoiceId,
                    speed,
                    pitch,
                    volume,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Không thể tạo giọng nói');
            }

            const data = await res.json();
            if (data.success && data.audio_url) {
                setGeneratedUrl(data.audio_url);
                toast.success('Đã tạo giọng nói thành công!', { id: generatingToast });
                
                // Play audio automatically
                if (audioRef.current) {
                    audioRef.current.src = data.audio_url;
                    audioRef.current.play().catch(() => {});
                }
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

    const selectedModeConfig = VOICE_MODES.find((m) => m.id === selectedMode)!;

    return (
        <div className="min-h-screen bg-gray-50 -m-6">
            {/* Hidden audio element for autoplay */}
            <audio ref={audioRef} className="hidden" />

            {/* Main content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

                    {/* ── Left panel ── */}
                    <div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            {/* Card header */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                    <Mic className="w-5 h-5 text-violet-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-800">Text to Speech (Minimax AI)</h2>
                                    <p className="text-xs text-gray-500">Nhập văn bản, chọn ngôn ngữ và tạo giọng nói tự nhiên</p>
                                </div>
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
                                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                                    {charCount} / {maxChars} ký tự
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
                                    <button className="mb-0.5 px-3.5 py-2.5 bg-violet-50 border border-violet-200 hover:bg-violet-100 rounded-xl text-xs text-violet-600 font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                                        <Globe className="w-3.5 h-3.5" />
                                        Dịch kịch bản
                                    </button>
                                </div>
                            </div>

                            {/* Sliders */}
                            <div className="mt-5 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sliders className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tùy chọn giọng nói</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <SliderControl label="Tốc độ" value={speed} min={0.5} max={2.0} step={0.1} unit="x" onChange={setSpeed} />
                                    <SliderControl label="Cao độ" value={pitch} min={-10} max={10} step={1} unit="" onChange={setPitch} />
                                    <SliderControl label="Âm lượng" value={volume} min={0} max={100} step={5} unit="%" onChange={setVolume} />
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
                                                <p className="text-[11px] text-gray-500">output_voice.mp3</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    if (audioRef.current) {
                                                        audioRef.current.src = generatedUrl;
                                                        audioRef.current.play().catch(() => {});
                                                    }
                                                }}
                                                className="w-8 h-8 rounded-lg bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition-colors"
                                                title="Nghe lại"
                                            >
                                                <Play className="w-3.5 h-3.5 text-violet-600" />
                                            </button>
                                            <a 
                                                href={generatedUrl} 
                                                download="minimax_voice.mp3"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-8 h-8 rounded-lg bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition-colors"
                                                title="Tải xuống"
                                            >
                                                <Download className="w-3.5 h-3.5 text-violet-600" />
                                            </a>
                                        </div>
                                    </div>
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
                                <span className="text-sm font-semibold text-gray-700">Chế độ giọng</span>
                            </div>

                            {/* 2×2 mode grid */}
                            <div className="grid grid-cols-2 gap-2.5">
                                {VOICE_MODES.map((mode) => {
                                    const Icon = mode.icon;
                                    const active = selectedMode === mode.id;
                                    return (
                                        <button
                                            key={mode.id}
                                            id={`voice-mode-${mode.id}`}
                                            onClick={() => setSelectedMode(mode.id)}
                                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border text-center transition-all duration-200
                                                ${active
                                                    ? `${mode.activeBg} ${mode.activeBorder} shadow-sm`
                                                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                                        >
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? mode.activeBg : 'bg-gray-100'}`}>
                                                <Icon
                                                    className={active ? mode.activeColor : 'text-gray-400'}
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                            </div>
                                            <div>
                                                <p className={`text-xs font-semibold leading-tight ${active ? mode.activeText : 'text-gray-600'}`}>
                                                    {mode.label}
                                                </p>
                                                <p className={`text-[11px] mt-0.5 leading-tight ${active ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {mode.sublabel}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Contextual panel */}
                            <VoiceContextPanel
                                mode={selectedMode}
                                voices={voices}
                                selectedVoiceId={selectedVoiceId}
                                onSelectVoiceId={setSelectedVoiceId}
                                cloneFile={cloneFile}
                                fileInputRef={fileInputRef}
                                onFileChange={setCloneFile}
                                onFileClear={() => setCloneFile(null)}
                                cloneVoiceName={cloneVoiceName}
                                onCloneVoiceNameChange={setCloneVoiceName}
                                cloneGender={cloneGender}
                                onCloneGenderChange={setCloneGender}
                                isCloning={isCloning}
                                onCloneSubmit={handleCloneSubmit}
                                designPrompt={designPrompt}
                                onDesignPromptChange={setDesignPrompt}
                                onRefreshVoices={fetchVoices}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
