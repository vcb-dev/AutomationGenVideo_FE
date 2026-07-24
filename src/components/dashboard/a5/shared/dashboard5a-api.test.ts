import {
  formatCompactNumber,
  formatRevenueVi,
  formatSyncDateVi,
  isSyncStale,
} from "./dashboard5a-api";

describe("formatCompactNumber", () => {
  it("trả về '0' cho giá trị <= 0 hoặc không hữu hạn — KHÔNG hiển thị số âm/NaN", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(-5)).toBe("0");
    expect(formatCompactNumber(NaN)).toBe("0");
  });

  it("rút gọn hàng nghìn dạng K", () => {
    expect(formatCompactNumber(420_000)).toBe("420K");
    expect(formatCompactNumber(999)).toBe("999");
  });

  it("rút gọn hàng triệu dạng M, giữ 2 chữ số thập phân khi < 10M", () => {
    expect(formatCompactNumber(1_850_000)).toBe("1.85M");
    expect(formatCompactNumber(12_400_000)).toBe("12M");
  });
});

describe("formatRevenueVi", () => {
  it("trả về '0 đ' cho giá trị <= 0 — KHÔNG bịa số", () => {
    expect(formatRevenueVi(0)).toBe("0 đ");
    expect(formatRevenueVi(-1)).toBe("0 đ");
  });

  it("format Tỷ/Triệu/đ theo đúng ngưỡng", () => {
    expect(formatRevenueVi(2_800_000_000)).toBe("2.8 Tỷ");
    expect(formatRevenueVi(150_000_000)).toBe("150.0 Triệu");
    // vi-VN dùng dấu chấm làm phân cách hàng nghìn (khác en-US dùng dấu phẩy)
    expect(formatRevenueVi(500_000)).toBe("500.000 đ");
  });
});

describe("formatSyncDateVi", () => {
  it("trả về null khi không có mốc sync (KHÔNG hiển thị ngày bịa)", () => {
    expect(formatSyncDateVi(null)).toBeNull();
    expect(formatSyncDateVi(undefined)).toBeNull();
    expect(formatSyncDateVi("not-a-date")).toBeNull();
  });

  it("format đúng dd/mm/yyyy từ ISO string", () => {
    expect(formatSyncDateVi("2026-07-05T05:00:00.000Z")).toBe("05/07/2026");
  });
});

describe("isSyncStale", () => {
  it("coi là stale khi chưa có mốc sync nào", () => {
    expect(isSyncStale(null)).toBe(true);
    expect(isSyncStale(undefined)).toBe(true);
  });

  it("KHÔNG stale khi mốc sync trong ngưỡng (mặc định 3 ngày)", () => {
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSyncStale(recent)).toBe(false);
  });

  it("stale khi mốc sync quá ngưỡng — đúng tình huống job sync Lark đã dừng nhiều ngày", () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSyncStale(old)).toBe(true);
  });

  it("tôn trọng threshold tuỳ chỉnh", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSyncStale(fiveDaysAgo, 3)).toBe(true);
    expect(isSyncStale(fiveDaysAgo, 7)).toBe(false);
  });
});
