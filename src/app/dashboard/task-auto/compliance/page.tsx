import { redirect } from 'next/navigation'

// Đã gộp thành tab "Còn thiếu" của trang Công việc hôm nay — giữ route cho link trong thông báo cũ.
export default function CompliancePage({ searchParams }: { searchParams: { date?: string } }) {
  const date = searchParams.date
  redirect(`/dashboard/task-auto/tasks?tab=missing${date ? `&date=${encodeURIComponent(date)}` : ''}`)
}
