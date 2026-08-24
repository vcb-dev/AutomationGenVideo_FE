'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Search,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';

/**
 * 1 dòng trong bảng tổng quan — khớp `MemberTransformSummary` bên page.tsx (BE trả sẵn tổng số
 * lượt cho MỌI thành viên trong 1 lần gọi /ai/content-transform/history/team-summary).
 */
interface MemberTransformSummary {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  team?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  totalTransforms: number;
  lastTransformAt: string | null;
}

type InputTypeKey = 'TEXT' | 'VIDEO' | 'AUDIO';

interface InputTypeCount {
  input_type: InputTypeKey;
  count: number;
}

interface TrendPoint {
  date: string;
  count: number;
}

interface TeamSummaryResponse {
  members: MemberTransformSummary[];
  totalMembers: number;
  totalTransforms: number;
  byInputType: InputTypeCount[];
  trend: {
    range: RangeKey;
    points: TrendPoint[];
    periodTotal: number;
    previousPeriodTotal: number;
  };
}

type RangeKey = '7d' | '30d' | '90d';
const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

// BE CHƯA track "loại nội dung" (bài viết/video/hình ảnh) — chỉ có input_type lúc tạo bản ghi
// (văn bản gõ tay / video / audio để transcribe). Dùng tạm field này làm donut "Theo loại nội
// dung", đổi nhãn cho đúng ý nghĩa thật thay vì suy diễn ra "Hình ảnh" — xem ghi chú ở page.tsx.
const INPUT_TYPE_META: Record<InputTypeKey, { label: string; color: string }> = {
  TEXT: { label: 'Văn bản', color: '#4441cc' },
  VIDEO: { label: 'Video', color: '#7e7deb' },
  AUDIO: { label: 'Giọng nói', color: '#c3c1f5' },
};

const MEMBER_AVATAR_COLORS = [
  'bg-[#5e5ce6]/10 text-[#4441cc]',
  'bg-emerald-500/10 text-emerald-600',
  'bg-amber-500/10 text-amber-600',
  'bg-rose-500/10 text-rose-600',
  'bg-sky-500/10 text-sky-600',
  'bg-fuchsia-500/10 text-fuchsia-600',
];

function memberInitials(name: string): string {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Màu avatar ổn định theo id — cùng 1 người luôn ra cùng 1 màu giữa các lần render. */
function memberAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return MEMBER_AVATAR_COLORS[hash % MEMBER_AVATAR_COLORS.length];
}

const formatNumber = (n: number) => n.toLocaleString('vi-VN');

/** "YYYY-MM-DD" → "dd/MM" cho trục ngày — thao tác chuỗi thuần, không qua `new Date()` để tránh
 *  lệch ngày theo timezone máy người xem (chuỗi vào là 1 NGÀY LỊCH đã chốt sẵn từ BE). */
function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}
function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
}

/**
 * Badge % thay đổi so với kỳ trước liền kề (cùng độ dài, ngay trước `range` đang chọn) — dùng
 * chung cho card "Tổng lượt chuyển đổi" và "Trung bình mỗi người" (2 card này luôn ra cùng 1 %
 * vì chia cho cùng 1 số thành viên, đổi kỳ so sánh sẽ tự đổi theo nút 7D/30D/90D).
 */
function computeDelta(current: number, previous: number): { label: string; direction: 'up' | 'down' | 'flat' } | null {
  if (previous <= 0) {
    if (current <= 0) return null;
    return { label: 'Mới', direction: 'up' };
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.round(pct) === 0) return { label: '0%', direction: 'flat' };
  return { label: `${pct > 0 ? '+' : ''}${Math.round(pct)}%`, direction: pct > 0 ? 'up' : 'down' };
}

