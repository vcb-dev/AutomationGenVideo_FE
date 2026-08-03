import { teamChipColor } from '@/lib/lucky-spin/wheel-colors';

interface Props {
  name: string;
  /** Vị trí team trong danh sách; -1 nghĩa là team đã bị xóa, màu sẽ băm từ tên. */
  teamIndex: number;
}

export function TeamTag({ name, teamIndex }: Props) {
  const color = teamChipColor(name, teamIndex);
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: color.bg, color: color.text }}
    >
      {name}
    </span>
  );
}
