'use client';
import React, { useState } from 'react';
import {
  Trophy, XCircle, Lightbulb, Copy, ListTodo, Plus, Trash2,
  Play, Presentation, User, FileText, Calendar, Heart, CheckSquare,
  Maximize2, ChevronLeft, ChevronRight, X, Sparkles, BookOpen,
  Wrench, Target, TrendingUp, CheckCircle, Award, Video,
  Eye, ClipboardList, Instagram, Youtube
} from 'lucide-react';
import { TeamData } from '../types';

interface PresentationTabProps {
  teamsData: Record<string, TeamData>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  presentationMenu: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin';

  setPresentationMenu: (menu: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin') => void;

  activeSlideIndex: number;
  setActiveSlideIndex: (index: number | ((prev: number) => number)) => void;
  isFullscreenSlide: boolean;
  setIsFullscreenSlide: (val: boolean) => void;
  isPlayingVideo: boolean;
  setIsPlayingVideo: (val: boolean) => void;
  updateSlideField: (category: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin', index: number, field: string, value: string) => void;

  addSlide: (category: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin') => void;

  deleteSlide: (category: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin', index: number) => void;

}

export default function PresentationTab({
  teamsData, activeTab, onTabChange,
  presentationMenu, setPresentationMenu,
  activeSlideIndex, setActiveSlideIndex,
  isFullscreenSlide, setIsFullscreenSlide,
  isPlayingVideo, setIsPlayingVideo,
  updateSlideField, addSlide, deleteSlide
}: PresentationTabProps) {
  const baseData = teamsData[activeTab];

  let slidesList: any[] = [];
  if (presentationMenu === 'win') slidesList = baseData.videos || [];
  else if (presentationMenu === 'fail') slidesList = baseData.failVideos || [];
  else if (presentationMenu === 'case') slidesList = baseData.caseStudies || [];
  else if (presentationMenu === 'clone') slidesList = (baseData as any).cloneVideos || [];
  else if (presentationMenu === 'action') slidesList = (baseData as any).actions || [];
  else if (presentationMenu === 'editorPerf' || presentationMenu === 'newWin') {

    slidesList = baseData.editorPerformance || [];

  }


  const validSlideIndex = Math.max(0, Math.min(activeSlideIndex, slidesList.length - 1));
  const selectedSlide = slidesList.length > 0 ? slidesList[validSlideIndex] : null;

  const handlePlayerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.no-player-click')) return;

    if (selectedSlide?.videoUrl && selectedSlide.videoUrl.trim() !== '') {
      setIsPlayingVideo(true);
    } else {
      alert('Vui lòng điền link video ở cột LINK trong tab Báo cáo trước khi phát!');
    }
  };

  const getSlideUnsplashImage = (slide: any) => {
    if (!slide) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
    if (slide.thumbnail && slide.thumbnail.trim()) return slide.thumbnail;
    const text = ((slide.content || '') + ' ' + (slide.title || '')).toLowerCase();
    if (text.includes('laptop') || text.includes('keycap') || text.includes('bàn phím') || text.includes('tai nghe') || text.includes('công nghệ') || text.includes('cáp sạc')) {
      return 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80';
    }
    if (text.includes('quần áo') || text.includes('phối đồ') || text.includes('thời trang') || text.includes('sáp vuốt tóc') || text.includes('vải')) {
      return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80';
    }
    if (text.includes('vệ sinh giày') || text.includes('sneaker') || text.includes('giày')) {
      return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80';
    }
    if (text.includes('ốp lưng') || text.includes('điện thoại') || text.includes('sạc dự phòng') || text.includes('ví da') || text.includes('giá đỡ')) {
      return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';
    }
    if (text.includes('nến thơm') || text.includes('decor') || text.includes('bình giữ nhiệt') || text.includes('lót chuột') || text.includes('đèn ngủ') || text.includes('kệ sách') || text.includes('gối massage')) {
      return 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
  };

  const renderPlatformBadge = (platform: string) => {
    const p = (platform || 'TikTok').toLowerCase();
    if (p.includes('reels') || p.includes('instagram')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-pink-500/10 border border-pink-500/30 text-pink-400">
          Instagram Reels
        </span>
      );
    }
    if (p.includes('shorts') || p.includes('youtube')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400">
          YouTube Shorts
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
        TikTok
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-1 lg:min-h-0">

      {/* Team Statistics Overview Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#131d31] border border-white/[0.06] p-4 rounded-2xl shadow-lg shrink-0">
        <div className="flex items-center gap-3 bg-[#0c1322] border border-white/[0.04] px-4 py-3 rounded-xl shadow-inner">
          <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-md shadow-blue-500/50" />
          <span className="text-lg font-black uppercase text-slate-200 tracking-wider">
            {baseData.teamName || `Team ${activeTab}`}
          </span>
        </div>
        <div className="bg-[#0c1322] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between shadow">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Tổng Content Win</span>
            <span className="text-2xl font-black text-white mt-1">
              {baseData.win5Stats.win}/{baseData.win5Stats.total}
            </span>
          </div>
          <Trophy className="w-6 h-6 text-amber-400 shrink-0 ml-2" />
        </div>
        <div className="bg-[#0c1322] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between shadow">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Content mới win</span>
            <span className="text-2xl font-black text-white mt-1">
              {baseData.newVideoStats.win}/{baseData.newVideoStats.total}
            </span>
          </div>
          <Sparkles className="w-6 h-6 text-emerald-400 shrink-0 ml-2" />
        </div>
        <div className="bg-[#0c1322] border border-emerald-500/20 bg-emerald-500/[0.02] rounded-xl p-3 flex items-center justify-between shadow">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wide">Tỷ lệ win content mới</span>
            <span className="text-2xl font-black text-emerald-400 mt-1">
              {(baseData.newVideoStats.percent || '').replace('.', ',')}
            </span>
          </div>
          <span className="w-6 h-6 text-emerald-400 shrink-0 ml-2">📈</span>
        </div>
      </div>

      {/* Top Team & Presentation Tab Navigation Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-[#131d31] border border-white/[0.06] p-4 rounded-2xl shadow-lg">
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          {[
            { id: 'win', label: 'Content Win Mới', count: (baseData.videos || []).length, icon: Trophy, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { id: 'fail', label: 'Content Fail', count: (baseData.failVideos || []).length, icon: XCircle, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
            { id: 'case', label: 'Case Study', count: (baseData.caseStudies || []).length, icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { id: 'editorPerf', label: 'Số video content win của cá nhân trong team', count: (baseData.editorPerformance || []).length, icon: Award, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },

            { id: 'newWin', label: 'Content mới win của cá nhân trong team/số video đã làm', count: (baseData.editorPerformance || []).length, icon: CheckCircle, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }

          ].map((menuItem) => {
            const isActive = presentationMenu === menuItem.id;
            const Icon = menuItem.icon;
            return (
              <button
                key={menuItem.id}
                onClick={() => {
                  setPresentationMenu(menuItem.id as any);
                  setActiveSlideIndex(0);
                  setIsPlayingVideo(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-extrabold transition-all duration-200 ${isActive
                  ? 'bg-[#1e293b] text-white border-blue-500 shadow-lg shadow-blue-950/50 scale-100'
                  : 'bg-white/[0.02] text-slate-400 border-white/[0.04] hover:bg-white/[0.05] hover:text-slate-200'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : menuItem.color.split(' ')[0]}`} />
                <span>{menuItem.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-white/[0.05] text-slate-500'}`}>
                  {menuItem.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex bg-[#0c1322] border border-white/[0.06] p-1 rounded-xl shadow-inner w-full xl:w-auto xl:max-w-xs self-stretch xl:self-auto justify-between xl:justify-start gap-1">
          {Object.keys(teamsData).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                onTabChange(tab);
                setActiveSlideIndex(0);
                setIsPlayingVideo(false);
              }}
              className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === tab
                ? 'bg-[#bfdbfe] text-[#1e3a8a] shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Interactive Presentation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:flex-1 lg:min-h-0">
        {/* Column 1: Left Slides List Sidebar */}
        <div className="lg:col-span-3 bg-[#131d31]/80 border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between shadow-xl lg:h-[calc(100vh-310px)] lg:min-h-[450px] h-[680px]">
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-blue-400" /> Danh sách Slide
              </span>
              <span className="text-[10px] font-black text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-full">
                {slidesList.length} slide
              </span>
            </div>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {slidesList.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-medium">
                  Chưa có slide nào
                </div>
              ) : (
                slidesList.map((slide: any, index: number) => {
                  const isCurrent = validSlideIndex === index;
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        setActiveSlideIndex(index);
                        setIsPlayingVideo(false);
                      }}
                      className={`flex gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-200 group select-none relative overflow-hidden flex-shrink-0 ${isCurrent
                        ? 'bg-gradient-to-r from-blue-950/50 to-[#1e293b]/50 border-blue-500 shadow-md shadow-blue-950/20'
                        : 'bg-white/[0.01] hover:bg-white/[0.03] border-white/[0.04]'
                        }`}
                    >
                      <div className={`text-[10px] font-black px-1.5 py-0.5 rounded h-5 flex items-center justify-center ${isCurrent ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.05] text-slate-500'
                        }`}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <span className={`text-[11px] font-extrabold truncate ${isCurrent ? 'text-white font-black' : 'text-slate-300 group-hover:text-white'}`}>

                          {presentationMenu === 'action'

                            ? slide.title

                            : (presentationMenu === 'editorPerf' || presentationMenu === 'newWin')

                              ? `Hiệu suất: ${slide.editor}`

                              : slide.content

                          }

                        </span>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span className="truncate max-w-[100px] flex items-center gap-1 font-semibold">
                            <User className="w-2.5 h-2.5 text-slate-600" />
                            {presentationMenu === 'action'

                              ? slide.assignee

                              : (presentationMenu === 'editorPerf' || presentationMenu === 'newWin')

                                ? 'Editor'

                                : (slide.editor || 'Ẩn danh')

                            }

                          </span>
                          <span className="font-extrabold text-blue-400/80">
                            {presentationMenu === 'action'

                              ? slide.deadline

                              : (presentationMenu === 'editorPerf' || presentationMenu === 'newWin')

                                ? `Rate: ${slide.totalVideos > 0 ? ((slide.winVideos / slide.totalVideos) * 100).toFixed(1) : '0'}%`

                                : slide.views

                            }

                          </span>
                        </div>
                      </div>
                      {isCurrent && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => addSlide(presentationMenu)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-white/[0.03] hover:bg-blue-600 hover:text-white border border-white/[0.06] hover:border-blue-500 text-slate-300 rounded-xl text-xs font-black transition-all duration-200 shadow-md group shrink-0"
          >
            <Plus className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
            Thêm slide mới
          </button>
        </div>

        {/* Column 2: Center Main Slide Stage */}
        <div className="lg:col-span-6 flex flex-col gap-4 lg:h-[calc(100vh-310px)] lg:min-h-[450px] h-[680px]">
          <div className="bg-[#131d31] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between shadow-lg shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                Slide {slidesList.length > 0 ? validSlideIndex + 1 : 0} / {slidesList.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreenSlide(true)}
                disabled={!selectedSlide}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600/90 text-white rounded-lg text-xs font-black transition-all duration-150 shadow"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Trình chiếu Fullscreen
              </button>
              <button
                onClick={() => deleteSlide(presentationMenu, validSlideIndex)}
                disabled={!selectedSlide}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-500/20 disabled:opacity-40 text-red-400 hover:text-white border border-red-500/20 rounded-lg text-xs font-black transition-all duration-150"
                title="Xóa slide hiện tại"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {selectedSlide ? (
            <div className="flex-1 bg-[#131d31]/50 border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-6 shadow-xl relative overflow-hidden overflow-y-auto custom-scrollbar">
              <div className="absolute inset-0 bg-radial-gradient from-blue-900/[0.03] to-transparent pointer-events-none" />

              {(presentationMenu === 'editorPerf' || presentationMenu === 'newWin') ? (

                <div className="flex flex-col md:flex-row gap-8 items-center md:items-stretch py-4 w-full">

                  {/* Left: Beautiful circular progress ring (SVG) */}

                  <div className="w-full md:w-56 bg-[#090e18] border border-white/[0.08] rounded-2xl flex flex-col items-center justify-center p-6 shrink-0 shadow-inner min-h-[220px]">

                    {(() => {

                      const total = selectedSlide.totalVideos || 0;

                      const win = selectedSlide.winVideos || 0;

                      const rate = total > 0 ? (win / total) * 100 : 0;



                      const radius = 60;

                      const circumference = 2 * Math.PI * radius;

                      const strokeDashoffset = circumference - (rate / 100) * circumference;



                      let progressColor = 'stroke-rose-500';

                      let bgColor = 'bg-rose-500/10 text-rose-400';

                      let statusText = 'Cần cải thiện';

                      if (rate >= 40) {

                        progressColor = 'stroke-emerald-500';

                        bgColor = 'bg-emerald-500/10 text-emerald-400';

                        statusText = 'Xuất sắc';

                      } else if (rate >= 20) {

                        progressColor = 'stroke-blue-500';

                        bgColor = 'bg-blue-500/10 text-blue-400';

                        statusText = 'Tốt / Đạt chỉ tiêu';

                      }



                      return (

                        <>

                          <div className="relative w-32 h-32 flex items-center justify-center">

                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">

                              <circle cx="70" cy="70" r={radius} className="stroke-white/[0.04]" strokeWidth="10" fill="transparent" />

                              <circle cx="70" cy="70" r={radius} className={`transition-all duration-500 ease-out ${progressColor}`} strokeWidth="10" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />

                            </svg>

                            <div className="absolute flex flex-col items-center justify-center">

                              <span className="text-xl font-black text-white">{rate.toFixed(1).replace('.', ',')}%</span>

                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Win Rate</span>

                            </div>

                          </div>

                          <span className={`mt-4 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${bgColor} border border-white/5 shadow-sm`}>

                            {statusText}

                          </span>

                        </>

                      );

                    })()}

                  </div>

                  {/* Right: Info Fields & Editing for Editor */}

                  <div className="flex-1 flex flex-col gap-5 justify-center">

                    <div className="flex flex-col">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">

                        <User className="w-3.5 h-3.5 text-blue-400" /> Tên Editor

                      </label>
                      <input
                        type="text"
                        value={selectedSlide.editor || ''}

                        onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'editor', e.target.value)}

                        className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-xl p-3 text-xs text-white placeholder-slate-500 font-bold transition-all"

                        placeholder="Nhập tên Editor..."

                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                      <div className="flex flex-col">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">

                          <Video className="w-3 h-3 text-blue-400" /> Tổng video đã làm

                        </label>

                        <input

                          type="number"

                          min="0"

                          value={selectedSlide.totalVideos ?? 0}

                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'totalVideos', e.target.value)}

                          className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-3 py-2 text-xs text-white font-bold transition-all"

                        />

                      </div>
                      <div className="flex flex-col">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">

                          <Trophy className="w-3 h-3 text-emerald-400" /> Video đạt content win

                        </label>

                        <input

                          type="number"

                          min="0"

                          value={selectedSlide.winVideos ?? 0}

                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'winVideos', e.target.value)}

                          className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-3 py-2 text-xs text-white font-bold transition-all"

                        />

                      </div>
                    </div>



                    <div className="grid grid-cols-2 gap-4 border-t border-white/[0.04] pt-4">

                      <div className="flex flex-col bg-[#0c1322]/50 border border-white/[0.03] rounded-lg p-2.5">

                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Video Thất bại (Fail)</span>

                        <span className="text-sm font-black text-rose-400 mt-1">

                          {Math.max(0, (selectedSlide.totalVideos || 0) - (selectedSlide.winVideos || 0))}

                        </span>

                      </div>
                      <div className="flex flex-col bg-[#0c1322]/50 border border-white/[0.03] rounded-lg p-2.5">

                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hiệu suất chung</span>

                        <span className="text-sm font-black text-emerald-400 mt-1">

                          {selectedSlide.totalVideos > 0

                            ? `${((selectedSlide.winVideos / selectedSlide.totalVideos) * 100).toFixed(1).replace('.', ',')}%`

                            : '0,0%'

                          }

                        </span>

                      </div>

                    </div>

                  </div>

                </div>

              ) : (

                <div className="flex flex-col md:flex-row gap-6 items-stretch">

                  {/* Left: Video Mockup Player */}

                  <div

                    onClick={handlePlayerClick}

                    className="w-full md:w-44 bg-[#090e18] border border-white/[0.08] rounded-xl flex flex-col justify-between overflow-hidden relative group shrink-0 min-h-[140px] md:h-36 cursor-pointer hover:border-blue-500/50 transition-all duration-300 select-none"

                  >

                    {isPlayingVideo && selectedSlide.videoUrl ? (

                      <div className="absolute inset-0 z-10 bg-[#090e18] flex flex-col justify-between no-player-click">

                        <video

                          src={selectedSlide.videoUrl}

                          controls

                          autoPlay

                          className="w-full h-full object-cover"

                        />

                        <button

                          onClick={(e) => { e.stopPropagation(); setIsPlayingVideo(false); }}

                          className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 border border-white/10 rounded-full text-white hover:text-red-400 z-20 transition-all duration-150"

                          title="Đóng video"

                        >

                          <X className="w-3.5 h-3.5" />

                        </button>

                      </div>
                    ) : (

                      <img

                        src={getSlideUnsplashImage(selectedSlide)}

                        alt="Mock preview"

                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"

                      />

                    )}
                  </div>



                  {/* Right: Info Fields & Editing */}

                  <div className="flex-1 flex flex-col gap-4">

                    <div className="flex flex-col">

                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">

                        <FileText className="w-3.5 h-3.5 text-blue-400" />

                        {presentationMenu === 'action' ? 'Nội dung công việc' : (presentationMenu === 'case' ? 'Tiêu đề Case Study' : 'Nội dung video / Kịch bản')}

                      </label>

                      {presentationMenu === 'action' || presentationMenu === 'case' ? (

                        <input

                          type="text"

                          value={presentationMenu === 'action' ? (selectedSlide.title || '') : (selectedSlide.title || '')}

                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'title', e.target.value)}

                          className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-xl p-3 text-xs text-white placeholder-slate-500 font-medium transition-all"

                          placeholder={presentationMenu === 'action' ? 'Nhập tiêu đề hành động...' : 'Nhập tiêu đề case study...'}

                        />

                      ) : (

                        <textarea

                          rows={2}

                          value={selectedSlide.content || ''}

                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'content', e.target.value)}

                          className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-xl p-3 text-xs text-white placeholder-slate-500 font-medium leading-relaxed resize-none transition-all"

                          placeholder="Nhập nội dung/kịch bản video..."

                        />

                      )}

                    </div>


                    <div className="grid grid-cols-2 gap-4">

                      <div className="flex flex-col">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1">

                          <User className="w-3.5 h-3 text-blue-400" />

                          {presentationMenu === 'action' ? 'Người thực hiện' : 'Editor'}

                        </label>

                        <input

                          type="text"

                          value={presentationMenu === 'action' ? (selectedSlide.assignee || '') : (selectedSlide.editor || '')}

                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, presentationMenu === 'action' ? 'assignee' : 'editor', e.target.value)}

                          readOnly={presentationMenu !== 'action'}

                          className={`bg-[#0c1322] border border-white/[0.06] outline-none rounded-lg px-2.5 py-2 text-xs text-white transition-all font-semibold ${presentationMenu !== 'action' ? 'opacity-80 cursor-default text-slate-300' : 'focus:border-blue-500'

                            }`}

                        />

                      </div>
                      <div className="flex flex-col">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1">

                          <Calendar className="w-3.5 h-3 text-blue-400" />

                          {presentationMenu === 'action' ? 'Thời hạn' : 'Lượt xem (Views)'}

                        </label>

                        <input

                          type="text"

                          value={presentationMenu === 'action' ? (selectedSlide.deadline || '') : (selectedSlide.views || '').replace(/\s*views/i, '').trim()}

                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, presentationMenu === 'action' ? 'deadline' : 'views', e.target.value)}

                          readOnly={presentationMenu !== 'action'}

                          className={`bg-[#0c1322] border border-white/[0.06] outline-none rounded-lg px-2.5 py-2 text-xs text-white transition-all font-semibold ${presentationMenu !== 'action' ? 'opacity-80 cursor-default text-slate-300' : 'focus:border-blue-500'

                            }`}

                        />

                      </div>
                    </div>



                    <div className="grid grid-cols-2 gap-4">

                      {presentationMenu === 'action' ? (

                        <div className="flex flex-col">

                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Độ ưu tiên</label>

                          <select

                            value={selectedSlide.priority || 'Trung bình'}

                            onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'priority', e.target.value)}

                            className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-2 py-2 text-xs text-white font-semibold transition-all"

                          >

                            <option value="Cao">Cao</option>

                            <option value="Trung bình">Trung bình</option>

                            <option value="Thấp">Thấp</option>

                          </select>

                        </div>

                      ) : presentationMenu === 'case' ? (

                        <div className="flex flex-col">

                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Kênh Case study</label>

                          <input type="text" value={selectedSlide.channel || ''} readOnly className="bg-[#0c1322] border border-white/[0.06] outline-none rounded-lg px-2.5 py-2 text-xs text-slate-300 transition-all font-semibold opacity-80 cursor-default" />

                        </div>

                      ) : presentationMenu === 'clone' ? (

                        <div className="flex flex-col">

                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Kênh đối thủ cần Clone</label>

                          <input type="text" value={selectedSlide.targetChannel || ''} readOnly className="bg-[#0c1322] border border-white/[0.06] outline-none rounded-lg px-2.5 py-2 text-xs text-slate-300 transition-all font-semibold opacity-80 cursor-default" />

                        </div>

                      ) : (

                        <div className="flex flex-col">

                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Nền tảng</label>

                          <input type="text" value={selectedSlide.platform || 'TikTok'} readOnly className="bg-[#0c1322] border border-white/[0.06] outline-none rounded-lg px-2.5 py-2 text-xs text-slate-300 transition-all font-semibold opacity-80 cursor-default" />

                        </div>

                      )}



                      {presentationMenu === 'action' ? (

                        <div className="flex flex-col">

                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Trạng thái</label>

                          <select

                            value={selectedSlide.status || 'Chưa bắt đầu'}

                            onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'status', e.target.value)}

                            className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-2 py-2 text-xs text-white font-semibold transition-all"

                          >

                            <option value="Chưa bắt đầu">Chưa bắt đầu</option>

                            <option value="Đang tiến hành">Đang tiến hành</option>

                            <option value="Hoàn thành">Hoàn thành</option>

                          </select>

                        </div>

                      ) : (

                        <div className="flex flex-col">

                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Ngày đăng</label>

                          <input type="text" value={selectedSlide.postDate || ''} readOnly className="bg-[#0c1322] border border-white/[0.06] outline-none rounded-lg px-2.5 py-2 text-xs text-slate-300 transition-all font-semibold opacity-80 cursor-default" />

                        </div>

                      )}

                    </div>

                  </div>
                </div>
              )}


              {/* Vote & Approve buttons */}
              {presentationMenu !== 'action' && presentationMenu !== 'editorPerf' && presentationMenu !== 'newWin' && (

                <div className="flex gap-4 border-t border-white/[0.06] pt-4 items-center">
                  <button
                    onClick={() => {
                      const isVoted = selectedSlide.isVoted === 'true';
                      updateSlideField(presentationMenu, validSlideIndex, 'isVoted', (!isVoted).toString());
                    }}
                    className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border text-xs font-black transition-all duration-200 ${selectedSlide.isVoted === 'true'
                      ? 'bg-rose-600/90 hover:bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-950/20 scale-[1.01]'
                      : 'bg-white/[0.02] text-slate-400 border-white/[0.04] hover:bg-white/[0.05] hover:text-slate-200'
                      }`}
                  >
                    <Heart className={`w-4 h-4 transition-transform ${selectedSlide.isVoted === 'true' ? 'fill-current scale-110 text-white' : 'text-slate-500'}`} />
                    <span>{selectedSlide.isVoted === 'true' ? 'Đã Vote' : 'Vote'}</span>
                  </button>
                  <button
                    onClick={() => {
                      const isApproved = selectedSlide.isApproved === 'true';
                      updateSlideField(presentationMenu, validSlideIndex, 'isApproved', (!isApproved).toString());
                    }}
                    className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border text-xs font-black transition-all duration-200 ${selectedSlide.isApproved === 'true'
                      ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-950/20 scale-[1.01]'
                      : 'bg-white/[0.02] text-slate-400 border-white/[0.04] hover:bg-white/[0.05] hover:text-slate-200'
                      }`}
                  >
                    <CheckSquare className={`w-4 h-4 transition-transform ${selectedSlide.isApproved === 'true' ? 'scale-110 text-white' : 'text-slate-500'}`} />
                    <span>{selectedSlide.isApproved === 'true' ? 'Đã Duyệt' : 'Duyệt'}</span>
                  </button>
                </div>
              )}

              {/* Notes Field */}
              <div className="border-t border-white/[0.06] pt-4 flex flex-col">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" /> Ghi chú định hướng nội bộ
                </label>
                <textarea
                  rows={2}
                  value={selectedSlide.notes || ''}
                  onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'notes', e.target.value)}
                  className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-xl p-3 text-xs text-white placeholder-slate-500 font-medium leading-relaxed resize-none transition-all"
                  placeholder="Nhập ghi chú định hướng chiến dịch..."
                />
              </div>
            </div>
          ) : (
            <div className="bg-[#131d31]/30 border border-white/[0.06] rounded-2xl p-10 flex flex-col items-center justify-center h-[400px] text-center shadow-xl flex-1">
              <Presentation className="w-12 h-12 text-slate-600 mb-4 animate-bounce" />
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Không có slide</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                Hãy chọn danh mục khác hoặc click vào nút &quot;Thêm slide mới&quot; ở cột bên trái để tạo slide thuyết trình!
              </p>
            </div>
          )}
        </div>

        {/* Column 3: Right Analysis Cards Panel */}
        <div className="lg:col-span-3 flex flex-col gap-4 lg:h-[calc(100vh-310px)] lg:min-h-[450px] h-[680px]">
          <div className="bg-[#131d31] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between shadow shadow-blue-950/20 shrink-0">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Phân tích & Đánh giá
            </span>
          </div>

          {selectedSlide ? (
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 custom-scrollbar">
              {/* Analysis Card 1 */}
              {(() => {
                const isPerf = presentationMenu === 'editorPerf' || presentationMenu === 'newWin';

                const title = isPerf ? 'Phân tích hiệu suất' : 'Đánh giá phân tích';

                let field = 'analysis';
                let borderClass = 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/[0.02]';
                let iconColor = 'text-emerald-400';
                let icon = Trophy;

                if (isPerf) {

                  field = 'analysis';

                  borderClass = presentationMenu === 'newWin'

                    ? 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/[0.02]'

                    : 'border-blue-500/20 hover:border-blue-500/40 bg-blue-500/[0.02]';

                  iconColor = presentationMenu === 'newWin' ? 'text-emerald-400' : 'text-blue-400';

                  icon = Award;

                } else if (presentationMenu === 'fail') { field = 'failReason'; borderClass = 'border-rose-500/20 hover:border-rose-500/40 bg-rose-500/[0.02]'; iconColor = 'text-rose-400'; icon = XCircle; }

                else if (presentationMenu === 'case') { field = 'takeaway'; borderClass = 'border-amber-500/20 hover:border-amber-500/40 bg-amber-500/[0.02]'; iconColor = 'text-amber-400'; icon = BookOpen; }
                else if (presentationMenu === 'clone') { field = 'analysis'; borderClass = 'border-indigo-500/20 hover:border-indigo-500/40 bg-indigo-500/[0.02]'; iconColor = 'text-indigo-400'; icon = Copy; }
                else if (presentationMenu === 'action') { field = 'description'; borderClass = 'border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-500/[0.02]'; iconColor = 'text-cyan-400'; icon = ListTodo; }

                const CustomIcon = icon;
                const value = selectedSlide[field] || '';

                return (
                  <div className={`border rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 shadow-md ${borderClass}`}>
                    <div className="flex items-center gap-1.5">
                      <CustomIcon className={`w-4 h-4 ${iconColor}`} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{title}</span>
                    </div>
                    <textarea
                      rows={4}
                      value={value}
                      onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, field, e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs leading-relaxed text-slate-300 placeholder-slate-600 resize-none font-medium mt-1 w-full min-h-[120px] overflow-y-auto custom-scrollbar"
                      placeholder={isPerf ? "Nhập đánh giá điểm mạnh, điểm yếu của Editor..." : "Nhập nội dung đánh giá phân tích..."}

                    />
                  </div>
                );
              })()}

              {/* Analysis Card 2: Improvements */}
              {(() => {
                const isAction = presentationMenu === 'action';
                const isPerf = presentationMenu === 'editorPerf' || presentationMenu === 'newWin';

                const title = isPerf ? 'Ghi chú & Định hướng phát triển' : 'Điểm có thể cải thiện tốt hơn';

                const field = (isAction || isPerf) ? 'notes' : 'improvements';

                const borderClass = 'border-sky-500/20 hover:border-sky-500/40 bg-sky-500/[0.02]';
                const iconColor = 'text-sky-400';
                const Icon = (isAction || isPerf) ? BookOpen : Wrench;


                return (
                  <div className={`border rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 shadow-md ${borderClass}`}>
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{title}</span>
                    </div>
                    <textarea
                      rows={4}
                      value={selectedSlide[field] || ''}
                      onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, field, e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs leading-relaxed text-slate-300 placeholder-slate-600 resize-none font-medium mt-1 w-full min-h-[120px] overflow-y-auto custom-scrollbar"
                      placeholder={isAction ? "Ghi chú thêm..." : isPerf ? "Nhập định hướng cải thiện chỉ số cho Editor..." : "Nhập hướng cải tiến mới..."}

                    />
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-6 text-center text-slate-600 text-xs flex-1">
              Chưa có slide để hiển thị phân tích.
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreenSlide && selectedSlide && (() => {
        const isPerf = presentationMenu === 'editorPerf' || presentationMenu === 'newWin';
        
        // Dynamic titles & subtitles
        const titles: Record<string, string> = {
          win: 'CONTENT WIN MỚI',
          fail: 'CONTENT FAIL',
          case: 'CASE STUDY',
          clone: 'CLONE/COVER WIN',
          action: 'ACTION TUẦN TỚI',
          editorPerf: 'HIỆU SUẤT EDITOR',
          newWin: 'WIN RATE CÁ NHÂN',
        };

        const descs: Record<string, string> = {
          win: 'Chia sẻ những content thắng để cùng học hỏi & tối ưu',
          fail: 'Phân tích những content chưa đạt để rút kinh nghiệm và tránh lặp lại lỗi',
          case: 'Học hỏi từ các trường hợp thành công nổi bật bên ngoài',
          clone: 'Nghiên cứu các mẫu video của đối thủ để cải tiến và cover hiệu quả',
          action: 'Kế hoạch hành động chi tiết để cải thiện hiệu suất của team',
          editorPerf: 'Thống kê tổng số video win của cá nhân trong team',
          newWin: 'Hiệu suất video mới win của cá nhân trên tổng số video đã làm',
        };

        // Middle content extraction
        const displayTitle = selectedSlide.title || (() => {
          const text = selectedSlide.content || '';
          const parts = text.split(/[.\n]/);
          return parts[0] ? parts[0].trim() + '.' : '';
        })();

        const displayBody = selectedSlide.description || selectedSlide.takeaway || (() => {
          const text = selectedSlide.content || '';
          const firstDotIdx = text.indexOf('.');
          if (firstDotIdx === -1) return '';
          return text.substring(firstDotIdx + 1).trim();
        })();

        // Parse improvements into bullet points
        const improvementsField = (presentationMenu === 'action' || isPerf) ? selectedSlide.notes : selectedSlide.improvements;
        const improvementPoints = improvementsField 
          ? improvementsField.split('\n').map((p: string) => p.trim()).filter((p: string) => p.length > 0)
          : [];

        // Define icons and watermark components dynamically
        const categoryConfig = (() => {
          if (isPerf) {
            return {
              badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
              badgeIcon: Award,
              glowClass: 'shadow-[0_0_25px_rgba(59,130,246,0.2)] border-blue-500/30',
            };
          }
          if (presentationMenu === 'fail') {
            return {
              badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
              badgeIcon: XCircle,
              glowClass: 'shadow-[0_0_25px_rgba(244,63,94,0.2)] border-rose-500/30',
            };
          }
          if (presentationMenu === 'case') {
            return {
              badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
              badgeIcon: Lightbulb,
              glowClass: 'shadow-[0_0_25px_rgba(245,158,11,0.2)] border-amber-500/30',
            };
          }
          return {
            badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
            badgeIcon: Trophy,
            glowClass: 'shadow-[0_0_25px_rgba(59,130,246,0.3)] border-blue-500/50',
          };
        })();

        // Custom SVG icon for TikTok
        const TikTokLogo = () => (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.97 1.2 2.37 2.02 3.86 2.3v3.91c-1.24-.07-2.45-.54-3.48-1.24-1.04-.7-1.88-1.68-2.45-2.82v7.16c.07 1.41-.33 2.81-1.12 3.96-.8 1.14-1.97 1.96-3.3 2.32-1.33.36-2.75.24-4-.33-1.25-.57-2.28-1.57-2.92-2.81-.64-1.24-.82-2.67-.52-4.03.3-1.36 1.1-2.55 2.24-3.37 1.14-.82 2.53-1.2 3.91-1.07.03 1.34.02 2.68.02 4.02-1.15-.3-2.39.06-3.21.93-.82.88-1.07 2.19-.65 3.3.42 1.12 1.48 1.87 2.68 1.9 1.16-.01 2.2-.74 2.58-1.84.15-.55.19-1.13.19-1.7V.02h.02z" />
          </svg>
        );

        const renderPlatformLogo = (platformStr: string) => {
          const p = (platformStr || 'TikTok').toLowerCase();
          if (p.includes('reels') || p.includes('instagram')) return <Instagram className="w-3.5 h-3.5 text-pink-400" />;
          if (p.includes('shorts') || p.includes('youtube')) return <Youtube className="w-3.5 h-3.5 text-red-500" />;
          return <TikTokLogo />;
        };

        return (
          <div className="fixed inset-0 bg-[#030712] z-[1001] flex flex-col justify-between p-6 md:p-8 font-sans text-white animate-fade-in select-none overflow-hidden">
            {/* Background glowing spots */}
            <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none animate-pulse-slow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-600/10 blur-[160px] pointer-events-none animate-pulse-slow" />
            <div className="absolute top-[35%] right-[15%] w-[35%] h-[35%] rounded-full bg-purple-600/5 blur-[110px] pointer-events-none animate-pulse-slow" />

            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#090F1C] border border-blue-500/30 text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider shadow-inner">
                  <Trophy className="w-3.5 h-3.5 text-blue-400 fill-blue-400/10" />
                  TEAM {activeTab}
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-extrabold tracking-tight text-white uppercase leading-none">
                    {titles[presentationMenu] || 'PRESENTATION SLIDE'}
                  </h1>
                  <span className="text-[11px] text-slate-400 font-extrabold mt-1 tracking-wide uppercase">
                    {descs[presentationMenu] || 'Báo cáo thống kê hiệu suất của team'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {/* Stepper Progress Bar matching the image */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-black tracking-widest text-[#5B75A6] uppercase">
                    SLIDE {validSlideIndex + 1} / {slidesList.length}
                  </span>
                  <div className="relative flex items-center h-2 w-32 mt-0.5">
                    {/* Background track */}
                    <div className="absolute left-0 right-0 h-1 bg-[#1E293B] rounded-full" />
                    {/* Active track */}
                    <div 
                      className="absolute left-0 h-1 bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${(validSlideIndex / Math.max(1, slidesList.length - 1)) * 100}%` }}
                    />
                    {/* Dots */}
                    <div className="absolute left-0 right-0 flex justify-between w-full">
                      {slidesList.map((_, dotIdx) => {
                        const isActive = dotIdx <= validSlideIndex;
                        const isCurrent = dotIdx === validSlideIndex;
                        return (
                          <button
                            key={dotIdx}
                            onClick={() => setActiveSlideIndex(dotIdx)}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 relative z-10 ${
                              isCurrent 
                                ? 'bg-blue-500 scale-125 ring-4 ring-blue-500/25 shadow-[0_0_8px_rgba(59,130,246,0.6)]' 
                                : isActive 
                                  ? 'bg-blue-500' 
                                  : 'bg-[#1E293B]'
                            }`}
                            title={`Đến Slide ${dotIdx + 1}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { setIsFullscreenSlide(false); setIsPlayingVideo(false); }}
                  className="p-2 bg-white/[0.05] hover:bg-red-500/20 hover:text-red-400 border border-white/[0.08] rounded-full transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Layout content 3 hàng dọc chính */}
            <div className="flex-1 flex flex-col gap-6 my-6 z-10 overflow-y-auto custom-scrollbar justify-center">
              
              {/* Hàng 1: Video Player, Content Script & Right Stats */}
              <div className="grid grid-cols-12 gap-6 items-stretch">
                
                {/* Hàng 1 - Cột Trái: Video Player hoặc circular chart */}
                <div className="col-span-5 flex items-center justify-center">
                  {isPerf ? (
                    <div className="w-full bg-[#090F1C]/80 border border-white/[0.08] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
                      {(() => {
                        const total = selectedSlide.totalVideos || 0;
                        const win = selectedSlide.winVideos || 0;
                        const rate = total > 0 ? (win / total) * 100 : 0;
                        const radius = 64;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDashoffset = circumference - (rate / 100) * circumference;

                        let progressColor = 'stroke-rose-500';
                        let bgColor = 'bg-rose-500/10 text-rose-400';
                        let statusText = 'Cần cải thiện';
                        if (rate >= 40) {
                          progressColor = 'stroke-emerald-500';
                          bgColor = 'bg-emerald-500/10 text-emerald-400';
                          statusText = 'Xuất sắc';
                        } else if (rate >= 20) {
                          progressColor = 'stroke-blue-500';
                          bgColor = 'bg-blue-500/10 text-blue-400';
                          statusText = 'Tốt / Đạt chỉ tiêu';
                        }

                        return (
                          <>
                            <div className="relative w-36 h-36 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                                <circle cx="80" cy="80" r={radius} className="stroke-white/[0.04]" strokeWidth="12" fill="transparent" />
                                <circle cx="80" cy="80" r={radius} className={`transition-all duration-500 ease-out ${progressColor}`} strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
                              </svg>
                              <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-xl font-black text-white">{rate.toFixed(1).replace('.', ',')}%</span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Win Rate</span>
                              </div>
                            </div>
                            <h3 className="text-base font-black text-white mt-4">{selectedSlide.editor}</h3>
                            <span className={`mt-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${bgColor} border border-white/5`}>
                              {statusText}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  ) : presentationMenu !== 'action' ? (
                    <div
                      onClick={handlePlayerClick}
                      className={`w-full aspect-video rounded-2xl overflow-hidden relative border bg-[#0C1322] cursor-pointer transition-all duration-300 group ${categoryConfig.glowClass}`}
                    >
                      {isPlayingVideo && selectedSlide.videoUrl ? (
                        <div className="absolute inset-0 z-10 bg-[#0c1322] flex flex-col justify-between no-player-click" onClick={(e) => e.stopPropagation()}>
                          <video src={selectedSlide.videoUrl} controls autoPlay className="w-full h-full object-cover" />
                          <button
                            onClick={(e) => { e.stopPropagation(); setIsPlayingVideo(false); }}
                            className="absolute top-2.5 right-2.5 p-1.5 bg-black/75 hover:bg-black/90 border border-white/10 rounded-full text-white hover:text-red-400 z-20 transition-all"
                            title="Đóng video"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <img src={getSlideUnsplashImage(selectedSlide)} alt="mock" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          
                          {/* Play button overlay in the center of display */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-black/45 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-black/60 shadow-lg shadow-black/40">
                              <Play className="w-6 h-6 text-white fill-current translate-x-0.5" />
                            </div>
                          </div>

                          {/* Time duration overlay bottom-left */}
                          <div className="absolute bottom-3 left-3 bg-[#090E18]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-extrabold tracking-wider text-slate-200">
                            00:59
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="w-full bg-[#090F1C]/80 border border-white/[0.08] backdrop-blur-md rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full min-h-[160px]">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-cyan-400" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full">ACTION ITEM</span>
                      </div>
                      <h2 className="text-lg font-black text-white leading-snug tracking-tight">{selectedSlide.title}</h2>
                      <div className="flex gap-4 mt-4 text-[10px] text-slate-400 border-t border-white/[0.06] pt-3 font-bold">
                        <div className="flex flex-col gap-0.5">
                          <span>Người làm:</span>
                          <span className="text-white font-black">{selectedSlide.assignee}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 ml-auto">
                          <span>Thời hạn:</span>
                          <span className="text-white font-black">{selectedSlide.deadline}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hàng 1 - Cột Giữa: Script & Meta */}
                <div className="col-span-4 flex flex-col justify-between">
                  <div className="bg-[#090F1C]/40 border border-white/[0.05] backdrop-blur-md p-5 rounded-2xl flex flex-col gap-3 justify-center h-full relative overflow-hidden shadow-lg">
                    <div className="flex flex-col h-full justify-between gap-4">
                      <div>
                        {/* Title badge with icon */}
                        <div className="flex items-center gap-1.5 text-blue-400 font-extrabold tracking-wide text-[10px] uppercase mb-2">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          {presentationMenu === 'action'
                            ? 'MÔ TẢ CÔNG VIỆC'
                            : (presentationMenu === 'editorPerf' || presentationMenu === 'newWin')
                              ? 'TỔNG QUAN CHỈ SỐ'
                              : (presentationMenu === 'case' ? 'CASE STUDY / THÔNG TIN' : 'KỊCH BẢN / NỘI DUNG GỐC')
                          }
                        </div>

                        {/* Title & Body */}
                        {isPerf ? (
                          <div className="grid grid-cols-3 gap-3 py-2 text-center mt-2">
                            <div className="flex flex-col bg-[#090F1C] border border-white/[0.04] p-3 rounded-xl">
                              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Tổng video</span>
                              <span className="text-lg font-black text-white mt-1">{selectedSlide.totalVideos}</span>
                            </div>
                            <div className="flex flex-col bg-emerald-500/[0.02] border border-emerald-500/10 p-3 rounded-xl">
                              <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider">Số video Win</span>
                              <span className="text-lg font-black text-emerald-400 mt-1">{selectedSlide.winVideos}</span>
                            </div>
                            <div className="flex flex-col bg-rose-500/[0.02] border border-rose-500/10 p-3 rounded-xl">
                              <span className="text-[9px] font-extrabold text-rose-400 uppercase tracking-wider">Số Fail</span>
                              <span className="text-lg font-black text-rose-400 mt-1">
                                {Math.max(0, (selectedSlide.totalVideos || 0) - (selectedSlide.winVideos || 0))}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {displayTitle && (
                              <h2 className="text-lg font-extrabold text-white leading-snug tracking-tight">
                                {displayTitle}
                              </h2>
                            )}
                            {displayBody && (
                              <p className="text-[13px] font-medium leading-relaxed text-slate-300 whitespace-pre-wrap max-h-[140px] overflow-y-auto custom-scrollbar">
                                {displayBody}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Metadata Pill Grid under the text */}
                      {presentationMenu !== 'action' && presentationMenu !== 'editorPerf' && presentationMenu !== 'newWin' && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-slate-400 pt-3 border-t border-white/[0.06]">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span>EDITOR: <span className="text-white">{selectedSlide.editor || 'Ẩn danh'}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>LƯỢT XEM: <span className="text-white">{selectedSlide.views || '0'}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {renderPlatformLogo(selectedSlide.platform)}
                            <span>NỀN TẢNG: <span className="text-white">{selectedSlide.platform || 'TikTok'}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span>NGÀY ĐĂNG: <span className="text-white">{selectedSlide.postDate || 'N/A'}</span></span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hàng 1 - Cột Phải: Side details list card matching image */}
                <div className="col-span-3">
                  <div className="bg-[#090F1C]/80 border border-white/[0.06] p-4 rounded-2xl flex flex-col justify-between h-full shadow-xl">
                    <div className="flex flex-col gap-4">
                      
                      {/* Row 1: Views */}
                      <div className="flex items-center gap-3 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl hover:bg-white/[0.03] transition-all">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                          <Eye className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">LƯỢT XEM (VIEWS)</div>
                          <div className="text-base font-black text-white">
                            {isPerf ? selectedSlide.totalVideos + ' video' : selectedSlide.views || '0'}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Vote */}
                      <div className="flex items-center gap-3 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl hover:bg-white/[0.03] transition-all">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                          <Heart className={`w-5 h-5 ${selectedSlide.isVoted === 'true' ? 'fill-rose-500' : ''}`} />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">VOTE</div>
                          <div className="text-base font-black text-white">
                            {isPerf ? selectedSlide.winVideos + ' win' : (selectedSlide.isVoted === 'true' ? '24' : '23')}
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Approved */}
                      <div className="flex items-center gap-3 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl hover:bg-white/[0.03] transition-all">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">DUYỆT</div>
                          <div className="text-base font-black text-[#10B981]">
                            {isPerf ? 'Đã tính' : (selectedSlide.isApproved === 'true' ? 'Đã duyệt' : 'Chờ duyệt')}
                          </div>
                        </div>
                      </div>

                      {/* Row 4: Last update / Deadline */}
                      <div className="flex items-center gap-3 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl hover:bg-white/[0.03] transition-all">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">NGÀY ĐĂNG</div>
                          <div className="text-base font-black text-white">
                            {presentationMenu === 'action' ? selectedSlide.deadline : selectedSlide.postDate || '10/06/2026'}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>

              {/* Hàng 2: Đánh giá & Cải thiện (Grid 2 cột) */}
              <div className="grid grid-cols-2 gap-6">
                
                {/* Cột Trái: Đánh giá phân tích - viền xanh lá, quote mark, trophy watermark */}
                {(() => {
                  const title = isPerf ? 'PHÂN TÍCH HIỆU SUẤT' : 'ĐÁNH GIÁ PHÂN TÍCH';
                  const borderClass = 'border-emerald-500/30 bg-[#071612]/70 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.06)]';
                  const value = presentationMenu === 'fail' ? selectedSlide.failReason : (presentationMenu === 'case' ? selectedSlide.takeaway : (presentationMenu === 'action' ? selectedSlide.description : selectedSlide.analysis));
                  
                  return (
                    <div className={`border p-5 rounded-2xl flex flex-col gap-2 transition-all duration-300 relative overflow-hidden ${borderClass}`}>
                      {/* Floating watermark */}
                      <span className="absolute right-4 bottom-2 text-emerald-500/5 animate-float-trophy pointer-events-none">
                        <Trophy className="w-28 h-28" />
                      </span>
                      
                      {/* Quote Mark */}
                      <span className="absolute left-4 top-4 text-emerald-500/10 font-serif text-[100px] leading-none select-none pointer-events-none">
                        “
                      </span>

                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-400 z-10 pl-6">
                        <Trophy className="w-4 h-4 text-emerald-400" /> {title}
                      </span>
                      <p className="text-[13px] font-semibold leading-relaxed text-slate-200 z-10 pl-6 mt-1 whitespace-pre-wrap max-h-[110px] overflow-y-auto custom-scrollbar">
                        {value || 'Không có nội dung đánh giá.'}
                      </p>
                    </div>
                  );
                })()}

                {/* Cột Phải: Điểm có thể cải thiện tốt hơn - viền xanh dương, checkmark circles, arrow watermark */}
                <div className="bg-[#091122]/70 border border-blue-500/30 p-5 rounded-2xl flex flex-col gap-2 shadow-[0_0_20px_rgba(59,130,246,0.06)] relative overflow-hidden transition-all duration-300">
                  {/* Floating watermark */}
                  <span className="absolute right-4 bottom-2 text-blue-500/5 animate-float-trend pointer-events-none">
                    <TrendingUp className="w-28 h-28" />
                  </span>

                  <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5 z-10">
                    <TrendingUp className="w-4 h-4 text-blue-400" /> 
                    {isPerf ? 'GHI CHÚ & ĐỊNH HƯỚNG PHÁT TRIỂN' : 'ĐIỂM CÓ THỂ CẢI THIỆN TỐT HƠN'}
                  </span>

                  <div className="flex flex-col gap-2 relative z-10 max-h-[110px] overflow-y-auto custom-scrollbar mt-1">
                    {improvementPoints.length > 0 ? (
                      improvementPoints.map((pt: string, ptIdx: number) => (
                        <div key={ptIdx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_8px_rgba(59,130,246,0.15)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          </span>
                          <span className="text-[13px] font-semibold leading-relaxed text-slate-200">{pt}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_8px_rgba(59,130,246,0.15)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        </span>
                        <span className="text-[13px] font-semibold leading-relaxed text-slate-200">
                          {improvementsField || 'Tiếp tục duy trì chất lượng hiện tại.'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Hàng 3: Ghi chú định hướng nội bộ (100% width) - viền tím, document icon, clipboard watermark */}
              {presentationMenu !== 'action' && presentationMenu !== 'editorPerf' && presentationMenu !== 'newWin' && (
                <div className="bg-[#100D22]/60 border border-purple-500/20 p-5 rounded-2xl flex flex-col gap-2 shadow-[0_0_20px_rgba(168,85,247,0.06)] relative overflow-hidden transition-all duration-300">
                  {/* Floating watermark */}
                  <span className="absolute right-4 bottom-2 text-purple-500/5 animate-float-clipboard pointer-events-none">
                    <ClipboardList className="w-24 h-24" />
                  </span>

                  <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5 z-10">
                    <ClipboardList className="w-4 h-4 text-purple-400" /> GHI CHÚ ĐỊNH HƯỚNG NỘI BỘ
                  </span>
                  
                  <p className="text-[13px] font-semibold leading-relaxed text-slate-200 z-10 relative mt-1 whitespace-pre-wrap max-h-[70px] overflow-y-auto custom-scrollbar">
                    {selectedSlide.notes || 'Đã phân phối trên đa nền tảng, thu hút tệp đối tượng học sinh sinh viên tốt.'}
                  </p>
                </div>
              )}

            </div>

            {/* Footer Navigation Bar (Floating Dock Style) */}
            <div className="flex items-center justify-between border border-white/[0.06] bg-[#090F1C]/80 backdrop-blur-md rounded-2xl px-6 py-4 z-10 shadow-2xl relative">
              <button
                onClick={() => setActiveSlideIndex((prev: number) => Math.max(prev - 1, 0))}
                disabled={validSlideIndex === 0}
                className="flex items-center gap-2 px-6 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 disabled:hover:bg-white/[0.04] text-white border border-white/[0.08] rounded-2xl text-xs font-black transition-all shadow select-none"
              >
                <ChevronLeft className="w-4 h-4" /> SLIDE TRƯỚC
              </button>

              {/* Middle TIP Box */}
              <div className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.02] border border-white/[0.05] rounded-full text-slate-400 font-extrabold text-[11px] uppercase select-none">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>TIP: Nhấn phím <span className="text-white font-black">←</span> <span className="text-white font-black">→</span> để chuyển slide</span>
              </div>

              <button
                onClick={() => setActiveSlideIndex((prev: number) => Math.min(prev + 1, slidesList.length - 1))}
                disabled={validSlideIndex === slidesList.length - 1}
                className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:hover:bg-blue-600 text-white rounded-2xl text-xs font-black transition-all shadow shadow-blue-500/20 select-none"
              >
                SLIDE TIẾP THEO <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
