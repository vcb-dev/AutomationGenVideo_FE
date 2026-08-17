'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPIN_DURATION_MS, SPIN_EASING } from '@/lib/lucky-spin/spin-rotation';
import { segFill, textColorFor, truncate } from '@/lib/lucky-spin/wheel-colors';
import { WheelSegment } from '@/types/lucky-spin';
import { useSpinReadOnly } from '@/components/lucky-spin/ReadOnlyContext';
import { useWheelNames } from '@/components/lucky-spin/WheelNamesContext';

const R = 177;
const CX = 197;
const CY = 197;
const SIZE = CX * 2;
/**
 * Cỡ hiển thị, không phải cỡ vẽ.
 *
 * Bánh xe chiếm hết bề ngang chỗ trống nhưng không vượt 560px, đồng thời không cao quá màn
 * hình để MC không phải cuộn trang giữa lúc đang chạy sự kiện. Chữ trên ô phóng to theo vì
 * font tính theo hệ toạ độ viewBox.
 */
const WHEEL_BOX = 'w-full max-w-[min(565px,calc(100vh-325px))] aspect-square';

interface Props {
  segments: WheelSegment[];
  rotation: number;
  /** Lệch chỉ số màu để vòng quay quà không trùng bảng màu với vòng quay thành viên. */
  colorOffset?: number;
  spinning?: boolean;
  /** Thời lượng chuyển động; đặt 0 để nhảy thẳng tới kết quả không animation. */
  transitionMs?: number;
  /** Ghi đè cỡ hiển thị — chế độ trình chiếu dùng gần hết chiều cao màn hình. */
  sizeClass?: string;
  /** Chữ trên nút giữa bánh xe — cũng chính là nút bấm quay. */
  hubLabel: string;
  onSpin?: () => void;
  spinDisabled?: boolean;
  emptyIcon: LucideIcon;
  emptyText: string;
}

function labelFontSize(count: number): number {
  if (count > 50) return 7;
  if (count > 30) return 8.5;
  if (count > 20) return 9.5;
  if (count > 10) return 11;
  return 13;
}

function labelMaxChars(count: number): number {
  if (count > 50) return 12;
  if (count > 30) return 15;
  if (count > 20) return 18;
  return 22;
}

const SPIN_TRANSITION = 'transition-transform will-change-transform';

