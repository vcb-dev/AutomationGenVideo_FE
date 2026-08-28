/**
 * Dashboard chuyển đổi nội dung + hiển thị PAAST (dd5d733) — 3 hàm thuần chi phối phần dễ
 * vỡ nhất của UI: layer nào tô màu "yếu", câu nào được highlight trong bài, và layer nào tự
 * mở khi vừa nhận kết quả chấm.
 */

import { getLayerStatus, buildHighlightSegments, computeDefaultOpenLayers } from './paast-highlight.util';

describe('getLayerStatus', () => {
  it('>= 80% điểm tối đa là "good", bất kể max là bao nhiêu', () => {
    expect(getLayerStatus(20, 20)).toBe('good');
    expect(getLayerStatus(16, 20)).toBe('good');
    expect(getLayerStatus(20, 25)).toBe('good'); // 20/25 = 0.8
    expect(getLayerStatus(12, 15)).toBe('good'); // 12/15 = 0.8
  });

  it('50%-79% là "warning"', () => {
    expect(getLayerStatus(15, 20)).toBe('warning');
    expect(getLayerStatus(10, 20)).toBe('warning');
  });

  it('< 50% là "error"', () => {
    expect(getLayerStatus(9, 20)).toBe('error');
    expect(getLayerStatus(0, 20)).toBe('error');
  });

  it('đúng biên 80% và 50% (không lệch do làm tròn)', () => {
    expect(getLayerStatus(16, 20)).toBe('good'); // 16/20 = 0.8 đúng biên
    expect(getLayerStatus(15.99, 20)).toBe('warning');
    expect(getLayerStatus(10, 20)).toBe('warning'); // 10/20 = 0.5 đúng biên
    expect(getLayerStatus(9.99, 20)).toBe('error');
  });
});

describe('computeDefaultOpenLayers', () => {
  // max=20 đều nhau cho fixture để so tỷ lệ ngang, tách khỏi DEFAULT_LAYER_MAX thật.
  const layer = (score: number, max = 20) => ({ score, max, insights: [], criteria: [] } as any);

  it('mọi lớp đều "good" thì không mở lớp nào', () => {
    const result = computeDefaultOpenLayers({
      total_score: 100,
      layers: {
        prefer: layer(20), action: layer(18), acknowledge: layer(20),
        stick: layer(17), trust: layer(20),
      },
    } as any);

    expect(result.size).toBe(0);
  });

  it('mở đúng lớp điểm THẤP NHẤT trong các lớp chưa "good"', () => {
    const result = computeDefaultOpenLayers({
      total_score: 60,
      layers: {
        prefer: layer(20), action: layer(8), acknowledge: layer(5),
        stick: layer(20), trust: layer(20),
      },
    } as any);

    expect(result).toEqual(new Set(['acknowledge']));
  });

  it('layer thiếu (undefined) coi như điểm 0 — vẫn được xét, không bị bỏ qua', () => {
    const result = computeDefaultOpenLayers({
      total_score: 40,
      layers: { prefer: layer(20), action: layer(20), stick: layer(20), trust: layer(20) },
    } as any);

    expect(result).toEqual(new Set(['acknowledge']));
  });
});

describe('buildHighlightSegments', () => {
  const scoreResultWith = (opts: {
    preferInsights?: Array<{ status: string; evidence_sentences?: string[] }>;
    ctaMatches?: string[];
  }) =>
    ({
      total_score: 80,
      layers: { prefer: { score: 20, insights: opts.preferInsights ?? [] } },
      cta_warning: { detected: !!opts.ctaMatches?.length, matches: opts.ctaMatches ?? [] },
    } as any);

  it('không có gì để tô thì trả về nguyên đoạn text với mark=null', () => {
    const segments = buildHighlightSegments('nội dung không có gì đặc biệt', scoreResultWith({}));

    expect(segments).toEqual([{ text: 'nội dung không có gì đặc biệt', mark: null }]);
  });

  it('tô đúng câu evidence_sentences của insight Prefer KHÔNG phải "off"', () => {
    const text = 'Mở đầu. Đây là câu bằng chứng. Kết thúc.';
    const result = scoreResultWith({
      preferInsights: [{ status: 'primary', evidence_sentences: ['Đây là câu bằng chứng.'] }],
    });

    const segments = buildHighlightSegments(text, result);
    const highlighted = segments.find((s) => s.mark?.kind === 'prefer');

    expect(highlighted?.text).toBe('Đây là câu bằng chứng.');
  });

  it('insight status="off" KHÔNG được tô dù có evidence_sentences', () => {
    const text = 'Câu không nên được tô ở đây.';
    const result = scoreResultWith({
      preferInsights: [{ status: 'off', evidence_sentences: ['Câu không nên được tô ở đây.'] }],
    });

    const segments = buildHighlightSegments(text, result);

    expect(segments.every((s) => s.mark === null)).toBe(true);
  });

  it('cụm CTA cảnh báo đè lên Prefer khi trùng vị trí (CTA tô sau, luôn thắng)', () => {
    const text = 'mua ngay kẻo lỡ';
    const result = scoreResultWith({
      preferInsights: [{ status: 'primary', evidence_sentences: ['mua ngay kẻo lỡ'] }],
      ctaMatches: ['mua ngay'],
    });

    const segments = buildHighlightSegments(text, result);

    expect(segments[0]).toEqual({ text: 'mua ngay', mark: { kind: 'cta' } });
  });

  it('chuỗi cần tô KHÔNG xuất hiện nguyên văn trong bài thì bỏ qua, không tô bừa', () => {
    const text = 'nội dung thực tế khác hẳn';
    const result = scoreResultWith({
      preferInsights: [{ status: 'primary', evidence_sentences: ['câu này không có trong bài'] }],
    });

    const segments = buildHighlightSegments(text, result);

    expect(segments.every((s) => s.mark === null)).toBe(true);
  });

  it('chuỗi rỗng/toàn khoảng trắng bị bỏ qua, không làm hỏng phần còn lại', () => {
    const text = 'nội dung bình thường';
    const result = scoreResultWith({
      preferInsights: [{ status: 'primary', evidence_sentences: ['   ', ''] }],
    });

    const segments = buildHighlightSegments(text, result);

    expect(segments).toEqual([{ text: 'nội dung bình thường', mark: null }]);
  });

  it('nhiều đoạn tô liền kề gộp lại đúng theo mark, giữ nguyên phần chưa tô ở giữa', () => {
    const text = 'A đầu câu chưa tô B';
    const result = scoreResultWith({
      preferInsights: [{ status: 'primary', evidence_sentences: ['A'] }],
      ctaMatches: ['B'],
    });

    const segments = buildHighlightSegments(text, result);

    expect(segments).toEqual([
      { text: 'A', mark: { kind: 'prefer' } },
      { text: ' đầu câu chưa tô ', mark: null },
      { text: 'B', mark: { kind: 'cta' } },
    ]);
  });
});
