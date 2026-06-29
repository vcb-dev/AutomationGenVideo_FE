'use client';

import { TiktokLogo } from '@phosphor-icons/react';

export default function DouyinExternalPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border border-border rounded-xl">
      <TiktokLogo size={48} className="text-cyan-300" />
      <h2 className="text-base font-semibold text-foreground">Douyin (抖音)</h2>
      <p className="text-sm text-slate-400 text-center max-w-md">
        Tính năng khám phá kênh Douyin đang được phát triển. Sẽ sớm ra mắt!
      </p>
    </div>
  );
}
