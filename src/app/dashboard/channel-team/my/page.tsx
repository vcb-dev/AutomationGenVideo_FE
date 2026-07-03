'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, X, Loader2, Link as LinkIcon, Hash,
  Facebook, Instagram, Music2, Youtube, Globe,
  ExternalLink, Radio,
  ChevronDown, SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';

interface Channel {
  id: string;
  name: string;
  platform?: string | null;
  channel_id?: string | null;
  link_channel?: string | null;
  status?: string | null;
  team?: { id: string; name: string } | null;
  owner?: { id: string; full_name: string; email: string } | null;
  created_at: string;
  updated_at: string;
}

interface ChannelFormData {
  name: string;
  platform: string;
  channel_id: string;
  link_channel: string;
  status: string;
}

const EMPTY_FORM: ChannelFormData = {
  name: '', platform: 'facebook', channel_id: '', link_channel: '', status: 'đang hoạt động',
};

const PLATFORMS = [
  { value: 'all',       label: 'Tất cả',    icon: Globe,     iconColor: 'text-slate-400',   pillBg: 'bg-slate-100',   pillText: 'text-slate-600',   activeBg: 'bg-slate-800 text-white'   },
  { value: 'facebook',  label: 'Facebook',  icon: Facebook,  iconColor: 'text-blue-500',    pillBg: 'bg-blue-50',     pillText: 'text-blue-700',    activeBg: 'bg-blue-600 text-white'    },
  { value: 'instagram', label: 'Instagram', icon: Instagram, iconColor: 'text-fuchsia-500', pillBg: 'bg-fuchsia-50',  pillText: 'text-fuchsia-700', activeBg: 'bg-fuchsia-600 text-white' },
  { value: 'tiktok',   label: 'TikTok',    icon: Music2,    iconColor: 'text-slate-700',   pillBg: 'bg-slate-100',   pillText: 'text-slate-700',   activeBg: 'bg-slate-700 text-white'   },
  { value: 'youtube',  label: 'YouTube',   icon: Youtube,   iconColor: 'text-red-500',     pillBg: 'bg-red-50',      pillText: 'text-red-700',     activeBg: 'bg-red-600 text-white'     },
];

const STATUS_MAP: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  'đang hoạt động':  { label: 'Đang hoạt động',  dot: 'bg-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'ngừng hoạt động': { label: 'Ngừng hoạt động', dot: 'bg-red-500',     bg: 'bg-red-100',     text: 'text-red-800'    },
  'tạm ngừng':       { label: 'Tạm ngừng',       dot: 'bg-orange-400',  bg: 'bg-orange-100',  text: 'text-orange-800' },
  'hủy kênh':        { label: 'Hủy kênh',        dot: 'bg-slate-500',   bg: 'bg-slate-200',   text: 'text-slate-700'  },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'đang hoạt động',  label: 'Đang hoạt động'  },
  { value: 'tạm ngừng',       label: 'Tạm ngừng'       },
  { value: 'ngừng hoạt động', label: 'Ngừng hoạt động' },
  { value: 'hủy kênh',        label: 'Hủy kênh'        },
];

