'use client';

import React, { useState } from 'react';
import { X, Loader2, Music2, Link as LinkIcon, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/api-client';
import { extractTiktokUsername, buildTiktokProfileUrl } from '@/lib/sapo/tiktok-helpers';

interface ManualTiktokModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualTiktokModal: React.FC<ManualTiktokModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [linkOrUser, setLinkOrUser] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

  const resetForm = () => {
    setName('');
    setLinkOrUser('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error('Vui lòng nhập tên kênh TikTok');
      return;
    }

    const cleanUsername = extractTiktokUsername(linkOrUser);
    const fullLink = buildTiktokProfileUrl(linkOrUser);

    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/sapo/sync-tiktok-channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channels: [
            {
              name: cleanName,
              channelId: cleanUsername || cleanName.toLowerCase().replace(/\s+/g, '_'),
              link_channel: fullLink || null,
              username: cleanUsername || null,
              // Không gửi `type`: kênh thêm tay chỉ là TikTok, không phân Business/Shop.
              source: 'manual',
            },
          ],
        }),
      });

      if (res.ok) {
        toast.success(`Đã thêm kênh TikTok "${cleanName}" thành công!`);
        resetForm();
        onSuccess();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || 'Không thể thêm kênh TikTok.');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-md">
                <Music2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Thêm Kênh TikTok Thủ Công</h3>
                <p className="text-xs text-slate-500">Nhập thông tin kênh để quản lý và làm báo cáo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên kênh TikTok <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Huy K Vàng Bạc Đá Quý"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Đường link trang TikTok hoặc @username
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={linkOrUser}
                  onChange={(e) => setLinkOrUser(e.target.value)}
                  placeholder="https://www.tiktok.com/@huyk.xuongvangbac2 hoặc @huyk.xuongvangbac2"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Đường link sẽ được lưu để người dùng có thể nhấp trực tiếp vào xem trang.
              </p>
            </div>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {submitting ? 'Đang lưu...' : 'Thêm kênh'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
