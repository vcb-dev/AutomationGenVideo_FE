'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CaretDown, MagnifyingGlass, Check, Eye, X } from '@phosphor-icons/react';

import DateRangeFilter from './DateRangeFilter';

/**
 * Các ô nhập của thanh bộ lọc kênh nội bộ.
 *
 * Đồng bộ chuẩn VCB Studio: Không dùng thẻ <select> hay <input> nguyên bản của trình duyệt.
 * Tất cả dropdowns và inputs được chuẩn hoá giao diện phẳng, hiện đại, hỗ trợ cả Light & Dark mode.
 */

const O_CHUNG =
    'h-9 rounded-lg border border-border bg-card text-sm text-foreground transition-colors ' +
    'hover:border-slate-300 dark:hover:border-slate-600 ' +
    'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20';

function getChildText(child: any): string {
    if (child === null || child === undefined) return '';
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (Array.isArray(child)) return child.map(getChildText).join('');
    if (React.isValidElement(child) && child.props) {
        return getChildText((child.props as any).children);
    }
    return '';
}

export function FilterSearch({
    value,
    onChange,
    placeholder = 'Tìm theo caption, hashtag...',
    className = '',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
}) {
    return (
        <div className={`${O_CHUNG} relative flex-1 min-w-[200px] max-w-sm flex items-center ${className}`}>
            <MagnifyingGlass
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-full w-full rounded-lg bg-transparent pl-9 pr-8 text-sm text-foreground placeholder:text-slate-400 outline-none"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                    <X size={13} weight="bold" />
                </button>
            )}
        </div>
    );
}

export interface FilterSelectOption {
    value: string;
    label: string;
}

export function FilterSelect({
    value,
    onChange,
    title,
    className = '',
    options,
    children,
    placeholder,
    align = 'left',
}: {
    value: string;
    onChange: (v: string) => void;
    title?: string;
    className?: string;
    options?: FilterSelectOption[];
    children?: React.ReactNode;
    placeholder?: string;
    align?: 'left' | 'right';
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Extract options from either props.options or React.Children (<option>)
    const parsedOptions: FilterSelectOption[] = useMemo(() => {
        if (options && options.length > 0) return options;
        const list: FilterSelectOption[] = [];
        React.Children.forEach(children, (child) => {
            if (React.isValidElement(child) && child.props) {
                const optVal = String((child.props as any).value ?? '');
                const optLabel = getChildText((child.props as any).children) || optVal;
                list.push({ value: optVal, label: optLabel });
            }
        });
        return list;
    }, [options, children]);

    // Close on click outside or ESC
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            if (parsedOptions.length > 7) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
            }
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, parsedOptions.length]);

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return parsedOptions;
        const q = searchQuery.toLowerCase();
        return parsedOptions.filter((opt) => opt.label.toLowerCase().includes(q));
    }, [parsedOptions, searchQuery]);

    const selectedOption = parsedOptions.find((opt) => opt.value === value);
    const displayLabel = selectedOption?.label || placeholder || title || (parsedOptions[0]?.label ?? '');

    return (
        <div ref={ref} className={`relative inline-block ${className}`} title={title}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`${O_CHUNG} w-full flex items-center justify-between gap-2 px-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none`}
            >
                <span className="truncate text-foreground font-normal">
                    {displayLabel}
                </span>
                <CaretDown
                    size={13}
                    weight="bold"
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-primary' : ''}`}
                />
            </button>

            {open && (
                <div
                    className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 z-50 min-w-full min-w-[220px] max-w-sm w-max max-h-72 overflow-hidden flex flex-col rounded-xl border border-border bg-card shadow-xl dark:shadow-2xl dark:shadow-black/60 animate-in fade-in zoom-in-95 duration-100`}
                >
                    {parsedOptions.length > 7 && (
                        <div className="p-2 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="relative flex items-center">
                                <MagnifyingGlass size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm..."
                                    className="w-full bg-card text-foreground placeholder:text-slate-400 text-xs rounded-lg pl-8 pr-3 py-1.5 border border-border outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    )}

                    <div className="overflow-y-auto max-h-56 p-1 space-y-0.5 scrollbar-thin">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-slate-400 text-center">
                                Không tìm thấy kết quả
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                                            isSelected
                                                ? 'bg-primary/10 text-primary font-medium'
                                                : 'text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected && <Check size={13} weight="bold" className="shrink-0 text-primary" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function FilterNumber({
    value,
    onChange,
    placeholder = 'Min view',
    icon = 'eye',
    className = 'w-36',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    icon?: 'eye' | 'heart';
    className?: string;
}) {
    return (
        <div className={`${O_CHUNG} ${className} relative flex items-center`}>
            <div className="absolute left-2.5 text-slate-400 pointer-events-none flex items-center">
                <Eye size={14} />
            </div>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-full w-full rounded-lg bg-transparent pl-8 pr-7 text-sm text-foreground placeholder:text-slate-400 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                    <X size={13} weight="bold" />
                </button>
            )}
        </div>
    );
}

/**
 * Lịch tự vẽ trong popover — xem [DateRangeFilter]. Giữ nguyên tên và chữ ký `onFromChange` /
 * `onToChange` để năm trang gọi không phải sửa.
 */
export function FilterDateRange({
    from,
    to,
    onFromChange,
    onToChange,
}: {
    from: string;
    to: string;
    onFromChange: (v: string) => void;
    onToChange: (v: string) => void;
}) {
    return (
        <DateRangeFilter
            from={from}
            to={to}
            onChange={(tu, den) => {
                onFromChange(tu);
                onToChange(den);
            }}
        />
    );
}

export function FilterReset({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
            Xóa bộ lọc
        </button>
    );
}
