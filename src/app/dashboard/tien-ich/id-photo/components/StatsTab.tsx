'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Gauge, Images, Layers, Trophy, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { IdPhotoPosition } from './constants';

/**
 * 1 dòng trong bảng tổng quan — BE trả sẵn tổng số lượt cho MỌI thành viên trong 1 lần gọi
 * (/id-photo/history/team-summary), không gọi đếm từng người. Khớp shape với
 * MemberTransformSummary bên content-transform, chỉ khác tên 2 field số liệu.
 */
interface MemberIdPhotoSummary {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  team?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  totalPhotos: number;
  lastPhotoAt: string | null;
}

/** 1 điểm trong biểu đồ xu hướng — `date` là NGÀY LỊCH VN dạng "YYYY-MM-DD" (xem
 *  IdPhotoService#getSoloBreakdown ở BE), không phải mốc UTC nên KHÔNG được `new Date(date)`
 *  trực tiếp (browser sẽ parse ra UTC midnight rồi lệch ngày khi hiển thị theo giờ local). */
interface PhotoTrendPoint {
  date: string;
  count: number;
}

/** 1 dòng phân bổ theo cấp bậc thẻ. BE trả sẵn `label` tiếng Việt — dùng thẳng, KHÔNG tự suy ra
 *  từ POSITION_OPTIONS ở constants.ts: 2 bảng nhãn FE/BE hiện lệch chữ ở NEW_STAFF_1_3M/STAFF_OVER_3M
 *  (xem constants.ts), nhãn của breakdown này phải khớp đúng cách BE đang gọi tên, không phải cách
 *  form nhập liệu FE đang gọi tên. */
interface PhotoPositionBreakdown {
  position: IdPhotoPosition;
  label: string;
  count: number;
}

/**
 * ⚠ Shape này là bản sao ĐÚNG payload BE đang trả (`IdPhotoService#getTeamSummary`).
 * `trend`/`positionBreakdown` chỉ có mặt khi phạm vi quyền của người gọi CHỈ có đúng 1 thành
 * viên — xem comment ở component bên dưới.
 */
interface TeamSummaryResponse {
  members: MemberIdPhotoSummary[];
  totalMembers: number;
  totalPhotos: number;
  trend?: PhotoTrendPoint[];
  positionBreakdown?: PhotoPositionBreakdown[];
}

const MEMBER_AVATAR_COLORS = [
  'bg-[#5e5ce6]/10 text-[#4441cc]',
  'bg-emerald-500/10 text-emerald-600',
  'bg-amber-500/10 text-amber-600',
  'bg-rose-500/10 text-rose-600',
  'bg-sky-500/10 text-sky-600',
  'bg-fuchsia-500/10 text-fuchsia-600',
];

/**
 * Cột dùng ĐÚNG 1 màu cho mọi thành viên, cố ý không tô đậm dần theo số lượt: "thành viên" là
 * nhóm danh định (không có thứ tự tự nhiên), tô theo giá trị sẽ mã hoá lặp lại đúng thứ mà độ
 * dài cột đã nói, và thang màu theo hạng khiến cùng 1 người đổi màu sau mỗi lần refetch.
 * Hue lấy thẳng từ token primary của khu Tiện ích (#5e5ce6) — tương phản với nền trắng của card
 * đã kiểm đạt ngưỡng 3:1.
 */
const CHART_HUE = '#5e5ce6';

/**
 * Bảng màu 5 bậc cho biểu đồ "Phân bổ theo cấp bậc thẻ" — CỐ Ý không dùng lại màu khung thẻ thật
 * (FRAME_COLOR_BY_POSITION/POSITION_OPTIONS.color: Trắng/Vàng/Xanh/Đỏ/Đen) vì cấp bậc là dữ liệu
 * ORDINAL (Nhân viên mới → ... → BOD là 1 thang thâm niên, không phải các nhóm danh định), và
 * riêng 2 màu Trắng/Đen gần như không có chroma nên không đọc được là "màu" trên nền trắng của
 * card. Thay vào đó dùng đúng 1 hue (trùng CHART_HUE) với độ sáng giảm dần theo cấp bậc — light ở
 * nhân viên mới, đậm dần lên BOD — để mắt đọc được thứ bậc ngay từ độ đậm nhạt của cột.
 * Đã kiểm qua dataviz skill validator (ordinal ramp, light mode): lightness monotone, ΔL mỗi
 * bậc ≥ 0.06, đầu sáng vẫn ≥ 2:1 với nền, cùng 1 hue (lệch 6°) — PASS cả 4 tiêu chí.
 */
