import Image from "next/image";
import React, { useEffect, useRef, useState } from 'react';
import { Activity, ImagePlus, X, Loader2 } from 'lucide-react';

/** /lark/* yêu cầu đăng nhập (JwtAuthGuard) — phải gắn token cho fetch thủ công. */
function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const TRAFFIC_PLATFORMS = [
    { id: 'fb', label: 'Traffic FB' },
    { id: 'ig', label: 'Traffic IG' },
    { id: 'tiktok', label: 'Traffic Tiktok' },
    { id: 'yt', label: 'Traffic YT' },
    { id: 'thread', label: 'Traffic Thread' },
    { id: 'zalo', label: 'Traffic Zalo' },
];

export interface TrafficData {
    fb: string;
    ig: string;
    tiktok: string;
    yt: string;
    thread: string;
    zalo: string;
}

export const initialTrafficData = (): TrafficData => ({
    fb: '',
    ig: '',
    tiktok: '',
    yt: '',
    thread: '',
    zalo: '',
});

export const initialTrafficChannels = (): TrafficData => ({
    fb: '',
    ig: '',
    tiktok: '',
    yt: '',
    thread: '',
    zalo: '',
});

interface TrafficEntry {
    id: string;
    value: string;
    channel: string;
    evidences?: { url: string; name: string; token: string }[];
}

interface TrafficReportSectionProps {
    values: TrafficData;
    channels: TrafficData;
    availableChannels?: any[];
    onChange: (platformId: keyof TrafficData, value: string) => void;
    onChannelChange: (platformId: keyof TrafficData, value: string) => void;
    onPlatformEvidenceChange?: (platformEvidences: Record<string, string[]>) => void;
    onEntriesChange?: (entries: Record<string, TrafficEntry[]>) => void;
    readOnly?: boolean;
    initialEvidences?: Record<string, { url: string; name: string; token: string }[]>;
    initialEntries?: Record<string, TrafficEntry[]>;
}

