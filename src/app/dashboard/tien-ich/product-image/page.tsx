'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, Hand, Layers } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import {
  canViewProductImageCosts,
  productImageTabFromParam,
  productImageTabQuery,
  type ProductImageTab,
} from '@/lib/product-image/cost-view';
import { BatchGenerator } from './components/BatchGenerator';
import { HeldProductGenerator } from './components/HeldProductGenerator';
import { ProductImageCostPanel } from './components/ProductImageCostPanel';

/**
 * Tiện ích → Tạo ảnh sản phẩm. Chỉ dành cho SP MỚI chưa về hàng (media chưa chụp được); SP đã
 * về thì lấy ảnh có sẵn từ media. Các chế độ theo nhu cầu ảnh:
 *  - Ghép background (mặc định, MỘT tab tự động, nhiều ảnh): thả ảnh SP là tự ra ảnh, không chỉnh
 *    tay — tách nền 0đ (tự chạy) hoặc Gemini đặt vào cảnh (tính phí, xác nhận một lần mỗi lô).
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

        <div className="flex flex-wrap items-center gap-x-6 border-b border-[#e2e0ea] mb-6">
          <button type="button" onClick={() => changeTab('background')} className={tabClass('background')}>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Ghép background
              <span className="ml-1 rounded-full bg-[#4441cc]/10 border border-[#4441cc]/20 px-2 py-0.5 text-[11px] font-semibold text-[#4441cc]">
                Tự động · nhiều ảnh
              </span>
            </span>
          </button>
          <button type="button" onClick={() => changeTab('held')} className={tabClass('held')}>
            <span className="inline-flex items-center gap-1.5">
              <Hand className="w-4 h-4" />
              Chị Nhạm cầm sản phẩm
              {/* Mặc định đổi SP 0đ (model tự huấn luyện); Gemini vẽ lại là lựa chọn tính phí trong tab. */}
              <span className="ml-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Đổi SP 0đ
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

        {/* Giữ các chế độ tạo ảnh trong cây (chỉ ẩn) để đổi tab không mất ảnh đã chọn/ảnh đã tạo. */}
        <div className={tab === 'background' ? '' : 'hidden'}>
          <BatchGenerator />
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
