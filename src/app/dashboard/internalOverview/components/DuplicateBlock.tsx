'use client';

import { useRouter } from 'next/navigation';
import { ArrowSquareOut } from '@phosphor-icons/react';
import type { DuplicateGroup, InternalDuplicates, DuplicateByChannel } from '@/services/scraperService';
import {
  ChannelAvatar,
  Frame,
  COLOR_PRIMARY,
  Subtitle,
  Card,
  CardTitle,
  SplitBar,
  EmptyState,
  shortDate,
  percent,
  fullNumber,
  compactNumber,
} from './shared';

/** High duplicate threshold percentage for warning highlights. */
const WARNING_RATIO_THRESHOLD = 90;

/** Minimum video count floor for duplicate channel rankings. */
const RANKING_VIDEO_FLOOR = 20;

/** Maximum channels displayed in ranking table. */
const MAX_RANKING_CHANNELS = 12;

/** Maximum channel avatars displayed per group row before "+N". */
const MAX_GROUP_AVATARS = 4;

export default function DuplicateBlock({
  data,
  isLoading,
  error,
  loi,
}: {
  data?: InternalDuplicates;
  isLoading: boolean;
  error?: boolean;
  loi?: boolean;
}) {
  const isError = error ?? loi ?? false;
  if (isLoading && !data) return <DuplicateSkeleton />;

  if (isError && !data) {
    return (
      <Card className="mb-5">
        <CardTitle>Trùng lặp nội dung</CardTitle>
        <EmptyState
          tieu_de="Không tải được số liệu trùng lặp"
          mo_ta="Các khối khác trên trang vẫn dùng bình thường. Tải lại trang để thử lại."
        />
      </Card>
    );
  }

  if (!data) return null;

  const summary = data.summary || data.tom_tat || {
    groupCount: 0,
    groupsWithAtLeast3Channels: 0,
    duplicateVideoCount: 0,
    totalVideos: 0,
    duplicateRatio: 0,
    affectedChannelCount: 0,
  };
  const groups = data.groups || data.nhom || [];
  const byChannel = data.byChannel || data.theo_kenh || [];

  const totalVideos = summary.totalVideos ?? summary.tong_video ?? 0;
  const groupCount = summary.groupCount ?? summary.so_nhom ?? 0;
  const groupsWithAtLeast3 = summary.groupsWithAtLeast3Channels ?? summary.so_nhom_tu_3_kenh ?? 0;
  const duplicateVideos = summary.duplicateVideoCount ?? summary.so_video_trung ?? 0;
  const duplicateRatio = summary.duplicateRatio ?? summary.ty_le ?? 0;
  const affectedChannels = summary.affectedChannelCount ?? summary.so_kenh_dinh ?? 0;

  if (totalVideos === 0) {
    return (
      <Card className="mb-5">
        <CardTitle hint={NOTE_DUPLICATE_DETECTION}>Trùng lặp nội dung</CardTitle>
        <EmptyState
          tieu_de="Chưa có video nào trong kỳ"
          mo_ta="Đổi khoảng ngày hoặc chờ lần đồng bộ kế tiếp để hệ thống cào thêm video."
        />
      </Card>
    );
  }

  return (
    <Card className="mb-5">
      <div className="flex items-start gap-4 flex-wrap">
        <div>
          <CardTitle hint={NOTE_DUPLICATE_DETECTION}>Trùng lặp nội dung</CardTitle>
          <Subtitle>Cùng một video được đăng trên nhiều kênh nội bộ khác nhau</Subtitle>
        </div>
      </div>

      <div className="grid gap-3 mt-4 mb-1 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Nội dung bị trùng" value={fullNumber(groupCount)} subText="nhóm video giống nhau" />
        <MetricCard
          label="Phủ từ 3 kênh"
          value={fullNumber(groupsWithAtLeast3)}
          subText="nhóm lan ra nhiều kênh"
          emphasized={groupsWithAtLeast3 > 0}
        />
        <MetricCard
          label="Video trùng"
          value={percent(duplicateRatio)}
          subText={`${fullNumber(duplicateVideos)} / ${fullNumber(totalVideos)} video trong kỳ`}
        />
        <MetricCard label="Kênh dính trùng" value={fullNumber(affectedChannels)} subText="kênh có video lặp" />
      </div>

      {groupCount === 0 ? (
        <EmptyState
          tieu_de="Không có nội dung nào bị đăng trùng"
          mo_ta="Mỗi kênh nội bộ đang đăng nội dung riêng trong kỳ này."
        />
      ) : (
        <div className="grid gap-6 mt-5 grid-cols-1 xl:grid-cols-[1.6fr_1fr]">
          <GroupTable groups={groups} totalGroups={groupCount} />
          <ChannelTable byChannel={byChannel} />
        </div>
      )}
    </Card>
  );
}

