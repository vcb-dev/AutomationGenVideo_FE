import React from 'react';
import { XCircle, ChevronDown, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { FailVideoItem } from '../types';
import { formatDotViews } from '../utils';
import { CustomSelect, CustomDatePicker } from './CustomControls';
import { apiClient } from '../../../lib/api-client';
import EditableCell from './EditableCell';

interface ContentFailTableProps {
  failVideos: FailVideoItem[];
  activeTab: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onUpdateRow: (index: number, field: string, value: string) => void;
  onDeleteRow: (index: number) => void;
  onAddRow: () => void;
  editors?: string[];
}

export default function ContentFailTable({
  failVideos, activeTab, isCollapsed, onToggle, onUpdateRow, onDeleteRow, onAddRow, editors = []
}: ContentFailTableProps) {
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null);

  const rows = [...failVideos];
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
    if (!/^[0-9.kKmM]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleViewsInput = (e: React.FormEvent<HTMLTableCellElement>) => {
    const target = e.currentTarget;
    const originalText = target.textContent || '';
    const sanitized = originalText.replace(/[^0-9.kKmM]/gi, '');
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
      <style dangerouslySetInnerHTML={{
        __html: `
        .editable-placeholder:empty::before {
          content: attr(data-placeholder);
          color: #64748b !important;
          font-style: italic;
          pointer-events: none;
          display: inline;
        }
      `}} />
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
                <th className="py-3 px-4 w-44">EDITOR</th>
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
                const isSaving = typeof video.dbId === 'string' && video.dbId.startsWith('temp-');
                return (
                  <tr key={idx} className={`hover:bg-white/[0.02] transition-colors ${isSaving ? 'opacity-70' : ''}`}>
                    <td className="py-3.5 px-4 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-semibold text-xs">
                      {isMock ? 'Data point' : activeTab}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-300">
                      {isMock ? (
                        '-'
                      ) : (
                        <CustomSelect
                          value={video.editor || ''}
                          onChange={(val) => onUpdateRow(idx, 'editor', val)}
                          options={Array.from(new Set([...editors, video.editor].filter(Boolean)))
                            .filter((name) => name !== 'Test User' && name !== 'Unknown')}
                        />
                      )}
                    </td>
                    <td
                      contentEditable={!isMock}
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
                          {uploadingIndex === idx ? (
                            <div className="w-10 h-10 rounded bg-slate-900 border border-dashed border-blue-500/50 flex items-center justify-center animate-pulse shrink-0">
                              <span className="text-[10px] text-blue-400 font-medium">Up...</span>
                            </div>
                          ) : video.thumbnail && video.thumbnail !== 'Data point' ? (
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
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadingIndex(idx);
                                try {
                                  const formData = new FormData();
                                  formData.append('files', file);
                                  const res = await apiClient.post<{ success: boolean; urls: { url: string }[] }>(
                                    '/social/upload/media',
                                    formData,
                                    { headers: { 'Content-Type': 'multipart/form-data' } }
                                  );
                                  const uploadedUrl = res.data?.urls?.[0]?.url;
                                  if (uploadedUrl) {
                                    onUpdateRow(idx, 'thumbnail', uploadedUrl);
                                  }
                                } catch (err) {
                                  console.error('Error uploading thumbnail:', err);
                                } finally {
                                  setUploadingIndex(null);
                                }
                              }
                            }}
                            className="hidden"
                            disabled={uploadingIndex !== null}
                          />
                        </label>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-center">
                      <CustomSelect
                        value={isMock ? 'TikTok' : (video.platform || 'TikTok')}
                        onChange={(val) => onUpdateRow(idx, 'platform', val)}
                        options={['TikTok', 'Instagram Reels', 'YouTube Shorts']}
                        alignUp={idx >= 3}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-center">
                      <CustomDatePicker
                        value={isMock ? '' : (video.postDate || '')}
                        onChange={(val) => onUpdateRow(idx, 'postDate', val)}
                        alignUp={idx >= 3}
                        themeColor="red"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <EditableCell
                        value={video.content || ''}
                        placeholder="Nhấp đúp để nhập nội dung..."
                        dataPlaceholder="Nhấp đúp để nhập nội dung..."
                        onSave={(val) => onUpdateRow(idx, 'content', val)}
                        disabled={isMock}
                        className="text-slate-300 text-xs leading-relaxed"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <EditableCell
                        value={video.failReason || ''}
                        placeholder="Nhấp đúp để nhập lý do..."
                        dataPlaceholder="Nhấp đúp để nhập lý do..."
                        onSave={(val) => onUpdateRow(idx, 'failReason', val)}
                        disabled={isMock}
                        className="text-slate-300 text-xs leading-relaxed"
                      />
                    </td>
                    <td
                      contentEditable={!isMock}
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
