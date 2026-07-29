import React from 'react';
import { Calendar } from 'lucide-react';

interface TimeFilterProps {
  filterMode: 'all' | 'week' | 'month';
  selectedWeek: 'all' | '1' | '2' | '3' | '4';
  onFilterModeChange: (mode: 'all' | 'week' | 'month') => void;
  onWeekChange: (week: 'all' | '1' | '2' | '3' | '4') => void;
}

export default function TimeFilter({ filterMode, selectedWeek, onFilterModeChange, onWeekChange }: TimeFilterProps) {
  return (
    <div className="flex flex-col gap-3.5 bg-muted/40 border border-border p-4 rounded-2xl max-w-full">
      {/* Cấp 1: Chọn Loại Báo Cáo */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[12px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> Loại báo cáo:
        </span>
        <div className="flex bg-muted border border-border p-0.5 rounded-lg shadow-inner gap-1">
          {([
            { key: 'week', label: 'Báo cáo Tuần' },
            { key: 'month', label: 'Báo cáo Tháng' }
          ] as const).map((item) => {
            const isActive = filterMode === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onFilterModeChange(item.key);
                  if (item.key === 'week') {
                    onWeekChange('1');
                  } else {
                    onWeekChange('all');
                  }
                }}
                className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-all duration-200 ${isActive
                  ? 'bg-blue-600 text-white shadow-sm font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cấp 2: Chọn chu kỳ chi tiết (Chỉ hiển thị khi chọn Báo cáo Tuần) */}
      {filterMode === 'week' && (
        <div className="flex items-center gap-3 pt-2.5 border-t border-border transition-all flex-wrap animate-slide-down">
          <div className="flex bg-muted border border-border p-0.5 rounded-lg shadow-inner gap-1 flex-wrap">
            {([
              { key: '1', label: 'Tuần 1' },
              { key: '2', label: 'Tuần 2' },
              { key: '3', label: 'Tuần 3' },
              { key: '4', label: 'Tuần 4' }
            ] as const).map((item) => (
              <button
                key={item.key}
                onClick={() => onWeekChange(item.key)}
                className={`px-4 py-1.5 text-[11.5px] font-bold rounded-md transition-all duration-200 ${selectedWeek === item.key
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
