import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Plus, X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/api-client';
import { digitsOnly, sumEntryValues, formatThousands } from './report-total';
import { ChannelSelect, ChannelOptionItem } from './ChannelSelect';

export const REVENUE_PLATFORMS = [
    { id: 'fb', label: 'Doanh thu FB' },
    { id: 'ig', label: 'Doanh thu IG' },
    { id: 'tiktok', label: 'Doanh thu Tiktok' },
    { id: 'zalo', label: 'Doanh thu Zalo' },
];

export interface RevenueData {
    fb: string;
    ig: string;
    tiktok: string;
    yt?: string;
    thread?: string;
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

export interface RevenueEntry {
    id: string;
    value: string;
    channel: string;
    channelId?: string;
    orderCount?: number;
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
    selectedDate?: string;
    selectedTeam?: string;
}

const RevenueReportSection: React.FC<RevenueReportSectionProps> = ({
    values,
    channels,
    availableChannels = [],
    onChange,
    onChannelChange,
    onEntriesChange,
    readOnly,
    initialEntries,
    selectedDate,
    selectedTeam,
}) => {
    const [isFetchingSapo, setIsFetchingSapo] = useState(false);
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

    const updateParent = (platformId: string, currentEntries: RevenueEntry[], allEntries: Record<string, RevenueEntry[]>) => {
        // Aggregated total — BigInt tránh mất chính xác số thực với doanh thu lớn
        onChange(platformId as keyof RevenueData, sumEntryValues(currentEntries.map(e => e.value)));

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
            updateRow(platformId, entryId, { value: '', channel: '', channelId: undefined, orderCount: undefined });
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

    const extractNumericId = (input?: string | null): string => {
        if (!input) return '';
        const trimmed = String(input).trim();
        if (/^\d{5,}$/.test(trimmed)) {
            return trimmed;
        }
        const idInUrlMatch = trimmed.match(/(?:id=|profile\.php\?id=|\/|page_id_)(\d{5,})/i);
        if (idInUrlMatch && idInUrlMatch[1]) {
            return idInUrlMatch[1];
        }
        return trimmed;
    };

    const normalizeExact = (name?: string | null): string => {
        if (!name) return '';
        return name
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    };

    const getPreviousDayStr = (dateStr?: string) => {
        if (!dateStr) {
            const today = new Date();
            today.setDate(today.getDate() - 1);
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        const parts = dateStr.split('-').map(Number);
        if (parts.length !== 3) return dateStr;
        const prev = new Date(parts[0], parts[1] - 1, parts[2] - 1);
        const yyyy = prev.getFullYear();
        const mm = String(prev.getMonth() + 1).padStart(2, '0');
        const dd = String(prev.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const targetFetchDate = getPreviousDayStr(selectedDate);
    const targetDisplayDate = targetFetchDate ? targetFetchDate.split('-').reverse().join('/') : '';
    const targetShortDate = targetFetchDate ? targetFetchDate.split('-').slice(1).reverse().join('/') : '';

    const fetchSapoRevenue = async () => {
        if (readOnly || isFetchingSapo) return;
        setIsFetchingSapo(true);
        try {
            const beBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
            const queryParams = new URLSearchParams();
            if (targetFetchDate) queryParams.set('date', targetFetchDate);
            if (selectedTeam) queryParams.set('team', selectedTeam);

            const res = await fetchWithAuth(`${beBaseUrl}/sapo/revenue-preview?${queryParams.toString()}`);
            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || 'Không thể lấy dữ liệu từ Sapo');
                return;
            }

            if (data.breakdown && Object.keys(data.breakdown).length > 0) {
                // Kiểm tra xem người dùng hiện tại ĐÃ CHỌN kênh cụ thể nào trên form chưa
                const hasSelectedAnyChannel = Object.values(entries).some(list =>
                    list.some(e => Boolean(e.channel && e.channel.trim()))
                );

                // Helper để tìm doanh thu từ Sapo cho 1 kênh với đối chiếu chặt chẽ ID + Tên
                const findSapoEntryForChannel = (platformId: string, channelName: string, channelId?: string) => {
                    const sapoList: any[] = data.breakdown[platformId] || [];
                    if (!channelName && !channelId) return null;

                    const userChanNorm = normalizeExact(channelName);
                    const userChanId = extractNumericId(channelId);

                    // 1. Tìm thông tin kênh trong availableChannels nếu có để bổ sung ID/Tên
                    const registeredAc = availableChannels.find(c =>
                        (userChanId && extractNumericId(c.channel_id || c.link_channel) === userChanId) ||
                        (userChanNorm && normalizeExact(c.name) === userChanNorm)
                    );
                    const acNumId = registeredAc ? extractNumericId(registeredAc.channel_id || registeredAc.link_channel) : '';
                    const effectiveId = userChanId || acNumId;

                    // 2. Ưu tiên 1: Khớp chính xác ID
                    if (effectiveId) {
                        const matchById = sapoList.find(s => {
                            const sId = extractNumericId(s.channelId);
                            return sId && sId === effectiveId;
                        });
                        if (matchById) return matchById;
                    }

                    // 3. Ưu tiên 2: Khớp chính xác 100% Tên kênh
                    if (userChanNorm) {
                        const matchByName = sapoList.find(s => normalizeExact(s.channel) === userChanNorm);
                        if (matchByName) return matchByName;
                    }

                    return null;
                };

                if (hasSelectedAnyChannel) {
                    // TRƯỜNG HỢP 1: Người dùng đã chọn kênh cụ thể -> CHỈ cập nhật số liệu cho các kênh ĐANG CHỌN trên form
                    const nextEntries: Record<string, RevenueEntry[]> = {};
                    let matchedOrdersCount = 0;
                    let matchedRevenueTotal = BigInt(0);

                    REVENUE_PLATFORMS.forEach(p => {
                        const currentPlatformEntries = entries[p.id] || [];
                        const updatedList: RevenueEntry[] = currentPlatformEntries.map(entry => {
                            if (!entry.channel || !entry.channel.trim()) {
                                return entry;
                            }
                            const sapoMatch = findSapoEntryForChannel(p.id, entry.channel, entry.channelId);
                            if (sapoMatch) {
                                const valStr = String(sapoMatch.value || '0');
                                const count = Number(sapoMatch.orderCount || 0);
                                matchedOrdersCount += count;
                                if (valStr && valStr !== '0') {
                                    matchedRevenueTotal += BigInt(valStr);
                                }
                                return {
                                    ...entry,
                                    value: valStr,
                                    channelId: sapoMatch.channelId || entry.channelId,
                                    orderCount: count,
                                };
                            } else {
                                // Kênh này trong ngày không phát sinh đơn Sapo
                                return {
                                    ...entry,
                                    value: '0',
                                    orderCount: 0,
                                };
                            }
                        });

                        nextEntries[p.id] = updatedList;
                    });

                    setEntries(nextEntries);

                    REVENUE_PLATFORMS.forEach(p => {
                        const pEntries = nextEntries[p.id] || [];
                        const totalVal = sumEntryValues(pEntries.map((e: any) => e.value));
                        onChange(p.id as keyof RevenueData, totalVal);

                        const joinedCh = pEntries
                            .map((e: any) => e.channel)
                            .filter((c: string) => Boolean(c))
                            .join(', ');
                        onChannelChange(p.id as keyof RevenueData, joinedCh);
                    });

                    onEntriesChange?.(nextEntries);

                    const formattedTotal = Number(matchedRevenueTotal).toLocaleString('vi-VN');
                    if (matchedOrdersCount > 0) {
                        toast.success(`Đã kéo số liệu Sapo cho các kênh đã chọn: ${matchedOrdersCount} đơn (${formattedTotal} đ)`);
                    } else {
                        toast(`Kênh bạn chọn không có đơn hàng Sapo trong ngày ${targetDisplayDate}. Đã đặt số tiền về 0 đ.`, { icon: 'ℹ️' });
                    }

                } else {
                    // TRƯỜNG HỢP 2: Form chưa chọn kênh nào -> Tự động nạp các kênh từ Sapo
                    const filteredBreakdown: Record<string, RevenueEntry[]> = {};

                    REVENUE_PLATFORMS.forEach(p => {
                        const sapoList: any[] = data.breakdown[p.id] || [];
                        let targetList = sapoList;
                        // Nếu user có danh mục kênh phân quyền riêng
                        if (availableChannels && availableChannels.length > 0) {
                            const userHasThisPlatform = availableChannels.some(c => isPlatformMatch(p.id, c.platform));
                            if (userHasThisPlatform) {
                                targetList = sapoList.filter(s => {
                                    if (!s.channel && !s.channelId) return false;
                                    const sNorm = normalizeExact(s.channel);
                                    const sId = extractNumericId(s.channelId);
                                    return availableChannels.some(c => {
                                        const cNorm = normalizeExact(c.name || '');
                                        const cId = extractNumericId(c.channel_id || c.link_channel);
                                        return (sId && cId && sId === cId) || (sNorm && cNorm && sNorm === cNorm);
                                    });
                                });
                            }
                        }

                        if (targetList.length === 0) {
                            filteredBreakdown[p.id] = [{ id: Math.random().toString(36).slice(2, 9), value: '', channel: '' }];
                        } else {
                            filteredBreakdown[p.id] = targetList.map(s => ({
                                id: s.id || Math.random().toString(36).slice(2, 9),
                                value: String(s.value || ''),
                                channel: s.channel || '',
                                channelId: s.channelId || undefined,
                                orderCount: s.orderCount,
                            }));
                        }
                    });

                    setEntries(filteredBreakdown);

                    REVENUE_PLATFORMS.forEach(p => {
                        const platformEntries = filteredBreakdown[p.id] || [];
                        const totalVal = sumEntryValues(platformEntries.map((e: any) => e.value));
                        onChange(p.id as keyof RevenueData, totalVal);

                        const joinedCh = platformEntries
                            .map((e: any) => e.channel)
                            .filter((c: string) => Boolean(c))
                            .join(', ');
                        onChannelChange(p.id as keyof RevenueData, joinedCh);
                    });

                    onEntriesChange?.(filteredBreakdown);

                    if (data.orderCount > 0) {
                        const formattedTotal = Number(data.totalRevenue || 0).toLocaleString('vi-VN');
                        toast.success(`Đã kéo thành công ${data.orderCount} đơn hàng Sapo ngày ${targetDisplayDate} (Tổng: ${formattedTotal} đ)`);
                    } else {
                        toast(data.message || `Không tìm thấy đơn hàng Sapo trong ngày ${targetDisplayDate}.`, { icon: 'ℹ️' });
                    }
                }
            }
        } catch (err: any) {
            toast.error(err?.message || 'Lỗi khi kết nối đến hệ thống Sapo');
        } finally {
            setIsFetchingSapo(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-emerald-100 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100/50 rounded-xl">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-0.5">Báo cáo Doanh thu</h3>
                            {targetDisplayDate && (
                                <span className="text-[11px] font-black px-2 py-0.5 bg-emerald-100/80 text-emerald-800 rounded-lg border border-emerald-300/40">
                                    Đơn Sapo ngày D-1: {targetDisplayDate}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 font-medium">Nhập số doanh thu (VNĐ) theo từng kênh bạn quản lý (Tự động kéo từ Sapo ngày D - 1: {targetDisplayDate})</p>
                    </div>
                </div>

                {!readOnly && (
                    <button
                        type="button"
                        onClick={fetchSapoRevenue}
                        disabled={isFetchingSapo}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-emerald-200 active:scale-95 flex items-center gap-2 border border-emerald-500/20 disabled:opacity-60 cursor-pointer"
                        title={`Tự động kéo toàn bộ doanh thu và số đơn Sapo của ngày D - 1 (${targetDisplayDate})`}
                    >
                        {isFetchingSapo ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4 text-emerald-200" />
                        )}
                        <span>{isFetchingSapo ? 'Đang kéo từ Sapo...' : `⚡ Kéo Sapo (${targetShortDate})`}</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                {REVENUE_PLATFORMS.filter(platform => {
                    const hasAccess = availableChannels.some(c => isPlatformMatch(platform.id, c.platform));
                    const hasData = (entries[platform.id] || []).some(e => e.value !== '' || e.channel !== '');
                    return hasAccess || hasData || readOnly;
                }).map((platform, platformIdx) => {
                    const platformOrderCount = (entries[platform.id] || []).reduce((acc, e) => acc + (e.orderCount || 0), 0);
                    
                    const channelOptions: ChannelOptionItem[] = availableChannels
                        .filter(c => isPlatformMatch(platform.id, c.platform))
                        .filter(c => Boolean(c.name))
                        .map((c, cIdx) => ({
                            id: c.id || `chan-${cIdx}`,
                            name: c.name,
                            channelId: extractNumericId(c.channel_id || c.link_channel) || undefined,
                            badge: c.platform?.toUpperCase(),
                            badgeColor: 'emerald',
                        }));

                    return (
                        <div
                            key={platform.id}
                            style={{ zIndex: 30 - platformIdx }}
                            className={`relative flex flex-col gap-4 p-5 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 transition-all duration-300 shadow-sm ${
                                readOnly ? 'opacity-70 pointer-events-none' : 'hover:border-emerald-200 hover:bg-white hover:shadow-md'
                            }`}
                        >
                            <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-6 bg-emerald-500 rounded-full" />
                                    <label className="text-base font-black text-slate-800 uppercase tracking-tight">
                                        {platform.label}
                                    </label>
                                    {platformOrderCount > 0 && (
                                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-lg border border-emerald-300/40">
                                            📦 {platformOrderCount} đơn
                                        </span>
                                    )}
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
                                    <div
                                        key={entry.id}
                                        style={{ zIndex: 20 - idx }}
                                        className="relative group/row bg-white rounded-3xl p-4 border border-slate-100 hover:border-emerald-100 hover:shadow-sm transition-all"
                                    >
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                            <div className="col-span-12 sm:col-span-5 space-y-1.5">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doanh thu (VNĐ)</label>
                                                    <div className="flex items-center gap-1.5">
                                                        {entry.orderCount !== undefined && entry.orderCount > 0 && (
                                                            <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100/90 text-emerald-800 border border-emerald-300/50 rounded-full flex items-center gap-1 shadow-2xs">
                                                                📦 {entry.orderCount} đơn
                                                            </span>
                                                        )}
                                                        {idx > 0 && <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Kênh #{idx + 1}</span>}
                                                    </div>
                                                </div>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    placeholder="Số tiền..."
                                                    readOnly={readOnly}
                                                    value={formatThousands(entry.value)}
                                                    onChange={(e) => {
                                                        const rawValue = digitsOnly(e.target.value);
                                                        updateRow(platform.id, entry.id, { value: rawValue });
                                                    }}
                                                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-base font-black focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                                                />
                                            </div>

                                            <div className="col-span-12 sm:col-span-5 space-y-1.5">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên kênh</label>
                                                </div>
                                                <ChannelSelect
                                                    theme="emerald"
                                                    value={entry.channel}
                                                    channelId={entry.channelId}
                                                    options={channelOptions}
                                                    disabled={readOnly}
                                                    readOnly={readOnly}
                                                    placeholder="-- Chọn kênh --"
                                                    onChange={(channelName, cId) => {
                                                        updateRow(platform.id, entry.id, { channel: channelName, channelId: cId });
                                                    }}
                                                />
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
                    );
                })}
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
