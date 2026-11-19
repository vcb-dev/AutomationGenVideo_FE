/**
 * Chức năng: bấm thông báo trong chuông → mở đúng trang (task, hoặc tab Bộ sưu tập của đề xuất video).
 */
import { notificationLink } from '../notification-link';

describe('notificationLink', () => {
  it('thông báo gắn task → mở task', () => {
    expect(notificationLink({ type: 'TASK_ASSIGNED', task_id: 't1' })).toBe('/dashboard/task-auto/tasks?taskId=t1');
  });

  it('có đề xuất video mới → tab Chờ duyệt; kết quả duyệt → tab Đề xuất của tôi', () => {
    expect(notificationLink({ type: 'VIDEO_PROPOSAL_NEW', task_id: null })).toBe('/dashboard/video-library?tab=pending');
    expect(notificationLink({ type: 'VIDEO_PROPOSAL_REVIEWED', task_id: null })).toBe('/dashboard/video-library?tab=mine');
  });

  it('loại khác không gắn task → không chuyển trang', () => {
    expect(notificationLink({ type: 'EMPTY_WAREHOUSE', task_id: null })).toBeNull();
  });
});
