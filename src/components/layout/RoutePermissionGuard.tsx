'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { canAccessRoute } from '@/lib/permissions';
import type { User } from '@/types/auth';

/**
 * Chốt chặn khi người dùng gõ/dán thẳng URL của trang họ không có quyền.
 *
 * Tách riêng khỏi dashboard/layout.tsx vì `useSearchParams` bắt buộc phải nằm trong một biên
 * <Suspense> — để thẳng trong layout thì `next build` đổ với lỗi "should be wrapped in a suspense
 * boundary". Đây cũng là lý do Header.tsx bọc HeaderInner y hệt.
 */
export default function RoutePermissionGuard({ user }: { user: User | null }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!user) return;
    // Trang báo thiếu quyền phải tự do vào, nếu không sẽ tự đá vào chính nó thành vòng lặp.
    if (pathname.startsWith('/dashboard/khong-co-quyen')) return;

    const query = searchParams?.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    if (!canAccessRoute(user, href)) {
      router.replace('/dashboard/khong-co-quyen');
    }
  }, [user, pathname, searchParams, router]);

  return null;
}
