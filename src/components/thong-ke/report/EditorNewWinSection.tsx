import React from 'react';
import { TrendingUp, Video, Award, XCircle, CheckCircle, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { EditorPerfItem } from '../types';
import { formatWinRate } from '../utils';

interface EditorNewWinSectionProps {
  editorPerformance: EditorPerfItem[];
  newVideoStats: { total: number; win: number; fail: number; percent: string };
  ratio: number;
  multiplier: number;
  winFilterRatio: number;
  totalFilterRatio: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onUpdateRow: (index: number, field: string, value: string) => void;
  onDeleteRow: (index: number) => void;
  onAddRow: () => void;
}

export default function EditorNewWinSection({
  editorPerformance, newVideoStats, ratio, multiplier, winFilterRatio, totalFilterRatio,
  isCollapsed, onToggle, onUpdateRow, onDeleteRow, onAddRow
}: EditorNewWinSectionProps) {
  const scaledPerformance = editorPerformance.map(perf => {
    const win = Math.round(perf.winVideos * ratio * winFilterRatio * multiplier);
    const total = Math.max(win, Math.round(perf.totalVideos * ratio * totalFilterRatio * multiplier));
    const fail = total - win;
    const winRate = formatWinRate(win, total);
    return { editor: perf.editor, total, win, fail, winRate };
  });

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-[#10b981]/20 shadow-lg shadow-emerald-950/10">
      <div
        onClick={onToggle}
        className="bg-[#063529] px-4 py-3 flex items-center justify-between border-b border-[#10b981]/20 cursor-pointer select-none hover:bg-[#0a4d3b] transition-colors"
      >
        <span className="text-[#10b981] font-black tracking-wider text-sm uppercase flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#10b981]" /> Content mới win của cá nhân trong team/trên số video đã làm
        </span>
        <ChevronDown className={`w-4 h-4 text-[#10b981] transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
      </div>

      {!isCollapsed && (
        <div className="bg-[#0c1322] p-6 flex flex-col gap-6">
          {/* TỔNG VIDEO TEAM */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">TỔNG VIDEO TEAM</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-emerald-500/20 shadow-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tổng Video Team</span>
                  <span className="text-2xl font-black text-white mt-1">{newVideoStats.total}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Video className="w-5 h-5 text-[#10b981]" />
                </div>
              </div>
              <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-emerald-500/20 shadow-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Video Win</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1">{newVideoStats.win}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Award className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-red-500/20 shadow-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Video Fail</span>
                  <span className="text-2xl font-black text-red-400 mt-1">{newVideoStats.fail}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
              </div>
              <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-emerald-500/20 shadow-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tỷ Lệ Win</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1">{newVideoStats.percent}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* CỦA CÁ NHÂN (10K VIEW) */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">CỦA CÁ NHÂN (10K VIEW)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                    <th className="pb-3 pl-2 w-12">#</th>
                    <th className="pb-3">TÊN</th>
                    <th className="pb-3 text-center">TỔNG VIDEO</th>
                    <th className="pb-3 text-center">WIN</th>
                    <th className="pb-3 text-center">FAIL</th>
                    <th className="pb-3 text-right pr-2">% WIN</th>
                    <th className="pb-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {scaledPerformance.map((perf, index) => (
                    <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pl-2 text-slate-400 font-medium">{index + 1}</td>
                      <td
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdateRow(index, 'editor', e.currentTarget.textContent || '')}
                        className="py-4 font-bold text-slate-200 outline-none focus:bg-white/[0.04] cursor-text"
                      >
                        {perf.editor}
                      </td>
                      <td
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const val = parseInt(e.currentTarget.textContent || '0') || 0;
                          const factor = ratio * multiplier;
                          const rawVal = factor > 0 ? Math.round(val / factor) : 0;
                          onUpdateRow(index, 'totalVideos', rawVal.toString());
                        }}
                        className="py-4 text-center text-slate-300 outline-none focus:bg-white/[0.04] cursor-text"
                      >
                        {perf.total}
                      </td>
                      <td
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const val = parseInt(e.currentTarget.textContent || '0') || 0;
                          const factor = ratio * multiplier;
                          const rawVal = factor > 0 ? Math.round(val / factor) : 0;
                          onUpdateRow(index, 'winVideos', rawVal.toString());
                        }}
                        className="py-4 text-center text-emerald-400 font-semibold outline-none focus:bg-white/[0.04] cursor-text"
                      >
                        {perf.win}
                      </td>
                      <td className="py-4 text-center text-red-400">{perf.fail}</td>
                      <td className="py-4 text-right pr-2 text-[#10b981] font-extrabold">{perf.winRate}</td>
                      <td className="py-4 text-center pr-2">
                        <button
                          onClick={() => onDeleteRow(index)}
                          className="text-red-500/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-start">
              <button
                onClick={onAddRow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white rounded-lg text-xs font-bold transition shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm dòng mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
