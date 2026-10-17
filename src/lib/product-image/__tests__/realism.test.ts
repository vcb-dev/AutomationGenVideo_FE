/**
 * Chức năng: Tạo ảnh sản phẩm — "Ghép background" giống ảnh chụp thật: bóng dưới chân theo đường
 * cong đo từ ảnh chụp thật (độ đậm 100%, cao 1,8 lần là mặc định người dùng chốt), ánh sáng khớp
 * với nền, đáy sản phẩm tối lại sát mặt phẳng.
 */
import {
  addedWarmth,
  sameLightAsScene,
  DEFAULT_SHADOW_HEIGHT,
  DEFAULT_SHADOW_STRENGTH,
  REAL_SHADOW_PROFILE,
  RESIDUE_MAX_ALPHA,
  applyLook,
  applySelfOcclusion,
  bottomEdges,
  buildShadowLayer,
  clearMatteResidue,
  defringeEdges,
  estimateWarmth,
  residueReach,
  unpremultiplyEdges,
  shadowProfileAt,
  shadowSizeReference,
  FALLOFF_MAX,
  FALLOFF_MIN,
  REAL_TOP_LIGHT_DIFF,
  SURFACE_POOL_MAX,
  chooseFalloff,
  footprint,
  lightness,
  medianLightness,
  surfacePoolStrength,
  brightenProduct,
  PRODUCT_EXPOSURE,
  PRODUCT_EXPOSURE_MAX,
  PRODUCT_EXPOSURE_MIN,
  REFERENCE_SCENE_L,
  STUDIO_BODY_PROFILE,
  STUDIO_STRENGTH,
  analyzeSceneLight,
  studioRowFactors,
  productExposureFor,
} from '../realism';

/** Ảnh RGBA: `solid(x, y)` = true thì điểm đó thuộc sản phẩm (màu xám 200, alpha 255). */
function makeImage(width: number, height: number, solid: (x: number, y: number) => boolean, color = [200, 200, 200]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!solid(x, y)) continue;
      const i = (y * width + x) * 4;
      data.set([color[0], color[1], color[2], 255], i);
    }
  }
  return data;
}

/** Độ sáng còn lại (1 − độ tối) tại (x, y) của lớp bóng. */
const brightnessAt = (layer: ReturnType<typeof buildShadowLayer>, x: number, y: number) =>
  1 - layer.alpha[y * layer.width + x + layer.padX] / 255;

describe('mặc định đã chốt', () => {
  it('độ đậm 100% (đúng ảnh thật), độ cao 1,8 lần', () => {
    expect(DEFAULT_SHADOW_STRENGTH).toBe(1);
    expect(DEFAULT_SHADOW_HEIGHT).toBe(1.8);
  });
});

describe('bottomEdges', () => {
  it('hàng thấp nhất có điểm đặc của từng cột, cột trống = -1', () => {
    const data = makeImage(4, 5, (x, y) => (x === 1 && y <= 2) || (x === 2 && y <= 4));
    expect(Array.from(bottomEdges(data, 4, 5))).toEqual([-1, 2, 4, -1]);
  });
});

describe('buildShadowLayer — hiệu chỉnh theo ảnh chụp thật', () => {
  // Sản phẩm hình chữ nhật cao đúng 1267px (bằng túi trong ảnh thật) → tỉ lệ 1:1 với số đo.
  const width = 1000;
  const height = 1267;
  const product = makeImage(width, height, () => true);

  it('độ đậm 1, độ cao 1: độ sáng dưới đáy khớp đúng số đo ảnh thật ở mọi khoảng cách', () => {
    const layer = buildShadowLayer(product, width, height, 1, 1);
    for (const [d, level] of REAL_SHADOW_PROFILE) {
      if (d >= 48) continue;
      expect(brightnessAt(layer, width / 2, height + d)).toBeCloseTo(level, 1);
    }
  });

  it('độ cao 1,8: bóng loang dài gấp 1,8 lần (điểm 12px của ảnh thật nằm ở 21,6px)', () => {
    const layer = buildShadowLayer(product, width, height, 1, 1.8);
    expect(brightnessAt(layer, width / 2, height + 22)).toBeCloseTo(shadowProfileAt(22 / 1.8, 1), 1);
    expect(brightnessAt(layer, width / 2, height + 22)).toBeLessThan(brightnessAt(buildShadowLayer(product, width, height, 1, 1), width / 2, height + 22));
  });

  it('độ đậm tỉ lệ: 50% thì sát đáy còn 1 − 0,5 × (1 − 0,15)', () => {
    const layer = buildShadowLayer(product, width, height, 0.5, 1);
    expect(brightnessAt(layer, width / 2, height)).toBeCloseTo(1 - 0.5 * 0.85, 1);
  });

  it('lớp bóng kéo dài xuống dưới đủ chứa hết bóng', () => {
    const layer = buildShadowLayer(product, width, height, 1, 1.8);
    expect(layer.height).toBeGreaterThanOrEqual(height + Math.ceil(48 * 1.8));
  });
});

