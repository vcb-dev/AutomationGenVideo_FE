'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Coins, Cpu, Database, Info, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api-client';
import { DatePicker } from '@/components/ui/DatePicker';
import {
    RANGE_PRESETS,
    formatRangeLabel,
    matchPreset,
    normalizeRange,
    resolvePreset,
    type DateRange,
    type RangePresetId,
} from '@/lib/ai-usage/usage-range';

// ─── Kiểu dữ liệu trả về từ BE (GET /video-library/costs, /costs/tikhub-account) ──────────────

interface Money { cost_usd: number; cost_vnd: number }

interface CostStats {
    pricing: { usd_vnd_rate: number; tikhub_note: string; gemini_note: string };
    totals: Money & {
        tikhub: Money & { paid_calls: number; cached_calls: number };
        gemini: Money & { calls: number; input_tokens: number; output_tokens: number };
        scripts: number;
        avg_script: Money;
    };
    by_page: (Money & { page: string; label: string; calls: number })[];
    /** Lượt gọi từ trang ngoài menu Khám phá Video — không cộng vào tổng */
    outside: Money & { calls: number };
    by_feature: (Money & { feature: string; label: string; calls: number })[];
    by_platform: (Money & { platform: string; calls: number })[];
    by_day: { date: string; tikhub_vnd: number; gemini_vnd: number }[];
    by_user: (Money & { user_id: string; name: string; calls: number })[];
    recent: (Money & {
        id: string; created_at: string; provider: string; page_label: string; feature_label: string; endpoint: string; calls: number;
        platform: string | null; cached: boolean; input_tokens: number; output_tokens: number;
        user_name: string | null; video_id: string | null;
    })[];
}

interface TikhubAccount {
    error?: string;
    key_name?: string;
    balance_usd?: number;
    balance_vnd?: number | null;
    today_usage_vnd?: number | null;
    today?: {
        date: string; time_zone: string; usage_usd: number; total_requests: number; paid_requests: number;
        top_endpoints: { endpoint: string; count: number; cost_usd: number }[];
    };
}

const vnd = (n: number | null | undefined) => `${Math.round(n ?? 0).toLocaleString('vi-VN')}đ`;
const usd = (n: number | null | undefined) => {
    const v = n ?? 0;
    return `$${v.toFixed(v > 0 && v < 1 ? 4 : 2)}`;
};
const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('vi-VN');
const shortEndpoint = (e: string) => e.replace('/api/v1/', '');

const card = 'bg-white border border-slate-200 shadow-sm dark:bg-white/[0.03] dark:border-white/[0.07] dark:shadow-none rounded-2xl';

function Tile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
    return (
        <div className={`${card} px-4 py-3 flex items-start gap-3`}>
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center flex-shrink-0">{icon}</div>
            <div className="min-w-0">
                <div className="text-slate-500 dark:text-slate-400 text-xs">{label}</div>
                <div className="text-slate-900 dark:text-white font-bold text-xl leading-tight">{value}</div>
                {sub && <div className="text-slate-500 dark:text-slate-500 text-[11px] mt-0.5">{sub}</div>}
            </div>
        </div>
    );
}

/**
 * Tab "Chi phí" (ADMIN/MANAGER): TikHub + Gemini của cả menu Khám phá Video đã tiêu bao nhiêu —
 * ở trang nào, cho bước nào, nền tảng nào, ai bấm — cộng số dư tài khoản TikHub để kiểm soát chi phí.
 */