function getPlatform(v?: string | null) {
  return PLATFORMS.find(p => p.value === v?.toLowerCase()) ?? PLATFORMS[0];
}
function getStatus(v?: string | null) {
  return STATUS_MAP[v?.toLowerCase() ?? ''] ?? { label: v ?? '—', dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-500' };
}

export default function MyChannelsPage() {
  const { token, user } = useAuthStore();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

  const [channels,       setChannels]       = useState<Channel[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [platFilter,     setPlatFilter]     = useState('all');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [showModal,      setShowModal]      = useState(false);
  const [form,           setForm]           = useState<ChannelFormData>(EMPTY_FORM);
  const [saving,         setSaving]         = useState(false);

  const statusDropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusDropRef.current && !statusDropRef.current.contains(e.target as Node))
        setShowStatusDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/channels/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: Channel[] = await res.json();
      setChannels(data);
    } catch { toast.error('Không thể tải danh sách kênh'); }
    finally { setLoading(false); }
  }, [apiUrl, token]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const filtered = channels.filter(c => {
    const okPlat   = platFilter === 'all' || c.platform?.toLowerCase() === platFilter;
    const okStatus = statusFilter === 'all' || c.status?.toLowerCase() === statusFilter;
    const q        = search.toLowerCase();
    const okSearch = !q || c.name.toLowerCase().includes(q) || c.platform?.toLowerCase().includes(q);
    return okPlat && okStatus && okSearch;
  });

  const afterPlatform = channels.filter(c =>
    platFilter === 'all' || c.platform?.toLowerCase() === platFilter,
  );

  const clearAllFilters = () => { setSearch(''); setPlatFilter('all'); setStatusFilter('all'); };
  const hasFilter = search || platFilter !== 'all' || statusFilter !== 'all';

  const openCreate = () => { setForm(EMPTY_FORM); setShowModal(true); };
  const closeModal = () => { if (saving) return; setShowModal(false); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Tên kênh không được để trống'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Lưu thất bại'); return; }
      toast.success('Đã thêm kênh mới');
      closeModal();
      fetchChannels();
    } catch { toast.error('Có lỗi xảy ra'); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all";
  const labelCls = "block text-sm font-bold text-slate-600 mb-2 tracking-wide";

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* ─── STICKY HEADER ─── */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 pt-6 pb-0">

          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 flex-shrink-0">
                <Radio className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">Kênh của tôi</h1>
                <p className="text-base text-slate-400 mt-1">
                  <span className="font-semibold text-slate-600">{(user as any)?.full_name ?? 'Bạn'}</span>
                  {' · '}{channels.length} kênh đang quản lý
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm kênh, platform…"
                  className="pl-11 pr-10 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-base text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white w-64 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button onClick={openCreate}
                className="flex items-center gap-2.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95 whitespace-nowrap">
                <Plus className="w-5 h-5" />
                Thêm kênh
              </button>
            </div>
          </div>

          {/* Platform tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {PLATFORMS.map(p => {
              const count = p.value === 'all' ? channels.length
                : channels.filter(c => c.platform?.toLowerCase() === p.value).length;
              const active = platFilter === p.value;
              return (
                <button key={p.value} onClick={() => setPlatFilter(p.value)}
                  className={`flex items-center gap-2.5 px-5 py-3.5 rounded-t-xl text-base font-bold whitespace-nowrap border-b-2 transition-all
                    ${active
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-600'
                      : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'}`}>
                  <p.icon className={`w-5 h-5 ${active ? 'text-indigo-600' : p.iconColor}`} />
                  {p.label}
                  <span className={`text-sm px-2.5 py-0.5 rounded-full font-bold
                    ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="max-w-6xl mx-auto px-8 pt-8">

        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && channels.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center mb-6">
              <Radio className="w-12 h-12 text-indigo-300" />
            </div>
            <p className="text-2xl font-bold text-slate-700 mb-2">Chưa có kênh nào</p>
            <p className="text-base text-slate-400 mb-10 text-center max-w-sm">
              Thêm kênh mạng xã hội của bạn để bắt đầu báo cáo traffic.
            </p>
            <button onClick={openCreate}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:-translate-y-0.5">
              <Plus className="w-5 h-5" /> Thêm kênh ngay
            </button>
          </motion.div>
        )}

        {!loading && channels.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-7 py-4 border-b border-slate-100 bg-slate-50 gap-6">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tên kênh</span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Platform</span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Team</span>

              {/* Status filter */}
              <div className="relative" ref={statusDropRef}>
                <button
                  onClick={() => setShowStatusDrop(v => !v)}
                  className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest transition-colors
                    ${statusFilter !== 'all' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {statusFilter !== 'all' ? (
                    <>
                      <span className={`w-2 h-2 rounded-full ${STATUS_MAP[statusFilter]?.dot ?? 'bg-slate-400'}`} />
                      {STATUS_MAP[statusFilter]?.label ?? 'Trạng thái'}
                    </>
                  ) : 'Trạng thái'}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStatusDrop ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showStatusDrop && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute top-full left-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 z-20 overflow-hidden py-1.5"
                    >
                      {STATUS_OPTIONS.map(opt => {
                        const info   = opt.value !== 'all' ? STATUS_MAP[opt.value] : null;
                        const active = statusFilter === opt.value;
                        const count  = opt.value === 'all'
                          ? afterPlatform.length
                          : afterPlatform.filter(c => c.status?.toLowerCase() === opt.value).length;
                        return (
                          <button key={opt.value}
                            onClick={() => { setStatusFilter(opt.value); setShowStatusDrop(false); }}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold transition-colors
                              ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            <span className="flex items-center gap-2.5">
                              {info
                                ? <span className={`w-2 h-2 rounded-full flex-shrink-0 ${info.dot}`} />
                                : <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />}
                              {opt.label}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold
                              ${active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* No results */}
            {filtered.length === 0 ? (
              <div className="py-24 flex flex-col items-center text-slate-400">
                <Search className="w-12 h-12 mb-4 opacity-25" />
                <p className="text-lg font-bold text-slate-500">Không tìm thấy kênh nào</p>
                <p className="text-sm mt-2 text-slate-400">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                <button onClick={clearAllFilters}
                  className="mt-5 text-sm text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5">
                  <X className="w-4 h-4" /> Xóa tất cả bộ lọc
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map((ch, idx) => {
                  const plat = getPlatform(ch.platform);
                  const stat = getStatus(ch.status);
                  return (
                    <motion.div key={ch.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="grid grid-cols-[2fr_1fr_1fr_1fr] px-7 py-5 items-center hover:bg-slate-50/80 transition-colors group gap-6">

                      {/* Name */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl ${plat.pillBg} flex items-center justify-center flex-shrink-0`}>
                          <plat.icon className={`w-6 h-6 ${plat.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-bold text-slate-800 truncate">{ch.name}</p>
                            {ch.link_channel && (
                              <a href={ch.link_channel} target="_blank" rel="noopener noreferrer"
                                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-indigo-500">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Platform badge */}
                      <div>
                        <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold ${plat.pillBg} ${plat.pillText}`}>
                          <plat.icon className="w-4 h-4" />
                          {plat.value !== 'all' ? plat.label : ch.platform ?? '—'}
                        </span>
                      </div>

                      {/* Team */}
                      <div>
                        {ch.team?.name
                          ? <span className="text-base font-medium text-slate-600">{ch.team.name}</span>
                          : <span className="text-base text-slate-300">—</span>}
                      </div>

                      {/* Status badge */}
                      <div>
                        <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold ${stat.bg} ${stat.text}`}>
                          <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                          {stat.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <p className="text-sm text-slate-400 font-medium">
                {filtered.length < channels.length
                  ? <>Đang lọc <span className="font-bold text-slate-600">{filtered.length}</span> / {channels.length} kênh</>
                  : <>{channels.length} kênh của bạn</>
                }
              </p>
              {hasFilter && (
                <button onClick={clearAllFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" /> Xóa bộ lọc
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL THÊM KÊNH ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 4 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">

              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Thêm kênh mới</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Kênh sẽ tự động gán vào team của bạn</p>
                  </div>
                </div>
                <button onClick={closeModal}
                  className="w-9 h-9 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-5">
                <div>
                  <label className={labelCls}>Tên kênh <span className="text-red-400 font-normal">*</span></label>
                  <input autoFocus value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="Ví dụ: Fanpage TikTok chính"
                    className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Platform</label>
                    <div className="relative">
                      <select value={form.platform}
                        onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                        className={`${inputCls} appearance-none pr-10 cursor-pointer`}>
                        {PLATFORMS.filter(p => p.value !== 'all').map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Trạng thái</label>
                    <div className="relative">
                      <select value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                        className={`${inputCls} appearance-none pr-10 cursor-pointer`}>
                        {Object.entries(STATUS_MAP).map(([v, s]) => (
                          <option key={v} value={v}>{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>ID kênh</label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input value={form.channel_id}
                      onChange={e => setForm(f => ({ ...f, channel_id: e.target.value }))}
                      placeholder="ID kênh trên platform, ví dụ: UCxxxxxxxx"
                      className={`${inputCls} pl-11`} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Link kênh</label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input value={form.link_channel}
                      onChange={e => setForm(f => ({ ...f, link_channel: e.target.value }))}
                      placeholder="https://..."
                      className={`${inputCls} pl-11`} />
                  </div>
                </div>
              </div>

              <div className="px-8 pb-8 pt-2 flex gap-4">
                <button onClick={closeModal} disabled={saving}
                  className="flex-1 py-4 border-2 border-slate-200 text-slate-600 text-base font-bold rounded-2xl hover:bg-slate-50 transition-colors">
                  Hủy
                </button>
                <button onClick={handleSave} disabled={saving || !form.name.trim()}
                  className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-40 flex items-center justify-center gap-2.5">
                  {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                  {saving ? 'Đang lưu...' : 'Thêm kênh'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
