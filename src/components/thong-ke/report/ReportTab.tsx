import React, { useState } from 'react';
import { TeamData } from '../types';
import { getSheetMultiplier, formatViews } from '../utils';
import TeamSelector from './TeamSelector';
import TimeFilter from './TimeFilter';
import ReportKpiBar from './ReportKpiBar';
import ContentWinTable from './ContentWinTable';
import ContentFailTable from './ContentFailTable';
import CaseStudyTable from './CaseStudyTable';
import EditorWinStatsSection from './EditorWinStatsSection';
import EditorNewWinSection from './EditorNewWinSection';


const parseViewsToRawNum = (viewsStr: string, multiplier: number): number => {
  if (!viewsStr || viewsStr === '-') return 0;
  const clean = viewsStr.replace(/\s*views/gi, '').replace(/\./g, '').replace(/,/g, '').trim();
  const matchM = clean.match(/^([\d.]+)\s*M/i);
  let val: number;
  if (matchM) {
    val = Math.round(parseFloat(matchM[1]) * 1000000);
  } else {
    const matchK = clean.match(/^([\d.]+)\s*K/i);
    if (matchK) {
      val = Math.round(parseFloat(matchK[1]) * 1000);
    } else {
      const parsed = parseInt(clean.replace(/[^\d.]/g, ''), 10);
      val = isNaN(parsed) ? 0 : parsed;
    }
  }
  return Math.round(val / multiplier);
};

interface ReportTabProps {
  teamsData: Record<string, TeamData>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUpdateRow: (sheetName: string, rowIndex: number, field: string, value: string, defaultPostDate?: string) => void;
  onDeleteRow: (sheetName: string, rowIndex: number) => void;
  onAddRow: (sheetName: string, defaultPostDate?: string) => void;
  filterMode: 'all' | 'week' | 'month';
  selectedWeek: 'all' | '1' | '2' | '3' | '4';
  onFilterModeChange: (mode: 'all' | 'week' | 'month') => void;
  onWeekChange: (week: 'all' | '1' | '2' | '3' | '4') => void;
}

