'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, Coins, Info, Layers, Loader2, RefreshCw, Sparkles, Table2, Wallet, XCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { DatePicker } from '@/components/ui/DatePicker';
import { apiErrorMessage } from '@/lib/product-image/api-error';
import {
  RANGE_PRESETS,
  formatRangeLabel,
  matchPreset,
  normalizeRange,
  resolvePreset,
  type DateRange,
} from '@/lib/ai-usage/usage-range';
import {
  formatCount,
  formatGenerationCost,
  formatRatio,
  formatUsd,
  formatVnd,
  type ProductImageCostStats,
} from '@/lib/product-image/cost-view';

/** Màu duy nhất của biểu đồ (1 chuỗi số liệu) — màu chủ đạo của trang, đã chạy trình kiểm màu:
 *  đạt ngưỡng sáng, độ đậm và tương phản ≥ 3:1 trên nền trắng. */
const BAR_COLOR = '#4441cc';

const card = 'bg-white border border-[#e2e0ea] rounded-2xl';

function Tile({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className={`${card} px-4 py-3 flex items-start gap-3`}>
      <div className="w-9 h-9 rounded-lg bg-[#f4f3f8] flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[#6b6a78] text-xs">{label}</div>
        <div className="text-[#1b1b1d] font-bold text-xl leading-tight">{value}</div>
        {sub && <div className="text-[#6b6a78] text-[11px] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/** "2026-09-29" → "29/09" cho trục ngày. */
const shortDay = (date: string) => date.split('-').reverse().slice(0, 2).join('/');

/**
 * Tab "Chi phí" (ADMIN/MANAGER) của Tạo ảnh sản phẩm: Gemini đã tốn bao nhiêu, bao nhiêu lượt để
 * ra 1 ảnh đạt, theo ngày / sản phẩm / người — chính là các số mục 3–4 của phương án tạo ảnh SP mới.
 */
export function ProductImageCostPanel() {
  const [range, setRange] = useState<DateRange>(() => resolvePreset('this_month'));
  const [stats, setStats] = useState<ProductImageCostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDayTable, setShowDayTable] = useState(false);

  const load = useCallback(async () => {
    const r = normalizeRange(range);
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<ProductImageCostStats>('/product-image/costs', {
        params: { date_from: r.from || undefined, date_to: r.to || undefined },
      });
      setStats(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Không tải được thống kê chi phí'));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const activePreset = matchPreset(range);
  const t = stats?.totals;

  return (
    <div className="space-y-5">
      {/* Bộ lọc — một hàng, phía trên mọi số liệu nó áp vào */}
      <div className={`${card} p-3 flex flex-wrap items-center gap-2`}>
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setRange(resolvePreset(p.id))}
            className={`text-xs px-3 py-2 rounded-lg border font-medium transition-colors ${
              activePreset === p.id
                ? 'bg-[#4441cc]/10 border-[#4441cc]/40 text-[#4441cc]'
                : 'bg-white border-[#e2e0ea] text-[#464554] hover:text-[#1b1b1d]'
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <DatePicker value={range.from} onChange={(v) => setRange((r) => ({ ...r, from: v }))} placeholder="Từ ngày" />
          <span className="text-[#9c9aa8] text-xs">→</span>
          <DatePicker value={range.to} onChange={(v) => setRange((r) => ({ ...r, to: v }))} placeholder="Đến ngày" align="right" />
          <button
            type="button"
            onClick={() => void load()}
            className="w-9 h-9 rounded-lg border border-[#e2e0ea] flex items-center justify-center text-[#464554]"
            title="Làm mới"
            aria-label="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="w-4 h-4 flex-none" /> {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="flex items-center justify-center py-24 text-[#6b6a78] text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Đang tải thống kê chi phí…
        </div>
      ) : (
        stats &&
        t && (
          // Tải lại giữ nguyên khung cũ (mờ đi) — không nhảy bố cục, không chớp trắng.
          <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <p className="text-[#6b6a78] text-xs">
              Chi phí Tạo ảnh sản phẩm trong khoảng <b>{formatRangeLabel(normalizeRange(range))}</b> — quy đổi 1 USD ={' '}
              {formatCount(stats.pricing.usd_vnd_rate)}đ.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <Tile icon={<Wallet className="w-4 h-4 text-[#4441cc]" />} label="Tổng chi phí Gemini" value={formatVnd(t.cost_vnd)} sub={formatUsd(t.cost_usd)} />
              <Tile
                icon={<Sparkles className="w-4 h-4 text-[#4441cc]" />}
                label="Lượt tạo ảnh (Gemini)"
                value={formatCount(t.attempts)}
                sub={`${formatCount(t.success)} ra ảnh · ${formatCount(t.failed)} lỗi`}
              />
              <Tile
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                label="Ảnh đạt"
                value={formatCount(t.approved)}
                sub={t.success ? `${Math.round((t.approved / t.success) * 100)}% số ảnh tạo ra` : 'Chưa có ảnh nào'}
              />
              <Tile
                icon={<Coins className="w-4 h-4 text-amber-600" />}
                label="Chi phí cho 1 ảnh đạt"
                value={t.per_approved ? formatVnd(t.per_approved.cost_vnd) : '—'}
                sub={t.per_approved ? `Trung bình ${formatRatio(t.per_approved.attempts)} lượt tạo / 1 ảnh đạt` : 'Chưa có ảnh bấm "Đạt"'}
              />
              <Tile
                icon={<Layers className="w-4 h-4 text-[#464554]" />}
                label="Tách nền (miễn phí)"
                value={formatCount(t.cutouts)}
                sub={t.cutout_failed ? `${formatCount(t.cutout_failed)} lượt lỗi` : 'Chạy trên máy chủ, 0đ'}
              />
            </div>

            {t.unpriced > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-none mt-0.5" />
                <div>
                  <p className="font-semibold">{formatCount(t.unpriced)} lượt chưa tính được tiền — tổng chi phí ở trên đang thiếu các lượt này.</p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {stats.unpriced_notes.map((n) => (
                      <li key={n.note}>
                        {formatCount(n.count)} lượt: {n.note}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Theo ngày — 1 chuỗi số liệu: không hộp chú thích (tiêu đề đã nói), có tooltip + dạng bảng */}
            <div className={`${card} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[#1b1b1d] text-sm font-semibold">Chi phí Gemini theo ngày (VNĐ)</h4>
                {stats.by_day.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDayTable((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#464554] hover:text-[#4441cc]"
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    {showDayTable ? 'Xem biểu đồ' : 'Xem dạng bảng'}
                  </button>
                )}
              </div>
              {stats.by_day.length === 0 ? (
                <p className="text-[#6b6a78] text-sm py-8 text-center">Chưa có lượt tạo ảnh nào trong khoảng này.</p>
              ) : showDayTable ? (
                <table className="w-full text-xs">
                  <thead className="text-[#6b6a78]">
                    <tr>
                      <th className="text-left font-medium py-1.5 pr-2">Ngày</th>
                      <th className="text-right font-medium py-1.5 pr-2">Lượt tạo</th>
                      <th className="text-right font-medium py-1.5 pr-2">Ảnh đạt</th>
                      <th className="text-right font-medium py-1.5">Chi phí</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {stats.by_day.map((d) => (
                      <tr key={d.date} className="border-t border-[#f0eff5] text-[#1b1b1d]">
                        <td className="py-1.5 pr-2">{d.date.split('-').reverse().join('/')}</td>
                        <td className="py-1.5 pr-2 text-right">{formatCount(d.attempts)}</td>
                        <td className="py-1.5 pr-2 text-right">{formatCount(d.approved)}</td>
                        <td className="py-1.5 text-right font-medium">{formatVnd(d.cost_vnd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-56">
                  {/* initialDimension: lần vẽ đầu recharts chưa đo được khung (-1) và báo cảnh báo
                      ra console — cho sẵn một kích thước tạm, đo xong nó tự co giãn theo khung. */}
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 800, height: 224 }}>
                    <BarChart data={stats.by_day.map((d) => ({ ...d, day: shortDay(d.date) }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#ecebf2" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b6a78' }} tickLine={false} axisLine={{ stroke: '#d9d8e2' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b6a78' }} tickFormatter={(v) => formatCount(Number(v))} width={70} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#4441cc', fillOpacity: 0.06 }} content={<DayTooltip />} />
                      <Bar dataKey="cost_vnd" name="Chi phí" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Theo sản phẩm — đúng các số của mục 4 phương án */}
            <div className={`${card} p-4`}>
              <h4 className="text-[#1b1b1d] text-sm font-semibold mb-2">Theo sản phẩm</h4>
              {stats.by_product.length === 0 ? (
                <p className="text-[#6b6a78] text-xs">Chưa có dữ liệu.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-[#6b6a78]">
                      <tr>
                        <th className="text-left font-medium py-1.5 pr-2">Sản phẩm</th>
                        <th className="text-right font-medium py-1.5 pr-2">Lượt tạo</th>
                        <th className="text-right font-medium py-1.5 pr-2">Ảnh đạt</th>
                        <th className="text-right font-medium py-1.5 pr-2">Lượt / 1 ảnh đạt</th>
                        <th className="text-right font-medium py-1.5 pr-2">Chi phí</th>
                        <th className="text-right font-medium py-1.5">Chi phí / 1 ảnh đạt</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {stats.by_product.map((p) => (
                        <tr key={p.product_name} className="border-t border-[#f0eff5] text-[#1b1b1d]">
                          <td className="py-1.5 pr-2">{p.product_name}</td>
                          <td className="py-1.5 pr-2 text-right">{formatCount(p.attempts)}</td>
                          <td className="py-1.5 pr-2 text-right">{formatCount(p.approved)}</td>
                          <td className="py-1.5 pr-2 text-right">{formatRatio(p.per_approved?.attempts ?? null)}</td>
                          <td className="py-1.5 pr-2 text-right font-medium">{formatVnd(p.cost_vnd)}</td>
                          <td className="py-1.5 text-right">{p.per_approved ? formatVnd(p.per_approved.cost_vnd) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className={`${card} p-4`}>
                <h4 className="text-[#1b1b1d] text-sm font-semibold mb-2">Theo người thao tác</h4>
                {stats.by_user.length === 0 ? (
                  <p className="text-[#6b6a78] text-xs">Chưa có dữ liệu.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="text-[#6b6a78]">
                      <tr>
                        <th className="text-left font-medium py-1.5 pr-2">Người</th>
                        <th className="text-right font-medium py-1.5 pr-2">Lượt tạo</th>
                        <th className="text-right font-medium py-1.5 pr-2">Ảnh đạt</th>
                        <th className="text-right font-medium py-1.5 pr-2">Tách nền</th>
                        <th className="text-right font-medium py-1.5">Chi phí</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {stats.by_user.map((u) => (
                        <tr key={u.user_id} className="border-t border-[#f0eff5] text-[#1b1b1d]">
                          <td className="py-1.5 pr-2">{u.name}</td>
                          <td className="py-1.5 pr-2 text-right">{formatCount(u.attempts)}</td>
                          <td className="py-1.5 pr-2 text-right">{formatCount(u.approved)}</td>
                          <td className="py-1.5 pr-2 text-right">{formatCount(u.cutouts)}</td>
                          <td className="py-1.5 text-right font-medium">{formatVnd(u.cost_vnd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className={`${card} p-4`}>
                <h4 className="text-[#1b1b1d] text-sm font-semibold mb-2">Lượt gần đây</h4>
                {stats.recent.length === 0 ? (
                  <p className="text-[#6b6a78] text-xs">Chưa có lượt nào.</p>
                ) : (
                  <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-[#6b6a78] sticky top-0 bg-white">
                        <tr>
                          <th className="text-left font-medium py-1.5 pr-2">Thời gian</th>
                          <th className="text-left font-medium py-1.5 pr-2">Người</th>
                          <th className="text-left font-medium py-1.5 pr-2">Lượt</th>
                          <th className="text-right font-medium py-1.5">Chi phí</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recent.map((r) => (
                          <tr key={r.id} className="border-t border-[#f0eff5] text-[#1b1b1d] align-top">
                            <td className="py-1.5 pr-2 whitespace-nowrap tabular-nums">
                              {new Date(r.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-1.5 pr-2">{r.user_name}</td>
                            <td className="py-1.5 pr-2">
                              <span className="inline-flex items-center gap-1">
                                {r.status === 'SUCCESS' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-label="Thành công" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" aria-label="Lỗi" />
                                )}
                                {r.mode === 'CUTOUT' ? 'Tách nền' : r.product_name || 'Chị Nhạm cầm SP'}
                                {r.approved && <span className="ml-1 rounded bg-emerald-50 px-1 text-emerald-700">Đạt</span>}
                              </span>
                              {r.status !== 'SUCCESS' && r.error_message && (
                                <div className="text-[11px] text-[#6b6a78] line-clamp-2" title={r.error_message}>
                                  {r.error_message}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 text-right whitespace-nowrap tabular-nums" title={r.cost_note ?? undefined}>
                              {r.mode === 'CUTOUT' ? '0đ' : formatGenerationCost(r.cost_vnd)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-[#6b6a78]">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-none" />
              <div className="space-y-0.5">
                <p>{stats.pricing.note}</p>
                <p>Lượt tạo = lượt Gemini đã chạy (kể cả lượt không ra ảnh vẫn tốn token); lượt bị từ chối ngay (sai model, hết hạn mức) không tính.</p>
                <p>Chỉ tính từ khi bật theo dõi chi phí — đối chiếu tổng tiền với trang billing của Google khi test.</p>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

/** Tooltip của cột: số tiền là phần nổi, ngày + số lượt là phần phụ; màu cột chỉ ở vạch nhận diện. */
function DayTooltip({ active, payload }: { active?: boolean; payload?: { payload: ProductImageCostStats['by_day'][number] }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#e2e0ea] bg-white px-3 py-2 text-xs shadow-sm">
      <div className="text-[#6b6a78]">{d.date.split('-').reverse().join('/')}</div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="inline-block w-3 h-0.5 rounded" style={{ background: BAR_COLOR }} />
        <span className="text-[#1b1b1d] font-semibold text-sm">{formatVnd(d.cost_vnd)}</span>
      </div>
      <div className="text-[#6b6a78] mt-0.5">
        {formatCount(d.attempts)} lượt tạo · {formatCount(d.approved)} ảnh đạt
      </div>
    </div>
  );
}
