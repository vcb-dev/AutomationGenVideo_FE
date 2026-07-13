"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/a5/admin/AdminDashboard";
import { useAuthStore } from "@/store/auth-store";
import { UserRole } from "@/types/auth";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.roles?.includes(UserRole.ADMIN)) {
      router.replace("/dashboard/manager");
    }
  }, [user, router]);

  if (!user?.roles?.includes(UserRole.ADMIN)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="-mx-6 w-[calc(100%+3rem)] min-h-[calc(100vh-4rem)] overflow-x-hidden bg-gray-50 font-sans text-gray-900">
      <div className="px-6">
        <AdminDashboard />
      </div>
    </div>
  );
}
