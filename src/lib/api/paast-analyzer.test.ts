/**
 * Endpoint PAAST Analyzer đã chuyển từ module riêng `/paast-analyzer/*` sang gộp trong
 * AI Integration `/ai/paast/*` (4617c1c, khớp phía BE gộp PaastAnalyzerService vào
 * AiIntegrationService — a78e782). Test này khoá đúng URL mới, tránh lỡ tay gọi lại
 * đường cũ đã bị xoá (BE sẽ trả 404 im lặng, rất khó chẩn đoán từ FE).
 */

jest.mock('@/lib/api-client', () => ({
  apiClient: { post: jest.fn() },
}));

import { apiClient } from '@/lib/api-client';
import {
  analyzePaastContent,
  findPaastAnalysisByContent,
  upgradePaastAnalysis,
} from './paast-analyzer';

const mockPost = apiClient.post as jest.Mock;

beforeEach(() => {
  mockPost.mockReset();
  mockPost.mockResolvedValue({ data: { id: 'analysis-1' } });
});

describe('analyzePaastContent', () => {
  it('gọi đúng /ai/paast/analyze (không phải /paast-analyzer/analyze đã bị xoá)', async () => {
    await analyzePaastContent('nội dung cần chấm');

    expect(mockPost).toHaveBeenCalledWith('/ai/paast/analyze', { content: 'nội dung cần chấm' });
  });

  it('trả về r.data, không trả cả response object', async () => {
    mockPost.mockResolvedValue({ data: { id: 'a1', total_score: 80 } });

    const result = await analyzePaastContent('x');

    expect(result).toEqual({ id: 'a1', total_score: 80 });
  });
});

describe('findPaastAnalysisByContent', () => {
  it('gọi đúng /ai/paast/find-by-content', async () => {
    await findPaastAnalysisByContent('nội dung đã chấm trước đó');

    expect(mockPost).toHaveBeenCalledWith('/ai/paast/find-by-content', {
      content: 'nội dung đã chấm trước đó',
    });
  });

  it('content chưa từng chấm thì trả null nguyên vẹn (không tự bịa giá trị khác)', async () => {
    mockPost.mockResolvedValue({ data: null });

    const result = await findPaastAnalysisByContent('nội dung mới toanh');

    expect(result).toBeNull();
  });
});

describe('upgradePaastAnalysis', () => {
  it('gọi đúng /ai/paast/upgrade/:id, ghép ID vào path chứ không phải body', async () => {
    await upgradePaastAnalysis('analysis-42');

    expect(mockPost).toHaveBeenCalledWith('/ai/paast/upgrade/analysis-42');
  });
});