describe('buildShadowLayer — hình dáng', () => {
  it('phần hông nhấc cao khỏi mặt phẳng gần như không có bóng (không có vệt đen lơ lửng)', () => {
    // Thân rộng 100px cao 200px, nhưng chỉ 40px giữa chạm đáy; hai bên kết thúc cao hơn 60px.
    const width = 100;
    const height = 260;
    const product = makeImage(width, height, (x, y) => y < 200 || (x >= 30 && x < 70));
    const layer = buildShadowLayer(product, width, height, 1, 1.8);
    expect(brightnessAt(layer, 50, 260)).toBeLessThan(0.2); // sát chân: gần như đen như ảnh thật (0,15)
    expect(brightnessAt(layer, 5, 201)).toBeGreaterThan(0.9); // dưới hông nhấc 60px: gần như sáng nguyên
  });

  it('vài cột mép hơi nhấc lên không kéo bóng thành vệt dài dọc xuống (độ loang có giới hạn)', () => {
    // Thân 200x400, riêng 3 cột mép trái kết thúc cao hơn đáy 5% (như mép túi sau khi tách nền).
    const width = 200;
    const height = 400;
    const product = makeImage(width, height, (x, y) => (x < 3 ? y < 380 : true));
    const layer = buildShadowLayer(product, width, height, 1, 1.8);
    const reachOf = (x: number, from: number) => {
      let last = from;
      for (let y = from; y < layer.height; y += 1) if (brightnessAt(layer, x, y) < 0.97) last = y;
      return last - from;
    };
    // Dưới chân (cột giữa) và dưới mép nhấc lên: bóng mép không được dài quá 1,6 lần bóng chân. Đo từ mặt
    // sàn (y = 400): cột mép sát chân còn nhận bóng lan sang bên của chân — bóng đó nằm trên mặt sàn.
    expect(reachOf(1, 400)).toBeLessThanOrEqual(reachOf(100, 400) * 1.6 + 2);
  });

  it('bóng lan sang hai bên đáy: mặt sàn sát mép đáy tối lại, xa mép thì hết, dưới đáy giữ số đo ảnh thật', () => {
    // Thân 200x400 đứng giữa ảnh rộng 400 (cột 100..299 đặc).
    const product = makeImage(400, 400, (x) => x >= 100 && x < 300);
    const layer = buildShadowLayer(product, 400, 400, 1, 1.8);
    expect(brightnessAt(layer, 94, 404)).toBeLessThan(0.9);         // ngay ngoài mép trái, sát sàn
    expect(brightnessAt(layer, 305, 404)).toBeLessThan(0.9);        // ngay ngoài mép phải
    expect(brightnessAt(layer, 40, 404)).toBeGreaterThan(0.99);     // xa mép: không còn bóng
    expect(brightnessAt(layer, 94, 404)).toBeGreaterThan(brightnessAt(layer, 200, 404)); // vẫn nhạt hơn dưới đáy
  });

  it('dây/khoá thòng thấp hơn thân: lấy đáy THÂN làm chỗ chạm mặt phẳng — thân vẫn có bóng sát đáy đậm (soát 15/10)', () => {
    // Thân 200x300 (cột 100..299, hàng 0..299) + dây mảnh 4px thòng xuống tới hàng 399 ở cột 120..123.
    const product = makeImage(400, 400, (x, y) => (x >= 100 && x < 300 && y < 300) || (x >= 120 && x < 124));
    const byLowest = buildShadowLayer(product, 400, 400, 1, 1.8);
    const byBody = buildShadowLayer(product, 400, 400, 1, 1.8, 299);
    expect(brightnessAt(byLowest, 220, 301)).toBeGreaterThan(0.9);   // cách cũ: thân bị coi là nhấc lên, gần như không bóng
    expect(brightnessAt(byBody, 220, 301)).toBeLessThan(0.3);        // đáy thân sát mặt phẳng gần đen như ảnh thật
    expect(brightnessAt(byBody, 121, 401)).toBeLessThan(0.5);        // dây cũng có bóng sát mép dưới của nó
    expect(footprint(product, 400, 400, 299)).toEqual({ left: 100, right: 299, bottom: 299 });
  });

  it('không có điểm đặc nào hoặc độ đậm 0 → lớp bóng trống', () => {
    const empty = buildShadowLayer(new Uint8ClampedArray(10 * 10 * 4), 10, 10);
    expect(empty.height).toBe(10);
    expect(Math.max(...Array.from(empty.alpha))).toBe(0);
    const off = buildShadowLayer(makeImage(10, 10, () => true), 10, 10, 0);
    expect(Math.max(...Array.from(off.alpha))).toBe(0);
  });

  it('vật cao mảnh dùng 1,3 lần chiều rộng làm thước đo — bóng không dài như túi cùng chiều cao', () => {
    expect(shadowSizeReference(1000, 1267)).toBe(1267);
    expect(shadowSizeReference(300, 1267)).toBe(390);
  });
});