const NOTE_DUPLICATE_DETECTION =
  'Nhận diện bằng caption trùng khớp và độ dài video bằng nhau — không so file video, ' +
  'nên video bị sửa lại caption sẽ không được tính là trùng.';

function MetricCard({
  label,
  value,
  subText,
  emphasized = false,
}: {
  label: string;
  value: string;
  subText: string;
  emphasized?: boolean;
}) {
  return (
    <div className="px-3.5 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
      <div className="text-[11.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">
        {label}
      </div>
      <div
        className={`text-[22px] font-bold tabular-nums mt-1 leading-none ${
          emphasized ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
        }`}
      >
        {value}
      </div>
      <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-1.5">{subText}</div>
    </div>
  );
}

function GroupTable({ groups, totalGroups }: { groups: DuplicateGroup[]; totalGroups: number }) {
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-foreground mb-1">Nội dung phủ nhiều kênh nhất</h4>
      <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mb-1">
        {totalGroups > groups.length
          ? `${groups.length} nhóm hàng đầu trong tổng số ${fullNumber(totalGroups)}`
          : `${groups.length} nhóm`}
      </p>
      <div>
        {groups.map((g, i) => {
          const content = g.content || g.noi_dung || '';
          const duration = g.durationSeconds ?? g.giay ?? null;
          return (
            <GroupRow key={`${g.platform}-${content}-${duration}-${i}`} group={g} />
          );
        })}
      </div>
    </div>
  );
}

function GroupRow({ group }: { group: DuplicateGroup }) {
  const channelCount = group.channelCount ?? group.so_kenh ?? 0;
  const videoCount = group.videoCount ?? group.so_video ?? 0;
  const channels = group.channels || group.kenh || [];
  const content = group.content || group.noi_dung || '';
  const sampleUrl = group.sampleUrl || group.url_mau || '';
  const duration = group.durationSeconds ?? group.giay ?? null;
  const startDate = group.startDate || group.ngay_dau || '';
  const endDate = group.endDate || group.ngay_cuoi || '';

  const isMultiChannel = channelCount >= 3;
  const remaining = videoCount - channelCount;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex -space-x-2 shrink-0 pt-0.5">
        {channels.slice(0, MAX_GROUP_AVATARS).map((k) => {
          const channelName = k.name || k.ten || k.id;
          return (
            <div key={k.id} className="ring-2 ring-card rounded-lg" title={channelName}>
              <ChannelAvatar ten={channelName} platform={group.platform} size={26} />
            </div>
          );
        })}
        {channels.length > MAX_GROUP_AVATARS && (
          <div
            className="ring-2 ring-card rounded-lg grid place-items-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
            style={{ width: 26, height: 26 }}
            title={channels.slice(MAX_GROUP_AVATARS).map((k) => k.name || k.ten || k.id).join(', ')}
          >
            +{channels.length - MAX_GROUP_AVATARS}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <a
          href={sampleUrl || undefined}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] text-foreground font-medium leading-snug line-clamp-2 hover:underline inline-block"
          title={content}
        >
          {content}
        </a>

        {/* Channels posting this video */}
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          {channels.map((k) => {
            const hasUrl = !!k.url;
            const channelName = k.name || k.ten || k.id;
            return (
              <a
                key={k.id}
                href={k.url || undefined}
                target="_blank"
                rel="noreferrer"
                title={
                  hasUrl
                    ? `Bấm để xem video trên ${channelName}${k.views ? ` (${compactNumber(k.views)} lượt xem)` : ''}`
                    : channelName
                }
                className={[
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11.5px] border transition-all duration-150',
                  hasUrl
                    ? 'bg-slate-50 hover:bg-primary/10 dark:bg-slate-800/80 dark:hover:bg-primary/20 text-foreground hover:text-primary border-slate-200 dark:border-slate-700 hover:border-primary/40'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-border pointer-events-none',
                ].join(' ')}
              >
                <ChannelAvatar ten={channelName} platform={group.platform} size={15} />
                <span className="font-medium truncate max-w-[130px]">{channelName}</span>
                {k.views !== undefined && k.views > 0 && (
                  <span className="text-[10.5px] text-slate-400 dark:text-slate-500 tabular-nums">
                    {compactNumber(k.views)}
                  </span>
                )}
                {hasUrl && <ArrowSquareOut size={11} className="shrink-0 opacity-60" />}
              </a>
            );
          })}
        </div>

        <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-x-2.5 flex-wrap">
          {duration !== null && <span className="tabular-nums">{duration}s</span>}
          <span className="tabular-nums">{compactNumber(group.views)} tổng lượt xem</span>
          <span className="tabular-nums">
            {startDate.slice(0, 10) === endDate.slice(0, 10)
              ? shortDate(startDate)
              : `${shortDate(startDate)} → ${shortDate(endDate)}`}
          </span>
          {remaining > 0 && <span>đăng lại {remaining} lần</span>}
        </div>
      </div>

      <span
        className={[
          'text-[11.5px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap border shrink-0 tabular-nums',
          isMultiChannel
            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-border',
        ].join(' ')}
      >
        {channelCount} kênh
      </span>
    </div>
  );
}

