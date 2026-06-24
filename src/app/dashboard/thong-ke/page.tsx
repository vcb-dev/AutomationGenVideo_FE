'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReportTab from '../../../components/thong-ke/report/ReportTab';
import PresentationTab from '../../../components/thong-ke/presentation/PresentationTab';
import StatisticsTab from '../../../components/thong-ke/statistics/StatisticsTab';
import { TeamData } from '../../../components/thong-ke/types';
import { TEAMS_DATA } from '../../../components/thong-ke/constants';
import { enrichTeamsData } from '../../../components/thong-ke/utils';

function StatisticsDashboard() {
  const searchParams = useSearchParams();
  const subParam = searchParams.get('sub');

  const [activeSubTab, setActiveSubTab] = useState<'bao-cao' | 'trinh-bay' | 'thong-ke'>('bao-cao');
  const [activeTab, setActiveTab] = useState<string>('K1');
  const [teamsData, setTeamsData] = useState<Record<string, TeamData>>(() => enrichTeamsData(TEAMS_DATA) as any);

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

  // Actions for ReportTab
  const updateRowValue = (sheetName: string, rowIndex: number, field: string, value: string, defaultPostDate?: string) => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      if (sheetName === '5 Content win của team') {
        const list = [...teamData.videos];
        while (list.length <= rowIndex) {
          list.push({
            id: list.length + 1,
            label: `Video ${list.length + 1}`,
            content: '',
            analysis: '',
            editor: 'Tên Editor',
            views: '0 views',
            postDate: defaultPostDate || new Date().toISOString().split('T')[0]
          });
        }
        list[rowIndex] = { ...list[rowIndex], [field]: value };
        teamData.videos = list;
      } else if (sheetName === '5 Content fail của team') {
        const list = [...teamData.failVideos];
        while (list.length <= rowIndex) {
          list.push({
            id: list.length + 1,
            label: `Video ${list.length + 1}`,
            content: '',
            failReason: '',
            editor: 'Tên Editor',
            views: '0 views',
            postDate: defaultPostDate || new Date().toISOString().split('T')[0]
          });
        }
        list[rowIndex] = { ...list[rowIndex], [field]: value };
        teamData.failVideos = list;
      } else if (sheetName === '5 Case Study hay bên ngoài') {
        const list = [...teamData.caseStudies];
        while (list.length <= rowIndex) {
          list.push({
            id: list.length + 1,
            label: `Case ${list.length + 1}`,
            title: '',
            channel: 'Tên kênh',
            views: '0 views',
            takeaway: '',
            postDate: defaultPostDate || new Date().toISOString().split('T')[0]
          });
        }
        list[rowIndex] = { ...list[rowIndex], [field]: value };
        teamData.caseStudies = list;
      } else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
        const list = [...teamData.editorPerformance];
        while (list.length <= rowIndex) {
          list.push({
            editor: 'Editor mới',
            totalVideos: 0,
            winVideos: 0
          });
        }
        if (field === 'totalVideos' || field === 'winVideos') {
          list[rowIndex] = { ...list[rowIndex], [field]: parseInt(value) || 0 };
        } else {
          list[rowIndex] = { ...list[rowIndex], [field]: value };
        }
        teamData.editorPerformance = list;
      }

      updated[activeTab] = teamData;
      return updated;
    });
  };

  const deleteRow = (sheetName: string, rowIndex: number) => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      if (sheetName === '5 Content win của team') {
        const list = [...teamData.videos];
        list.splice(rowIndex, 1);
        teamData.videos = list;
      } else if (sheetName === '5 Content fail của team') {
        const list = [...teamData.failVideos];
        list.splice(rowIndex, 1);
        teamData.failVideos = list;
      } else if (sheetName === '5 Case Study hay bên ngoài') {
        const list = [...teamData.caseStudies];
        list.splice(rowIndex, 1);
        teamData.caseStudies = list;
      } else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
        const list = [...teamData.editorPerformance];
        list.splice(rowIndex, 1);
        teamData.editorPerformance = list;
      }

      updated[activeTab] = teamData;
      return updated;
    });
  };

  const addRow = (sheetName: string, defaultPostDate?: string) => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      if (sheetName === '5 Content win của team') {
        const newId = teamData.videos.length + 1;
        teamData.videos = [
          ...teamData.videos,
          {
            id: newId,
            label: `Video ${newId}`,
            content: 'Nhấp đúp để nhập nội dung...',
            analysis: 'Nhấp đúp để nhập phân tích...',
            editor: 'Tên Editor',
            views: '0',
            postDate: defaultPostDate || new Date().toISOString().split('T')[0]
          }
        ];
      } else if (sheetName === '5 Content fail của team') {
        const newId = teamData.failVideos.length + 1;
        teamData.failVideos = [
          ...teamData.failVideos,
          {
            id: newId,
            label: `Video ${newId}`,
            content: 'Nhấp đúp để nhập nội dung...',
            failReason: 'Nhấp đúp để nhập lý do...',
            editor: 'Tên Editor',
            views: '0',
            postDate: defaultPostDate || new Date().toISOString().split('T')[0]
          }
        ];
      } else if (sheetName === '5 Case Study hay bên ngoài') {
        const newId = teamData.caseStudies.length + 1;
        teamData.caseStudies = [
          ...teamData.caseStudies,
          {
            id: newId,
            label: `Case ${newId}`,
            title: 'Nhấp đúp để nhập tiêu đề...',
            channel: 'Tên kênh',
            views: '0',
            takeaway: 'Nhấp đúp để nhập bài học...',
            postDate: defaultPostDate || new Date().toISOString().split('T')[0]
          }
        ];
      } else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
        teamData.editorPerformance = [
          ...teamData.editorPerformance,
          {
            editor: 'Editor mới',
            totalVideos: 0,
            winVideos: 0
          }
        ];
      }

      updated[activeTab] = teamData;
      return updated;
    });
  };

  // Actions for PresentationTab
  const updateSlideField = (category: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin', index: number, field: string, value: string) => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      if (category === 'editorPerf' || category === 'newWin') {
        const list = [...(teamData.editorPerformance || [])];
        if (list[index]) {
          if (field === 'totalVideos' || field === 'winVideos') {
            list[index] = { ...list[index], [field]: parseInt(value) || 0 };
          } else {
            list[index] = { ...list[index], [field]: value };
          }
        }
        teamData.editorPerformance = list;
      } else {
        let listKey: 'videos' | 'failVideos' | 'caseStudies' | 'cloneVideos' | 'actions';
        if (category === 'win') listKey = 'videos';
        else if (category === 'fail') listKey = 'failVideos';
        else if (category === 'case') listKey = 'caseStudies';
        else if (category === 'clone') listKey = 'cloneVideos';
        else listKey = 'actions';

        const list = [...(teamData[listKey] || [])] as any[];
        if (list[index]) {
          list[index] = { ...list[index], [field]: value };
        }
        (teamData as any)[listKey] = list;
      }
      updated[activeTab] = teamData;
      return updated;
    });
  };

  const addSlide = (category: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin') => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      if (category === 'editorPerf' || category === 'newWin') {
        teamData.editorPerformance = [
          ...teamData.editorPerformance,
          {
            editor: 'Editor mới',
            totalVideos: 0,
            winVideos: 0
          }
        ];
        setActiveSlideIndex(teamData.editorPerformance.length - 1);
      } else if (category === 'win') {
        const newId = teamData.videos.length + 1;
        teamData.videos = [
          ...teamData.videos,
          {
            id: newId,
            label: `Video ${newId}`,
            content: 'Nhập nội dung video...',
            analysis: 'Nhập phân tích tại sau win...',
            editor: teamData.videos[0]?.editor || 'Đỗ Thị Nga',
            views: '500.000',
            likes: '25K',
            comments: '120',
            shares: '2.5K',
            platform: 'TikTok',
            postDate: new Date().toISOString().split('T')[0],
            highlights: 'Nhập điểm sáng nổi bật...',
            improvements: 'Nhập điểm cần cải thiện...',
            leaderComment: 'Nhập ý kiến của leader...',
            notes: 'Ghi chú nội bộ...'
          }
        ];
        setActiveSlideIndex(teamData.videos.length - 1);
      } else if (category === 'fail') {
        const newId = teamData.failVideos.length + 1;
        teamData.failVideos = [
          ...teamData.failVideos,
          {
            id: newId,
            label: `Video ${newId}`,
            content: 'Nhập nội dung video...',
            failReason: 'Nhập lý do tại sao không win...',
            editor: teamData.failVideos[0]?.editor || 'Mai Anh',
            views: '2.500',
            likes: '15',
            comments: '2',
            shares: '0',
            platform: 'TikTok',
            postDate: new Date().toISOString().split('T')[0],
            highlights: 'Nhập điểm sáng nổi bật...',
            improvements: 'Nhập điểm cần cải thiện...',
            leaderComment: 'Nhập ý kiến của leader...',
            notes: 'Ghi chú nội bộ...'
          }
        ];
        setActiveSlideIndex(teamData.failVideos.length - 1);
      } else if (category === 'case') {
        const newId = teamData.caseStudies.length + 1;
        teamData.caseStudies = [
          ...teamData.caseStudies,
          {
            id: newId,
            label: `Case ${newId}`,
            title: 'Nhập tiêu đề case study...',
            channel: 'Nhập tên kênh đối thủ...',
            views: '1.500.000',
            likes: '75K',
            comments: '250',
            shares: '4.2K',
            platform: 'TikTok',
            postDate: new Date().toISOString().split('T')[0],
            takeaway: 'Nhập bài học rút ra và hướng áp dụng...',
            highlights: 'Nhập điểm sáng nổi bật...',
            improvements: 'Nhập điểm cần cải thiện...',
            leaderComment: 'Nhập ý kiến của leader...',
            notes: 'Ghi chú nội bộ...'
          }
        ];
        setActiveSlideIndex(teamData.caseStudies.length - 1);
      } else if (category === 'clone') {
        const newId = (teamData.cloneVideos?.length || 0) + 1;
        const newClones = [...(teamData.cloneVideos || [])];
        newClones.push({
          id: newId,
          label: `Clone ${newId}`,
          content: 'Nhập nội dung video cần clone...',
          targetChannel: 'Kênh mục tiêu',
          editor: teamData.videos[0]?.editor || 'Đỗ Thị Nga',
          views: '800.000',
          likes: '40K',
          comments: '300',
          shares: '1.2K',
          platform: 'TikTok',
          postDate: new Date().toISOString().split('T')[0],
          analysis: 'Tại sao chọn clone video này?',
          highlights: 'Nhập điểm sáng nổi bật...',
          improvements: 'Nhập điểm cần cải thiện...',
          leaderComment: 'Nhập ý kiến của leader...',
          notes: 'Ghi chú nội bộ...'
        });
        teamData.cloneVideos = newClones;
        setActiveSlideIndex(newClones.length - 1);
      } else if (category === 'action') {
        const newId = (teamData.actions?.length || 0) + 1;
        const newActions = [...(teamData.actions || [])];
        newActions.push({
          id: newId,
          title: 'Hành động mới',
          description: 'Mô tả chi tiết hành động...',
          assignee: 'Người chịu trách nhiệm',
          deadline: 'Thời hạn',
          status: 'Chưa bắt đầu',
          priority: 'Trung bình',
          notes: 'Ghi chú thêm...',
          leaderComment: 'Định hướng từ leader...'
        });
        teamData.actions = newActions;
        setActiveSlideIndex(newActions.length - 1);
      }

      updated[activeTab] = teamData;
      return updated;
    });
  };

  const deleteSlide = (category: 'win' | 'fail' | 'case' | 'clone' | 'action' | 'editorPerf' | 'newWin', index: number) => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      if (category === 'editorPerf' || category === 'newWin') {
        const list = [...(teamData.editorPerformance || [])];
        if (list.length > 0) {
          list.splice(index, 1);
        }
        teamData.editorPerformance = list;
      } else {
        let listKey: 'videos' | 'failVideos' | 'caseStudies' | 'cloneVideos' | 'actions';
        if (category === 'win') listKey = 'videos';
        else if (category === 'fail') listKey = 'failVideos';
        else if (category === 'case') listKey = 'caseStudies';
        else if (category === 'clone') listKey = 'cloneVideos';
        else listKey = 'actions';

        const list = [...(teamData[listKey] || [])] as any[];
        if (list.length > 0) {
          list.splice(index, 1);
          if (category === 'win' || category === 'fail') {
            list.forEach((v, idx) => {
              v.id = idx + 1;
              v.label = `Video ${idx + 1}`;
            });
          } else if (category === 'case') {
            list.forEach((v, idx) => {
              v.id = idx + 1;
              v.label = `Case ${idx + 1}`;
            });
          } else if (category === 'clone') {
            list.forEach((v, idx) => {
              v.id = idx + 1;
              v.label = `Clone ${idx + 1}`;
            });
          }
        }
        (teamData as any)[listKey] = list;
      }

      updated[activeTab] = teamData;
      const listLen = category === 'editorPerf' || category === 'newWin'
        ? teamData.editorPerformance.length
        : (teamData[category === 'win' ? 'videos' : category === 'fail' ? 'failVideos' : category === 'case' ? 'caseStudies' : category === 'clone' ? 'cloneVideos' : 'actions'] || []).length;

      setActiveSlideIndex(prev => Math.max(0, Math.min(prev, listLen - 1)));

      return updated;
    });
  };

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
