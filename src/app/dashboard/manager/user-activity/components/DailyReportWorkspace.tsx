'use client';

import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2 } from 'lucide-react';

type TabMode = 'daily' | 'monthly';

const PLATFORMS = [
  { id: 'fb', label: 'Facebook', symbol: 'f' },
  { id: 'tt', label: 'TikTok', symbol: 'T' },
  { id: 'ig', label: 'Instagram', symbol: 'I' },
  { id: 'yt', label: 'YouTube', symbol: '▶' },
  { id: 'zl', label: 'Zalo', symbol: 'Z' },
  { id: 'th', label: 'Threads', symbol: 'Th' },
];

export default function DailyReportWorkspace() {
  const [mode, setMode] = useState<TabMode>('daily');
  const [step, setStep] = useState<1 | 2>(1);
  const [activePlatform, setActivePlatform] = useState('fb');
  const [traffic, setTraffic] = useState<Record<string, string>>({});
  const [videoCount, setVideoCount] = useState('8');
  const [a1, setA1] = useState('3');
  const [a2, setA2] = useState('2');
  const [a3, setA3] = useState('1');
  const [a4, setA4] = useState('1');
  const [a5, setA5] = useState('1');

  const [didToday, setDidToday] = useState('');
  const [issues, setIssues] = useState('');
  const [nextPlan, setNextPlan] = useState(false);
  const [hasOwnSource, setHasOwnSource] = useState(false);
  const [hasNewIdea, setHasNewIdea] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const dailyTotal = useMemo(() => {
    return (Number(a1) || 0) + (Number(a2) || 0) + (Number(a3) || 0) + (Number(a4) || 0) + (Number(a5) || 0);
  }, [a1, a2, a3, a4, a5]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-2 text-sm font-semibold">
          <button
            onClick={() => setMode('daily')}
            className={`py-3 ${mode === 'daily' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
          >
            Báo cáo ngày <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-yellow-300 text-black">Hàng ngày</span>
          </button>
          <button
            onClick={() => setMode('monthly')}
            className={`py-3 ${mode === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
          >
            Báo cáo tháng <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-yellow-300 text-black">Mùng 5</span>
          </button>
        </div>
      </div>

      {mode === 'daily' ? (
        <>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">Báo cáo tiến độ hôm nay</p>
              <p className="text-xs text-blue-700">Mọi báo cáo đều được ghi nhận tự động.</p>
            </div>
            <p className="text-3xl font-bold text-blue-600">∞:∞</p>
          </div>

          <div className="flex items-center justify-center gap-10 text-sm">
            <button onClick={() => setStep(1)} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${step === 1 ? 'bg-green-600' : 'bg-slate-300'}`}>1</span>
              Tiến độ
            </button>
            <button onClick={() => setStep(2)} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${step === 2 ? 'bg-green-600' : 'bg-slate-300'}`}>2</span>
              Chi tiết
            </button>
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold mb-3">Nền tảng đã đăng hôm nay</h3>
                <div className="grid grid-cols-4 gap-3">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActivePlatform(p.id)}
                      className={`rounded-lg border p-3 text-left ${activePlatform === p.id ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                    >
                      <p className="font-bold">{p.symbol}</p>
                      <p className="text-xs text-slate-500">{p.label}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Traffic (lượt xem)"
                    value={traffic[activePlatform] || ''}
                    onChange={(e) => setTraffic((prev) => ({ ...prev, [activePlatform]: e.target.value }))}
                  />
                  <button className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
                    Chọn hình ảnh minh chứng
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold mb-3">Số video & Phân loại 5A</h3>
                <div className="flex items-center gap-3 mb-3">
                  <input className="w-20 rounded-lg border border-blue-200 px-3 py-2 font-semibold" value={videoCount} onChange={(e) => setVideoCount(e.target.value)} />
                  <p className="text-sm text-slate-500">video đã hoàn thành</p>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-sm">
                  <input className="rounded-lg border border-red-200 px-2 py-2" value={a1} onChange={(e) => setA1(e.target.value)} />
                  <input className="rounded-lg border border-orange-200 px-2 py-2" value={a2} onChange={(e) => setA2(e.target.value)} />
                  <input className="rounded-lg border border-amber-200 px-2 py-2" value={a3} onChange={(e) => setA3(e.target.value)} />
                  <input className="rounded-lg border border-emerald-200 px-2 py-2" value={a4} onChange={(e) => setA4(e.target.value)} />
                  <input className="rounded-lg border border-purple-200 px-2 py-2" value={a5} onChange={(e) => setA5(e.target.value)} />
                </div>
                <p className="mt-3 text-sm text-emerald-700">Tổng phân loại: {dailyTotal} / video: {videoCount}</p>
              </div>

              <div className="flex justify-end">
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={() => setStep(2)}>
                  Tiếp - Chi tiết
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                <h3 className="font-semibold">Chi tiết công việc</h3>
                <textarea value={didToday} onChange={(e) => setDidToday(e.target.value)} className="w-full min-h-[88px] rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Hôm nay bạn đã làm gì?" />
                <textarea value={issues} onChange={(e) => setIssues(e.target.value)} className="w-full min-h-[88px] rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Vấn đề cần hỗ trợ?" />
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <ToggleRow label="Kế hoạch ngày mai?" value={nextPlan} onChange={setNextPlan} />
                  <ToggleRow label="Video nào đạt trên 50% source?" value={hasOwnSource} onChange={setHasOwnSource} />
                  <ToggleRow label="Ý tưởng content mới?" value={hasNewIdea} onChange={setHasNewIdea} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button className="text-slate-500" onClick={() => setStep(1)}>← Quay lại</button>
                <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={() => setConfirmOpen(true)}>
                  Gửi báo cáo
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-blue-50 p-4 flex justify-between">
            <div>
              <p className="font-semibold text-blue-900">Báo cáo đối soát Traffic tháng 3/2026</p>
              <p className="text-xs text-blue-700">Deadline: 9:00 sáng ngày 05/04/2026</p>
            </div>
            <p className="font-semibold text-blue-700">Còn 13 ngày</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold mb-3">Traffic chính thức theo nền tảng</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2">Nền tảng</th>
                    <th>Tổng BC ngày</th>
                    <th>Số chính thức</th>
                    <th>Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {['Facebook', 'TikTok', 'Instagram', 'YouTube'].map((name) => (
                    <tr key={name} className="border-b">
                      <td className="py-2">{name}</td>
                      <td>3,250,000</td>
                      <td><input className="rounded border px-2 py-1 w-28" defaultValue="3,180,500" /></td>
                      <td className="text-emerald-600">+0.8%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-center">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold">Gửi báo cáo tháng</button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 p-5">
            <h3 className="text-xl font-bold text-center">Xác nhận báo cáo ngày</h3>
            <p className="text-sm text-slate-500 text-center mb-4">Kiểm tra trước khi gửi. Sau khi gửi không thể sửa.</p>
            <div className="space-y-3 text-sm">
              <p><span className="font-semibold">Tiến độ:</span> <span className="text-emerald-700">✓</span> {videoCount} video (A1:{a1} A2:{a2} A3:{a3} A4:{a4} A5:{a5})</p>
              <p><span className="font-semibold">Traffic:</span> Tổng {Object.values(traffic).reduce((acc, v) => acc + (Number(v) || 0), 0)}</p>
              <p><span className="font-semibold">Chi tiết:</span> {didToday ? `✓ ${didToday.length} ký tự` : 'Chưa nhập'}</p>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              Tôi xác nhận thông tin trên là chính xác
            </label>
            <div className="mt-5 flex items-center justify-between">
              <button className="text-slate-500" onClick={() => setConfirmOpen(false)}>← Quay lại</button>
              <button
                disabled={!confirmed}
                className="px-4 py-2 rounded-lg font-semibold text-white disabled:bg-slate-300 bg-green-600"
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmed(false);
                }}
              >
                <span className="inline-flex items-center gap-2"><Check className="w-4 h-4" /> Gửi báo cáo ngày</span>
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
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
      <p>{label}</p>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`rounded-md px-3 py-1 text-white ${value ? 'bg-green-600' : 'bg-slate-400'}`}
      >
        {value ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Có</span> : 'Không'}
      </button>
    </div>
  );
}

