import React, { useState, useRef } from 'react';
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

  // State quản lý giá trị controlled của các ô nhập
  const [inputs, setInputs] = useState(() =>
    editorPerformance.map(perf => {
      const win = Math.round(perf.winVideos * ratio * winFilterRatio * multiplier);
      const total = Math.max(win, Math.round(perf.totalVideos * ratio * totalFilterRatio * multiplier));
      return { total, win };
    })
  );

  // Đồng bộ state cục bộ khi props thay đổi (do blur hoặc do các tác vụ khác ngoài mount)
  React.useEffect(() => {
    setInputs(editorPerformance.map(perf => {
      const win = Math.round(perf.winVideos * ratio * winFilterRatio * multiplier);
      const total = Math.max(win, Math.round(perf.totalVideos * ratio * totalFilterRatio * multiplier));
      return { total, win };
    }));
  }, [editorPerformance, ratio, winFilterRatio, totalFilterRatio, multiplier]);

  // Tính toán trực tiếp giá trị Fail và Tỷ lệ Win khi render
  const computed = inputs.map(item => {
    const fail = Math.max(0, item.total - item.win);
    const winRate = formatWinRate(item.win, item.total);
    return { fail, winRate };
  });

  // Tính toán tổng số liệu cá nhân trong team
  const totalSum = inputs.reduce((sum, item) => sum + item.total, 0);
  const winSum = inputs.reduce((sum, item) => sum + item.win, 0);
  const failSum = Math.max(0, totalSum - winSum);
  const percentSum = totalSum > 0 ? (winSum / totalSum) * 100 : 0;
  const percentFormatted = `${percentSum.toFixed(1).replace('.', ',')}%`;

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
                  <span className="text-2xl font-black text-white mt-1">{totalSum}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Video className="w-5 h-5 text-[#10b981]" />
                </div>
              </div>
              <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-emerald-500/20 shadow-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Video Win</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1">{winSum}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Award className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-red-500/20 shadow-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Video Fail</span>
                  <span className="text-2xl font-black text-red-400 mt-1">{failSum}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
              </div>
              <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-emerald-500/20 shadow-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tỷ Lệ Win</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1">{percentFormatted}</span>
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
                    <th className="pb-3 text-center">
                      TỔNG VIDEO
                      <span className="ml-1 text-blue-400/50 normal-case font-normal text-[9px]">(nhập)</span>
                    </th>
                    <th className="pb-3 text-center">
                      WIN
                      <span className="ml-1 text-blue-400/50 normal-case font-normal text-[9px]">(nhập)</span>
                    </th>
                    <th className="pb-3 text-center">
                      FAIL
                      <span className="ml-1 text-slate-600 normal-case font-normal text-[9px]">(tự tính)</span>
                    </th>
                    <th className="pb-3 text-right pr-2">
                      % WIN
                      <span className="ml-1 text-slate-600 normal-case font-normal text-[9px]">(tự tính)</span>
                    </th>
                    <th className="pb-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {editorPerformance.map((perf, index) => {
                    const item = inputs[index] ?? { total: 0, win: 0 };
                    const cv = computed[index] ?? { fail: 0, winRate: '0,0%' };
                    return (
                      <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pl-2 text-slate-400 font-medium">{index + 1}</td>

                        {/* TÊN */}
                        <td
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => onUpdateRow(index, 'editor', e.currentTarget.textContent || '')}
                          className="py-3 font-bold text-slate-200 outline-none focus:bg-white/[0.04] cursor-text"
                        >
                          {perf.editor}
                        </td>

                        {/* TỔNG VIDEO — controlled */}
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.total || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setInputs(prev => prev.map((inp, i) => i === index ? { ...inp, total: val } : inp));
                            }}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const factor = ratio * totalFilterRatio * multiplier;
                              const rawVal = factor > 0 ? Math.round(val / factor) : val;
                              onUpdateRow(index, 'totalVideos', rawVal.toString());
                            }}
                            className="w-20 text-center bg-transparent text-slate-300 font-semibold outline-none focus:bg-white/[0.04] rounded px-2 py-1 border border-transparent focus:border-blue-500/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>

                        {/* WIN — controlled */}
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.win || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setInputs(prev => prev.map((inp, i) => i === index ? { ...inp, win: val } : inp));
                            }}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const factor = ratio * winFilterRatio * multiplier;
                              const rawVal = factor > 0 ? Math.round(val / factor) : val;
                              onUpdateRow(index, 'winVideos', rawVal.toString());
                            }}
                            className="w-20 text-center bg-transparent text-emerald-400 font-semibold outline-none focus:bg-white/[0.04] rounded px-2 py-1 border border-transparent focus:border-emerald-500/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>

                        {/* FAIL — tự tính */}
                        <td className="py-3 text-center text-red-400 font-semibold select-none">{cv.fail}</td>

                        {/* % WIN — tự tính */}
                        <td className="py-3 text-right pr-2 text-[#10b981] font-extrabold select-none">{cv.winRate}</td>

                        <td className="py-3 text-center pr-2">
                          <button
                            onClick={() => onDeleteRow(index)}
                            className="text-red-500/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
                            title="Xóa dòng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