const TIER_COLOR: Record<IdPhotoPosition, string> = {
  NEW_STAFF_1_3M: '#a6a5f1',
  STAFF_OVER_3M: '#7e7deb',
  LEADER: '#5e5ce6',
  MANAGER: '#4745ad',
  BOD: '#2f2e73',
};

/** Trần số cột của biểu đồ. Manager/Admin nhìn thấy TOÀN BỘ nhân sự — vẽ vài chục cột thì biểu
 *  đồ thành vô dụng, nên biểu đồ chỉ giữ top N, phần đuôi đọc ở bảng chi tiết ngay bên dưới. */
const CHART_MAX_ROWS = 10;
const CHART_ROW_HEIGHT = 40;
/** Bề rộng cột nhãn tên ở trục Y — đi kèm `shortenName(…, 15)` để tên luôn nằm gọn 1 dòng. */
const Y_AXIS_WIDTH = 150;
/** Nhãn cấp bậc dài hơn tên người (vd "Nhân viên mới (1-3 tháng)") và KHÔNG bị cắt ngắn — chỉ
 *  5 dòng cố định nên đủ chỗ hiện trọn vẹn, không cần shortenName. 200px (thay vì 176px như thử
 *  ban đầu) để nhãn dài nhất vẫn nằm gọn 1 dòng, không bị recharts tự ngắt xuống dòng 2. */
const POSITION_AXIS_WIDTH = 200;

const MEDALS = ['🥇', '🥈', '🥉'];

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

/** Nhãn trục Y là tên người — cắt ngắn TRƯỚC khi đưa vào recharts. Quá dài thì recharts tự ngắt
 *  tên thành 2 dòng, nhìn rối và lệch hẳn so với cột; `max` khớp với Y_AXIS_WIDTH bên dưới để
 *  luôn vừa đúng 1 dòng. Tên đầy đủ vẫn đọc được ở tooltip và bảng chi tiết. */
function shortenName(name: string, max = 15): string {
  const clean = (name || '').trim();
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean;
}

/** "YYYY-MM-DD" → "dd/MM" cho nhãn trục X — thao tác chuỗi thuần, KHÔNG qua `new Date()` để
 *  tránh browser parse ra UTC midnight rồi lệch ngày theo timezone máy người dùng. */
function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

/** "YYYY-MM-DD" → "Thứ Hai, 20/08" cho tooltip — neo cứng vào UTC khi format (`timeZone: 'UTC'`)
 *  vì chuỗi vào là 1 NGÀY LỊCH đã chốt sẵn (ngày VN), không phải 1 mốc thời gian cần quy đổi. */
function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
}

interface ChartDatum {
  id: string;
  label: string;
  fullName: string;
  team: string | null;
  total: number;
}

/** ───────────────────────── Thẻ số liệu tổng quan ───────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: typeof Images;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        accent ? 'border-[#5e5ce6]/20 bg-[#5e5ce6]/[0.04]' : 'border-[#e2e0ea] bg-white'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${
            accent ? 'bg-[#5e5ce6]/15 text-[#4441cc]' : 'bg-[#f6f3f5] text-[#464554]'
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
        <p className="text-xs font-semibold text-[#464554] leading-tight">{label}</p>
      </div>
      {/* Số lớn dùng chữ số tỉ lệ (KHÔNG tabular-nums) — ở cỡ này chữ số đều bề rộng nhìn rất rời rạc. */}
      <p className="text-2xl font-bold text-[#1b1b1d] truncate leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-[#9c9aa8] mt-1 truncate">{hint}</p>}
    </div>
  );
}

