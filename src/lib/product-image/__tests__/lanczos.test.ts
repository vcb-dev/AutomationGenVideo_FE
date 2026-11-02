/**
 * Chức năng: Tạo ảnh sản phẩm — phóng ảnh SP lên nền bằng Lanczos để giữ độ nét.
 */
import { resizeLanczos } from '../lanczos';

function flat(width: number, height: number, color: number[]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(color, i);
  return data;
}

describe('resizeLanczos', () => {
  it('ảnh một màu giữ nguyên màu khi phóng to và thu nhỏ', () => {
    for (const [w, h] of [[20, 30], [3, 4]]) {
      const out = resizeLanczos(flat(10, 10, [120, 80, 40, 255]), 10, 10, w, h);
      expect(out).toHaveLength(w * h * 4);
      expect(Array.from(out.slice(0, 4))).toEqual([120, 80, 40, 255]);
    }
  });

  it('giữ cạnh gắt hơn nội suy tuyến tính khi phóng to', () => {
    const data = flat(8, 1, [20, 20, 20, 255]);
    for (let x = 4; x < 8; x += 1) data.set([220, 220, 220, 255], x * 4);
    const out = resizeLanczos(data, 8, 1, 32, 1);
    const left = out[14 * 4];
    const right = out[17 * 4];
    expect(right - left).toBeGreaterThan(100);
  });

  it('mép trong suốt không ám màu của điểm bị ẩn', () => {
    const data = flat(8, 8, [255, 0, 255, 0]);
    for (let y = 0; y < 8; y += 1) for (let x = 0; x < 4; x += 1) data.set([200, 40, 40, 255], (y * 8 + x) * 4);
    const out = resizeLanczos(data, 8, 8, 24, 24);
    for (let x = 0; x < 24; x += 1) {
      const i = (12 * 24 + x) * 4;
      if (out[i + 3] > 20) expect(out[i + 2]).toBeLessThan(90);
    }
  });

  it('vùng trong suốt vẫn trong suốt, alpha nằm trong 0..255', () => {
    const out = resizeLanczos(flat(6, 6, [9, 9, 9, 0]), 6, 6, 12, 12);
    expect(Math.max(...Array.from(out))).toBe(0);
  });
});
