/**
 * Chức năng: Tạo ảnh sản phẩm — tab Tạo tự động: ghép nền 0đ là mặc định và tự chạy (Gemini phải
 * xác nhận lô, câu xác nhận có tiền ước tính và không bịa giá), đổi nền thì ảnh ghép nền tự ghép lại,
 * tên SP mặc định lấy từ tên file, tên file trong ZIP không dấu và không trùng, chạy song song đúng
 * giới hạn và dừng được giữa chừng mà lỗi một ảnh không làm dừng cả lô, tóm tắt lô, ghi rõ ảnh tách nền do
 * model tự huấn luyện (0đ) nhận diện.
 */
import { PRODUCT_NAME_MAX_LENGTH } from '../held-product-request';
import {
  BAG_SIZE_CLASSES,
  BatchSummaryItem,
  cutoutDetectionLabel,
  DEFAULT_BATCH_MODE,
  FALLBACK_SIZE_CLASS,
  GeminiEstimate,
  geminiBatchCostText,
  productNameFromFileName,
  requeueCutoutResults,
  runWithConcurrency,
  shouldAutoRun,
  slugifyFileName,
  summarizeBatch,
  typicalWidthCm,
  uniqueFileNames,
  widthCmFromName,
} from '../batch';

describe('productNameFromFileName', () => {
  it('bỏ đuôi file, đổi gạch dưới/gạch ngang thành dấu cách', () => {
    expect(productNameFromFileName('tui_hermes-birkin  30.jpg')).toBe('tui hermes birkin 30');
    expect(productNameFromFileName('Túi Đeo Chéo.WEBP')).toBe('Túi Đeo Chéo');
  });

  it('chỉ bỏ đuôi cuối cùng, giữ dấu chấm trong tên', () => {
    expect(productNameFromFileName('nhan.kim.vu.png')).toBe('nhan.kim.vu');
  });

  it('cắt theo độ dài tối đa của tên SP', () => {
    expect(productNameFromFileName(`${'a'.repeat(PRODUCT_NAME_MAX_LENGTH + 20)}.jpg`)).toHaveLength(PRODUCT_NAME_MAX_LENGTH);
  });
});

describe('slugifyFileName / uniqueFileNames', () => {
  it('bỏ dấu tiếng Việt, kể cả đ/Đ, chữ thường, nối bằng gạch ngang', () => {
    expect(slugifyFileName('Túi Đeo Chéo  #2 (đen)')).toBe('tui-deo-cheo-2-den');
  });

  it('tên rỗng hoặc chỉ ký tự đặc biệt → anh-sp', () => {
    expect(slugifyFileName('  ###  ')).toBe('anh-sp');
  });

  it('trùng tên thì thêm -2, -3 theo thứ tự', () => {
    expect(
      uniqueFileNames([
        { name: 'Túi A', extension: 'jpg' },
        { name: 'tui a', extension: 'jpg' },
        { name: 'Túi A', extension: 'png' },
        { name: 'TÚI A', extension: 'jpg' },
      ]),
    ).toEqual(['tui-a.jpg', 'tui-a-2.jpg', 'tui-a.png', 'tui-a-3.jpg']);
  });
});

describe('runWithConcurrency', () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('chạy hết theo thứ tự, không quá giới hạn song song', async () => {
    let active = 0;
    let peak = 0;
    const started: number[] = [];
    await runWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      started.push(n);
      active += 1;
      peak = Math.max(peak, active);
      await tick();
      active -= 1;
    });
    expect(started).toEqual([1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
  });

  it('dừng thì không nhận thêm phần tử mới', async () => {
    let stopped = false;
    const done: number[] = [];
    await runWithConcurrency(
      [1, 2, 3, 4],
      1,
      async (n) => {
        done.push(n);
        if (n === 2) stopped = true;
      },
      () => stopped,
    );
    expect(done).toEqual([1, 2]);
  });

  it('lỗi một phần tử không làm dừng cả lô', async () => {
    const done: number[] = [];
    await runWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 1) throw new Error('hỏng');
      done.push(n);
    });
    expect(done).toEqual([2, 3]);
  });

  it('danh sách rỗng thì xong ngay', async () => {
    const worker = jest.fn();
    await runWithConcurrency([], 2, worker);
    expect(worker).not.toHaveBeenCalled();
  });
});

describe('tự động hoá', () => {
  it('mặc định là ghép nền 0đ và chỉ ghép nền mới tự chạy (Gemini tốn tiền phải xác nhận)', () => {
    expect(DEFAULT_BATCH_MODE).toBe('cutout');
    expect(shouldAutoRun('cutout')).toBe(true);
    expect(shouldAutoRun('gemini')).toBe(false);
  });

  it('đổi nền: ảnh ghép nền đã xong về hàng chờ để tự ghép lại, ảnh Gemini và ảnh lỗi giữ nguyên', () => {
    const items = [
      { id: 'a', status: 'done' as const, result: { mode: 'cutout' as const } },
      { id: 'b', status: 'done' as const, result: { mode: 'gemini' as const } },
      { id: 'c', status: 'error' as const, result: null },
      { id: 'd', status: 'pending' as const, result: null },
    ];
    expect(requeueCutoutResults(items).map((i) => [i.id, i.status])).toEqual([
      ['a', 'pending'],
      ['b', 'done'],
      ['c', 'error'],
      ['d', 'pending'],
    ]);
  });
});

