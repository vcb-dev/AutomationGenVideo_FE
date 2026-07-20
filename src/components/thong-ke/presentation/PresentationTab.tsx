'use client';
import React, { useState } from 'react';
import {
  Trophy, XCircle, Lightbulb, Copy, ListTodo, Plus, Trash2,
  Play, Presentation, User, FileText, Calendar, Heart, CheckSquare,
  Maximize2, ChevronLeft, ChevronRight, X, Sparkles, BookOpen,
  Wrench, Target, TrendingUp, CheckCircle, Award, Video,
  Eye, ClipboardList, Instagram, Youtube, MessageSquare
} from 'lucide-react';
import { TeamData } from '../types';
import { formatPresentationViews } from '../utils';
import { useAuthStore } from '../../../store/auth-store';
import { apiClient } from '../../../lib/api-client';
import { useEffect } from 'react';


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
  showToast?: (message: string, type?: 'success' | 'error') => void;
  onRefreshData?: () => void;
}

export default function PresentationTab({
  teamsData, activeTab, onTabChange,
  presentationMenu, setPresentationMenu,
  activeSlideIndex, setActiveSlideIndex,
  isFullscreenSlide, setIsFullscreenSlide,
  isPlayingVideo, setIsPlayingVideo,
  updateSlideField, addSlide, deleteSlide,
  showToast, onRefreshData
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

  // Auth and API
  const user = useAuthStore((state) => state.user);

  // Scoring states
  const [scoreHook, setScoreHook] = useState<number>(5);
  const [scoreContent, setScoreContent] = useState<number>(5);
  const [scoreEditing, setScoreEditing] = useState<number>(5);
  const [scoreCta, setScoreCta] = useState<number>(5);
  const [scoreThumbnail, setScoreThumbnail] = useState<number>(5);
  const [scoreComment, setScoreComment] = useState<string>('');
  const [isSavingScore, setIsSavingScore] = useState<boolean>(false);
  const [scoreActiveTab, setScoreActiveTab] = useState<'score' | 'history'>('score');
  const [isScoreModalOpen, setIsScoreModalOpen] = useState<boolean>(false);

  // Load existing score when selectedSlide changes
  useEffect(() => {
    if (!selectedSlide || !user) return;
    const scores = (selectedSlide as any).scores || [];
    const myScore = scores.find((s: any) => s.scored_by_id === user.id);
    if (myScore) {
      setScoreHook(myScore.score_hook);
      setScoreContent(myScore.score_content);
      setScoreEditing(myScore.score_editing);
      setScoreCta(myScore.score_cta);
      setScoreThumbnail(myScore.score_thumbnail);
      setScoreComment(myScore.comment || '');
    } else {
      setScoreHook(5);
      setScoreContent(5);
      setScoreEditing(5);
      setScoreCta(5);
      setScoreThumbnail(5);
      setScoreComment('');
    }
  }, [selectedSlide, user]);

  // Auto-resize script textarea height to fit content
  useEffect(() => {
    const textarea = document.getElementById('script-textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [selectedSlide?.content, selectedSlide, presentationMenu]);

  const handleScoreChange = (val: number) => {
    setScoreHook(val);
    setScoreContent(val);
    setScoreEditing(val);
    setScoreCta(val);
    setScoreThumbnail(val);
  };

  const getGpaAndBadge = () => {
    const total = (scoreHook + scoreContent + scoreEditing + scoreCta + scoreThumbnail) / 5;
    const gpa = Math.round(total * 10) / 10;

    let text = '🔴 Cần cải thiện';
    let colorClass = 'text-red-500 bg-red-500/10 border-red-500/20';
    let dotColor = 'bg-red-500';

    if (gpa >= 9.0) {
      text = '🟣 Xuất sắc';
      colorClass = 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      dotColor = 'bg-purple-500';
    } else if (gpa >= 7.5) {
      text = '🟢 Tốt & Sáng tạo';
      colorClass = 'text-green-500 bg-green-500/10 border-green-500/20';
      dotColor = 'bg-green-500';
    } else if (gpa >= 5.0) {
      text = '🔵 Cơ bản đạt';
      colorClass = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      dotColor = 'bg-blue-500';
    }

    return { gpa, text, colorClass, dotColor };
  };

  const getScoreBadge = (score: number) => {
    let text = '🔴 Cần cải thiện';
    let colorClass = 'text-red-500 bg-red-500/10 border-red-500/20';
    if (score >= 9.0) {
      text = '🟣 Xuất sắc';
      colorClass = 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    } else if (score >= 7.5) {
      text = '🟢 Tốt & Sáng tạo';
      colorClass = 'text-green-500 bg-green-500/10 border-green-500/20';
    } else if (score >= 5.0) {
      text = '🔵 Cơ bản đạt';
      colorClass = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
    return { text, colorClass };
  };

  const handleSaveScore = async () => {
    if (!selectedSlide || !user) return false;
    setIsSavingScore(true);
    try {
      const payload = {
        score_hook: scoreHook,
        score_content: scoreContent,
        score_editing: scoreEditing,
        score_cta: scoreCta,
        score_thumbnail: scoreThumbnail,
        comment: scoreComment,
      };

      const response = await apiClient.post(`/content-report/content-videos/${selectedSlide.dbId}/score`, payload);
      const updatedScore = response.data;

      const currentScores = (selectedSlide as any).scores || [];
      const updatedScores = [...currentScores];
      const existingIndex = updatedScores.findIndex((s: any) => s.scored_by_id === user.id);

      const newScoreObj = {
        ...updatedScore,
        scored_by: {
          id: user.id,
          full_name: user.full_name,
        }
      };

      if (existingIndex > -1) {
        updatedScores[existingIndex] = newScoreObj;
      } else {
        updatedScores.push(newScoreObj);
      }
      (selectedSlide as any).scores = updatedScores;
      onRefreshData?.();

      if (showToast) {
        showToast('Đã lưu điểm và nhận xét thành công!', 'success');
      } else {
        alert('Đã lưu điểm và nhận xét thành công!');
      }
      return true;
    } catch (err: any) {
      console.error(err);
      if (showToast) {
        showToast('Lỗi khi lưu điểm: ' + (err.response?.data?.message || err.message), 'error');
      } else {
        alert('Lỗi khi lưu điểm: ' + (err.response?.data?.message || err.message));
      }
      return false;
    } finally {
      setIsSavingScore(false);
    }
  };

  const renderScoreSlider = (
    label: string,
    value: number,
    onChange: (val: number) => void
  ) => {
    let activeBarColor = 'from-red-500 to-red-400';
    let handleColor = 'border-red-500';
    let tooltipColor = 'bg-red-500';
    if (value >= 9.0) {
      activeBarColor = 'from-purple-600 to-purple-500';
      handleColor = 'border-purple-500';
      tooltipColor = 'bg-purple-600';
    } else if (value >= 7.5) {
      activeBarColor = 'from-green-500 to-green-400';
      handleColor = 'border-green-500';
      tooltipColor = 'bg-green-500';
    } else if (value >= 5.0) {
      activeBarColor = 'from-blue-500 to-blue-400';
      handleColor = 'border-blue-500';
      tooltipColor = 'bg-blue-500';
    }

    const percentage = ((value - 1) / 9) * 100;

    return (
      <div className="flex flex-col gap-2 relative mt-4 group w-full">
        <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
          <span>{label}</span>
          <span className="text-foreground">{value.toFixed(1)}</span>
        </div>
        <div className="px-2.5 w-full relative">
          <div className="relative w-full h-2.5 rounded-full bg-muted backdrop-blur-md border border-border flex items-center cursor-pointer select-none">
            <div
              className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${activeBarColor}`}
              style={{ width: `${percentage}%` }}
            />
            {/* Dotted tick marks */}
            <div className="absolute inset-0 flex justify-between items-center px-1 pointer-events-none z-10">
              {[...Array(10)].map((_, i) => {
                const dotPercentage = (i / 9) * 100;
                const isActive = value >= (i + 1);
                return (
                  <div
                    key={i}
                    className={`w-1 h-1 rounded-full transition-colors duration-150 ${isActive ? 'bg-foreground/70' : 'bg-foreground/20'
                      }`}
                    style={{ left: `calc(${dotPercentage}% - 2px)`, position: 'absolute' }}
                  />
                );
              })}
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.1"
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer z-30"
            />
            <div
              className="absolute w-4 h-4 rounded-full bg-white border-2 shadow-lg transition-transform pointer-events-none z-20"
              style={{
                left: `calc(${percentage}% - 8px)`,
                borderColor: handleColor,
              }}
            />
            <div
              className={`absolute bottom-6 transform -translate-x-1/2 px-2 py-0.5 rounded text-[12px] font-bold text-white shadow-md pointer-events-none transition-all duration-75 opacity-0 group-hover:opacity-100 group-active:opacity-100 z-40 ${tooltipColor}`}
              style={{ left: `${percentage}%` }}
            >
              {value.toFixed(1)}
              <div className={`absolute left-1/2 bottom-[-3px] transform -translate-x-1/2 w-1.5 h-1.5 rotate-45 ${tooltipColor}`} />
            </div>
          </div>
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground font-semibold px-3 mt-0.5">
          <span>1.0 (Tệ)</span>
          <span>10.0 (Xuất sắc)</span>
        </div>
      </div>
    );
  };

  const handlePlayerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.no-player-click')) return;

    if (selectedSlide?.videoUrl && selectedSlide.videoUrl.trim() !== '') {
      window.open(selectedSlide.videoUrl, '_blank');
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
        <span className="px-2 py-0.5 rounded text-[12px] font-black uppercase tracking-wider bg-pink-500/10 border border-pink-500/30 text-pink-400">
          Instagram Reels
        </span>
      );
    }
    if (p.includes('shorts') || p.includes('youtube')) {
      return (
        <span className="px-2 py-0.5 rounded text-[12px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400">
          YouTube Shorts
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[12px] font-black uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
        TikTok
      </span>
    );
  };

  const editorPerfList = baseData.editorPerformance || [];
  const totalWinVideosSum = editorPerfList.reduce((s, e) => s + (e.winVideos || 0), 0);
  const totalVideosSum = editorPerfList.reduce((s, e) => s + (e.totalVideos || 0), 0);

  const ratio = baseData.win5Stats.total > 0 ? (baseData.newVideoStats.total / baseData.win5Stats.total) : 0;
  const newWinSum = editorPerfList.reduce((s, e) => s + Math.round((e.winVideos || 0) * ratio), 0);
  const newTotalSum = editorPerfList.reduce((s, e) => s + Math.round((e.totalVideos || 0) * ratio), 0);
  const newRatePct = newTotalSum > 0 ? (newWinSum / newTotalSum) * 100 : 0;
  const newRateFormatted = `${newRatePct.toFixed(1).replace('.', ',')}%`;

  return (
    <div className="flex flex-col gap-6 lg:flex-1 lg:min-h-0">

      {/* Team Statistics Overview Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Team name card */}
        <div className="flex items-center gap-3 bg-card border border-blue-200 dark:border-blue-500/20 px-4 py-3.5 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.07)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] to-transparent pointer-events-none" />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-md shadow-blue-500/50 shrink-0" />
          <span className="text-base font-black uppercase text-foreground tracking-wider truncate">
            {baseData.teamName || `Team ${activeTab}`}
          </span>
        </div>

        {/* Tổng Content Win */}
        <div className="bg-card border border-amber-200 dark:border-amber-500/20 rounded-2xl p-3.5 flex flex-col gap-2 shadow-[0_0_18px_rgba(245,158,11,0.07)] relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.04] to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">Tổng Content Win</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <span className="text-2xl font-black text-foreground leading-none">
            {totalWinVideosSum}<span className="text-muted-foreground text-base font-bold">/{totalVideosSum}</span>
          </span>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${totalVideosSum > 0 ? (totalWinVideosSum / totalVideosSum) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Content mới win */}
        <div className="bg-card border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-3.5 flex flex-col gap-2 shadow-[0_0_18px_rgba(16,185,129,0.07)] relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">Content Mới Win</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <span className="text-2xl font-black text-foreground leading-none">
            {newWinSum}<span className="text-muted-foreground text-base font-bold">/{newTotalSum}</span>
          </span>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${newTotalSum > 0 ? (newWinSum / newTotalSum) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Tỷ lệ win */}
        <div className="bg-card border border-cyan-200 dark:border-cyan-500/20 rounded-2xl p-3.5 flex flex-col gap-2 shadow-[0_0_18px_rgba(6,182,212,0.08)] relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.05] to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">Tỷ lệ Win Mới</span>
            <div className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 leading-none">
            {newRateFormatted}
          </span>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full transition-all duration-700" style={{ width: `${newRatePct}%` }} />
          </div>
        </div>
      </div>

      {/* Top Team & Presentation Tab Navigation Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-card border border-border p-4 rounded-2xl shadow-lg">
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          {[
            { id: 'win', label: 'Content Win Mới', count: (baseData.videos || []).length, icon: Trophy, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { id: 'fail', label: 'Content Fail', count: (baseData.failVideos || []).length, icon: XCircle, color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
            { id: 'case', label: 'Case Study', count: (baseData.caseStudies || []).length, icon: Lightbulb, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { id: 'editorPerf', label: 'Số video content win của cá nhân trong team', count: (baseData.editorPerformance || []).length, icon: Award, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },

            { id: 'newWin', label: 'Content mới win của cá nhân trong team/số video đã làm', count: (baseData.editorPerformance || []).length, icon: CheckCircle, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }

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
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500 shadow-lg shadow-blue-950/50 scale-100'
                  : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : menuItem.color.split(' ')[0]}`} />
                <span>{menuItem.label}</span>
                <span className={`text-[12px] px-1.5 py-0.5 rounded-md font-bold ${isActive ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'bg-muted text-muted-foreground'}`}>
                  {menuItem.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex bg-card border border-border p-1 rounded-xl shadow-inner w-full xl:w-auto xl:max-w-xs self-stretch xl:self-auto justify-between xl:justify-start gap-1">
          {Object.keys(teamsData).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                onTabChange(tab);
                setActiveSlideIndex(0);
                setIsPlayingVideo(false);
              }}
              className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-xl lg:h-[calc(100vh-420px)] lg:min-h-[350px] h-[680px]">
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <span className="text-[12px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Danh sách Slide
              </span>
              <span className="text-[12px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {slidesList.length} slide
              </span>
            </div>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {slidesList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs font-medium">
                  Chưa có slide nào
                </div>
              ) : (
                slidesList.map((slide: any, index: number) => {
                  const isCurrent = validSlideIndex === index;
                  const slideTitle = presentationMenu === 'action'
                    ? slide.title
                    : (presentationMenu === 'editorPerf' || presentationMenu === 'newWin')
                      ? `${slide.editor}`
                      : slide.content;
                  const slideSubLeft = presentationMenu === 'action'
                    ? slide.assignee
                    : (presentationMenu === 'editorPerf' || presentationMenu === 'newWin')
                      ? 'Editor'
                      : (slide.editor || 'Ẩn danh');
                  const slideSubRight = presentationMenu === 'action'
                    ? slide.deadline
                    : (presentationMenu === 'editorPerf' || presentationMenu === 'newWin')
                      ? `${slide.totalVideos > 0 ? ((slide.winVideos / slide.totalVideos) * 100).toFixed(1) : '0'}%`
                      : formatPresentationViews(slide.views);
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        setActiveSlideIndex(index);
                        setIsPlayingVideo(false);
                      }}
                      className={`flex gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-all duration-200 group select-none relative overflow-hidden flex-shrink-0 ${isCurrent
                        ? 'bg-blue-50 dark:bg-gradient-to-r dark:from-blue-950/60 dark:to-[#1a2540]/60 border-blue-500/60 shadow-md shadow-blue-950/30'
                        : 'bg-transparent hover:bg-accent border-border hover:border-border'
                        }`}
                    >
                      {/* Slide number badge */}
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-black shrink-0 mt-0.5 ${isCurrent ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <span className={`text-[13px] font-bold leading-tight line-clamp-2 ${isCurrent ? 'text-foreground font-extrabold' : 'text-muted-foreground group-hover:text-foreground'
                          }`}>
                          {slideTitle}
                        </span>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold truncate">
                            <User className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{slideSubLeft}</span>
                          </span>
                          <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${isCurrent
                            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                            : 'bg-muted text-muted-foreground'
                            }`}>
                            {slideSubRight}
                          </span>
                        </div>
                      </div>

                      {/* Active side indicator */}
                      {isCurrent && (
                        <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-blue-400 rounded-l" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => addSlide(presentationMenu)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-muted hover:bg-blue-600 hover:text-white border border-border hover:border-blue-500 text-muted-foreground rounded-xl text-xs font-black transition-all duration-200 shadow-md group shrink-0"
          >
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" />
            Thêm slide mới
          </button>
        </div>

        {/* Column 2: Center Main Slide Stage */}
        <div className="lg:col-span-5 flex flex-col gap-4 lg:h-[calc(100vh-420px)] lg:min-h-[350px] h-[680px]">
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-lg shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[13px] font-black uppercase tracking-wider text-muted-foreground">
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-red-950/40 hover:bg-rose-100 dark:hover:bg-red-500/20 disabled:opacity-40 text-rose-600 dark:text-red-400 hover:text-rose-700 dark:hover:text-foreground border border-rose-200 dark:border-red-500/20 rounded-lg text-xs font-black transition-all duration-150"
                title="Xóa slide hiện tại"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {selectedSlide ? (
            <div className="flex-1 bg-card border border-border rounded-2xl p-4 flex flex-col gap-4 shadow-xl relative overflow-hidden overflow-y-auto custom-scrollbar">
              <div className="absolute inset-0 bg-radial-gradient from-blue-900/[0.03] to-transparent pointer-events-none" />

              {(presentationMenu === 'editorPerf' || presentationMenu === 'newWin') ? (

                <div className="flex flex-col md:flex-row gap-8 items-center md:items-stretch py-4 w-full">

                  {/* Left: Beautiful circular progress ring (SVG) */}

                  <div className="w-full md:w-56 bg-muted border border-border rounded-2xl flex flex-col items-center justify-center p-6 shrink-0 shadow-inner min-h-[220px]">

                    {(() => {

                      const total = selectedSlide.totalVideos || 0;

                      const win = selectedSlide.winVideos || 0;

                      const rate = total > 0 ? (win / total) * 100 : 0;



                      const radius = 60;

                      const circumference = 2 * Math.PI * radius;

                      const strokeDashoffset = circumference - (rate / 100) * circumference;



                      let progressColor = 'stroke-rose-500';

                      let bgColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400';

                      let statusText = 'Cần cải thiện';

                      if (rate >= 40) {

                        progressColor = 'stroke-emerald-500';

                        bgColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';

                        statusText = 'Xuất sắc';

                      } else if (rate >= 20) {

                        progressColor = 'stroke-blue-500';

                        bgColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400';

                        statusText = 'Tốt / Đạt chỉ tiêu';

                      }



                      return (

                        <>

                          <div className="relative w-32 h-32 flex items-center justify-center">

                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">

                              <circle cx="70" cy="70" r={radius} className="stroke-muted" strokeWidth="10" fill="transparent" />

                              <circle cx="70" cy="70" r={radius} className={`transition-all duration-500 ease-out ${progressColor}`} strokeWidth="10" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />

                            </svg>

                            <div className="absolute flex flex-col items-center justify-center">

                              <span className="text-xl font-black text-foreground">{rate.toFixed(1).replace('.', ',')}%</span>

                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Win Rate</span>

                            </div>

                          </div>

                          <span className={`mt-4 px-3 py-1.5 rounded-full text-[12px] font-black uppercase tracking-wider ${bgColor} border border-border shadow-sm`}>

                            {statusText}

                          </span>

                        </>

                      );

                    })()}

                  </div>

                  {/* Right: Info Fields & Editing for Editor */}

                  <div className="flex-1 flex flex-col gap-5 justify-center">

                    <div className="flex flex-col">
                      <label className="text-[12px] font-black uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-1.5">

                        <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Tên Editor

                      </label>
                      <input
                        type="text"
                        value={selectedSlide.editor || ''}

                        onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'editor', e.target.value)}

                        className="bg-muted border border-border focus:border-blue-500 dark:focus:border-blue-400 outline-none rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground font-bold transition-all"

                        placeholder="Nhập tên Editor..."

                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                      <div className="flex flex-col">
                        <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1">

                          <Video className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Tổng video đã làm

                        </label>

                        <input

                          type="number"

                          min="0"

                          value={selectedSlide.totalVideos ?? 0}

                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'totalVideos', e.target.value)}

                          className="bg-muted border border-border focus:border-blue-500 dark:focus:border-blue-400 outline-none rounded-lg px-3 py-2 text-xs text-foreground font-bold transition-all"

                        />

                      </div>
                      <div className="flex flex-col">
                        <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1">

                          <Trophy className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Video đạt content win

                        </label>

                        <input

                          type="number"

                          min="0"

                          value={selectedSlide.winVideos ?? 0}

                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'winVideos', e.target.value)}

                          className="bg-muted border border-border focus:border-blue-500 dark:focus:border-blue-400 outline-none rounded-lg px-3 py-2 text-xs text-foreground font-bold transition-all"

                        />

                      </div>
                    </div>



                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">

                      <div className="flex flex-col bg-muted border border-border rounded-lg p-2.5">

                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Video Thất bại (Fail)</span>

                        <span className="text-sm font-black text-rose-600 dark:text-rose-400 mt-1">

                          {Math.max(0, (selectedSlide.totalVideos || 0) - (selectedSlide.winVideos || 0))}

                        </span>

                      </div>
                      <div className="flex flex-col bg-muted border border-border rounded-lg p-2.5">

                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Hiệu suất chung</span>

                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">

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

                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {/* Left: Video Mockup Player */}
                  <div
                    onClick={handlePlayerClick}
                    className="w-full md:w-[160px] bg-muted border border-border rounded-xl flex flex-col justify-between overflow-hidden relative group shrink-0 min-h-[180px] md:h-[220px] cursor-pointer hover:border-border transition-all duration-300 select-none"
                  >
                    <img
                      src={getSlideUnsplashImage(selectedSlide)}
                      alt="Mock preview"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Right: Info Fields & Editing */}
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex flex-col">
                      <label className="text-[12px] font-black uppercase text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        {presentationMenu === 'action' ? 'Nội dung công việc' : (presentationMenu === 'case' ? 'Tiêu đề Case Study' : 'Nội dung video / Kịch bản')}
                      </label>

                      {presentationMenu === 'action' || presentationMenu === 'case' ? (
                        <input
                          type="text"
                          value={presentationMenu === 'action' ? (selectedSlide.title || '') : (selectedSlide.title || '')}
                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'title', e.target.value)}
                          className="bg-muted border border-border focus:border-blue-500 dark:focus:border-blue-400 outline-none rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground font-medium transition-all"
                          placeholder={presentationMenu === 'action' ? 'Nhập tiêu đề hành động...' : 'Nhập tiêu đề case study...'}
                        />
                      ) : (
                        <textarea
                          id="script-textarea"
                          rows={2}
                          value={selectedSlide.content || ''}
                          onChange={(e) => {
                            updateSlideField(presentationMenu, validSlideIndex, 'content', e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          className="bg-muted border border-border focus:border-blue-500 dark:focus:border-blue-400 outline-none rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground font-medium leading-relaxed resize-none transition-all"
                          placeholder="Nhập nội dung/kịch bản video..."
                          style={{ overflowY: 'hidden' }}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Editor / Assignee */}
                      <div className="flex flex-col">
                        <label className="text-[12px] font-black uppercase text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          {presentationMenu === 'action' ? 'Người làm' : 'Editor'}
                        </label>
                        <input
                          type="text"
                          value={presentationMenu === 'action' ? (selectedSlide.assignee || '') : (selectedSlide.editor || '')}
                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, presentationMenu === 'action' ? 'assignee' : 'editor', e.target.value)}
                          readOnly={presentationMenu !== 'action'}
                          className={`bg-muted border border-border outline-none rounded-lg px-2 py-1.5 text-xs text-foreground transition-all font-semibold ${presentationMenu !== 'action' ? 'opacity-80 cursor-default text-muted-foreground' : 'focus:border-blue-500 dark:focus:border-blue-400'}`}
                        />
                      </div>

                      {/* Views / Deadline */}
                      <div className="flex flex-col">
                        <label className="text-[12px] font-black uppercase text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          {presentationMenu === 'action' ? 'Hạn' : 'Lượt xem'}
                        </label>
                        <input
                          type="text"
                          value={presentationMenu === 'action' ? (selectedSlide.deadline || '') : formatPresentationViews((selectedSlide.views || '').replace(/\s*views/i, '').trim())}
                          onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, presentationMenu === 'action' ? 'deadline' : 'views', e.target.value)}
                          readOnly={presentationMenu !== 'action'}
                          className={`bg-muted border border-border outline-none rounded-lg px-2 py-1.5 text-xs text-foreground transition-all font-semibold ${presentationMenu !== 'action' ? 'opacity-80 cursor-default text-muted-foreground' : 'focus:border-blue-500 dark:focus:border-blue-400'}`}
                        />
                      </div>

                      {/* Platform / Channel / priority */}
                      <div className="flex flex-col">
                        <label className="text-[12px] font-black uppercase text-muted-foreground tracking-wider mb-1">
                          {presentationMenu === 'action' ? 'Độ ưu tiên' : (presentationMenu === 'case' ? 'Kênh' : (presentationMenu === 'clone' ? 'Kênh clone' : 'Nền tảng'))}
                        </label>
                        {presentationMenu === 'action' ? (
                          <select
                            value={selectedSlide.priority || 'Trung bình'}
                            onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'priority', e.target.value)}
                            className="bg-muted border border-border focus:border-blue-500 dark:focus:border-blue-400 outline-none rounded-lg px-2 py-1.5 text-xs text-foreground font-semibold transition-all"
                          >
                            <option value="Cao">Cao</option>
                            <option value="Trung bình">Trung bình</option>
                            <option value="Thấp">Thấp</option>
                          </select>
                        ) : presentationMenu === 'case' ? (
                          <input type="text" value={selectedSlide.channel || ''} readOnly className="bg-muted border border-border outline-none rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-all font-semibold opacity-80 cursor-default" />
                        ) : presentationMenu === 'clone' ? (
                          <input type="text" value={selectedSlide.targetChannel || ''} readOnly className="bg-muted border border-border outline-none rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-all font-semibold opacity-80 cursor-default" />
                        ) : (
                          <input type="text" value={selectedSlide.platform || 'TikTok'} readOnly className="bg-muted border border-border outline-none rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-all font-semibold opacity-80 cursor-default" />
                        )}
                      </div>

                      {/* Date / Status */}
                      <div className="flex flex-col">
                        <label className="text-[12px] font-black uppercase text-muted-foreground tracking-wider mb-1">
                          {presentationMenu === 'action' ? 'Trạng thái' : 'Ngày đăng'}
                        </label>
                        {presentationMenu === 'action' ? (
                          <select
                            value={selectedSlide.status || 'Chưa bắt đầu'}
                            onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'status', e.target.value)}
                            className="bg-muted border border-border focus:border-blue-500 dark:focus:border-blue-400 outline-none rounded-lg px-2 py-1.5 text-xs text-foreground font-semibold transition-all"
                          >
                            <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                            <option value="Đang tiến hành">Đang tiến hành</option>
                            <option value="Hoàn thành">Hoàn thành</option>
                          </select>
                        ) : (
                          <input type="text" value={selectedSlide.postDate || ''} readOnly className="bg-muted border border-border outline-none rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-all font-semibold opacity-80 cursor-default" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Vote & Score buttons */}
              {presentationMenu !== 'action' && presentationMenu !== 'editorPerf' && presentationMenu !== 'newWin' && (

                <div className="flex gap-3 border-t border-border pt-3 items-center">
                  <button
                    onClick={() => {
                      const isVoted = selectedSlide.isVoted === 'true';
                      updateSlideField(presentationMenu, validSlideIndex, 'isVoted', (!isVoted).toString());
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-black transition-all duration-200 ${selectedSlide.isVoted === 'true'
                      ? 'bg-rose-600/90 hover:bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-950/20 scale-[1.01]'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                      }`}
                  >
                    <Heart className={`w-3.5 h-3.5 transition-transform ${selectedSlide.isVoted === 'true' ? 'fill-current scale-110 text-white' : 'text-muted-foreground'}`} />
                    <span>{selectedSlide.isVoted === 'true' ? 'Đã Vote' : 'Vote'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsScoreModalOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-purple-500/20 bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-black transition-all duration-200 shadow-md shadow-purple-950/20 scale-[1.01]"
                  >
                    <Award className="w-3.5 h-3.5 text-white" />
                    <span>Chấm điểm</span>
                  </button>
                </div>
              )}

              {/* Notes Field */}
              <div className="border-t border-border pt-3 flex flex-col">
                <label className="text-[12px] font-black uppercase text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Ghi chú định hướng nội bộ
                </label>
                <textarea
                  rows={2}
                  value={selectedSlide.notes || ''}
                  onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'notes', e.target.value)}
                  className="bg-muted border border-border focus:border-blue-500 dark:focus:border-blue-400 outline-none rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground font-medium leading-relaxed resize-none transition-all"
                  placeholder="Nhập ghi chú định hướng chiến dịch..."
                />
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center justify-center h-[400px] text-center shadow-xl flex-1">
              <Presentation className="w-12 h-12 text-muted-foreground mb-4 animate-bounce" />
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Không có slide</h3>
              <p className="text-xs text-muted-foreground mt-2 max-w-xs leading-relaxed">
                Hãy chọn danh mục khác hoặc click vào nút &quot;Thêm slide mới&quot; ở cột bên trái để tạo slide thuyết trình!
              </p>
            </div>
          )}
        </div>

        {/* Column 3: Right Analysis Cards Panel */}
        <div className="lg:col-span-4 flex flex-col gap-3 lg:h-[calc(100vh-420px)] lg:min-h-[350px] h-[680px]">
          {/* Panel header */}
          <div className="bg-card border border-purple-200 dark:border-purple-500/20 rounded-2xl px-4 py-3 flex items-center justify-between shadow-[0_0_18px_rgba(168,85,247,0.07)] shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.04] to-transparent pointer-events-none" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-[13px] font-black uppercase text-foreground tracking-wider">Phân tích & Đánh giá</span>
            </div>
            <span className="text-[11px] font-extrabold text-purple-600/70 dark:text-purple-400/70 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              AI Review
            </span>
          </div>

          {selectedSlide ? (
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 custom-scrollbar">
              {/* Review chéo Widget */}
              {(presentationMenu === 'win' || presentationMenu === 'fail') && selectedSlide && (
                <div className="bg-card border border-border backdrop-blur-md rounded-2xl p-4 shadow-xl flex flex-col gap-3 overflow-hidden">
                  {/* Widget Header */}
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-[12px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> XEM CHÉO (ĐÁNH GIÁ VIDEO)
                    </span>
                    {((selectedSlide as any).scores || []).length > 0 && (
                      <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] px-2 py-0.5 rounded-full font-black border border-purple-300 dark:border-purple-500/30">
                        {((selectedSlide as any).scores || []).length} Đánh giá
                      </span>
                    )}
                  </div>

                  {/* History List */}
                  <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {((selectedSlide as any).scores || []).length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground font-semibold">
                        Chưa có ai đánh giá video này.
                      </div>
                    ) : (
                      ((selectedSlide as any).scores || []).map((s: any, idx: number) => {
                        const badge = getScoreBadge(s.score_total);
                        return (
                          <div key={idx} className="bg-muted/40 border border-border p-3 rounded-xl flex flex-col gap-2 hover:bg-accent transition-all">
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-black text-foreground">{s.scored_by?.full_name || 'Thành viên'}</span>
                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border inline-block w-fit ${badge.colorClass}`}>
                                  {badge.text}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 block uppercase tracking-widest mb-0.5">Đánh giá</span>
                                <div className="flex items-baseline justify-end gap-0.5">
                                  <span className="text-base font-black text-foreground">{s.score_total?.toFixed(1)}</span>
                                  <span className="text-[12px] font-bold text-muted-foreground">/10</span>
                                </div>
                              </div>
                            </div>

                            {s.comment && (
                              <div className="text-[12px] text-muted-foreground bg-muted/40 border border-border p-2.5 rounded-lg italic leading-relaxed">
                                <span className="font-bold not-italic text-muted-foreground block text-[10px] uppercase tracking-wider mb-1">Ý kiến góp ý</span>
                                &ldquo;{s.comment}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              {/* Analysis Card 1 */}
              {(() => {
                const isPerf = presentationMenu === 'editorPerf' || presentationMenu === 'newWin';
                const title = isPerf ? 'Phân tích hiệu suất' : 'Đánh giá phân tích';

                let field = 'analysis';
                let accentColor = 'border-l-emerald-500';
                let bgGlow = 'bg-emerald-500/[0.025]';
                let borderColor = 'border-emerald-500/15';
                let iconBg = 'bg-emerald-500/15 border-emerald-500/25';
                let iconColor = 'text-emerald-600 dark:text-emerald-400';
                let labelColor = 'text-emerald-700 dark:text-emerald-300';
                let icon = Trophy;

                if (isPerf) {
                  field = 'analysis';
                  const isNew = presentationMenu === 'newWin';
                  accentColor = isNew ? 'border-l-emerald-500' : 'border-l-blue-500';
                  bgGlow = isNew ? 'bg-emerald-500/[0.025]' : 'bg-blue-500/[0.025]';
                  borderColor = isNew ? 'border-emerald-500/15' : 'border-blue-500/15';
                  iconBg = isNew ? 'bg-emerald-500/15 border-emerald-500/25' : 'bg-blue-500/15 border-blue-500/25';
                  iconColor = isNew ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400';
                  labelColor = isNew ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300';
                  icon = Award;
                } else if (presentationMenu === 'fail') {
                  field = 'failReason';
                  accentColor = 'border-l-rose-500'; bgGlow = 'bg-rose-500/[0.025]'; borderColor = 'border-rose-500/15';
                  iconBg = 'bg-rose-500/15 border-rose-500/25'; iconColor = 'text-rose-600 dark:text-rose-400'; labelColor = 'text-rose-700 dark:text-rose-300'; icon = XCircle;
                } else if (presentationMenu === 'case') {
                  field = 'takeaway';
                  accentColor = 'border-l-amber-500'; bgGlow = 'bg-amber-500/[0.025]'; borderColor = 'border-amber-500/15';
                  iconBg = 'bg-amber-500/15 border-amber-500/25'; iconColor = 'text-amber-600 dark:text-amber-400'; labelColor = 'text-amber-700 dark:text-amber-300'; icon = BookOpen;
                } else if (presentationMenu === 'clone') {
                  field = 'analysis';
                  accentColor = 'border-l-indigo-500'; bgGlow = 'bg-indigo-500/[0.025]'; borderColor = 'border-indigo-500/15';
                  iconBg = 'bg-indigo-500/15 border-indigo-500/25'; iconColor = 'text-indigo-600 dark:text-indigo-400'; labelColor = 'text-indigo-700 dark:text-indigo-300'; icon = Copy;
                } else if (presentationMenu === 'action') {
                  field = 'description';
                  accentColor = 'border-l-cyan-500'; bgGlow = 'bg-cyan-500/[0.025]'; borderColor = 'border-cyan-500/15';
                  iconBg = 'bg-cyan-500/15 border-cyan-500/25'; iconColor = 'text-cyan-600 dark:text-cyan-400'; labelColor = 'text-cyan-700 dark:text-cyan-300'; icon = ListTodo;
                }

                const CustomIcon = icon;
                const value = selectedSlide[field] || '';

                return (
                  <div className={`${bgGlow} border ${borderColor} border-l-4 ${accentColor} rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}>
                        <CustomIcon className={`w-3.5 h-3.5 ${iconColor}`} />
                      </div>
                      <span className={`text-[12px] font-black uppercase tracking-widest ${labelColor}`}>{title}</span>
                    </div>
                    <div className="h-px w-full bg-border" />
                    <textarea
                      rows={4}
                      value={value}
                      onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, field, e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs leading-relaxed text-muted-foreground placeholder:text-muted-foreground resize-none font-medium w-full min-h-[100px] overflow-y-auto custom-scrollbar"
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
                const Icon = (isAction || isPerf) ? BookOpen : Wrench;

                return (
                  <div className="bg-sky-500/[0.025] border border-sky-500/15 border-l-4 border-l-sky-500 rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg border bg-sky-500/15 border-sky-500/25 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <span className="text-[12px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">{title}</span>
                    </div>
                    <div className="h-px w-full bg-border" />
                    <textarea
                      rows={4}
                      value={selectedSlide[field] || ''}
                      onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, field, e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs leading-relaxed text-muted-foreground placeholder:text-muted-foreground resize-none font-medium w-full min-h-[100px] overflow-y-auto custom-scrollbar"
                      placeholder={isAction ? "Ghi chú thêm..." : isPerf ? "Nhập định hướng cải thiện chỉ số cho Editor..." : "Nhập hướng cải tiến mới..."}
                    />
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="border border-border bg-muted/30 rounded-2xl p-8 text-center flex-1 flex flex-col items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
              <span className="text-muted-foreground text-xs font-semibold">Chưa có slide để hiển thị phân tích</span>
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
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#090F1C] border border-blue-500/25 text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider shadow-inner">
                  <Trophy className="w-3.5 h-3.5 text-blue-400 fill-blue-400/10" />
                  TEAM {activeTab}
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent uppercase leading-none">
                    {titles[presentationMenu] || 'PRESENTATION SLIDE'}
                  </h1>
                  <span className="text-[13px] text-slate-400 font-extrabold mt-1.5 tracking-wide uppercase">
                    {descs[presentationMenu] || 'Báo cáo thống kê hiệu suất của team'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {/* Stepper Progress Bar matching the image */}
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[12px] font-black tracking-widest text-[#5B75A6] uppercase">
                    SLIDE {validSlideIndex + 1} / {slidesList.length}
                  </span>
                  <div className="relative flex items-center h-2 w-36 mt-0.5">
                    {/* Background track */}
                    <div className="absolute left-0 right-0 h-1 bg-[#1E293B] rounded-full" />
                    {/* Active track */}
                    <div
                      className="absolute left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
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
                            className={`h-2.5 rounded-full transition-all duration-300 relative z-10 ${isCurrent
                              ? 'w-6 bg-gradient-to-r from-blue-500 to-indigo-500 ring-4 ring-blue-500/15 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                              : isActive
                                ? 'w-2.5 bg-blue-500/80 hover:bg-blue-400'
                                : 'w-2.5 bg-white/[0.08] hover:bg-white/[0.15]'
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
                  className="p-2.5 bg-white/[0.04] hover:bg-red-500/20 hover:text-red-400 border border-white/[0.08] hover:border-red-500/30 rounded-full transition-all duration-300 hover:rotate-90 hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Layout content 3 hàng dọc chính */}
            <div className="flex-1 flex flex-col justify-between gap-4 my-2 z-10 overflow-y-auto custom-scrollbar">

              {/* Glowing blue separator line under the header */}
              <div className="w-full h-[1.5px] bg-gradient-to-r from-blue-500/80 via-blue-600/40 to-transparent shadow-[0_0_8px_rgba(59,130,246,0.3)] -mt-2 mb-2 z-10" />

              {/* Hàng 1: Video Player, Content Script & Right Stats */}
              <div className="grid grid-cols-12 gap-6 items-stretch min-h-[460px]" style={{ flex: '3 3 0%' }}>

                {/* Hàng 1 - Cột Trái: Video Player hoặc circular chart (col-span-3) */}
                <div className="col-span-3">
                  <div className="bg-[#090F1C]/40 border border-white/[0.06] rounded-2xl p-4 flex items-center justify-center relative min-h-[350px] shadow-lg h-full">
                    {/* Dot matrix pattern on the left */}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1 z-0">
                      <div className="flex flex-col gap-1.5">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-white/20" />
                        ))}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-white/20" />
                        ))}
                      </div>
                    </div>

                    {isPerf ? (
                      <div className="w-full bg-[#090F1C]/80 border border-white/[0.08] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
                        {(() => {
                          const total = selectedSlide.totalVideos || 0;
                          const win = selectedSlide.winVideos || 0;
                          const rate = total > 0 ? (win / total) * 100 : 0;
                          const radius = 64;
                          const circumference = 2 * Math.PI * radius;
                          const strokeDashoffset = circumference - (rate / 100) * circumference;

                          let progressColor = 'stroke-emerald-500';
                          let bgColor = 'bg-emerald-500/10 text-emerald-400';
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
                                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Win Rate</span>
                                </div>
                              </div>
                              <h3 className="text-base font-black text-white mt-4">{selectedSlide.editor}</h3>
                              <span className={`mt-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${bgColor} border border-white/5`}>
                                {statusText}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    ) : presentationMenu !== 'action' ? (
                      <div
                        onClick={handlePlayerClick}
                        className={`h-[420px] w-[270px] rounded-2xl overflow-hidden relative border border-white/10 bg-[#0C1322] cursor-pointer transition-all duration-300 group shadow-lg flex flex-col justify-between z-10`}
                      >
                        <img src={getSlideUnsplashImage(selectedSlide)} alt="mock" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />

                        {/* Play button overlay in the center of display */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-purple-600/40 backdrop-blur-sm border border-purple-400/40 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-purple-600/60 shadow-lg">
                            <Play className="w-5 h-5 text-white fill-current translate-x-0.5" />
                          </div>
                        </div>

                        {/* Time duration overlay bottom-center */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#090E18]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[12px] font-extrabold tracking-wider text-slate-200">
                          00:59
                        </div>
                      </div>
                    ) : (
                      <div className="w-full bg-[#090F1C]/80 border border-white/[0.08] backdrop-blur-md rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full min-h-[160px] ml-6 z-10">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-cyan-400" />
                          <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full">ACTION ITEM</span>
                        </div>
                        <h2 className="text-lg font-black text-white leading-snug tracking-tight">{selectedSlide.title}</h2>
                        <div className="flex gap-4 mt-4 text-[12px] text-slate-400 border-t border-white/[0.06] pt-3 font-bold">
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
                </div>

                {/* Hàng 1 - Cột Giữa: Script & Meta (col-span-6) */}
                <div className="col-span-6 flex flex-col justify-between h-full">
                  <div className="bg-[#090F1C]/40 border border-white/[0.05] p-6 rounded-2xl flex flex-col justify-between h-full relative overflow-hidden shadow-lg">

                    {/* Large double quote watermark in the top-right corner */}
                    <span className="absolute right-6 top-4 text-blue-500/[0.04] font-serif text-[180px] leading-none select-none pointer-events-none">
                      “
                    </span>

                    <div className="relative z-10 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title badge with icon */}
                        <div className="flex items-center gap-1.5 text-blue-400 font-extrabold tracking-wider text-[12px] uppercase mb-4">
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
                          <div className="grid grid-cols-3 gap-4 py-2 text-center mt-3">
                            <div className="flex flex-col bg-[#090F1C]/80 border border-white/[0.04] p-4 rounded-xl shadow-md">
                              <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Tổng video</span>
                              <span className="text-xl font-black text-white mt-1.5">{selectedSlide.totalVideos}</span>
                            </div>
                            <div className="flex flex-col bg-emerald-500/[0.02] border border-emerald-500/10 p-4 rounded-xl shadow-md">
                              <span className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">Số video Win</span>
                              <span className="text-xl font-black text-emerald-400 mt-1.5">{selectedSlide.winVideos}</span>
                            </div>
                            <div className="flex flex-col bg-rose-500/[0.02] border border-rose-500/10 p-4 rounded-xl shadow-md">
                              <span className="text-[12px] font-black text-rose-400 uppercase tracking-widest">Số Fail</span>
                              <span className="text-xl font-black text-rose-400 mt-1.5">
                                {Math.max(0, (selectedSlide.totalVideos || 0) - (selectedSlide.winVideos || 0))}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 mt-2">
                            {displayTitle && (
                              <h2 className="text-xl font-black text-white leading-snug tracking-tight">
                                {displayTitle}
                              </h2>
                            )}
                            {displayBody && (
                              <p className="text-[14px] font-medium leading-relaxed text-slate-300 whitespace-pre-wrap max-h-[140px] overflow-y-auto custom-scrollbar pr-1 pb-4">
                                {presentationMenu === 'fail' || presentationMenu === 'case' || presentationMenu === 'clone'
                                  ? displayBody
                                  : `- ${displayBody}`}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Metadata Pill Grid */}
                      {presentationMenu !== 'action' && presentationMenu !== 'editorPerf' && presentationMenu !== 'newWin' && (
                        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/[0.06] mt-auto">
                          <div className="flex items-center gap-2 bg-[#091122]/60 border border-white/[0.05] px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 flex-1 justify-center">
                            <User className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="truncate">EDITOR: <span className="text-white font-extrabold">{selectedSlide.editor || 'Ẩn danh'}</span></span>
                          </div>
                          <div className="flex items-center gap-2 bg-[#091122]/60 border border-white/[0.05] px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 flex-1 justify-center">
                            <Eye className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="truncate">LƯỢT XEM: <span className="text-white font-extrabold">{formatPresentationViews(selectedSlide.views || '0')}</span></span>
                          </div>
                          <div className="flex items-center gap-2 bg-[#091122]/60 border border-white/[0.05] px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 flex-1 justify-center">
                            <span className="text-blue-400 shrink-0 flex items-center justify-center">{renderPlatformLogo(selectedSlide.platform)}</span>
                            <span className="truncate">NỀN TẢNG: <span className="text-white font-extrabold">{selectedSlide.platform || 'TikTok'}</span></span>
                          </div>
                          <div className="flex items-center gap-2 bg-[#091122]/60 border border-white/[0.05] px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 flex-1 justify-center">
                            <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="truncate">NGÀY ĐĂNG: <span className="text-white font-extrabold">{selectedSlide.postDate || 'N/A'}</span></span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hàng 1 - Cột Phải: Side details list card matching image (col-span-3) */}
                <div className="col-span-3 flex flex-col gap-2.5 h-full pr-1">
                  {/* Row 1: Views */}
                  <div className="flex-1 flex items-center gap-4 bg-[#090F1C]/80 border border-white/[0.05] p-4 rounded-2xl shadow-md">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 animate-pulse-slow">
                      <Eye className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[13px] text-slate-400 uppercase tracking-widest font-black mb-1">LƯỢT XEM (VIEWS)</div>
                      <div className="text-lg font-black text-white">
                        {isPerf ? selectedSlide.totalVideos + ' video' : formatPresentationViews(selectedSlide.views || '0')}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Vote */}
                  <div className="flex-1 flex items-center gap-4 bg-[#090F1C]/80 border border-white/[0.05] p-4 rounded-2xl shadow-md">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                      <Heart className={`w-6 h-6 ${selectedSlide.isVoted === 'true' ? 'fill-rose-500' : ''}`} />
                    </div>
                    <div>
                      <div className="text-[13px] text-slate-400 uppercase tracking-widest font-black mb-1">VOTE</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-black text-white">
                          {isPerf ? selectedSlide.winVideos + ' win' : (selectedSlide.isVoted === 'true' ? '24' : '23')}
                        </span>
                        {selectedSlide.isVoted === 'true' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[12px] font-black bg-rose-500/10 border border-rose-500/20 text-rose-400">ĐÃ VOTE</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Score */}
                  <div className="flex-1 flex items-center gap-4 bg-[#090F1C]/80 border border-white/[0.05] p-4 rounded-2xl shadow-md">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[13px] text-slate-400 uppercase tracking-widest font-black mb-1">ĐIỂM TRUNG BÌNH</div>
                      <div className="mt-1 flex items-baseline gap-0.5">
                        {(() => {
                          const scoresList = (selectedSlide as any).scores || [];
                          const avgScore = scoresList.length > 0
                            ? (scoresList.reduce((acc: number, s: any) => acc + (s.score_total || 0), 0) / scoresList.length).toFixed(1)
                            : null;
                          return avgScore ? (
                            <>
                              <span className="text-lg font-black text-purple-400">{avgScore}</span>
                              <span className="text-xs font-bold text-slate-400">/10</span>
                            </>
                          ) : (
                            <span className="text-lg font-black text-slate-500">Chưa chấm</span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  {/* Row 4: Last update / Deadline */}
                  <div className="flex-1 flex items-center gap-4 bg-[#090F1C]/80 border border-white/[0.05] p-4 rounded-2xl shadow-md">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[13px] text-slate-400 uppercase tracking-widest font-black mb-1">NGÀY ĐĂNG</div>
                      <div className="text-lg font-black text-white">
                        {presentationMenu === 'action' ? selectedSlide.deadline : selectedSlide.postDate || '10/06/2026'}
                      </div>
                    </div>
                  </div>



                </div>

              </div>

              {/* Hàng 2: Đánh giá & Cải thiện (Grid 2 cột) */}
              <div className="grid grid-cols-2 gap-6 min-h-[120px]" style={{ flex: '1.2 1.2 0%' }}>

                {/* Cột Trái: Đánh giá phân tích */}
                {(() => {
                  const title = isPerf ? 'PHÂN TÍCH HIỆU SUẤT' : 'ĐÁNH GIÁ PHÂN TÍCH';
                  const borderClass = 'border-emerald-500/20 bg-[#090F1C]/40 text-emerald-400 shadow-lg';
                  const value = presentationMenu === 'fail' ? selectedSlide.failReason : (presentationMenu === 'case' ? selectedSlide.takeaway : (presentationMenu === 'action' ? selectedSlide.description : selectedSlide.analysis));

                  return (
                    <div className={`border p-5 rounded-2xl flex flex-col justify-between gap-2 relative overflow-hidden ${borderClass} h-full`}>
                      {/* Floating watermark */}
                      <span className="absolute right-6 bottom-2 text-emerald-500/[0.04] pointer-events-none">
                        <TrendingUp className="w-28 h-28" />
                      </span>

                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-400 z-10">
                        <TrendingUp className="w-4 h-4 text-emerald-400" /> {title}
                      </span>
                      <p className="text-[13px] font-semibold leading-relaxed text-slate-300 z-10 mt-1 whitespace-pre-wrap flex-1 overflow-y-auto custom-scrollbar max-h-[90px]">
                        {value || 'Nhấp đúp để nhập phân tích...'}
                      </p>
                    </div>
                  );
                })()}

                {/* Cột Phải: Điểm có thể cải thiện tốt hơn */}
                <div className="bg-[#090F1C]/40 border border-blue-500/20 p-5 rounded-2xl flex flex-col justify-between gap-2 shadow-lg relative overflow-hidden h-full">
                  {/* Floating watermark */}
                  <span className="absolute right-6 bottom-2 text-blue-500/[0.04] pointer-events-none">
                    <Target className="w-28 h-28" />
                  </span>

                  <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5 z-10">
                    <Target className="w-4 h-4 text-blue-400" />
                    {isPerf ? 'GHI CHÚ & ĐỊNH HƯỚNG PHÁT TRIỂN' : 'ĐIỂM CÓ THỂ CẢI THIỆN TỐT HƠN'}
                  </span>

                  <div className="flex flex-col gap-2 relative z-10 overflow-y-auto custom-scrollbar mt-1 flex-1 max-h-[90px]">
                    {improvementPoints.length > 0 ? (
                      improvementPoints.map((pt: string, ptIdx: number) => (
                        <div key={ptIdx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          </span>
                          <span className="text-[13px] font-semibold leading-relaxed text-slate-300">{pt}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        </span>
                        <span className="text-[13px] font-semibold leading-relaxed text-slate-300">
                          {improvementsField || 'Tiếp tục duy trì chất lượng hiện tại.'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Hàng 3: Ghi chú định hướng nội bộ (100% width) */}
              {presentationMenu !== 'action' && presentationMenu !== 'editorPerf' && presentationMenu !== 'newWin' && (
                <div className="grid grid-cols-2 gap-6 min-h-[80px]" style={{ flex: '0.8 0.8 0%' }}>
                  {/* Left Column: GHI CHÚ ĐỊNH HƯỚNG NỘI BỘ */}
                  <div className="bg-[#090F1C]/40 border border-purple-500/20 p-5 rounded-2xl flex flex-col justify-between gap-2 shadow-lg relative overflow-hidden h-full">
                    <span className="absolute right-6 bottom-2 text-purple-500/[0.04] pointer-events-none">
                      <ClipboardList className="w-24 h-24" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5 z-10">
                      <ClipboardList className="w-4 h-4 text-purple-400" /> GHI CHÚ ĐỊNH HƯỚNG NỘI BỘ
                    </span>
                    <p className="text-[13px] font-semibold leading-relaxed text-slate-300 z-10 relative mt-1 whitespace-pre-wrap flex-1 overflow-y-auto custom-scrollbar max-h-[50px]">
                      {selectedSlide.notes || 'Đã phân phối trên đa nền tảng, thu hút tệp đối tượng học sinh sinh viên tốt.'}
                    </p>
                  </div>

                   {/* Right Column: Ý KIẾN (Editable) */}
                  <div className="bg-purple-950/10 border border-purple-500/30 p-5 rounded-2xl flex flex-col justify-between gap-2 shadow-lg relative overflow-hidden h-full">
                    <span className="absolute right-6 bottom-2 text-purple-500/[0.04] pointer-events-none">
                      <MessageSquare className="w-24 h-24" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5 z-10">
                      <MessageSquare className="w-4 h-4 text-purple-300" /> Ý KIẾN
                    </span>
                    <textarea
                      value={selectedSlide.leaderComment || ''}
                      onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'leaderComment', e.target.value)}
                      placeholder="Nhập ý kiến tại đây..."
                      className="bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-2 mt-1 text-xs text-white placeholder-slate-500 outline-none transition-all resize-none relative z-10 flex-1 h-[45px] overflow-y-auto custom-scrollbar leading-relaxed"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Footer Navigation Bar */}
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 mt-6 z-10 relative">
              <button
                onClick={() => setActiveSlideIndex((prev: number) => Math.max(prev - 1, 0))}
                disabled={validSlideIndex === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-20 text-slate-300 border border-white/[0.08] rounded-xl text-xs font-bold transition-all shadow select-none"
              >
                <ChevronLeft className="w-4 h-4" /> SLIDE TRƯỚC
              </button>

              {/* Middle TIP Box */}
              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs select-none">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>TIP: NHẤN PHÍM <span className="text-white font-black">←</span> <span className="text-white font-black">→</span> ĐỂ CHUYỂN SLIDE</span>
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

      {/* Scoring Modal */}
      {isScoreModalOpen && selectedSlide && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 relative animate-fade-in text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-black uppercase tracking-wider text-foreground">
                  Chấm điểm Video
                </span>
              </div>
              <button
                onClick={() => setIsScoreModalOpen(false)}
                className="p-1 hover:bg-accent rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>



            {/* Body */}
            <div className="flex flex-col gap-4">
              {renderScoreSlider('Đánh giá video', scoreHook, handleScoreChange)}

              {/* GPA Display & Color classification */}
              {(() => {
                const { text, colorClass } = getGpaAndBadge();
                return (
                  <div className={`flex flex-col gap-1.5 p-2 rounded-xl border transition-all text-center ${colorClass}`}>
                    <span className="text-[12px] font-extrabold tracking-wider uppercase">{text}</span>
                  </div>
                );
              })()}

              {/* Nhận xét comment area */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-muted-foreground uppercase">Nhận xét / Góp ý</label>
                <textarea
                  rows={3}
                  value={scoreComment}
                  onChange={(e) => setScoreComment(e.target.value)}
                  placeholder="Nhập nhận xét của bạn về video..."
                  className="w-full bg-muted border border-border focus:border-purple-500/50 rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 border-t border-border pt-4 mt-1">
              <button
                onClick={() => setIsScoreModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border hover:bg-accent text-muted-foreground text-xs font-black tracking-wider uppercase transition-all"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  const success = await handleSaveScore();
                  if (success) {
                    setIsScoreModalOpen(false);
                  }
                }}
                disabled={isSavingScore}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-black tracking-wider uppercase transition-all shadow shadow-purple-500/20"
              >
                {isSavingScore ? 'Đang lưu...' : 'Lưu điểm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
