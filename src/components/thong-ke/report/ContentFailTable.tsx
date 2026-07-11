import React from 'react';
import { XCircle, ChevronDown, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { FailVideoItem } from '../types';
import { formatDotViews } from '../utils';
import { CustomSelect, CustomDatePicker } from './CustomControls';
import { apiClient } from '../../../lib/api-client';
import EditableCell from './EditableCell';
import LinkInput from './LinkInput';

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
  const [activeOpenType, setActiveOpenType] = React.useState<'date' | 'select' | null>(null);
  const [activeOpenRowIndex, setActiveOpenRowIndex] = React.useState<number | null>(null);

  const rows = [...failVideos];

  const getBottomPaddingClass = () => {
    if (!activeOpenType || activeOpenRowIndex === null) return '';
    const rowsBelow = rows.length - 1 - activeOpenRowIndex;
    
    if (activeOpenType === 'date') {
      if (rowsBelow === 0) return '!pb-[240px]';
      if (rowsBelow === 1) return '!pb-[180px]';
      if (rowsBelow === 2) return '!pb-[120px]';
      if (rowsBelow === 3) return '!pb-[60px]';
      return '';
    }
    
    if (activeOpenType === 'select') {
      if (rowsBelow === 0) return '!pb-[120px]';
      if (rowsBelow === 1) return '!pb-[60px]';
      return '';
    }
    
    return '';
  };
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
    <div className="flex flex-col rounded-xl overflow-hidden border border-rose-200 dark:border-rose-500/20 shadow-lg shadow-red-950/10">
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
        className="bg-rose-50 dark:bg-rose-500/10 px-4 py-3 flex items-center justify-between border-b border-rose-200 dark:border-rose-500/20 cursor-pointer select-none hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
      >
        <span className="text-rose-700 dark:text-rose-400 font-black tracking-wider text-sm uppercase flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-700 dark:text-rose-400" /> Content fail của team
        </span>
        <ChevronDown className={`w-4 h-4 text-rose-700 dark:text-rose-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
      </div>

      {!isCollapsed && (
        <div className={`bg-card p-6 overflow-x-auto overflow-y-hidden transition-all duration-200 ${getBottomPaddingClass()}`}>
          <table className="w-full table-fixed text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-[12px] uppercase tracking-wider font-bold bg-muted/40">
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
                  <tr key={idx} className={`hover:bg-accent transition-colors ${isSaving ? 'opacity-70' : ''}`}>
                    <td className="py-3.5 px-4 text-center text-muted-foreground font-bold text-xs">{idx + 1}</td>
                    <td className="py-3.5 px-4 text-muted-foreground font-semibold text-xs">
                      {isMock ? 'Data point' : activeTab}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-muted-foreground">
                      {isMock ? (
                        '-'
                      ) : (
                        <CustomSelect
                          value={video.editor || ''}
                          onChange={(val) => onUpdateRow(idx, 'editor', val)}
                          options={Array.from(new Set([...editors, video.editor].filter(Boolean)))
                            .filter((name) => name !== 'Test User' && name !== 'Unknown')}
                          alignUp={false}
                          onToggleOpen={(isOpen) => {
                            setActiveOpenType(isOpen ? 'select' : null);
                            setActiveOpenRowIndex(isOpen ? idx : null);
                          }}
                        />
                      )}
                    </td>
                     <td className="py-2 px-3 max-w-[120px] focus-within:bg-accent truncate">
                       {isMock ? (
                         <span className="text-muted-foreground text-xs">-</span>
                       ) : (
                         <LinkInput
                           value={video.videoUrl || ''}
                           onChange={(val) => onUpdateRow(idx, 'videoUrl', val)}
                         />
                       )}
                     </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="flex items-start shrink-0">
                        <label className="cursor-pointer group relative block">
                          {uploadingIndex === idx ? (
                            <div className="w-10 h-10 rounded bg-muted border border-dashed border-blue-500/50 flex items-center justify-center animate-pulse shrink-0">
                              <span className="text-[12px] text-blue-600 dark:text-blue-400 font-medium">Up...</span>
                            </div>
                          ) : video.thumbnail && video.thumbnail !== 'Data point' ? (
                            <div className="w-10 h-10 rounded bg-muted border border-border overflow-hidden transition-all duration-200 hover:border-blue-500 hover:scale-105 shrink-0">
                              <img src={video.thumbnail} className="w-full h-full object-cover" alt="Thumb" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ImageIcon className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted border border-dashed border-border hover:border-blue-500 hover:bg-accent flex items-center justify-center transition-all duration-200 shrink-0" title="Click để tải ảnh lên">
                              <ImageIcon className="w-4 h-4 text-muted-foreground group-hover:text-blue-400" />
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
                        alignUp={false}
                        onToggleOpen={(isOpen) => {
                          setActiveOpenType(isOpen ? 'select' : null);
                          setActiveOpenRowIndex(isOpen ? idx : null);
                        }}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-center">
                      <CustomDatePicker
                        value={isMock ? '' : (video.postDate || '')}
                        onChange={(val) => onUpdateRow(idx, 'postDate', val)}
                        alignUp={false}
                        themeColor="red"
                        onToggleOpen={(isOpen) => {
                          setActiveOpenType(isOpen ? 'date' : null);
                          setActiveOpenRowIndex(isOpen ? idx : null);
                        }}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <EditableCell
                        value={video.content || ''}
                        placeholder="Nhấp đúp để nhập nội dung..."
                        dataPlaceholder="Nhấp đúp để nhập nội dung..."
                        onSave={(val) => onUpdateRow(idx, 'content', val)}
                        disabled={isMock}
                        className="text-muted-foreground text-xs leading-relaxed"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <EditableCell
                        value={video.failReason || ''}
                        placeholder="Nhấp đúp để nhập lý do..."
                        dataPlaceholder="Nhấp đúp để nhập lý do..."
                        onSave={(val) => onUpdateRow(idx, 'failReason', val)}
                        disabled={isMock}
                        className="text-muted-foreground text-xs leading-relaxed"
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
                      className="py-3.5 px-4 text-right font-bold text-xs text-rose-700 dark:text-rose-400 outline-none focus:bg-accent cursor-text"
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

          <div className="mt-4 pt-3 border-t border-border flex justify-start">
            <button
              onClick={onAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg text-xs font-bold transition shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm dòng mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
