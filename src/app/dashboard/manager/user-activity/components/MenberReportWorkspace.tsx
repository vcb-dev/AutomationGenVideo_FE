'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Check, CheckCircle2, Upload, PenLine, AlertCircle, Lock } from 'lucide-react';

/** Deadline báo cáo: 10:00 sáng. Đã bỏ logic khoá. */
function isPastDailyDeadline(): boolean {
    return false;
}

type TabMode = 'daily' | 'monthly';

const PLATFORMS = [
  { id: 'fb', label: 'Facebook', symbol: 'f', color: '#1877F2' },
  { id: 'tt', label: 'TikTok', symbol: 'T', color: '#000000' },
  { id: 'ig', label: 'Instagram', symbol: 'I', color: '#E1306C' },
  { id: 'yt', label: 'YouTube', symbol: '▶', color: '#FF0000' },
  { id: 'zl', label: 'Zalo', symbol: 'Z', color: '#0068FF' },
  { id: 'tw', label: 'Twitter', symbol: 't', color: '#1DA1F2' },
  { id: 'th', label: 'Threads', symbol: 'Th', color: '#000000' },
  { id: 'l8', label: 'Lemon8', symbol: 'L', color: '#FFE100' },
];

export default function DailyReportWorkspace() {
  const [mode, setMode] = useState<TabMode>('daily');
  const [step, setStep] = useState<1 | 2>(1);
  const [activePlatforms, setActivePlatforms] = useState<string[]>([]);
  const [traffic, setTraffic] = useState<Record<string, string>>({});
  const [videoLinks, setVideoLinks] = useState<Record<string, string>>({});
  const [videoCount, setVideoCount] = useState('8');
  const [a1, setA1] = useState('3');
  const [a2, setA2] = useState('2');
  const [a3, setA3] = useState('1');
  const [a4, setA4] = useState('1');
  const [a5, setA5] = useState('1');

  const [didToday, setDidToday] = useState('');
  const [issues, setIssues] = useState('');
  const [hasIssues, setHasIssues] = useState(false);
  const [nextPlan, setNextPlan] = useState(false);
  const [nextPlanText, setNextPlanText] = useState('');
  const [hasOwnSource, setHasOwnSource] = useState(false);
  const [ownSourceText, setOwnSourceText] = useState('');
  const [hasNewIdea, setHasNewIdea] = useState(false);
  const [newIdeaText, setNewIdeaText] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [timeLeftStr, setTimeLeftStr] = useState('00:00:00');

  // Deadline 10h: Đã bỏ logic khoá.
  const isDeadlineLockedToday = false;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(10, 0, 0, 0); // Deadline 10h sáng

      // Nếu hiện tại đã quá 10h sáng, đếm ngược tới 10h sáng hôm sau
      if (now.getTime() > target.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diff = Math.max(0, target.getTime() - now.getTime());
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeftStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    setConfirmOpen(false);
    setConfirmed(false);
    setToastMessage({ type: 'success', text: 'Gửi báo cáo thành công!' });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const dailyTotal = useMemo(() => {
    return (Number(a1) || 0) + (Number(a2) || 0) + (Number(a3) || 0) + (Number(a4) || 0) + (Number(a5) || 0);
  }, [a1, a2, a3, a4, a5]);

  const categories = [
    { id: 'a1', label: 'A1', sub: 'Trend/Viral', val: a1, set: setA1, kpi: 3, colors: { border: 'border-red-400', textMain: 'text-red-500', textInput: 'text-red-600' } },
    { id: 'a2', label: 'A2', sub: 'Kiến thức', val: a2, set: setA2, kpi: 2, colors: { border: 'border-orange-400', textMain: 'text-orange-500', textInput: 'text-orange-600' } },
    { id: 'a3', label: 'A3', sub: 'Review', val: a3, set: setA3, kpi: 1, colors: { border: 'border-amber-400', textMain: 'text-amber-500', textInput: 'text-amber-600' } },
    { id: 'a4', label: 'A4', sub: 'Behind the scene', val: a4, set: setA4, kpi: 1, colors: { border: 'border-emerald-400', textMain: 'text-emerald-500', textInput: 'text-emerald-600' } },
    { id: 'a5', label: 'A5', sub: 'Hero content', val: a5, set: setA5, kpi: 1, colors: { border: 'border-purple-400', textMain: 'text-purple-500', textInput: 'text-purple-600' } },
  ];

  return (
    <div className="max-w-[1300px] mx-auto space-y-6 font-sans pb-10">
      {toastMessage && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`flex flex-col items-center justify-center gap-6 px-12 py-10 rounded-[2.5rem] shadow-2xl font-black text-white text-[20px] ${toastMessage.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'
            } animate-in zoom-in-90 duration-300`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-20 h-20" /> : <AlertCircle className="w-20 h-20" />}
            {toastMessage.text}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-2 text-base font-bold">
          <button
            onClick={() => setMode('daily')}
            className={`py-4 flex items-center justify-center gap-2 transition-colors ${mode === 'daily' ? 'bg-[#1D4ED8] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Báo cáo ngày <span className={`text-[12px] px-2.5 py-1 rounded-lg ${mode === 'daily' ? 'bg-[#FACC15] text-black' : 'bg-slate-100 text-slate-500 border border-slate-200'} font-black tracking-wide`}>HÀNG NGÀY</span>
          </button>
          <button
            onClick={() => setMode('monthly')}
            className={`py-4 flex items-center justify-center gap-2 transition-colors ${mode === 'monthly' ? 'bg-[#1D4ED8] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Báo cáo tháng <span className={`text-[12px] px-2.5 py-1 rounded-lg ${mode === 'monthly' ? 'bg-[#FACC15] text-black' : 'bg-slate-100 text-slate-500 border border-slate-200'} tracking-wide font-black`}>MÙNG 5</span>
          </button>
        </div>
      </div>

      {mode === 'daily' ? (
        <>
          <div className="rounded-2xl border border-[#FDE047] bg-[#FFFdf0] p-6 flex items-center justify-between shadow-md">
            <div>
              <p className="font-black text-amber-900 text-[18px]">Gửi báo cáo hằng ngày</p>
              <p className="text-[15px] font-bold text-slate-500 mt-1">Vui lòng báo cáo đầy đủ các chỉ số trước khi kết thúc ngày.</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-red-600 tracking-tighter leading-none">{timeLeftStr}</p>
              <p className="text-[13px] font-black text-amber-600 mt-1.5 uppercase tracking-wider">Thời gian còn lại trong ngày</p>
            </div>
          </div>


          <div className="flex items-center justify-center py-2">
            <button onClick={() => setStep(1)} className={`flex items-center gap-2 text-sm font-bold transition-colors ${step === 1 ? 'text-[#10B981]' : 'text-slate-600'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${step === 1 || step === 2 ? 'bg-[#10B981]' : 'bg-slate-300'}`}>1</span>
              Tiến độ
            </button>
            <div className={`w-24 h-[1px] mx-3 transition-colors ${step === 2 ? 'bg-[#10B981]' : 'bg-slate-300'}`} />
            <button onClick={() => setStep(2)} className={`flex items-center gap-2 text-sm font-bold transition-colors ${step === 2 ? 'text-[#10B981]' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${step === 2 ? 'bg-[#10B981]' : 'bg-slate-300'}`}>2</span>
              Chi tiết
            </button>
          </div>

          {step === 1 ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold mb-4 text-[17px] text-slate-800">Nền tảng đã đăng hôm nay</h3>
                <div className="grid grid-cols-4 gap-3 items-start">
                  {PLATFORMS.map((p) => {
                    const isActive = activePlatforms.includes(p.id);
                    return (
                      <div key={p.id} className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setActivePlatforms(prev => prev.filter(id => id !== p.id));
                              setTraffic(prev => { const n = { ...prev }; delete n[p.id]; return n; });
                              setVideoLinks(prev => { const n = { ...prev }; delete n[p.id]; return n; });
                            } else {
                              setActivePlatforms(prev => [...prev, p.id]);
                            }
                          }}
                          className={`relative rounded-xl border p-4 text-center transition-all flex flex-col items-center justify-center ${isActive ? 'border-[#10B981] bg-[#F0FDF4] shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          {isActive && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-[#10B981]" />}
                          <p className={`font-black text-[28px] mb-1 ${!isActive && p.id === 'tt' ? 'text-slate-800' : ''}`} style={isActive || p.id !== 'tt' ? { color: p.color } : {}}>{p.symbol}</p>
                          <p className="text-[11px] text-slate-600 font-medium">{p.label}</p>
                        </button>

                        {isActive && (
                          <div className="mt-1 border border-[#6EE7B7] rounded-xl p-3 bg-white shadow-sm relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <label className="text-[11px] text-[#047857] font-bold mb-1.5 block">Traffic (lượt xem)</label>
                            <input
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black font-bold bg-white focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none"
                              placeholder="Nhập số liệu traffic"
                              value={traffic[p.id] || ''}
                              onChange={(e) => setTraffic((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            />

                            <label className="text-[11px] text-[#047857] font-bold mt-4 mb-1.5 block">Link video báo cáo</label>
                            <input
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black font-bold bg-white focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none"
                              placeholder="Link Google Sheets, Docs..."
                              value={videoLinks[p.id] || ''}
                              onChange={(e) => setVideoLinks((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-8 text-center text-sm font-medium text-slate-500">
                  Tổng traffic hôm nay: <span className="text-[#1D4ED8] font-bold text-lg ml-1">{Object.values(traffic).reduce((a, b) => a + (Number(b) || 0), 0)}</span>
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold mb-5 text-[17px] text-slate-800">Số video & Phân loại 5A</h3>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-[72px] h-[72px] rounded-2xl border-[2.5px] border-[#3B82F6] flex items-center justify-center">
                    <input
                      className="w-full text-center text-[#2563EB] font-black text-3xl bg-transparent outline-none p-1"
                      value={videoCount}
                      onChange={(e) => setVideoCount(e.target.value)}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] text-slate-800">video đã hoàn thành</h4>
                    <p className="text-xs text-slate-500 mt-1">KPI chính: video là chỉ số kiểm soát 100%</p>
                  </div>
                </div>

                <p className="text-[13px] text-slate-600 mb-3 font-medium">Phân loại theo content type:</p>
                <div className="grid grid-cols-5 gap-3">
                  {categories.map((c) => (
                    <div key={c.id} className={`rounded-xl border-2 ${c.colors.border} p-3 text-center bg-white flex flex-col items-center justify-between min-h-[140px] shadow-sm`}>
                      <div>
                        <p className={`text-[13px] font-bold ${c.colors.textMain} mb-1`}>{c.label}</p>
                        <p className="text-[10px] text-slate-400 leading-tight min-h-[24px] flex items-center justify-center">{c.sub}</p>
                      </div>
                      <input
                        className={`w-full text-center font-black text-[30px] my-2 ${c.colors.textInput} bg-transparent outline-none`}
                        value={c.val}
                        onChange={(e) => c.set(e.target.value)}
                      />
                      <p className="text-[10px] text-slate-400 font-medium">KPI: {c.kpi}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 bg-[#ECFDF5] text-[#047857] py-3 rounded-xl text-center text-[13px] font-bold">
                  ✓ Tổng {a1}+{a2}+{a3}+{a4}+{a5} = {dailyTotal} video — {dailyTotal.toString() === videoCount ? 'Khớp' : 'Chưa khớp'}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button className="bg-[#1D4ED8] text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-sm" onClick={() => setStep(2)}>
                  Tiếp → Chi tiết
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
                <div>
                  <h3 className="font-bold text-[17px] text-slate-800">Chi tiết công việc</h3>
                  <p className="text-xs text-slate-500 mt-1">Câu hỏi tùy chỉnh theo team Content. Admin có thể điều chỉnh.</p>
                </div>

                <div className="space-y-7 border-t border-slate-100 pt-5">
                  <div className="pl-4 border-l-2 border-[#3B82F6] relative">
                    <h4 className="font-bold text-[13px] mb-3 text-slate-800 flex items-baseline gap-1.5">
                      Hôm nay bạn đã làm gì? <span className="text-[#EF4444] text-[10px] font-medium">* bắt buộc</span>
                    </h4>
                    <div className="relative">
                      <textarea
                        value={didToday}
                        onChange={(e) => setDidToday(e.target.value)}
                        className="w-full min-h-[110px] rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 text-[13px] text-black font-bold focus:border-[#3B82F6] focus:bg-white focus:ring-1 focus:ring-[#3B82F6] outline-none resize-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                        placeholder="Sản xuất 3 video TikTok..."
                      />
                      <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        {didToday.length}/500
                        <PenLine className="w-3 h-3 ml-0.5 opacity-60" />
                      </div>
                    </div>
                  </div>

                  <div className="pl-4 border-l-2 border-[#3B82F6] relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <h4 className="font-bold text-[13px] text-slate-800">Vấn đề cần hỗ trợ?</h4>
                      <div className="flex bg-slate-100 rounded-lg p-0.5">
                        <button className={`px-4 py-1.5 text-[11px] rounded-md font-bold transition-all ${!hasIssues ? 'bg-[#10B981] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setHasIssues(false)}>Không</button>
                        <button className={`px-4 py-1.5 text-[11px] rounded-md font-bold transition-all ${hasIssues ? 'bg-[#1D4ED8] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setHasIssues(true)}>Có</button>
                      </div>
                    </div>
                    {hasIssues && (
                      <div className="relative mb-2 animate-in fade-in zoom-in-95 duration-200">
                        <textarea
                          value={issues}
                          onChange={(e) => setIssues(e.target.value)}
                          className="w-full min-h-[90px] rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 text-[13px] text-black font-bold focus:border-[#3B82F6] focus:bg-white focus:ring-1 focus:ring-[#3B82F6] outline-none resize-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                        />
                        <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          {issues.length}/500
                          <PenLine className="w-3 h-3 ml-0.5 opacity-60" />
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">— Hiển thị trong &apos;Vấn đề nổi bật&apos; trên Dashboard</p>
                  </div>

                  <div className="space-y-1 relative">
                    <ToggleRow label="Kế hoạch ngày mai?" value={nextPlan} onChange={setNextPlan}>
                      <textarea
                        value={nextPlanText}
                        onChange={(e) => setNextPlanText(e.target.value)}
                        className="w-full min-h-[70px] rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 text-[13px] text-black font-bold focus:border-[#3B82F6] focus:bg-white focus:ring-1 focus:ring-[#3B82F6] outline-none resize-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                        placeholder="Kế hoạch là gì..."
                      />
                    </ToggleRow>
                    <div className="pl-4"><div className="border-t border-dashed border-slate-200" /></div>
                    <ToggleRow label="Video nào đạt trên 50% source?" value={hasOwnSource} onChange={setHasOwnSource}>
                      <textarea
                        value={ownSourceText}
                        onChange={(e) => setOwnSourceText(e.target.value)}
                        className="w-full min-h-[70px] rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 text-[13px] text-black font-bold focus:border-[#3B82F6] focus:bg-white focus:ring-1 focus:ring-[#3B82F6] outline-none resize-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                        placeholder="Link hoặc tên video..."
                      />
                    </ToggleRow>
                    <div className="pl-4"><div className="border-t border-dashed border-slate-200" /></div>
                    <ToggleRow label="Ý tưởng content mới?" value={hasNewIdea} onChange={setHasNewIdea}>
                      <textarea
                        value={newIdeaText}
                        onChange={(e) => setNewIdeaText(e.target.value)}
                        className="w-full min-h-[70px] rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 text-[13px] text-black font-bold focus:border-[#3B82F6] focus:bg-white focus:ring-1 focus:ring-[#3B82F6] outline-none resize-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                        placeholder="Chi tiết ý tưởng..."
                      />
                    </ToggleRow>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button className="text-slate-500 font-medium text-[13px] flex items-center hover:text-slate-800 transition-colors" onClick={() => setStep(1)}>← Quay lại</button>
                <button
                  disabled={isDeadlineLockedToday}
                  className="px-8 py-3 rounded-xl font-bold text-white transition shadow-sm bg-[#10B981] hover:bg-[#059669]"
                  onClick={handleSubmit}
                >
                  Gửi báo cáo
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-xl border border-slate-200 bg-[#EFF6FF] p-5 flex justify-between items-center shadow-sm">
            <div>
              <p className="font-bold text-[#1E3A8A] text-[15px]">Báo cáo đối soát Traffic tháng 3/2026</p>
              <p className="text-[12px] text-slate-500 mt-1 font-medium">Deadline: 9:00 sáng ngày 05/04/2026 • Đối soát số liệu chính thức</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-[#2563EB] text-[15px]">Còn 13 ngày</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Mở từ 01/04</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800">Đối soát Traffic tháng 3/2026</h3>
            <p className="text-[13px] text-slate-500 mt-1.5 mb-6">Số liệu cuối tháng từ các nền tảng thường thay đổi so với báo cáo ngày. Nhập số liệu chính thức để đối soát và tính KPI chính xác.</p>

            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 mb-8">
              <p className="text-[12px] font-medium text-amber-700">
                <span className="font-bold">Lưu ý:</span> Số liệu traffic từ Facebook, TikTok, YouTube thường cập nhật chậm 2-3 ngày. Hãy lấy số chính thức từ dashboard của từng nền tảng vào ngày mùng 5.
              </p>
            </div>

            <h3 className="font-bold mb-4 text-[15px] text-slate-800">Traffic chính thức theo nền tảng</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="py-3 font-bold w-[30%]">NỀN TẢNG</th>
                    <th className="py-3 font-bold text-center">TỔNG BC NGÀY</th>
                    <th className="py-3 font-bold text-center">SỐ CHÍNH THỨC</th>
                    <th className="py-3 font-bold text-center">CHÊNH LỆCH</th>
                    <th className="py-3 font-bold text-center">MINH CHỨNG</th>
                  </tr>
                </thead>
                <tbody>
                  {['Facebook', 'TikTok', 'Instagram', 'YouTube', 'Khác'].map((name) => {
                    const isTotal = false;
                    const diffColors: any = { 'Facebook': 'text-red-500', 'TikTok': 'text-[#10B981]', 'Instagram': 'text-red-500', 'YouTube': 'text-[#10B981]', 'Khác': 'text-red-500' };
                    const diffVals: any = { 'Facebook': '-2.1%', 'TikTok': '+0.8%', 'Instagram': '-0.7%', 'YouTube': '+3.3%', 'Khác': '-3.0%' };
                    const initialVals: any = { 'Facebook': '3,180,500', 'TikTok': '8,520,300', 'Instagram': '2,085,200', 'YouTube': '1,425,800', 'Khác': '795,600' };
                    const dailyVals: any = { 'Facebook': '3,250,000', 'TikTok': '8,450,000', 'Instagram': '2,100,000', 'YouTube': '1,380,000', 'Khác': '820,000' };

                    return (
                      <tr key={name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
                        <td className="py-4 font-bold text-slate-700 flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-black ${name === 'Facebook' ? 'bg-blue-100 text-blue-600' :
                              name === 'TikTok' ? 'bg-slate-100 text-slate-800' :
                                name === 'Instagram' ? 'bg-pink-100 text-pink-600' :
                                  name === 'YouTube' ? 'bg-red-100 text-red-600' :
                                    'bg-slate-100 text-slate-500'
                            }`}>
                            {name === 'Khác' ? '...' : (PLATFORMS.find(p => p.label === name)?.symbol || '')}
                          </div>
                          {name}
                        </td>
                        <td className="py-4 text-slate-500 font-medium text-center">{dailyVals[name]}</td>
                        <td className="py-4 text-center">
                          <input className="rounded-lg border border-slate-200 px-3 py-1.5 w-[140px] text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-black font-bold shadow-sm" defaultValue={initialVals[name]} />
                        </td>
                        <td className={`py-4 text-center font-bold ${diffColors[name]}`}>{diffVals[name]}</td>
                        <td className="py-4 text-center">
                          <button className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 mx-auto transition-colors">
                            <Upload className="w-3 h-3" /> Tải lên
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#F0F5FF]">
                  <tr>
                    <td className="py-4 px-4 font-black text-slate-800 text-[13px] rounded-l-lg">TỔNG</td>
                    <td className="py-4 text-center font-bold text-slate-800">16,000,000</td>
                    <td className="py-4 text-center font-black text-[#2563EB] text-[15px]">16,007,400</td>
                    <td className="py-4 text-center font-bold text-[#10B981] rounded-r-lg">+0.05%</td>
                    <td className="bg-white"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800 mb-6">Tổng hợp video tháng 3/2026</h3>
            <div className="flex flex-col md:flex-row items-center gap-8 mb-8 border-b border-slate-100 pb-6">
              <div className="flex flex-col items-center justify-center min-w-[120px]">
                <h2 className="text-[52px] font-black text-[#2563EB] leading-none mb-1 tracking-tight">168</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">video tháng này</p>
              </div>
              <div className="space-y-2.5 text-[13px]">
                <p className="text-slate-600 flex items-center"><span className="w-[180px] text-slate-500 font-medium">KPI tháng: <strong className="text-slate-800 ml-1">180 video</strong></span> <span className="text-slate-300 mx-2">•</span> Đạt: <span className="font-black text-[#10B981] ml-1">93%</span></p>
                <p className="text-slate-600 flex items-center"><span className="w-[180px] text-slate-500 font-medium">TB/ngày: <strong className="text-slate-800 ml-1">7.3 video</strong></span> <span className="text-slate-300 mx-2">•</span> Ngày cao nhất: <span className="font-bold text-slate-800 ml-1">12 video <span className="text-slate-400 font-normal ml-0.5">(15/03)</span></span></p>
                <p className="text-slate-600 flex items-center"><span className="w-[180px] text-slate-500 font-medium whitespace-nowrap">Ngày nghỉ/không báo cáo:</span> <strong className="text-slate-800 ml-1">1 ngày</strong></p>
              </div>
            </div>

            <p className="text-[13px] text-black font-bold mb-4">Phân bố 5A trong tháng:</p>
            <div className="grid grid-cols-5 gap-3 mb-6">
              {[
                { id: 'A1', sub: 'Trend/Viral', val: '52', col: 'text-[#3B82F6]' },
                { id: 'A2', sub: 'Kiến thức', val: '40', col: 'text-[#3B82F6]' },
                { id: 'A3', sub: 'Review', val: '35', col: 'text-[#3B82F6]' },
                { id: 'A4', sub: 'Behind the scene', val: '25', col: 'text-[#3B82F6]' },
                { id: 'A5', sub: 'Hero content', val: '16', col: 'text-[#3B82F6]' },
              ].map((item, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-2 text-center bg-white flex flex-col items-center min-h-[100px] justify-center shadow-sm">
                  <p className={`text-[12px] font-black ${item.col}`}>{item.id}</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-none mt-1 mb-2">{item.sub}</p>
                  <p className="font-black text-[24px] text-slate-800">{item.val}</p>
                </div>
              ))}
            </div>

            <div className="h-2.5 flex rounded-full overflow-hidden gap-[1px] w-full mb-3">
              <div className="bg-[#2563EB]" style={{ width: '31%' }}></div>
              <div className="bg-[#3B82F6]" style={{ width: '24%' }}></div>
              <div className="bg-[#60A5FA]" style={{ width: '21%' }}></div>
              <div className="bg-[#93C5FD]" style={{ width: '15%' }}></div>
              <div className="bg-[#BFDBFE]" style={{ width: '10%' }}></div>
            </div>
            <p className="text-center text-[10px] text-slate-400 font-bold tracking-wide">
              A1: 31% - A2: 24% - A3: 21% - A4: 15% - A5: 10%
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
            <h3 className="font-bold text-[15px] mb-4 text-slate-800">Ghi chú đối soát</h3>
            <div className="relative">
              <textarea
                className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-black font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
                placeholder="Nhập ghi chú hoặc giải trình về số liệu nếu có..."
                defaultValue="TikTok tăng 0.8% do video viral được cộng view muộn sau 48h. Facebook giảm 2.1% do platform điều chỉnh cách tính view tháng 3. YouTube tăng 3.3% do video A5 Hành trình kim cương đạt 200K view sau 2 tuần."
              />
              <p className="absolute bottom-3 right-4 text-[10px] font-bold text-slate-400">205/1000</p>
            </div>
          </div>

          <div className="flex justify-center pb-8 pt-4">
            <button
              className="bg-[#2563EB] text-white px-12 py-3.5 rounded-xl font-bold text-[15px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
              onClick={() => {
                setToastMessage({ type: 'success', text: 'Gửi báo cáo tháng thành công!' });
                setTimeout(() => setToastMessage(null), 3000);
              }}
            >
              Gửi báo cáo tháng
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[520px] rounded-3xl bg-white p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-[20px] font-black text-center text-slate-800 tracking-tight">Xác nhận báo cáo ngày 23/03/2026</h3>
            <p className="text-[12px] text-slate-500 text-center mt-1.5 mb-6 font-medium">Kiểm tra trước khi gửi. Sau khi gửi không thể sửa.</p>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="font-bold text-[14px] text-slate-800">Tiến độ</p>
                  <button className="text-[12px] text-[#2563EB] font-bold flex items-center gap-1 hover:text-blue-800 transition" onClick={() => { setConfirmOpen(false); setStep(1); }}>
                    Sửa <PenLine className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[13px] text-slate-600 font-medium tracking-tight">✓ 1/8 nền tảng · {videoCount} video (A1:{a1} A2:{a2} A3:{a3} A4:{a4} A5:{a5})</p>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="font-bold text-[14px] text-slate-800">Traffic và Link báo cáo</p>
                  <button className="text-[12px] text-[#2563EB] font-bold flex items-center gap-1 hover:text-blue-800 transition" onClick={() => { setConfirmOpen(false); setStep(1); }}>
                    Sửa <PenLine className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[13px] text-slate-600 font-medium tracking-tight">✓ Tổng traffic: {Object.values(traffic).reduce((acc, v) => acc + (Number(v) || 0), 0)} · Đã điền {Object.values(videoLinks).filter(v => v).length} link</p>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="font-bold text-[14px] text-slate-800">Chi tiết</p>
                  <button className="text-[12px] text-[#2563EB] font-bold flex items-center gap-1 hover:text-blue-800 transition" onClick={() => { setConfirmOpen(false); setStep(2); }}>
                    Sửa <PenLine className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[13px] text-slate-600 font-medium leading-relaxed tracking-tight">
                  ✓ Công việc: {didToday.length} ký tự · Vấn đề cần hỗ trợ: {hasIssues ? 'Có' : 'Không'} · Kế hoạch ngày mai: {nextPlan ? 'Có' : 'Không'} · Video nào đạt trên 50% source: {hasOwnSource ? 'Có' : 'Không'} · Ý tưởng content mới: {hasNewIdea ? 'Có' : 'Không'}
                </p>
              </div>
            </div>

            <label className="mt-6 flex items-center gap-3 text-[13px] font-bold text-slate-700 bg-white p-2 rounded-xl cursor-pointer transition-colors hover:bg-slate-50">
              <input
                type="checkbox"
                className="w-[18px] h-[18px] rounded border-2 border-slate-300 text-[#1E293B] focus:ring-[#1E293B] cursor-pointer"
                style={{ accentColor: '#1E293B' }}
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Tôi xác nhận thông tin trên là chính xác
            </label>

            <div className="mt-6 flex items-center justify-between">
              <button className="text-slate-500 font-bold text-[13px] hover:text-slate-800 transition-colors" onClick={() => setConfirmOpen(false)}>← Quay lại</button>
              <button
                disabled={!confirmed || isDeadlineLockedToday}
                className={`px-6 py-2.5 rounded-xl font-bold text-white transition-all shadow-sm ${confirmed ? 'bg-[#1D4ED8] hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
                onClick={handleSubmit}
              >
                Gửi báo cáo ngày
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col pl-4 border-l-2 border-[#3B82F6] relative py-2.5 gap-2 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h4 className="font-bold text-[13px] text-slate-800">{label}</h4>
        <div className="flex bg-slate-100 rounded-lg p-0.5 w-fit shrink-0">
          <button
            type="button"
            className={`px-4 py-1.5 text-[11px] rounded-md font-bold transition-all ${!value ? 'bg-[#10B981] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => onChange(false)}>
            Không
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 text-[11px] rounded-md font-bold transition-all ${value ? 'bg-[#1D4ED8] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => onChange(true)}>
            Có
          </button>
        </div>
      </div>
      {value && children && (
        <div className="mt-1 animate-in fade-in zoom-in-95 duration-200 w-full relative">
          {children}
        </div>
      )}
    </div>
  );
}
