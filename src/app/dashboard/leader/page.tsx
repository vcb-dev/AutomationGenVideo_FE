"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LeaderDashboard } from "@/components/dashboard/a5/leader/LeaderDashboard";
import { useAuthStore } from "@/store/auth-store";
import { UserRole } from "@/types/auth";

export default function LeaderDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const canAccess = user?.roles?.includes(UserRole.LEADER);

  useEffect(() => {
    if (user && !canAccess) {
      router.replace("/dashboard/manager");
    }
  }, [user, canAccess, router]);

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 font-sans text-gray-900">
      <LeaderDashboard />
    </div>
  );
}