export function SpinWheel({
  segments,
  rotation,
  colorOffset = 0,
  spinning = false,
  transitionMs = SPIN_DURATION_MS,
  sizeClass,
  hubLabel,
  onSpin,
  spinDisabled = false,
  emptyIcon: EmptyIcon,
  emptyText,
}: Props) {
  const box = sizeClass ?? WHEEL_BOX;
  const showNames = useWheelNames();
  const readOnly = useSpinReadOnly();
  const interactive = !!onSpin && !readOnly && !spinDisabled && !spinning;
  const motion = { transitionDuration: `${transitionMs}ms`, transitionTimingFunction: SPIN_EASING };

  const pointer = (
    <div className="relative z-10 -mb-1.5 h-0 w-0 border-l-[16px] border-r-[16px] border-t-[26px] border-l-transparent border-r-transparent border-t-[#F4B63D] drop-shadow-[0_3px_5px_rgba(244,182,61,0.35)]" />
  );

  if (segments.length === 0) {
    return (
      <div className="flex w-full flex-col items-center py-6">
        {pointer}
        <div
          className={cn(
            box,
            'flex flex-col items-center justify-center gap-3.5 rounded-full border-2 border-dashed border-[#D7DCE3] px-10 text-center dark:border-white/[0.09]',
          )}
        >
          <EmptyIcon className="h-9 w-9 text-[#9CA3AF]" strokeWidth={1.5} />
          <p className="text-[15px] leading-relaxed text-[#6B7280] dark:text-gray-400">{emptyText}</p>
        </div>
      </div>
    );
  }

  const n = segments.length;
  const segAngle = 360 / n;
  const showLabels = showNames;
  const fontSize = labelFontSize(n);
  const maxChars = labelMaxChars(n);
  // Một ô duy nhất không cắt được thành hình quạt, vẽ nguyên hình tròn thay thế.
  const singleFill = segFill(colorOffset);

  return (
    <div className="flex w-full flex-col items-center py-6">
      {pointer}
      <div
        className={cn(
          box,
          'relative rounded-full transition-shadow duration-500 ease-out',
          spinning
            ? 'shadow-[0_0_0_1px_rgba(244,182,61,0.25),0_0_44px_rgba(244,182,61,0.28)]'
            : 'shadow-[0_8px_28px_rgba(17,24,39,0.08)]',
        )}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={cn('block h-full w-full', SPIN_TRANSITION)}
          style={{ transform: `rotate(${rotation}deg)`, ...motion }}
        >
          {n === 1 ? (
            <g>
              <circle cx={CX} cy={CY} r={R} fill={singleFill.css} stroke="#FFFFFF" strokeWidth={2} />
              {showNames && (
                <text
                  x={CX}
                  y={CY - R * 0.55}
                  fill={textColorFor(singleFill.rgb)}
                  fontSize={14}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {truncate(segments[0].name, 22)}
                </text>
              )}
            </g>
          ) : (
            segments.map((item, i) => {
              const start = i * segAngle - 90;
              const end = start + segAngle;
              const x1 = CX + R * Math.cos((start * Math.PI) / 180);
              const y1 = CY + R * Math.sin((start * Math.PI) / 180);
              const x2 = CX + R * Math.cos((end * Math.PI) / 180);
              const y2 = CY + R * Math.sin((end * Math.PI) / 180);
              const largeArc = segAngle > 180 ? 1 : 0;
              const seg = segFill(i + colorOffset);
              const mid = start + segAngle / 2;

              return (
                <g key={item.id}>
                  <path
                    d={`M${CX},${CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${largeArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`}
                    fill={seg.css}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                  {showLabels && (
                    <g transform={`rotate(${mid} ${CX} ${CY})`}>
                      <text
                        x={CX + R * 0.88}
                        y={CY}
                        fill={textColorFor(seg.rgb)}
                        fontSize={fontSize}
                        fontWeight={600}
                        textAnchor="end"
                        dominantBaseline="central"
                        letterSpacing="0.01em"
                      >
                        {truncate(item.name, maxChars)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })
          )}
        </svg>

        {/* Trục giữa vừa là nút bấm quay. Dựng bằng nhiều lớp thay vì một hình tròn phẳng:
            vành trắng tách nó khỏi các ô màu, mặt trong chuyển sắc từ sáng xuống tối cho cảm
            giác khối cầu, viền sáng phía trên và bóng đổ phía dưới tạo độ dày. */}
        <button
          type="button"
          onClick={onSpin}
          disabled={interactive ? false : true}
          title={spinning ? 'Đang quay...' : hubLabel}
          className={cn(
            'group absolute left-1/2 top-1/2 aspect-square w-[23%] min-w-[86px] -translate-x-1/2 -translate-y-1/2',
            // Lớp ngoài chỉ lo định vị; chuyển động dồn hết vào lớp trong để không phải ghi đè
            // translate khi hover — ghi đè sẽ sinh ra calc âm không hợp lệ.
            'rounded-full bg-white p-[6px] transition-shadow duration-[250ms] ease-out',
            interactive
              ? 'cursor-pointer shadow-[0_10px_26px_rgba(17,24,39,0.22)] hover:shadow-[0_16px_34px_rgba(233,166,22,0.38)]'
              : 'cursor-not-allowed shadow-[0_6px_16px_rgba(17,24,39,0.12)]',
          )}
        >
          {/* Vòng sáng lan ra khi đang quay — dấu hiệu bánh xe còn chạy, thay cho chữ nhấp nháy. */}
          {spinning && (
            <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#F4B63D]/45" />
          )}

          <span
            className={cn(
              'relative flex h-full w-full items-center justify-center rounded-full',
              'text-[clamp(12px,1.8vw,26px)] font-bold uppercase leading-none tracking-[0.1em]',
              'transition-all duration-[250ms] ease-out',
              interactive && 'group-hover:scale-[1.05] group-active:scale-[0.97]',
              interactive
                ? 'bg-[radial-gradient(120%_120%_at_50%_0%,#FBDD90_0%,#F4B63D_46%,#DE980C_100%)] text-[#4A3308] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-4px_8px_rgba(146,94,0,0.28)] group-hover:bg-[radial-gradient(120%_120%_at_50%_0%,#FDE6AB_0%,#F7C255_46%,#E9A616_100%)]'
                : 'bg-[radial-gradient(120%_120%_at_50%_0%,#F7F2E2_0%,#EFE4C6_60%,#E4D5AE_100%)] text-[#A38B4A] shadow-[inset_0_2px_3px_rgba(255,255,255,0.5)]',
            )}
          >
            {hubLabel}
          </span>
        </button>
      </div>
    </div>
  );
}