describe('geminiBatchCostText', () => {
  const estimate = (patch: Partial<GeminiEstimate>): GeminiEstimate => ({
    per_image_usd: 0.0682,
    per_image_vnd: 1773,
    sample_size: 12,
    note: null,
    ...patch,
  });

  it('có giá VNĐ: "N lượt, khoảng X đ" kèm giá mỗi ảnh và số lượt làm căn cứ', () => {
    const text = geminiBatchCostText(10, estimate({}));
    expect(text).toContain('10 lượt tính phí Gemini');
    expect(text).toContain(`Khoảng ${(17730).toLocaleString('vi-VN')}đ`);
    expect(text).toContain(`≈${(1773).toLocaleString('vi-VN')}đ/ảnh`);
    expect(text).toContain('12 lượt gần nhất');
  });

  it('thiếu tỷ giá: hiện USD và lý do', () => {
    const text = geminiBatchCostText(2, estimate({ per_image_vnd: null, note: 'Thiếu USD_VND_RATE' }));
    expect(text).toContain('Khoảng $0.1364');
    expect(text).toContain('Thiếu USD_VND_RATE');
  });

  it('chưa có lượt Gemini nào: nói thẳng, không bịa giá', () => {
    const text = geminiBatchCostText(3, estimate({ per_image_usd: null, per_image_vnd: null, sample_size: 0 }));
    expect(text).toContain('Chưa có lượt Gemini nào để ước tính giá');
    expect(text).not.toMatch(/Khoảng/);
  });

  it('không lấy được giá ước tính (lỗi mạng) vẫn có câu xác nhận', () => {
    expect(geminiBatchCostText(4, null)).toContain('Chưa lấy được giá ước tính');
  });
});

describe('summarizeBatch', () => {
  it('đếm trạng thái, cộng tiền đã biết, đếm lượt chưa biết tiền và ảnh đạt', () => {
    const items: BatchSummaryItem[] = [
      { status: 'done', result: { cost: { vnd: 1773 }, approved: true } },
      { status: 'done', result: { cost: { vnd: null }, approved: false } },
      { status: 'done', result: { cost: null, approved: false } }, // tách nền 0đ — không có khối cost
      { status: 'error', result: null },
      { status: 'pending', result: null },
      { status: 'running', result: null },
    ];
    expect(summarizeBatch(items)).toEqual({
      total: 6,
      pending: 1,
      running: 1,
      done: 3,
      error: 1,
      knownVnd: 1773,
      unknownCost: 1,
      approved: 1,
    });
  });
});

describe('cutoutDetectionLabel', () => {
  it('model tự huấn luyện nhận diện thì ghi 0đ, kể cả khi model chưa chắc mà không có gì phải cắt', () => {
    expect(cutoutDetectionLabel({ status: 'applied', source: 'model' })).toBe('model tự huấn luyện (0đ)');
    expect(cutoutDetectionLabel({ status: 'applied', source: 'model', model_reasons: ['kệ/hộp lúc thấy lúc không'] }))
      .toBe('model tự huấn luyện (0đ)');
  });

  it('ảnh có cảnh báo hoặc không có thông tin thì không ghi (đã có cảnh báo vàng riêng)', () => {
    expect(cutoutDetectionLabel({ status: 'skipped', source: 'model', reason: 'chưa cắt phần dính liền túi' })).toBeNull();
    expect(cutoutDetectionLabel(null)).toBeNull();
    expect(cutoutDetectionLabel({ status: 'applied' })).toBeNull();
  });
});


describe('widthCmFromName — bề ngang thân túi từ mã SP của shop', () => {
  it.each([
    ['260607_TX018-25-CS-02_Tui-Xach-Moc-Van-Da-Ca-Sau-(Moi).jpg', 25],
    ['TX004-22-B-09_Tui-Xach-Ha-Truc-Da-Bo.JPG', 22],
    ['TK9001-23-B-02_Tui-Xach-Nu-O-Tram', 23],
    ['260625_T103002-1-24_Tui-Xach-Van-Sa-Da-Da-Dieu', 24],
    ['WA9001-11-B_(THIET-KE)-Vi-Nam-Da-Bo', 11],
    ['T021012-26_Tui-Xach-Phong-Uyen-Da-Bo', 26],
    ['TX018 25 CS 02 Tui Xach Moc Van', 25],                       // tên SP mặc định (đã đổi "-" thành dấu cách)
    ['tx039-28-b-03.png', 28],
  ])('%s → %scm', (name, cm) => {
    expect(widthCmFromName(name)).toBe(cm);
  });

  it.each([
    'images-2.jpeg',
    'pexels-dhanno-22434773.jpg',
    'TX057_Phong-Nha-Da-Ca-Sau-Xanh',
    '(VI001) W031001-1_Vi-Nu-Moc-An-Da-Bo-QT',
    'Túi Xách Nữ Da Bò BGD-2026.0579',
    'TX104-99-B',                                                  // ngoài khoảng hợp lý
  ])('%s → chưa biết', (name) => {
    expect(widthCmFromName(name)).toBeNull();
  });
});

describe('BAG_SIZE_CLASSES — cỡ túi nhỏ/lớn cho ảnh không có mã SP', () => {
  it('đúng khoảng người dùng chốt: túi nhỏ đáy 22–26cm, túi lớn 32–40cm; số đại diện là giữa khoảng', () => {
    expect(BAG_SIZE_CLASSES.map((size) => [size.minCm, size.maxCm])).toEqual([[22, 26], [32, 40]]);
    expect(BAG_SIZE_CLASSES.map(typicalWidthCm)).toEqual([24, 36]);
  });

  it('ảnh chưa rõ cỡ tạm coi là túi nhỏ', () => {
    expect(FALLBACK_SIZE_CLASS.id).toBe('small');
  });
});
