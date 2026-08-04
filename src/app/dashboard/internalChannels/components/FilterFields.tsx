'use client';

import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react';

import DateRangeFilter from './DateRangeFilter';

/**
 * Các ô nhập của thanh bộ lọc kênh nội bộ.
 *
 * Trước đây mỗi trang tự viết `<select>` và `<input type=date|number>` trần: trình duyệt vẽ
 * mũi tên hai chiều của hệ điều hành, ô số có nút tăng/giảm, ô ngày hiện `03/08/2026` với các
 * đoạn màu xanh — mỗi ô một chiều cao, một kiểu, nhìn rất chắp vá. Gom lại ở đây để năm trang
 * (all, facebook, tiktok, instagram, youtube) dùng chung một hình dáng.
 */

/** Chiều cao và viền chung — mọi ô trên thanh lọc phải khớp nhau tuyệt đối. */
const O_CHUNG =
    'h-9 rounded-lg border border-border bg-card text-sm text-foreground transition-colors ' +
    'hover:border-slate-300 dark:hover:border-slate-600 ' +
    'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20';

export function FilterSearch({
    value,
    onChange,
    placeholder = 'Tìm theo caption, hashtag...',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div className={`${O_CHUNG} relative flex-1 min-w-[200px] max-w-sm`}>
            <MagnifyingGlass
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-full w-full rounded-lg bg-transparent pl-9 pr-3 text-sm text-foreground placeholder:text-slate-400 outline-none"
            />
        </div>
    );
}

export function FilterSelect({
    value,
    onChange,
    title,
    className = '',
    children,
}: {
    value: string;
    onChange: (v: string) => void;
    title?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={`${O_CHUNG} relative ${className}`} title={title}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                /* `appearance-none` bỏ mũi tên mặc định của hệ điều hành; pr-8 chừa chỗ cho caret vẽ tay. */
                className="h-full w-full cursor-pointer appearance-none truncate rounded-lg bg-transparent pl-3 pr-8 text-sm text-foreground outline-none"
            >
                {children}
            </select>
            <CaretDown
                size={13}
                weight="bold"
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
        </div>
    );
}

export function FilterNumber({
    value,
    onChange,
    placeholder = 'Min view',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div className={`${O_CHUNG} w-32`}>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                /* Nút tăng/giảm mặc định vừa xấu vừa vô dụng với ngưỡng view hàng nghìn. */
                className="h-full w-full rounded-lg bg-transparent px-3 text-sm text-foreground placeholder:text-slate-400 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
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
            onClick={onClick}
            className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
            Xóa bộ lọc
        </button>
    );
}
