import { TeamData } from './types';

export const formatCommaNumber = (viewsStr: string) => {
  const matchM = viewsStr.match(/^([\d.]+)\s*M/i);
  if (matchM) {
    const val = Math.round(parseFloat(matchM[1]) * 1000000);
    return val.toLocaleString('en-US');
  }
  const matchK = viewsStr.match(/^([\d.]+)\s*K/i);
  if (matchK) {
    const val = Math.round(parseFloat(matchK[1]) * 1000);
    return val.toLocaleString('en-US');
  }
  return viewsStr;
};

export const formatDotViews = (viewsStr: string): string => {
  if (!viewsStr || viewsStr === '-') return '-';
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
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const formatWinRate = (win: number, total: number) => {
  if (total === 0) return '0,00%';
  const rate = (win / total) * 100;
  return `${rate.toFixed(2).replace('.', ',')}%`;
};

export const formatViews = (viewsStr: string, mult: number) => {
  const matchM = viewsStr.match(/^([\d.]+)\s*M/i);
  if (matchM) {
    const val = parseFloat(matchM[1]) * mult;
    return `${val.toFixed(1)}M views`;
  }
  const matchK = viewsStr.match(/^([\d.]+)\s*K/i);
  if (matchK) {
    const val = Math.round(parseFloat(matchK[1]) * mult);
    return `${val}K views`;
  }
  return viewsStr;
};

export const getSheetMultiplier = (sheet: string) => {
  switch (sheet) {
    case '5 Content fail của team': return 0.85;
    case '5 Case Study hay bên ngoài': return 0.9;
    case 'Số video content win của cá nhân trong team': return 1.1;
    case 'Content mới win của cá nhân trong team/trên số video đã làm': return 0.95;
    case 'Báo cáo content':
    case '5 Content win của team':
    default: return 1.0;
  }
};

export const isDateInFilter = (
  dateStr: string | undefined,
  filterMode: 'all' | 'week' | 'month',
  selectedWeek: 'all' | '1' | '2' | '3' | '4'
) => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length < 3) return true;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (filterMode === 'month') {
    return month === 6;
  } else if (filterMode === 'week') {
    if (month !== 6) return false;
    if (selectedWeek !== 'all') {
      const week = parseInt(selectedWeek, 10);
      if (week === 1) return day >= 1 && day <= 7;
      if (week === 2) return day >= 8 && day <= 14;
      if (week === 3) return day >= 15 && day <= 21;
      if (week === 4) return day >= 22 && day <= 30;
    }
  }
  return true;
};


