'use client';

import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Warning } from '@phosphor-icons/react';

import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';
import DateRangeFilter from '../internalChannels/components/DateRangeFilter';

import BangXepHangKenh from './components/BangXepHangKenh';
import BieuDoXuHuong from './components/BieuDoXuHuong';
import KhoiCanhBao from './components/KhoiCanhBao';
import KhoiHashtag from './components/KhoiHashtag';
import KhoiTrungLap from './components/KhoiTrungLap';
import NoiDungHangDau from './components/NoiDungHangDau';
import TheChiSo from './components/TheChiSo';
import { KhoiThiTruong, KhoiTuongTac, KhoiTuyenNoiDung } from './components/BaKhoiBocTach';
import { MaChiSo, gopNenTang } from './components/tinh-toan';
import {
  Cham,
  ChuThich,
  Khung,
  NhomTab,
  TrangRong,
  mauNenTang,
  tenNenTang,
} from './components/shared';

/** 'YYYY-MM-DD' theo giờ máy người dùng — không dùng toISOString(), nó quy về UTC và lùi ngày. */
function ngayISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mặc định: 28 ngày gần nhất, tính cả hôm nay. */
function khoangMacDinh(): { tu: string; den: string } {
  const den = new Date();
  const tu = new Date(den);
  tu.setDate(tu.getDate() - 27);
  return { tu: ngayISO(tu), den: ngayISO(den) };
}

/**
 * Tổng quan kênh nội bộ — dựng theo bản thiết kế dashboard-v13.html, số liệu lấy thật từ
 * /scraper/owned/stats.
 *
 * ── Một chỗ dễ đọc nhầm, cố ý ghi rõ ra ở giao diện ─────────────────────────────
 * Mọi con số ở đây là TỔNG của những video ĐĂNG TRONG KỲ, không phải lượt xem phát sinh
 * trong kỳ — dữ liệu cào về chỉ là ảnh chụp tổng luỹ kế của mỗi video tại lần cào gần nhất,
 * không có chuỗi lượt xem theo ngày. Vì thế video đăng ở kỳ trước đã có nhiều thời gian tích
 * luỹ lượt xem hơn, và phép so "kỳ này với kỳ trước" luôn hơi thiệt cho kỳ này. Không có
 * cách nào sửa ở tầng hiển thị; chỉ nói rõ để người đọc không kết luận sai.
 */
