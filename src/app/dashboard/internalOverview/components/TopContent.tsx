'use client';

import { useRef } from 'react';
import { CaretLeft, CaretRight, Play } from '@phosphor-icons/react';

import type { VideoNoiBat } from '@/services/scraperService';
import {
  Dot,
  Subtitle,
  The,
  CardTitle,
  EmptyState,
  platformColor,
  shortDate,
  fullNumber,
  compactNumber,
  platformName,
} from './shared';

/** Băng ngang video nhiều lượt xem nhất trong kỳ; bấm để mở bài gốc trên nền tảng. */
export default function TopContent({ video }: { video: VideoNoiBat[] }) {
  const bang = useRef<HTMLDivElement>(null);
  const cuon = (huong: number) => bang.current?.scrollBy({ left: huong * 450, behavior: 'smooth' });

  return (
    <The className="!mb-5">
      <CardTitle chuThich="Xếp theo lượt xem của các video đăng trong kỳ">Nội dung hàng đầu</CardTitle>
      <Subtitle className="!mb-4">Bấm để mở bài gốc</Subtitle>

      {video.length === 0 ? (
        <EmptyState tieu_de="Chưa có video nào" mo_ta="Không có bài đăng nào trong kỳ đang chọn." />
      ) : (
        <div className="relative">
          <NutCuon huong={-1} onBam={() => cuon(-1)} />
          <div ref={bang} className="flex gap-3.5 overflow-x-auto py-1 px-0.5 pb-2.5 scrollbar-none">
            {video.map((v) => (
              <a
                key={`${v.platform}-${v.post_id}`}
                href={v.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-[136px] group transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="relative w-[136px] aspect-[9/16] rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-sm group-hover:shadow-lg transition-shadow">
                  {v.thumbnail && (
                    <img
                      src={v.thumbnail}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />

                  <span className="absolute top-2.5 left-2.5 z-10 h-[21px] px-2.5 grid place-items-center rounded-full text-[10px] font-medium text-white bg-slate-950/45 backdrop-blur border border-white/20">
                    {platformName(v.platform)}
                  </span>
                  <span className="absolute top-2.5 right-2.5 z-10 text-white/85">
                    <Play size={13} weight="fill" />
                  </span>

                  <span className="absolute bottom-3 left-3 z-10 text-white font-semibold text-base tracking-tight leading-tight">
                    <span title={fullNumber(v.views)}>{compactNumber(v.views)}</span>
                    <small className="block font-normal text-[10px] opacity-80 mt-0.5">lượt xem</small>
                  </span>
                </div>

                <div className="text-[12.5px] mt-2.5 leading-snug text-foreground line-clamp-2">
                  {v.mo_ta || 'Không có mô tả'}
                </div>
                <div className="text-slate-400 dark:text-slate-500 text-[11.5px] mt-1.5 flex items-center gap-1.5">
                  <Dot mau={platformColor(v.platform)} size={7} />
                  <span className="truncate">{v.kenh_ten || platformName(v.platform)}</span>
                  <span className="shrink-0">· {shortDate(v.ngay)}</span>
                </div>
              </a>
            ))}
          </div>
          <NutCuon huong={1} onBam={() => cuon(1)} />
        </div>
      )}
    </The>
  );
}

function NutCuon({ huong, onBam }: { huong: -1 | 1; onBam: () => void }) {
  return (
    <button
      onClick={onBam}
      aria-label={huong < 0 ? 'Cuộn trái' : 'Cuộn phải'}
      className={`absolute top-[104px] z-20 w-8 h-8 rounded-full bg-card border border-border shadow-md grid place-items-center text-slate-500 dark:text-slate-400 hover:text-foreground hover:scale-105 transition-transform ${
        huong < 0 ? '-left-3' : '-right-3'
      }`}
    >
      {huong < 0 ? <CaretLeft size={15} weight="bold" /> : <CaretRight size={15} weight="bold" />}
    </button>
  );
}