describe('applySelfOcclusion', () => {
  it('đáy tối lại (sát mép gần như đen), phần trên giữ nguyên', () => {
    const width = 4;
    const height = 1000;
    const data = makeImage(width, height, () => true);
    applySelfOcclusion(data, width, height, 1, 1.8);
    const valueAt = (y: number) => data[(y * width) * 4];
    expect(valueAt(0)).toBe(200);
    expect(valueAt(500)).toBe(200);
    expect(valueAt(999)).toBeLessThan(200 * 0.3);
    expect(valueAt(900)).toBeLessThan(200);
  });

  it('có đáy thân: tối theo đáy thân, phần dây thòng thấp hơn không bị tối thêm', () => {
    const width = 4;
    const height = 1000;
    const data = makeImage(width, height, () => true);
    applySelfOcclusion(data, width, height, 1, 1.8, 799);
    const valueAt = (y: number) => data[(y * width) * 4];
    expect(valueAt(799)).toBeLessThan(200 * 0.3);
    expect(valueAt(900)).toBe(200);
  });
});

describe('unpremultiplyEdges', () => {
  it('màu mép rembg đã nhân độ đặc → màu thật (đo trên ảnh thử); điểm đặc và trong suốt giữ nguyên', () => {
    const data = new Uint8ClampedArray([30, 28, 28, 40, 46, 42, 41, 83, 80, 49, 50, 255, 0, 0, 0, 0]);
    unpremultiplyEdges(data);
    expect(Array.from(data)).toEqual([191, 179, 179, 40, 141, 129, 126, 83, 80, 49, 50, 255, 0, 0, 0, 0]);
  });
});

