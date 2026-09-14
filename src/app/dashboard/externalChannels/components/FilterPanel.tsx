'use client';

import { MagnifyingGlass, X, ArrowsDownUp, Eye, FacebookLogo } from '@phosphor-icons/react';
import { ScrapedFanpage } from '@/services/scraperService';
import { DatePicker } from '@/components/ui/DatePicker';
import FilterSelect from './FilterSelect';

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

  const fanpageOptions = [
    { value: '', label: 'Tất cả Fanpage' },
    ...fanpages.map(fp => ({
      value: String(fp.id),
      label: fp.name,
      count: fp.reels_count ?? undefined,
    })),
  ];

  const sortOptions = [
    { value: 'date', label: 'Mới nhất' },
    { value: 'views', label: 'Nhiều views nhất' },
    { value: 'likes', label: 'Nhiều likes nhất' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2.5 bg-card border border-border rounded-xl p-3 shadow-xs">
      {/* Search input */}
      <div className="relative flex-1 min-w-[180px] max-w-sm">
        <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Tìm theo caption, hashtag..."
          className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary outline-none transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Fanpage custom filter */}
      <FilterSelect
        value={selectedFanpage}
        onChange={onFanpageChange}
        options={fanpageOptions}
        placeholder="Tất cả Fanpage"
        icon={<FacebookLogo size={15} weight="fill" className="text-blue-600" />}
        searchPlaceholder="Tìm fanpage..."
      />

      {/* Min Views */}
      <div className="relative w-32">
        <Eye size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="number"
          value={minViews}
          onChange={e => onMinViewsChange(e.target.value)}
          placeholder="Min views"
          className="w-full pl-8 pr-6 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {minViews && (
          <button
            type="button"
            onClick={() => onMinViewsChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Sort */}
      <FilterSelect
        value={sortBy}
        onChange={onSortChange}
        options={sortOptions}
        placeholder="Sắp xếp"
        icon={<ArrowsDownUp size={15} />}
      />

      {/* Date range with custom DatePicker */}
      <DatePicker
        value={dateFrom}
        onChange={onDateFromChange}
        placeholder="Từ ngày"
      />
      <DatePicker
        value={dateTo}
        onChange={onDateToChange}
        placeholder="Đến ngày"
        align="right"
      />

      {/* Clear all */}
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all cursor-pointer select-none ml-auto sm:ml-0"
        >
          <X size={13} weight="bold" /> Xóa lọc
        </button>
      )}
    </div>
  );
}
