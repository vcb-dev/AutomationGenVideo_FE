'use client';

import { useState } from 'react';
import { Coins, Hand, Layers } from 'lucide-react';
import { BackgroundComposer } from './components/BackgroundComposer';
import { HeldProductGenerator } from './components/HeldProductGenerator';

type Mode = 'background' | 'held';

/**
 * Tiện ích → Tạo ảnh sản phẩm. Chỉ dành cho SP MỚI chưa về hàng (media chưa chụp được); SP đã
 * về thì lấy ảnh có sẵn từ media. Hai chế độ theo nhu cầu ảnh:
 *  - Ghép background: rembg tách nền rồi dán lên ảnh phòng — 0đ.
 *  - Chị Nhạm cầm SP: Gemini thay SP trên tay — tính phí mỗi lượt.
 *
 * Mọi vai trò đều có quyền `tools:product_image:use` mặc định (BE chỉ gắn JwtAuthGuard), nên không
 * có layout chặn theo vai trò như khu ảnh thẻ — RoutePermissionGuard lo phần quyền chi tiết.
 */
export default function ProductImagePage() {
  const [mode, setMode] = useState<Mode>('background');

  const tabClass = (value: Mode) =>
    `py-2.5 px-1 text-sm font-semibold transition-colors ${
      mode === value ? 'border-b-2 border-[#4441cc] text-[#4441cc]' : 'text-[#464554] hover:text-[#4441cc]'
    }`;

  return (
    <div className="text-[#1b1b1d]">
      <div className="max-w-[1680px] w-full mx-auto">
        <header className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#1b1b1d] tracking-tight">Tạo ảnh sản phẩm</h1>
          <p className="text-[#464554] text-sm mt-0.5">
            Dành cho sản phẩm mới chưa về hàng. Sản phẩm đã về thì lấy ảnh có sẵn từ media. Ảnh tạo ra cần được duyệt trước khi đăng.
          </p>
        </header>

        <div className="flex items-center gap-6 border-b border-[#e2e0ea] mb-6">
          <button type="button" onClick={() => setMode('background')} className={tabClass('background')}>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Ghép background
              <span className="ml-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Miễn phí
              </span>
            </span>
          </button>
          <button type="button" onClick={() => setMode('held')} className={tabClass('held')}>
            <span className="inline-flex items-center gap-1.5">
              <Hand className="w-4 h-4" />
              Chị Nhạm cầm sản phẩm
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <Coins className="w-3 h-3" />
                Tính phí
              </span>
            </span>
          </button>
        </div>

        {/* Giữ cả hai chế độ trong cây (chỉ ẩn) để đổi tab không mất ảnh đã chọn/ảnh đã tạo. */}
        <div className={mode === 'background' ? '' : 'hidden'}>
          <BackgroundComposer />
        </div>
        <div className={mode === 'held' ? '' : 'hidden'}>
          <HeldProductGenerator />
        </div>
      </div>
    </div>
  );
}
