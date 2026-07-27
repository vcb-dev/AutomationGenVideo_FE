import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, X } from 'lucide-react';

export const REVENUE_PLATFORMS = [
    { id: 'fb', label: 'Doanh thu FB' },
    { id: 'ig', label: 'Doanh thu IG' },
    { id: 'tiktok', label: 'Doanh thu Tiktok' },
    { id: 'yt', label: 'Doanh thu YT' },
    { id: 'thread', label: 'Doanh thu Thread' },
    { id: 'zalo', label: 'Doanh thu Zalo' },
];

export interface RevenueData {
    fb: string;
    ig: string;
    tiktok: string;
    yt: string;
    thread: string;
    zalo: string;
}

export const initialRevenueData = (): RevenueData => ({
    fb: '',
    ig: '',
    tiktok: '',
    yt: '',
    thread: '',
    zalo: '',
});

export const initialRevenueChannels = (): RevenueData => ({
    fb: '',
    ig: '',
    tiktok: '',
    yt: '',
    thread: '',
    zalo: '',
});

interface RevenueEntry {
    id: string;
    value: string;
    channel: string;
}

interface RevenueReportSectionProps {
    values: RevenueData;
    channels: RevenueData;
    availableChannels?: any[];
    onChange: (platformId: keyof RevenueData, value: string) => void;
    onChannelChange: (platformId: keyof RevenueData, value: string) => void;
    onEntriesChange?: (entries: Record<string, RevenueEntry[]>) => void;
    readOnly?: boolean;
    initialEntries?: Record<string, RevenueEntry[]>;
}

const RevenueReportSection: React.FC<RevenueReportSectionProps> = ({
    values,
    channels,
    availableChannels = [],
    onChange,
    onChannelChange,
    onEntriesChange,
    readOnly,
    initialEntries
}) => {
    const [entries, setEntries] = useState<Record<string, RevenueEntry[]>>(() => {
        if (initialEntries && Object.keys(initialEntries).length > 0) return initialEntries;

        const initial: Record<string, RevenueEntry[]> = {};
        REVENUE_PLATFORMS.forEach(p => {
            const val = values[p.id as keyof RevenueData] || '';
            const ch = channels[p.id as keyof RevenueData] || '';
            initial[p.id] = [{ id: Math.random().toString(36).slice(2, 9), value: val, channel: ch }];
        });
        return initial;
    });

    useEffect(() => {
        if (initialEntries && Object.keys(initialEntries).length > 0) {
            setEntries(initialEntries);
        }
    }, [initialEntries]);

    const digitsOnly = (s: string) => (s || '').replace(/\D/g, '');

    const updateParent = (platformId: string, currentEntries: RevenueEntry[], allEntries: Record<string, RevenueEntry[]>) => {
        // Aggregated total — BigInt tránh mất chính xác số thực với doanh thu lớn
        const total = currentEntries.reduce((sum, e) => {
            const d = digitsOnly(e.value);
            return d ? sum + BigInt(d) : sum;
        }, BigInt(0));
        onChange(platformId as keyof RevenueData, total > BigInt(0) ? total.toString() : '');

        const joinedChannels = currentEntries
            .map(e => e.channel)
            .filter(c => c !== '')
            .join(', ');
        onChannelChange(platformId as keyof RevenueData, joinedChannels);

        onEntriesChange?.(allEntries);
    };

    const addRow = (platformId: string) => {
        if (readOnly) return;
        const newRows = [
            ...(entries[platformId] || []),
            { id: Math.random().toString(36).slice(2, 9), value: '', channel: '' }
        ];
        const nextEntries = { ...entries, [platformId]: newRows };
        setEntries(nextEntries);
        updateParent(platformId, newRows, nextEntries);
    };

    const removeRow = (platformId: string, entryId: string) => {
        if (readOnly) return;
        const currentPlatformEntries = entries[platformId] || [];
        if (currentPlatformEntries.length <= 1) {
            updateRow(platformId, entryId, { value: '', channel: '' });
            return;
        }
        const newRows = currentPlatformEntries.filter(e => e.id !== entryId);
        const nextEntries = { ...entries, [platformId]: newRows };
        setEntries(nextEntries);
        updateParent(platformId, newRows, nextEntries);
    };

    const updateRow = (platformId: string, entryId: string, data: Partial<RevenueEntry>) => {
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-emerald-100">
                <div className="p-2.5 bg-emerald-100/50 rounded-xl">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-0.5">Báo cáo Doanh thu</h3>
                    <p className="text-sm text-slate-500 font-medium">Nhập số doanh thu (VNĐ) theo từng kênh bạn quản lý</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {REVENUE_PLATFORMS.filter(platform => {
                    const hasAccess = availableChannels.some(c => isPlatformMatch(platform.id, c.platform));
                    const hasData = (entries[platform.id] || []).some(e => e.value !== '' || e.channel !== '');
                    return hasAccess || hasData || readOnly;
                }).map((platform) => (
                    <div key={platform.id} className={`flex flex-col gap-4 p-5 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 transition-all duration-300 shadow-sm ${readOnly ? 'opacity-70 pointer-events-none' : 'hover:border-emerald-200 hover:bg-white hover:shadow-md'}`}>
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-6 bg-emerald-500 rounded-full" />
                                <label className="text-base font-black text-slate-800 uppercase tracking-tight">
                                    {platform.label}
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => addRow(platform.id)}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Thêm kênh
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {(entries[platform.id] || []).map((entry, idx) => (
                                <div key={entry.id} className="group/row bg-white rounded-3xl p-4 border border-slate-100 hover:border-emerald-100 hover:shadow-sm transition-all">
                                    <div className="grid grid-cols-12 gap-3 items-end">
                                        <div className="col-span-12 sm:col-span-5 space-y-1.5">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doanh thu (VNĐ)</label>
                                                {idx > 0 && <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Kênh #{idx + 1}</span>}
                                            </div>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                placeholder="Số tiền..."
                                                readOnly={readOnly}
                                                value={digitsOnly(entry.value)}
                                                onChange={(e) => {
                                                    const rawValue = digitsOnly(e.target.value);
                                                    updateRow(platform.id, entry.id, { value: rawValue });
                                                }}
                                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-base font-black focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                                            />
                                        </div>

                                        <div className="col-span-12 sm:col-span-5 space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tên kênh</label>
                                            <select
                                                disabled={readOnly}
                                                value={entry.channel}
                                                onChange={(e) => updateRow(platform.id, entry.id, { channel: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 text-sm font-bold focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all outline-none appearance-none cursor-pointer"
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
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {availableChannels.length === 0 && !readOnly && (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                        <DollarSign className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Không tìm thấy kênh nào bạn đang quản lý</p>
                    <p className="text-slate-400 text-[10px] mt-1 italic">Vui lòng kiểm tra lại tài khoản hoặc liên hệ quản trị viên</p>
                </div>
            )}
        </div>
    );
};

export default RevenueReportSection;
