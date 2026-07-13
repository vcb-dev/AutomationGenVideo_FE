'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Facebook, Construction } from 'lucide-react';
import { UserRole } from '@/types/auth';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.roles?.some(r => r === UserRole.MANAGER || r === UserRole.ADMIN)) {
        router.push('/dashboard/manager');
      } else {
        router.push('/dashboard/manager/user-activity?tab=performance');
      }
    }
  }, [user, router]);

  if (user) return null;

  // Keep rendering placeholder for a flicker, but redirect is primary
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in-up">
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <Facebook className="w-12 h-12 text-blue-600" />
      </div>
      
      <h1 className="text-3xl font-bold text-slate-900 mb-3">
        Facebook Intelligence
      </h1>
      
      <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm mb-6">
        <Construction className="w-4 h-4" />
        <span>Tính năng đang phát triển</span>
      </div>

      <p className="max-w-md text-slate-500 mb-8 leading-relaxed">
        Chúng tôi đang xây dựng bộ công cụ phân tích chuyên sâu cho Facebook Reels và Video. 
        Tính năng này sẽ sớm ra mắt trong bản cập nhật tiếp theo.
      </p>

      {/* Optional: Notify Me Button or similar */}
      <button className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
        Nhận thông báo khi ra mắt
      </button>
    </div>
  );
}
