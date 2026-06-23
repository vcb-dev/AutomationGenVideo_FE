import React from 'react';
import { Sparkles, Play, User, Eye, ChevronDown } from 'lucide-react';
import { ContentWinItem } from '../types';
import { formatDotViews } from '../utils';

interface ContentNewWinCardsProps {
  videos: ContentWinItem[];
  isCollapsed: boolean;
  onToggle: () => void;
  onUpdateRow: (index: number, field: string, value: string) => void;
}

export default function ContentNewWinCards({
  videos, isCollapsed, onToggle, onUpdateRow
}: ContentNewWinCardsProps) {
  const handleViewsKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
      return;
    }
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];
    if (
      allowedKeys.includes(e.key) ||
      (e.ctrlKey === true || e.metaKey === true)
    ) {
      return;
    }
    if (!/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleViewsInput = (e: React.FormEvent<HTMLSpanElement>) => {
    const target = e.currentTarget;
    const originalText = target.textContent || '';
    const sanitized = originalText.replace(/[^0-9.]/g, '');
    if (originalText !== sanitized) {
      target.textContent = sanitized;
      const range = document.createRange();
      const sel = window.getSelection();
      if (sel) {
        range.selectNodeContents(target);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };
  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-[#10b981]/20 shadow-lg shadow-emerald-950/10">
      <div
        onClick={onToggle}
        className="bg-[#063529] px-4 py-3 flex items-center justify-between border-b border-[#10b981]/20 cursor-pointer select-none hover:bg-[#0a4d3b] transition-colors"
      >
        <span className="text-[#10b981] font-black tracking-wider text-sm uppercase flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#10b981]" /> I. Content Mới Win
        </span>
        <ChevronDown className={`w-4 h-4 text-[#10b981] transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
      </div>

      {!isCollapsed && (
        <div className="bg-[#0c1322] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-[#131d31]/70 border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-4 flex flex-col gap-4 transition-all duration-200 shadow-md group"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Left Player Mock */}
                  <div className="w-full sm:w-44 h-48 bg-[#080d19] border border-white/[0.06] rounded-lg flex flex-col items-center justify-center relative overflow-hidden shrink-0 group-hover:border-blue-500/30 transition-colors">
                    <div className="absolute inset-0 bg-radial-gradient from-blue-900/10 to-transparent pointer-events-none" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 z-10">
                      {video.label}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-200 cursor-pointer z-10">
                      <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Right Contents Detail */}
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex flex-col">
                      <div className="text-[10px] font-extrabold text-slate-300 bg-[#1e2a45] px-2.5 py-1 rounded-t-md border-b border-white/[0.06] tracking-wide uppercase">
                        Nội dung video
                      </div>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdateRow(video.id - 1, 'content', e.currentTarget.textContent || '')}
                        className="text-slate-300 text-xs bg-[#090f1b] p-2.5 rounded-b-md leading-relaxed min-h-[60px] font-medium border border-t-0 border-white/[0.03] outline-none focus:bg-white/[0.04] cursor-text break-words whitespace-normal"
                      >
                        {video.content}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <div className="text-[10px] font-extrabold text-emerald-400 bg-[#073525] px-2.5 py-1 rounded-t-md border-b border-emerald-400/10 tracking-wide uppercase">
                        Phân tích tại sao win?
                      </div>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdateRow(video.id - 1, 'analysis', e.currentTarget.textContent || '')}
                        className="text-slate-300 text-xs bg-[#051a14]/60 p-2.5 rounded-b-md leading-relaxed min-h-[60px] font-medium border border-t-0 border-[#10b981]/5 outline-none focus:bg-[#051a14]/90 cursor-text break-words whitespace-normal"
                      >
                        {video.analysis}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-md text-slate-300 text-[10px] font-extrabold tracking-wide uppercase">
                    <User className="w-3 h-3 text-slate-400" /> Editor:
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateRow(video.id - 1, 'editor', e.currentTarget.textContent || '')}
                      className="outline-none focus:bg-white/[0.04] cursor-text ml-1 break-words whitespace-normal"
                    >
                      {video.editor}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-md text-[10px] font-extrabold tracking-wide uppercase ml-auto">
                    <Eye className="w-3 h-3 text-blue-500" />
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      onKeyDown={handleViewsKeyDown}
                      onInput={handleViewsInput}
                      onBlur={(e) => {
                        const formatted = formatDotViews(e.currentTarget.textContent || '');
                        onUpdateRow(video.id - 1, 'views', formatted);
                        e.currentTarget.textContent = formatted;
                      }}
                      className="outline-none focus:bg-white/[0.04] cursor-text ml-1"
                    >
                      {formatDotViews(video.views)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
