'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, Coins, Hand, Layers } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import {
  canViewProductImageCosts,
  productImageTabFromParam,
  productImageTabQuery,
  type ProductImageTab,
} from '@/lib/product-image/cost-view';
import { BackgroundComposer } from './components/BackgroundComposer';
import { HeldProductGenerator } from './components/HeldProductGenerator';
import { ProductImageCostPanel } from './components/ProductImageCostPanel';

/**
 * Tiện ích → Tạo ảnh sản phẩm. Chỉ dành cho SP MỚI chưa về hàng (media chưa chụp được); SP đã
 * về thì lấy ảnh có sẵn từ media. Hai chế độ theo nhu cầu ảnh:
 *  - Ghép background: rembg tách nền rồi dán lên ảnh phòng — 0đ.
 *  - Chị Nhạm cầm SP: Gemini thay SP trên tay — tính phí mỗi lượt.
 * Thêm tab Chi phí cho ADMIN/MANAGER (khớp @Roles của GET /product-image/costs).
 *
 * Mọi vai trò đều có quyền `tools:product_image:use` mặc định (BE chỉ gắn JwtAuthGuard), nên không
 * có layout chặn theo vai trò như khu ảnh thẻ — RoutePermissionGuard lo phần quyền chi tiết.
 * Tab đồng bộ với `?tab=` như khu ảnh thẻ để gửi được link thẳng tới tab Chi phí.
 */
function ProductImagePageContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname() || '/dashboard/tien-ich/product-image';
  const tabParam = useSearchParams().get('tab');
  const canViewCosts = canViewProductImageCosts(user?.roles);

  const [tab, setTab] = useState<ProductImageTab>(() => productImageTabFromParam(tabParam, canViewCosts));

  // Đồng bộ khi query đổi, và khi quyền xem chi phí biết muộn (phiên đăng nhập nạp sau lần vẽ đầu).
  useEffect(() => {
    setTab(productImageTabFromParam(tabParam, canViewCosts));
  }, [tabParam, canViewCosts]);

  const changeTab = (next: ProductImageTab) => {
    setTab(next);
    router.replace(`${pathname}${productImageTabQuery(next)}`, { scroll: false });
  };

  const tabClass = (value: ProductImageTab) =>
    `py-2.5 px-1 text-sm font-semibold transition-colors ${
      tab === value ? 'border-b-2 border-[#4441cc] text-[#4441cc]' : 'text-[#464554] hover:text-[#4441cc]'
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
          <button type="button" onClick={() => changeTab('background')} className={tabClass('background')}>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Ghép background
              <span className="ml-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Miễn phí
              </span>
            </span>
          </button>
          <button type="button" onClick={() => changeTab('held')} className={tabClass('held')}>
            <span className="inline-flex items-center gap-1.5">
              <Hand className="w-4 h-4" />
              Chị Nhạm cầm sản phẩm
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <Coins className="w-3 h-3" />
                Tính phí
              </span>
            </span>
          </button>
          {canViewCosts && (
            <button type="button" onClick={() => changeTab('costs')} className={tabClass('costs')}>
              <span className="inline-flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" />
                Chi phí
              </span>
            </button>
          )}
        </div>

        {/* Giữ hai chế độ tạo ảnh trong cây (chỉ ẩn) để đổi tab không mất ảnh đã chọn/ảnh đã tạo. */}
        <div className={tab === 'background' ? '' : 'hidden'}>
          <BackgroundComposer />
        </div>
        <div className={tab === 'held' ? '' : 'hidden'}>
          <HeldProductGenerator />
        </div>
        {/* Tab Chi phí chỉ dựng khi mở — mỗi lần mở lấy số mới. */}
        {tab === 'costs' && canViewCosts && <ProductImageCostPanel />}
      </div>
    </div>
  );
}

export default function ProductImagePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-160px)]" />}>
      <ProductImagePageContent />
    </Suspense>
  );
}
