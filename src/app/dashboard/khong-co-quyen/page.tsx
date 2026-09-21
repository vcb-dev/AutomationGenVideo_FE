'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

/**
 * Trang đích khi người dùng mở một mục không nằm trong quyền được cấp.
 *
 * Nói rõ "chưa được cấp quyền" thay vì đá im lặng về dashboard — đá im lặng khiến người dùng
 * tưởng hệ thống lỗi và đi hỏi vòng quanh, còn hiện 404 thì họ tưởng trang đã bị xoá.
 */
export default function NoPermissionPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
          <ShieldAlert className="h-7 w-7 text-amber-500" />
        </div>

        <h1 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
          Bạn chưa được cấp quyền vào mục này
        </h1>

        <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Tài khoản của bạn không có quyền truy cập chức năng vừa mở. Nếu đây là công việc bạn
          phụ trách, liên hệ quản trị viên để được cấp thêm quyền trong mục Quản lý nhân sự.
        </p>

        <Link
          href="/dashboard/ai"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại trang chính
        </Link>
      </div>
    </div>
  );
}
