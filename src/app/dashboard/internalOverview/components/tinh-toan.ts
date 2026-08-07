import type { SoLieuKy, SoLieuNgay, ThongKeNenTang } from '@/services/scraperService';

/** Năm chỉ số hiện trên hàng thẻ đầu trang, đúng thứ tự của bản thiết kế. */
export const CHI_SO = [
  { ma: 'views', nhan: 'Lượt xem' },
  { ma: 'likes', nhan: 'Lượt thích' },
  { ma: 'comments', nhan: 'Bình luận' },
  { ma: 'shares', nhan: 'Chia sẻ' },
  { ma: 'posts', nhan: 'Bài đã đăng' },
] as const;

export type MaChiSo = (typeof CHI_SO)[number]['ma'];

export interface TongHop extends SoLieuKy {
  truoc: SoLieuKy;
  followers: number;
  so_kenh: number;
  tong_kenh: number;
  theo_ngay: SoLieuNgay[];
}

const RONG: SoLieuKy = { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 };

/**
 * Cộng nhiều nền tảng thành một bộ số cho chế độ "Tất cả nền tảng".
 *
 * Chuỗi theo ngày cộng theo NGÀY chứ không theo vị trí trong mảng: BE đã bơm đủ mọi ngày
 * cho từng nền tảng nên hai mảng vốn dài bằng nhau, nhưng cộng theo ngày thì kể cả sau này
 * BE đổi cách trả về, biểu đồ vẫn không bị lệch cột.
 */
export function gopNenTang(list: ThongKeNenTang[]): TongHop {
  const theoNgay = new Map<string, SoLieuNgay>();
  for (const nt of list) {
    for (const d of nt.theo_ngay) {
      const cur = theoNgay.get(d.ngay) ?? { ngay: d.ngay, ...RONG };
      cur.views += d.views;
      cur.likes += d.likes;
      cur.comments += d.comments;
      cur.shares += d.shares;
      cur.posts += d.posts;
      theoNgay.set(d.ngay, cur);
    }
  }

  const cong = (lay: (nt: ThongKeNenTang) => SoLieuKy): SoLieuKy =>
    list.reduce(
      (s, nt) => {
        const v = lay(nt);
        return {
          views: s.views + v.views,
          likes: s.likes + v.likes,
          comments: s.comments + v.comments,
          shares: s.shares + v.shares,
          posts: s.posts + v.posts,
        };
      },
      { ...RONG },
    );

  return {
    ...cong((nt) => nt),
    truoc: cong((nt) => nt.truoc),
    followers: list.reduce((s, nt) => s + nt.followers, 0),
    so_kenh: list.reduce((s, nt) => s + nt.so_kenh, 0),
    tong_kenh: list.reduce((s, nt) => s + nt.tong_kenh, 0),
    theo_ngay: [...theoNgay.values()].sort((a, b) => a.ngay.localeCompare(b.ngay)),
  };
}
