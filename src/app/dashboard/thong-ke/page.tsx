'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReportTab from '../../../components/thong-ke/report/ReportTab';
import PresentationTab from '../../../components/thong-ke/presentation/PresentationTab';
import StatisticsTab from '../../../components/thong-ke/statistics/StatisticsTab';
import VideoModal from '../../../components/thong-ke/report/VideoModal';
import { TeamData } from '../../../components/thong-ke/types';
import { apiClient } from '../../../lib/api-client';

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

  // States for interactive Slide presentation screen
  const [presentationMenu, setPresentationMenu] = useState<'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin'>('win');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isFullscreenSlide, setIsFullscreenSlide] = useState<boolean>(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);

  // States for advanced Statistics dashboard
  const [platformFilter, setPlatformFilter] = useState<'All' | 'TikTok' | 'Instagram Reels' | 'YouTube Shorts'>('All');
  const [editorSearchQuery, setEditorSearchQuery] = useState<string>('');
  const [editorSortBy, setEditorSortBy] = useState<'winRate' | 'totalVideos' | 'avgViews'>('winRate');
  const [selectedEditorDetail, setSelectedEditorDetail] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);

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

  // 3. Fetch data for current team + period
  const fetchReportData = async () => {
    if (!activeTab || !currentPeriod?.id) return;
    try {
      setLoading(true);
      // Added _t timestamp to prevent aggressive browser caching
      const res = await apiClient.get(`/content-report/data?team=${activeTab}&periodId=${currentPeriod.id}&_t=${Date.now()}`);
      setActiveTeamData(res.data);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, currentPeriod]);

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
      } catch (err) {
        console.error('Error updating row:', err);
        fetchReportData();
      }
    } else {
      // Create new row with Optimistic Update
      const tempDbId = `temp-${Date.now()}`;
      let tempItem: any = { dbId: tempDbId };
      const defaultDateStr = defaultPostDate || new Date().toISOString().split('T')[0];

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
      } catch (err) {
        console.error('Error creating row:', err);
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
      } catch (err) {
        console.error('Error deleting row:', err);
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
    const defaultDateStr = defaultPostDate || new Date().toISOString().split('T')[0];

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
      } catch (err) {
        console.error('Error updating slide field:', err);
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
    } catch (err) {
      console.error('Error adding slide:', err);
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
      } catch (err) {
        console.error('Error deleting slide:', err);
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
    <div className={`-m-6 p-8 bg-[#0b0f19] text-white flex flex-col gap-6 font-sans ${activeSubTab === 'trinh-bay' ? 'lg:h-[calc(100vh-64px)] lg:overflow-hidden pb-8' : 'min-h-[calc(100vh-64px)] pb-20'}`}>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-white/[0.08] gap-8">
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
        />
      )}

      {activeSubTab === 'thong-ke' && (
        <StatisticsTab
          teamsData={teamsData}
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
        />
      )}

      <VideoModal
        isOpen={!!activeVideoModal}
        onClose={() => setActiveVideoModal(null)}
        videoUrl={activeVideoModal?.url || ''}
        title={activeVideoModal?.title}
        platform={activeVideoModal?.platform}
      />
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
