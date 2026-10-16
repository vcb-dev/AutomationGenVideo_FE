/** Trang cần mở khi bấm một thông báo trong chuông (null = chỉ đánh dấu đã đọc). */
export function notificationLink(n: { type?: string | null; task_id?: string | null }): string | null {
  if (n.task_id) return `/dashboard/task-auto/tasks?taskId=${n.task_id}`;
  // Bộ sưu tập: leader/admin nhận "có đề xuất mới", member nhận "đã duyệt / bị từ chối"
  if (n.type === 'VIDEO_PROPOSAL_NEW') return '/dashboard/video-library?tab=pending';
  if (n.type === 'VIDEO_PROPOSAL_REVIEWED') return '/dashboard/video-library?tab=mine';
  return null;
}
