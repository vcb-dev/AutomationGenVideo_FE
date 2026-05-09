'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Image as ImageIcon, Film, Search, Loader2, Trash2, CheckSquare, ChevronLeft, ChevronRight, Upload, Plus, History, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { PLATFORM_META, SocialPlatform } from '@/lib/api/social';
import { motion, AnimatePresence } from 'framer-motion';
import { socialApi, MediaLibraryItem } from '@/lib/api/social';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  maxSelect?: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaLibraryModal({ open, onClose, onSelect, maxSelect = 10 }: Props) {
  const [items, setItems]       = useState<MediaLibraryItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<'all' | 'image' | 'video'>('all');
  const [stats, setStats]           = useState<{ count: number; totalMB: number } | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadPct, setUploadPct]   = useState(0);
  const fileInputRef                = useRef<HTMLInputElement>(null);
  const [historyItem, setHistoryItem] = useState<MediaLibraryItem | null>(null);
  const [historyData, setHistoryData] = useState<{ posts: any[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await socialApi.library.list(p, 20);
      setItems(res.items);
      setTotal(res.total);
      setPages(res.pages);
      setPage(p);
    } catch {
      toast.error('Không tải được thư viện media');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) { setSelected(new Set()); return; }
    load(1);
    socialApi.library.stats().then(setStats).catch(() => {});
  }, [open, load]);

  const filtered = items.filter(item => {
    const matchSearch = !search || item.originalname.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'image' ? item.mimetype.startsWith('image/') : item.mimetype.startsWith('video/'));
    return matchSearch && matchFilter;
  });

  const toggleSelect = (item: MediaLibraryItem) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item.url)) {
        next.delete(item.url);
      } else {
        if (next.size >= maxSelect) {
          toast.error(`Chỉ có thể chọn tối đa ${maxSelect} file`);
          return prev;
        }
        next.add(item.url);
      }
      return next;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadPct(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        toast.loading(
          `[${i + 1}/${files.length}] ${isVideo ? '🎬 Đang tải lên (chia nhỏ)' : '🖼 Đang lưu'} ${file.name}…`,
          { id: 'lib-upload' },
        );
        if (isVideo) {
          await socialApi.upload.chunked(file, (pct) => setUploadPct(pct));
        } else {
          await socialApi.library.upload(file, (pct) => setUploadPct(pct));
        }
      }
      toast.success(`✅ Đã lưu ${files.length} file vào thư viện (DB)`, { id: 'lib-upload', duration: 3000 });
      load(1);
      socialApi.library.stats().then(setStats).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload thất bại', { id: 'lib-upload' });
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (selected.size === 0) { toast.error('Chưa chọn file nào'); return; }
    onSelect(Array.from(selected));
    onClose();
  };

  const handleDelete = async (item: MediaLibraryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Xoá "${item.originalname}" khỏi thư viện?`)) return;
    try {
      await socialApi.library.remove(item.id);
      toast.success('Đã xoá');
      load(page);
      setStats(await socialApi.library.stats());
    } catch {
      toast.error('Xoá thất bại');
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <div>
              <h2 className="text-lg font-black text-slate-900">📁 Thư viện Media</h2>
              {stats && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {stats.count} file · {stats.totalMB} MB đã lưu
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 flex-shrink-0">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm tên file..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {(['all', 'image', 'video'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {f === 'all' ? 'Tất cả' : f === 'image' ? '🖼 Ảnh' : '🎬 Video'}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400">{total} file</span>

            {/* Upload vào thư viện */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              hidden
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60 shadow-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {uploadPct > 0 ? `${uploadPct}% — đang nén…` : 'Đang xử lý…'}
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Upload (nén + lưu DB)
                </>
              )}
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-500">Chưa có media nào</p>
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  {search || filter !== 'all' ? 'Không tìm thấy file phù hợp' : 'Upload ảnh hoặc video để thêm vào thư viện'}
                </p>
                {!search && filter === 'all' && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Upload file ngay
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {filtered.map(item => {
                  const isVideo = item.mimetype.startsWith('video/');
                  const isSelected = selected.has(item.url);
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => toggleSelect(item)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${
                        isSelected ? 'border-blue-500 shadow-lg shadow-blue-200' : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      {/* Thumbnail */}
                      {isVideo ? (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                          <video src={item.url} className="w-full h-full object-cover opacity-70" muted />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Film className="w-6 h-6 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={item.originalname}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23f1f5f9"/><text x="50" y="55" text-anchor="middle" font-size="30">🖼</text></svg>'; }}
                        />
                      )}

                      {/* Selection overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                          <CheckSquare className="w-6 h-6 text-blue-600 drop-shadow-lg" />
                        </div>
                      )}

                      {/* Buttons hover */}
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Lịch sử bài đăng */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setHistoryItem(item);
                            setHistoryLoading(true);
                            setHistoryData(null);
                            try {
                              const data = await socialApi.library.postHistory(item.id);
                              setHistoryData(data);
                            } catch {
                              toast.error('Không tải được lịch sử');
                            } finally {
                              setHistoryLoading(false);
                            }
                          }}
                          className="w-6 h-6 bg-blue-500 text-white rounded-lg flex items-center justify-center shadow-md"
                          title="Xem lịch sử bài đăng"
                        >
                          <History className="w-3 h-3" />
                        </button>
                        {/* Xóa */}
                        <button
                          onClick={(e) => handleDelete(item, e)}
                          className="w-6 h-6 bg-red-500 text-white rounded-lg flex items-center justify-center shadow-md"
                          title="Xóa khỏi thư viện"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* File info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[9px] text-white font-medium truncate">{item.originalname}</p>
                        <p className="text-[8px] text-white/70">{formatBytes(item.size)}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel lịch sử bài đăng */}
          <AnimatePresence>
            {historyItem && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-slate-200 bg-slate-50 flex-shrink-0"
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => { setHistoryItem(null); setHistoryData(null); }}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 truncate">
                      Lịch sử: {historyItem.originalname}
                    </span>
                  </div>

                  {historyLoading ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang tải…
                    </div>
                  ) : !historyData || historyData.posts.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">Chưa có bài đăng nào dùng file này</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {historyData.posts.map((post: any) => {
                        const meta = PLATFORM_META[post.platform as SocialPlatform] || PLATFORM_META.FACEBOOK;
                        const isOk   = post.status === 'COMPLETED';
                        const isFail = post.status === 'FAILED';
                        return (
                          <div key={post.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs ${
                            isOk ? 'bg-emerald-50 border-emerald-100' :
                            isFail ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'
                          }`}>
                            <div className={`w-7 h-7 ${meta.color} rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0`}>
                              {meta.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="font-bold text-slate-700">{post.account?.name || meta.label}</span>
                                <span className={`flex items-center gap-0.5 font-semibold ${isOk ? 'text-emerald-600' : isFail ? 'text-red-500' : 'text-amber-600'}`}>
                                  {isOk ? <CheckCircle className="w-3 h-3" /> : isFail ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                  {isOk ? 'Thành công' : isFail ? 'Thất bại' : 'Đang chờ'}
                                </span>
                              </div>
                              <p className="text-slate-500 line-clamp-1">{post.message}</p>
                              <p className="text-slate-400 mt-0.5">
                                {new Date(post.created_at).toLocaleString('vi', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 px-6 py-3 border-t border-slate-100 flex-shrink-0">
              <button onClick={() => load(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 font-medium">Trang {page}/{pages}</span>
              <button onClick={() => load(page + 1)} disabled={page === pages} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <p className="text-sm text-slate-500">
              {selected.size > 0 ? (
                <span className="font-bold text-blue-600">✓ Đã chọn {selected.size} file</span>
              ) : (
                'Click vào file để chọn'
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set())}
                disabled={selected.size === 0}
                className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                Bỏ chọn
              </button>
              <button
                onClick={handleConfirm}
                disabled={selected.size === 0}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 shadow-sm"
              >
                Chèn {selected.size > 0 ? `(${selected.size})` : ''} vào bài
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