function DeltaBadge({ delta }: { delta: ReturnType<typeof computeDelta> }) {
  if (!delta) return null;
  const style =
    delta.direction === 'up'
      ? 'bg-emerald-500/10 text-emerald-600'
      : delta.direction === 'down'
        ? 'bg-rose-500/10 text-rose-600'
        : 'bg-[#eae7ea] text-[#464554]';
  const Icon = delta.direction === 'up' ? ArrowUpRight : delta.direction === 'down' ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold ${style}`}>
      <Icon className="w-3 h-3" />
      {delta.label}
    </span>
  );
}

/** Sparkline mini — không trục, không tooltip, chỉ gợi ý xu hướng trong `range` đang chọn. */
function Sparkline({ data, dataKey }: { data: { key: string; value: number }[]; dataKey: string }) {
  if (data.length < 2) return null;
  return (
    <div className="h-7 -mx-1 mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 1, left: 1, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5e5ce6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5e5ce6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#5e5ce6"
            strokeWidth={1.5}
            fill={`url(#spark-${dataKey})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 1 ô KPI tổng quan — icon vuông nền tím nhạt đồng nhất cho cả 4 chỉ số theo đúng thiết kế. */
function KpiCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Users;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3.5 rounded-2xl border border-[#eae7ea] bg-white">
      <div className="w-9 h-9 rounded-xl bg-[#5e5ce6]/10 flex items-center justify-center mb-2">
        <Icon className="w-4.5 h-4.5 text-[#4441cc]" />
      </div>
      <p className="text-[11px] font-semibold text-[#464554]/80 uppercase tracking-wide truncate">{label}</p>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: TrendPoint = payload[0].payload;
  return (
    <div className="bg-white border border-[#eae7ea] rounded-xl px-3 py-2 shadow-lg shadow-[#1b1b1d]/10">
      <p className="text-xs font-bold text-[#1b1b1d] capitalize">{formatFullDate(d.date)}</p>
      <p className="text-xs text-[#464554] mt-0.5">
        <span className="font-bold text-[#4441cc]">{formatNumber(d.count)}</span> lượt chuyển đổi
      </p>
    </div>
  );
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as { label: string; count: number };
  return (
    <div className="bg-white border border-[#eae7ea] rounded-xl px-3 py-2 shadow-lg shadow-[#1b1b1d]/10">
      <p className="text-xs font-bold text-[#1b1b1d]">{d.label}</p>
      <p className="text-xs text-[#464554] mt-0.5">
        <span className="font-bold text-[#4441cc]">{formatNumber(d.count)}</span> lượt
      </p>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-[#eae7ea] bg-white p-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#eae7ea] mb-2" />
            <div className="h-3 w-20 rounded bg-[#eae7ea] mb-2" />
            <div className="h-6 w-16 rounded bg-[#eae7ea]" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl border border-[#eae7ea] bg-white p-5 h-72" />
        <div className="lg:col-span-2 rounded-2xl border border-[#eae7ea] bg-white p-5 h-72" />
      </div>
      <div className="rounded-2xl border border-[#eae7ea] bg-white p-5 h-64" />
    </div>
  );
}

const TABLE_VISIBLE_ROWS = 8;

/**
 * Tab "Thống kê" của khu Chuyển đổi nội dung — redesign theo layout KPI + xu hướng + donut +
 * bảng xếp hạng. Tự fetch dữ liệu riêng (không nhận props), tự kiểm tra quyền xem — cùng cách tổ
 * chức với StatsTab của khu Tạo ảnh thẻ (tien-ich/id-photo/components/StatsTab.tsx).
 */
export function TeamStatsTab() {
  const { user } = useAuthStore();
  const isPrivileged =
    user?.roles?.some((r) => [UserRole.LEADER, UserRole.MANAGER, UserRole.ADMIN].includes(r)) ?? false;

  const [range, setRange] = useState<RangeKey>('30d');
  const [data, setData] = useState<TeamSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllRows, setShowAllRows] = useState(false);

  const fetchTeamSummary = useCallback(async (r: RangeKey) => {
    if (!isPrivileged) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get<TeamSummaryResponse>('/ai/content-transform/history/team-summary', {
        params: { range: r },
      });
      setData(res.data);
    } catch (err: any) {
      setData(null);
      toast.error(err.response?.data?.message || 'Không thể tải thống kê đội nhóm');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [isPrivileged]);

  useEffect(() => {
    fetchTeamSummary(range);
  }, [range, fetchTeamSummary]);

  // BE đã sort sẵn giảm dần theo totalTransforms (tie-break theo tên) — sort lại ở FE để không
  // phụ thuộc ngầm vào thứ tự API trả về, và để card "Dẫn đầu" luôn lấy đúng phần tử [0] của
  // CÙNG mảng dựng nên dòng #1 của bảng (không lệch do 2 nguồn dữ liệu khác nhau).
  const ranked = useMemo(
    () =>
      [...(data?.members || [])].sort(
        (a, b) => b.totalTransforms - a.totalTransforms || (a.full_name || '').localeCompare(b.full_name || '', 'vi'),
      ),
    [data],
  );

  const totalMembers = data?.totalMembers ?? 0;
  const totalTransforms = data?.totalTransforms ?? 0;
  const activeMembers = useMemo(() => ranked.filter((m) => m.totalTransforms > 0).length, [ranked]);
  const avgPerMember = totalMembers > 0 ? totalTransforms / totalMembers : 0;
  const leader = ranked[0]?.totalTransforms ? ranked[0] : null;

  const delta = data ? computeDelta(data.trend.periodTotal, data.trend.previousPeriodTotal) : null;
  const sparklineData = useMemo(
    () => (data?.trend.points || []).map((p) => ({ key: p.date, value: p.count })),
    [data],
  );
  const avgSparklineData = useMemo(
    () =>
      totalMembers > 0
        ? (data?.trend.points || []).map((p) => ({ key: p.date, value: p.count / totalMembers }))
        : [],
    [data, totalMembers],
  );

  const donutData = useMemo(() => {
    const byType = new Map((data?.byInputType || []).map((d) => [d.input_type, d.count]));
    return (Object.keys(INPUT_TYPE_META) as InputTypeKey[]).map((key) => ({
      key,
      label: INPUT_TYPE_META[key].label,
      color: INPUT_TYPE_META[key].color,
      count: byType.get(key) || 0,
    }));
  }, [data]);
  const donutTotal = donutData.reduce((s, d) => s + d.count, 0);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter(
      (m) => m.full_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q),
    );
  }, [ranked, searchQuery]);
  const isSearching = searchQuery.trim().length > 0;
  const visibleMembers = isSearching || showAllRows ? filteredMembers : filteredMembers.slice(0, TABLE_VISIBLE_ROWS);

  if (!isPrivileged) {
    return (
      <div className="bg-white border border-[#c7c4d7] rounded-3xl p-12 text-center space-y-4 shadow-sm">
        <Users className="w-16 h-16 text-[#464554]/50 mx-auto" />
        <h3 className="text-xl font-bold text-[#1b1b1d]">Thống kê Đội nhóm</h3>
        <p className="text-[#464554] text-sm max-w-md mx-auto leading-relaxed">
          Tính năng Thống kê Đội nhóm đang được phát triển (Sắp ra mắt dành cho Thành viên). Hiện tại chỉ có tài
          khoản cấp Quản lý (Leader, Manager, Admin) mới có thể truy cập để xem dữ liệu của thành viên khác.
        </p>
      </div>
    );
  }

  if (isLoading && !hasLoaded) return <StatsSkeleton />;

  if (!data || ranked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 rounded-2xl border border-dashed border-[#c7c4d7] bg-[#fcf8fb] text-[#464554] space-y-2">
        <Users className="w-10 h-10 mx-auto text-[#464554]/50" />
        <p className="text-sm font-semibold text-[#1b1b1d]">Chưa có thành viên nào trong phạm vi của bạn</p>
        <p className="text-xs max-w-xs mx-auto text-[#464554]/75">
          Khi có thành viên thuộc team bạn quản lý, số lượt chuyển đổi của họ sẽ được tổng hợp tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 1. Hàng KPI ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard icon={Zap} label="Tổng lượt chuyển đổi">
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-[#1b1b1d] leading-tight">{formatNumber(totalTransforms)}</span>
            <DeltaBadge delta={delta} />
          </div>
          <Sparkline data={sparklineData} dataKey="total" />
        </KpiCard>

        <KpiCard icon={Users} label="Thành viên hoạt động">
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-[#1b1b1d] leading-tight">{activeMembers}</span>
            <span className="text-xs font-semibold text-[#464554]/70">/{totalMembers}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#eae7ea] overflow-hidden mt-2.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4441cc] to-[#5e5ce6]"
              style={{ width: `${totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0}%` }}
            />
          </div>
        </KpiCard>

        <KpiCard icon={TrendingUp} label="Trung bình mỗi người">
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-[#1b1b1d] leading-tight">
              {avgPerMember.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
            </span>
            <DeltaBadge delta={delta} />
          </div>
          <Sparkline data={avgSparklineData} dataKey="avg" />
        </KpiCard>

        <KpiCard icon={Trophy} label="Dẫn đầu">
          {leader ? (
            <div className="flex items-center gap-2 mt-1">
              {leader.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={leader.image_url}
                  alt={leader.full_name || leader.email}
                  className="w-8 h-8 rounded-lg object-cover flex-none border border-[#eae7ea]"
                />
              ) : (
                <span
                  className={`w-8 h-8 rounded-lg text-[11px] font-bold flex items-center justify-center flex-none ${memberAvatarColor(leader.id)}`}
                >
                  {memberInitials(leader.full_name)}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#1b1b1d] truncate">{leader.full_name || leader.email}</p>
                <p className="text-[10.5px] text-[#464554]/70">{formatNumber(leader.totalTransforms)} lượt</p>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-[#464554]/60 mt-1.5">Chưa có dữ liệu</p>
          )}
        </KpiCard>
      </div>

      {/* ── 2. Xu hướng (60%) + Theo loại nội dung (40%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <section className="lg:col-span-3 rounded-2xl border border-[#eae7ea] bg-white p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-[#1b1b1d]">Xu hướng chuyển đổi theo thời gian</h3>
            <div className="inline-flex items-center rounded-lg border border-[#eae7ea] bg-[#fcf8fb] p-0.5">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setRange(opt.key)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                    range === opt.key ? 'bg-white text-[#4441cc] shadow-sm' : 'text-[#464554] hover:text-[#4441cc]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5e5ce6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#5e5ce6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, Math.ceil((data.trend.points.length || 1) / 7) - 1)}
                  tick={{ fontSize: 11, fill: '#9c9aa8' }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#c7c4d7', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#4441cc"
                  strokeWidth={2}
                  fill="url(#trend-fill)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#4441cc', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-2 rounded-2xl border border-[#eae7ea] bg-white p-5">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-[#1b1b1d]">Theo loại nội dung</h3>
            <p className="text-[10.5px] text-[#464554]/70 mt-0.5">
              Phân loại theo định dạng đầu vào lúc tạo — toàn bộ thời gian
            </p>
          </div>
          {donutTotal === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#464554]/60">Chưa có dữ liệu</div>
          ) : (
            <>
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={donutData.filter((d) => d.count > 0).length > 1 ? 2 : 0}
                      dataKey="count"
                      isAnimationActive={false}
                    >
                      {donutData.map((d) => (
                        <Cell key={d.key} fill={d.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-[#1b1b1d] leading-none">{formatNumber(donutTotal)}</span>
                  <span className="text-[10px] text-[#464554]/70 mt-1">Tổng số</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
                {donutData.map((d) => (
                  <span key={d.key} className="inline-flex items-center gap-1.5 text-[11px] text-[#464554]">
                    <i className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: d.color }} />
                    {d.label}
                    <span className="font-semibold text-[#1b1b1d]">{formatNumber(d.count)}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── 3. Bảng hiệu suất theo thành viên ── */}
      <section className="rounded-2xl border border-[#eae7ea] bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 pb-3">
          <h3 className="text-sm font-bold text-[#1b1b1d]">Hiệu suất theo thành viên</h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#464554]/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm thành viên..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#eae7ea] bg-white text-[#1b1b1d] placeholder:text-[#464554]/50 focus:outline-none focus:ring-2 focus:ring-[#4441cc]/30 w-40 sm:w-56"
            />
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#464554]/70">
            Không tìm thấy thành viên nào khớp với &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-y border-[#eae7ea] bg-[#fcf8fb] text-[11px] font-bold text-[#464554] uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-16">Xếp hạng</th>
                  <th className="py-2.5 px-4">Thành viên</th>
                  <th className="py-2.5 px-4 w-36">Phòng ban</th>
                  <th className="py-2.5 px-4 w-[30%]">Tiến độ</th>
                  <th className="py-2.5 px-4 w-32 text-right">Lượt chuyển đổi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eae7ea]/60 text-sm text-[#464554]">
                {visibleMembers.map((m) => {
                  const rank = ranked.indexOf(m) + 1;
                  const hasActivity = m.totalTransforms > 0;
                  const ratioPct = leader && leader.totalTransforms > 0
                    ? Math.max(4, Math.round((m.totalTransforms / leader.totalTransforms) * 100))
                    : 0;
                  return (
                    <tr key={m.id} className="hover:bg-[#f6f3f5] transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-xs font-bold text-[#9c9aa8] tabular-nums">
                          {hasActivity ? rank : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {m.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.image_url}
                              alt={m.full_name || m.email}
                              className="w-8 h-8 rounded-full object-cover flex-none border border-[#eae7ea]"
                            />
                          ) : (
                            <span
                              className={`w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center flex-none ${memberAvatarColor(m.id)}`}
                            >
                              {memberInitials(m.full_name)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1b1b1d] truncate">{m.full_name || m.email}</p>
                            <p className="text-[11px] text-[#9c9aa8] truncate">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {m.team ? (
                          <span className="text-[11px] font-semibold text-[#464554] bg-[#f6f3f5] border border-[#eae7ea] px-2 py-0.5 rounded-full">
                            {m.team}
                          </span>
                        ) : (
                          <span className="text-xs text-[#9c9aa8]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {hasActivity ? (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-[60px] h-1.5 rounded-full bg-[#eae7ea] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#4441cc] to-[#5e5ce6]"
                                style={{ width: `${ratioPct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[#9c9aa8] italic">Chưa có hoạt động</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-black text-[#1b1b1d] tabular-nums">
                          {formatNumber(m.totalTransforms)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isSearching && filteredMembers.length > TABLE_VISIBLE_ROWS && (
          <div className="border-t border-[#eae7ea] py-2.5 text-center">
            <button
              onClick={() => setShowAllRows((v) => !v)}
              className="text-xs font-semibold text-[#4441cc] hover:underline"
            >
              {showAllRows ? 'Thu gọn' : `Xem tất cả (${filteredMembers.length})`}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
