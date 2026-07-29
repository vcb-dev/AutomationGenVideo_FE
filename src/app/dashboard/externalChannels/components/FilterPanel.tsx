'use client';

import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { ScrapedFanpage } from '@/services/scraperService';

interface FilterPanelProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedFanpage: string;
  onFanpageChange: (val: string) => void;
  sortBy: string;
  onSortChange: (val: string) => void;
  minViews: string;
  onMinViewsChange: (val: string) => void;
  dateFrom: string;
  onDateFromChange: (val: string) => void;
  dateTo: string;
  onDateToChange: (val: string) => void;
  fanpages: ScrapedFanpage[];
}

export default function FilterPanel({
  search, onSearchChange,
  selectedFanpage, onFanpageChange,
  sortBy, onSortChange,
  minViews, onMinViewsChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  fanpages,
}: FilterPanelProps) {
  const hasFilters = !!search || !!selectedFanpage || sortBy !== 'date' || !!minViews || !!dateFrom || !!dateTo;

  const clearAll = () => {
    onSearchChange('');
    onFanpageChange('');
    onSortChange('date');
    onMinViewsChange('');
    onDateFromChange('');
    onDateToChange('');
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1 min-w-[180px] max-w-sm">
        <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Tìm theo caption, hashtag..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary outline-none"
        />
      </div>

      {/* Fanpage filter */}
      <select
        value={selectedFanpage}
        onChange={e => onFanpageChange(e.target.value)}
        className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <option value="">Tất cả Fanpage</option>
        {fanpages.map(fp => (
          <option key={fp.id} value={fp.id}>{fp.name}</option>
        ))}
      </select>

      {/* Min Views */}
      <input
        type="number"
        value={minViews}
        onChange={e => onMinViewsChange(e.target.value)}
        placeholder="Min views"
        className="w-28 px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />

      {/* Sort */}
      <select
        value={sortBy}
        onChange={e => onSortChange(e.target.value)}
        className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <option value="date">Mới nhất</option>
        <option value="views">Nhiều views nhất</option>
        <option value="likes">Nhiều likes nhất</option>
      </select>

      {/* Date range */}
      <input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Từ ngày" />
      <input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Đến ngày" />

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={12} /> Xóa lọc
        </button>
      )}
    </div>
  );
}
