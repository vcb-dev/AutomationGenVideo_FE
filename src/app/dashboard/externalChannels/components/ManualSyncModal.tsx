'use client';

import { useState, useEffect } from 'react';
import {
  X,
  CircleNotch,
  Clock,
  BookmarkSimple,
  Globe,
  Lightning,
  CalendarCheck,
  VideoCamera,
  CheckCircle,
  Info,
} from '@phosphor-icons/react';
import { type DeletableChannelPlatform } from '@/lib/scrape/delete-channel';

export interface ManualSyncConfig {
  scope: 'tracked' | 'bookmarked' | 'all';
  mode: 'count' | 'days';
  count: number;
  days: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: ManualSyncConfig) => void;
  platform: DeletableChannelPlatform | 'all';
  channelCount?: number;
  isLoading?: boolean;
}

const PLATFORM_NAMES: Record<DeletableChannelPlatform | 'all', string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
  youtube: 'YouTube',
  douyin: 'Douyin',
  xiaohongshu: 'XiaoHongShu',
  kuaishou: 'KuaiShou',
  bilibili: 'Bilibili',
  all: 'Tất cả nền tảng',
};

const COUNT_PRESETS = [10, 20, 50, 100];
const DAYS_PRESETS = [3, 7, 14, 30];

export default function ManualSyncModal({
  isOpen,
  onClose,
  onConfirm,
  platform,
  channelCount,
  isLoading = false,
}: Props) {
  const [scope, setScope] = useState<'tracked' | 'bookmarked' | 'all'>('tracked');
  const [mode, setMode] = useState<'count' | 'days'>('count');
  const [count, setCount] = useState<number>(20);
  const [days, setDays] = useState<number>(7);
  const [customCount, setCustomCount] = useState<string>('');
  const [customDays, setCustomDays] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const platformTitle = PLATFORM_NAMES[platform] || platform;

  const handlePresetCount = (val: number) => {
    setCount(val);
    setCustomCount('');
  };

  const handleCustomCountChange = (valStr: string) => {
    setCustomCount(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setCount(Math.min(parsed, 500));
    }
  };

  const handlePresetDays = (val: number) => {
    setDays(val);
    setCustomDays('');
  };

  const handleCustomDaysChange = (valStr: string) => {
    setCustomDays(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setDays(Math.min(parsed, 180));
    }
  };

  const handleSubmit = () => {
    onConfirm({
      scope,
      mode,
      count: mode === 'count' ? count : 20,
      days: mode === 'days' ? days : 7,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <Lightning size={22} weight="fill" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-snug">
                Cào Dữ Liệu {platformTitle}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tùy chọn phạm vi kênh và hình thức lấy video mới
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Section 1: Phạm vi cào */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2.5">
              1. Chọn phạm vi kênh
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option A: Kênh chú ý */}
              <div
                onClick={() => setScope('tracked')}
                className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                  scope === 'tracked'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                    : 'border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock size={16} weight="bold" />
                  </div>
                  {scope === 'tracked' && (
                    <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                  )}
                </div>
                <span className="font-semibold text-xs text-foreground">Kênh chú ý</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  Kênh bật theo dõi định kỳ (icon đồng hồ)
                </span>
              </div>

              {/* Option B: Kênh đã lưu */}
              <div
                onClick={() => setScope('bookmarked')}
                className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                  scope === 'bookmarked'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                    : 'border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <BookmarkSimple size={16} weight="bold" />
                  </div>
                  {scope === 'bookmarked' && (
                    <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                  )}
                </div>
                <span className="font-semibold text-xs text-foreground">Kênh đã lưu</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  Các kênh bạn đã đánh dấu bookmark
                </span>
              </div>

              {/* Option C: Tất cả kênh */}
              <div
                onClick={() => setScope('all')}
                className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                  scope === 'all'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                    : 'border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Globe size={16} weight="bold" />
                  </div>
                  {scope === 'all' && (
                    <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                  )}
                </div>
                <span className="font-semibold text-xs text-foreground">Tất cả kênh</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  Toàn bộ kênh khám phá của nền tảng
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Hình thức cào (1 TRONG 2 HÌNH THỨC) */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              2. Chọn hình thức cào (Chọn 1 trong 2)
            </label>

            {/* Toggle Mode */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-border mb-3">
              <button
                type="button"
                onClick={() => setMode('count')}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'count'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <VideoCamera size={15} weight={mode === 'count' ? 'bold' : 'regular'} />
                <span>Theo số lượng video</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('days')}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'days'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarCheck size={15} weight={mode === 'days' ? 'bold' : 'regular'} />
                <span>Theo ngày đăng</span>
              </button>
            </div>

            {/* Mode: Theo số lượng video */}
            {mode === 'count' && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Số video mới nhất mỗi kênh:
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {count} video / kênh
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {COUNT_PRESETS.map((pVal) => (
                    <button
                      key={pVal}
                      type="button"
                      onClick={() => handlePresetCount(pVal)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        count === pVal && !customCount
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                          : 'border-border bg-card hover:bg-slate-100 dark:hover:bg-slate-700/50 text-foreground'
                      }`}
                    >
                      {pVal} video
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-muted-foreground">Tuỳ chọn:</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={customCount}
                      onChange={(e) => handleCustomCountChange(e.target.value)}
                      placeholder="vd: 35"
                      className="w-20 px-2.5 py-1 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center font-medium"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  💡 Hệ thống sẽ lấy chính xác {count} video mới nhất của mỗi kênh mà không giới hạn khoảng ngày đăng.
                </p>
              </div>
            )}

            {/* Mode: Theo ngày đăng */}
            {mode === 'days' && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Khoảng thời gian đăng video:
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Trong {days} ngày gần đây
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {DAYS_PRESETS.map((dVal) => (
                    <button
                      key={dVal}
                      type="button"
                      onClick={() => handlePresetDays(dVal)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        days === dVal && !customDays
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                          : 'border-border bg-card hover:bg-slate-100 dark:hover:bg-slate-700/50 text-foreground'
                      }`}
                    >
                      {dVal} ngày qua
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-muted-foreground">Tuỳ chọn:</span>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={customDays}
                      onChange={(e) => handleCustomDaysChange(e.target.value)}
                      placeholder="vd: 45"
                      className="w-20 px-2.5 py-1 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center font-medium"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  💡 Hệ thống sẽ chỉ lọc và lưu các video được xuất bản trong {days} ngày vừa qua.
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Lưu ý */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 text-xs">
            <Info size={18} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div className="space-y-1 leading-relaxed">
              <p>
                Tiến trình cào chạy ngầm trên máy chủ. Giữa mỗi kênh hệ thống sẽ tự động giãn cách vài giây để bảo vệ quota API và không gây nghẽn đường truyền.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {channelCount ? (
              <span>Dự kiến áp dụng trên danh sách kênh của bạn</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <CircleNotch size={15} weight="bold" className="animate-spin" />
              ) : (
                <Lightning size={15} weight="fill" />
              )}
              <span>{isLoading ? 'Đang gửi lệnh...' : 'Bắt đầu cào ngay'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
