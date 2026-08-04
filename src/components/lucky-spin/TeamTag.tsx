interface Props {
  name: string;
}

/**
 * Chip trung tính cho tên team.
 *
 * Trước đây mỗi team một màu pastel riêng, nhưng bảng đầy chip nhiều màu làm giao diện vụn và
 * kéo sự chú ý khỏi nút hành động chính. Tên team đã tự phân biệt được, nên chip chỉ cần nền xám.
 */
export function TeamTag({ name }: Props) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-3 py-1 text-[13px] font-medium text-[#6B7280] dark:bg-white/[0.06] dark:text-gray-300">
      {name}
    </span>
  );
}
