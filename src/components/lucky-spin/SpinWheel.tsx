'use client';

import { cn } from '@/lib/utils';
import { segFill, textColorFor, truncate } from '@/lib/lucky-spin/wheel-colors';
import { SpinAccent, WheelSegment } from '@/types/lucky-spin';

const R = 177;
const CX = 197;
const CY = 197;
const SIZE = CX * 2;
/** Quá 24 ô thì chữ chồng lên nhau, chỉ để lại màu cho dễ nhìn. */
const MAX_LABEL_SEGMENTS = 24;

const POINTER_CLASS: Record<SpinAccent, string> = {
  gold: 'border-t-[#F0B93C]',
  teal: 'border-t-[#3FB893]',
};

const HUB_STROKE: Record<SpinAccent, string> = { gold: '#F0B93C', teal: '#3FB893' };
const HUB_TEXT: Record<SpinAccent, string> = { gold: '#C68F1E', teal: '#2A8768' };

interface Props {
  segments: WheelSegment[];
  rotation: number;
  /** Lệch chỉ số màu để vòng quay quà không trùng bảng màu với vòng quay thành viên. */
  colorOffset?: number;
  accent: SpinAccent;
  hubLabel: string;
  emptyText: string;
}

function labelFontSize(count: number): number {
  if (count > 14) return 9;
  if (count > 8) return 11;
  return 13;
}

/**
 * Chữ nằm ngang đọc dễ hơn chữ xoay theo nan quạt, nhưng bù lại chỉ dùng được bề ngang của ô
 * thay vì chiều dài nan, nên càng nhiều ô càng phải cắt ngắn tên.
 */
function labelMaxChars(count: number): number {
  if (count > 16) return 6;
  if (count > 10) return 8;
  if (count > 6) return 11;
  return 14;
}

/**
 * Bánh xe dừng ở góc bất kỳ nên chữ vẽ thẳng sẽ nghiêng theo. Xoay ngược mỗi nhãn đúng bằng góc
 * bánh xe để chữ luôn nằm ngang trên màn hình, dùng cùng transition nên chữ và bánh xe chuyển
 * động khớp nhau trong lúc quay.
 */
const SPIN_TRANSITION = 'transition-transform duration-[4500ms] ease-[cubic-bezier(0.12,0.72,0.15,1)]';

export function SpinWheel({ segments, rotation, colorOffset = 0, accent, hubLabel, emptyText }: Props) {
  const uprightAt = (x: number, y: number) => ({
    transform: `rotate(${-rotation}deg)`,
    transformOrigin: `${x}px ${y}px`,
  });

  const pointer = (
    <div
      className={cn(
        'z-10 -mb-1 h-0 w-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent drop-shadow',
        POINTER_CLASS[accent],
      )}
    />
  );

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center py-5">
        {pointer}
        <div className="flex h-[354px] w-[354px] items-center justify-center rounded-full border-2 border-dashed border-gray-300 p-5 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
          {emptyText}
        </div>
      </div>
    );
  }

  const n = segments.length;
  const segAngle = 360 / n;
  const showLabels = n <= MAX_LABEL_SEGMENTS;
  const fontSize = labelFontSize(n);
  const maxChars = labelMaxChars(n);
  // Một ô duy nhất không cắt được thành hình quạt, vẽ nguyên hình tròn thay thế.
  const singleFill = segFill(colorOffset);

  return (
    <div className="flex flex-col items-center py-5">
      {pointer}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={cn('max-w-full', SPIN_TRANSITION)}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {n === 1 ? (
          <g>
            <circle cx={CX} cy={CY} r={R} fill={singleFill.css} stroke="#FFFFFF" strokeWidth={1.5} />
            <g className={SPIN_TRANSITION} style={uprightAt(CX, CY - R * 0.55)}>
              <text
                x={CX}
                y={CY - R * 0.55}
                fill={textColorFor(singleFill.rgb)}
                fontSize={14}
                fontWeight={600}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {truncate(segments[0].name, 18)}
              </text>
            </g>
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
            const lx = CX + R * 0.62 * Math.cos((mid * Math.PI) / 180);
            const ly = CY + R * 0.62 * Math.sin((mid * Math.PI) / 180);

            return (
              <g key={item.id}>
                <path
                  d={`M${CX},${CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${largeArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`}
                  fill={seg.css}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
                {showLabels && (
                  <g className={SPIN_TRANSITION} style={uprightAt(lx, ly)}>
                    <text
                      x={lx.toFixed(2)}
                      y={ly.toFixed(2)}
                      fill={textColorFor(seg.rgb)}
                      fontSize={fontSize}
                      fontWeight={600}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {truncate(item.name, maxChars)}
                    </text>
                  </g>
                )}
              </g>
            );
          })
        )}
        <circle cx={CX} cy={CY} r={34} fill="#FFFFFF" stroke={HUB_STROKE[accent]} strokeWidth={3} />
        <g className={SPIN_TRANSITION} style={uprightAt(CX, CY)}>
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fill={HUB_TEXT[accent]} fontSize={13} fontWeight={700}>
            {hubLabel}
          </text>
        </g>
      </svg>
    </div>
  );
}
