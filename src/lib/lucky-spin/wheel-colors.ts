function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Độ bão hoà và độ sáng cố định cho mọi ô — chỉ đổi tông màu, nhờ vậy bánh xe nhìn như một
 *  bảng màu được thiết kế chứ không phải cầu vồng. */
const SEG_SATURATION = 46;
const SEG_LIGHTNESS = 64;

/** Bước màu theo góc vàng giúp các ô cạnh nhau không bao giờ trùng tông. */
export function segFill(i: number): { css: string; rgb: [number, number, number] } {
  const hue = (i * 137.508) % 360;
  return {
    css: `hsl(${hue.toFixed(1)} ${SEG_SATURATION}% ${SEG_LIGHTNESS}%)`,
    rgb: hslToRgb(hue, SEG_SATURATION, SEG_LIGHTNESS),
  };
}

/** Chọn màu chữ tương phản đủ đọc trên nền ô đã tô. */
export function textColorFor(rgb: [number, number, number]): string {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? '#111827' : '#FFFFFF';
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
