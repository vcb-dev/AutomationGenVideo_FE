'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, CheckCircle2, Clock, AlertCircle, TrendingUp, TrendingDown, Users, Flame, Zap, BarChart3, FileSpreadsheet, Send, FileText, Settings, UserCheck, Check, X, Bell } from 'lucide-react';

function PortalToHeader({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = document.getElementById('navbar-portal-root');
    if (root) {
      setPortalRoot(root);
      setMounted(true);
    }
  }, []);

  if (!mounted || !portalRoot) return null;
  return createPortal(children, portalRoot);
}

export default function ManagerChecklistWorkspace({ reports = [] }: { reports?: any[] }) {
  const [activeTab, setActiveTab] = useState<'checklist' | 'leader'>('checklist');
  const [filterStatus, setFilterStatus] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Leader Form states
  const [l1, setL1] = useState('Nhóm hoàn thành 35, 6/8 người đã nộp báo cáo đúng hạn. Đặng Thị G hoàn thành xuất sắc 10/10 tiến độ với 9 video. Tổng 42 video = 87% KPI ngày, cần đẩy thêm 6 video/ngày để đạt target tháng. Hỗn hợp sờ hợp và khoác AI ra suy đồng thùa? video sẽ nộp KPI tháng.');
  const [l2, setL2] = useState(false);
  const [l2Text, setL2Text] = useState('');
  const [l3, setL3] = useState(false);
  const [l3Text, setL3Text] = useState('');
  const [l4, setL4] = useState('Ngày mai ra tiền:\n- A1: 4 video Tik tok trend (Văn A + Thị C + Thị G)\n- A2: 2 video kiến thức ngành (Văn F + Văn I)\n- A3: 3 video hậu trường CEO (Thị G lead)\n- A4: 1 video FAQ sản phẩm mới (Văn A)');
  const [l5, setL5] = useState(false);
  const [l5Text, setL5Text] = useState('');
  const [confirmed, setConfirmed] = useState(true);

  const [showToast, setShowToast] = useState(false);

  const handleSubmitEval = () => {
    if (!confirmed) return;
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setActiveTab('checklist');
    }, 2000);
  };

  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);

  const OUTSTANDING_ISSUES = [
    {
      n: 'Nguyễn Văn A', c: 3, init: 'N', bg: 'bg-amber-500', t: 'Video về câu trả lời A2 kiến thức nghiệp, cần team quay hỗ trợ cùng vào ngày mai. Ngoài ra, tool edit AI bị lỗi khi render video - 3 phút.',
      details: [
        { q: 'Hôm nay bạn đã làm gì?', a: 'Sản xuất 3 video TikTok về kiến thức nghiệp vụ. Gặp một số khó khăn với tool render AI.' },
        { q: 'Vấn đề cần hỗ trợ?', a: 'Video về câu trả lời A2 kiến thức nghiệp, cần team quay hỗ trợ cùng vào ngày mai. Ngoài ra, tool edit AI bị lỗi khi render video - 3 phút.' },
        { q: 'Kế hoạch ngày mai?', a: 'Xin team production hỗ trợ quay chung nội dung.' }
      ]
    },
    {
      n: 'Hoàng Văn D', c: 2, init: 'H', bg: 'bg-orange-500', t: 'Video về câu trả lời A1 kiến thức nghiệp - Tool edit AI bị lỗi khi render video dài - 3 phút — ảnh hưởng 3 ngày trong nhóm, cần IT kiểm tra.',
      details: [
        { q: 'Hôm nay bạn đã làm gì?', a: 'Sản xuất 2 video YouTube ngắn gọn.' },
        { q: 'Vấn đề cần hỗ trợ?', a: 'Video về câu trả lời A1 kiến thức nghiệp - Tool edit AI bị lỗi khi render video dài - 3 phút — ảnh hưởng 3 ngày trong nhóm, cần IT kiểm tra.' },
        { q: 'Video nào đạt trên 50% source?', a: 'Video series kiến thức cơ bản đạt 60% source gốc.' }
      ]
    },
    {
      n: 'Nguyễn Văn B', c: 5, init: 'N', bg: 'bg-amber-500', t: '9 tháng content mới? — Series "Mỗi ngày của CEO" — hậu trường làm việc thật, phù hợp A3 Trust Content. Dự kiến 5 tập, quay trong 2 tuần tới.',
      details: [
        { q: 'Hôm nay bạn đã làm gì?', a: 'Brainstorm ý tưởng concept mới.' },
        { q: 'Ý tưởng content mới?', a: '9 tháng content mới? — Series "Mỗi ngày của CEO" — hậu trường làm việc thật, phù hợp A3 Trust Content. Dự kiến 5 tập, quay trong 2 tuần tới.' }
      ]
    }
  ];

  // Aggregate basic stats
  const totalMembers = reports.length || 42;
  const totalTraffic = useMemo(() => {
    return reports.reduce((acc, r) => acc + (Number((r.traffic || '0').replace(/\./g, '').replace(/,/g, '')) || 0), 0) || 1200000;
  }, [reports]);

  const avgProgress = 7.8; // Mock value

  // Dummy data for tables as in mockup
  const DUMMY_REPORTS = [
    { id: 1, name: 'Nguyễn Văn A', position: 'Content Creator', time: '17:23', status: 'Đang làm', progress: 7, video: 6, traffic: '125K', a1: 3, a2: 2, a3: 1, a4: 1, a5: 1 },
    { id: 2, name: 'Phạm Thị C', position: 'Content Creator', time: '17:45', status: 'Đang làm', progress: 9, video: 4, traffic: '89K', a1: 2, a2: 2, a3: 1, a4: 1, a5: 0 },
    { id: 3, name: 'Trần Văn F', position: 'Content Creator', time: '18:30', status: 'Hoàn thành', progress: 10, video: 5, traffic: '112K', a1: 2, a2: 2, a3: 1, a4: 1, a5: 1 },
    { id: 4, name: 'Đặng Thị G', position: 'Content Creator', time: '19:05', status: 'Hoàn thành', progress: 10, video: 8, traffic: '156K', a1: 3, a2: 2, a3: 2, a4: 1, a5: 1 },
    { id: 5, name: 'Ngô Văn I', position: 'Content Creator', time: '19:45', status: 'Đang làm', progress: 6, video: 3, traffic: '78K', a1: 2, a2: 1, a3: 1, a4: 1, a5: 0 },
    { id: 6, name: 'Hoàng Văn D', position: 'Content Creator', time: '20:15', status: 'Trễ hạn', progress: 4, video: 2, traffic: '45K', a1: 1, a2: 1, a3: 1, a4: 1, a5: 0 },
    { id: 7, name: 'Phan Văn K', position: 'Content Creator', time: '20:30', status: 'Trễ hạn', progress: 3, video: 1, traffic: '20K', a1: 1, a2: 0, a3: 0, a4: 0, a5: 0 },
    { id: 8, name: 'Lê Thị E', position: 'Content Creator', time: '--', status: 'Chưa nộp', progress: 0, video: 0, traffic: '--', a1: 0, a2: 0, a3: 0, a4: 0, a5: 0 },
    { id: 9, name: 'Bùi Văn H', position: 'Content Creator', time: '--', status: 'Chưa nộp', progress: 0, video: 0, traffic: '--', a1: 0, a2: 0, a3: 0, a4: 0, a5: 0 },
    { id: 10, name: 'Trương Thị M', position: 'Content Creator', time: '--', status: 'Chưa nộp', progress: 0, video: 0, traffic: '--', a1: 0, a2: 0, a3: 0, a4: 0, a5: 0 },
  ];

  const displayReports = reports.length > 0 ? reports.map((r, i) => {
    const isDone = r.status === 'Đã duyệt' || r.status?.includes('duyệt');
    const isLate = r.status?.includes('Trễ') || r.status?.includes('Chưa');
    return {
      id: r.id || i,
      name: r.name || 'Unknown',
      position: r.position || 'Content Creator',
      time: r.time || '--',
      status: isDone ? 'Hoàn thành' : isLate ? 'Trễ hạn' : 'Đang làm',
      progress: Math.floor(Math.random() * 5) + 5,
      video: r.videoCount || 0,
      traffic: r.traffic || '0',
      a1: r.a1 || 0, a2: r.a2 || 0, a3: r.a3 || 0, a4: r.a4 || 0, a5: r.a5 || 0
    };
  }) : DUMMY_REPORTS;

  const filteredReports = displayReports.filter(r => {
    if (filterStatus !== 'Tất cả' && r.status !== filterStatus && !(filterStatus === 'Đang làm' && r.status === 'Hoàn thành')) return false;
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 pb-10 font-sans relative">
      <PortalToHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`${activeTab === 'checklist' ? 'bg-[#2563EB] text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'} px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2.5 shadow-sm transition-colors`}
            >
              <span className="text-base">📋</span> Checklist nhóm {activeTab === 'checklist' && <span className="bg-[#3B82F6] text-white text-[10px] px-2 py-0.5 rounded-md font-black tracking-wider ml-1 shadow-inner">ACTIVE</span>}
            </button>
            <button
              onClick={() => setActiveTab('leader')}
              className={`${activeTab === 'leader' ? 'bg-[#2563EB] text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'} px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2.5 shadow-sm transition-colors`}
            >
              <span className="text-base">👑</span> Đánh giá Leader {activeTab === 'leader' && <span className="bg-[#3B82F6] text-white text-[10px] px-2 py-0.5 rounded-md font-black tracking-wider ml-1 shadow-inner">ACTIVE</span>}
            </button>
          </div>

        </div>
      </PortalToHeader>

      {activeTab === 'checklist' ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* 1. KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[13px] font-bold text-slate-500 mb-1">Tổng thành viên</p>
              <div className="flex items-end gap-3">
                <h2 className="text-4xl font-black text-slate-800">{totalMembers}</h2>
                <p className="text-xs text-slate-500 mb-1.5 font-medium">KPI: 48/ngày • <span className="text-[#10B981]">87% KCB</span></p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[13px] font-bold text-slate-500 mb-1">Tổng traffic nhóm</p>
              <div className="flex items-end gap-3">
                <h2 className="text-4xl font-black text-slate-800">1.2M</h2>
                <p className="text-xs text-slate-500 mb-1.5 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3 text-[#10B981]" /> 106% so tháng qua</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[13px] font-bold text-slate-500 mb-1">Trung bình tiến độ</p>
              <div className="flex items-end gap-3 mb-2">
                <h2 className="text-4xl font-black text-slate-800">{avgProgress}<span className="text-xl text-slate-400">/10</span></h2>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-[#3B82F6] h-1.5 rounded-full" style={{ width: `${(avgProgress / 10) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">{avgProgress * 10}% đã hoàn thành</p>
            </div>
          </div>

          {/* 2. Main Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-[15px] text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" /> Chi tiết Checklist thành viên — <span className="text-blue-600 bg-blue-50 px-2 rounded ml-1">23/03/2026</span>
              </h3>
            </div>
            <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-bold text-slate-500">Filter:</span>
                <button onClick={() => setFilterStatus('Tất cả')} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${filterStatus === 'Tất cả' ? 'bg-[#3B82F6] text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Tất cả</button>
                <button onClick={() => setFilterStatus('Đang làm')} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${filterStatus === 'Đang làm' ? 'bg-[#3B82F6] text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Đang làm</button>
                <button onClick={() => setFilterStatus('Trễ hạn')} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${filterStatus === 'Trễ hạn' ? 'bg-[#3B82F6] text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Trễ hạn</button>
                <button onClick={() => setFilterStatus('Chưa nộp')} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${filterStatus === 'Chưa nộp' ? 'bg-[#3B82F6] text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Chưa nộp</button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] w-full sm:w-56 transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
              <table className="w-full text-xs relative">
                <thead className="bg-[#F8FAFC] sticky top-0 z-10 shadow-sm">
                  <tr className="border-y border-slate-200 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-10 text-center">#</th>
                    <th className="py-3 px-2 min-w-[150px]">NHÂN VIÊN</th>
                    <th className="py-3 px-2">GIỜ NỘP</th>
                    <th className="py-3 px-2">TRẠNG THÁI</th>
                    <th className="py-3 px-2 min-w-[100px]">TIẾN ĐỘ</th>
                    <th className="py-3 px-2">VIDEO</th>
                    <th className="py-3 px-2">TRAFFIC</th>
                    <th className="py-3 px-1 text-center text-[#EF4444]">A1</th>
                    <th className="py-3 px-1 text-center text-[#F97316]">A2</th>
                    <th className="py-3 px-1 text-center text-[#3B82F6]">A3</th>
                    <th className="py-3 px-1 text-center text-[#EAB308]">A4</th>
                    <th className="py-3 px-1 text-center text-[#A855F7]">A5</th>
                    <th className="py-3 px-4 text-right">HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((r, i) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">{i + 1}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white ${r.status === 'Chưa nộp' ? 'bg-slate-400' : 'bg-amber-500'}`}>{r.name.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-[13px] text-slate-800">{r.name}</p>
                            <p className="text-[10px] text-slate-400">{r.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[11px] font-medium text-slate-500">{r.time}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${r.status === 'Đang làm' || r.status === 'Hoàn thành' ? 'bg-[#ECFDF5] text-[#059669]' :
                            r.status === 'Trễ hạn' ? 'bg-[#FFF7ED] text-[#C2410C]' : 'bg-[#FEF2F2] text-[#DC2626]'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'Đang làm' || r.status === 'Hoàn thành' ? 'bg-[#10B981]' :
                              r.status === 'Trễ hạn' ? 'bg-[#F97316]' : 'bg-[#EF4444]'
                            }`}></span>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full ${r.progress >= 10 ? 'bg-[#10B981]' : r.progress === 0 ? 'bg-transparent' : r.progress < 7 ? 'bg-[#F97316]' : 'bg-[#3B82F6]'}`} style={{ width: `${(r.progress / 10) * 100}%` }}></div>
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 w-8">{r.progress}/10</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[13px] font-medium text-slate-700">{r.video}</td>
                      <td className="py-3 px-2 text-[13px] font-medium text-slate-700">{r.traffic}</td>
                      <td className="py-3 px-1 text-center font-bold text-slate-600">{r.a1}</td>
                      <td className="py-3 px-1 text-center font-bold text-slate-600">{r.a2}</td>
                      <td className="py-3 px-1 text-center font-bold text-slate-600">{r.a3}</td>
                      <td className="py-3 px-1 text-center font-bold text-slate-600">{r.a4}</td>
                      <td className="py-3 px-1 text-center font-bold text-slate-600">{r.a5}</td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-slate-400 hover:text-slate-700">•••</button>
                      </td>
                    </tr>
                  ))}
                  {filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={13} className="py-10 text-center text-slate-400 text-xs font-bold italic">Không tìm thấy báo cáo nào phù hợp với bộ lọc</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-[#F8FAFC] border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 font-black text-slate-600 text-xs">TỔNG</td>
                    <td className="py-3 px-2 font-bold text-slate-700">6/8</td>
                    <td className="py-3 px-2 font-bold text-slate-700 text-left">Avg 7.5</td>
                    <td className="py-3 px-2 font-black text-slate-800 text-[13px]">42</td>
                    <td className="py-3 px-2 font-black text-slate-800 text-[13px]">1.2M</td>
                    <td className="py-3 px-1 font-black text-slate-800 text-center">14</td>
                    <td className="py-3 px-1 font-black text-slate-800 text-center">10</td>
                    <td className="py-3 px-1 font-black text-slate-800 text-center">8</td>
                    <td className="py-3 px-1 font-black text-slate-800 text-center">6</td>
                    <td className="py-3 px-1 font-black text-slate-800 text-center">4</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 3. Vấn đề nổi bật */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-[15px]  flex items-center gap-2 mb-4 text-slate-800">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" /> Vấn đề nổi bật từ báo cáo hôm nay
            </h3>
            <div className="space-y-4">
              {OUTSTANDING_ISSUES.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black text-white ${item.bg || 'bg-amber-500'}`}>{item.init}</div>
                  <div className="flex-1 border-b border-slate-50 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-[13px] text-slate-800 flex items-center gap-2">{item.n} <span className="text-[10px] text-slate-400 font-medium">• {item.c} câu hỏi</span></p>
                      <button className="text-[11px] font-bold text-[#3B82F6] hover:underline" onClick={() => setSelectedIssue(item)}>Xem chi tiết</button>
                    </div>
                    <p className="text-[13px] text-slate-600 leading-relaxed">{item.t}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400 font-medium italic">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> Đã thu thập được câu trả lời từ Dashboard cuối "Vấn đề cần báo" ở Manager daily
            </div>
          </div>

          {/* Grid for Bottom sections */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-[15px] flex items-center gap-2 mb-4 text-slate-800">
                  <BarChart3 className="w-4 h-4 text-blue-500" /> Tổng hợp 5A nhóm — Dashboard
                </h3>
                <div className="flex items-center justify-between">
                  <div className="w-[120px] h-[120px] rounded-full border-[10px] border-[#3B82F6] flex items-center justify-center relative">
                    <span className="text-3xl font-black text-slate-800">42</span>
                  </div>
                  <div className="flex-1 pl-8 space-y-2 text-[11px] font-bold text-slate-600">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span> A1 Nhận diện</div><span>32%</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F97316]"></span> A2 Thiện nguyện</div><span>24%</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span> A3 Tin tưởng</div><span>19%</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EAB308]"></span> A4 Chuyển đổi</div><span>14%</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#A855F7]"></span> A5 Thành công</div><span>11% <span className="text-amber-500 ml-1">▲ 53% là Qualified</span></span></div>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-[10px] font-bold text-slate-400 mb-2">So sánh KPI tháng 3:</p>
                  <div className="h-4 flex rounded-sm overflow-hidden gap-0.5">
                    <div className="bg-[#818CF8]" style={{ width: '40%' }}></div>
                    <div className="bg-[#A78BFA]" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-[15px] flex items-center gap-2 mb-4 text-slate-800">
                  <Users className="w-4 h-4 text-amber-600" /> Nhân viên nổi bật
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-black text-xs">Đ</div>
                      <div>
                        <p className="font-bold text-[13px] text-slate-800">Đặng Thị G</p>
                        <p className="text-[10px] text-slate-500">10/10 tiến độ, 9 video, 156K traffic</p>
                      </div>
                    </div>
                    <Flame className="w-4 h-4 text-red-500 fill-red-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white font-black text-xs">N</div>
                      <div>
                        <p className="font-bold text-[13px] text-slate-800">Nguyễn Văn A</p>
                        <p className="text-[10px] text-slate-500">6 video, Traffic cao nhất 125K</p>
                      </div>
                    </div>
                    <Zap className="w-4 h-4 text-blue-500 fill-blue-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 bg-[#10B981] rounded-full flex items-center justify-center text-white font-black text-xs">T</div>
                      <div>
                        <p className="font-bold text-[13px] text-slate-800">Trần Văn F</p>
                        <p className="text-[10px] text-slate-500">7 video, 112K traffic</p>
                      </div>
                    </div>
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-0 overflow-hidden flex flex-col">
                <h3 className="font-bold text-[15px] flex items-center gap-2 m-5 mb-4 text-slate-800">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> Tổng hợp Traffic từng thành viên
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead className="bg-[#F8FAFC] border-y border-slate-100 uppercase text-slate-500 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 text-left">NHÂN VIÊN</th>
                        <th className="py-2.5 px-2 text-center">FACEBOOK</th>
                        <th className="py-2.5 px-2 text-center">TIKTOK</th>
                        <th className="py-2.5 px-2 text-center">INSTAGRAM</th>
                        <th className="py-2.5 px-2 text-center">YOUTUBE</th>
                        <th className="py-2.5 px-2 text-center">KHÁC</th>
                        <th className="py-2.5 px-3 text-center">TỔNG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-[11px] text-slate-600">
                      <tr>
                        <td className="py-2.5 px-3 flex items-center gap-1.5"><div className="w-4 h-4 bg-amber-500 rounded-full flex-shrink-0 text-[8px] text-white flex items-center justify-center font-bold">Đ</div> Đặng Thị G</td>
                        <td className="py-2.5 px-2 text-center">42K</td><td className="py-2.5 px-2 text-center">68K</td><td className="py-2.5 px-2 text-center">28K</td><td className="py-2.5 px-2 text-center">12K</td><td className="py-2.5 px-2 text-center">6K</td><td className="py-2.5 px-3 text-center font-bold text-slate-800">156K</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 flex items-center gap-1.5"><div className="w-4 h-4 bg-amber-400 rounded-full flex-shrink-0 text-[8px] text-white flex items-center justify-center font-bold">N</div> Nguyễn Văn A</td>
                        <td className="py-2.5 px-2 text-center">35K</td><td className="py-2.5 px-2 text-center">52K</td><td className="py-2.5 px-2 text-center">22K</td><td className="py-2.5 px-2 text-center">10K</td><td className="py-2.5 px-2 text-center">6K</td><td className="py-2.5 px-3 text-center font-bold text-slate-800">125K</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 flex items-center gap-1.5"><div className="w-4 h-4 bg-[#10B981] rounded-full flex-shrink-0 text-[8px] text-white flex items-center justify-center font-bold">T</div> Trần Văn F</td>
                        <td className="py-2.5 px-2 text-center">30K</td><td className="py-2.5 px-2 text-center">48K</td><td className="py-2.5 px-2 text-center">20K</td><td className="py-2.5 px-2 text-center">8K</td><td className="py-2.5 px-2 text-center">6K</td><td className="py-2.5 px-3 text-center font-bold text-slate-800">112K</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="py-2.5 px-3 flex items-center gap-1.5"><div className="w-4 h-4 bg-[#3B82F6] rounded-full flex-shrink-0 text-[8px] text-white flex items-center justify-center font-bold">N</div> Ngô Văn I</td>
                        <td className="py-2.5 px-2 text-center">18K</td><td className="py-2.5 px-2 text-center">32K</td><td className="py-2.5 px-2 text-center">15K</td><td className="py-2.5 px-2 text-center">5K</td><td className="py-2.5 px-2 text-center">8K</td><td className="py-2.5 px-3 text-center font-bold text-slate-800">78K</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-[#F8FAFC] border-t border-slate-100 font-bold text-[11px] text-slate-800">
                      <tr>
                        <td className="py-2.5 px-3">TỔNG</td>
                        <td className="py-2.5 px-2 text-center">155K</td><td className="py-2.5 px-2 text-center">256K</td><td className="py-2.5 px-2 text-center">111K</td><td className="py-2.5 px-2 text-center">50K</td><td className="py-2.5 px-2 text-center">29K</td><td className="py-2.5 px-3 text-center text-[12px]">605K</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="p-3 text-[9px] text-slate-400 font-medium flex gap-3 border-t border-slate-100 mt-auto bg-slate-50/50">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#818CF8] rounded-full"></span> A1 khi đã có lượt tiếp cận (1)</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></span> Traffic thành kỳ</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#F97316] rounded-full"></span> Vấn đề đã báo (2)</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 pb-6">
                <h3 className="font-bold text-[15px] flex items-center gap-2 mb-4 text-slate-800">
                  <Zap className="w-4 h-4 text-indigo-500" /> Hành động nhanh
                </h3>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setActiveTab('leader')} className="w-full bg-[#2563EB] hover:bg-blue-700 transition flex items-center justify-center gap-2 text-white font-bold text-[13px] py-2.5 rounded-lg shadow-sm">
                    <CheckCircle2 className="w-4 h-4" /> Chuyển sang Đánh giá Leader
                  </button>
                  <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 transition flex items-center justify-center gap-2 text-slate-700 font-bold text-[13px] py-2.5 rounded-lg shadow-sm">
                    <FileSpreadsheet className="w-4 h-4 text-[#10B981]" /> Xuất báo cáo Excel
                  </button>
                  <button className="w-full bg-[#F97316] hover:bg-orange-600 transition flex items-center justify-center gap-2 text-white font-bold text-[13px] py-2.5 rounded-lg shadow-sm">
                    <Send className="w-4 h-4" /> Nhắc tất cả chưa nộp (2)
                  </button>
                </div>

                <div className="mt-5 space-y-2 text-[10px] text-slate-500 italic">
                  <p className="flex items-center gap-1.5"><div className="w-1 h-1 bg-slate-300 rounded-full"></div> Chụp tổng hợp</p>
                  <p className="flex items-center gap-1.5"><div className="w-1 h-1 bg-blue-500 rounded-full"></div> Số nhóm — Dashboard real-time</p>
                  <p className="flex items-center gap-1.5"><div className="w-1 h-1 bg-slate-300 rounded-full"></div> Traffic thành kỳ</p>
                  <p className="flex items-center gap-1.5"><div className="w-1 h-1 bg-orange-500 rounded-full"></div> Vấn đề đã báo (2)</p>
                  <p className="flex items-center gap-1.5"><div className="w-1 h-1 bg-red-500 rounded-full"></div> KPI vượt trội (2)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300 max-w-[1300px] mx-auto">
          {/* Leader Form */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden mt-6 relative z-10">
            <div className="bg-gradient-to-r from-[#3B82F6] to-[#6366F1] px-6 py-5">
              <h2 className="text-white font-black text-[22px] flex items-center gap-2 mb-1.5"><span className="text-2xl">👑</span> Đánh giá tổng thể nhóm Nội dung VN</h2>
              <p className="text-blue-100 text-[16px] font-medium tracking-wide">Leader trả lời 5 câu đánh giá cuối ngày. Có 2 câu bắt buộc (L1, L4).</p>
            </div>
            {/* Status bar */}
            <div className="flex items-center gap-6 flex-wrap px-8 py-4 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2.5 text-[16px] font-bold text-slate-600">
                <Clock className="w-5 h-5 text-[#3B82F6]" /> Đánh giá ngày: <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-black tracking-tight">23/03/2026</span>
              </div>
              <div className="flex items-center gap-2.5 text-[16px] font-bold text-slate-600 border-l border-slate-200 pl-6">
                Trạng thái: <span className="bg-[#F97316] text-white px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2 uppercase text-[12px] tracking-widest font-black"><Bell className="w-4 h-4" /> CHƯA GỬI</span>
              </div>
              <div className="flex items-center gap-2 text-[16px] font-bold text-slate-600 border-l border-slate-200 pl-6">
                <AlertCircle className="w-5 h-5 text-red-500" /> Hạn gửi: <span className="text-red-600 font-black">23:59 hôm nay</span>
              </div>
            </div>

            <div className="p-6 space-y-6 bg-slate-50/30">
              {/* L1 */}
              <div className={`rounded-xl border ${l1.length === 0 ? 'border-red-300 bg-red-50/40' : 'border-red-200 bg-white'} shadow-sm p-5`}>
                <div className="flex flex-col mb-3">
                  <h3 className="font-bold text-[15px] text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[11px] font-black">L1</span>
                    Đánh giá tổng thể tiến độ nhóm hôm nay ⭐
                  </h3>
                  <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold w-fit mt-1 ml-8">⭑ Bắt buộc</span>
                </div>
                <textarea
                  value={l1}
                  onChange={e => setL1(e.target.value)}
                  className="w-full min-h-[100px] border border-slate-200 rounded-lg bg-white p-3 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-medium leading-relaxed"
                  placeholder="Nhập đánh giá tiến độ của nhóm hiện tại..."
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-amber-500 font-bold flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Thông tin này sẽ được hiển thị trong Dashboard tổng quan</p>
                  <p className="text-[10px] text-slate-400 font-bold">{l1.length}/500</p>
                </div>
              </div>

              {/* L2 */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[15px] text-slate-800 flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[11px] font-black">L2</span>
                      Có vấn đề nào cần escalate lên Manager không?
                    </h3>
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold w-fit ml-8">Không bắt buộc</span>
                  </div>
                  <ToggleOption value={l2} onChange={setL2} />
                </div>
                {l2 && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-2 pl-8">
                    <textarea
                      value={l2Text}
                      onChange={e => setL2Text(e.target.value)}
                      className="w-full min-h-[80px] border border-slate-200 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-medium"
                      placeholder="Nhập chi tiết vấn đề cần báo cáo..."
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* L3 */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[15px] text-slate-800 flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[11px] font-black">L3</span>
                      Nhân viên nào cần hỗ trợ đặc biệt?
                    </h3>
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold w-fit ml-8">Không bắt buộc</span>
                  </div>
                  <ToggleOption value={l3} onChange={setL3} />
                </div>
                {l3 && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-2 pl-8">
                    <textarea
                      value={l3Text}
                      onChange={e => setL3Text(e.target.value)}
                      className="w-full min-h-[80px] border border-slate-200 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-medium"
                      placeholder="Ghi rõ tên nhân viên và vấn đề cần hỗ trợ..."
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* L4 */}
              <div className={`rounded-xl border ${l4.length === 0 ? 'border-red-300 bg-red-50/40' : 'border-red-200 bg-white'} shadow-sm p-5`}>
                <div className="flex flex-col mb-3">
                  <h3 className="font-bold text-[15px] text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[11px] font-black">L4</span>
                    Kế hoạch content cho ngày mai ⭐
                  </h3>
                  <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold w-fit mt-1 ml-8">⭑ Bắt buộc</span>
                </div>
                <textarea
                  value={l4}
                  onChange={e => setL4(e.target.value)}
                  className="w-full min-h-[140px] border border-slate-200 rounded-lg bg-white p-3 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-medium leading-relaxed"
                  placeholder="Liệt kê kế hoạch content..."
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-amber-500 font-bold flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Thông tin này sẽ được hiển thị trong Dashboard tổng quan</p>
                  <p className="text-[10px] text-slate-400 font-bold">{l4.length}/500</p>
                </div>
              </div>

              {/* L5 */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[15px] text-slate-800 flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[11px] font-black">L5</span>
                      Đề xuất cải thiện quy trình
                    </h3>
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold w-fit ml-8">Không bắt buộc</span>
                  </div>
                  <ToggleOption value={l5} onChange={setL5} />
                </div>
                {l5 && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-2 pl-8">
                    <textarea
                      value={l5Text}
                      onChange={e => setL5Text(e.target.value)}
                      className="w-full min-h-[80px] border border-slate-200 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-medium"
                      placeholder="Nhập đề xuất hệ thống, quy định hoặc cải thiện năng suất..."
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Submit Area */}
            <div className="bg-white border-t border-slate-200 p-6 pt-5">
              <div onClick={() => setConfirmed(!confirmed)} className="flex items-center gap-3 cursor-pointer mb-6 group w-fit">
                <div className={`w-[22px] h-[22px] rounded border-[2.5px] flex items-center justify-center transition-colors ${confirmed ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300 group-hover:border-purple-400'}`}>
                  {confirmed && <Check className="w-3.5 h-3.5 text-white stroke-[4px]" />}
                </div>
                <span className="text-[14px] font-bold text-slate-700 select-none">Tôi xác nhận đánh giá trên là chính xác và đầy đủ</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-[13px] text-slate-500 font-bold flex items-center gap-2"><span className="text-[16px]">💾</span> Tự động lưu nháp lúc 21:15</p>
                <div className="flex items-center gap-3">
                  <button className="px-6 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-[14px] hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 shadow-sm">
                    <span className="text-base">📄</span> Lưu nháp
                  </button>
                  <button
                    onClick={handleSubmitEval}
                    disabled={!confirmed}
                    className={`px-8 py-2.5 rounded-xl font-bold text-white text-[14px] flex items-center gap-2 transition-all shadow-sm ${confirmed ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-slate-300 cursor-not-allowed'}`}
                  >
                    <Send className="w-4 h-4" /> Gửi đánh giá
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showToast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-black/10 transition-all">
          <div className="bg-emerald-600 text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <span className="font-black text-2xl tracking-wide">Gửi Đánh Giá Thành Công!</span>
          </div>
        </div>
      )}

      {selectedIssue && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[560px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white relative">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-lg shadow-sm ${selectedIssue.bg || 'bg-amber-500'}`}>{selectedIssue.init}</div>
                <div>
                  <h3 className="font-black text-slate-800 text-[18px] leading-tight">{selectedIssue.n}</h3>
                  <p className="text-[13px] text-slate-500 font-medium">{selectedIssue.c} câu trả lời chi tiết hôm nay</p>
                </div>
              </div>
              <button onClick={() => setSelectedIssue(null)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto bg-slate-50">
              {selectedIssue.details.map((d: any, idx: number) => (
                <div key={idx} className="relative z-10">
                  <h4 className="flex items-center gap-2 text-[14px] font-bold text-[#3B82F6] mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span> {d.q}
                  </h4>
                  <div className="text-[14px] font-medium text-slate-700 leading-relaxed bg-white p-4 rounded-2xl border border-slate-200 shadow-sm ml-3">
                    {d.a.split('\\n').map((line: string, i: number) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < d.a.split('\\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-white">
              <button
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#10B981] shadow-sm hover:bg-[#059669] transition"
                onClick={() => setSelectedIssue(null)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleOption({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) {
  return (
    <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner h-[38px]">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 text-[12px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${!value ? 'bg-slate-200/80 text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <X className="w-3.5 h-3.5 stroke-[3px]" /> Không
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-5 text-[12px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${value ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <Check className="w-3.5 h-3.5 stroke-[3px] text-emerald-500" /> Có
      </button>
    </div>
  );
}
