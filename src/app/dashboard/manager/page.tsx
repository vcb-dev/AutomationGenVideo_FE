'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Download,
  Facebook,
  Instagram,
  Loader2,
  MoreHorizontal,
  PackageOpen,
  Search,
  X,
} from 'lucide-react';
import { SiTiktok } from 'react-icons/si';

type PlatformKey = 'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK' | 'DOUYIN';
type DateQuickKey = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
type DateRange = { label: string; start: string; end: string };

interface Channel {
  id: string;
  platform: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_followers: number | null;
  total_likes: number;
  total_views: number;
  total_videos: number;
  posts_count: number | null;
  engagement_rate: number;
  last_synced_at: string | null;
  user: {
    id: string;
    email: string;
    full_name: string;
    roles: string[];
  };
}

interface UserWithChannels {
  userId: string;
  userName: string;
  userEmail: string;
  userRoles: string[];
  channels: Channel[];
  totalChannels: number;
}

const PLATFORM_ORDER: PlatformKey[] = ['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'DOUYIN'];

const PLATFORM_META: Record<PlatformKey, {
  label: string;
  border: string;
  softBorder: string;
  softBg: string;
  totalText: string;
  syncedText: string;
  unsyncedText: string;
  iconWrap: string;
}> = {
  TIKTOK: {
    label: 'TikTok',
    border: 'border-l-[#ff2d8f]',
    softBorder: 'border-l-[#ff2d8f]',
    softBg: 'from-slate-200 via-slate-50 to-slate-100',
    totalText: 'text-slate-950',
    syncedText: 'text-emerald-500',
    unsyncedText: 'text-orange-600',
    iconWrap: 'bg-[#10192c] text-white',
  },
  INSTAGRAM: {
    label: 'Instagram',
    border: 'border-l-[#d946ef]',
    softBorder: 'border-l-[#d946ef]',
    softBg: 'from-fuchsia-200 via-pink-100 to-orange-100',
    totalText: 'text-slate-950',
    syncedText: 'text-emerald-500',
    unsyncedText: 'text-orange-600',
    iconWrap: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white',
  },
  FACEBOOK: {
    label: 'Facebook',
    border: 'border-l-[#2385ff]',
    softBorder: 'border-l-[#2385ff]',
    softBg: 'from-blue-200 via-sky-100 to-blue-50',
    totalText: 'text-slate-950',
    syncedText: 'text-emerald-500',
    unsyncedText: 'text-orange-600',
    iconWrap: 'bg-[#2374e1] text-white',
  },
  DOUYIN: {
    label: 'Douyin',
    border: 'border-l-[#1f2937]',
    softBorder: 'border-l-[#334155]',
    softBg: 'from-slate-200 via-slate-50 to-cyan-50',
    totalText: 'text-slate-950',
    syncedText: 'text-emerald-500',
    unsyncedText: 'text-orange-600',
    iconWrap: 'bg-[#10192c] text-white',
  },
};

const AVATAR_GRADIENTS = [
  'from-slate-100 to-blue-200',
  'from-amber-100 to-orange-200',
  'from-cyan-100 to-teal-200',
  'from-rose-100 to-pink-200',
  'from-blue-100 to-indigo-200',
  'from-emerald-100 to-green-200',
  'from-violet-100 to-purple-200',
  'from-sky-100 to-blue-200',
];

function PlatformIcon({ platform, className = 'h-5 w-5' }: { platform: PlatformKey; className?: string }) {
  if (platform === 'INSTAGRAM') return <Instagram className={className} />;
  if (platform === 'FACEBOOK') return <Facebook className={className} />;
  return <SiTiktok className={className} />;
}

function normalizePlatform(platform: string): PlatformKey {
  const upper = platform.toUpperCase();
  return PLATFORM_ORDER.includes(upper as PlatformKey) ? upper as PlatformKey : 'TIKTOK';
}

function formatNumber(num: number | null | undefined): string {
  const value = Number(num || 0);
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace('.0', '')}K`;
  return value.toString();
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'Chưa sync';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function formatToday(): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

function formatFileDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateString: string): string {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

function getStartOfWeek(date: Date): Date {
  const nextDate = new Date(date);
  const day = nextDate.getDay() || 7;
  nextDate.setDate(nextDate.getDate() - day + 1);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addMonths(date: Date, months: number): Date {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function isWithinLocalDateRange(dateString: string | null, startDate: string, endDate: string): boolean {
  if (!dateString) return false;
  const channelDate = formatFileDate(new Date(dateString));
  return channelDate >= startDate && channelDate <= endDate;
}

function getDateQuickRange(key: DateQuickKey): { label: string; start: string; end: string } {
  const today = new Date();
  const yesterday = addDays(today, -1);
  const thisWeekStart = getStartOfWeek(today);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const thisYearStart = new Date(today.getFullYear(), 0, 1);

  switch (key) {
    case 'yesterday':
      return { label: 'Hôm qua', start: formatFileDate(yesterday), end: formatFileDate(yesterday) };
    case 'thisWeek':
      return { label: 'Tuần này', start: formatFileDate(thisWeekStart), end: formatFileDate(today) };
    case 'lastWeek':
      return { label: 'Tuần trước', start: formatFileDate(lastWeekStart), end: formatFileDate(addDays(lastWeekStart, 6)) };
    case 'thisMonth':
      return { label: 'Tháng này', start: formatFileDate(thisMonthStart), end: formatFileDate(today) };
    case 'lastMonth':
      return { label: 'Tháng trước', start: formatFileDate(lastMonthStart), end: formatFileDate(lastMonthEnd) };
    case 'thisYear':
      return { label: 'Năm nay', start: formatFileDate(thisYearStart), end: formatFileDate(today) };
    case 'today':
    default:
      return { label: 'Hôm nay', start: formatFileDate(today), end: formatFileDate(today) };
  }
}

function hashText(text: string): number {
  return text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'VC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function roleLabel(roles: string[] | undefined): 'LEADER' | 'MEMBER' {
  const normalized = roles?.map(role => role.toUpperCase()) || [];
  return normalized.some(role => role.includes('LEADER') || role.includes('MANAGER')) ? 'LEADER' : 'MEMBER';
}

export default function ManagerDashboardPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [userGroups, setUserGroups] = useState<UserWithChannels[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<'ALL' | PlatformKey>('ALL');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateQuickKey, setDateQuickKey] = useState<DateQuickKey | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateRange | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const roles = user?.roles || [];
    if (user && !roles.includes(UserRole.MANAGER) && !roles.includes(UserRole.ADMIN)) {
      router.push('/dashboard/ai');
      return;
    }

    fetchAllChannels();
  }, [user, token]);

  const fetchAllChannels = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tracked-channels/manager/all-channels`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Không thể tải danh sách kênh');

      const data: Channel[] = await response.json();
      setAllChannels(data);
      setUserGroups(groupChannelsByUser(data));
    } catch (err: any) {
      console.error('Failed to fetch all channels:', err);
      setError(err.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const groupChannelsByUser = (channels: Channel[]): UserWithChannels[] => {
    const userMap = new Map<string, UserWithChannels>();

    channels.forEach(channel => {
      const userId = channel.user.id;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName: channel.user.full_name,
          userEmail: channel.user.email,
          userRoles: channel.user.roles,
          channels: [],
          totalChannels: 0,
        });
      }

      const userGroup = userMap.get(userId)!;
      userGroup.channels.push(channel);
      userGroup.totalChannels = userGroup.channels.length;
    });

    return Array.from(userMap.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  };

  const filteredChannels = useMemo(() => {
    const query = globalSearchQuery.trim().toLowerCase();

    return allChannels.filter(channel => {
      const platform = normalizePlatform(channel.platform);
      const matchesPlatform = selectedPlatform === 'ALL' || platform === selectedPlatform;
      const matchesTeam = selectedTeam === 'ALL' || channel.user.id === selectedTeam;
      const matchesDate = !dateFilter || isWithinLocalDateRange(channel.last_synced_at, dateFilter.start, dateFilter.end);
      const matchesSearch = !query ||
        channel.username.toLowerCase().includes(query) ||
        (channel.display_name && channel.display_name.toLowerCase().includes(query)) ||
        channel.user.full_name.toLowerCase().includes(query) ||
        channel.user.email.toLowerCase().includes(query);

      return matchesPlatform && matchesTeam && matchesDate && matchesSearch;
    });
  }, [allChannels, dateFilter, globalSearchQuery, selectedPlatform, selectedTeam]);

  const hasDouyinChannels = allChannels.some(channel => normalizePlatform(channel.platform) === 'DOUYIN');

  const handleCaptureReport = async () => {
    if (!reportRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      await new Promise(resolve => requestAnimationFrame(resolve));

      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#f6f8fb',
        filter: (node: HTMLElement) => !(node instanceof HTMLElement && node.dataset.captureExclude === 'true'),
      });
      const link = document.createElement('a');
      link.download = dateFilter
        ? `bao-cao-kenh-${dateFilter.start}${dateFilter.end !== dateFilter.start ? `_${dateFilter.end}` : ''}.png`
        : `bao-cao-kenh-tat-ca-${formatFileDate()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture report:', err);
      setError('Không thể chụp báo cáo. Vui lòng thử lại.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleQuickDate = (key: DateQuickKey) => {
    const nextRange = getDateQuickRange(key);
    setDateQuickKey(key);
    setDateFilter(nextRange);
    setCalendarMonth(new Date(`${nextRange.start}T00:00:00`));
  };

  const handleCalendarDate = (date: Date) => {
    const dateString = formatFileDate(date);
    setDateQuickKey('custom');
    setDateFilter({
      label: 'Chọn ngày',
      start: dateString,
      end: dateString,
    });
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const leadingDays = firstDay.getDay();
    const days: Array<{ date: Date; inMonth: boolean }> = [];

    for (let index = leadingDays - 1; index >= 0; index -= 1) {
      days.push({ date: addDays(firstDay, -index - 1), inMonth: false });
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push({ date: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day), inMonth: true });
    }

    while (days.length % 7 !== 0) {
      days.push({ date: addDays(lastDay, days.length - leadingDays - lastDay.getDate() + 1), inMonth: false });
    }

    return days;
  }, [calendarMonth]);

  const dateButtonText = !dateFilter
    ? 'Tất cả ngày'
    : dateFilter.start === dateFilter.end
      ? formatDisplayDate(dateFilter.start)
      : `${formatDisplayDate(dateFilter.start)} - ${formatDisplayDate(dateFilter.end)}`;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-600">Đang tải dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <p className="mb-2 font-semibold text-red-600">Lỗi tải dữ liệu</p>
          <p className="text-sm text-slate-600">{error}</p>
          <button
            onClick={fetchAllChannels}
            className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f4f7fb] text-slate-950">
      <div ref={reportRef} className="space-y-5">
        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.06)] xl:grid-cols-[200px_1fr_225px_0.9fr_155px]">
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-600">Nhóm Team</span>
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={(event) => setSelectedTeam(event.target.value)}
                className="h-[46px] w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-semibold text-slate-800 shadow-sm outline-none transition hover:border-blue-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">Tất cả nhóm</option>
                {userGroups.map(group => (
                  <option key={group.userId} value={group.userId}>
                    {group.userName}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </label>

          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-600">Nền tảng</span>
            <div className="flex min-h-[46px] items-center gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-1 shadow-sm">
              <button
                onClick={() => setSelectedPlatform('ALL')}
                className={`h-[38px] shrink-0 rounded-md px-4 text-xs font-bold transition ${
                  selectedPlatform === 'ALL'
                    ? 'bg-[#0f3b78] text-white shadow-[0_8px_18px_rgba(15,59,120,0.18)]'
                    : 'text-slate-700 hover:bg-white hover:text-[#0f3b78]'
                }`}
              >
                Tất cả
              </button>
              {PLATFORM_ORDER.map(platform => (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`flex h-[38px] shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition ${
                    selectedPlatform === platform
                      ? 'border-[#0f3b78] bg-[#0f3b78] text-white shadow-[0_8px_18px_rgba(15,59,120,0.18)]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-white hover:text-[#0f3b78]'
                  }`}
                >
                  <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
                  {PLATFORM_META[platform].label}
                </button>
              ))}
            </div>
          </div>

          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-600">Ngày</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDatePickerOpen(open => !open)}
                className={`flex h-[46px] w-full items-center justify-between rounded-xl px-4 text-left text-sm font-extrabold shadow-[0_8px_22px_rgba(37,99,235,0.16)] transition ${
                  datePickerOpen
                    ? 'bg-[#0f3b78] text-white ring-2 ring-blue-100'
                    : 'border border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-200 hover:bg-white'
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <CalendarDays className={`h-4 w-4 shrink-0 ${datePickerOpen ? 'text-white' : 'text-slate-500'}`} />
                  <span className="min-w-0">
                    <span className={`block text-[10px] uppercase leading-none ${datePickerOpen ? 'text-blue-100' : 'text-slate-400'}`}>
                      {dateFilter?.label || 'Tất cả ngày'}
                    </span>
                    <span className="block truncate leading-tight">{dateButtonText}</span>
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition ${datePickerOpen ? 'rotate-180 text-white' : 'text-slate-500'}`} />
              </button>

              {datePickerOpen && (
                <div className="absolute left-0 top-[calc(100%+10px)] z-50 flex w-[520px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
                  <div className="w-[170px] border-r border-slate-100 bg-slate-50/80 p-4">
                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Nhanh</p>
                    <button
                      type="button"
                      onClick={() => {
                        setDateQuickKey('all');
                        setDateFilter(null);
                      }}
                      className={`mb-1.5 flex h-9 w-full items-center rounded-xl px-3 text-left text-sm font-bold transition ${
                        dateQuickKey === 'all'
                          ? 'bg-[#0f3b78] text-white shadow-sm'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {dateQuickKey === 'all' && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-white" />}
                      Tất cả ngày
                    </button>
                    {[
                      ['today', 'Hôm nay'],
                      ['yesterday', 'Hôm qua'],
                      ['thisWeek', 'Tuần này'],
                      ['lastWeek', 'Tuần trước'],
                      ['thisMonth', 'Tháng này'],
                      ['lastMonth', 'Tháng trước'],
                      ['thisYear', 'Năm nay'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleQuickDate(key as DateQuickKey)}
                        className={`mb-1.5 flex h-9 w-full items-center rounded-xl px-3 text-left text-sm font-bold transition ${
                          dateQuickKey === key
                            ? 'bg-[#0f3b78] text-white shadow-sm'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        {dateQuickKey === key && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-white" />}
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDateQuickKey('custom')}
                      className={`mt-2 flex h-9 w-full items-center rounded-xl px-3 text-left text-sm font-bold transition ${
                        dateQuickKey === 'custom'
                          ? 'bg-[#0f3b78] text-white shadow-sm'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {dateQuickKey === 'custom' && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-white" />}
                      Chọn ngày
                    </button>
                  </div>

                  <div className="w-[350px] p-4">
                    <div className="mb-4 flex rounded-xl bg-slate-100 p-1 text-xs font-extrabold uppercase text-slate-400">
                      {['Ngày', 'Tuần', 'Tháng', 'Năm', 'Khoảng'].map((tab, index) => (
                        <button
                          key={tab}
                          type="button"
                          className={`h-8 flex-1 rounded-lg transition ${index === 0 ? 'bg-white text-[#0f3b78] shadow-sm' : 'hover:text-slate-600'}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(prev => addMonths(prev, -1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        ‹
                      </button>
                      <p className="text-base font-extrabold text-slate-800">
                        Tháng {calendarMonth.getMonth() + 1} Năm {calendarMonth.getFullYear()}
                      </p>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(prev => addMonths(prev, 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                        <div key={day} className="py-2 text-[11px] font-extrabold text-slate-400">{day}</div>
                      ))}
                      {calendarDays.map(({ date, inMonth }) => {
                        const dateString = formatFileDate(date);
                        const isSelected = Boolean(dateFilter && dateString >= dateFilter.start && dateString <= dateFilter.end);
                        const isToday = dateString === formatFileDate();

                        return (
                          <button
                            key={dateString}
                            type="button"
                            onClick={() => handleCalendarDate(date)}
                            className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition ${
                              isSelected
                                ? 'bg-[#0f3b78] text-white shadow-sm'
                                : inMonth
                                  ? 'text-slate-700 hover:bg-blue-50 hover:text-[#0f3b78]'
                                  : 'text-slate-300'
                            } ${isToday && !isSelected ? 'ring-1 ring-blue-200' : ''}`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-400">{dateButtonText}</p>
                      <button
                        type="button"
                        onClick={() => setDatePickerOpen(false)}
                        className="h-10 rounded-xl bg-[#0f3b78] px-6 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(15,59,120,0.22)] transition hover:bg-[#123f80]"
                      >
                        Xong
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-600">Tìm kiếm kênh</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={globalSearchQuery}
                onChange={(event) => setGlobalSearchQuery(event.target.value)}
                placeholder="Tìm theo tên kênh hoặc @username..."
                className="h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-blue-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {globalSearchQuery && (
                <button
                  onClick={() => setGlobalSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </label>

          <div className="flex items-end" data-capture-exclude="true">
            <button
              onClick={handleCaptureReport}
              disabled={isCapturing}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#07152d] px-3 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(7,21,45,0.16)] transition hover:bg-[#12376f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCapturing ? 'Đang chụp' : 'Chụp báo cáo'}
              {isCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredChannels.map(channel => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </section>

        {filteredChannels.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.055)]">
            <PackageOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-base font-bold text-slate-800">Không tìm thấy kênh phù hợp</p>
            <p className="mt-1 text-sm text-slate-500">Hãy đổi nền tảng, nhóm hoặc từ khóa tìm kiếm.</p>
          </div>
        )}

        {!hasDouyinChannels && (selectedPlatform === 'ALL' || selectedPlatform === 'DOUYIN') && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            <div className="flex min-h-[98px] items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-white/95 px-5 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.055)]">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10192c] text-white shadow-sm">
                  <SiTiktok className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-extrabold text-slate-900">Douyin</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">Chưa có kênh nào được thêm vào.</p>
                </div>
              </div>
              <PackageOpen className="h-12 w-12 text-blue-200" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelCard({ channel }: { channel: Channel }) {
  const platform = normalizePlatform(channel.platform);
  const platformMeta = PLATFORM_META[platform];
  const ownerRole = roleLabel(channel.user.roles);
  const isSynced = Boolean(channel.last_synced_at);
  const name = channel.display_name || channel.username;
  const postMetricLabel = platform === 'TIKTOK' || platform === 'DOUYIN' ? 'Videos' : 'Posts';
  const postMetricValue = platform === 'TIKTOK' || platform === 'DOUYIN'
    ? channel.total_videos
    : channel.posts_count || channel.total_videos;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white px-6 pb-5 pt-7 shadow-[0_12px_34px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
      <div className={`absolute left-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl ${platformMeta.iconWrap} shadow-[0_8px_18px_rgba(15,23,42,0.12)] ring-4 ring-white`}>
        <PlatformIcon platform={platform} className="h-4 w-4" />
      </div>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${platformMeta.softBg}`} />
      <button className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Mở menu kênh">
        <MoreHorizontal className="h-5 w-5" />
      </button>

      <div className="flex items-start gap-5 pl-7 pr-8">
        <ChannelAvatar channel={channel} name={name} />

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 min-h-[30px] text-xl font-extrabold leading-tight text-slate-900">
            {name}
          </h3>
          <p className="mt-1 truncate text-sm font-semibold text-slate-500">@{channel.username}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                {initials(channel.user.full_name).slice(0, 1)}
              </div>
              <span className="max-w-[145px] truncate text-sm font-bold text-slate-700">{channel.user.full_name}</span>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700 ring-1 ring-amber-100">
              {ownerRole}
            </span>
            <span
              className={`ml-auto rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${
                isSynced ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' : 'bg-orange-50 text-orange-600 ring-orange-100'
              }`}
            >
              {isSynced ? 'Đã sync' : 'Chưa sync'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 divide-x divide-slate-200/80 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-center">
        <Metric label="Followers" value={formatNumber(channel.total_followers)} />
        <Metric label={postMetricLabel} value={formatNumber(postMetricValue)} />
        <Metric label="Likes" value={formatNumber(channel.total_likes)} />
        <Metric label="Views" value={formatNumber(channel.total_views)} />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-500">
        Cập nhật lần cuối: {formatDateTime(channel.last_synced_at)}
      </p>
    </article>
  );
}

function getAvatarUrl(avatarUrl: string | null | undefined, displayName: string) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0f3b78&color=fff`;
  if (!avatarUrl) return fallback;
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
  if (
    avatarUrl.includes('cdninstagram.com') ||
    avatarUrl.includes('instagram.com') ||
    avatarUrl.includes('fbcdn.net') ||
    avatarUrl.includes('facebook.com')
  ) {
    return `${apiUrl}/ai/proxy/avatar?url=${encodeURIComponent(avatarUrl)}`;
  }
  return avatarUrl;
}

function ChannelAvatar({ channel, name }: { channel: Channel; name: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const gradient = AVATAR_GRADIENTS[hashText(channel.id || channel.username) % AVATAR_GRADIENTS.length];
  const shouldShowImage = Boolean(channel.avatar_url) && !imageFailed;

  if (shouldShowImage) {
    return (
      <img
        src={getAvatarUrl(channel.avatar_url, name)}
        alt={name}
        onError={() => setImageFailed(true)}
        className="mt-1.5 h-16 w-16 shrink-0 rounded-2xl object-cover shadow-[0_10px_20px_rgba(15,23,42,0.12)] ring-4 ring-white"
        crossOrigin="anonymous"
      />
    );
  }

  return (
    <div className={`mt-1.5 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-2xl font-semibold text-slate-900 shadow-[0_10px_20px_rgba(15,23,42,0.12)] ring-4 ring-white`}>
      {initials(name)}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black leading-none text-slate-900">{value}</p>
    </div>
  );
}
