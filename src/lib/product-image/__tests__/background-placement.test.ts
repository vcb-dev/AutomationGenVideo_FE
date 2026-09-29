/**
 * Chức năng: Tạo ảnh sản phẩm — "Ghép background". Đặt SP đã tách nền lên ảnh phòng: xem trước
 * (CSS %) và ảnh xuất (canvas px) cùng dùng computeDrawRect nên phải khớp nhau tuyệt đối.
 */
import {
  DEFAULT_PLACEMENT,
  PLACEMENT_SCALE_MAX,
  PLACEMENT_SCALE_MIN,
  clampPlacement,
  computeDrawRect,
  exportFileName,
  moveByDrag,
  toPercentRect,
} from '../background-placement';

const ROOM = { width: 4000, height: 3000 };

describe('computeDrawRect', () => {
  it('SP dọc bị giới hạn theo chiều cao: scale 0.5 → cao đúng nửa ảnh phòng, giữ tỉ lệ, nằm giữa', () => {
    const rect = computeDrawRect(ROOM, { width: 200, height: 400 }, { scale: 0.5, centerX: 0.5, centerY: 0.5 });
    expect(rect).toEqual({ x: 1625, y: 750, width: 750, height: 1500 });
  });

  it('SP ngang bị giới hạn theo chiều rộng', () => {
    const rect = computeDrawRect(ROOM, { width: 800, height: 100 }, { scale: 0.5, centerX: 0.5, centerY: 0.5 });
    expect(rect.width).toBe(2000);
    expect(rect.height).toBe(250);
  });

  it('tâm đặt đúng vị trí theo tỉ lệ ảnh phòng', () => {
    const rect = computeDrawRect(ROOM, { width: 100, height: 100 }, { scale: 0.1, centerX: 0.25, centerY: 0.75 });
    expect(rect.x + rect.width / 2).toBe(1000);
    expect(rect.y + rect.height / 2).toBe(2250);
  });

  it('giá trị ngoài khoảng bị kẹp lại trước khi tính', () => {
    const rect = computeDrawRect(ROOM, { width: 100, height: 100 }, { scale: 5, centerX: -1, centerY: 2 });
    expect(rect.height).toBe(ROOM.height * PLACEMENT_SCALE_MAX);
    expect(rect.x + rect.width / 2).toBe(0);
    expect(rect.y + rect.height / 2).toBe(ROOM.height);
  });
});

describe('toPercentRect', () => {
  it('xem trước theo % trùng với ảnh xuất theo pixel', () => {
    const px = computeDrawRect(ROOM, { width: 300, height: 500 }, DEFAULT_PLACEMENT);
    const pct = toPercentRect(px, ROOM);
    expect(pct.x).toBeCloseTo((px.x / ROOM.width) * 100);
    expect(pct.height).toBeCloseTo((px.height / ROOM.height) * 100);
  });
});

describe('clampPlacement', () => {
  it('kẹp scale vào [MIN, MAX] và tâm vào [0, 1]', () => {
    expect(clampPlacement({ scale: 0, centerX: 1.5, centerY: -0.2 })).toEqual({
      scale: PLACEMENT_SCALE_MIN,
      centerX: 1,
      centerY: 0,
    });
  });
});

describe('moveByDrag', () => {
  it('kéo 100px trên khung hiển thị 800x600 → dời tâm 1/8 và 1/6', () => {
    const moved = moveByDrag({ scale: 0.4, centerX: 0.5, centerY: 0.5 }, 100, -100, { width: 800, height: 600 });
    expect(moved.centerX).toBeCloseTo(0.625);
    expect(moved.centerY).toBeCloseTo(0.5 - 1 / 6);
    expect(moved.scale).toBe(0.4);
  });

  it('không cho kéo tâm ra khỏi ảnh', () => {
    const moved = moveByDrag(DEFAULT_PLACEMENT, 10_000, 10_000, { width: 800, height: 600 });
    expect(moved).toEqual({ ...DEFAULT_PLACEMENT, centerX: 1, centerY: 1 });
  });

  it('khung chưa có kích thước (chưa vẽ xong) thì giữ nguyên', () => {
    expect(moveByDrag(DEFAULT_PLACEMENT, 50, 50, { width: 0, height: 0 })).toBe(DEFAULT_PLACEMENT);
  });
});

describe('exportFileName', () => {
  it('ghép tiền tố + giờ máy + đuôi', () => {
    expect(exportFileName('anh-sp-ghep-phong', 'jpg', new Date(2026, 8, 29, 14, 3, 5))).toBe(
      'anh-sp-ghep-phong-20260929-140305.jpg',
    );
  });
});
