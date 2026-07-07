'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ReportTab from '../../../components/thong-ke/report/ReportTab';
import PresentationTab from '../../../components/thong-ke/presentation/PresentationTab';
import StatisticsTab from '../../../components/thong-ke/statistics/StatisticsTab';
import VideoModal from '../../../components/thong-ke/report/VideoModal';
import { TeamData, MeetingSession, AttendanceStatus, MeetingSessionResponse } from '../../../components/thong-ke/types';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '@/store/auth-store';

const viewsToNum = (viewsStr: any): number => {
  if (typeof viewsStr === 'number') return viewsStr;
  if (!viewsStr) return 0;
  const clean = String(viewsStr).replace(/\s*views/gi, '').trim();
  const mM = clean.match(/^([\d.]+)\s*M/i);
  if (mM) return Math.round(parseFloat(mM[1]) * 1_000_000);
  const mK = clean.match(/^([\d.]+)\s*K/i);
  if (mK) return Math.round(parseFloat(mK[1]) * 1_000);
  return parseInt(clean.replace(/[^\d]/g, ''), 10) || 0;
};

function StatisticsDashboard() {
  const searchParams = useSearchParams();
  const subParam = searchParams.get('sub');

  const [activeSubTab, setActiveSubTab] = useState<'bao-cao' | 'trinh-bay' | 'thong-ke'>('bao-cao');
  const [activeTab, setActiveTab] = useState<string>('K1');
  const [teamsList, setTeamsList] = useState<string[]>(['K1', 'K2', 'K3', 'K4', 'K5']);
  const [periodsList, setPeriodsList] = useState<any[]>([]);
  const [activeTeamData, setActiveTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeVideoModal, setActiveVideoModal] = useState<{
    url: string;
    title?: string;
    platform?: string;
  } | null>(null);

  // States for time filter (mapped to periods list on BE)
  const [filterMode, setFilterMode] = useState<'all' | 'week' | 'month'>('week');
  const [selectedWeek, setSelectedWeek] = useState<'all' | '1' | '2' | '3' | '4'>('1');

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [activeMonthData, setActiveMonthData] = useState<TeamData | null>(null);

  // States for interactive Slide presentation screen
  const [presentationMenu, setPresentationMenu] = useState<'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin'>('win');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isFullscreenSlide, setIsFullscreenSlide] = useState<boolean>(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);

  // States for advanced Statistics dashboard
  const [platformFilter, setPlatformFilter] = useState<'All' | 'TikTok' | 'Instagram Reels' | 'YouTube Shorts'>('All');
  const [editorSearchQuery, setEditorSearchQuery] = useState<string>('');
  const [editorSortBy, setEditorSortBy] = useState<'winRate' | 'totalVideos' | 'avgViews' | 'avgQualityScore'>('winRate');
  const [selectedEditorDetail, setSelectedEditorDetail] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [isLightMode, setIsLightMode] = useState<boolean>(false);

  // Current user (from auth store, for attendance)
  const authUser = useAuthStore((state) => state.user);

  // Meeting session state (attendance)
  const [meetingSession, setMeetingSession] = useState<MeetingSessionResponse | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // 1. Fetch initialization data (teams and periods list)
  useEffect(() => {
    const initData = async () => {
      try {
        const [teamsRes, periodsRes] = await Promise.all([
          apiClient.get('/content-report/teams'),
          apiClient.get('/content-report/periods')
        ]);
        if (teamsRes.data && teamsRes.data.length > 0) {
          const names = teamsRes.data.map((t: any) => t.name);
          setTeamsList(names);
          if (!names.includes(activeTab)) {
            setActiveTab(names[0]);
          }
        }
        if (periodsRes.data && periodsRes.data.length > 0) {
          setPeriodsList(periodsRes.data);
        }
      } catch (err) {
        console.error('Error initializing report page metadata:', err);
      }
    };
    initData();
  }, []);

  // 2. Resolve the active period based on filterMode and selectedWeek UI state
  const currentPeriod = useMemo(() => {
    if (!periodsList || periodsList.length === 0) return null;
    if (filterMode === 'week') {
      const targetLabel = `Tuần ${selectedWeek === 'all' ? '1' : selectedWeek}`;
      const found = periodsList.find(
        p => p.type === 'WEEK' && p.label.startsWith(targetLabel)
      );
      return found || periodsList.find(p => p.type === 'WEEK') || periodsList[0];
    } else {
      const found = periodsList.find(p => p.type === 'MONTH');
      return found || periodsList[0];
    }
  }, [periodsList, filterMode, selectedWeek]);

  // 2.5 Resolve the parent MONTH period corresponding to currentPeriod for Statistics tab
  const activeMonthPeriod = useMemo(() => {
    if (!currentPeriod || !periodsList || periodsList.length === 0) return null;
    if (currentPeriod.type === 'MONTH') return currentPeriod;
    
    // Find MONTH period that overlaps with currentPeriod start date
    const curStart = new Date(currentPeriod.start_date);
    const monthPeriod = periodsList.find(p => {
      if (p.type !== 'MONTH') return false;
      const pStart = new Date(p.start_date);
      const pEnd = new Date(p.end_date);
      return curStart >= pStart && curStart <= pEnd;
    });
    
    return monthPeriod || periodsList.find(p => p.type === 'MONTH') || null;
  }, [currentPeriod, periodsList]);

  // 3. Fetch data for current team + period (and also month data in background if needed)
  const fetchReportData = async () => {
    if (!activeTab || !currentPeriod?.id) return;
    try {
      setLoading(true);
      setActiveTeamData(null);
      
      // 1. Fetch current active period data (week or month)
      const res = await apiClient.get(`/content-report/data?team=${activeTab}&periodId=${currentPeriod.id}&_t=${Date.now()}`);
      setActiveTeamData(res.data);

      // 2. Fetch parent month period data in background if activePeriod is a week
      if (activeMonthPeriod?.id && activeMonthPeriod.id !== currentPeriod.id) {
        apiClient.get(`/content-report/data?team=${activeTab}&periodId=${activeMonthPeriod.id}&_t=${Date.now()}`)
          .then(monthRes => {
            setActiveMonthData(monthRes.data);
          })
          .catch(err => {
            console.error('Error background fetching month report data:', err);
          });
      } else {
        // If currentPeriod is already MONTH, activeMonthData is the same
        setActiveMonthData(res.data);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, currentPeriod, refreshTrigger]);

  // Fetch meeting session for Attendance Section (chỉ khi tab thong-ke active)
  const fetchMeetingSession = useCallback(async () => {
    if (!activeTab || !currentPeriod?.id || currentPeriod.type !== 'WEEK') {
      setMeetingSession(null);
      return;
    }
    try {
      const res = await apiClient.get(
        `/content-report/meetings?team=${activeTab}&periodId=${currentPeriod.id}`
      );
      setMeetingSession(res.data || null);
    } catch (err) {
      // 404 = chưa có session, không phải lỗi nghiêm trọng
      setMeetingSession(null);
    }
  }, [activeTab, currentPeriod]);

  useEffect(() => {
    if (activeSubTab === 'thong-ke') {
      fetchMeetingSession();
    }
  }, [activeSubTab, activeTab, currentPeriod, fetchMeetingSession]);

  // Self check-in handler (đưa xuống page để tái dùng fetchMeetingSession sau khi upsert)
  const handleSelfCheckIn = useCallback(async (
    sessionId: string,
    status: AttendanceStatus,
    note?: string
  ) => {
    try {
      await apiClient.post(`/content-report/meetings/${sessionId}/attendance`, { status, note });
      // Refresh session data để AttendanceSection cập nhật danh sách
      await fetchMeetingSession();
      showToast('Điểm danh thành công!', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi điểm danh';
      showToast(msg, 'error');
      throw err; // Re-throw để modal biết cần hiển thị lỗi
    }
  }, [fetchMeetingSession]);

  // Create meeting session handler
  const handleCreateMeetingSession = useCallback(async (
    scheduledAt: string,
    title?: string,
    notes?: string
  ) => {
    if (!activeTab || !currentPeriod?.id) return;
    try {
      await apiClient.post(`/content-report/meetings`, {
        team: activeTab,
        period_id: currentPeriod.id,
        scheduled_at: scheduledAt,
        title,
        notes
      });
      // Refresh session data
      await fetchMeetingSession();
      showToast('Khởi tạo buổi họp thành công!', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khởi tạo buổi họp';
      showToast(msg, 'error');
      throw err;
    }
  }, [activeTab, currentPeriod, fetchMeetingSession]);

  // Bulk update attendance handler
  const handleBulkUpdateAttendance = useCallback(async (
    sessionId: string,
    records: { user_id: string; status: AttendanceStatus; note?: string }[]
  ) => {
    try {
      await apiClient.patch(`/content-report/meetings/${sessionId}/attendance/bulk`, { records });
      // Refresh session data
      await fetchMeetingSession();
      showToast('Cập nhật điểm danh cả nhóm thành công!', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi cập nhật điểm danh cả nhóm';
      showToast(msg, 'error');
      throw err;
    }
  }, [fetchMeetingSession]);

  // Finalize attendance session handler
  const handleFinalizeSession = useCallback(async (sessionId: string) => {
    try {
      await apiClient.post(`/content-report/meetings/${sessionId}/finalize`);
      // Refresh session data
      await fetchMeetingSession();
      showToast('Chốt điểm danh buổi họp thành công!', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi chốt buổi họp';
      showToast(msg, 'error');
      throw err;
    }
  }, [fetchMeetingSession]);

  // Reopen attendance session handler
  const handleReopenSession = useCallback(async (sessionId: string) => {
    try {
      await apiClient.post(`/content-report/meetings/${sessionId}/reopen`);
      // Refresh session data
      await fetchMeetingSession();
      showToast('Mở lại buổi họp thành công!', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi mở lại buổi họp';
      showToast(msg, 'error');
      throw err;
    }
  }, [fetchMeetingSession]);

  // Sync sub tab with query param
  useEffect(() => {
    if (subParam === 'trinh-bay') {
      setActiveSubTab('trinh-bay');
    } else if (subParam === 'thong-ke') {
      setActiveSubTab('thong-ke');
    } else {
      setActiveSubTab('bao-cao');
    }
  }, [subParam]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [activeSubTab]);

  const handleSubTabChange = (tab: 'bao-cao' | 'trinh-bay' | 'thong-ke') => {
    setActiveSubTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('sub', tab);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleStartExport = (type: 'pdf' | 'excel') => {
    if (isExporting) return;
    setIsExporting(true);
    setExportType(type);
    setExportProgress(0);

    let currentProg = 0;
    const interval = setInterval(() => {
      currentProg += 10;
      setExportProgress(currentProg);
      if (currentProg >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsExporting(false);
          setExportType(null);
          setExportProgress(0);
        }, 500);
      }
    }, 150);
  };

  // Helper endpoints
  const getSheetEndpoint = (sheetName: string) => {
    switch (sheetName) {
      case '5 Content win của team':
      case '5 Content fail của team':
        return 'content-videos';
      case '5 Case Study hay bên ngoài':
        return 'case-studies';
      case 'Số video content win của cá nhân trong team':
      case 'Content mới win của cá nhân trong team/trên số video đã làm':
        return 'editor-performance';
      default:
        return null;
    }
  };

  const getCategoryEndpoint = (category: string) => {
    switch (category) {
      case 'win':
      case 'fail':
        return 'content-videos';
      case 'case':
        return 'case-studies';
      case 'clone':
        return 'clone-videos';
      case 'action':
        return 'action-items';
      case 'editorPerf':
      case 'newWin':
        return 'editor-performance';
      default:
        return null;
    }
  };

  // Construct a dummy Record<string, TeamData> to feed child components
  const teamsData = useMemo(() => {
    const result: Record<string, TeamData> = {};
    teamsList.forEach(tName => {
      if (tName === activeTab && activeTeamData) {
        result[tName] = activeTeamData;
      } else {
        result[tName] = {
          teamName: tName,
          win5Stats: { total: 0, win: 0, fail: 0, percent: '0%' },
          newVideoStats: { total: 0, win: 0, fail: 0, percent: '0%' },
          videos: [],
          failVideos: [],
          caseStudies: [],
          editorPerformance: [],
          cloneVideos: [],
          actions: []
        };
      }
    });
    return result;
  }, [teamsList, activeTab, activeTeamData]);

  // Construct teamsData with meetingSession injected for StatisticsTab
  const monthlyTeamsData = useMemo(() => {
    const result: Record<string, TeamData> = {};
    teamsList.forEach(tName => {
      if (tName === activeTab && activeMonthData) {
        result[tName] = {
          ...activeMonthData,
          // Inject meetingSession cho team đang active (WEEK period)
          meetingSession: tName === activeTab ? meetingSession : undefined,
        };
      } else {
        result[tName] = {
          teamName: tName,
          win5Stats: { total: 0, win: 0, fail: 0, percent: '0%' },
          newVideoStats: { total: 0, win: 0, fail: 0, percent: '0%' },
          videos: [],
          failVideos: [],
          caseStudies: [],
          editorPerformance: [],
          cloneVideos: [],
          actions: []
        };
      }
    });
    return result;
  }, [teamsList, activeTab, activeMonthData, meetingSession]);

  const refreshAllData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Actions for ReportTab
  const updateRowValue = async (sheetName: string, rowIndex: number, field: string, value: string, defaultPostDate?: string) => {
    const endpoint = getSheetEndpoint(sheetName);
    if (!endpoint || !activeTeamData || !currentPeriod) return;

    let list: any[] = [];
    if (sheetName === '5 Content win của team') list = activeTeamData.videos;
    else if (sheetName === '5 Content fail của team') list = activeTeamData.failVideos;
    else if (sheetName === '5 Case Study hay bên ngoài') list = activeTeamData.caseStudies;
    else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
      list = activeTeamData.editorPerformance;
    }

    if (rowIndex < list.length) {
      const item = list[rowIndex];
      if (!item.dbId) return;

      if (typeof item.dbId === 'string' && item.dbId.startsWith('temp-')) {
        console.log('Skipping PATCH for temporary row in creation process');
        return;
      }

      const payload: any = {};
      if (field === 'videoUrl') {
        payload.video_url = value;
        payload.link = value;
      }
      else if (field === 'thumbnail') payload.thumbnail_url = value;
      else if (field === 'postDate') payload.post_date = value;
      else if (field === 'platform') payload.platform = value;
      else if (field === 'views') payload.views = viewsToNum(value);
      else if (field === 'editor') payload.editor = value;
      else if (field === 'content') payload.content = value;
      else if (field === 'analysis') payload.analysis = value;
      else if (field === 'failReason') payload.analysis = value;
      else if (field === 'title') payload.title = value;
      else if (field === 'channel') payload.channel = value;
      else if (field === 'takeaway') payload.takeaway = value;
      else if (field === 'totalVideos') payload.total_videos = parseInt(value) || 0;
      else if (field === 'winVideos') payload.win_videos = parseInt(value) || 0;
      else if (field === 'notes') payload.notes = value;

      // Optimistic state update
      setActiveTeamData(prev => {
        if (!prev) return null;
        const updated = { ...prev };
        let targetList = [...list];
        if (targetList[rowIndex]) {
          targetList[rowIndex] = { ...targetList[rowIndex], [field]: value };
        }
        if (sheetName === '5 Content win của team') updated.videos = targetList;
        else if (sheetName === '5 Content fail của team') updated.failVideos = targetList;
        else if (sheetName === '5 Case Study hay bên ngoài') updated.caseStudies = targetList;
        else updated.editorPerformance = targetList;
        return updated;
      });

      try {
        await apiClient.patch(`/content-report/${endpoint}/${item.dbId}`, payload);
      } catch (err: any) {
        console.error('Error updating row:', err?.response?.data || err);
        showToast(`Lỗi cập nhật: ${err?.response?.data?.message || err?.message || 'Không xác định'}`);
        fetchReportData();
      }
    } else {
      // Create new row with Optimistic Update
      const tempDbId = `temp-${Date.now()}`;
      let tempItem: any = { dbId: tempDbId };
      const defaultDateStr = currentPeriod?.start_date
        ? new Date(currentPeriod.start_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      if (sheetName === '5 Content win của team') {
        tempItem = {
          ...tempItem,
          id: list.length + 1,
          label: `Video ${list.length + 1}`,
          content: field === 'content' ? value : 'Nhấp đúp để nhập nội dung...',
          analysis: field === 'analysis' ? value : 'Nhấp đúp để nhập phân tích...',
          editor: field === 'editor' ? value : 'Tên Editor',
          views: field === 'views' ? value : '-',
          likes: '0',
          comments: '0',
          shares: '0',
          platform: field === 'platform' ? value : 'TikTok',
          postDate: field === 'postDate' ? value : defaultDateStr,
          highlights: '',
          improvements: '',
          leaderComment: '',
          notes: '',
          thumbnail: field === 'thumbnail' ? value : '',
          videoUrl: field === 'videoUrl' ? value : '',
        };
      } else if (sheetName === '5 Content fail của team') {
        tempItem = {
          ...tempItem,
          id: list.length + 1,
          label: `Video ${list.length + 1}`,
          content: field === 'content' ? value : 'Nhấp đúp để nhập nội dung...',
          failReason: field === 'analysis' || field === 'failReason' ? value : 'Nhấp đúp để nhập lý do...',
          editor: field === 'editor' ? value : 'Tên Editor',
          views: field === 'views' ? value : '-',
          likes: '0',
          comments: '0',
          shares: '0',
          platform: field === 'platform' ? value : 'TikTok',
          postDate: field === 'postDate' ? value : defaultDateStr,
          highlights: '',
          improvements: '',
          leaderComment: '',
          notes: '',
          thumbnail: field === 'thumbnail' ? value : '',
          videoUrl: field === 'videoUrl' ? value : '',
        };
      } else if (sheetName === '5 Case Study hay bên ngoài') {
        tempItem = {
          ...tempItem,
          id: list.length + 1,
          label: `Case ${list.length + 1}`,
          title: field === 'title' ? value : 'Case Study mới',
          channel: field === 'channel' ? value : 'Tên kênh',
          views: field === 'views' ? value : '-',
          takeaway: field === 'takeaway' ? value : 'Nhấp đúp để nhập bài học...',
          postDate: field === 'postDate' ? value : defaultDateStr,
          platform: field === 'platform' ? value : 'TikTok',
        };
      } else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
        tempItem = {
          ...tempItem,
          editor: field === 'editor' ? value : 'Editor mới',
          totalVideos: field === 'totalVideos' ? parseInt(value) || 0 : 0,
          winVideos: field === 'winVideos' ? parseInt(value) || 0 : 0,
          failVideos: 0,
          winRate: '0%',
          notes: '',
          analysis: '',
        };
      }

      // Optimistic state update for mock row creation
      setActiveTeamData(prev => {
        if (!prev) return null;
        const updated = { ...prev };
        const updatedList = [...list, tempItem];
        if (sheetName === '5 Content win của team') updated.videos = updatedList;
        else if (sheetName === '5 Content fail của team') updated.failVideos = updatedList;
        else if (sheetName === '5 Case Study hay bên ngoài') updated.caseStudies = updatedList;
        else updated.editorPerformance = updatedList;
        return updated;
      });

      const payload: any = {
        team_id: activeTeamData.teamId,
        period_id: currentPeriod.id,
      };

      if (sheetName === '5 Content win của team') {
        payload.status = 'WIN';
        payload.content = field === 'content' ? value : 'Nhấp đúp để nhập nội dung...';
        payload.analysis = field === 'analysis' ? value : 'Nhấp đúp để nhập phân tích...';
        payload.editor = field === 'editor' ? value : 'Tên Editor';
        payload.post_date = field === 'postDate' ? value : defaultDateStr;
        payload.platform = field === 'platform' ? value : 'TikTok';
        if (field === 'videoUrl') {
          payload.video_url = value;
          payload.link = value;
        }
        else if (field === 'thumbnail') payload.thumbnail_url = value;
        else if (field === 'views') payload.views = viewsToNum(value);
      } else if (sheetName === '5 Content fail của team') {
        payload.status = 'FAIL';
        payload.content = field === 'content' ? value : 'Nhấp đúp để nhập nội dung...';
        payload.analysis = field === 'failReason' || field === 'analysis' ? value : 'Nhấp đúp để nhập lý do...';
        payload.editor = field === 'editor' ? value : 'Tên Editor';
        payload.post_date = field === 'postDate' ? value : defaultDateStr;
        payload.platform = field === 'platform' ? value : 'TikTok';
        if (field === 'videoUrl') {
          payload.video_url = value;
          payload.link = value;
        }
        else if (field === 'thumbnail') payload.thumbnail_url = value;
        else if (field === 'views') payload.views = viewsToNum(value);
      } else if (sheetName === '5 Case Study hay bên ngoài') {
        payload.title = field === 'title' ? value : 'Case Study mới';
        payload.channel = field === 'channel' ? value : 'Tên kênh';
        payload.views = field === 'views' ? viewsToNum(value) : 0;
        payload.takeaway = field === 'takeaway' ? value : 'Nhấp đúp để nhập bài học...';
        payload.post_date = field === 'postDate' ? value : defaultDateStr;
        payload.platform = field === 'platform' ? value : 'TikTok';
        if (field === 'videoUrl') {
          payload.video_url = value;
          payload.link = value;
        }
      } else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
        payload.editor = field === 'editor' ? value : 'Editor mới';
        payload.total_videos = field === 'totalVideos' ? parseInt(value) || 0 : 0;
        payload.win_videos = field === 'winVideos' ? parseInt(value) || 0 : 0;
      }

      try {
        await apiClient.post(`/content-report/${endpoint}`, payload);
        fetchReportData();
      } catch (err: any) {
        console.error('Error creating row:', err?.response?.data || err);
        showToast(`Lỗi tạo dòng mới: ${err?.response?.data?.message || err?.message || 'Không xác định'}`);
        fetchReportData();
      }
    }
  };

  const deleteRow = async (sheetName: string, rowIndex: number) => {
    const endpoint = getSheetEndpoint(sheetName);
    if (!endpoint || !activeTeamData) return;

    let list: any[] = [];
    if (sheetName === '5 Content win của team') list = activeTeamData.videos;
    else if (sheetName === '5 Content fail của team') list = activeTeamData.failVideos;
    else if (sheetName === '5 Case Study hay bên ngoài') list = activeTeamData.caseStudies;
    else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
      list = activeTeamData.editorPerformance;
    }

    if (rowIndex < list.length) {
      const item = list[rowIndex];
      if (!item.dbId) return;

      // Optimistic delete
      setActiveTeamData(prev => {
        if (!prev) return null;
        const updated = { ...prev };
        if (sheetName === '5 Content win của team') updated.videos = updated.videos.filter((_, idx) => idx !== rowIndex);
        else if (sheetName === '5 Content fail của team') updated.failVideos = updated.failVideos.filter((_, idx) => idx !== rowIndex);
        else if (sheetName === '5 Case Study hay bên ngoài') updated.caseStudies = updated.caseStudies.filter((_, idx) => idx !== rowIndex);
        else updated.editorPerformance = updated.editorPerformance.filter((_, idx) => idx !== rowIndex);
        return updated;
      });

      try {
        await apiClient.delete(`/content-report/${endpoint}/${item.dbId}`);
      } catch (err: any) {
        console.error('Error deleting row:', err?.response?.data || err);
        showToast(`Lỗi xóa dòng: ${err?.response?.data?.message || err?.message || 'Không xác định'}`);
        fetchReportData();
      }
    }
  };

  const addRow = async (sheetName: string, defaultPostDate?: string) => {
    const endpoint = getSheetEndpoint(sheetName);
    if (!endpoint || !activeTeamData || !currentPeriod) return;

    let list: any[] = [];
    if (sheetName === '5 Content win của team') list = activeTeamData.videos;
    else if (sheetName === '5 Content fail của team') list = activeTeamData.failVideos;
    else if (sheetName === '5 Case Study hay bên ngoài') list = activeTeamData.caseStudies;
    else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
      list = activeTeamData.editorPerformance;
    }

    const tempDbId = `temp-${Date.now()}`;
    let tempItem: any = { dbId: tempDbId };
    const defaultDateStr = currentPeriod?.start_date
      ? new Date(currentPeriod.start_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const payload: any = {
      team_id: activeTeamData.teamId,
      period_id: currentPeriod.id,
    };

    if (sheetName === '5 Content win của team') {
      tempItem = {
        ...tempItem,
        id: list.length + 1,
        label: `Video ${list.length + 1}`,
        content: 'Nhấp đúp để nhập nội dung...',
        analysis: 'Nhấp đúp để nhập phân tích...',
        editor: 'Tên Editor',
        views: '-',
        likes: '0',
        comments: '0',
        shares: '0',
        platform: 'TikTok',
        postDate: defaultDateStr,
        highlights: '',
        improvements: '',
        leaderComment: '',
        notes: '',
        thumbnail: '',
        videoUrl: '',
      };

      payload.status = 'WIN';
      payload.content = tempItem.content;
      payload.analysis = tempItem.analysis;
      payload.editor = tempItem.editor;
      payload.post_date = tempItem.postDate;
      payload.platform = tempItem.platform;
    } else if (sheetName === '5 Content fail của team') {
      tempItem = {
        ...tempItem,
        id: list.length + 1,
        label: `Video ${list.length + 1}`,
        content: 'Nhấp đúp để nhập nội dung...',
        failReason: 'Nhấp đúp để nhập lý do...',
        editor: 'Tên Editor',
        views: '-',
        likes: '0',
        comments: '0',
        shares: '0',
        platform: 'TikTok',
        postDate: defaultDateStr,
        highlights: '',
        improvements: '',
        leaderComment: '',
        notes: '',
        thumbnail: '',
        videoUrl: '',
      };

      payload.status = 'FAIL';
      payload.content = tempItem.content;
      payload.analysis = tempItem.failReason;
      payload.editor = tempItem.editor;
      payload.post_date = tempItem.postDate;
      payload.platform = tempItem.platform;
    } else if (sheetName === '5 Case Study hay bên ngoài') {
      tempItem = {
        ...tempItem,
        id: list.length + 1,
        label: `Case ${list.length + 1}`,
        title: 'Case Study mới',
        channel: 'Tên kênh',
        views: '-',
        takeaway: 'Nhấp đúp để nhập bài học...',
        postDate: defaultDateStr,
        platform: 'TikTok',
      };

      payload.title = tempItem.title;
      payload.channel = tempItem.channel;
      payload.views = 0;
      payload.takeaway = tempItem.takeaway;
      payload.post_date = tempItem.postDate;
      payload.platform = tempItem.platform;
    } else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
      tempItem = {
        ...tempItem,
        editor: 'Editor mới',
        totalVideos: 0,
        winVideos: 0,
        failVideos: 0,
        winRate: '0%',
        notes: '',
        analysis: '',
      };

      payload.editor = tempItem.editor;
      payload.total_videos = 0;
      payload.win_videos = 0;
    }

    // Optimistic state update: append the temporary row immediately
    setActiveTeamData(prev => {
      if (!prev) return null;
      const updated = { ...prev };
      const updatedList = [...list, tempItem];
      if (sheetName === '5 Content win của team') updated.videos = updatedList;
      else if (sheetName === '5 Content fail của team') updated.failVideos = updatedList;
      else if (sheetName === '5 Case Study hay bên ngoài') updated.caseStudies = updatedList;
      else updated.editorPerformance = updatedList;
      return updated;
    });

    try {
      const res = await apiClient.post(`/content-report/${endpoint}`, payload);
      const newDbId = res.data?.id;
      if (newDbId) {
        // Swap temp ID with real DB ID in state immediately
        setActiveTeamData(prev => {
          if (!prev) return null;
          const updated = { ...prev };

          const updateList = (items: any[]) =>
            items.map(item => {
              if (item.dbId === tempDbId) {
                const updatedItem = { ...item, dbId: newDbId };
                // If user edited fields while creation was pending, sync those edits
                const modifiedFields: any = {};
                if (item.content !== tempItem.content) modifiedFields.content = item.content;
                if (item.analysis !== tempItem.analysis) modifiedFields.analysis = item.analysis;
                if (item.failReason !== tempItem.failReason) modifiedFields.analysis = item.failReason;
                if (item.editor !== tempItem.editor) modifiedFields.editor = item.editor;
                if (item.postDate !== tempItem.postDate) modifiedFields.post_date = item.postDate;
                if (item.platform !== tempItem.platform) modifiedFields.platform = item.platform;
                if (item.videoUrl !== tempItem.videoUrl) {
                  modifiedFields.video_url = item.videoUrl;
                  modifiedFields.link = item.videoUrl;
                }
                if (item.thumbnail !== tempItem.thumbnail) modifiedFields.thumbnail_url = item.thumbnail;
                if (item.views !== tempItem.views) modifiedFields.views = viewsToNum(item.views);

                if (Object.keys(modifiedFields).length > 0) {
                  apiClient.patch(`/content-report/${endpoint}/${newDbId}`, modifiedFields)
                    .catch(e => console.error('Error syncing deferred edits:', e));
                }
                return updatedItem;
              }
              return item;
            });

          if (sheetName === '5 Content win của team') updated.videos = updateList(updated.videos);
          else if (sheetName === '5 Content fail của team') updated.failVideos = updateList(updated.failVideos);
          else if (sheetName === '5 Case Study hay bên ngoài') updated.caseStudies = updateList(updated.caseStudies);
          else updated.editorPerformance = updateList(updated.editorPerformance);
          return updated;
        });
      }
    } catch (err) {
      console.error('Error adding row:', err);
      // Revert optimistic update on error by reloading
      fetchReportData();
    }
  };

  // Actions for PresentationTab
  const updateSlideField = async (category: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin', index: number, field: string, value: string) => {
    const endpoint = getCategoryEndpoint(category);
    if (!endpoint || !activeTeamData) return;

    let list: any[] = [];
    if (category === 'win') list = activeTeamData.videos;
    else if (category === 'fail') list = activeTeamData.failVideos;
    else if (category === 'case') list = activeTeamData.caseStudies;
    else if (category === 'clone') list = activeTeamData.cloneVideos || [];
    else if (category === 'action') list = activeTeamData.actions || [];
    else list = activeTeamData.editorPerformance;

    if (list[index]) {
      const item = list[index];
      if (!item.dbId) return;

      const payload: any = {};
      if (field === 'videoUrl') payload.video_url = value;
      else if (field === 'thumbnail') payload.thumbnail_url = value;
      else if (field === 'postDate') payload.post_date = value;
      else if (field === 'views') payload.views = viewsToNum(value);
      else if (field === 'editor') payload.editor = value;
      else if (field === 'content') payload.content = value;
      else if (field === 'analysis') payload.analysis = value;
      else if (field === 'failReason') payload.analysis = value;
      else if (field === 'title') payload.title = value;
      else if (field === 'channel') payload.channel = value;
      else if (field === 'takeaway') payload.takeaway = value;
      else if (field === 'totalVideos') payload.total_videos = parseInt(value) || 0;
      else if (field === 'winVideos') payload.win_videos = parseInt(value) || 0;
      else if (field === 'notes') payload.notes = value;

      // Clone specifics
      else if (field === 'targetChannel') payload.target_channel = value;
      else if (field === 'likes') payload.likes = parseInt(value) || 0;
      else if (field === 'comments') payload.comments = parseInt(value) || 0;
      else if (field === 'shares') payload.shares = parseInt(value) || 0;
      else if (field === 'platform') payload.platform = value;
      else if (field === 'highlights') payload.highlights = value;
      else if (field === 'improvements') payload.improvements = value;
      else if (field === 'leaderComment') payload.leader_comment = value;

      // Action specifics
      else if (field === 'description') payload.description = value;
      else if (field === 'deadline') payload.deadline = value;
      else if (field === 'status') payload.status = value;
      else if (field === 'priority') payload.priority = value;
      else if (field === 'assignee') payload.assignee = value;

      // Optimistic update
      setActiveTeamData(prev => {
        if (!prev) return null;
        const updated = { ...prev };
        let targetList = [...list];
        if (targetList[index]) {
          targetList[index] = { ...targetList[index], [field]: value };
        }
        if (category === 'win') updated.videos = targetList;
        else if (category === 'fail') updated.failVideos = targetList;
        else if (category === 'case') updated.caseStudies = targetList;
        else if (category === 'clone') updated.cloneVideos = targetList;
        else if (category === 'action') updated.actions = targetList;
        else updated.editorPerformance = targetList;
        return updated;
      });

      try {
        await apiClient.patch(`/content-report/${endpoint}/${item.dbId}`, payload);
      } catch (err: any) {
        console.error('Error updating slide field:', err?.response?.data || err);
        showToast(`Lỗi cập nhật slide: ${err?.response?.data?.message || err?.message || 'Không xác định'}`);
        fetchReportData();
      }
    }
  };

  const handlePlayVideo = (url: string, title?: string, platform?: string) => {
    if (!url) return;
    setActiveVideoModal({ url, title, platform });
  };

  const addSlide = async (category: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin') => {
    const endpoint = getCategoryEndpoint(category);
    if (!endpoint || !activeTeamData || !currentPeriod) return;

    const payload: any = {
      team_id: activeTeamData.teamId,
      period_id: currentPeriod.id,
    };

    if (category === 'win') {
      payload.status = 'WIN';
      payload.content = 'Nhập nội dung video...';
      payload.analysis = 'Nhập phân tích tại sau win...';
      payload.editor = activeTeamData.videos[0]?.editor || 'Đỗ Thị Nga';
      payload.views = 500000;
      payload.likes = 25000;
      payload.comments = 120;
      payload.shares = 2500;
      payload.platform = 'TikTok';
      payload.post_date = new Date().toISOString().split('T')[0];
      payload.highlights = 'Nhập điểm sáng nổi bật...';
      payload.improvements = 'Nhập điểm cần cải thiện...';
      payload.leader_comment = 'Nhập ý kiến của leader...';
      payload.notes = 'Ghi chú nội bộ...';
    } else if (category === 'fail') {
      payload.status = 'FAIL';
      payload.content = 'Nhập nội dung video...';
      payload.analysis = 'Nhập lý do tại sao không win...';
      payload.editor = activeTeamData.failVideos[0]?.editor || 'Mai Anh';
      payload.views = 2500;
      payload.likes = 15;
      payload.comments = 2;
      payload.shares = 0;
      payload.platform = 'TikTok';
      payload.post_date = new Date().toISOString().split('T')[0];
      payload.highlights = 'Nhập điểm sáng nổi bật...';
      payload.improvements = 'Nhập điểm cần cải thiện...';
      payload.leader_comment = 'Nhập ý kiến của leader...';
      payload.notes = 'Ghi chú nội bộ...';
    } else if (category === 'case') {
      payload.title = 'Nhập tiêu đề case study...';
      payload.channel = 'Nhập tên kênh đối thủ...';
      payload.views = 1500000;
      payload.likes = 75000;
      payload.comments = 250;
      payload.shares = 4200;
      payload.platform = 'TikTok';
      payload.post_date = new Date().toISOString().split('T')[0];
      payload.takeaway = 'Nhập bài học rút ra và hướng áp dụng...';
      payload.highlights = 'Nhập điểm sáng nổi bật...';
      payload.improvements = 'Nhập điểm cần cải thiện...';
      payload.leader_comment = 'Nhập ý kiến của leader...';
      payload.notes = 'Ghi chú nội bộ...';
    } else if (category === 'clone') {
      payload.content = 'Nhập nội dung video cần clone...';
      payload.target_channel = 'Kênh mục tiêu';
      payload.editor = activeTeamData.videos[0]?.editor || 'Đỗ Thị Nga';
      payload.views = 800000;
      payload.likes = 40000;
      payload.comments = 300;
      payload.shares = 1200;
      payload.platform = 'TikTok';
      payload.post_date = new Date().toISOString().split('T')[0];
      payload.analysis = 'Tại sao chọn clone video này?';
      payload.highlights = 'Nhập điểm sáng nổi bật...';
      payload.improvements = 'Nhập điểm cần cải thiện...';
      payload.leader_comment = 'Nhập ý kiến của leader...';
      payload.notes = 'Ghi chú nội bộ...';
    } else if (category === 'action') {
      payload.title = 'Hành động mới';
      payload.description = 'Mô tả chi tiết hành động...';
      payload.assignee = 'Người chịu trách nhiệm';
      payload.deadline = new Date().toISOString().split('T')[0];
      payload.status = 'PENDING';
      payload.priority = 'MEDIUM';
      payload.notes = 'Ghi chú thêm...';
      payload.leader_comment = 'Định hướng từ leader...';
    } else {
      payload.editor = 'Editor mới';
      payload.total_videos = 0;
      payload.win_videos = 0;
    }

    try {
      await apiClient.post(`/content-report/${endpoint}`, payload);
      await fetchReportData();

      // Determine new slide index
      let targetListLength = 0;
      if (category === 'win') targetListLength = (activeTeamData?.videos.length || 0) + 1;
      else if (category === 'fail') targetListLength = (activeTeamData?.failVideos.length || 0) + 1;
      else if (category === 'case') targetListLength = (activeTeamData?.caseStudies.length || 0) + 1;
      else if (category === 'clone') targetListLength = ((activeTeamData?.cloneVideos || []).length) + 1;
      else if (category === 'action') targetListLength = ((activeTeamData?.actions || []).length) + 1;
      else targetListLength = (activeTeamData?.editorPerformance.length || 0) + 1;

      setActiveSlideIndex(targetListLength - 1);
    } catch (err: any) {
      console.error('Error adding slide:', err?.response?.data || err);
      showToast(`Lỗi thêm slide: ${err?.response?.data?.message || err?.message || 'Không xác định'}`);
    }
  };

  const deleteSlide = async (category: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin', index: number) => {
    const endpoint = getCategoryEndpoint(category);
    if (!endpoint || !activeTeamData) return;

    let list: any[] = [];
    if (category === 'win') list = activeTeamData.videos;
    else if (category === 'fail') list = activeTeamData.failVideos;
    else if (category === 'case') list = activeTeamData.caseStudies;
    else if (category === 'clone') list = activeTeamData.cloneVideos || [];
    else if (category === 'action') list = activeTeamData.actions || [];
    else list = activeTeamData.editorPerformance;

    if (list[index]) {
      const item = list[index];
      if (!item.dbId) return;

      // Optimistic delete
      setActiveTeamData(prev => {
        if (!prev) return null;
        const updated = { ...prev };
        const targetList = list.filter((_, idx) => idx !== index);
        if (category === 'win') updated.videos = targetList;
        else if (category === 'fail') updated.failVideos = targetList;
        else if (category === 'case') updated.caseStudies = targetList;
        else if (category === 'clone') updated.cloneVideos = targetList;
        else if (category === 'action') updated.actions = targetList;
        else updated.editorPerformance = targetList;
        return updated;
      });

      try {
        await apiClient.delete(`/content-report/${endpoint}/${item.dbId}`);
        setActiveSlideIndex(prev => Math.max(0, prev - 1));
      } catch (err: any) {
        console.error('Error deleting slide:', err?.response?.data || err);
        showToast(`Lỗi xóa slide: ${err?.response?.data?.message || err?.message || 'Không xác định'}`);
        fetchReportData();
      }
    }
  };

  if (loading && !activeTeamData) {
    return (
      <div className="-m-6 p-8 min-h-[calc(100vh-64px)] bg-[#0b0f19] text-white flex flex-col items-center justify-center gap-4 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <div className="text-slate-400 text-sm">Đang tải dữ liệu báo cáo content...</div>
      </div>
    );
  }

  return (
    <div className={`-m-6 p-8 bg-[#0b0f19] text-white flex flex-col gap-6 font-sans ${isLightMode ? 'light-mode-override bg-[#f8fafc]' : ''} ${activeSubTab === 'trinh-bay' ? 'lg:h-[calc(100vh-64px)] lg:overflow-hidden pb-8' : 'min-h-[calc(100vh-64px)] pb-20'}`}>

      {/* Sub-navigation Tabs */}
      <div className="flex justify-between items-center border-b border-white/[0.08] pr-2">
        <div className="flex gap-8">
          {[
            { key: 'bao-cao', label: 'Báo cáo' },
            { key: 'trinh-bay', label: 'Trình bày' },
            { key: 'thong-ke', label: 'Thống kê' }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => handleSubTabChange(item.key as any)}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-150 ${activeSubTab === item.key
                ? 'border-blue-500 text-blue-400 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-200'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsLightMode(!isLightMode)}
          className="pb-3 text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center gap-1.5 focus:outline-none select-none"
          title="Chuyển chế độ Sáng/Tối"
        >
          {isLightMode ? '🌙 Chế độ Tối' : '☀️ Chế độ Sáng'}
        </button>
      </div>

      {activeSubTab === 'bao-cao' && (
        <ReportTab
          teamsData={teamsData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onUpdateRow={updateRowValue}
          onDeleteRow={deleteRow}
          onAddRow={addRow}
          filterMode={filterMode}
          selectedWeek={selectedWeek}
          onFilterModeChange={setFilterMode}
          onWeekChange={setSelectedWeek}
        />
      )}

      {activeSubTab === 'trinh-bay' && (
        <PresentationTab
          teamsData={teamsData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          presentationMenu={presentationMenu}
          setPresentationMenu={setPresentationMenu}
          activeSlideIndex={activeSlideIndex}
          setActiveSlideIndex={setActiveSlideIndex}
          isFullscreenSlide={isFullscreenSlide}
          setIsFullscreenSlide={setIsFullscreenSlide}
          isPlayingVideo={isPlayingVideo}
          setIsPlayingVideo={setIsPlayingVideo}
          updateSlideField={updateSlideField}
          addSlide={addSlide}
          deleteSlide={deleteSlide}
          showToast={showToast}
          onRefreshData={refreshAllData}
        />
      )}

      {activeSubTab === 'thong-ke' && (
        <StatisticsTab
          teamsData={monthlyTeamsData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          platformFilter={platformFilter}
          setPlatformFilter={setPlatformFilter}
          editorSearchQuery={editorSearchQuery}
          setEditorSearchQuery={setEditorSearchQuery}
          editorSortBy={editorSortBy}
          setEditorSortBy={setEditorSortBy}
          selectedEditorDetail={selectedEditorDetail}
          setSelectedEditorDetail={setSelectedEditorDetail}
          isExporting={isExporting}
          exportProgress={exportProgress}
          exportType={exportType}
          handleStartExport={handleStartExport}
          filterMode={filterMode}
          currentPeriod={currentPeriod}
          currentUserId={authUser?.id}
          currentUserName={authUser?.full_name}
          currentUserRoles={authUser?.roles}
          onSelfCheckIn={handleSelfCheckIn}
          onCreateSession={handleCreateMeetingSession}
          onBulkUpdate={handleBulkUpdateAttendance}
          onFinalizeSession={handleFinalizeSession}
          onReopenSession={handleReopenSession}
          showToast={showToast}
        />
      )}

      <VideoModal
        isOpen={!!activeVideoModal}
        onClose={() => setActiveVideoModal(null)}
        videoUrl={activeVideoModal?.url || ''}
        title={activeVideoModal?.title}
        platform={activeVideoModal?.platform}
      />

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-3 animate-[slideUp_0.3s_ease-out] ${toast.type === 'error'
          ? 'bg-red-500/90 text-white border border-red-400/30'
          : 'bg-emerald-500/90 text-white border border-emerald-400/30'
          }`}>
          <span>{toast.type === 'error' ? '❌' : '✅'}</span>
          <span className="max-w-[400px] truncate">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white text-lg leading-none">&times;</button>
        </div>
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .light-mode-override {
          background-color: #f8fafc !important;
          color: #1e293b !important;
        }
        .light-mode-override [class*="bg-[#0b0f19]"] {
          background-color: #f8fafc !important;
        }
        .light-mode-override [class*="bg-[#131d31]"],
        .light-mode-override [class*="bg-[#0e1626]/50"] {
          background-color: #ffffff !important;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 2px 8px -1px rgba(0, 0, 0, 0.02) !important;
          border-color: rgba(0, 0, 0, 0.06) !important;
        }
        .light-mode-override [class*="bg-[#0c1322]"] {
          background-color: #f1f5f9 !important;
          border-color: rgba(0, 0, 0, 0.05) !important;
        }
        .light-mode-override [class*="bg-[#090e18]"] {
          background-color: #f8fafc !important;
          border-color: rgba(0, 0, 0, 0.05) !important;
        }
        .light-mode-override [class*="bg-[#090F1C]"] {
          background-color: #ffffff !important;
        }
        .light-mode-override [class*="bg-white/[0.02]"] {
          background-color: #f8fafc !important;
        }
        .light-mode-override [class*="bg-white/[0.03]"] {
          background-color: #f1f5f9 !important;
        }
        .light-mode-override [class*="bg-white/[0.04]"] {
          background-color: #e2e8f0 !important;
        }
        .light-mode-override [class*="bg-slate-900"] {
          background-color: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.06) !important;
        }
        .light-mode-override [class*="bg-emerald-500/[0.025]"] {
          background-color: #f0fdf4 !important;
          border-color: #bbf7d0 !important;
        }
        .light-mode-override [class*="bg-sky-500/[0.025]"] {
          background-color: #f0f9ff !important;
          border-color: #bae6fd !important;
        }
        .light-mode-override [class*="bg-rose-500/[0.025]"] {
          background-color: #fef2f2 !important;
          border-color: #fecaca !important;
        }
        .light-mode-override [class*="bg-amber-500/[0.025]"] {
          background-color: #fffbeb !important;
          border-color: #fef3c7 !important;
        }
        .light-mode-override [class*="bg-indigo-500/[0.025]"] {
          background-color: #f5f3ff !important;
          border-color: #ddd6fe !important;
        }
        .light-mode-override [class*="bg-[#bfdbfe]"] {
          background-color: #2563eb !important;
          color: #ffffff !important;
        }
        .light-mode-override [class*="text-[#1e3a8a]"] {
          color: #1e3a8a !important;
        }
        .light-mode-override [class*="text-white"] {
          color: #1e293b !important;
        }
        .light-mode-override [class*="text-slate-100"] {
          color: #1e293b !important;
        }
        .light-mode-override [class*="text-slate-200"] {
          color: #334155 !important;
        }
        .light-mode-override [class*="text-slate-300"] {
          color: #475569 !important;
        }
        .light-mode-override [class*="text-slate-400"] {
          color: #64748b !important;
        }
        .light-mode-override [class*="text-slate-500"] {
          color: #94a3b8 !important;
        }
        .light-mode-override [class*="text-blue-400"] {
          color: #2563eb !important;
        }
        .light-mode-override [class*="text-blue-300"] {
          color: #1d4ed8 !important;
        }
        .light-mode-override [class*="text-emerald-400"] {
          color: #16a34a !important;
        }
        .light-mode-override [class*="text-purple-400"] {
          color: #7c3aed !important;
        }
        .light-mode-override [class*="text-amber-400"] {
          color: #d97706 !important;
        }
        .light-mode-override [class*="text-rose-400"] {
          color: #dc2626 !important;
        }
        .light-mode-override [class*="border-white/[0.08]"] {
          border-color: rgba(0, 0, 0, 0.08) !important;
        }
        .light-mode-override [class*="border-white/[0.06]"] {
          border-color: rgba(0, 0, 0, 0.06) !important;
        }
        .light-mode-override [class*="border-white/[0.05]"] {
          border-color: rgba(0, 0, 0, 0.05) !important;
        }
        .light-mode-override [class*="border-white/10"] {
          border-color: rgba(0, 0, 0, 0.08) !important;
        }
        .light-mode-override [class*="border-white/5"] {
          border-color: rgba(0, 0, 0, 0.06) !important;
        }
        .light-mode-override [class*="border-purple-500/20"] {
          border-color: #d8b4fe !important;
        }
        .light-mode-override [class*="border-blue-500/20"] {
          border-color: #93c5fd !important;
        }
        .light-mode-override [class*="border-emerald-500/20"] {
          border-color: #86efac !important;
        }
        .light-mode-override [class*="border-l-emerald-500"] {
          border-left-color: #10b981 !important;
        }
        .light-mode-override [class*="border-l-sky-500"] {
          border-left-color: #0284c7 !important;
        }
        .light-mode-override [class*="border-l-rose-500"] {
          border-left-color: #ef4444 !important;
        }
        .light-mode-override [class*="border-l-amber-500"] {
          border-left-color: #f59e0b !important;
        }
        .light-mode-override [class*="border-l-indigo-500"] {
          border-left-color: #6366f1 !important;
        }
        .light-mode-override [class*="bg-emerald-500/10"] {
          background-color: #dcfce7 !important;
          border-color: #bbf7d0 !important;
          color: #15803d !important;
        }
        .light-mode-override [class*="bg-red-500/10"],
        .light-mode-override [class*="bg-rose-500/10"] {
          background-color: #fee2e2 !important;
          border-color: #fecaca !important;
          color: #b91c1c !important;
        }
        .light-mode-override [class*="bg-blue-500/10"] {
          background-color: #dbeafe !important;
          border-color: #bfdbfe !important;
          color: #1e40af !important;
        }
        .light-mode-override [class*="bg-purple-500/10"] {
          background-color: #f3e8ff !important;
          border-color: #e9d5ff !important;
          color: #6b21a8 !important;
        }
        .light-mode-override [class*="hover:bg-white/[0.03]"]:hover {
          background-color: #f1f5f9 !important;
        }
        .light-mode-override [class*="hover:bg-white/[0.02]"]:hover {
          background-color: #f8fafc !important;
        }
        .light-mode-override [class*="focus-within:bg-white/[0.04]"]:focus-within {
          background-color: #f8fafc !important;
        }
        .light-mode-override [class*="focus:bg-white/[0.04]"]:focus {
          background-color: #f8fafc !important;
        }
        .light-mode-override [class*="hover:text-blue-300"]:hover {
          color: #1d4ed8 !important;
        }
        .light-mode-override [class*="hover:text-slate-100"]:hover {
          color: #1e293b !important;
        }
        .light-mode-override [class*="hover:text-slate-200"]:hover {
          color: #334155 !important;
        }
        .light-mode-override [class*="bg-[#060814]/95"] {
          background-color: rgba(255, 255, 255, 0.95) !important;
        }
        .light-mode-override [class*="bg-black"] {
          background-color: #ffffff !important;
        }
        .light-mode-override ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.12) !important;
        }
        .light-mode-override ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.24) !important;
        }
        .light-mode-override ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02) !important;
        }

        /* Solid pastel colors for podium pillars in Light Mode */
        .light-mode-override [class*="from-slate-500/10"] {
          background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%) !important;
          border-color: #cbd5e1 !important;
        }
        .light-mode-override [class*="from-amber-600/10"] {
          background: linear-gradient(180deg, #fef3c7 0%, #fde68a 100%) !important;
          border-color: #fcd34d !important;
        }
        .light-mode-override [class*="from-orange-700/10"] {
          background: linear-gradient(180deg, #ffedd5 0%, #fed7aa 100%) !important;
          border-color: #fdba74 !important;
        }
        .light-mode-override [class*="text-amber-300"] {
          color: #78350f !important;
        }
        .light-mode-override [class*="text-orange-400"] {
          color: #7c2d12 !important;
        }
        .light-mode-override [class*="text-amber-200"] {
          color: #78350f !important;
        }
        .light-mode-override [class*="bg-[#0c1322]/20"] {
          background-color: #f8fafc !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
        }
        .light-mode-override [class*="bg-[#0b101d]/60"] {
          background-color: #e2e8f0 !important;
        }
        .light-mode-override [class*="bg-slate-950/60"] {
          background-color: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
          color: #1e293b !important;
        }
        .light-mode-override [class*="bg-[#0e1626]/95"] {
          background-color: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08) !important;
        }
        .light-mode-override table thead tr {
          border-bottom-color: rgba(0, 0, 0, 0.08) !important;
        }
        .light-mode-override table tbody tr {
          border-bottom-color: rgba(0, 0, 0, 0.04) !important;
        }
        .light-mode-override table thead th {
          color: #475569 !important;
        }
        .light-mode-override input {
          background-color: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
          color: #1e293b !important;
        }
        .light-mode-override input::placeholder {
          color: #94a3b8 !important;
        }
      `}} />
    </div>
  );
}

export default function ThongKePage() {
  return (
    <Suspense fallback={
      <div className="-m-6 p-8 min-h-[calc(100vh-64px)] bg-[#0b0f19] text-white flex items-center justify-center">
        <div className="text-slate-400 text-sm">Đang tải báo cáo...</div>
      </div>
    }>
      <StatisticsDashboard />
    </Suspense>
  );
}
