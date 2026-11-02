import { buildRealismLayers, type CutoutPixels, type RealismLayers, type RealismSettings } from '@/lib/product-image/realism-layers';

export interface CompositeJob {
  id: number;
  base: CutoutPixels;
  settings: RealismSettings;
  target: { width: number; height: number };
}

export type CompositeReply = { id: number; layers: RealismLayers } | { id: number; error: string };

const scope = self as unknown as Worker;

scope.onmessage = ({ data }: MessageEvent<CompositeJob>) => {
  try {
    const layers = buildRealismLayers(data.base, data.settings, data.target);
    const transfer = [layers.product.data.buffer, ...(layers.shadow ? [layers.shadow.data.buffer] : [])] as ArrayBuffer[];
    scope.postMessage({ id: data.id, layers } satisfies CompositeReply, transfer);
  } catch (err) {
    scope.postMessage({ id: data.id, error: err instanceof Error ? err.message : 'Không dựng được ảnh' } satisfies CompositeReply);
  }
};
