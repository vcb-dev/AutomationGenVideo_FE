import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Search, ChevronDown, Check, Plus, X, Radio, ArrowRight } from 'lucide-react';

export interface ChannelOptionItem {
    id?: string;
    name: string;
    channelId?: string;
    badge?: string;
    badgeColor?: 'blue' | 'purple' | 'emerald' | 'amber' | 'slate';
}

export interface ChannelSelectRef {
    open: () => void;
    openCustom: () => void;
    close: () => void;
}

interface ChannelSelectProps {
    value: string;
    channelId?: string;
    options: ChannelOptionItem[];
    onChange: (channelName: string, channelId?: string) => void;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    theme?: 'purple' | 'emerald';
    className?: string;
}

function removeVietnameseTones(str: string): string {
    return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
}

export function safeString(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        if (typeof val.name === 'string') return val.name;
        if (typeof val.title === 'string') return val.title;
        if (typeof val.label === 'string') return val.label;
    }
    return '';
}

export const ChannelSelect = forwardRef<ChannelSelectRef, ChannelSelectProps>(({
    value,
    channelId,
    options,
    onChange,
    placeholder = '-- Chọn kênh --',
    disabled = false,
    readOnly = false,
    theme = 'purple',
    className = '',
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [customNameInput, setCustomNameInput] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const customInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        open: () => {
            if (disabled || readOnly) return;
            setIsOpen(true);
            setIsAddingCustom(false);
        },
        openCustom: () => {
            if (disabled || readOnly) return;
            setIsOpen(true);
            setIsAddingCustom(true);
        },
        close: () => {
            setIsOpen(false);
            setIsAddingCustom(false);
        }
    }));

    const isInteractive = !disabled && !readOnly;

    // Theme color palettes
    const isPurple = theme === 'purple';
    const themeRing = isPurple ? 'focus:ring-purple-100 ring-purple-100' : 'focus:ring-emerald-100 ring-emerald-100';
    const themeBorderActive = isPurple ? 'border-purple-400' : 'border-emerald-400';
    const themeHoverBorder = isPurple ? 'hover:border-purple-300' : 'hover:border-emerald-300';
    const themeSelectedBg = isPurple ? 'bg-purple-50/90 text-purple-800 border-purple-200' : 'bg-emerald-50/90 text-emerald-800 border-emerald-200';
    const themePrimaryText = isPurple ? 'text-purple-600' : 'text-emerald-600';
    const themePrimaryBg = isPurple ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700';
    const themeDot = isPurple ? 'bg-purple-500' : 'bg-emerald-500';

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsAddingCustom(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && !isAddingCustom) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isOpen, isAddingCustom]);

    // Focus custom input when switched to custom adding
    useEffect(() => {
        if (isAddingCustom) {
            setTimeout(() => {
                customInputRef.current?.focus();
            }, 50);
        }
    }, [isAddingCustom]);

    // Filter options based on search query (case & accent insensitive)
    const filteredOptions = useMemo(() => {
        const queryNorm = removeVietnameseTones(searchQuery);
        if (!queryNorm) return options;
        return options.filter(opt => {
            const nameNorm = removeVietnameseTones(opt.name);
            const idNorm = opt.channelId ? removeVietnameseTones(opt.channelId) : '';
            return nameNorm.includes(queryNorm) || idNorm.includes(queryNorm);
        });
    }, [options, searchQuery]);

    const handleSelect = (name: string, cId?: string) => {
        onChange(name, cId);
        setIsOpen(false);
        setSearchQuery('');
        setIsAddingCustom(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('', undefined);
    };

    const handleSaveCustom = () => {
        const trimmed = customNameInput.trim();
        if (trimmed) {
            handleSelect(trimmed, undefined);
            setCustomNameInput('');
        }
        setIsAddingCustom(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setIsAddingCustom(false);
        }
    };

    const displayValue = safeString(value);
    const isCurrentValueInOptions = options.some(o => safeString(o.name).toLowerCase() === displayValue.toLowerCase());

    return (
        <div ref={containerRef} className={`relative w-full ${className}`} onKeyDown={handleKeyDown}>
            {/* Main Trigger Button */}
            <div
                role="button"
                tabIndex={isInteractive ? 0 : -1}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => {
                    if (!isInteractive) return;
                    setIsOpen(prev => !prev);
                    setIsAddingCustom(false);
                }}
                className={`w-full h-12 px-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-2 select-none ${
                    !isInteractive
                        ? 'bg-slate-100/70 border-slate-200 cursor-not-allowed opacity-75'
                        : isOpen
                        ? `bg-white ${themeBorderActive} ring-4 ${themeRing} shadow-sm cursor-pointer`
                        : `bg-slate-50/70 border-slate-200 hover:bg-white ${themeHoverBorder} cursor-pointer shadow-xs`
                }`}
            >
                {/* Left: Selected Value or Placeholder */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {displayValue ? (
                        <>
                            <span className={`w-2 h-2 rounded-full ${themeDot} shrink-0 animate-pulse`} />
                            <span className="text-sm font-extrabold text-slate-800 truncate" title={displayValue}>
                                {displayValue}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm font-medium text-slate-400">
                            {placeholder}
                        </span>
                    )}
                </div>

                {/* Right: Controls (Clear button + Chevron) */}
                <div className="flex items-center gap-1 shrink-0">
                    {displayValue && isInteractive && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Xóa lựa chọn"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <div className={`p-1 rounded-lg text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Dropdown Popover */}
            {isOpen && isInteractive && (
                <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+6px)] z-50 min-w-[320px] w-[340px] sm:w-[360px] max-w-[calc(100vw-32px)] bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/25 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col">
                    {/* Header: Search Box */}
                    {!isAddingCustom && (
                        <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
                            <div className="relative flex-1 flex items-center">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm tên kênh..."
                                    className="w-full pl-8 pr-7 py-2 text-xs font-bold text-slate-700 placeholder-slate-400 bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 transition-all shadow-2xs"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <span className="text-[11px] font-black text-slate-500 px-2.5 py-1.5 bg-white rounded-xl border border-slate-200/80 shrink-0 shadow-2xs">
                                {filteredOptions.length} kênh
                            </span>
                        </div>
                    )}

                    {/* Channel List */}
                    {!isAddingCustom ? (
                        <div className="max-h-72 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                            {/* Option to clear / unselect if currently selected */}
                            {displayValue && (
                                <button
                                    type="button"
                                    onClick={() => handleSelect('', undefined)}
                                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-600 hover:bg-red-50/70 transition-colors flex items-center gap-2"
                                >
                                    <X className="w-3.5 h-3.5 text-slate-400" />
                                    <span>-- Bỏ chọn (để trống) --</span>
                                </button>
                            )}

                            {/* Current Custom Value if not in options */}
                            {displayValue && !isCurrentValueInOptions && (
                                <button
                                    type="button"
                                    onClick={() => handleSelect(displayValue, channelId)}
                                    title={displayValue}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${themeSelectedBg} border`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Radio className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{displayValue}</span>
                                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md shrink-0">Tự nhập</span>
                                    </div>
                                    <Check className="w-4 h-4 shrink-0" />
                                </button>
                            )}

                            {/* Filtered Options */}
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, idx) => {
                                    const optName = safeString(opt.name);
                                    const optBadge = safeString(opt.badge);
                                    const isSelected = displayValue && optName.toLowerCase() === displayValue.toLowerCase();
                                    return (
                                        <button
                                            key={opt.id || `${optName}-${idx}`}
                                            type="button"
                                            onClick={() => handleSelect(optName, opt.channelId)}
                                            title={optName}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                                                isSelected
                                                    ? `${themeSelectedBg} border`
                                                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                                <span className="truncate text-slate-800">{optName}</span>
                                                {optBadge && (
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                                                        opt.badgeColor === 'blue'
                                                            ? 'bg-blue-100 text-blue-800 border border-blue-200/50'
                                                            : opt.badgeColor === 'emerald'
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/50'
                                                            : opt.badgeColor === 'amber'
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200/50'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {optBadge}
                                                    </span>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <Check className="w-4 h-4 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="py-4 px-3 text-center space-y-2">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Không tìm thấy kênh <span className="font-bold text-slate-700">"{searchQuery}"</span>
                                    </p>
                                    {searchQuery.trim() && (
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(searchQuery.trim(), undefined)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-xl ${themePrimaryBg} transition-all shadow-sm active:scale-95`}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Dùng luôn tên: "{searchQuery.trim()}"</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Inline Custom Input Mode */
                        <div className="p-3 bg-slate-50/80 space-y-2.5">
                            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                <Plus className={`w-3.5 h-3.5 ${themePrimaryText}`} />
                                <span>Nhập tên kênh tùy chỉnh</span>
                            </label>
                            <input
                                ref={customInputRef}
                                type="text"
                                value={customNameInput}
                                onChange={(e) => setCustomNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveCustom();
                                    }
                                }}
                                placeholder="Ví dụ: HuyK - Kênh Mới..."
                                className={`w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white rounded-xl border border-slate-200 focus:outline-none ${themeBorderActive} focus:ring-2 ${themeRing} transition-all`}
                            />
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddingCustom(false);
                                        setCustomNameInput('');
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCustom}
                                    disabled={!customNameInput.trim()}
                                    className={`px-3 py-1.5 text-xs font-black text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 ${themePrimaryBg}`}
                                >
                                    <span>Xác nhận</span>
                                    <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Bottom Action Bar */}
                    {!isAddingCustom && (
                        <div className="p-2 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddingCustom(true);
                                    setCustomNameInput(searchQuery || '');
                                }}
                                className={`text-[11px] font-black ${themePrimaryText} hover:underline flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white transition-all`}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tự nhập tên kênh khác...</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

ChannelSelect.displayName = 'ChannelSelect';

export default ChannelSelect;
