'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Loader2, Sparkles, Music2, ExternalLink,
  CheckCircle2, RefreshCw, ShoppingBag, Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/api-client';

export interface DiscoveredTiktokChannel {
  name: string;
  channelId: string;
  link_channel: string | null;
  username: string | null;
  type: 'TikTok Business' | 'TikTok Shop';
  orderCount: number;
  latestOrderDate: string;
  isImported: boolean;
}

interface SapoTiktokSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SapoTiktokSyncModal: React.FC<SapoTiktokSyncModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [channels, setChannels] = useState<DiscoveredTiktokChannel[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

  const fetchTiktokChannels = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/sapo/tiktok-channels`);
      if (res.ok) {
        const data: DiscoveredTiktokChannel[] = await res.json();
        setChannels(data || []);
        // Mặc định chọn những kênh chưa được nhập
        const notImported = (data || []).filter((c) => !c.isImported).map((c) => c.name);
        setSelectedNames(notImported);
      } else {
        toast.error('Không thể tải danh sách kênh TikTok từ Sapo.');
      }
    } catch {
      toast.error('Lỗi kết nối khi quét kênh Sapo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTiktokChannels();
    }
  }, [isOpen]);

  const toggleSelect = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => {
    if (selectedNames.length === channels.length) {
      setSelectedNames([]);
    } else {
      setSelectedNames(channels.map((c) => c.name));
    }
  };

  const handleSync = async () => {
    const toSync = channels.filter((c) => selectedNames.includes(c.name));
    if (toSync.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 kênh để đồng bộ');
      return;
    }

    setSyncing(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/sapo/sync-tiktok-channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: toSync }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã đồng bộ thành công ${data.count} kênh TikTok từ Sapo!`);
        onSuccess();
        onClose();
      } else {
        toast.error(data.message || 'Lỗi khi đồng bộ kênh');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi đồng bộ kênh');
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black/40 rounded-2xl border border-white/10 text-cyan-400">
              <Music2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Kênh TikTok từ Sapo</h3>
                <span className="text-[10px] font-black px-2 py-0.5 bg-cyan-400/20 text-cyan-300 rounded-full border border-cyan-400/30">
                  TikTok Business & Shop
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Tự động phát hiện kênh theo các đơn hàng thực tế trên Sapo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={loading || channels.length === 0}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50"
            >
              {selectedNames.length === channels.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-500">
              Đã chọn <span className="font-black text-cyan-600">{selectedNames.length}</span> / {channels.length} kênh
            </span>
          </div>

          <button
            type="button"
            onClick={fetchTiktokChannels}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Quét lại</span>
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
              <p className="text-sm font-bold">Đang quét đơn hàng từ Sapo để tìm kênh TikTok...</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Store className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-base font-bold text-slate-600">Không tìm thấy kênh TikTok nào trong đơn Sapo</p>
              <p className="text-xs text-slate-400 mt-1">Các đơn hàng gần đây chưa có nguồn tiktok-for-business hoặc tiktokshop.</p>
            </div>
          ) : (
            channels.map((c) => {
              const isSelected = selectedNames.includes(c.name);
              const isBusiness = c.type === 'TikTok Business';

              return (
                <div
                  key={c.name}
                  onClick={() => toggleSelect(c.name)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-cyan-50/50 border-cyan-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-1 w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900 truncate">
                          {c.name}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            isBusiness
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {isBusiness ? <Sparkles className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                          {c.type}
                        </span>
                        {c.isImported && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Đã kết nối
                          </span>
                        )}
                      </div>

                      {/* TikTok link and username */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                        {c.link_channel || c.username ? (
                          <a
                            href={c.link_channel || `https://www.tiktok.com/@${c.username?.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-cyan-600 hover:text-cyan-800 hover:underline flex items-center gap-1 truncate max-w-sm"
                            title={c.link_channel || `https://www.tiktok.com/@${c.username?.replace(/^@/, '')}`}
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{c.link_channel || `@${c.username?.replace(/^@/, '')}`}</span>
                          </a>
                        ) : null}

                        <span className="text-slate-400 text-[11px] font-medium">
                          📦 {c.orderCount} đơn hàng
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || selectedNames.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-slate-300 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-400" />
            )}
            <span>
              {syncing ? 'Đang đồng bộ...' : `Đồng bộ ${selectedNames.length} kênh vào hệ thống`}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
