'use client';

import { useState } from 'react';
import { X, Plus, Tag, CircleNotch } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { scraperService, ScraperChannelTag } from '@/services/scraperService';
import { useAuthStore } from '@/store/auth-store';

interface AddTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTag: ScraperChannelTag) => void;
}

const COLOR_OPTIONS = [
  { name: 'amber', label: 'Vàng hổ phách', bg: 'bg-amber-500' },
  { name: 'violet', label: 'Tím thạch anh', bg: 'bg-violet-500' },
  { name: 'cyan', label: 'Xanh lơ kim cương', bg: 'bg-cyan-500' },
  { name: 'emerald', label: 'Xanh ngọc lục bảo', bg: 'bg-emerald-500' },
  { name: 'slate', label: 'Bạc ánh kim', bg: 'bg-slate-500' },
  { name: 'blue', label: 'Xanh dương Sapphire', bg: 'bg-blue-500' },
  { name: 'rose', label: 'Hồng Ruby', bg: 'bg-rose-500' },
];

export default function AddTagModal({ isOpen, onClose, onSuccess }: AddTagModalProps) {
  const { token } = useAuthStore();
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState('indigo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tagName.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập tên dòng sản phẩm');
      return;
    }
    if (!token) {
      toast.error('Chưa đăng nhập');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await scraperService.createChannelTag(token, {
        name: trimmed,
        color: selectedColor,
      });
      toast.success(`Đã thêm dòng sản phẩm "${created.name}"`);
      setTagName('');
      onSuccess(created);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo dòng sản phẩm');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Tag size={18} weight="bold" />
            </div>
            <span>Thêm Dòng Sản Phẩm Mới</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Tên dòng sản phẩm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="VD: Phong thủy, Ngọc bích, Titan..."
              className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Màu đại diện
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c.name)}
                  title={c.label}
                  className={`w-7 h-7 rounded-full ${c.bg} transition-transform ${
                    selectedColor === c.name ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !tagName.trim()}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
            >
              {isSubmitting ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <Plus size={14} weight="bold" />
              )}
              {isSubmitting ? 'Đang lưu...' : 'Thêm dòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