export default function CostPanel() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const [range, setRange] = useState<DateRange>(() => resolvePreset('this_month'));
    const [stats, setStats] = useState<CostStats | null>(null);
    const [account, setAccount] = useState<TikhubAccount | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const r = normalizeRange(range);
        setLoading(true);
        setError('');
        try {
            const [statsRes, accountRes] = await Promise.all([
                fetchWithAuth(`${apiUrl}/video-library/costs?date_from=${r.from}&date_to=${r.to}`),
                fetchWithAuth(`${apiUrl}/video-library/costs/tikhub-account`),
            ]);
            if (!statsRes.ok) throw new Error((await statsRes.json().catch(() => null))?.message || `HTTP ${statsRes.status}`);
            setStats(await statsRes.json());
            setAccount(accountRes.ok ? await accountRes.json() : { error: `HTTP ${accountRes.status}` });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được thống kê chi phí');
        } finally {
            setLoading(false);
        }
    }, [apiUrl, range]);

    useEffect(() => { void load(); }, [load]);

    const activePreset = matchPreset(range);
    const t = stats?.totals;

    return (
        <div className="space-y-5">
            {/* Khoảng ngày */}
            <div className={`${card} p-3 flex flex-wrap items-center gap-2`}>
                {RANGE_PRESETS.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setRange(resolvePreset(p.id as RangePresetId))}
                        className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all ${
                            activePreset === p.id
                                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-600/20 dark:border-blue-500/40 dark:text-blue-300'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/[0.03] dark:border-white/[0.07] dark:text-slate-400'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
                <div className="flex items-center gap-2 ml-auto">
                    <DatePicker value={range.from} onChange={(v) => setRange((r) => ({ ...r, from: v }))} placeholder="Từ ngày" />
                    <span className="text-slate-400 text-xs">→</span>
                    <DatePicker value={range.to} onChange={(v) => setRange((r) => ({ ...r, to: v }))} placeholder="Đến ngày" align="right" />
                    <button onClick={() => void load()} className="w-9 h-9 rounded-lg border border-slate-200 dark:border-white/[0.07] flex items-center justify-center text-slate-600 dark:text-slate-400" title="Làm mới">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4 flex-none" /> {error}
                </div>
            )}

            {loading && !stats ? (
                <div className="flex items-center justify-center py-24 text-slate-500 text-sm gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Đang tải thống kê chi phí…</div>
            ) : stats && t && (
                <>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                        Chi phí menu Khám phá Video (Tìm kiếm Video, Kênh nội bộ, Khám phá kênh, Bộ sưu tập, cron tự động) trong khoảng{' '}
                        <b>{formatRangeLabel(normalizeRange(range))}</b> — quy đổi 1 USD = {num(stats.pricing.usd_vnd_rate)}đ.
                    </p>

                    {/* Tổng quan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <Tile icon={<Wallet className="w-4 h-4 text-emerald-500" />} label="Tổng chi phí" value={vnd(t.cost_vnd)} sub={usd(t.cost_usd)} />
                        <Tile icon={<Database className="w-4 h-4 text-sky-500" />} label="TikHub" value={vnd(t.tikhub.cost_vnd)}
                            sub={`${num(t.tikhub.paid_calls)} lượt tính tiền · ${num(t.tikhub.cached_calls)} lượt dùng lại bộ đệm (0đ)`} />
                        <Tile icon={<Cpu className="w-4 h-4 text-violet-500" />} label="Gemini" value={vnd(t.gemini.cost_vnd)}
                            sub={`${num(t.gemini.calls)} lượt · ${num(t.gemini.input_tokens + t.gemini.output_tokens)} token`} />
                        <Tile icon={<Coins className="w-4 h-4 text-amber-500" />} label="Trung bình mỗi kịch bản" value={vnd(t.avg_script.cost_vnd)}
                            sub={`${num(t.scripts)} kịch bản Gemini · ${usd(t.avg_script.cost_usd)}`} />
                    </div>

                    {/* Theo ngày */}
                    <div className={`${card} p-4`}>
                        <h4 className="text-slate-800 dark:text-white text-sm font-semibold mb-3">Chi phí theo ngày (VNĐ)</h4>
                        {stats.by_day.length === 0 ? (
                            <p className="text-slate-500 text-sm py-8 text-center">Chưa có chi phí nào trong khoảng này.</p>
                        ) : (
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.by_day.map((d) => ({ ...d, day: d.date.split('-').reverse().slice(0, 2).join('/') }))}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => num(v)} width={70} />
                                        <Tooltip formatter={(v) => vnd(Number(v))} />
                                        <Legend />
                                        <Bar dataKey="tikhub_vnd" name="TikHub" stackId="c" fill="#0ea5e9" />
                                        <Bar dataKey="gemini_vnd" name="Gemini" stackId="c" fill="#8b5cf6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {stats.outside.calls > 0 && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                            Ngoài Khám phá Video (không tính vào tổng): {vnd(stats.outside.cost_vnd)} · {num(stats.outside.calls)} lượt.
                        </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        <BreakdownTable title="Theo trang" rows={stats.by_page.map((p) => ({ key: p.page, label: p.label, calls: p.calls, vnd: p.cost_vnd }))} />
                        <BreakdownTable title="Theo bước" rows={stats.by_feature.map((f) => ({ key: f.feature, label: f.label, calls: f.calls, vnd: f.cost_vnd }))} />
                        <BreakdownTable title="Theo nền tảng" rows={stats.by_platform.map((p) => ({ key: p.platform, label: p.platform, calls: p.calls, vnd: p.cost_vnd }))} />
                        <BreakdownTable title="Theo người thao tác (top 10)" rows={stats.by_user.map((u) => ({ key: u.user_id, label: u.name, calls: u.calls, vnd: u.cost_vnd }))} />
                    </div>

                    {/* Tài khoản TikHub */}
                    <div className={`${card} p-4`}>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-slate-800 dark:text-white text-sm font-semibold">Tài khoản TikHub {account?.key_name ? `(${account.key_name})` : ''}</h4>
                            <span className="text-[11px] text-slate-500">Toàn tài khoản — gồm cả các tính năng cào dữ liệu khác</span>
                        </div>
                        {account?.error ? (
                            <p className="text-sm text-red-600 dark:text-red-400">{account.error}</p>
                        ) : account?.today ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <div className="text-xs text-slate-500">Số dư còn lại</div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{vnd(account.balance_vnd)}</div>
                                    <div className="text-xs text-slate-500">{usd(account.balance_usd)}</div>
                                    <div className="mt-3 text-xs text-slate-500">Hôm nay ({account.today.date}, giờ {account.today.time_zone})</div>
                                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">{vnd(account.today_usage_vnd)}</div>
                                    <div className="text-xs text-slate-500">{num(account.today.paid_requests)}/{num(account.today.total_requests)} lượt tính tiền</div>
                                </div>
                                <div className="md:col-span-2">
                                    <div className="text-xs text-slate-500 mb-1">Endpoint tốn nhiều nhất hôm nay</div>
                                    <table className="w-full text-xs">
                                        <tbody>
                                            {account.today.top_endpoints.map((e) => (
                                                <tr key={e.endpoint} className="border-t border-slate-100 dark:border-white/[0.05]">
                                                    <td className="py-1.5 pr-2 font-mono text-slate-700 dark:text-slate-300 break-all">{shortEndpoint(e.endpoint)}</td>
                                                    <td className="py-1.5 pr-2 text-right text-slate-500 whitespace-nowrap">{num(e.count)} lượt</td>
                                                    <td className="py-1.5 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">{vnd(e.cost_usd * stats.pricing.usd_vnd_rate)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Đang tải…</p>
                        )}
                    </div>

                    {/* Lượt gọi gần đây */}
                    <div className={`${card} p-4`}>
                        <h4 className="text-slate-800 dark:text-white text-sm font-semibold mb-2">Lượt gọi gần đây</h4>
                        {stats.recent.length === 0 ? (
                            <p className="text-slate-500 text-sm">Chưa có lượt nào.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="text-slate-500">
                                        <tr>
                                            <th className="text-left font-medium py-1.5 pr-2">Thời gian</th>
                                            <th className="text-left font-medium py-1.5 pr-2">Trang</th>
                                            <th className="text-left font-medium py-1.5 pr-2">Bước</th>
                                            <th className="text-left font-medium py-1.5 pr-2">Dịch vụ</th>
                                            <th className="text-left font-medium py-1.5 pr-2">Nền tảng</th>
                                            <th className="text-left font-medium py-1.5 pr-2">Người</th>
                                            <th className="text-right font-medium py-1.5">Chi phí</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recent.map((r) => (
                                            <tr key={r.id} className="border-t border-slate-100 dark:border-white/[0.05] text-slate-700 dark:text-slate-300">
                                                <td className="py-1.5 pr-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="py-1.5 pr-2 whitespace-nowrap">{r.page_label}</td>
                                                <td className="py-1.5 pr-2">{r.feature_label}{r.calls > 1 && <span className="text-slate-500"> ×{num(r.calls)}</span>}</td>
                                                <td className="py-1.5 pr-2 font-mono break-all">
                                                    {r.provider === 'GEMINI' ? `${r.endpoint} · ${num(r.input_tokens + r.output_tokens)} token` : shortEndpoint(r.endpoint)}
                                                    {r.cached && <span className="ml-1 text-emerald-600 dark:text-emerald-400">(bộ đệm)</span>}
                                                </td>
                                                <td className="py-1.5 pr-2">{r.platform ?? '—'}</td>
                                                <td className="py-1.5 pr-2">{r.user_name ?? '—'}</td>
                                                <td className="py-1.5 text-right whitespace-nowrap">{vnd(r.cost_vnd)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <Info className="w-3.5 h-3.5 mt-0.5 flex-none" />
                        <div className="space-y-0.5">
                            <p>TikHub: {stats.pricing.tikhub_note}</p>
                            <p>Gemini: {stats.pricing.gemini_note}</p>
                            <p>Tự động (cron): lượt do hệ thống tự chạy, không qua màn hình nào nên không tách được kênh nội bộ với khám phá kênh.</p>
                            <p>Chỉ tính từ khi bật theo dõi chi phí — lượt gọi trước đó không có trong thống kê.</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function BreakdownTable({ title, rows }: { title: string; rows: { key: string; label: string; calls: number; vnd: number }[] }) {
    return (
        <div className={`${card} p-4`}>
            <h4 className="text-slate-800 dark:text-white text-sm font-semibold mb-2">{title}</h4>
            {rows.length === 0 ? (
                <p className="text-slate-500 text-xs">Chưa có dữ liệu.</p>
            ) : (
                <table className="w-full text-xs">
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.key} className="border-t border-slate-100 dark:border-white/[0.05]">
                                <td className="py-1.5 pr-2 text-slate-700 dark:text-slate-300">{r.label}</td>
                                <td className="py-1.5 pr-2 text-right text-slate-500 whitespace-nowrap">{num(r.calls)} lượt</td>
                                <td className="py-1.5 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap font-medium">{vnd(r.vnd)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
