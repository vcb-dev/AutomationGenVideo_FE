import type { CompositeJob, CompositeReply } from '@/lib/product-image/composite-pool';
import { buildRealismLayers } from '@/lib/product-image/realism-layers';

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