describe('clearMatteResidue', () => {
  const alphaAt = (data: Uint8ClampedArray, width: number, x: number, y: number) => data[(y * width + x) * 4 + 3];

  it('lớp nền mờ trong lỗ quai (độ đặc 12, màu trắng đã nhân) bị xoá hẳn — không thành mảng sáng sau khi chia lại màu', () => {
    // Quai = khung đặc dày 8px; lòng khung phủ cặn độ đặc 12 như ảnh túi thật (6–20).
    const width = 60;
    const height = 60;
    const inFrame = (x: number, y: number) => x >= 4 && x < 56 && y >= 4 && y < 56;
    const inHole = (x: number, y: number) => x >= 12 && x < 48 && y >= 12 && y < 48;
    const data = makeImage(width, height, (x, y) => inFrame(x, y) && !inHole(x, y), [80, 49, 50]);
    for (let y = 12; y < 48; y += 1) for (let x = 12; x < 48; x += 1) data.set([12, 12, 12, 12], (y * width + x) * 4);

    clearMatteResidue(data, width, height, 2);
    unpremultiplyEdges(data);

    expect(Array.from(data.slice((30 * width + 30) * 4, (30 * width + 30) * 4 + 4))).toEqual([0, 0, 0, 0]);
    expect(alphaAt(data, width, 14, 30)).toBe(0); // cách mép quai 3px > reach
    expect(alphaAt(data, width, 13, 30)).toBe(12); // trong phạm vi reach: giữ, khỏi gặm mép
    expect(alphaAt(data, width, 8, 30)).toBe(255); // thân quai không đổi
  });

  it('dải khử răng cưa quanh mép sản phẩm giữ nguyên', () => {
    const width = 30;
    const height = 30;
    const data = makeImage(width, height, (x, y) => x >= 10 && x < 20 && y >= 10 && y < 20);
    for (let y = 9; y <= 20; y += 1) {
      for (let x = 9; x <= 20; x += 1) if (alphaAt(data, width, x, y) === 0) data.set([6, 6, 6, 30], (y * width + x) * 4);
    }
    const before = Array.from(data);
    clearMatteResidue(data, width, height, 2);
    expect(Array.from(data)).toEqual(before);
  });

  it('dây chuyền mảnh nằm xa thân (lõi độ đặc 90, rìa 20) giữ nguyên cả lõi lẫn rìa', () => {
    const width = 80;
    const height = 20;
    const data = makeImage(width, height, (x, y) => x < 8 && y < 8); // mặt dây ở góc
    for (let x = 20; x < 76; x += 1) {
      data.set([35, 32, 30, 90], (10 * width + x) * 4);
      data.set([8, 7, 7, 20], (9 * width + x) * 4);
      data.set([8, 7, 7, 20], (11 * width + x) * 4);
    }
    clearMatteResidue(data, width, height, 2);
    expect(alphaAt(data, width, 50, 10)).toBe(90);
    expect(alphaAt(data, width, 50, 9)).toBe(20);
    expect(alphaAt(data, width, 50, 11)).toBe(20);
  });

  it('phần bán trong suốt từ độ đặc 48 trở lên nằm xa thân vẫn giữ (không đục lỗ vật trong)', () => {
    const width = 40;
    const height = 40;
    const data = makeImage(width, height, (x, y) => x < 5 && y < 5);
    for (let y = 20; y < 30; y += 1) for (let x = 20; x < 30; x += 1) data.set([40, 40, 40, RESIDUE_MAX_ALPHA], (y * width + x) * 4);
    clearMatteResidue(data, width, height, 2);
    expect(alphaAt(data, width, 25, 25)).toBe(RESIDUE_MAX_ALPHA);
  });

  it('khoảng giữ lại theo cỡ ảnh: ảnh SP 426px → 2px, ảnh 2000px → 6px', () => {
    expect(residueReach(426, 407)).toBe(2);
    expect(residueReach(2000, 1500)).toBe(6);
  });
});

describe('buildShadowLayer — dải mép đáy bán trong suốt', () => {
  it('bóng phủ cả các hàng mép bán trong suốt, không để mặt phẳng sáng lộ qua thành đường sáng', () => {
    const width = 200;
    const height = 400;
    const product = makeImage(width, height, () => true);
    // 3 hàng cuối bán trong suốt như mép sau khi tách nền, hàng đặc cuối là 397 (độ đặc 137)
    for (let x = 0; x < width; x += 1) {
      product[(397 * width + x) * 4 + 3] = 137;
      product[(398 * width + x) * 4 + 3] = 83;
      product[(399 * width + x) * 4 + 3] = 40;
    }
    const layer = buildShadowLayer(product, width, height, 1, 1.8);
    expect(brightnessAt(layer, 100, 397)).toBeLessThan(0.2);
    expect(brightnessAt(layer, 100, 395)).toBeLessThan(0.2);
  });
});