/** ───────────────────────── Tooltip của biểu đồ xếp hạng ───────────────────────── */
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: ChartDatum = payload[0].payload;
  return (
    <div className="bg-white border border-[#e2e0ea] rounded-xl px-3 py-2 shadow-lg shadow-[#1b1b1d]/10">
      <p className="text-xs font-bold text-[#1b1b1d]">{d.fullName}</p>
      {d.team && <p className="text-[11px] text-[#9c9aa8]">{d.team}</p>}
      <p className="text-xs text-[#464554] mt-0.5">
        <span className="font-bold text-[#4441cc]">{formatNumber(d.total)}</span> lượt tạo ảnh thẻ
      </p>
    </div>
  );
}

/** ───────────────────────── Tooltip của biểu đồ xu hướng ───────────────────────── */
function TrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: PhotoTrendPoint = payload[0].payload;
  return (
    <div className="bg-white border border-[#e2e0ea] rounded-xl px-3 py-2 shadow-lg shadow-[#1b1b1d]/10">
      <p className="text-xs font-bold text-[#1b1b1d] capitalize">{formatFullDate(d.date)}</p>
      <p className="text-xs text-[#464554] mt-0.5">
        <span className="font-bold text-[#4441cc]">{formatNumber(d.count)}</span> lượt tạo ảnh thẻ
      </p>
    </div>
  );
}

/** Điểm cuối của đường xu hướng: chấm tròn + nhãn số ngay trên đường, đúng quy ước "line → value
 *  ở điểm cuối" — không lặp nhãn ở mọi điểm (30 điểm đánh số hết sẽ chỉ ra rối). `payload.isLast`
 *  được đánh dấu sẵn khi dựng `trendChartData` để component này không cần biết độ dài mảng. */
function TrendEndDot(props: any) {
  const { cx, cy, payload } = props;
  if (!payload?.isLast || cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={CHART_HUE} stroke="#ffffff" strokeWidth={2} />
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1b1b1d">
        {formatNumber(payload.count)}
      </text>
    </g>
  );
}

/** ───────────────────────── Tooltip của biểu đồ phân bổ cấp bậc ───────────────────────── */
function PositionTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: PhotoPositionBreakdown = payload[0].payload;
  return (
    <div className="bg-white border border-[#e2e0ea] rounded-xl px-3 py-2 shadow-lg shadow-[#1b1b1d]/10">
      <p className="text-xs font-bold text-[#1b1b1d]">{d.label}</p>
      <p className="text-xs text-[#464554] mt-0.5">
        <span className="font-bold text-[#4441cc]">{formatNumber(d.count)}</span> thẻ đã tạo
      </p>
    </div>
  );
}

/** ───────────────────────── Loading: skeleton đúng khung thật ─────────────────────────
 *  Cố ý dựng khung giống hệt bố cục sau khi tải xong (4 thẻ + biểu đồ + bảng) thay vì 1 spinner
 *  giữa trang: mắt người dùng thấy trước bố cục, và không bị nhảy layout lúc dữ liệu về. Vẫn dùng
 *  1 khung skeleton chung cho cả 2 kịch bản (nhiều người / 1 người): trước khi data về thì chưa
 *  biết sẽ rơi vào nhánh nào, và khung "card + card" bên dưới đã đủ giống cả biểu đồ cột lẫn biểu
 *  đồ đường để không gây giật hình rõ rệt lúc chuyển sang nội dung thật. */
function StatsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-[#e2e0ea] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#eae7ea]" />
              <div className="h-3 w-24 rounded bg-[#eae7ea]" />
            </div>
            <div className="h-6 w-20 rounded bg-[#eae7ea]" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#e2e0ea] bg-white p-5 shadow-sm">
        <div className="h-4 w-48 rounded bg-[#eae7ea] mb-5" />
        <div className="space-y-3.5">
          {[82, 68, 54, 41, 27].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-28 rounded bg-[#eae7ea] flex-none" />
              <div className="h-4 rounded-r-md bg-[#eae7ea]" style={{ width: w + '%' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#e2e0ea] bg-white p-5 shadow-sm space-y-3.5">
        <div className="h-4 w-40 rounded bg-[#eae7ea] mb-1" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#eae7ea] flex-none" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-40 rounded bg-[#eae7ea]" />
              <div className="h-2 w-full rounded bg-[#eae7ea]" />
            </div>
            <div className="h-5 w-10 rounded-full bg-[#eae7ea] flex-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tab "Thống kê" của khu Tạo ảnh thẻ nhân viên: mở ra là hiện NGAY toàn bộ thành viên trong
 * phạm vi quyền (Leader → team mình, Manager/Admin → tất cả) kèm tổng số lượt tạo ảnh thẻ. Vẫn
 * CHỈ đọc đúng 1 endpoint /id-photo/history/team-summary, không drill-down lịch sử từng người.
 *
 * Bố cục dashboard rẽ theo SỐ THÀNH VIÊN trong phạm vi quyền — 4 thẻ số liệu luôn giữ nguyên ở
 * trên, phần bên dưới đổi hẳn:
 *
 *   ≥ 2 người → biểu đồ cột xếp hạng (so bó giữa các thành viên) + bảng chi tiết đầy đủ.
 *   = 1 người → biểu đồ "xếp hạng" vô nghĩa (chỉ có 1 cột), thay bằng biểu đồ xu hướng theo
 *               ngày (30 ngày gần nhất) + biểu đồ phân bổ theo cấp bậc thẻ đã tạo, và 1 dòng
 *               text nhỏ thay cho bảng 1 dòng ghi rõ đang xem dữ liệu của ai. Đây là kịch bản
 *               RẤT PHỔ BIẾN (đa số team chỉ có 1 Leader) nên không thể coi là trường hợp hiếm.
 *
 * `trend`/`positionBreakdown` chỉ có trong response BE khi rơi đúng nhánh 1 người (xem
 * IdPhotoService#getTeamSummary) — quyết định nhánh nào để render dựa thẳng vào `ranked.length`
 * (khớp với điều kiện `rows.length === 1` ở BE), không dựa vào 2 field này có mặt hay không.
 */
/** Tab "Thống kê" của khu Tạo ảnh thẻ nhân viên — trước đây là route riêng
 *  (/dashboard/tien-ich/id-photo/stats) điều hướng qua IdPhotoSidebar, nay là 1 trong 3 tab
 *  ngang trên cùng 1 trang, cùng kiểu chuyển tab với khu "Chuyển đổi nội dung". */
export function StatsTab() {
  const { user } = useAuthStore();
  // Khớp đúng @Roles của BE ở /id-photo/history/team-summary. Chỉ là lớp UX — BE mới là chốt chặn.
  const isPrivileged =
    user?.roles?.some((r) => [UserRole.LEADER, UserRole.MANAGER, UserRole.ADMIN].includes(r)) ?? false;

  const [members, setMembers] = useState<MemberIdPhotoSummary[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [trend, setTrend] = useState<PhotoTrendPoint[]>([]);
  const [positionBreakdown, setPositionBreakdown] = useState<PhotoPositionBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchTeamSummary = useCallback(async () => {
    if (!isPrivileged) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get<TeamSummaryResponse>('/id-photo/history/team-summary');
      setMembers(res.data?.members || []);
      setTotalPhotos(res.data?.totalPhotos || 0);
      setTrend(res.data?.trend || []);
      setPositionBreakdown(res.data?.positionBreakdown || []);
    } catch (err: any) {
      setMembers([]);
      setTotalPhotos(0);
      setTrend([]);
      setPositionBreakdown([]);
      toast.error(err.response?.data?.message || 'Không thể tải thống kê đội nhóm');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [isPrivileged]);

  useEffect(() => {
    fetchTeamSummary();
  }, [fetchTeamSummary]);

  /**
   * BE đã sort sẵn giảm dần theo totalPhotos (tie-break theo tên) — vẫn sort lại ở FE để phần
   * hiển thị không phụ thuộc ngầm vào thứ tự API trả về.
   */
  const ranked = useMemo(
    () =>
      [...members].sort(
        (a, b) =>
          b.totalPhotos - a.totalPhotos || (a.full_name || '').localeCompare(b.full_name || '', 'vi'),
      ),
    [members],
  );

  // Rẽ nhánh bố cục — xem comment ở đầu component.
  const isSolo = ranked.length === 1;
  const soloMember = isSolo ? ranked[0] : null;

  const maxPhotos = ranked[0]?.totalPhotos ?? 0;
  const topMember = maxPhotos > 0 ? ranked[0] : null;
  const averagePhotos = ranked.length > 0 ? totalPhotos / ranked.length : 0;
  const activeCount = useMemo(() => ranked.filter((m) => m.totalPhotos > 0).length, [ranked]);

  /** Chỉ đưa người CÓ lượt vào biểu đồ: cột giá trị 0 không vẽ ra gì, chỉ tốn 1 dòng trục.
   *  CHỈ dùng khi ≥ 2 người — xem rẽ nhánh isSolo. */
  const chartData = useMemo<ChartDatum[]>(
    () =>
      ranked
        .filter((m) => m.totalPhotos > 0)
        .slice(0, CHART_MAX_ROWS)
        .map((m) => ({
          id: m.id,
          label: shortenName(m.full_name || m.email),
          fullName: m.full_name || m.email,
          team: m.team ?? null,
          total: m.totalPhotos,
        })),
    [ranked],
  );

  const hiddenFromChart = Math.max(activeCount - chartData.length, 0);
  // Chiều cao bám theo số cột, cộng đệm trên/dưới — để vùng vẽ không bị bóp và card không sinh
  // thanh cuộn dọc lồng bên trong.
  const chartHeight = Math.max(chartData.length * CHART_ROW_HEIGHT + 24, 140);

  /** Đánh dấu điểm cuối để TrendEndDot vẽ chấm+nhãn đúng 1 chỗ — xem comment tại component đó. */
  const trendChartData = useMemo(
    () => trend.map((t, i) => ({ ...t, isLast: i === trend.length - 1 })),
    [trend],
  );
  // ~1 tick mỗi 5 ngày cho 30 điểm — đủ thưa để không đè chữ lên nhau, vẫn đọc được cả tháng.
  const trendTickInterval = Math.max(Math.ceil((trendChartData.length || 1) / 7) - 1, 0);
  const positionChartHeight = Math.max(positionBreakdown.length * CHART_ROW_HEIGHT + 24, 140);

  if (!isPrivileged) {
    return (
      <div className="text-[#1b1b1d]">
        <div className="border border-[#e2e0ea] rounded-2xl bg-white p-12 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
          <Users className="w-10 h-10 text-[#c7c4d7]" />
          <p className="text-sm font-semibold text-[#1b1b1d]">Bạn chưa có quyền xem thống kê đội nhóm</p>
          <p className="text-xs text-[#9c9aa8] max-w-sm">
            Chỉ tài khoản cấp quản lý (Leader, Manager, Admin) mới xem được số liệu của thành viên khác.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-[#1b1b1d]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-[#1b1b1d] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#4441cc]" />
          Thống kê
        </h2>
        <span className="text-xs text-[#9c9aa8]">Tổng số lượt tạo ảnh thẻ trong phạm vi quản lý của bạn</span>
      </div>

      {isLoading && !hasLoaded ? (
        <StatsSkeleton />
      ) : ranked.length === 0 ? (
        <div className="border border-[#e2e0ea] rounded-2xl bg-white p-12 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
          <span className="w-14 h-14 rounded-2xl bg-[#f6f3f5] flex items-center justify-center mb-1">
            <Users className="w-7 h-7 text-[#c7c4d7]" />
          </span>
          <p className="text-sm font-semibold text-[#1b1b1d]">Chưa có thành viên nào trong phạm vi của bạn</p>
          <p className="text-xs text-[#9c9aa8] max-w-xs">
            Khi có thành viên thuộc team bạn quản lý, số lượt tạo ảnh thẻ của họ sẽ được tổng hợp tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── 1. Thẻ số liệu tổng quan — GIỮ NGUYÊN cho cả 2 kịch bản ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard
              accent
              icon={Images}
              label="Tổng lượt tạo ảnh thẻ"
              value={formatNumber(totalPhotos)}
              hint="Toàn bộ phạm vi bạn quản lý"
            />
            <StatCard
              icon={Users}
              label="Tổng số thành viên"
              value={formatNumber(ranked.length)}
              hint={formatNumber(activeCount) + ' người đã từng tạo ảnh thẻ'}
            />
            <StatCard
              icon={Gauge}
              label="Trung bình lượt / người"
              value={averagePhotos.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
              hint="Tính trên tất cả thành viên"
            />
            <StatCard
              icon={Trophy}
              label="Dùng nhiều nhất"
              value={topMember ? topMember.full_name || topMember.email : '—'}
              hint={
                topMember
                  ? formatNumber(topMember.totalPhotos) + ' lượt tạo ảnh thẻ'
                  : 'Chưa có lượt nào'
              }
            />
          </div>

          {isSolo && soloMember ? (
            <>
              {/* ── 2. Chỉ 1 người trong phạm vi quyền: dòng text thay cho bảng 1 dòng ── */}
              <p className="text-xs text-[#9c9aa8] px-1">
                Đang xem dữ liệu của{' '}
                <span className="font-semibold text-[#464554]">
                  {soloMember.full_name || soloMember.email}
                </span>
                {soloMember.team && (
                  <>
                    {' '}
                    · Team <span className="font-semibold text-[#464554]">{soloMember.team}</span>
                  </>
                )}
                {soloMember.lastPhotoAt && (
                  <> · Lần gần nhất {new Date(soloMember.lastPhotoAt).toLocaleString('vi-VN')}</>
                )}
              </p>

              {totalPhotos === 0 ? (
                <div className="border border-[#e2e0ea] rounded-2xl bg-white p-12 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
                  <span className="w-14 h-14 rounded-2xl bg-[#f6f3f5] flex items-center justify-center mb-1">
                    <TrendingUp className="w-7 h-7 text-[#c7c4d7]" />
                  </span>
                  <p className="text-sm font-semibold text-[#1b1b1d]">Chưa có lượt tạo ảnh thẻ nào</p>
                  <p className="text-xs text-[#9c9aa8] max-w-sm">
                    {soloMember.full_name || soloMember.email} chưa tạo ảnh thẻ nào. Biểu đồ xu hướng và
                    phân bổ theo cấp bậc sẽ xuất hiện ngay khi có lượt tạo đầu tiên.
                  </p>
                </div>
              ) : (
                <>
                  {/* ── 3. Biểu đồ xu hướng theo ngày (30 ngày gần nhất) ── */}
                  <section className="border border-[#e2e0ea] rounded-2xl bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <h2 className="text-base font-bold text-[#1b1b1d] flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#4441cc]" />
                        Xu hướng tạo ảnh thẻ
                      </h2>
                      <p className="text-xs text-[#9c9aa8] mt-0.5">Số lượt tạo mỗi ngày, 30 ngày gần nhất</p>
                    </div>
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendChartData} margin={{ top: 20, right: 24, left: 0, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="#eae7ea" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatShortDate}
                            tickLine={false}
                            axisLine={false}
                            interval={trendTickInterval}
                            tick={{ fontSize: 11, fill: '#9c9aa8' }}
                          />
                          <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            width={28}
                            tick={{ fontSize: 11, fill: '#9c9aa8' }}
                          />
                          <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#c7c4d7', strokeWidth: 1 }} />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke={CHART_HUE}
                            strokeWidth={2}
                            fill={CHART_HUE}
                            fillOpacity={0.1}
                            dot={<TrendEndDot />}
                            activeDot={{ r: 4, fill: CHART_HUE, stroke: '#fff', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  {/* ── 4. Biểu đồ phân bổ theo cấp bậc thẻ đã tạo ── */}
                  <section className="border border-[#e2e0ea] rounded-2xl bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <h2 className="text-base font-bold text-[#1b1b1d] flex items-center gap-2">
                        <Layers className="w-5 h-5 text-[#4441cc]" />
                        Phân bổ theo cấp bậc thẻ
                      </h2>
                      <p className="text-xs text-[#9c9aa8] mt-0.5">Số thẻ đã tạo cho mỗi cấp bậc, từ trước tới nay</p>
                    </div>
                    <div style={{ height: positionChartHeight }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={positionBreakdown}
                          layout="vertical"
                          margin={{ top: 4, right: 46, left: 4, bottom: 4 }}
                          barCategoryGap="22%"
                        >
                          <XAxis
                            type="number"
                            hide
                            allowDecimals={false}
                            domain={[0, (max: number) => Math.ceil(max * 1.15) || 1]}
                          />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={POSITION_AXIS_WIDTH}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fontWeight: 600, fill: '#464554' }}
                          />
                          <Tooltip content={<PositionTooltip />} cursor={{ fill: '#f6f3f5' }} />
                          <Bar dataKey="count" barSize={16} radius={[0, 4, 4, 0]}>
                            {positionBreakdown.map((d) => (
                              <Cell key={d.position} fill={TIER_COLOR[d.position]} />
                            ))}
                            <LabelList
                              dataKey="count"
                              position="right"
                              formatter={(v: any) => formatNumber(Number(v))}
                              style={{ fontSize: 12, fontWeight: 700, fill: '#1b1b1d' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                </>
              )}
            </>
          ) : (
            <>
              {/* ── 2. Biểu đồ cột xếp hạng (≥ 2 người) ── */}
              <section className="border border-[#e2e0ea] rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#1b1b1d] flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#4441cc]" />
                      Xếp hạng thành viên
                    </h2>
                    <p className="text-xs text-[#9c9aa8] mt-0.5">
                      Số lượt tạo ảnh thẻ, xếp giảm dần
                      {hiddenFromChart > 0 ? ' — hiển thị ' + chartData.length + ' người dẫn đầu' : ''}
                    </p>
                  </div>
                  {hiddenFromChart > 0 && (
                    <span className="text-[11px] text-[#464554] bg-[#f6f3f5] px-2.5 py-1 rounded-full font-semibold self-start whitespace-nowrap">
                      +{formatNumber(hiddenFromChart)} người khác ở bảng dưới
                    </span>
                  )}
                </div>

                {chartData.length === 0 ? (
                  /* Empty state RIÊNG cho trường hợp có thành viên nhưng cả team 0 lượt — khác hẳn
                     trường hợp không có thành viên nào ở trên. */
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-10 rounded-2xl border border-dashed border-[#c7c4d7] bg-[#fcf8fb]">
                    <span className="w-14 h-14 rounded-2xl bg-white border border-[#e2e0ea] flex items-center justify-center">
                      <BarChart3 className="w-7 h-7 text-[#c7c4d7]" />
                    </span>
                    <p className="text-sm font-semibold text-[#1b1b1d]">Chưa có lượt tạo ảnh thẻ nào</p>
                    <p className="text-xs text-[#9c9aa8] max-w-sm">
                      Phạm vi của bạn có {formatNumber(ranked.length)} thành viên nhưng chưa ai tạo ảnh thẻ.
                      Biểu đồ xếp hạng sẽ xuất hiện ngay khi có lượt tạo đầu tiên.
                    </p>
                  </div>
                ) : (
                  /* Cột NGANG vì nhãn là tên người: tên tiếng Việt đầy đủ không đọc nổi khi phải xoay
                     nghiêng dưới trục X của biểu đồ cột dọc. */
                  <div style={{ height: chartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 4, right: 46, left: 4, bottom: 4 }}
                        barCategoryGap="22%"
                      >
                        {/* Trục giá trị ẩn: mỗi cột đã có sẵn số ở đầu mút nên vạch chia chỉ là mực thừa.
                            Nới trần 15% để nhãn số không bị cắt ở mép phải. */}
                        <XAxis type="number" hide domain={[0, (max: number) => Math.ceil(max * 1.15) || 1]} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={Y_AXIS_WIDTH}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fontWeight: 600, fill: '#464554' }}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f3f5' }} />
                        <Bar dataKey="total" fill={CHART_HUE} barSize={16} radius={[0, 4, 4, 0]}>
                          <LabelList
                            dataKey="total"
                            position="right"
                            formatter={(v: any) => formatNumber(Number(v))}
                            style={{ fontSize: 12, fontWeight: 700, fill: '#1b1b1d' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              {/* ── 3. Bảng chi tiết ── */}
              <section className="border border-[#e2e0ea] rounded-2xl bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-5 pb-3">
                  <h2 className="text-base font-bold text-[#1b1b1d] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#4441cc]" />
                    Chi tiết theo thành viên
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#5e5ce6]/5 text-[#4441cc] border border-[#5e5ce6]/10 px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                      {formatNumber(ranked.length)} thành viên
                    </span>
                    <span className="text-xs bg-emerald-500/5 text-emerald-700 border border-emerald-500/15 px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                      {formatNumber(totalPhotos)} lượt tạo ảnh thẻ
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-y border-[#eae7ea] bg-[#fcf8fb] text-[11px] font-bold text-[#464554] uppercase tracking-wider">
                        <th className="py-2.5 px-4 w-14">#</th>
                        <th className="py-2.5 px-4">Thành viên</th>
                        <th className="py-2.5 px-4 w-32">Team</th>
                        <th className="py-2.5 px-4 w-[26%]">Lượt tạo ảnh thẻ</th>
                        <th className="py-2.5 px-4 w-40">Lần gần nhất</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eae7ea]/60 text-sm text-[#464554]">
                      {ranked.map((m, idx) => {
                        // Thanh tiến trình so với NGƯỜI DẪN ĐẦU (không phải tổng team): mục đích ở đây là
                        // so bó giữa các thành viên, lấy mốc 100% = người cao nhất thì chênh lệch dễ đọc
                        // hơn nhiều so với lấy mốc là tổng (khi đông người, mọi thanh đều ngắn như nhau).
                        const ratio = maxPhotos > 0 ? (m.totalPhotos / maxPhotos) * 100 : 0;
                        const medal = m.totalPhotos > 0 ? MEDALS[idx] : undefined;
                        return (
                          <tr key={m.id} className="hover:bg-[#f6f3f5] transition-colors">
                            <td className="py-3 px-4">
                              {medal ? (
                                <span className="text-base leading-none">{medal}</span>
                              ) : (
                                <span className="text-xs font-bold text-[#9c9aa8] tabular-nums">{idx + 1}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                {m.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={m.image_url}
                                    alt={m.full_name || m.email}
                                    className="w-9 h-9 rounded-full object-cover flex-none border border-[#e2e0ea]"
                                  />
                                ) : (
                                  <span
                                    className={`w-9 h-9 rounded-full text-[11px] font-bold flex items-center justify-center flex-none ${memberAvatarColor(
                                      m.id,
                                    )}`}
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
                                <span className="text-[11px] font-semibold text-[#464554] bg-[#f6f3f5] border border-[#e2e0ea] px-2 py-0.5 rounded-full">
                                  {m.team}
                                </span>
                              ) : (
                                <span className="text-xs text-[#9c9aa8]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-[60px] h-1.5 rounded-full bg-[#eae7ea] overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-[width] duration-500"
                                    style={{ width: ratio + '%', backgroundColor: CHART_HUE }}
                                  />
                                </div>
                                <span
                                  className={`inline-block text-center min-w-[2.5rem] px-2.5 py-1 rounded-full text-xs font-bold tabular-nums flex-none ${
                                    m.totalPhotos > 0
                                      ? 'bg-[#5e5ce6]/10 text-[#4441cc]'
                                      : 'bg-[#eae7ea] text-[#9c9aa8]'
                                  }`}
                                >
                                  {formatNumber(m.totalPhotos)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-[#464554]/80 tabular-nums">
                              {m.lastPhotoAt ? new Date(m.lastPhotoAt).toLocaleString('vi-VN') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
