'use client';

import { ImagePlus } from 'lucide-react';

export default function PhotoToVideoPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <ImagePlus className="w-7 h-7 text-blue-600" />
        Photo to Video
      </div>
      <p className="text-slate-600 mt-2">
        Tính năng đang được phát triển. Bạn có thể dùng Mix Video để ghép video.
      </p>
    </div>
  );
}