describe('defringeEdges', () => {
  // Thân đỏ đậm 12 cột; 2 cột mép phải ám trắng (đúng như đo trên ảnh thử: đặc nhưng nhạt dần).
  function fringed() {
    const width = 16;
    const height = 12;
    const data = makeImage(width, height, (x) => x < 12, [80, 49, 50]);
    for (let y = 0; y < height; y += 1) {
      data.set([146, 134, 133, 255], (y * width + 10) * 4);
      data.set([191, 181, 179, 200], (y * width + 11) * 4);
    }
    return { width, height, data };
  }

  it('điểm mép ám trắng — kể cả điểm đặc — lấy lại màu thân, alpha giữ nguyên', () => {
    const { width, height, data } = fringed();
    defringeEdges(data, width, height);
    const px = (x: number) => Array.from(data.slice((5 * width + x) * 4, (5 * width + x) * 4 + 4));
    expect(px(10)).toEqual([80, 49, 50, 255]);
    expect(px(11)).toEqual([80, 49, 50, 200]);
    expect(px(3)).toEqual([80, 49, 50, 255]); // thân không đổi
    expect(data[(5 * width + 14) * 4 + 3]).toBe(0); // vùng trong suốt không đổi
  });

  it('mép tối hơn thân (chi tiết thật, không phải ám nền) giữ nguyên', () => {
    const width = 16;
    const height = 12;
    const data = makeImage(width, height, (x) => x < 12, [180, 170, 160]);
    for (let y = 0; y < height; y += 1) data.set([40, 30, 30, 255], (y * width + 11) * 4);
    defringeEdges(data, width, height);
    expect(Array.from(data.slice((5 * width + 11) * 4, (5 * width + 11) * 4 + 3))).toEqual([40, 30, 30]);
  });
});

describe('estimateWarmth', () => {
  it('nền ảnh ghép mẫu (đèn LED vàng) → ấm tối đa, đúng bản đã duyệt', () => {
    expect(estimateWarmth(107.8, 66.8, 44.6)).toBe(1);
  });

  it('nền trắng trung tính hoặc lạnh → 0, không nhuộm vàng sản phẩm', () => {
    expect(estimateWarmth(200, 200, 200)).toBe(0);
    expect(estimateWarmth(150, 170, 210)).toBe(0);
    expect(estimateWarmth(0, 0, 0)).toBe(0);
  });

  it('nền hơi ấm → mức ấm ở giữa', () => {
    const w = estimateWarmth(130, 115, 100);
    expect(w).toBeGreaterThan(0.2);
    expect(w).toBeLessThan(0.8);
  });
});

