'use client';

import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Warning } from '@phosphor-icons/react';

import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';
import DateRangeFilter from '../internalChannels/components/DateRangeFilter';

import ChannelRanking from './components/ChannelRanking';
import TrendChart from './components/TrendChart';
import AlertBlock from './components/AlertBlock';
import HashtagBlock from './components/HashtagBlock';
import DuplicateBlock from './components/DuplicateBlock';
import TopContent from './components/TopContent';
import MetricCards from './components/MetricCards';
import { MarketBlock, EngagementBlock, ContentLineBlock } from './components/BreakdownBlocks';
import { MetricCode, mergePlatforms } from './components/calculations';
import {
  Dot,
  Legend,
  Frame,
  TabGroup,
  EmptyState,
  platformColor,
  platformName,
} from './components/shared';

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultRange(): { tu: string; den: string } {
  const den = new Date();
  const tu = new Date(den);
  tu.setDate(tu.getDate() - 27);
  return { tu: toIsoDate(tu), den: toIsoDate(den) };
}

/**
 * Internal Channel Overview Dashboard.
 * Displays aggregated views, engagement, content line analysis, and duplicate detection.
 */
export default function InternalOverviewPage() {
  const { token } = useAuthStore();

  const [range, setRange] = useState(defaultRange);
  const [appliedRange, setAppliedRange] = useState(range);
  useEffect(() => {
    if (range.tu && range.den) setAppliedRange(range);
  }, [range]);

  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [metric, setMetric] = useState<MetricCode>('views');
  const [splitByPlatform, setSplitByPlatform] = useState(true);

  const query = useQuery({
    queryKey: ['owned-stats', selectedPlatform, appliedRange.tu, appliedRange.den],
    queryFn: () =>
      scraperService.getOwnedStats(token!, {
        platform: selectedPlatform || undefined,
        tu: appliedRange.tu,
        den: appliedRange.den,
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const duplicateQuery = useQuery({
    queryKey: ['owned-dup', selectedPlatform, appliedRange.tu, appliedRange.den],
    queryFn: () =>
      scraperService.getOwnedDuplicates(token!, {
        platform: selectedPlatform || undefined,
        tu: appliedRange.tu,
        den: appliedRange.den,
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  const platforms = data?.platforms || data?.nen_tang || [];
  const channels = data?.channels || data?.kenh || [];
  const topVideos = data?.topVideos || data?.top_video || [];
  const markets = data?.markets || data?.thi_truong || [];
  const contentLines = data?.contentLines || data?.tuyen_noi_dung || [];
  const hashtags = data?.hashtags || data?.hashtag || [];
  const alerts = data?.alerts || data?.canh_bao || [];
  const period = data?.period || data?.ky;
  const dayCount = period?.dayCount ?? period?.so_ngay;

  const total = useMemo(() => mergePlatforms(platforms), [platforms]);

  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  useEffect(() => {
    if (selectedPlatform || !data) return;
    const currentList = (data.platforms || data.nen_tang || []).map((nt) => nt.platform);
    setAvailablePlatforms((prev) => (prev.join() === currentList.join() ? prev : currentList));
  }, [data, selectedPlatform]);

  if (query.isLoading) return <OverviewSkeleton />;

  if (query.isError) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center gap-4 py-16 bg-card border border-border rounded-2xl">
          <Warning size={32} className="text-amber-500" />
          <p className="text-sm text-foreground">Không tải được số liệu tổng quan.</p>
          <button
            onClick={() => query.refetch()}
            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Thử lại
          </button>
        </div>
      </PageContainer>
    );
  }

  if (!data || platforms.length === 0) {
    return (
      <PageContainer>
        <PageHeader range={range} onRangeChange={setRange} dayCount={dayCount} />
        <EmptyState
          tieu_de="Chưa có kênh nội bộ nào"
          mo_ta="Thêm fanpage hoặc kênh vào mục Kênh nội bộ, hệ thống sẽ cào video và dựng số liệu ở đây từ lần đồng bộ kế tiếp."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader range={range} onRangeChange={setRange} dayCount={dayCount} />

      {availablePlatforms.length > 1 && (
        <TabGroup
          className="mb-5"
          dang_chon={selectedPlatform}
          onSelect={setSelectedPlatform}
          cac_tab={[
            { ma: '', nhan: 'Tất cả nền tảng' },
            ...availablePlatforms.map((p) => ({
              ma: p,
              nhan: (
                <>
                  <Dot mau={platformColor(p)} />
                  {platformName(p)}
                </>
              ),
            })),
          ]}
        />
      )}

      <MetricCards total={total} platform={platforms} selected={metric} onSelect={setMetric} />

      <TrendChart
        total={total}
        platform={platforms}
        metric={metric}
        tach={splitByPlatform}
        onDoiTach={setSplitByPlatform}
        dayCount={dayCount ?? 28}
      />

      <div className="grid gap-5 mb-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 items-stretch">
        <MarketBlock thiTruong={markets} />
        <ContentLineBlock tuyen={contentLines} />
        <EngagementBlock platform={platforms} />
      </div>

      <HashtagBlock hashtag={hashtags} />
      <ChannelRanking kenh={channels} />
      <DuplicateBlock
        data={duplicateQuery.data}
        isLoading={duplicateQuery.isLoading}
        error={duplicateQuery.isError}
      />
      <TopContent video={topVideos} />
      <AlertBlock alerts={[...alerts, ...(duplicateQuery.data?.alerts || duplicateQuery.data?.canh_bao || [])]} />
    </PageContainer>
  );
}

function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[1400px] mx-auto w-full">{children}</div>;
}

function PageHeader({
  range,
  onRangeChange,
  dayCount,
}: {
  range: { tu: string; den: string };
  onRangeChange: (k: { tu: string; den: string }) => void;
  dayCount?: number;
}) {
  return (
    <div className="flex items-center gap-4 mb-5 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center">
          Tổng quan kênh nội bộ
          <Legend tooltip="Số liệu cào từ các kênh mạng xã hội do công ty sở hữu" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Tổng hợp lượt xem và tương tác của các video đăng trong kỳ
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {dayCount ? (
          <span className="text-[12.5px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            {dayCount} ngày
          </span>
        ) : null}
        <DateRangeFilter
          from={range.tu}
          to={range.den}
          onChange={(tu, den) => onRangeChange({ tu, den })}
          canhPhai
        />
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <PageContainer>
      <div className="flex items-center gap-4 mb-5">
        <div className="flex-1">
          <Frame className="h-6 w-56" />
          <Frame className="h-4 w-80 mt-2" />
        </div>
        <Frame className="h-9 w-64" />
      </div>
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(232px,1fr))' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-[18px]">
            <Frame className="h-3 w-20" />
            <Frame className="h-8 w-28 mt-3" />
            <Frame className="h-3 w-32 mt-3" />
            <Frame className="h-[34px] w-full mt-4" />
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <Frame className="h-8 w-40" />
        <Frame className="h-[272px] w-full mt-4" />
      </div>
      <div className="grid gap-5 mb-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5">
            <Frame className="h-4 w-36" />
            <Frame className="h-[164px] w-full mt-4" />
            <Frame className="h-3 w-full mt-4" />
            <Frame className="h-3 w-2/3 mt-2" />
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <Frame className="h-4 w-40" />
        <div className="grid gap-3 mt-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Frame key={i} className="h-[74px] w-full" />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