export default function ReportTab({
  teamsData, activeTab, onTabChange, onUpdateRow, onDeleteRow, onAddRow,
  filterMode, selectedWeek, onFilterModeChange, onWeekChange
}: ReportTabProps) {
  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>({});

  const toggleSheetCollapse = (sheetName: string) => {
    setCollapsedSheets(prev => ({
      ...prev,
      [sheetName]: !prev[sheetName]
    }));
  };

  const baseData = teamsData[activeTab];
  const editors = baseData?.members || (baseData?.editorPerformance || []).map(e => e.editor).filter(Boolean);

  // Helper to compute KPI data for each sheet
  const computeSheetData = (sheetName: string) => {
    const multiplier = getSheetMultiplier(sheetName);

    const winsCount = baseData?.videos?.length || 0;
    const failsCount = baseData?.failVideos?.length || 0;
    const totalCount = winsCount + failsCount;

    const win5Stats = {
      total: totalCount,
      win: winsCount,
      fail: failsCount,
      percent: totalCount > 0
        ? `${((winsCount / totalCount) * 100).toFixed(1).replace('.', ',')}%`
        : '0,0%',
    };

    const newVideoStats = {
      total: Math.round((baseData?.newVideoStats?.total || 0) * multiplier),
      win: Math.round((baseData?.newVideoStats?.win || 0) * multiplier),
      fail: 0,
      percent: ''
    };
    newVideoStats.fail = Math.max(0, newVideoStats.total - newVideoStats.win);
    const rawNewVideoPercent = newVideoStats.total > 0 ? (newVideoStats.win / newVideoStats.total) * 100 : 0;
    newVideoStats.percent = `${rawNewVideoPercent.toFixed(1).replace('.', ',')}%`;

    return { multiplier, winFilterRatio: 1, totalFilterRatio: 1, win5Stats, newVideoStats };
  };

  // Video data — no client-side date filter needed, BE already filters by periodId
  const formatVideos = (sheetName: string) => {
    const multiplier = getSheetMultiplier(sheetName);
    return (baseData?.videos || []).map(v => ({ ...v, views: formatViews(v.views, multiplier) }));
  };

  const formatFailVideos = (sheetName: string) => {
    const multiplier = getSheetMultiplier(sheetName);
    return (baseData?.failVideos || []).map(v => ({ ...v, views: formatViews(v.views, multiplier) }));
  };

  const formatCaseStudies = (sheetName: string) => {
    const multiplier = getSheetMultiplier(sheetName);
    return (baseData?.caseStudies || []).map(v => ({ ...v, views: formatViews(v.views, multiplier) }));
  };

  // Sheet name constants
  const WIN_SHEET = '5 Content win của team';
  const FAIL_SHEET = '5 Content fail của team';
  const CASE_SHEET = '5 Case Study hay bên ngoài';
  const EDITOR_WIN_SHEET = 'Số video content win của cá nhân trong team';
  const EDITOR_NEW_WIN_SHEET = 'Content mới win của cá nhân trong team/trên số video đã làm';

  // Helper logic to map indexes — no more filter mismatch
  const getDefaultPostDate = () => {
    if (filterMode === 'week') {
      const week = selectedWeek === 'all' ? '1' : selectedWeek;
      if (week === '1') return '2026-06-03';
      if (week === '2') return '2026-06-10';
      if (week === '3') return '2026-06-17';
      if (week === '4') return '2026-06-24';
    } else if (filterMode === 'month') {
      return '2026-06-15';
    }
    return '2026-06-03';
  };

  const getList = (sheetName: string): any[] => {
    if (sheetName === WIN_SHEET) return baseData?.videos || [];
    if (sheetName === FAIL_SHEET) return baseData?.failVideos || [];
    if (sheetName === CASE_SHEET) return baseData?.caseStudies || [];
    return baseData?.editorPerformance || [];
  };

  const handleUpdateRow = (sheetName: string, tableIndex: number, field: string, value: string) => {
    const list = getList(sheetName);
    let valToSave = value;
    if (field === 'views') {
      const multiplier = getSheetMultiplier(sheetName);
      valToSave = parseViewsToRawNum(value, multiplier).toString();
    }
    if (tableIndex < list.length) {
      onUpdateRow(sheetName, tableIndex, field, valToSave);
    } else {
      // New row beyond existing list
      const rawIndex = list.length + (tableIndex - list.length);
      onUpdateRow(sheetName, rawIndex, field, valToSave, getDefaultPostDate());
    }
  };

  const handleDeleteRow = (sheetName: string, tableIndex: number) => {
    const list = getList(sheetName);
    if (tableIndex < list.length) {
      onDeleteRow(sheetName, tableIndex);
    }
  };

  const handleAddRow = (sheetName: string) => {
    onAddRow(sheetName, getDefaultPostDate());
  };

  const editorWinData = computeSheetData(EDITOR_WIN_SHEET);
  const editorNewWinData = computeSheetData(EDITOR_NEW_WIN_SHEET);

  const ratio = baseData.win5Stats.total > 0 ? (baseData.newVideoStats.total / baseData.win5Stats.total) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <TeamSelector
          teams={Object.keys(teamsData)}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
        <TimeFilter
          filterMode={filterMode}
          selectedWeek={selectedWeek}
          onFilterModeChange={onFilterModeChange}
          onWeekChange={onWeekChange}
        />
      </div>

      {/* KPI Dashboard Bar */}
      <ReportKpiBar
        teamsData={teamsData}
        activeTab={activeTab}
        filterMode={filterMode}
        selectedWeek={selectedWeek}
      />

      {/* Render all 5 tables stacked */}
      <div className="flex flex-col gap-8 mt-2">
        <ContentWinTable
          videos={formatVideos(WIN_SHEET)}
          activeTab={activeTab}
          isCollapsed={collapsedSheets[WIN_SHEET] || false}
          onToggle={() => toggleSheetCollapse(WIN_SHEET)}
          onUpdateRow={(idx, field, value) => handleUpdateRow(WIN_SHEET, idx, field, value)}
          onDeleteRow={(idx) => handleDeleteRow(WIN_SHEET, idx)}
          onAddRow={() => handleAddRow(WIN_SHEET)}
          editors={editors}
        />

        <ContentFailTable
          failVideos={formatFailVideos(FAIL_SHEET)}
          activeTab={activeTab}
          isCollapsed={collapsedSheets[FAIL_SHEET] || false}
          onToggle={() => toggleSheetCollapse(FAIL_SHEET)}
          onUpdateRow={(idx, field, value) => handleUpdateRow(FAIL_SHEET, idx, field, value)}
          onDeleteRow={(idx) => handleDeleteRow(FAIL_SHEET, idx)}
          onAddRow={() => handleAddRow(FAIL_SHEET)}
          editors={editors}
        />

        <CaseStudyTable
          caseStudies={formatCaseStudies(CASE_SHEET)}
          isCollapsed={collapsedSheets[CASE_SHEET] || false}
          onToggle={() => toggleSheetCollapse(CASE_SHEET)}
          onUpdateRow={(idx, field, value) => handleUpdateRow(CASE_SHEET, idx, field, value)}
          onDeleteRow={(idx) => handleDeleteRow(CASE_SHEET, idx)}
          onAddRow={() => handleAddRow(CASE_SHEET)}
        />

        <EditorWinStatsSection
          key={`editor-win-${activeTab}-${filterMode}-${selectedWeek}`}
          editorPerformance={baseData.editorPerformance}
          win5Stats={editorWinData.win5Stats}
          multiplier={editorWinData.multiplier}
          winFilterRatio={editorWinData.winFilterRatio}
          totalFilterRatio={editorWinData.totalFilterRatio}
          isCollapsed={collapsedSheets[EDITOR_WIN_SHEET] || false}
          onToggle={() => toggleSheetCollapse(EDITOR_WIN_SHEET)}
          onUpdateRow={(idx, field, value) => handleUpdateRow(EDITOR_WIN_SHEET, idx, field, value)}
          onDeleteRow={(idx) => handleDeleteRow(EDITOR_WIN_SHEET, idx)}
          onAddRow={() => handleAddRow(EDITOR_WIN_SHEET)}
        />

        <EditorNewWinSection
          key={`editor-new-win-${activeTab}-${filterMode}-${selectedWeek}`}
          editorPerformance={baseData.editorPerformance}
          newVideoStats={editorNewWinData.newVideoStats}
          ratio={ratio}
          multiplier={editorNewWinData.multiplier}
          winFilterRatio={editorNewWinData.winFilterRatio}
          totalFilterRatio={editorNewWinData.totalFilterRatio}
          isCollapsed={collapsedSheets[EDITOR_NEW_WIN_SHEET] || false}
          onToggle={() => toggleSheetCollapse(EDITOR_NEW_WIN_SHEET)}
          onUpdateRow={(idx, field, value) => handleUpdateRow(EDITOR_NEW_WIN_SHEET, idx, field, value)}
          onDeleteRow={(idx) => handleDeleteRow(EDITOR_NEW_WIN_SHEET, idx)}
          onAddRow={() => handleAddRow(EDITOR_NEW_WIN_SHEET)}
        />
      </div>
    </div>
  );
}
