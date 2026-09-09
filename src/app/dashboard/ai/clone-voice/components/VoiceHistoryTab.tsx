'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    RefreshCw,
    Filter,
    Calendar,
    Wand2,
    AudioLines,
    Trash2,
    Globe,
    Zap,
    CheckCircle2,
    XCircle,
    Clock,
    Download,
    Eye,
    X,
    ChevronLeft,
    ChevronRight,
    User,
    Play,
    Pause,
    Volume2,
    FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    fetchVoiceActionHistory,
    type VoiceActionHistoryItem,
    type VoiceActionType,
    type VoiceActionStatus,
} from '@/lib/voice/voice-history';

export function VoiceHistoryTab() {
    const [history, setHistory] = useState<VoiceActionHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [actionType, setActionType] = useState<VoiceActionType>('ALL');
    const [status, setStatus] = useState<VoiceActionStatus>('ALL');
    const [search, setSearch] = useState('');
    const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Detail modal
    const [selectedItem, setSelectedItem] = useState<VoiceActionHistoryItem | null>(null);

    // Mini audio player state
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    const handlePlayAudio = (url: string) => {
        if (playingUrl === url) {
            audioElement?.pause();
            setPlayingUrl(null);
        } else {
            if (audioElement) {
                audioElement.pause();
            }
            const audio = new Audio(url);
            audio.play();
            audio.onended = () => setPlayingUrl(null);
            setAudioElement(audio);
            setPlayingUrl(url);
        }
    };

    // Calculate dates based on preset
    const handlePresetChange = (preset: 'all' | 'today' | '7days' | '30days') => {
        setDatePreset(preset);
        setPage(1);

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        if (preset === 'all') {
            setDateFrom('');
            setDateTo('');
        } else if (preset === 'today') {
            const todayStr = toStr(now);
            setDateFrom(todayStr);
            setDateTo(todayStr);
        } else if (preset === '7days') {
            const past = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
            setDateFrom(toStr(past));
            setDateTo(toStr(now));
        } else if (preset === '30days') {
            const past = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
            setDateFrom(toStr(past));
            setDateTo(toStr(now));
        }
    };

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchVoiceActionHistory({
                page,
                limit,
                action_type: actionType,
                status,
                search: search.trim() || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            });

            if (res.success) {
                setHistory(res.data);
                setTotalPages(res.pagination.totalPages || 1);
                setTotal(res.pagination.total || 0);
            }
        } catch (err: any) {
            console.error('Failed to load voice history:', err);
            toast.error(err.message || 'Lỗi khi tải lịch sử thao tác');
        } finally {
            setLoading(false);
        }
    }, [page, limit, actionType, status, search, dateFrom, dateTo]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Format date string to VN readable format
    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    // Render action type badge
    const renderActionBadge = (type: string) => {
        switch (type) {
            case 'TTS':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                        <Wand2 className="w-3.5 h-3.5" />
                        Tạo giọng (TTS)
                    </span>
                );
            case 'CLONE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                        <AudioLines className="w-3.5 h-3.5" />
                        Clone giọng
                    </span>
                );
            case 'DELETE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        <Trash2 className="w-3.5 h-3.5" />
                        Xoá giọng
                    </span>
                );
            case 'TRANSLATE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Globe className="w-3.5 h-3.5" />
                        Dịch văn bản
                    </span>
                );
            case 'GRANT_QUOTA':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Zap className="w-3.5 h-3.5" />
                        Cấp hạn mức
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                        {type}
                    </span>
                );
        }
    };

    // Render status badge
    const renderStatusBadge = (s: string) => {
        switch (s) {
            case 'SUCCESS':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Thành công
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3" />
                        Thất bại
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3 animate-spin" />
                        Đang xử lý
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800">
                        {s}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Top info bar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-violet-600" />
                        Nhật ký & Lịch sử Thao tác Người dùng (Admin)
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Theo dõi toàn bộ các hoạt động tạo voice, clone giọng, xoá giọng và cấp hạn mức trong hệ thống.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 border border-violet-100">
                        Tổng: <strong>{total}</strong> thao tác
                    </span>
                    <button
                        onClick={loadHistory}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium shadow-sm transition-colors"
                        title="Tải lại danh sách"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search box */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Tìm user, kịch bản, tên giọng..."
                            className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
                        />
                    </div>

                    {/* Action Type filter */}
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                        <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <select
                            value={actionType}
                            onChange={(e) => {
                                setActionType(e.target.value as VoiceActionType);
                                setPage(1);
                            }}
                            className="w-full bg-transparent text-xs text-gray-700 focus:outline-none"
                        >
                            <option value="ALL">Tất cả thao tác</option>
                            <option value="TTS">Tạo giọng nói (TTS)</option>
                            <option value="CLONE">Clone giọng mẫu</option>
                            <option value="DELETE">Xoá giọng đã clone</option>
                            <option value="TRANSLATE">Dịch văn bản kịch bản</option>
                            <option value="GRANT_QUOTA">Admin cấp hạn mức</option>
                        </select>
                    </div>

                    {/* Status filter */}
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <select
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value as VoiceActionStatus);
                                setPage(1);
                            }}
                            className="w-full bg-transparent text-xs text-gray-700 focus:outline-none"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="SUCCESS">Thành công</option>
                            <option value="FAILED">Thất bại</option>
                            <option value="PENDING">Đang xử lý</option>
                        </select>
                    </div>

                    {/* Quick date presets */}
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1 text-xs">
                        <button
                            onClick={() => handlePresetChange('all')}
                            className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                                datePreset === 'all' ? 'bg-white shadow-sm text-violet-700 font-semibold' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => handlePresetChange('today')}
                            className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                                datePreset === 'today' ? 'bg-white shadow-sm text-violet-700 font-semibold' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            Hôm nay
                        </button>
                        <button
                            onClick={() => handlePresetChange('7days')}
                            className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                                datePreset === '7days' ? 'bg-white shadow-sm text-violet-700 font-semibold' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            7 ngày
                        </button>
                        <button
                            onClick={() => handlePresetChange('30days')}
                            className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                                datePreset === '30days' ? 'bg-white shadow-sm text-violet-700 font-semibold' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            30 ngày
                        </button>
                    </div>
                </div>

                {/* Custom date range if needed */}
                {(datePreset === 'all' || dateFrom || dateTo) && (
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
                        <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            Tuỳ chọn ngày:
                        </span>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    setDatePreset('all');
                                    setPage(1);
                                }}
                                className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                            />
                            <span>đến</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => {
                                    setDateTo(e.target.value);
                                    setDatePreset('all');
                                    setPage(1);
                                }}
                                className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                            />
                        </div>
                        {(dateFrom || dateTo || search || actionType !== 'ALL' || status !== 'ALL') && (
                            <button
                                onClick={() => {
                                    setSearch('');
                                    setActionType('ALL');
                                    setStatus('ALL');
                                    setDatePreset('all');
                                    setDateFrom('');
                                    setDateTo('');
                                    setPage(1);
                                }}
                                className="text-violet-600 hover:text-violet-700 font-medium text-xs ml-auto"
                            >
                                Đặt lại bộ lọc
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold text-[11px]">
                                <th className="py-3.5 px-4">Thời gian</th>
                                <th className="py-3.5 px-4">Người thực hiện</th>
                                <th className="py-3.5 px-4">Thao tác</th>
                                <th className="py-3.5 px-4">Chi tiết thao tác</th>
                                <th className="py-3.5 px-4">Trạng thái</th>
                                <th className="py-3.5 px-4 text-center">Âm thanh / Tải</th>
                                <th className="py-3.5 px-4 text-right">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <RefreshCw className="w-6 h-6 animate-spin text-violet-500" />
                                            <span>Đang tải nhật ký thao tác...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <FileText className="w-8 h-8 text-gray-300" />
                                            <span>Chưa có dữ liệu thao tác nào phù hợp với bộ lọc.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                history.map((item) => {
                                    const hasAudio = Boolean(item.output_url);
                                    const isPlaying = playingUrl === item.output_url;

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                            {/* Thời gian */}
                                            <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                                                {formatDate(item.created_at)}
                                            </td>

                                            {/* Người thực hiện */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2.5 min-w-[160px]">
                                                    <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                        {item.user?.full_name ? item.user.full_name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-gray-900 truncate">
                                                            {item.user?.full_name || 'Người dùng'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 truncate">
                                                            {item.user?.email || item.user_id}
                                                        </p>
                                                        {item.user?.team && (
                                                            <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium">
                                                                {item.user.team}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Loại thao tác */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {renderActionBadge(item.action_type)}
                                            </td>

                                            {/* Chi tiết */}
                                            <td className="py-3.5 px-4 max-w-xs">
                                                {item.action_type === 'TTS' && (
                                                    <div className="space-y-1">
                                                        <p className="text-gray-800 truncate font-medium" title={item.input_text || ''}>
                                                            &ldquo;{item.input_text || 'Không có kịch bản'}&rdquo;
                                                        </p>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                            <span>Ký tự: <strong>{item.characters}</strong></span>
                                                            {item.details?.language && <span>· {item.details.language}</span>}
                                                            {item.voice_id && <span>· Giọng: {item.voice_id}</span>}
                                                        </div>
                                                    </div>
                                                )}

                                                {item.action_type === 'CLONE' && (
                                                    <div className="space-y-0.5">
                                                        <p className="font-semibold text-gray-900">
                                                            Giọng: {item.voice_name || 'Chưa đặt tên'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">
                                                            {item.details?.file_name && `File: ${item.details.file_name}`}
                                                            {item.details?.gender && ` · Giới tính: ${item.details.gender === 'female' ? 'Nữ' : 'Nam'}`}
                                                        </p>
                                                    </div>
                                                )}

                                                {item.action_type === 'DELETE' && (
                                                    <div className="space-y-0.5">
                                                        <p className="font-medium text-gray-800">
                                                            Đã xoá giọng: <strong className="text-red-700">{item.voice_name || item.voice_id}</strong>
                                                        </p>
                                                        {item.details?.minimax_deleted !== undefined && (
                                                            <p className="text-[10px] text-gray-400">
                                                                MiniMax: {item.details.minimax_deleted ? 'Đã xoá trên server' : 'Vốn không tồn tại'}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {item.action_type === 'TRANSLATE' && (
                                                    <div className="space-y-0.5">
                                                        <p className="text-gray-800 truncate" title={item.input_text || ''}>
                                                            Dịch sang: <strong>{item.details?.language || 'N/A'}</strong> ({item.characters} ký tự)
                                                        </p>
                                                    </div>
                                                )}

                                                {item.action_type === 'GRANT_QUOTA' && (
                                                    <div className="space-y-0.5">
                                                        <p className="font-medium text-amber-900">
                                                            Cấp thêm: +<strong>{item.details?.extra_count || 0}</strong> lượt tạo voice
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">
                                                            Cho user ID: {item.details?.target_user_id}
                                                        </p>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Trạng thái */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {renderStatusBadge(item.status)}
                                                {item.status === 'FAILED' && item.error_message && (
                                                    <p className="text-[10px] text-red-600 truncate max-w-[140px] mt-0.5" title={item.error_message}>
                                                        {item.error_message}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Âm thanh phát / tải */}
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                {hasAudio ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => handlePlayAudio(item.output_url!)}
                                                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                                                isPlaying
                                                                    ? 'bg-violet-600 text-white'
                                                                    : 'bg-violet-100 hover:bg-violet-200 text-violet-700'
                                                            }`}
                                                            title={isPlaying ? 'Tạm dừng' : 'Nghe thử âm thanh'}
                                                        >
                                                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <a
                                                            href={item.output_url!}
                                                            download={`voice_${item.voice_id || 'sample'}.mp3`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                                                            title="Tải file âm thanh"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 text-[11px]">—</span>
                                                )}
                                            </td>

                                            {/* Nút xem chi tiết */}
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedItem(item)}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800 p-1.5 rounded-lg hover:bg-violet-50 transition-colors"
                                                    title="Xem toàn bộ thông tin chi tiết"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                        <span>Hiển thị</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                        <span>trên tổng số <strong>{total}</strong> dòng</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                            Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal xem chi tiết thao tác */}
            {selectedItem && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setSelectedItem(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                {renderActionBadge(selectedItem.action_type)}
                                <h3 className="font-bold text-gray-900 text-sm">
                                    Chi tiết Thao tác #{selectedItem.id.slice(0, 8)}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Grid metadata */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-gray-400 text-[10px] uppercase font-semibold">Người thực hiện</p>
                                <p className="font-bold text-gray-900 mt-0.5">{selectedItem.user?.full_name || 'N/A'}</p>
                                <p className="text-gray-500 text-[11px]">{selectedItem.user?.email || selectedItem.user_id}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-gray-400 text-[10px] uppercase font-semibold">Thời gian</p>
                                <p className="font-bold text-gray-900 mt-0.5">{formatDate(selectedItem.created_at)}</p>
                                <div className="mt-1">{renderStatusBadge(selectedItem.status)}</div>
                            </div>
                        </div>

                        {/* Kịch bản đầu vào nếu có */}
                        {selectedItem.input_text && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-gray-700">Văn bản / Kịch bản đầu vào:</p>
                                    <span className="text-[10px] text-gray-400 font-mono">
                                        {selectedItem.input_text.length} ký tự
                                    </span>
                                </div>
                                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed font-mono">
                                    {selectedItem.input_text}
                                </div>
                            </div>
                        )}

                        {/* Audio Preview nếu có */}
                        {selectedItem.output_url && (
                            <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-violet-900">
                                        <Volume2 className="w-4 h-4 text-violet-600" />
                                        <span>File âm thanh kết quả</span>
                                    </div>
                                    <a
                                        href={selectedItem.output_url}
                                        download={`voice_${selectedItem.voice_id || 'tts'}.mp3`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-violet-700 font-medium flex items-center gap-1 hover:underline"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Tải file về máy
                                    </a>
                                </div>
                                <audio controls src={selectedItem.output_url} className="w-full h-9" />
                            </div>
                        )}

                        {/* Error message nếu có */}
                        {selectedItem.error_message && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Thông báo lỗi:
                                </p>
                                <p className="font-mono text-[11px] leading-relaxed">{selectedItem.error_message}</p>
                            </div>
                        )}

                        {/* Thông số kỹ thuật chi tiết (JSON) */}
                        {selectedItem.details && (
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-600">Thông số kỹ thuật (Details):</p>
                                <pre className="p-3 bg-gray-900 text-gray-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40">
                                    {JSON.stringify(selectedItem.details, null, 2)}
                                </pre>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-xl transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
