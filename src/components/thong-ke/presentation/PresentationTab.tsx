'use client';
import React, { useState } from 'react';
import {
  Trophy, XCircle, Lightbulb, Copy, ListTodo, Plus, Trash2,
  Play, Presentation, User, FileText, Calendar, Heart, CheckSquare,
  Maximize2, ChevronLeft, ChevronRight, X, Sparkles, BookOpen,
  Wrench, Target
} from 'lucide-react';
import { TeamData } from '../types';

interface PresentationTabProps {
  teamsData: Record<string, TeamData>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  presentationMenu: 'win' | 'fail' | 'case' | 'clone' | 'action';
  setPresentationMenu: (menu: 'win' | 'fail' | 'case' | 'clone' | 'action') => void;
  activeSlideIndex: number;
  setActiveSlideIndex: (index: number | ((prev: number) => number)) => void;
  isFullscreenSlide: boolean;
  setIsFullscreenSlide: (val: boolean) => void;
  isPlayingVideo: boolean;
  setIsPlayingVideo: (val: boolean) => void;
  updateSlideField: (category: 'win' | 'fail' | 'case' | 'clone' | 'action', index: number, field: string, value: string) => void;
  addSlide: (category: 'win' | 'fail' | 'case' | 'clone' | 'action') => void;
  deleteSlide: (category: 'win' | 'fail' | 'case' | 'clone' | 'action', index: number) => void;
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
            { id: 'clone', label: 'Clone/Cover Win', count: ((baseData as any).cloneVideos || []).length, icon: Copy, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' }
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
                        <span className={`text-[11px] font-extrabold truncate ${isCurrent ? 'text-white font-black' : 'text-slate-300 group-hover:text-white'
                          }`}>
                          {presentationMenu === 'action' ? slide.title : slide.content}
                        </span>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span className="truncate max-w-[100px] flex items-center gap-1 font-semibold">
                            <User className="w-2.5 h-2.5 text-slate-600" />
                            {presentationMenu === 'action' ? slide.assignee : (slide.editor || 'Ẩn danh')}
                          </span>
                          <span className="font-extrabold text-blue-400/80">
                            {presentationMenu === 'action' ? slide.deadline : slide.views}
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
                        <User className="w-3 h-3 text-blue-400" />
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
                        <Calendar className="w-3 h-3 text-blue-400" />
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

              {/* Vote & Approve buttons */}
              {presentationMenu !== 'action' && (
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
                const title = 'Đánh giá phân tích';
                let field = 'analysis';
                let borderClass = 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/[0.02]';
                let iconColor = 'text-emerald-400';
                let icon = Trophy;

                if (presentationMenu === 'fail') { field = 'failReason'; borderClass = 'border-rose-500/20 hover:border-rose-500/40 bg-rose-500/[0.02]'; iconColor = 'text-rose-400'; icon = XCircle; }
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
                      placeholder="Nhập nội dung đánh giá phân tích..."
                    />
                  </div>
                );
              })()}

              {/* Analysis Card 2: Improvements */}
              {(() => {
                const isAction = presentationMenu === 'action';
                const title = 'Điểm có thể cải thiện tốt hơn';
                const field = isAction ? 'notes' : 'improvements';
                const borderClass = 'border-sky-500/20 hover:border-sky-500/40 bg-sky-500/[0.02]';
                const iconColor = 'text-sky-400';
                const Icon = isAction ? BookOpen : Wrench;

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
                      placeholder={isAction ? "Ghi chú thêm..." : "Nhập hướng cải tiến mới..."}
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
      {isFullscreenSlide && selectedSlide && (
        <div className="fixed inset-0 bg-[#070b13] z-50 flex flex-col justify-between pt-24 pb-10 px-10 font-sans text-white animate-fade-in select-none">
          <div className="absolute inset-0 bg-radial-gradient from-blue-950/20 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between border-b border-white/[0.08] pb-6 z-10">
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-blue-600 rounded-lg text-xs font-black uppercase tracking-widest">
                {activeTab} PRESENTATION
              </span>
              <span className="text-sm font-extrabold uppercase text-slate-400 tracking-wider">
                {presentationMenu === 'win' ? 'Content Win Mới' : (presentationMenu === 'fail' ? 'Content Fail' : (presentationMenu === 'case' ? 'Case Study' : (presentationMenu === 'clone' ? 'Clone/Cover Win' : 'Action tuần tới')))}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm font-black text-slate-400">
                SLIDE {validSlideIndex + 1} / {slidesList.length}
              </span>
              <button
                onClick={() => { setIsFullscreenSlide(false); setIsPlayingVideo(false); }}
                className="p-2 bg-white/[0.06] hover:bg-red-500/20 hover:text-red-400 border border-white/[0.08] rounded-full transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 my-10 grid grid-cols-12 gap-10 items-center z-10">
            <div className="col-span-5 flex flex-col gap-6 justify-center">
              {presentationMenu !== 'action' ? (
                <div
                  onClick={handlePlayerClick}
                  className="w-full max-w-sm aspect-[4/3] bg-[#0c1322] border-2 border-white/[0.08] rounded-2xl overflow-hidden relative shadow-2xl mx-auto shadow-blue-950/50 cursor-pointer hover:border-blue-500/50 transition-all duration-300 select-none"
                >
                  {isPlayingVideo && selectedSlide.videoUrl ? (
                    <div className="absolute inset-0 z-10 bg-[#0c1322] flex flex-col justify-between no-player-click" onClick={(e) => e.stopPropagation()}>
                      <video src={selectedSlide.videoUrl} controls autoPlay className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsPlayingVideo(false); }}
                        className="absolute top-4 right-4 p-1.5 bg-black/70 hover:bg-black/90 border border-white/10 rounded-full text-white hover:text-red-400 z-20 transition-all"
                        title="Đóng video"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <img src={getSlideUnsplashImage(selectedSlide)} alt="mock" className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  )}
                </div>
              ) : (
                <div className="w-full max-w-md bg-[#131d31] border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-6 h-6 text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">ACTION ITEM</span>
                  </div>
                  <h2 className="text-2xl font-black text-white leading-snug tracking-tight">{selectedSlide.title}</h2>
                  <div className="flex gap-4 mt-6 text-xs text-slate-400 border-t border-white/[0.06] pt-6 font-bold">
                    <div className="flex flex-col gap-1">
                      <span>Người làm:</span>
                      <span className="text-white font-black">{selectedSlide.assignee}</span>
                    </div>
                    <div className="flex flex-col gap-1 ml-auto">
                      <span>Thời hạn:</span>
                      <span className="text-white font-black">{selectedSlide.deadline}</span>
                    </div>
                  </div>
                </div>
              )}

              {presentationMenu !== 'action' && (
                <div className="flex gap-6 mt-6 items-center w-full max-w-sm mx-auto">
                  <button
                    onClick={() => { const isVoted = selectedSlide.isVoted === 'true'; updateSlideField(presentationMenu, validSlideIndex, 'isVoted', (!isVoted).toString()); }}
                    className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-2xl border text-sm font-black transition-all duration-200 ${selectedSlide.isVoted === 'true'
                      ? 'bg-rose-600/95 hover:bg-rose-500 text-white border-rose-500 shadow-xl shadow-rose-950/20 scale-[1.01]'
                      : 'bg-[#131d31]/50 text-slate-400 border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-200'
                      }`}
                  >
                    <Heart className={`w-4.5 h-4.5 transition-transform ${selectedSlide.isVoted === 'true' ? 'fill-current scale-110 text-white' : 'text-slate-500'}`} />
                    <span>{selectedSlide.isVoted === 'true' ? 'Đã Vote' : 'Vote'}</span>
                  </button>
                  <button
                    onClick={() => { const isApproved = selectedSlide.isApproved === 'true'; updateSlideField(presentationMenu, validSlideIndex, 'isApproved', (!isApproved).toString()); }}
                    className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-2xl border text-sm font-black transition-all duration-200 ${selectedSlide.isApproved === 'true'
                      ? 'bg-emerald-600/95 hover:bg-emerald-500 text-white border-emerald-500 shadow-xl shadow-emerald-950/20 scale-[1.01]'
                      : 'bg-[#131d31]/50 text-slate-400 border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-200'
                      }`}
                  >
                    <CheckSquare className={`w-4.5 h-4.5 transition-transform ${selectedSlide.isApproved === 'true' ? 'scale-110 text-white' : 'text-slate-500'}`} />
                    <span>{selectedSlide.isApproved === 'true' ? 'Đã Duyệt' : 'Duyệt'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="col-span-7 flex flex-col gap-6 justify-center">
              <div className="bg-[#131d31]/40 border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
                  {presentationMenu === 'action' ? 'Mô tả công việc' : (presentationMenu === 'case' ? 'Mô tả Case study' : 'Kịch bản / Nội dung gốc')}
                </span>
                <p className="text-base font-medium leading-relaxed text-slate-200">
                  {presentationMenu === 'action' ? selectedSlide.description : (presentationMenu === 'case' ? selectedSlide.takeaway : selectedSlide.content)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {(() => {
                  const title = 'Đánh giá phân tích';
                  let borderClass = 'border-emerald-500/20 bg-[#0b1f1a]/80 text-emerald-400';
                  let icon = Trophy;
                  if (presentationMenu === 'fail') { borderClass = 'border-rose-500/20 bg-[#1c1010]/80 text-rose-400'; icon = XCircle; }
                  else if (presentationMenu === 'case') { borderClass = 'border-amber-500/20 bg-[#1c1810]/80 text-amber-400'; icon = BookOpen; }
                  else if (presentationMenu === 'clone') { borderClass = 'border-indigo-500/20 bg-[#0d0c1d]/80 text-indigo-400'; icon = Copy; }
                  else if (presentationMenu === 'action') { borderClass = 'border-cyan-500/20 bg-[#0b1b26]/80 text-cyan-400'; icon = ListTodo; }
                  const CustomIcon = icon;
                  const value = presentationMenu === 'fail' ? selectedSlide.failReason : (presentationMenu === 'case' ? selectedSlide.takeaway : (presentationMenu === 'action' ? selectedSlide.description : selectedSlide.analysis));
                  return (
                    <div className={`border p-5 rounded-2xl flex flex-col gap-2 shadow-lg ${borderClass.split(' ')[0]} ${borderClass.split(' ')[1]}`}>
                      <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${borderClass.split(' ')[2]}`}>
                        <CustomIcon className="w-4 h-4" /> {title}
                      </span>
                      <p className="text-xs font-semibold leading-relaxed text-slate-300 whitespace-pre-wrap">
                        {value || 'Không có nội dung đánh giá.'}
                      </p>
                    </div>
                  );
                })()}

                {(() => {
                  const isAction = presentationMenu === 'action';
                  const title = 'Điểm có thể cải thiện tốt hơn';
                  const value = isAction ? selectedSlide.notes : selectedSlide.improvements;
                  const Icon = isAction ? BookOpen : Wrench;
                  return (
                    <div className="bg-[#0b1b26]/80 border border-sky-500/20 p-5 rounded-2xl flex flex-col gap-2 shadow-lg">
                      <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-sky-400" /> {title}
                      </span>
                      <p className="text-xs font-semibold leading-relaxed text-slate-300 whitespace-pre-wrap">
                        {value || 'Tiếp tục duy trì chất lượng hiện tại.'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Bottom Navigator */}
          <div className="flex items-center justify-between border-t border-white/[0.08] pt-6 z-10">
            <button
              onClick={() => setActiveSlideIndex((prev: number) => Math.max(prev - 1, 0))}
              disabled={validSlideIndex === 0}
              className="flex items-center gap-1.5 px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-20 disabled:hover:bg-white/[0.06] text-white border border-white/[0.08] rounded-xl text-xs font-black transition shadow"
            >
              <ChevronLeft className="w-4 h-4" /> Slide trước
            </button>
            <div className="text-xs font-bold text-slate-400">
              Sử dụng các nút hoặc phím ← / → để chuyển slide
            </div>
            <button
              onClick={() => setActiveSlideIndex((prev: number) => Math.min(prev + 1, slidesList.length - 1))}
              disabled={validSlideIndex === slidesList.length - 1}
              className="flex items-center gap-1.5 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:hover:bg-blue-600 text-white rounded-xl text-xs font-black transition shadow"
            >
              Slide tiếp theo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