function ChannelTable({ byChannel }: { byChannel: DuplicateByChannel[] }) {
  const router = useRouter();
  const largeEnough = byChannel.filter((k) => (k.totalVideos ?? k.tong_video ?? 0) >= RANKING_VIDEO_FLOOR);
  const displayed = largeEnough.slice(0, MAX_RANKING_CHANNELS);
  const skipped = byChannel.length - largeEnough.length;

  if (displayed.length === 0) return null;

  return (
    <div>
      <h4 className="text-[13px] font-semibold text-foreground mb-1">Kênh lặp nội dung nhiều nhất</h4>
      <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mb-1">
        Tỷ lệ video trùng trên tổng bài đăng trong kỳ
        {largeEnough.length > displayed.length && ` · ${displayed.length} kênh đầu trong ${largeEnough.length}`}
      </p>
      <div>
        {displayed.map((k) => {
          const ratio = k.duplicateRatio ?? k.ty_le ?? 0;
          const duplicateVideos = k.duplicateVideos ?? k.video_trung ?? 0;
          const totalVideos = k.totalVideos ?? k.tong_video ?? 0;
          const channelName = k.name || k.ten || k.id;
          const isWarning = ratio >= WARNING_RATIO_THRESHOLD;

          return (
            <div
              key={`${k.platform}-${k.id}`}
              onClick={() => router.push(`/dashboard/internalChannels/all?channel=${encodeURIComponent(k.id)}`)}
              className="py-2.5 px-2.5 -mx-2.5 rounded-xl border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center gap-2 text-[12.5px]">
                <ChannelAvatar ten={channelName} platform={k.platform} size={22} />
                <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate" title={channelName}>
                  {channelName}
                </span>
                <b
                  className={`ml-auto font-semibold tabular-nums shrink-0 ${
                    isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                  }`}
                >
                  {percent(ratio)}
                </b>
              </div>
              <SplitBar
                cao={6}
                className="my-1.5"
                segments={[
                  { gia_tri: duplicateVideos, mau: isWarning ? '#dd8a3e' : COLOR_PRIMARY, ten: 'Trùng' },
                  { gia_tri: Math.max(0, totalVideos - duplicateVideos), mau: '#e2e8f0', ten: 'Riêng' },
                ]}
              />
              <div className="text-[11.5px] text-slate-400 dark:text-slate-500 tabular-nums flex items-center justify-between">
                <span>
                  {fullNumber(duplicateVideos)} / {fullNumber(totalVideos)} video trùng với kênh khác
                </span>
                <span className="text-[10.5px] opacity-0 group-hover:opacity-100 text-primary transition-opacity font-medium">
                  Xem video kênh →
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {skipped > 0 && (
        <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-2.5">
          Bỏ qua {skipped} kênh dưới {RANKING_VIDEO_FLOOR} video trong kỳ — mẫu quá nhỏ để tỷ lệ có
          nghĩa.
        </p>
      )}
    </div>
  );
}

function DuplicateSkeleton() {
  return (
    <Card className="mb-5">
      <Frame className="h-4 w-40" />
      <Frame className="h-3 w-72 mt-2" />
      <div className="grid gap-3 mt-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Frame key={i} className="h-[74px] w-full" />
        ))}
      </div>
      <div className="grid gap-6 mt-5 grid-cols-1 xl:grid-cols-[1.6fr_1fr]">
        <Frame className="h-[280px] w-full" />
        <Frame className="h-[280px] w-full" />
      </div>
    </Card>
  );
}
