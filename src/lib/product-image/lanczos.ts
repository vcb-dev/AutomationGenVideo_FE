/** Phóng ảnh RGBA bằng Lanczos3 trong hệ đã nhân alpha — nét hơn canvas, mép trong suốt không ám màu. */

const LOBES = 3;

const sinc = (x: number) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
const lanczos = (x: number) => (Math.abs(x) < LOBES ? sinc(x) * sinc(x / LOBES) : 0);

interface Kernel {
  starts: Int32Array;
  size: number;
  weights: Float32Array;
}

/** Trọng số cho từng điểm đích; thu nhỏ thì nới rộng nhân để không răng cưa. */
function buildKernel(from: number, to: number): Kernel {
  const ratio = from / to;
  const stretch = Math.max(1, ratio);
  const size = Math.ceil(LOBES * stretch) * 2 + 1;
  const starts = new Int32Array(to);
  const weights = new Float32Array(to * size);
  for (let i = 0; i < to; i += 1) {
    const center = (i + 0.5) * ratio - 0.5;
    const start = Math.floor(center) - Math.floor(size / 2);
    starts[i] = start;
    let sum = 0;
    for (let k = 0; k < size; k += 1) {
      const value = lanczos((start + k - center) / stretch);
      weights[i * size + k] = value;
      sum += value;
    }
    for (let k = 0; k < size; k += 1) weights[i * size + k] /= sum;
  }
  return { starts, size, weights };
}

export function resizeLanczos(rgba: Uint8ClampedArray, width: number, height: number, toWidth: number, toHeight: number): Uint8ClampedArray {
  const source = new Float32Array(width * height * 4);
  for (let i = 0; i < source.length; i += 4) {
    const a = rgba[i + 3] / 255;
    source[i] = rgba[i] * a;
    source[i + 1] = rgba[i + 1] * a;
    source[i + 2] = rgba[i + 2] * a;
    source[i + 3] = rgba[i + 3];
  }
  const across = buildKernel(width, toWidth);
  const middle = new Float32Array(toWidth * height * 4);
  const lastColumn = width - 1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4;
    for (let x = 0; x < toWidth; x += 1) {
      const start = across.starts[x];
      const offset = x * across.size;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let k = 0; k < across.size; k += 1) {
        const weight = across.weights[offset + k];
        const column = start + k;
        const at = row + (column < 0 ? 0 : column > lastColumn ? lastColumn : column) * 4;
        r += source[at] * weight;
        g += source[at + 1] * weight;
        b += source[at + 2] * weight;
        a += source[at + 3] * weight;
      }
      const out = (y * toWidth + x) * 4;
      middle[out] = r;
      middle[out + 1] = g;
      middle[out + 2] = b;
      middle[out + 3] = a;
    }
  }
  const down = buildKernel(height, toHeight);
  const output = new Uint8ClampedArray(toWidth * toHeight * 4);
  const lastRow = height - 1;
  for (let y = 0; y < toHeight; y += 1) {
    const start = down.starts[y];
    const offset = y * down.size;
    for (let x = 0; x < toWidth; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let k = 0; k < down.size; k += 1) {
        const weight = down.weights[offset + k];
        const line = start + k;
        const at = ((line < 0 ? 0 : line > lastRow ? lastRow : line) * toWidth + x) * 4;
        r += middle[at] * weight;
        g += middle[at + 1] * weight;
        b += middle[at + 2] * weight;
        a += middle[at + 3] * weight;
      }
      if (a <= 0) continue;
      const alpha = a > 255 ? 255 : a;
      const scale = 255 / alpha;
      const out = (y * toWidth + x) * 4;
      output[out] = r > 0 ? r * scale : 0;
      output[out + 1] = g > 0 ? g * scale : 0;
      output[out + 2] = b > 0 ? b * scale : 0;
      output[out + 3] = alpha;
    }
  }
  return output;
}
