'use client';

import { useState } from 'react';
import { ShoppingBag, Sparkle, Plus } from '@phosphor-icons/react';
import { ScraperChannelTag } from '@/services/scraperService';
import AddTagModal from './AddTagModal';

interface ChannelClassificationFilterBarProps {
  channelType: 'all' | 'product' | 'content';
  onChannelTypeChange: (type: 'all' | 'product' | 'content') => void;
  productLine: string;
  onProductLineChange: (line: string) => void;
  availableTags: ScraperChannelTag[];
  onRefreshTags?: () => void;
  canManageChannels?: boolean;
}

export default function ChannelClassificationFilterBar({
  channelType,
  onChannelTypeChange,
  productLine,
  onProductLineChange,
  availableTags,
  onRefreshTags,
  canManageChannels = false,
}: ChannelClassificationFilterBarProps) {
  const [showAddTagModal, setShowAddTagModal] = useState(false);

  return (
    <div className="space-y-2">
      {/* TẦNG 1: LOẠI KÊNH (Sản phẩm | Content | Tất cả) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => onChannelTypeChange('product')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            channelType === 'product'
              ? 'bg-card text-primary shadow-sm ring-1 ring-primary/20'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          <ShoppingBag size={14} weight="bold" />
          Sản phẩm
        </button>
        <button
          type="button"
          onClick={() => {
            onChannelTypeChange('content');
            onProductLineChange('all');
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            channelType === 'content'
              ? 'bg-card text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-purple-500/20'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          <Sparkle size={14} weight="bold" />
          Content
        </button>
        <button
          type="button"
          onClick={() => onChannelTypeChange('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            channelType === 'all'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          Tất cả loại
        </button>
      </div>

      {/* TẦNG 2: DÒNG SẢN PHẨM (chỉ hiện khi channelType là product hoặc all) */}
      {(channelType === 'product' || channelType === 'all') && (
        <div className="flex items-center gap-1.5 flex-wrap py-2 px-1 border-y border-border/50 bg-slate-50/40 dark:bg-slate-900/20 rounded-lg">
          <span className="text-xs font-semibold text-slate-400 mr-1 ml-1">Dòng sản phẩm:</span>
          <button
            type="button"
            onClick={() => onProductLineChange('all')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              productLine === 'all'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'bg-card hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-border'
            }`}
          >
            Tất cả dòng
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag.slug}
              type="button"
              onClick={() => onProductLineChange(tag.slug)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                productLine === tag.slug
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'bg-card hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-border'
              }`}
            >
              {tag.name}
            </button>
          ))}
          {canManageChannels && (
            <button
              type="button"
              onClick={() => setShowAddTagModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border border-dashed border-primary text-primary hover:bg-primary/5 transition-all ml-1"
            >
              <Plus size={12} weight="bold" />
              Thêm dòng
            </button>
          )}
        </div>
      )}

      {showAddTagModal && (
        <AddTagModal
          isOpen={showAddTagModal}
          onClose={() => setShowAddTagModal(false)}
          onSuccess={(newTag) => {
            onRefreshTags?.();
            onProductLineChange(newTag.slug);
          }}
        />
      )}
    </div>
  );
}
