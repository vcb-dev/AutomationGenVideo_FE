'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarBlank, CaretDown, CaretLeft, CaretRight, X } from '@phosphor-icons/react';

/**
 * Chọn khoảng ngày cho thanh lọc kênh nội bộ.
 *
 * `<input type="date">` của trình duyệt tự vẽ lịch theo kiểu hệ điều hành: khác nhau trên
 * Chrome/Safari, không theo được màu của app, không có preset, và hai ô rời nhau thì người
 * dùng không biết đâu là "từ" đâu là "đến". Trang `manager/user-activity` đã bỏ nó từ lâu và
 * tự vẽ lịch trong popover — làm theo đúng cách đó, chỉ thu nhỏ cho vừa thanh lọc.
 *
 * Giá trị vào/ra vẫn là chuỗi `YYYY-MM-DD` để API và 5 trang gọi không phải đổi gì.
 */

const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function sangISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * `new Date('2026-08-03')` được đọc là UTC nên ở múi giờ âm sẽ lùi mất một ngày. Tách tay để
 * chuỗi luôn ra đúng ngày đó theo giờ máy người dùng.
 */
function tuISO(s: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
}

function hienThi(s: string): string {
    const d = tuISO(s);
    return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : '';
}

function hienThiDu(s: string): string {
    const d = tuISO(s);
    return d ? `${hienThi(s)}/${d.getFullYear()}` : '';
}

