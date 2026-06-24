import React from 'react';
import { XCircle, ChevronDown, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { FailVideoItem } from '../types';
import { formatDotViews } from '../utils';

interface ContentFailTableProps {
  failVideos: FailVideoItem[];
  activeTab: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onUpdateRow: (index: number, field: string, value: string) => void;
  onDeleteRow: (index: number) => void;
  onAddRow: () => void;
}

export default function ContentFailTable({
  failVideos, activeTab, isCollapsed, onToggle, onUpdateRow, onDeleteRow, onAddRow
}: ContentFailTableProps) {
  const rows = [...failVideos];
  while (rows.length < 5) {
    rows.push({
      id: rows.length + 1,
      label: 'Data point',
      content: 'Data point',
      failReason: 'Data point',
      editor: 'Data point',
      views: '-'
    });
  }
  const [activeDropdownIdx, setActiveDropdownIdx] = React.useState<number | null>(null);

  const handleViewsKeyDown = (e: React.KeyboardEvent<HTMLTableCellElement>) => {
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

  const handleViewsInput = (e: React.FormEvent<HTMLTableCellElement>) => {
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
    <div className="flex flex-col rounded-xl overflow-hidden border border-red-500/20 shadow-lg shadow-red-950/10">
      <div
        onClick={onToggle}
        className="bg-[#271414] px-4 py-3 flex items-center justify-between border-b border-red-500/20 cursor-pointer select-none hover:bg-[#341b1b] transition-colors"
      >
        <span className="text-red-400 font-black tracking-wider text-sm uppercase flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-400" /> 5 Content fail của team
        </span>
        <ChevronDown className={`w-4 h-4 text-red-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
      </div>

      {!isCollapsed && (
        <div className="bg-[#0c1322] p-6 overflow-x-auto">
          <table className="w-full table-fixed text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 text-[10px] uppercase tracking-wider font-bold bg-white/[0.02]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-16">TEAM</th>
                <th className="py-3 px-4 w-28">EDITOR</th>
                <th className="py-3 px-4 w-32">LINK</th>
                <th className="py-3 px-4 w-24">THUMBNAIL</th>
                <th className="py-3 px-4 w-36">NỀN TẢNG</th>
                <th className="py-3 px-4 w-36">NGÀY ĐĂNG</th>
                <th className="py-3 px-4 w-[20%]">NỘI DUNG CONTENT</th>
                <th className="py-3 px-4 w-[20%]">PHÂN TÍCH TẠI SAO KHÔNG WIN?</th>
                <th className="py-3 px-4 w-28 text-right">SỐ VIEWS</th>
                <th className="py-3 px-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((video, idx) => {
                const isMock = video.label === 'Data point';
                return (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-semibold text-xs">
                      {isMock ? 'Data point' : activeTab}
                    </td>
                    <td
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateRow(idx, 'editor', e.currentTarget.textContent || '')}
                      className="py-3.5 px-4 text-slate-300 font-medium text-xs outline-none focus:bg-white/[0.04] cursor-text break-words whitespace-normal"
                    >
                      {video.editor}
                    </td>
                    <td
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateRow(idx, 'videoUrl', e.currentTarget.textContent || '')}
                      className={`py-3.5 px-4 text-xs outline-none focus:bg-white/[0.04] cursor-text max-w-[120px] truncate focus:max-w-none focus:whitespace-normal break-all ${isMock
                        ? 'text-slate-500 font-bold text-center'
                        : !video.videoUrl
                          ? 'text-blue-400/50 italic'
                          : 'text-blue-400 hover:text-blue-300 underline font-medium'
                        }`}
                      title={isMock ? '' : (video.videoUrl || 'Dán link video...')}
                    >
                      {isMock ? '-' : (video.videoUrl || 'Dán link video...')}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="flex items-start shrink-0">
                        <label className="cursor-pointer group relative block">
                          {video.thumbnail && video.thumbnail !== 'Data point' ? (
                            <div className="w-10 h-10 rounded bg-slate-800 border border-white/10 overflow-hidden transition-all duration-200 hover:border-blue-500 hover:scale-105 shrink-0">
                              <img src={video.thumbnail} className="w-full h-full object-cover" alt="Thumb" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ImageIcon className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-900 border border-dashed border-white/10 hover:border-blue-500 hover:bg-white/[0.02] flex items-center justify-center transition-all duration-200 shrink-0" title="Click để tải ảnh lên">
                              <ImageIcon className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const localUrl = URL.createObjectURL(file);
                                onUpdateRow(idx, 'thumbnail', localUrl);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-center relative">
                      {isMock ? '-' : (
                        <div className="relative inline-block w-full">
                          <button
                            type="button"
                            onClick={() => setActiveDropdownIdx(activeDropdownIdx === idx ? null : idx)}
                            className="bg-[#0f172a]/60 hover:bg-[#0f172a]/90 border border-white/[0.08] hover:border-white/[0.16] outline-none rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 flex items-center justify-between gap-1.5 transition-all duration-150 w-full select-none cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              {video.platform === 'Instagram Reels' && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />}
                              {video.platform === 'YouTube Shorts' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                              {(video.platform === 'TikTok' || !video.platform) && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                              {video.platform || 'TikTok'}
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                          </button>

                          {activeDropdownIdx === idx && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setActiveDropdownIdx(null)}
                              />
                              <div className="absolute left-0 right-0 mt-1 bg-[#0f172a] border border-white/[0.08] rounded-xl shadow-2xl z-30 p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100">
                                {[
                                  { name: 'TikTok', color: 'bg-cyan-400' },
                                  { name: 'Instagram Reels', color: 'bg-pink-500' },
                                  { name: 'YouTube Shorts', color: 'bg-red-500' }
                                ].map((opt) => (
                                  <button
                                    key={opt.name}
                                    type="button"
                                    onClick={() => {
                                      onUpdateRow(idx, 'platform', opt.name);
                                      setActiveDropdownIdx(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-md transition-all duration-100 flex items-center gap-2 cursor-pointer"
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${opt.color}`} />
                                    {opt.name}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-center">
                      {isMock ? '-' : (
                        <div className="relative group/date max-w-[125px] mx-auto">
                          <input
                            type="date"
                            value={video.postDate || ''}
                            onChange={(e) => onUpdateRow(idx, 'postDate', e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          />
                          <div className="bg-[#0f172a]/60 hover:bg-[#0f172a]/90 border border-white/[0.08] group-hover/date:border-white/[0.16] rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 flex items-center justify-between gap-1.5 transition-all duration-150 select-none">
                            <span className="truncate">{video.postDate ? video.postDate.split('-').reverse().join('/') : 'Chọn ngày'}</span>
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </td>
                    <td
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateRow(idx, 'content', e.currentTarget.textContent || '')}
                      className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed outline-none focus:bg-white/[0.04] cursor-text break-words whitespace-normal"
                    >
                      {video.content}
                    </td>
                    <td
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateRow(idx, 'failReason', e.currentTarget.textContent || '')}
                      className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed outline-none focus:bg-white/[0.04] cursor-text break-words whitespace-normal"
                    >
                      {video.failReason}
                    </td>
                    <td
                      contentEditable
                      suppressContentEditableWarning
                      onKeyDown={handleViewsKeyDown}
                      onInput={handleViewsInput}
                      onBlur={(e) => {
                        const formatted = formatDotViews(e.currentTarget.textContent || '');
                        onUpdateRow(idx, 'views', formatted);
                        e.currentTarget.textContent = formatted;
                      }}
                      className="py-3.5 px-4 text-right font-bold text-xs text-red-400 outline-none focus:bg-white/[0.04] cursor-text"
                    >
                      {isMock ? '-' : formatDotViews(video.views)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {!isMock && (
                        <button
                          onClick={() => onDeleteRow(idx)}
                          className="text-red-500/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-start">
            <button
              onClick={onAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white rounded-lg text-xs font-bold transition shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm dòng mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
