'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsersThree, CircleNotch } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth-store';
import { scraperService, LookalikeChannel } from '@/services/scraperService';

export type LookalikePlatform = 'tiktok' | 'instagram' | 'kuaishou' | 'youtube' | 'xiaohongshu' | 'douyin';

interface LookalikeSectionProps {
  platform: LookalikePlatform;
  profileId: number;
}

function fetchLookalikes(platform: LookalikePlatform, token: string, profileId: number) {
  switch (platform) {
    case 'tiktok': return scraperService.tiktokLookalikes(token, profileId);
    case 'instagram': return scraperService.instagramLookalikes(token, profileId);
    case 'kuaishou': return scraperService.kuaishouLookalikes(token, profileId);
    case 'youtube': return scraperService.youtubeLookalikes(token, profileId);
    case 'xiaohongshu': return scraperService.xhsLookalikes(token, profileId);
    case 'douyin': return scraperService.douyinLookalikes(token, profileId);
  }
}

// scrapeProfile của mỗi platform nhận định danh khác nhau (username/channel_id/
// eid/user_id/sec_user_id) — field tương ứng đã được BE điền sẵn trong response
// lookalikes(), chỉ cần chọn đúng field theo platform.
function scrapeLookalike(platform: LookalikePlatform, token: string, c: LookalikeChannel) {
  switch (platform) {
    case 'tiktok': return scraperService.tiktokProfileScrape(token, c.username || '');
    case 'instagram': return scraperService.instagramProfileScrape(token, c.username || '');
    case 'kuaishou': return scraperService.kuaishouProfileScrape(token, c.eid || '');
    case 'youtube': return scraperService.youtubeChannelScrape(token, c.channel_id || '');
    case 'xiaohongshu': return scraperService.xhsProfileScrape(token, c.user_id || '');
    case 'douyin': return scraperService.douyinProfileScrape(token, c.sec_user_id || '');
  }
}

function displayName(c: LookalikeChannel): string {
  return c.nickname || c.full_name || c.title || (c.username ? `@${c.username}` : '') || c.user_id || '';
}

export default function LookalikeSection({ platform, profileId }: LookalikeSectionProps) {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [`${platform}-lookalikes`, profileId],
    queryFn: () => {
      if (!token) return Promise.reject('No token');
      return fetchLookalikes(platform, token, profileId);
    },
    enabled: !!token && !!profileId,
  });

  const scrapeMutation = useMutation({
    mutationFn: (c: LookalikeChannel) => {
      if (!token) throw new Error('No token');
      return scrapeLookalike(platform, token, c);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Đã gửi yêu cầu cào kênh.');
      queryClient.invalidateQueries({ queryKey: [`${platform}-profiles`] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lookalikes = query.data?.lookalikes || [];
  if (!query.isLoading && lookalikes.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
        <UsersThree size={16} className="text-primary" weight="duotone" />
        Kênh tương tự (trùng hashtag)
      </h2>

      {query.isLoading ? (
        <div className="flex justify-center py-6">
          <CircleNotch size={20} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {lookalikes.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-1.5 p-3 border border-border rounded-lg text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                {c.avatar_url && (
                  <img
                    src={c.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>
              <p className="text-xs font-medium text-foreground line-clamp-1 max-w-full">
                {displayName(c)}
              </p>
              <p className="text-[11px] text-slate-400">{c.overlap_count} hashtag trùng</p>
              <button
                onClick={() => scrapeMutation.mutate(c)}
                disabled={scrapeMutation.isPending}
                className="w-full mt-1 px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Cào kênh này
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
