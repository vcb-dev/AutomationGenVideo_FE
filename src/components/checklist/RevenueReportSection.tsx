import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, X, Sparkles, Loader2 } from 'lucide-react';
import { digitsOnly, formatNumberWithDots, sumEntryValues } from './report-total';
import { fetchWithAuth } from '@/lib/api-client';
import toast from 'react-hot-toast';

export const REVENUE_PLATFORMS = [
    { id: 'fb', label: 'Doanh thu FB', platform: 'FACEBOOK' },
    { id: 'tiktok', label: 'Doanh thu Tiktok', platform: 'TIKTOK' },
    { id: 'zalo', label: 'Doanh thu Zalo', platform: 'ZALO' },
];

export interface RevenueData {
    fb: string;
    tiktok: string;
    zalo: string;
    ig?: string;
    yt?: string;
    thread?: string;
}

export const initialRevenueData = (): RevenueData => ({
    fb: '',
    tiktok: '',
    zalo: '',
    ig: '',
    yt: '',
    thread: '',
});

export const initialRevenueChannels = (): RevenueData => ({
    fb: '',
    tiktok: '',
    zalo: '',
    ig: '',
    yt: '',
    thread: '',
});

export interface RevenueEntry {
    id: string;
    value: string;
    channel: string;
    isAutoFetched?: boolean;
    orderCount?: number;
}

interface RevenueReportSectionProps {
    values: RevenueData;
    channels: RevenueData;
    availableChannels?: any[];
    selectedDate?: string;
    onChange: (platformId: keyof RevenueData, value: string) => void;
    onChannelChange: (platformId: keyof RevenueData, value: string) => void;
    onEntriesChange?: (entries: Record<string, RevenueEntry[]>) => void;
    readOnly?: boolean;
    initialEntries?: Record<string, RevenueEntry[]>;
}

/**
 * Lấy ngày hôm trước (hôm qua) của ngày được chọn dạng YYYY-MM-DD.
 * Ví dụ: Báo cáo ngày 24/08 thì lấy số liệu ngày 23/08.
 */
export const getYesterdayYMD = (dateStr?: string): string => {
    let year: number;
    let month: number;
    let day: number;

    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const parts = dateStr.split('-').map(Number);
        year = parts[0];
        month = parts[1] - 1;
        day = parts[2];
    } else {
        const now = new Date();
        const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        year = vnTime.getUTCFullYear();
        month = vnTime.getUTCMonth();
        day = vnTime.getUTCDate();
    }

    const d = new Date(Date.UTC(year, month, day));
    d.setUTCDate(d.getUTCDate() - 1);

    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
};

