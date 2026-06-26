import React, { useState } from 'react';
import { TeamData } from '../types';
import { getSheetMultiplier, isDateInFilter, formatViews } from '../utils';
import TeamSelector from './TeamSelector';
import TimeFilter from './TimeFilter';
import ReportKpiBar from './ReportKpiBar';
import ContentWinTable from './ContentWinTable';
import ContentFailTable from './ContentFailTable';
import CaseStudyTable from './CaseStudyTable';
import EditorWinStatsSection from './EditorWinStatsSection';
import EditorNewWinSection from './EditorNewWinSection';

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

  // Helper to compute filtered data for each sheet
  const computeSheetData = (sheetName: string) => {
    const multiplier = getSheetMultiplier(sheetName);

    const filteredWinsCount = baseData.videos.filter(v => isDateInFilter(v.postDate, filterMode, selectedWeek)).length;
    const filteredFailsCount = baseData.failVideos.filter(v => isDateInFilter(v.postDate, filterMode, selectedWeek)).length;
    const overallWinsCount = baseData.videos.length;
    const overallFailsCount = baseData.failVideos.length;

    const winFilterRatio = overallWinsCount > 0 ? filteredWinsCount / overallWinsCount : 1;
    const totalFilterRatio = (overallWinsCount + overallFailsCount) > 0
      ? (filteredWinsCount + filteredFailsCount) / (overallWinsCount + overallFailsCount)
      : 1;

    const win5Stats = {
      total: Math.round(baseData.win5Stats.total * totalFilterRatio * multiplier),
      win: Math.round(baseData.win5Stats.win * winFilterRatio * multiplier),
      fail: 0,
      percent: ''
    };
    win5Stats.fail = Math.max(0, win5Stats.total - win5Stats.win);
    const rawWin5Percent = win5Stats.total > 0 ? (win5Stats.win / win5Stats.total) * 100 : 0;
    win5Stats.percent = `${rawWin5Percent.toFixed(1).replace('.', ',')}%`;

    const newVideoStats = {
      total: Math.round(baseData.newVideoStats.total * totalFilterRatio * multiplier),
      win: Math.round(baseData.newVideoStats.win * winFilterRatio * multiplier),
      fail: 0,
      percent: ''
    };
    newVideoStats.fail = Math.max(0, newVideoStats.total - newVideoStats.win);
    const rawNewVideoPercent = newVideoStats.total > 0 ? (newVideoStats.win / newVideoStats.total) * 100 : 0;
    newVideoStats.percent = `${rawNewVideoPercent.toFixed(1).replace('.', ',')}%`;

    return { multiplier, winFilterRatio, totalFilterRatio, win5Stats, newVideoStats };
  };

  // Filtered video data
  const filterAndFormatVideos = (sheetName: string) => {
    const multiplier = getSheetMultiplier(sheetName);
    return baseData.videos
      .filter(v => isDateInFilter(v.postDate, filterMode, selectedWeek))
      .map(v => ({ ...v, views: formatViews(v.views, multiplier) }));
  };

  const filterAndFormatFailVideos = (sheetName: string) => {
    const multiplier = getSheetMultiplier(sheetName);
    return baseData.failVideos
      .filter(v => isDateInFilter(v.postDate, filterMode, selectedWeek))
      .map(v => ({ ...v, views: formatViews(v.views, multiplier) }));
  };

  const filterAndFormatCaseStudies = (sheetName: string) => {
    const multiplier = getSheetMultiplier(sheetName);
    return baseData.caseStudies
      .filter(v => isDateInFilter(v.postDate, filterMode, selectedWeek))
      .map(v => ({ ...v, views: formatViews(v.views, multiplier) }));
  };

  // Sheet name constants
  const WIN_SHEET = '5 Content win của team';
  const FAIL_SHEET = '5 Content fail của team';
  const CASE_SHEET = '5 Case Study hay bên ngoài';
  const EDITOR_WIN_SHEET = 'Số video content win của cá nhân trong team';
  const EDITOR_NEW_WIN_SHEET = 'Content mới win của cá nhân trong team/trên số video đã làm';

  // Helper logic to map indexes from filtered and padded list to unfiltered lists
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

  const getLists = (sheetName: string) => {
    let rawList: any[] = [];
    let filteredList: any[] = [];
    
    if (sheetName === WIN_SHEET) {
      rawList = baseData.videos;
      filteredList = baseData.videos.filter(v => isDateInFilter(v.postDate, filterMode, selectedWeek));
    } else if (sheetName === FAIL_SHEET) {
      rawList = baseData.failVideos;
      filteredList = baseData.failVideos.filter(v => isDateInFilter(v.postDate, filterMode, selectedWeek));
    } else if (sheetName === CASE_SHEET) {
      rawList = baseData.caseStudies;
      filteredList = baseData.caseStudies.filter(v => isDateInFilter(v.postDate, filterMode, selectedWeek));
    } else {
      rawList = baseData.editorPerformance;
      filteredList = baseData.editorPerformance;
    }
    
    return { rawList, filteredList };
  };

  const handleUpdateRow = (sheetName: string, tableIndex: number, field: string, value: string) => {
    const { rawList, filteredList } = getLists(sheetName);
    
    if (tableIndex < filteredList.length) {
      const targetItem = filteredList[tableIndex];
      const rawIndex = targetItem.id !== undefined
        ? rawList.findIndex(v => v.id === targetItem.id)
        : tableIndex;
      if (rawIndex !== -1) {
        onUpdateRow(sheetName, rawIndex, field, value);
      }
    } else {
      // Mock row mapping to append logic
      const rawIndex = rawList.length + (tableIndex - filteredList.length);
      onUpdateRow(sheetName, rawIndex, field, value, getDefaultPostDate());
    }
  };

  const handleDeleteRow = (sheetName: string, tableIndex: number) => {
    const { rawList, filteredList } = getLists(sheetName);
    if (tableIndex < filteredList.length) {
      const targetItem = filteredList[tableIndex];
      const rawIndex = targetItem.id !== undefined
        ? rawList.findIndex(v => v.id === targetItem.id)
        : tableIndex;
      if (rawIndex !== -1) {
        onDeleteRow(sheetName, rawIndex);
      }
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
          videos={filterAndFormatVideos(WIN_SHEET)}
          activeTab={activeTab}
          isCollapsed={collapsedSheets[WIN_SHEET] || false}
          onToggle={() => toggleSheetCollapse(WIN_SHEET)}
          onUpdateRow={(idx, field, value) => handleUpdateRow(WIN_SHEET, idx, field, value)}
          onDeleteRow={(idx) => handleDeleteRow(WIN_SHEET, idx)}
          onAddRow={() => handleAddRow(WIN_SHEET)}
        />

        <ContentFailTable
          failVideos={filterAndFormatFailVideos(FAIL_SHEET)}
          activeTab={activeTab}
          isCollapsed={collapsedSheets[FAIL_SHEET] || false}
          onToggle={() => toggleSheetCollapse(FAIL_SHEET)}
          onUpdateRow={(idx, field, value) => handleUpdateRow(FAIL_SHEET, idx, field, value)}
          onDeleteRow={(idx) => handleDeleteRow(FAIL_SHEET, idx)}
          onAddRow={() => handleAddRow(FAIL_SHEET)}
        />

        <CaseStudyTable
          caseStudies={filterAndFormatCaseStudies(CASE_SHEET)}
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