const TrafficReportSection: React.FC<TrafficReportSectionProps> = ({ 
    values, 
    channels,
    availableChannels = [],
    onChange, 
    onChannelChange,
    onPlatformEvidenceChange,
    onEntriesChange,
    readOnly,
    initialEvidences,
    initialEntries
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingPlatform, setUploadingPlatform] = useState<string | null>(null);
    const [activeTarget, setActiveTarget] = useState<{ platformId: string; entryId: string } | null>(null);
    const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

    // Internal state to track multiple entries per platform
    const [entries, setEntries] = useState<Record<string, TrafficEntry[]>>(() => {
        if (initialEntries && Object.keys(initialEntries).length > 0) return initialEntries;

        const initial: Record<string, TrafficEntry[]> = {};
        TRAFFIC_PLATFORMS.forEach(p => {
            const val = values[p.id as keyof TrafficData] || '';
            const ch = channels[p.id as keyof TrafficData] || '';
            initial[p.id] = [{ id: Math.random().toString(36).slice(2, 9), value: val, channel: ch, evidences: [] }];
        });
        return initial;
    });

    useEffect(() => {
        if (initialEntries && Object.keys(initialEntries).length > 0) {
            setEntries(initialEntries);
            
            // Re-sync platform evidences for parent compatibility
            const platformEvidences: Record<string, string[]> = {};
            Object.keys(initialEntries).forEach(pid => {
                if (Array.isArray(initialEntries[pid])) {
                    const allTokens = initialEntries[pid].reduce((acc, row) => 
                        [...acc, ...(row.evidences || []).map(ev => ev.token)], [] as string[]
                    );
                    platformEvidences[pid] = allTokens;
                }
            });
            onPlatformEvidenceChange?.(platformEvidences);
        }
    }, [initialEntries]);

    const digitsOnly = (s: string) => (s || '').replace(/\D/g, '');

    // Update parent whenever entries change
    const updateParent = (platformId: string, currentEntries: TrafficEntry[], allEntries: Record<string, TrafficEntry[]>) => {
        // Aggregated total — BigInt avoids float precision loss on very large traffic totals
        const total = currentEntries.reduce((sum, e) => {
            const d = digitsOnly(e.value);
            return d ? sum + BigInt(d) : sum;
        }, BigInt(0));
        onChange(platformId as keyof TrafficData, total > BigInt(0) ? total.toString() : '');
        
        // Joined channel names
        const joinedChannels = currentEntries
            .map(e => e.channel)
            .filter(c => c !== '')
            .join(', ');
        onChannelChange(platformId as keyof TrafficData, joinedChannels);

        // Reconstruct all platform tokens from allEntries
        const fullPlatformTokens: Record<string, string[]> = {};
        Object.keys(allEntries).forEach(pid => {
            fullPlatformTokens[pid] = (allEntries[pid] || []).reduce((acc, row) => 
                [...acc, ...(row.evidences || []).map(ev => ev.token)], [] as string[]
            );
        });
        onPlatformEvidenceChange?.(fullPlatformTokens);

        // Notify parent of entries
        onEntriesChange?.(allEntries);
    };

    const addRow = (platformId: string) => {
        if (readOnly) return;
        const newRows = [
            ...(entries[platformId] || []),
            { id: Math.random().toString(36).slice(2, 9), value: '', channel: '', evidences: [] }
        ];
        const nextEntries = { ...entries, [platformId]: newRows };
        setEntries(nextEntries);
        updateParent(platformId, newRows, nextEntries);
    };

    const removeRow = (platformId: string, entryId: string) => {
        if (readOnly) return;
        const currentPlatformEntries = entries[platformId] || [];
        if (currentPlatformEntries.length <= 1) {
            updateRow(platformId, entryId, { value: '', channel: '', evidences: [] });
            return;
        }
        const newRows = currentPlatformEntries.filter(e => e.id !== entryId);
        const nextEntries = { ...entries, [platformId]: newRows };
        setEntries(nextEntries);
        updateParent(platformId, newRows, nextEntries);
    };

    const updateRow = (platformId: string, entryId: string, data: Partial<TrafficEntry>) => {
        if (readOnly) return;
        const currentEntries = entries[platformId] || [];
        const newRows = currentEntries.map(e => 
            e.id === entryId ? { ...e, ...data } : e
        );
        const nextEntries = { ...entries, [platformId]: newRows };
        setEntries(nextEntries);
        updateParent(platformId, newRows, nextEntries);
    };
    
    const isPlatformMatch = (platformId: string, channelPlatform: string | null | undefined): boolean => {
        if (!channelPlatform) return false;
        const p = channelPlatform.toLowerCase().trim();
        const platformMap: Record<string, string[]> = {
            'fb': ['fb', 'facebook', 'fanpage'],
            'ig': ['ig', 'instagram', 'ins'],
            'tiktok': ['tiktok', 'tt'],
            'yt': ['yt', 'youtube'],
            'thread': ['thread', 'threads'],
            'zalo': ['zalo', 'zalo oa', 'zalo video'],
        };
        const targets = platformMap[platformId] || [platformId.toLowerCase()];
        return targets.some(target => {
            if (p === target) return true;
            if (target.length > 3 && p.includes(target)) return true;
            const regex = new RegExp(`\\b${target}\\b`, 'i');
            return regex.test(p);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0 || !activeTarget) return;

        const { platformId, entryId } = activeTarget;
        setUploadingPlatform(platformId);
        setUploadErrors(prev => ({ ...prev, [platformId]: '' }));

        try {
            const beBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const formData = new FormData();
            files.forEach(f => formData.append('files', f));

            const res = await fetch(`${beBaseUrl}/lark/upload-evidence`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });

            if (!res.ok) throw new Error('Upload thất bại');

            const data = await res.json();
            const newEvidences = files.map((f, i) => ({
                url: URL.createObjectURL(f),
                name: f.name,
                token: data.fileTokens[i]
            }));

            const currentRows = entries[platformId] || [];
            const updatedRows = currentRows.map(row => {
                if (row.id === entryId) {
                    return { ...row, evidences: [...(row.evidences || []), ...newEvidences] };
                }
                return row;
            });

            const nextEntries = { ...entries, [platformId]: updatedRows };
            setEntries(nextEntries);
            updateParent(platformId, updatedRows, nextEntries);
            
        } catch (err) {
            setUploadErrors(prev => ({ ...prev, [platformId]: 'Lỗi upload ảnh' }));
        } finally {
            setUploadingPlatform(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeEntryImage = (platformId: string, entryId: string, idx: number) => {
        const currentRows = entries[platformId] || [];
        const updatedRows = currentRows.map(row => {
            if (row.id === entryId) {
                return { ...row, evidences: (row.evidences || []).filter((_, i) => i !== idx) };
            }
            return row;
        });
        const nextEntries = { ...entries, [platformId]: updatedRows };
        setEntries(nextEntries);
        updateParent(platformId, updatedRows, nextEntries);
    };

    const triggerUpload = (platformId: string, entryId: string) => {
        setActiveTarget({ platformId, entryId });
        setTimeout(() => fileInputRef.current?.click(), 0);
    };

    return (
        <div className="space-y-6">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleFileChange}
            />

            <div className="flex items-center gap-3 pb-4 border-b border-purple-100">
                <div className="p-2.5 bg-purple-100/50 rounded-xl">
                    <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-0.5">Báo cáo Traffic</h3>
                    <p className="text-sm text-slate-500 font-medium">Nhập số lượt traffic theo từng kênh bạn quản lý</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {TRAFFIC_PLATFORMS.filter(platform => {
                    const hasAccess = availableChannels.some(c => isPlatformMatch(platform.id, c.platform));
                    const hasData = (entries[platform.id] || []).some(e => e.value !== '' || e.channel !== '');
                    return hasAccess || hasData || readOnly;
                }).map((platform) => (
                    <div key={platform.id} className={`flex flex-col gap-4 p-5 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 transition-all duration-300 shadow-sm ${readOnly ? 'opacity-70 pointer-events-none' : 'hover:border-purple-200 hover:bg-white hover:shadow-md'}`}>
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-6 bg-purple-500 rounded-full" />
                                <label className="text-base font-black text-slate-800 uppercase tracking-tight">
                                    {platform.label}
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => addRow(platform.id)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 active:scale-95 flex items-center gap-2"
                                    >
                                        <Activity className="w-4 h-4" /> Thêm kênh
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {(entries[platform.id] || []).map((entry, idx) => (
                                <div key={entry.id} className="group/row bg-white rounded-3xl p-4 border border-slate-100 hover:border-purple-100 hover:shadow-sm transition-all">
                                    <div className="grid grid-cols-12 gap-3 items-end">
                                        <div className="col-span-12 sm:col-span-5 space-y-1.5">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số Traffic</label>
                                                {idx > 0 && <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Kênh #{idx + 1}</span>}
                                            </div>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                placeholder="Số lượt..."
                                                readOnly={readOnly}
                                                value={digitsOnly(entry.value)}
                                                onChange={(e) => {
                                                    const rawValue = digitsOnly(e.target.value);
                                                    updateRow(platform.id, entry.id, { value: rawValue });
                                                }}
                                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-base font-black focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                            />
                                        </div>

                                        <div className="col-span-12 sm:col-span-5 space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tên kênh</label>
                                            <select
                                                disabled={readOnly}
                                                value={entry.channel}
                                                onChange={(e) => updateRow(platform.id, entry.id, { channel: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 text-sm font-bold focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="">-- Chọn kênh --</option>
                                                {availableChannels
                                                    ?.filter(c => isPlatformMatch(platform.id, c.platform))
                                                    .filter(c => {
                                                        if (!c.name) return false;
                                                        if (c.name === entry.channel) return true;
                                                        const alreadySelected = (entries[platform.id] || []).some(e => e.channel === c.name);
                                                        return !alreadySelected;
                                                    })
                                                    .map((c, cIdx) => (
                                                        <option key={c.id || cIdx} value={c.name}>{c.name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>

                                        <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-2 mb-1">
                                            {uploadingPlatform === platform.id && activeTarget?.entryId === entry.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                                            ) : (
                                                !readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => triggerUpload(platform.id, entry.id)}
                                                        className="p-2.5 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all active:scale-90"
                                                        title="Tải minh chứng"
                                                    >
                                                        <ImagePlus className="w-5 h-5" />
                                                    </button>
                                                )
                                            )}
                                            
                                            {!readOnly && (entries[platform.id]?.length > 1) && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(platform.id, entry.id)}
                                                    className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95"
                                                    title="Xóa kênh"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="min-h-[40px] flex flex-wrap gap-2 px-1 mt-2">
                                        {(entry.evidences || []).map((img, evIdx) => (
                                            <div
                                                key={`${entry.id}-${evIdx}`}
                                                className="relative group/img w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm animate-in zoom-in duration-200 cursor-pointer"
                                                onClick={() => window.open(img.url, '_blank')}
                                            >
                                                <Image src={img.url} alt={img.name} className="w-full h-full object-cover" title={img.name} width={40} height={40} unoptimized />
                                                {!readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeEntryImage(platform.id, entry.id, evIdx);
                                                        }}
                                                        className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {(!(entry.evidences || []).length) &&
                                            !(uploadingPlatform === platform.id && activeTarget?.entryId === entry.id) && (
                                                <div className="text-[10px] text-slate-400 italic flex items-center gap-1">
                                                    <ImagePlus className="w-3 h-3 opacity-50" />
                                                    Chưa có minh chứng
                                                </div>
                                            )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {uploadErrors[platform.id] && (
                            <p className="text-xs text-red-500 font-bold px-1 animate-pulse mt-1">
                                {uploadErrors[platform.id]}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {availableChannels.length === 0 && !readOnly && (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                        <Activity className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Không tìm thấy kênh nào bạn đang quản lý</p>
                    <p className="text-slate-400 text-[10px] mt-1 italic">Vui lòng kiểm tra lại tài khoản hoặc liên hệ quản trị viên</p>
                </div>
            )}
        </div>
    );
};

export default TrafficReportSection;
