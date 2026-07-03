import React from 'react';
import { Lightbulb, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { CaseStudyItem } from '../types';
import { formatDotViews } from '../utils';
import { CustomSelect, CustomDatePicker } from './CustomControls';
import EditableCell from './EditableCell';
import LinkInput from './LinkInput';

interface CaseStudyTableProps {
  caseStudies: CaseStudyItem[];
  isCollapsed: boolean;
  onToggle: () => void;
  onUpdateRow: (index: number, field: string, value: string) => void;
  onDeleteRow: (index: number) => void;
  onAddRow: () => void;
}

export default function CaseStudyTable({
  caseStudies, isCollapsed, onToggle, onUpdateRow, onDeleteRow, onAddRow
}: CaseStudyTableProps) {
  const rows = [...caseStudies];
  const [activeOpenType, setActiveOpenType] = React.useState<'date' | 'select' | null>(null);
  const [activeOpenRowIndex, setActiveOpenRowIndex] = React.useState<number | null>(null);

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
    <div className="flex flex-col rounded-xl overflow-hidden border border-purple-500/20 shadow-lg shadow-purple-950/10">
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
        className="bg-[#1e1b4b] px-4 py-3 flex items-center justify-between border-b border-purple-500/20 cursor-pointer select-none hover:bg-[#2e2a72] transition-colors"
      >
        <span className="text-purple-300 font-black tracking-wider text-sm uppercase flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-purple-400" /> Case Study hay bên ngoài
        </span>
        <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
      </div>

      {!isCollapsed && (
        <div className={`bg-[#0c1322] p-6 overflow-x-auto overflow-y-hidden transition-all duration-200 ${getBottomPaddingClass()}`}>
          <table className="w-full table-fixed text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 text-[10px] uppercase tracking-wider font-bold bg-white/[0.02]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-16">TEAM</th>
                <th className="py-3 px-4 w-28">EDITOR</th>
                <th className="py-3 px-4 w-32">LINK</th>
                <th className="py-3 px-4 w-36">NỀN TẢNG</th>
                <th className="py-3 px-4 w-36">NGÀY ĐĂNG</th>
                <th className="py-3 px-4 w-[24%]">NỘI DUNG CONTENT</th>
                <th className="py-3 px-4 w-[24%]">SẼ ÁP DỤNG NHƯ THẾ NÀO, HỌC ĐƯỢC CÁI GÌ?</th>
                <th className="py-3 px-4 w-28 text-right">SỐ VIEWS</th>
                <th className="py-3 px-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((video, idx) => {
                const isMock = video.title === 'Data point';
                const isSaving = typeof video.dbId === 'string' && video.dbId.startsWith('temp-');
                return (
                  <tr key={idx} className={`hover:bg-white/[0.02] transition-colors ${isSaving ? 'opacity-70' : ''}`}>
                    <td className="py-3.5 px-4 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-semibold text-xs">
                      {isMock ? 'Data point' : 'Bên ngoài'}
                    </td>
                    <td
                      contentEditable={!isMock}
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateRow(idx, 'channel', e.currentTarget.textContent || '')}
                      className="py-3.5 px-4 text-slate-300 font-medium text-xs outline-none focus:bg-white/[0.04] cursor-text break-words whitespace-normal"
                    >
                      {video.channel}
                    </td>
                     <td className="py-2 px-3 max-w-[120px] focus-within:bg-white/[0.04] truncate">
                       {isMock ? (
                         <span className="text-slate-500 text-xs">-</span>
                       ) : (
                         <LinkInput
                           value={video.videoUrl || ''}
                           onChange={(val) => onUpdateRow(idx, 'videoUrl', val)}
                         />
                       )}
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
                        themeColor="purple"
                        onToggleOpen={(isOpen) => {
                          setActiveOpenType(isOpen ? 'date' : null);
                          setActiveOpenRowIndex(isOpen ? idx : null);
                        }}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <EditableCell
                        value={video.title || ''}
                        placeholder="Case Study mới"
                        dataPlaceholder="Case Study mới"
                        onSave={(val) => onUpdateRow(idx, 'title', val)}
                        disabled={isMock}
                        className="text-slate-300 text-xs leading-relaxed"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <EditableCell
                        value={video.takeaway || ''}
                        placeholder="Nhấp đúp để nhập bài học..."
                        dataPlaceholder="Nhấp đúp để nhập bài học..."
                        onSave={(val) => onUpdateRow(idx, 'takeaway', val)}
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
                      className="py-3.5 px-4 text-right font-bold text-xs text-purple-400 outline-none focus:bg-white/[0.04] cursor-text"
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