/** Đầu ngày hôm nay — mốc chặn ngày tương lai (video chưa đăng thì không có gì để lọc). */
function homNay(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

interface Preset {
    nhan: string;
    tinh: () => [Date, Date];
}

const PRESETS: Preset[] = [
    { nhan: 'Hôm nay', tinh: () => [homNay(), homNay()] },
    {
        nhan: '7 ngày',
        tinh: () => {
            const den = homNay();
            const tu = new Date(den);
            tu.setDate(tu.getDate() - 6);
            return [tu, den];
        },
    },
    {
        nhan: '30 ngày',
        tinh: () => {
            const den = homNay();
            const tu = new Date(den);
            tu.setDate(tu.getDate() - 29);
            return [tu, den];
        },
    },
    {
        nhan: 'Tháng này',
        tinh: () => {
            const n = homNay();
            return [new Date(n.getFullYear(), n.getMonth(), 1), n];
        },
    },
    {
        nhan: 'Tháng trước',
        tinh: () => {
            const n = homNay();
            return [
                new Date(n.getFullYear(), n.getMonth() - 1, 1),
                new Date(n.getFullYear(), n.getMonth(), 0),
            ];
        },
    },
    {
        nhan: 'Năm nay',
        tinh: () => {
            const n = homNay();
            return [new Date(n.getFullYear(), 0, 1), n];
        },
    },
];

export default function DateRangeFilter({
    from,
    to,
    onChange,
}: {
    from: string;
    to: string;
    /** Trả về cả hai đầu cùng lúc — đổi riêng lẻ dễ tạo khoảng ngược (từ > đến). */
    onChange: (from: string, to: string) => void;
}) {
    const [mo, setMo] = useState(false);
    /** Lần bấm kế tiếp đặt đầu nào của khoảng. */
    const [dangDatDau, setDangDatDau] = useState(true);
    const [dangRe, setDangRe] = useState<string>('');
    const boc = useRef<HTMLDivElement>(null);

    const [thangXem, setThangXem] = useState(() => {
        const neo = tuISO(from) || homNay();
        return new Date(neo.getFullYear(), neo.getMonth(), 1);
    });

    useEffect(() => {
        if (!mo) return;
        const ngoai = (e: MouseEvent) => {
            if (boc.current && !boc.current.contains(e.target as Node)) setMo(false);
        };
        const phim = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMo(false);
        };
        document.addEventListener('mousedown', ngoai);
        document.addEventListener('keydown', phim);
        return () => {
            document.removeEventListener('mousedown', ngoai);
            document.removeEventListener('keydown', phim);
        };
    }, [mo]);

    // Mở lại thì nhảy về tháng của ngày bắt đầu, không giữ tháng đã lỡ cuộn đi lần trước.
    // Chỉ chạy đúng lúc bật popover: nếu bám theo `from` thì cú bấm chọn ngày đầu sẽ tự đặt
    // lại `dangDatDau` và cú bấm thứ hai không bao giờ chốt được ngày kết thúc.
    const fromRef = useRef(from);
    fromRef.current = from;
    useEffect(() => {
        if (!mo) return;
        const neo = tuISO(fromRef.current) || homNay();
        setThangXem(new Date(neo.getFullYear(), neo.getMonth(), 1));
        setDangDatDau(true);
        setDangRe('');
    }, [mo]);

    const nam = thangXem.getFullYear();
    const thang = thangXem.getMonth();

    /** Ô trống đầu lưới: getDay() trả CN=0 mà lịch Việt bắt đầu từ T2. */
    const oLich = useMemo(() => {
        const dem = new Date(nam, thang + 1, 0).getDate();
        const lech = (new Date(nam, thang, 1).getDay() + 6) % 7;
        return [...Array<null>(lech).fill(null), ...Array.from({ length: dem }, (_, i) => i + 1)];
    }, [nam, thang]);

    const mocHomNay = homNay();
    const dauISO = from;
    /** Khi mới bấm ngày đầu, phần bôi mờ chạy theo con trỏ để thấy trước khoảng sẽ chọn. */
    const cuoiISO = to || (!dangDatDau ? dangRe : '');
    const thangSauBiChan =
        nam > mocHomNay.getFullYear() ||
        (nam === mocHomNay.getFullYear() && thang >= mocHomNay.getMonth());

    const chonNgay = (ngay: number) => {
        const iso = sangISO(new Date(nam, thang, ngay));
        // Bấm lần đầu, hoặc bấm lùi trước ngày bắt đầu → coi như chọn lại từ đầu.
        if (dangDatDau || !dauISO || iso < dauISO) {
            onChange(iso, '');
            setDangDatDau(false);
            setDangRe('');
            return;
        }
        onChange(dauISO, iso);
        setDangDatDau(true);
        setMo(false);
    };

    const datPreset = (p: Preset) => {
        const [tu, den] = p.tinh();
        onChange(sangISO(tu), sangISO(den));
        setMo(false);
    };

    const xoa = () => {
        onChange('', '');
        setDangDatDau(true);
        setMo(false);
    };

    const dangLoc = !!from || !!to;
    const nhanNut = !dangLoc
        ? 'Tất cả thời gian'
        : to && to !== from
            ? `${hienThi(from)} – ${hienThiDu(to)}`
            : from
                ? hienThiDu(from)
                : `Đến ${hienThiDu(to)}`;

    return (
        <div ref={boc} className="relative">
            {/* Nút xóa là anh em chứ không lồng trong nút mở — button trong button vừa sai HTML
                vừa mất truy cập bàn phím. */}
            <div
                className={`flex h-9 items-center rounded-lg border transition-colors ${
                    dangLoc
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
                <button
                    type="button"
                    onClick={() => setMo((v) => !v)}
                    className={`flex h-full items-center gap-2 rounded-lg pl-3 text-sm ${dangLoc ? 'pr-1.5 font-medium text-primary' : 'pr-3 text-foreground'}`}
                    title="Lọc theo ngày đăng"
                >
                    <CalendarBlank size={15} className={dangLoc ? 'text-primary' : 'text-slate-400'} />
                    <span>{nhanNut}</span>
                    {!dangLoc && <CaretDown size={12} weight="bold" className="text-slate-400" />}
                </button>
                {dangLoc && (
                    <button
                        type="button"
                        onClick={xoa}
                        aria-label="Xóa khoảng ngày"
                        className="mr-1.5 rounded p-0.5 text-primary/60 transition-colors hover:bg-primary/15 hover:text-primary"
                    >
                        <X size={12} weight="bold" />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {mo && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.12, ease: 'easeOut' }}
                        className="absolute left-0 top-full z-50 mt-2 w-[280px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
                    >
                        <div className="flex flex-wrap gap-1 border-b border-border p-2">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.nhan}
                                    type="button"
                                    onClick={() => datPreset(p)}
                                    className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary dark:text-slate-300"
                                >
                                    {p.nhan}
                                </button>
                            ))}
                        </div>

                        <div className="p-2.5">
                            <div className="mb-2 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setThangXem(new Date(nam, thang - 1, 1))}
                                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                                    aria-label="Tháng trước"
                                >
                                    <CaretLeft size={14} weight="bold" />
                                </button>
                                <span className="text-[13px] font-semibold text-foreground">
                                    Tháng {thang + 1}, {nam}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setThangXem(new Date(nam, thang + 1, 1))}
                                    disabled={thangSauBiChan}
                                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-slate-800"
                                    aria-label="Tháng sau"
                                >
                                    <CaretRight size={14} weight="bold" />
                                </button>
                            </div>

                            <div className="mb-1 grid grid-cols-7">
                                {THU.map((t) => (
                                    <div key={t} className="py-1 text-center text-[10px] font-semibold text-slate-400">
                                        {t}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-y-0.5" onMouseLeave={() => setDangRe('')}>
                                {oLich.map((ngay, i) => {
                                    if (ngay === null) return <div key={`t${i}`} />;

                                    const d = new Date(nam, thang, ngay);
                                    const iso = sangISO(d);
                                    const tuongLai = d > mocHomNay;
                                    const laDau = !!dauISO && iso === dauISO;
                                    const laCuoi = !!cuoiISO && iso === cuoiISO;
                                    const trongKhoang = !!dauISO && !!cuoiISO && iso > dauISO && iso < cuoiISO;
                                    const laHomNay = iso === sangISO(mocHomNay);
                                    const daChon = laDau || laCuoi;

                                    return (
                                        <div
                                            key={iso}
                                            /* Nền bo nửa để dải ngày liền mạch, không bị ngắt quãng giữa các ô. */
                                            className={`flex justify-center py-px ${
                                                trongKhoang || (daChon && dauISO && cuoiISO && dauISO !== cuoiISO)
                                                    ? `bg-primary/10 ${laDau ? 'rounded-l-md' : ''} ${laCuoi ? 'rounded-r-md' : ''}`
                                                    : ''
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                disabled={tuongLai}
                                                onClick={() => chonNgay(ngay)}
                                                onMouseEnter={() => !dangDatDau && setDangRe(iso)}
                                                className={`flex h-7 w-7 items-center justify-center rounded-md text-[12px] transition-colors ${
                                                    daChon
                                                        ? 'bg-primary font-semibold text-primary-foreground'
                                                        : trongKhoang
                                                            ? 'font-medium text-primary'
                                                            : tuongLai
                                                                ? 'cursor-not-allowed text-slate-300 dark:text-slate-700'
                                                                : laHomNay
                                                                    ? 'font-semibold text-primary ring-1 ring-primary/40'
                                                                    : 'text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {ngay}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-border bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
                            <span className="truncate text-[11px] text-slate-500">
                                {!dangLoc
                                    ? 'Chưa chọn ngày'
                                    : !to
                                        ? `${hienThiDu(from)} → chọn ngày kết thúc`
                                        : `${hienThiDu(from)} → ${hienThiDu(to)}`}
                            </span>
                            <button
                                type="button"
                                onClick={() => { onChange('', ''); setDangDatDau(true); }}
                                className="shrink-0 text-[11px] font-medium text-slate-500 transition-colors hover:text-foreground"
                            >
                                Xóa
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
