'use client';

import { useState, useEffect } from 'react';
import { X, Check, Tag, ShoppingBag, Sparkle, Plus, CircleNotch } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { scraperService, ScrapedFanpage, ScraperChannelTag } from '@/services/scraperService';
import { useAuthStore } from '@/store/auth-store';
import AddTagModal from './AddTagModal';

interface ChannelClassificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fanpage: ScrapedFanpage;
  availableTags: ScraperChannelTag[];
  onRefreshTags?: () => void;
  onSuccess: (updated: { channel_type: string; product_lines: string[] }) => void;
}

export default function ChannelClassificationModal({
  isOpen,
  onClose,
  fanpage,
  availableTags,
  onRefreshTags,
  onSuccess,
}: ChannelClassificationModalProps) {
  const { token } = useAuthStore();
  const [channelType, setChannelType] = useState<'product' | 'content'>('product');
  const [selectedProductLines, setSelectedProductLines] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddTagModal, setShowAddTagModal] = useState(false);

  useEffect(() => {
    if (fanpage) {
      setChannelType(fanpage.channel_type === 'content' ? 'content' : 'product');
      setSelectedProductLines(fanpage.product_lines || []);
    }
  }, [fanpage, isOpen]);

  if (!isOpen) return null;

  const toggleProductLine = (slug: string) => {
    setSelectedProductLines((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSave = async () => {
    if (!token) {
      toast.error('Chưa đăng nhập');
      return;
    }

    setIsSubmitting(true);
    try {
      await scraperService.updateFanpageClassification(token, fanpage.id, {
        channel_type: channelType,
        product_lines: channelType === 'product' ? selectedProductLines : [],
      });
      toast.success(`Đã cập nhật phân loại cho kênh ${fanpage.name}`);
      onSuccess({
        channel_type: channelType,
        product_lines: channelType === 'product' ? selectedProductLines : [],
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật phân loại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/30">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Tag size={18} className="text-primary" weight="bold" />
                Phân Loại Kênh
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-sm mt-0.5 font-medium">
                {fanpage.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Loại kênh: Sản phẩm vs Content */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                1. Loại kênh chính
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannelType('product')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    channelType === 'product'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary text-foreground'
                      : 'border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${channelType === 'product' ? 'bg-primary text-primary-foreground' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <ShoppingBag size={18} weight="bold" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Kênh Sản phẩm</div>
                    <div className="text-xs text-slate-400 mt-0.5">Bán hàng, giới thiệu trang sức theo dòng sản phẩm</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setChannelType('content')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    channelType === 'content'
                      ? 'border-purple-500 bg-purple-500/5 ring-1 ring-purple-500 text-foreground'
                      : 'border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${channelType === 'content' ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Sparkle size={18} weight="bold" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Kênh Content</div>
                    <div className="text-xs text-slate-400 mt-0.5">Nội dung sáng tạo, viral, lifestyle, không bán sản phẩm</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Dòng sản phẩm (chỉ hiện khi loại kênh là Sản phẩm) */}
            {channelType === 'product' && (
              <div className="animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    2. Dòng sản phẩm (Chọn một hoặc nhiều dòng)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddTagModal(true)}
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    <Plus size={12} weight="bold" />
                    Thêm dòng mới
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const isSelected = selectedProductLines.includes(tag.slug);
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        onClick={() => toggleProductLine(tag.slug)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-card text-foreground border-border hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check size={12} weight="bold" />}
                        <span>{tag.name}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedProductLines.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    * Bạn có thể chọn nhiều dòng sản phẩm để dễ lọc (ví dụ: vừa bán Vàng vừa bán Kim cương).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
            >
              {isSubmitting ? <CircleNotch size={14} className="animate-spin" /> : null}
              {isSubmitting ? 'Đang lưu...' : 'Lưu phân loại'}
            </button>
          </div>
        </div>
      </div>

      {showAddTagModal && (
        <AddTagModal
          isOpen={showAddTagModal}
          onClose={() => setShowAddTagModal(false)}
          onSuccess={(newTag) => {
            setSelectedProductLines((prev) => [...prev, newTag.slug]);
            onRefreshTags?.();
          }}
        />
      )}
    </>
  );
}