export const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const RevenueReportSection: React.FC<RevenueReportSectionProps> = ({
    values,
    channels,
    availableChannels = [],
    selectedDate,
    onChange,
    onChannelChange,
    onEntriesChange,
    readOnly,
    initialEntries
}) => {
    const [fetchingRowId, setFetchingRowId] = useState<string | null>(null);
    const [fetchingAll, setFetchingAll] = useState(false);
    const [socialAccounts, setSocialAccounts] = useState<any[]>([]);

    // Ngày mục tiêu để cào doanh thu (ngày hôm trước của ngày báo cáo)
    const targetRevenueDate = getYesterdayYMD(selectedDate);
    const targetRevenueDateDisplay = formatDateDisplay(targetRevenueDate);

    // Tự động tải các kênh kết nối từ Social Accounts (bên đăng bài MXH)
    useEffect(() => {
        const loadSocial = async () => {
            try {
                const beBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
                const res = await fetchWithAuth(`${beBaseUrl}/social/accounts`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setSocialAccounts(data);
                    }
                }
            } catch {
                /* silent */
            }
        };
        loadSocial();
    }, []);

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
            updateRow(platformId, entryId, { value: '', channel: '', isAutoFetched: false, orderCount: undefined });
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
            'tiktok': ['tiktok', 'tt', 'tiktokshop'],
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

    // Tìm Facebook Page ID tương ứng từ danh sách kênh kết nối OAuth hoặc Quản lý kênh
    const findPageIdForChannel = (channelName: string): string | undefined => {
        const clean = channelName.replace(/\s*★\s*\(OAuth\)\s*$/i, '').trim().toLowerCase();
        const sa = socialAccounts.find(a => (a.name || a.username || '').toLowerCase() === clean);
        if (sa) {
            const rawId = sa.platform_id || sa.username;
            if (rawId) {
                const match = String(rawId).match(/(\d{10,})/);
                if (match) return match[1];
                return String(rawId).replace(/^page_id_|^page_/, '').trim();
            }
        }
        const ac = availableChannels.find(c => (c.name || '').toLowerCase() === clean);
        if (ac) {
            const rawId = ac.channel_id || ac.platform_id || ac.link_channel;
            if (rawId) {
                const match = String(rawId).match(/id=(\d+)/i) || String(rawId).match(/facebook\.com\/(\d+)/i) || String(rawId).match(/(\d{10,})/);
                if (match) return match[1];
                return String(rawId).replace(/^page_id_|^page_/, '').trim();
            }
        }
        return undefined;
    };

    // Tự động đồng bộ doanh thu Sapo THEO NGÀY HÔM TRƯỚC cho RIÊNG 1 kênh
    const handleAutoFetchSingle = async (platformId: string, entryId: string, channelName: string) => {
        if (!channelName.trim()) {
            toast.error('Vui lòng chọn tên kênh trước khi đồng bộ.');
            return;
        }

        const cleanName = channelName.replace(/\s*★\s*\(OAuth\)\s*$/i, '').trim();
        const pageId = findPageIdForChannel(channelName);

        setFetchingRowId(entryId);
        const beBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
        const dateParam = targetRevenueDate;

        try {
            const pageIdParam = pageId ? `&pageId=${encodeURIComponent(pageId)}` : '';
            const url = `${beBaseUrl}/sapo/revenue?channelName=${encodeURIComponent(cleanName)}${pageIdParam}&date=${encodeURIComponent(dateParam)}&platform=${platformId}&mode=day`;
            const res = await fetchWithAuth(url);

            if (res.ok) {
                const data = await res.json();
                if (data && data.success) {
                    const rev = data.revenue ?? 0;
                    const orderCount = data.orderCount ?? 0;
                    updateRow(platformId, entryId, {
                        value: String(rev),
                        isAutoFetched: true,
                        orderCount
                    });

                    if (rev > 0) {
                        toast.success(`Đã lấy thành công ${Number(rev).toLocaleString('vi-VN')} đ (${orderCount} đơn) ngày hôm qua (${data.period?.label || targetRevenueDateDisplay}) cho kênh "${cleanName}"!`);
                    } else {
                        toast(`Kênh "${cleanName}" chưa có đơn hàng trong ngày hôm qua (${data.period?.label || targetRevenueDateDisplay}).`, {
                            icon: 'ℹ️',
                        });
                    }
                } else {
                    toast.error(data.message || `Không lấy được doanh thu kênh "${cleanName}".`);
                }
            } else {
                toast.error(`Không thể kết nối máy chủ để đồng bộ kênh "${cleanName}".`);
            }
        } catch {
            toast.error('Lỗi khi kết nối hệ thống đồng bộ Sapo.');
        } finally {
            setFetchingRowId(null);
        }
    };

    // Tự động đồng bộ doanh thu Sapo THEO NGÀY HÔM TRƯỚC cho TOÀN BỘ các kênh đang chọn (1-Click)
    const handleAutoFetchAllRevenue = async () => {
        const allEntriesList = Object.entries(entries);
        const hasAnyChannel = allEntriesList.some(([_, list]) =>
            list.some(e => e.channel && e.channel.trim() !== '')
        );

        if (!hasAnyChannel) {
            toast.error('Vui lòng chọn ít nhất một kênh trước khi đồng bộ.');
            return;
        }

        setFetchingAll(true);
        const beBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
        const dateParam = targetRevenueDate;

        try {
            let totalRevenueFetched = 0;
            let totalOrdersFetched = 0;
            let syncCount = 0;
            const nextEntries: Record<string, RevenueEntry[]> = {};

            for (const [platformId, list] of allEntriesList) {
                const updatedList = await Promise.all(
                    list.map(async (entry) => {
                        if (!entry.channel.trim()) return entry;

                        const cleanName = entry.channel.replace(/\s*★\s*\(OAuth\)\s*$/i, '').trim();
                        const pageId = findPageIdForChannel(entry.channel);

                        try {
                            const pageIdParam = pageId ? `&pageId=${encodeURIComponent(pageId)}` : '';
                            const url = `${beBaseUrl}/sapo/revenue?channelName=${encodeURIComponent(cleanName)}${pageIdParam}&date=${encodeURIComponent(dateParam)}&platform=${platformId}&mode=day`;
                            const res = await fetchWithAuth(url);
                            if (res.ok) {
                                const data = await res.json();
                                if (data && data.success) {
                                    const rev = data.revenue ?? 0;
                                    const orderCount = data.orderCount ?? 0;
                                    syncCount++;
                                    totalRevenueFetched += Number(rev);
                                    totalOrdersFetched += Number(orderCount);
                                    return {
                                        ...entry,
                                        value: String(rev),
                                        isAutoFetched: true,
                                        orderCount
                                    };
                                }
                            }
                        } catch {
                            /* silent for individual failures */
                        }
                        return entry;
                    })
                );
                nextEntries[platformId] = updatedList;
                updateParent(platformId, updatedList, { ...entries, ...nextEntries });
            }

            setEntries(nextEntries);

            if (syncCount > 0) {
                toast.success(
                    `Đã đồng bộ ngày hôm qua (${targetRevenueDateDisplay}): ${syncCount} kênh, Tổng ${totalRevenueFetched.toLocaleString('vi-VN')} đ (${totalOrdersFetched} đơn)!`,
                    { duration: 4000 }
                );
            } else {
                toast.error(`Không tìm thấy dữ liệu đơn hàng ngày hôm qua (${targetRevenueDateDisplay}) cho các kênh đã chọn.`);
            }
        } catch {
            toast.error('Lỗi khi đồng bộ hàng loạt từ Sapo.');
        } finally {
            setFetchingAll(false);
        }
    };

    const hasAnyChannelsConfigured = availableChannels.length > 0 || socialAccounts.length > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100/50 rounded-xl">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-0.5">Báo cáo Doanh thu</h3>
                        <p className="text-sm text-slate-500 font-medium">
                            Nhập số doanh thu (VNĐ) hoặc tự động lấy từ Sapo cho ngày hôm trước (<span className="text-emerald-700 font-bold">{targetRevenueDateDisplay}</span>)
                        </p>
                    </div>
                </div>

                {!readOnly && (
                    <button
                        type="button"
                        onClick={handleAutoFetchAllRevenue}
                        disabled={fetchingAll}
                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {fetchingAll ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        <span>{fetchingAll ? 'Đang lấy doanh thu...' : `Tự động lấy doanh thu hôm qua (${targetRevenueDateDisplay})`}</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {REVENUE_PLATFORMS.filter(platform => {
                    const hasAccess = availableChannels.some(c => isPlatformMatch(platform.id, c.platform)) ||
                                      socialAccounts.some(sa => isPlatformMatch(platform.id, sa.platform));
                    const hasData = (entries[platform.id] || []).some(e => e.value !== '' || e.channel !== '');
                    return hasAccess || hasData || readOnly;
                }).map((platform) => (
                    <div key={platform.id} className={`flex flex-col gap-4 p-5 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 transition-all duration-300 shadow-sm ${readOnly ? 'opacity-70 pointer-events-none' : 'hover:border-emerald-200 hover:bg-white hover:shadow-md'}`}>
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="w-2 h-6 bg-emerald-500 rounded-full" />
                                <label className="text-base font-black text-slate-800 uppercase tracking-tight">
                                    {platform.label}
                                </label>
                                {sumEntryValues((entries[platform.id] || []).map(e => e.value)) && (
                                    <span className="ml-1 text-xs font-black text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                        Tổng: {formatNumberWithDots(sumEntryValues((entries[platform.id] || []).map(e => e.value)))} đ
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => addRow(platform.id)}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 flex items-center gap-2 cursor-pointer"
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
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    placeholder="VD: 5.000.000..."
                                                    readOnly={readOnly}
                                                    value={formatNumberWithDots(entry.value)}
                                                    onChange={(e) => {
                                                        const rawValue = digitsOnly(e.target.value);
                                                        updateRow(platform.id, entry.id, { value: rawValue, isAutoFetched: false });
                                                    }}
                                                    className={`w-full h-12 pl-4 ${entry.isAutoFetched ? 'pr-20' : 'pr-4'} rounded-xl border ${
                                                        entry.isAutoFetched ? 'border-emerald-400 bg-emerald-50/40 text-emerald-800' : 'border-slate-200 bg-slate-50/50 text-slate-800'
                                                    } text-base font-black focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all outline-none`}
                                                />
                                                {entry.isAutoFetched && (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                                                        ✓ Auto {entry.orderCount !== undefined ? `(${entry.orderCount} đơn)` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-span-12 sm:col-span-5 space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tên kênh</label>
                                            <select
                                                disabled={readOnly}
                                                value={entry.channel}
                                                onChange={(e) => updateRow(platform.id, entry.id, { channel: e.target.value, isAutoFetched: false })}
                                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 text-sm font-bold focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="">-- Chọn kênh --</option>
                                                {/* Kênh team */}
                                                {availableChannels
                                                    ?.filter(c => isPlatformMatch(platform.id, c.platform))
                                                    .filter(c => {
                                                        if (!c.name) return false;
                                                        if (c.name === entry.channel) return true;
                                                        const alreadySelected = (entries[platform.id] || []).some(e => e.channel === c.name);
                                                        return !alreadySelected;
                                                    })
                                                    .map((c, cIdx) => (
                                                        <option key={`team-${c.id || cIdx}`} value={c.name}>{c.name}</option>
                                                    ))
                                                }
                                                {/* Kênh OAuth kết nối từ Đăng bài MXH */}
                                                {socialAccounts
                                                    ?.filter(sa => isPlatformMatch(platform.id, sa.platform))
                                                    .filter(sa => {
                                                        const name = sa.name || sa.username;
                                                        if (!name) return false;
                                                        if (availableChannels?.some(ac => ac.name?.toLowerCase() === name.toLowerCase())) return false;
                                                        if (name === entry.channel || `${name} ★ (OAuth)` === entry.channel) return true;
                                                        const alreadySelected = (entries[platform.id] || []).some(e => e.channel === name || e.channel === `${name} ★ (OAuth)`);
                                                        return !alreadySelected;
                                                    })
                                                    .map((sa, saIdx) => (
                                                        <option key={`oauth-${sa.id || saIdx}`} value={sa.name || sa.username}>
                                                            {sa.name || sa.username} ★ (OAuth)
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                        </div>

                                        <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-2 mb-1">
                                            {!readOnly && entry.channel.trim() !== '' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAutoFetchSingle(platform.id, entry.id, entry.channel)}
                                                    disabled={fetchingRowId === entry.id || fetchingAll}
                                                    className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all active:scale-90 cursor-pointer"
                                                    title={`Lấy số liệu tự động từ Sapo ngày hôm trước (${targetRevenueDateDisplay}) cho kênh này`}
                                                >
                                                    {fetchingRowId === entry.id ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <Sparkles className="w-5 h-5" />}
                                                </button>
                                            )}

                                            {!readOnly && (entries[platform.id]?.length > 1) && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(platform.id, entry.id)}
                                                    className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95 cursor-pointer"
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

            {!hasAnyChannelsConfigured && !readOnly && (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                        <DollarSign className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Không tìm thấy kênh nào bạn đang quản lý</p>
                    <p className="text-slate-400 text-[10px] mt-1 italic">Vui lòng kết nối kênh tại mục Quản lý kênh / Đăng bài MXH</p>
                </div>
            )}
        </div>
    );
};

export default RevenueReportSection;
