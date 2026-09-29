'use client';

import { useEffect, useRef, useState } from 'react';
import {
  applyLook,
  applySelfOcclusion,
  buildShadowLayer,
  defringeEdges,
  unpremultiplyEdges,
} from '@/lib/product-image/realism';
import { loadImage } from './download';

export interface RealismSettings {
  shadow: boolean;
  /** 1 = tối đúng như ảnh chụp thật */
  shadowStrength: number;
  /** 1,8 = mặc định người dùng chốt */
  shadowHeight: number;
  look: boolean;
  /** 0..1 */
  warmth: number;
}

export interface RealismLayers {
  product: HTMLCanvasElement;
  productUrl: string;
  shadow: HTMLCanvasElement | null;
  shadowUrl: string | null;
  /** Chiều cao lớp bóng / chiều cao sản phẩm — lớp bóng kéo dài xuống dưới chân. */
  shadowHeightRatio: number;
}

/** Kéo thanh trượt liên tục thì chỉ tính lại khi dừng tay một nhịp. */
const RECOMPUTE_DELAY_MS = 120;

function toObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('Không dựng được ảnh'))), 'image/png'),
  );
}

function canvasFrom(width: number, height: number, data: Uint8ClampedArray): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas');
  const image = ctx.createImageData(width, height);
  image.data.set(data);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Dựng 2 lớp trong hệ toạ độ của ảnh sản phẩm đã tách nền: sản phẩm (ánh sáng khớp nền + đáy tối
 * lại) và bóng dưới chân. Không phụ thuộc vị trí/kích thước đặt trên nền — kéo, thu phóng chỉ đổi
 * chỗ vẽ, không phải tính lại. Xem trước và ảnh xuất dùng chung đúng 2 lớp này.
 */
export function useRealismLayers(cutoutSrc: string | null, settings: RealismSettings) {
  const [base, setBase] = useState<{ width: number; height: number; data: Uint8ClampedArray } | null>(null);
  const [layers, setLayers] = useState<RealismLayers | null>(null);
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef(0);
  const urlsRef = useRef<string[]>([]);

  const revokeUrls = () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
  };
  useEffect(() => revokeUrls, []);

  // Điểm ảnh gốc của ảnh đã tách nền — đọc một lần mỗi khi đổi ảnh sản phẩm.
  useEffect(() => {
    setBase(null);
    setLayers(null);
    setBusy(false);
    revokeUrls();
    if (!cutoutSrc) return;
    let cancelled = false;
    loadImage(cutoutSrc)
      .then((image) => {
        if (cancelled) return;
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(image, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setBase({ width: canvas.width, height: canvas.height, data });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cutoutSrc]);

  const { shadow, shadowStrength, shadowHeight, look, warmth } = settings;
  useEffect(() => {
    if (!base) return;
    const requestId = ++requestIdRef.current;
    setBusy(true);
    const timer = window.setTimeout(async () => {
      try {
        const { width, height } = base;
        const productData = new Uint8ClampedArray(base.data);
        // Mép sạch khi bật một trong hai: khôi phục màu thật của điểm mép (rembg trả màu đã nhân độ
        // đặc → viền đen mảnh), rồi thay phần còn ám màu nền cũ (nền trắng → viền sáng) bằng màu thân.
        if (shadow || look) {
          unpremultiplyEdges(productData);
          defringeEdges(productData, width, height);
        }
        if (look) applyLook(productData, width, height, warmth, 1);
        if (shadow) applySelfOcclusion(productData, width, height, shadowStrength, shadowHeight);
        const productCanvas = canvasFrom(width, height, productData);

        let shadowCanvas: HTMLCanvasElement | null = null;
        let shadowHeightRatio = 1;
        if (shadow) {
          const layer = buildShadowLayer(base.data, width, height, shadowStrength, shadowHeight);
          const rgba = new Uint8ClampedArray(layer.width * layer.height * 4);
          for (let i = 0; i < layer.alpha.length; i += 1) rgba[i * 4 + 3] = layer.alpha[i];
          shadowCanvas = canvasFrom(layer.width, layer.height, rgba);
          shadowHeightRatio = layer.height / height;
        }

        const [productUrl, shadowUrl] = await Promise.all([
          toObjectUrl(productCanvas),
          shadowCanvas ? toObjectUrl(shadowCanvas) : Promise.resolve(null),
        ]);
        if (requestId !== requestIdRef.current) {
          URL.revokeObjectURL(productUrl);
          if (shadowUrl) URL.revokeObjectURL(shadowUrl);
          return;
        }
        revokeUrls();
        urlsRef.current = shadowUrl ? [productUrl, shadowUrl] : [productUrl];
        setLayers({ product: productCanvas, productUrl, shadow: shadowCanvas, shadowUrl, shadowHeightRatio });
      } finally {
        if (requestId === requestIdRef.current) setBusy(false);
      }
    }, RECOMPUTE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [base, shadow, shadowStrength, shadowHeight, look, warmth]);

  return { layers, busy };
}

/** Màu trung bình của ảnh nền (thu nhỏ 64×64) — để tự đặt mức ánh vàng ấm. */
export async function averageColor(src: string): Promise<[number, number, number]> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [0, 0, 0];
  ctx.drawImage(image, 0, 0, 64, 64);
  const { data } = ctx.getImageData(0, 0, 64, 64);
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    sum[0] += data[i];
    sum[1] += data[i + 1];
    sum[2] += data[i + 2];
  }
  const n = data.length / 4;
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}
