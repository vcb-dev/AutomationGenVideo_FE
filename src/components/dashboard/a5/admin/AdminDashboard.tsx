"use client";

import { useState } from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminKpiTab } from "./AdminKpiTab";
import { AdminOverviewFiltersProvider } from "./AdminOverviewFiltersContext";
import { AdminOverviewTab } from "./AdminOverviewTab";

export function AdminDashboard() {
  const [tab, setTab] = useState(0);

  return (
    <AdminOverviewFiltersProvider>
      <div className="flex min-h-[calc(100vh-4rem)] w-full max-w-none flex-col pb-10 text-sm text-gray-900 antialiased">
        <AdminHeader tab={tab} onTabChange={setTab} />
        {tab === 0 ? <AdminOverviewTab /> : <AdminKpiTab />}
      </div>
    </AdminOverviewFiltersProvider>
  );
}