describe('applyLook', () => {
  it('giữ nguyên alpha, kéo về tông ấm (đỏ lên, xanh dương xuống), đáy tối hơn đỉnh', () => {
    const width = 20;
    const height = 40;
    const data = makeImage(width, height, (x) => x >= 2 && x < 18, [150, 150, 150]);
    const alphaBefore = Array.from(data.filter((_, i) => i % 4 === 3));
    applyLook(data, width, height, 1, 7);
    expect(Array.from(data.filter((_, i) => i % 4 === 3))).toEqual(alphaBefore);
    const at = (x: number, y: number, c: number) => data[(y * width + x) * 4 + c];
    expect(at(10, 5, 0)).toBeGreaterThan(at(10, 5, 2));
    const lum = (y: number) => at(10, y, 0) + at(10, y, 1) + at(10, y, 2);
    expect(lum(35)).toBeLessThan(lum(5));
  });

  it('cùng seed → cùng kết quả (xem trước và ảnh xuất giống hệt nhau)', () => {
    const a = makeImage(12, 12, () => true, [120, 90, 80]);
    const b = makeImage(12, 12, () => true, [120, 90, 80]);
    applyLook(a, 12, 12, 0.5, 42);
    applyLook(b, 12, 12, 0.5, 42);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('ảnh trong suốt hoàn toàn → không đổi gì', () => {
    const data = new Uint8ClampedArray(8 * 8 * 4);
    applyLook(data, 8, 8, 1);
    expect(Math.max(...Array.from(data))).toBe(0);
  });
});

describe('ánh sáng khớp ảnh chụp thật (đo 100 ảnh phòng media, 10/10)', () => {
  it('lightness: trắng 100, đen 0, xám giữa ~53,6', () => {
    expect(lightness(255, 255, 255)).toBeCloseTo(100, 1);
    expect(lightness(0, 0, 0)).toBeCloseTo(0, 5);
    expect(lightness(128, 128, 128)).toBeCloseTo(53.6, 0);
  });

  it('medianLightness bỏ điểm trong suốt và kẹp vùng trong ảnh', () => {
    const data = makeImage(10, 10, (x) => x < 5, [255, 255, 255]);
    expect(medianLightness(data, 10, 10, -5, -5, 20, 20, 1)).toBeCloseTo(100, 1);
    expect(medianLightness(data, 10, 10, 6, 0, 10, 10, 1)).toBeNull();
  });

  it('mặt đặt sáng hơn vùng quanh SP nhiều hơn ảnh thật → tối lại, có trần; mặt đặt vốn tối → không đổi', () => {
    expect(surfacePoolStrength(49, 31.5)).toBeCloseTo(SURFACE_POOL_MAX, 5);   // nền mẫu: mặt hộp sáng trưng
    const mild = surfacePoolStrength(36, 31.5);
    expect(mild).toBeGreaterThan(0);
    expect(mild).toBeLessThan(SURFACE_POOL_MAX);
    expect(surfacePoolStrength(21, 19.3)).toBe(0);                              // như ảnh thật (≤ quanh + 2,6)
    expect(surfacePoolStrength(null, 20)).toBe(0);
  });

  it('SP chụp đều sáng → chọn độ tối dần để trên sáng hơn dưới đúng mức ảnh thật', () => {
    const width = 20;
    const height = 60;
    const data = makeImage(width, height, () => true, [170, 120, 80]);
    const range = chooseFalloff(data, width, height, 0, height - 1, [1, 1, 1]);
    expect(range).toBeGreaterThanOrEqual(FALLOFF_MIN);
    expect(range).toBeLessThanOrEqual(FALLOFF_MAX);
    const l = (t: number) => lightness(170 * (1.04 - range * t), 120 * (1.04 - range * t), 80 * (1.04 - range * t));
    const topMean = (l(0) + l(1 / 3)) / 2;
    const bottomMean = (l(2 / 3) + l(1)) / 2;
    expect(Math.abs(topMean - bottomMean - REAL_TOP_LIGHT_DIFF)).toBeLessThan(2.5);
  });

  it('SP chụp đã sáng trên tối dưới rất mạnh → chỉ thêm mức thấp nhất', () => {
    const width = 20;
    const height = 60;
    const data = makeImage(width, height, () => true, [200, 200, 200]);
    for (let y = 30; y < height; y += 1) for (let x = 0; x < width; x += 1) data.set([60, 60, 60], (y * width + x) * 4);
    expect(chooseFalloff(data, width, height, 0, height - 1, [1, 1, 1])).toBe(FALLOFF_MIN);
  });

  it('footprint: phần đáy chạm mặt phẳng, bỏ cột nhấc lên', () => {
    const data = makeImage(100, 100, (x, y) => x >= 20 && x < 80 && (x < 70 || y < 60));
    expect(footprint(data, 100, 100)).toEqual({ left: 20, right: 69, bottom: 99 });
    expect(footprint(new Uint8ClampedArray(10 * 10 * 4), 10, 10)).toBeNull();
  });
});

describe('SP sáng lên mà không cháy', () => {
  it('SP sáng lên ở vùng tối/trung bình, gần trắng thì gần như giữ nguyên, không đổi alpha', () => {
    const data = new Uint8ClampedArray([60, 60, 60, 255, 128, 100, 70, 200, 250, 250, 250, 255, 30, 30, 30, 0]);
    brightenProduct(data, 1.15);
    expect(data[0]).toBeGreaterThan(60);
    expect(lightness(data[4], data[5], data[6])).toBeGreaterThan(lightness(128, 100, 70));
    expect(data[4]).toBeGreaterThan(data[5]);                  // giữ tông màu (đỏ > lục > lam)
    expect(data[5]).toBeGreaterThan(data[6]);
    expect(data[7]).toBe(200);
    expect(data[8]).toBeGreaterThanOrEqual(250);
    expect(data[8]).toBeLessThanOrEqual(252);                  // gần trắng: không cháy
    expect(Array.from(data.slice(12))).toEqual([30, 30, 30, 0]); // điểm trong suốt không đụng
  });
});

describe('đèn studio trên thân túi và độ sáng SP theo cảnh (đo lại 12/10 trên 457 ảnh thật Tháng 7–9)', () => {
  const bandMean = (data: Uint8ClampedArray, width: number, y0: number, y1: number) => {
    let sum = 0, n = 0;
    for (let y = y0; y < y1; y += 1) for (let x = 0; x < width; x += 1) { sum += lightness(data[(y * width + x) * 4], data[(y * width + x) * 4 + 1], data[(y * width + x) * 4 + 2]); n += 1; }
    return sum / n;
  };

  it('SP chụp sáng đều → mép trên thân sáng lên, giữa gần như giữ, dưới tối đi; không lệch trái/phải', () => {
    const width = 60;
    const height = 120;
    const data = makeImage(width, height, () => true, [150, 120, 100]);
    const factors = studioRowFactors(data, width, height, [0, 0, width, height], [1, 1, 1]);
    expect(factors).not.toBeNull();
    expect(factors![5]).toBeGreaterThan(1.03);            // dải trên cùng
    expect(Math.abs(factors![50] - 1)).toBeLessThan(0.03); // giữa thân
    expect(factors![100]).toBeLessThan(1);                // dải dưới
    applyLook(data, width, height, 0, 3, [0, 0, width, height]);
    // SP sáng đều thì mép trên được bù ≈ STUDIO_STRENGTH × (dải trên − dải giữa) của kiểu studio; đòi ít nhất
    // một nửa mức đó (các dải chuyển mượt nên dải đo không đạt trọn) — tính theo hằng số, đo lại không phải sửa.
    const expectedLift = STUDIO_STRENGTH * (STUDIO_BODY_PROFILE[0] - STUDIO_BODY_PROFILE[2]);
    expect(bandMean(data, width, 0, 20) - bandMean(data, width, 50, 70)).toBeGreaterThan(expectedLift / 2);
    // trái/phải cùng hàng như nhau (không đánh đèn lệch một bên)
    const at = (x: number, y: number) => data[(y * width + x) * 4];
    expect(Math.abs(at(5, 60) - at(54, 60))).toBeLessThanOrEqual(6);
  });

  it('SP đã có đèn trên rất mạnh → không sáng chồng thêm ở trên', () => {
    const width = 60;
    const height = 120;
    const data = makeImage(width, height, (x, y) => true, [150, 120, 100]);
    for (let y = 0; y < 20; y += 1) for (let x = 0; x < width; x += 1) data.set([250, 230, 215], (y * width + x) * 4);
    const factors = studioRowFactors(data, width, height, [0, 0, width, height], [1, 1, 1]);
    expect(factors![5]).toBeLessThanOrEqual(1);
  });

  it('khung thân quá nhỏ hoặc không có điểm thân → không áp kiểu studio', () => {
    expect(studioRowFactors(new Uint8ClampedArray(20 * 20 * 4), 20, 20, [0, 0, 20, 20], [1, 1, 1])).toBeNull();
    expect(studioRowFactors(makeImage(20, 20, () => true), 20, 20, [0, 0, 3, 3], [1, 1, 1])).toBeNull();
  });

  it('analyzeSceneLight: độ sáng cảnh = trung vị L* cả ảnh nền', () => {
    expect(analyzeSceneLight(makeImage(40, 40, () => true, [128, 128, 128]), 40, 40).lightness).toBeCloseTo(53.6, 0);
  });

  it('productExposureFor: cảnh như nền mẫu → mức chuẩn; cảnh sáng hơn → sáng hơn; luôn trong khoảng', () => {
    expect(productExposureFor(REFERENCE_SCENE_L)).toBeCloseTo(PRODUCT_EXPOSURE, 5);
    expect(productExposureFor(50)).toBeGreaterThan(PRODUCT_EXPOSURE);
    expect(productExposureFor(90)).toBe(PRODUCT_EXPOSURE_MAX);
    expect(productExposureFor(2)).toBe(PRODUCT_EXPOSURE_MIN);
  });
});



describe('ánh sáng nơi chụp SP so với nền (kiểm chứng 15/10 trên ảnh chụp thật)', () => {
  it('chỉ nhuộm ấm phần nền ấm hơn nơi chụp', () => {
    expect(addedWarmth(1, 0)).toBe(1);        // ảnh catalog phông trắng → nhuộm đủ
    expect(addedWarmth(1, 0.9)).toBeCloseTo(0.1);
    expect(addedWarmth(0.5, 1)).toBe(0);      // nơi chụp ấm hơn nền → không nhuộm
  });

  it('chụp dưới cùng kiểu đèn với nền thì giữ ánh sáng gốc', () => {
    expect(sameLightAsScene(1, 0.95)).toBe(true);
    expect(sameLightAsScene(1, 0.46)).toBe(true);   // ảnh shop ấm thấp nhất đo được
    expect(sameLightAsScene(1, 0)).toBe(false);     // ảnh catalog phông trắng
    expect(sameLightAsScene(0, 0)).toBe(false);     // nền trung tính: luôn chỉnh ánh sáng như cũ
  });
});
