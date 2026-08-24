'use client'

import { StatusDonut } from './DashboardUI'

export function StatusBar({ tasks }: { tasks: Record<string, number> }) {
  return <StatusDonut tasks={tasks} size="sm" layout="row" />
}