export default function TongQuanNoiBoPage() {
  const { token } = useAuthStore();

  // `khoang` là thứ bộ chọn ngày đang hiển thị, `khoangAp` là khoảng thật sự đem đi hỏi server.
  //
  // Phải tách đôi: bấm ngày ĐẦU trong lịch, DateRangeFilter gọi onChange(ngay, '') để đánh dấu
  // mới chọn được một đầu. Nếu đem thẳng khoảng dở dang đó đi truy vấn thì trang nháy một lần
  // với khoảng sai, và tệ hơn là lịch bị gỡ khỏi DOM nên không bấm được ngày thứ hai nữa.
  const [khoang, setKhoang] = useState(khoangMacDinh);
  const [khoangAp, setKhoangAp] = useState(khoang);
  useEffect(() => {
    if (khoang.tu && khoang.den) setKhoangAp(khoang);
  }, [khoang]);

  const [nenTangChon, setNenTangChon] = useState('');
  const [chiSo, setChiSo] = useState<MaChiSo>('views');
  const [tach, setTach] = useState(true);

  const query = useQuery({
    queryKey: ['owned-stats', nenTangChon, khoangAp.tu, khoangAp.den],
    queryFn: () =>
      scraperService.getOwnedStats(token!, {
        platform: nenTangChon || undefined,
        tu: khoangAp.tu,
        den: khoangAp.den,
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    // Giữ số liệu của kỳ trước trong lúc tải kỳ mới. Không có nó thì mỗi lần đổi ngày hay đổi
    // nền tảng, query.isLoading bật lên và cả trang bị thay bằng khung chờ — kể cả bộ chọn ngày
    // mà người dùng đang thao tác dở.
    placeholderData: keepPreviousData,
  });

  // Query RIÊNG cho khối trùng lặp, cùng bộ tham số kỳ ngày nên hai khối luôn nói về cùng
  // một khoảng thời gian. Tách ra để trang không phải chờ ba truy vấn gộp nhóm mới vẽ được
  // ô số đầu tiên — và để khối này hỏng thì phần còn lại vẫn dùng bình thường.
  const queryTrung = useQuery({
    queryKey: ['owned-dup', nenTangChon, khoangAp.tu, khoangAp.den],
    queryFn: () =>
      scraperService.getOwnedDuplicates(token!, {
        platform: nenTangChon || undefined,
        tu: khoangAp.tu,
        den: khoangAp.den,
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const duLieu = query.data;
  const nenTang = duLieu?.nen_tang ?? [];
  const tong = useMemo(() => gopNenTang(nenTang), [nenTang]);

  // Danh sách tab chỉ dựng từ lần tải "tất cả nền tảng": sau khi người dùng lọc riêng một nền
  // tảng thì phản hồi chỉ còn nền tảng đó, lấy thẳng ra thì các tab khác biến mất và không bấm
  // về được nữa.
  //
  // Phải là state chứ không phải ref: ghi vào ref trong useEffect KHÔNG kích hoạt vẽ lại, nên
  // ngay lần tải đầu hàng tab sẽ không hiện — chỉ lộ ra khi có từ 2 nền tảng nội bộ trở lên.
  const [cacNenTang, setCacNenTang] = useState<string[]>([]);
  useEffect(() => {
    if (nenTangChon || !duLieu) return;
    const ds = duLieu.nen_tang.map((nt) => nt.platform);
    setCacNenTang((cu) => (cu.join() === ds.join() ? cu : ds));
  }, [duLieu, nenTangChon]);

  if (query.isLoading) return <KhungCho />;

  if (query.isError) {
    return (
      <Vo>
        <div className="flex flex-col items-center gap-4 py-16 bg-card border border-border rounded-2xl">
          <Warning size={32} className="text-amber-500" />
          <p className="text-sm text-foreground">Không tải được số liệu tổng quan.</p>
          <button
            onClick={() => query.refetch()}
            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Thử lại
          </button>
        </div>
      </Vo>
    );
  }

  if (!duLieu || nenTang.length === 0) {
    return (
      <Vo>
        <DauTrang khoang={khoang} onDoiKhoang={setKhoang} soNgay={duLieu?.ky.so_ngay} />
        <TrangRong
          tieu_de="Chưa có kênh nội bộ nào"
          mo_ta="Thêm fanpage hoặc kênh vào mục Kênh nội bộ, hệ thống sẽ cào video và dựng số liệu ở đây từ lần đồng bộ kế tiếp."
        />
      </Vo>
    );
  }

  return (
    <Vo>
      <DauTrang khoang={khoang} onDoiKhoang={setKhoang} soNgay={duLieu.ky.so_ngay} />

      {cacNenTang.length > 1 && (
        <NhomTab
          className="mb-5"
          dang_chon={nenTangChon}
          onChon={setNenTangChon}
          cac_tab={[
            { ma: '', nhan: 'Tất cả nền tảng' },
            ...cacNenTang.map((p) => ({
              ma: p,
              nhan: (
                <>
                  <Cham mau={mauNenTang(p)} />
                  {tenNenTang(p)}
                </>
              ),
            })),
          ]}
        />
      )}

      <TheChiSo tong={tong} nenTang={nenTang} dangChon={chiSo} onChon={setChiSo} />

      <BieuDoXuHuong
        tong={tong}
        nenTang={nenTang}
        chiSo={chiSo}
        tach={tach}
        onDoiTach={setTach}
        soNgay={duLieu.ky.so_ngay}
      />

      <div className="grid gap-5 mb-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 items-stretch">
        <KhoiThiTruong thiTruong={duLieu.thi_truong} />
        <KhoiTuyenNoiDung tuyen={duLieu.tuyen_noi_dung} />
        <KhoiTuongTac nenTang={nenTang} />
      </div>

      <KhoiHashtag hashtag={duLieu.hashtag} />
      <BangXepHangKenh kenh={duLieu.kenh} />
      <KhoiTrungLap
        duLieu={queryTrung.data}
        dangTai={queryTrung.isLoading}
        loi={queryTrung.isError}
      />
      <NoiDungHangDau video={duLieu.top_video} />
      {/*
        Trộn hai nguồn cảnh báo: OwnedStatsService lo đồng bộ lỗi / tụt lượt xem / im lặng,
        OwnedDuplicateService lo kênh không có nội dung riêng. Cùng kiểu CanhBaoKenh nên nối
        thẳng được.

        Cảnh báo trùng đặt SAU và KHÔNG cắt bớt: đo trên dữ liệu thật, owned/stats đã trả
        đủ 12 mục (trần của nó) và toàn là lỗi đồng bộ, nên nếu cắt tổng danh sách lại thì
        phần trùng lặp biến mất sạch. Khối này vẽ hết những gì được truyền vào, 12 + 5 dòng
        vẫn đọc được, và khối Trùng lặp phía trên mới là chỗ trình bày chính.
      */}
      <KhoiCanhBao canhBao={[...duLieu.canh_bao, ...(queryTrung.data?.canh_bao ?? [])]} />
    </Vo>
  );
}

function Vo({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[1400px] mx-auto w-full">{children}</div>;
}

/**
 * Dùng lại đúng bộ chọn ngày của trang Kênh nội bộ (`DateRangeFilter`): lịch tự vẽ, có sẵn
 * preset 7 ngày / 30 ngày / tháng này / tháng trước / năm nay, và vẫn chọn được ngày bất kỳ.
 * Bản thiết kế gốc chỉ có ba mốc cứng — không đủ dùng, và tự dựng lịch thứ hai thì hai trang
 * lại lệch nhau về cách hiển thị lẫn cách hiểu "từ / đến".
 */
function DauTrang({
  khoang,
  onDoiKhoang,
  soNgay,
}: {
  khoang: { tu: string; den: string };
  onDoiKhoang: (k: { tu: string; den: string }) => void;
  /** Số ngày server thực sự dùng — có thể khác khoảng đã chọn khi bị chặn trần. */
  soNgay?: number;
}) {
  return (
    <div className="flex items-center gap-4 mb-5 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center">
          Tổng quan kênh nội bộ
          <ChuThich noiDung="Số liệu cào từ các kênh mạng xã hội do công ty sở hữu" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Tổng hợp lượt xem và tương tác của các video đăng trong kỳ
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {soNgay ? (
          <span className="text-[12.5px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            {soNgay} ngày
          </span>
        ) : null}
        <DateRangeFilter
          from={khoang.tu}
          to={khoang.den}
          onChange={(tu, den) => onDoiKhoang({ tu, den })}
          canhPhai
        />
      </div>
    </div>
  );
}

function KhungCho() {
  return (
    <Vo>
      <div className="flex items-center gap-4 mb-5">
        <div className="flex-1">
          <Khung className="h-6 w-56" />
          <Khung className="h-4 w-80 mt-2" />
        </div>
        <Khung className="h-9 w-64" />
      </div>
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(232px,1fr))' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-[18px]">
            <Khung className="h-3 w-20" />
            <Khung className="h-8 w-28 mt-3" />
            <Khung className="h-3 w-32 mt-3" />
            <Khung className="h-[34px] w-full mt-4" />
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <Khung className="h-8 w-40" />
        <Khung className="h-[272px] w-full mt-4" />
      </div>
      <div className="grid gap-5 mb-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5">
            <Khung className="h-4 w-36" />
            <Khung className="h-[164px] w-full mt-4" />
            <Khung className="h-3 w-full mt-4" />
            <Khung className="h-3 w-2/3 mt-2" />
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <Khung className="h-4 w-40" />
        <div className="grid gap-3 mt-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Khung key={i} className="h-[74px] w-full" />
          ))}
        </div>
      </div>
    </Vo>
  );
}
