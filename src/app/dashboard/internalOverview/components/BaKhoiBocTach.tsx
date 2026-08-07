'use client';

import type { ThiTruongNenTang, ThongKeNenTang, TuyenNoiDung } from '@/services/scraperService';
import {
  Cham,
  ChanBocTach,
  DongBocTach,
  DongTong,
  MAU_CHINH,
  MAU_PHU,
  MAU_TUONG_TAC,
  PhuDe,
  TheNenTang,
  The,
  ThanhChia,
  TieuDeThe,
  TrangRong,
  mauNenTang,
  phanTram,
  soDay,
  soGon,
  tenNenTang,
  tyLe,
} from './shared';

/**
 * Ba khối bóc tách của bản thiết kế gốc đều dựa vào số liệu insight nội bộ của nền tảng
 * (tỷ lệ người theo dõi / chưa theo dõi, loại nội dung, nguồn hiển thị). VCBI cào dữ liệu
 * công khai từ bên ngoài nên KHÔNG có mấy con số đó — dựng khung rỗng chờ API thì mãi mãi
 * rỗng. Ba khối dưới đây giữ nguyên bố cục nhưng thay bằng thứ tính được từ dữ liệu thật:
 *
 *   - Thị trường VN / Global  — đoán theo dấu tiếng Việt trong caption, cùng quy tắc với bộ
 *     lọc thị trường sẵn có ở trang danh sách video (content-filters.ts bên BE).
 *   - Tuyến nội dung A1–A5    — đội nội dung vốn đã gắn thẳng #A1…#A5 vào caption.
 *   - Cơ cấu tương tác        — thích / bình luận / chia sẻ, số cào về được thật.
 */

// ─── 1. Thị trường ───────────────────────────────────────────────────────────

export function KhoiThiTruong({ thiTruong }: { thiTruong: ThiTruongNenTang[] }) {
  const vn = thiTruong.reduce((s, t) => s + t.vn, 0);
  const global = thiTruong.reduce((s, t) => s + t.global, 0);
  const tong = vn + global;

  return (
    <The className="!mb-0 flex flex-col">
      <TieuDeThe chuThich="Đoán theo dấu tiếng Việt trong caption — caption tiếng Việt không dấu sẽ bị xếp sang Global">
        Thị trường nội dung
      </TieuDeThe>
      <PhuDe>Theo lượt xem trong kỳ</PhuDe>

      {tong === 0 ? (
        <TrangRong tieu_de="Chưa có video nào" mo_ta="Chưa có bài đăng nào trong kỳ đang chọn." />
      ) : (
        <>
          <div className="flex flex-col items-center pt-2.5">
            <Donut phanChinh={tyLe(vn, tong)} />
            <div className="flex gap-3.5 mt-5 flex-wrap w-full">
              <ODonut mau={MAU_CHINH} nhan="Việt Nam" giaTri={phanTram(tyLe(vn, tong))} />
              <ODonut mau={MAU_PHU} nhan="Global" giaTri={phanTram(tyLe(global, tong))} />
            </div>
          </div>

          <div className="w-full mt-5 border-t border-slate-100 dark:border-slate-800 pt-1">
            {thiTruong.map((t, i) => {
              const tongP = t.vn + t.global;
              return (
                <DongBocTach
                  key={t.platform}
                  vien={i < thiTruong.length - 1}
                  nhan={
                    <>
                      <Cham mau={mauNenTang(t.platform)} />
                      {tenNenTang(t.platform)}
                    </>
                  }
                  gia_tri={<span title={soDay(tongP)}>{soGon(tongP)}</span>}
                  doan={[
                    { gia_tri: t.vn, mau: MAU_CHINH, ten: `Việt Nam: ${soDay(t.vn)}` },
                    { gia_tri: t.global, mau: MAU_PHU, ten: `Global: ${soDay(t.global)}` },
                  ]}
                  chu_giai={[
                    { mau: MAU_CHINH, nhan: 'Việt Nam', gia_tri: `${soGon(t.vn)} · ${phanTram(tyLe(t.vn, tongP))}` },
                    { mau: MAU_PHU, nhan: 'Global', gia_tri: `${soGon(t.global)} · ${phanTram(tyLe(t.global, tongP))}` },
                  ]}
                  ty_le_cuoi={{
                    nhan: 'Số bài',
                    gia_tri: `${soDay(t.posts_vn)} VN · ${soDay(t.posts_global)} Global`,
                  }}
                />
              );
            })}
          </div>

          <ChanBocTach>
            <DongTong nhan="Tổng lượt xem trong kỳ" gia_tri={soGon(tong)} />
            <ThanhChia
              className="mt-3"
              doan={[
                { gia_tri: vn, mau: MAU_CHINH },
                { gia_tri: global, mau: MAU_PHU },
              ]}
            />
            <div className="flex items-center gap-2 mt-2.5 text-[11.5px] text-slate-400 dark:text-slate-500">
              Lượt xem đến từ nội dung tiếng Việt
              <b className="ml-auto text-foreground font-semibold tabular-nums text-[12.5px]">
                {phanTram(tyLe(vn, tong))}
              </b>
            </div>
          </ChanBocTach>
        </>
      )}
    </The>
  );
}

/** Vành khuyên hai đoạn, đầu bo tròn và chừa khe hở — dựng thẳng bằng SVG như bản thiết kế. */
function Donut({ phanChinh }: { phanChinh: number }) {
  const R = 68;
  const C = 2 * Math.PI * R;
  const khe = 7;
  const doanChinh = Math.max(0, (C * phanChinh) / 100 - khe);
  const doanPhu = Math.max(0, (C * (100 - phanChinh)) / 100 - khe);

  return (
    <svg width="164" height="164" viewBox="0 0 184 184">
      <g transform="translate(92,92) rotate(-90)">
        <circle r={R} fill="none" strokeWidth="17" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
        <circle
          r={R}
          fill="none"
          stroke={MAU_PHU}
          strokeWidth="17"
          strokeLinecap="round"
          strokeDasharray={`${doanPhu} ${C - doanPhu}`}
          strokeDashoffset={-((C * phanChinh) / 100) - khe / 2}
        />
        <circle
          r={R}
          fill="none"
          stroke={MAU_CHINH}
          strokeWidth="17"
          strokeLinecap="round"
          strokeDasharray={`${doanChinh} ${C - doanChinh}`}
          strokeDashoffset={-khe / 2}
        />
      </g>
      <text
        x="92"
        y="88"
        textAnchor="middle"
        fill="currentColor"
        className="text-foreground"
        style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-.04em' }}
      >
        {phanTram(phanChinh)}
      </text>
      <text x="92" y="108" textAnchor="middle" fill="currentColor" className="text-slate-400" style={{ fontSize: 11.5 }}>
        tiếng Việt
      </text>
    </svg>
  );
}

function ODonut({ mau, nhan, giaTri }: { mau: string; nhan: string; giaTri: string }) {
  return (
    <div className="flex-1 min-w-[104px] px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
      <b className="block text-lg font-semibold text-foreground mb-0.5 tabular-nums tracking-tight">{giaTri}</b>
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Cham mau={mau} />
        {nhan}
      </span>
    </div>
  );
}

// ─── 2. Tuyến nội dung ───────────────────────────────────────────────────────

export function KhoiTuyenNoiDung({ tuyen }: { tuyen: TuyenNoiDung[] }) {
  const tongViews = tuyen.reduce((s, t) => s + t.views, 0);
  const tongBai = tuyen.reduce((s, t) => s + t.posts, 0);
  const tongVN = tuyen.reduce((s, t) => s + t.views_vn, 0);

  return (
    <The className="!mb-0 flex flex-col">
      <TieuDeThe chuThich="Bắt theo hashtag #A1…#A5 sẵn có trong caption. Một video gắn nhiều tuyến sẽ được tính cho từng tuyến">
        Tuyến nội dung
      </TieuDeThe>
      <PhuDe>Tỷ trọng lượt xem theo tuyến A1–A5</PhuDe>

      <div className="flex gap-4 flex-wrap my-3.5 text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Cham mau={MAU_CHINH} />
          Việt Nam
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Cham mau={MAU_PHU} />
          Global
        </span>
      </div>

      {tuyen.length === 0 ? (
        <TrangRong
          tieu_de="Chưa gắn tuyến nội dung"
          mo_ta="Không có video nào trong kỳ mang hashtag #A1 đến #A5."
        />
      ) : (
        <>
          <div>
            {tuyen.map((t, i) => (
              <DongBocTach
                key={t.ma}
                vien={i < tuyen.length - 1}
                // Năm tuyến nằm cạnh nhau nên thanh phải so được với nhau: quy đổi theo tuyến
                // lớn nhất. Thiếu mốc này thì mọi thanh đều đầy khung và A3 (2,6% lượt xem)
                // trông ngang A4 (36,9%) — đã đo được đúng như vậy trên trang thật.
                moc={Math.max(...tuyen.map((x) => x.views))}
                nhan={<span className="font-semibold">{t.ma}</span>}
                gia_tri={phanTram(tyLe(t.views, tongViews))}
                doan={[
                  { gia_tri: t.views_vn, mau: MAU_CHINH, ten: `Việt Nam: ${soDay(t.views_vn)}` },
                  { gia_tri: t.views_global, mau: MAU_PHU, ten: `Global: ${soDay(t.views_global)}` },
                ]}
                chu_giai={[
                  { mau: MAU_CHINH, nhan: 'VN', gia_tri: soGon(t.views_vn) },
                  { mau: MAU_PHU, nhan: 'Global', gia_tri: soGon(t.views_global) },
                ]}
                ty_le_cuoi={{
                  nhan: `${soDay(t.posts)} bài · trung bình ${soGon(t.posts ? t.views / t.posts : 0)} lượt xem/bài`,
                  gia_tri: soGon(t.views),
                }}
              />
            ))}
          </div>

          <ChanBocTach>
            <DongTong nhan={`Tổng ${tuyen.length} tuyến · ${soDay(tongBai)} bài`} gia_tri={`${soGon(tongViews)} lượt xem`} />
            <ThanhChia
              className="mt-3"
              doan={tuyen.map((t, i) => ({
                gia_tri: t.views,
                mau: i % 2 === 0 ? MAU_CHINH : MAU_PHU,
                ten: `${t.ma}: ${soDay(t.views)}`,
              }))}
            />
            <div className="flex items-center gap-2 mt-2.5 text-[11.5px] text-slate-400 dark:text-slate-500">
              Lượt xem của tuyến đến từ nội dung tiếng Việt
              <b className="ml-auto text-foreground font-semibold tabular-nums text-[12.5px]">
                {phanTram(tyLe(tongVN, tongViews))}
              </b>
            </div>
          </ChanBocTach>
        </>
      )}
    </The>
  );
}

// ─── 3. Cơ cấu tương tác ─────────────────────────────────────────────────────

export function KhoiTuongTac({ nenTang }: { nenTang: ThongKeNenTang[] }) {
  const phan = [
    { khoa: 'likes' as const, nhan: 'Lượt thích', mau: MAU_TUONG_TAC[0] },
    { khoa: 'comments' as const, nhan: 'Bình luận', mau: MAU_TUONG_TAC[1] },
    { khoa: 'shares' as const, nhan: 'Chia sẻ', mau: MAU_TUONG_TAC[2] },
  ];

  const tongTheoPhan = phan.map((p) => nenTang.reduce((s, nt) => s + nt[p.khoa], 0));
  const tongTuongTac = tongTheoPhan.reduce((s, v) => s + v, 0);
  const tongViews = nenTang.reduce((s, nt) => s + nt.views, 0);

  return (
    <The className="!mb-0 flex flex-col">
      <TieuDeThe chuThich="Tỷ trọng thích / bình luận / chia sẻ trong tổng tương tác của các video đăng trong kỳ">
        Cơ cấu tương tác
      </TieuDeThe>
      <PhuDe>Trong kỳ đang chọn</PhuDe>

      <div className="flex gap-4 flex-wrap my-3.5 text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
        {phan.map((p) => (
          <span key={p.khoa} className="inline-flex items-center gap-1.5">
            <Cham mau={p.mau} />
            {p.nhan}
          </span>
        ))}
      </div>

      {tongTuongTac === 0 ? (
        <TrangRong tieu_de="Chưa có tương tác" mo_ta="Chưa cào được lượt thích, bình luận hay chia sẻ nào trong kỳ." />
      ) : (
        <>
          <div>
            {nenTang.map((nt, i) => {
              const tuongTac = nt.likes + nt.comments + nt.shares;
              return (
                <DongBocTach
                  key={nt.platform}
                  vien={i < nenTang.length - 1}
                  nhan={
                    <>
                      <Cham mau={mauNenTang(nt.platform)} />
                      {tenNenTang(nt.platform)}
                    </>
                  }
                  gia_tri={<span title={soDay(tuongTac)}>{soGon(tuongTac)} tương tác</span>}
                  doan={phan.map((p) => ({
                    gia_tri: nt[p.khoa],
                    mau: p.mau,
                    ten: `${p.nhan}: ${soDay(nt[p.khoa])}`,
                  }))}
                  chu_giai={phan.map((p) => ({
                    mau: p.mau,
                    nhan: p.nhan,
                    gia_tri: `${soGon(nt[p.khoa])} · ${phanTram(tyLe(nt[p.khoa], tuongTac))}`,
                  }))}
                  ty_le_cuoi={{
                    nhan: 'Tương tác trên lượt xem',
                    gia_tri: phanTram(tyLe(tuongTac, nt.views)),
                  }}
                />
              );
            })}
          </div>

          <ChanBocTach>
            <DongTong
              nhan={nenTang.length > 1 ? `Tổng ${nenTang.length} nền tảng` : tenNenTang(nenTang[0]?.platform ?? '')}
              gia_tri={`${soGon(tongTuongTac)} tương tác`}
            />
            <ThanhChia
              className="mt-3"
              doan={phan.map((p, i) => ({ gia_tri: tongTheoPhan[i], mau: p.mau, ten: p.nhan }))}
            />
            <div className="flex gap-3.5 flex-wrap mt-2.5 text-[11.5px] text-slate-400 dark:text-slate-500">
              {phan.map((p, i) => (
                <span key={p.khoa} className="inline-flex items-center gap-1.5">
                  <Cham mau={p.mau} size={7} />
                  {p.nhan}
                  <em className="not-italic text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                    {soGon(tongTheoPhan[i])}
                  </em>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-dashed border-slate-100 dark:border-slate-800 text-[11.5px] text-slate-400 dark:text-slate-500">
              Tương tác trên lượt xem
              <b className="ml-auto text-foreground font-semibold tabular-nums text-[12.5px]">
                {phanTram(tyLe(tongTuongTac, tongViews))}
              </b>
            </div>
          </ChanBocTach>
        </>
      )}
    </The>
  );
}

/** Dùng lại ở khối hashtag để giữ đúng một kiểu thanh ngang. */
export function ThanhNgang({
  nhan,
  phanTramGiaTri,
  phanTramLon,
  mau,
  ben_phai,
  phu,
}: {
  nhan: string;
  phanTramGiaTri: number;
  phanTramLon: number;
  mau: string;
  ben_phai: string;
  phu?: string;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="text-[13px] mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
        {nhan}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden min-w-[2px]">
          <i
            className="block h-full rounded-full transition-[width] duration-500"
            style={{ width: `${tyLe(phanTramGiaTri, phanTramLon)}%`, background: mau }}
          />
        </div>
        <div className="w-[124px] text-right text-[13px] font-semibold tabular-nums shrink-0 text-foreground">
          {ben_phai}
          {phu && <small className="text-slate-400 dark:text-slate-500 text-[11.5px] ml-1.5 font-normal">{phu}</small>}
        </div>
      </div>
    </div>
  );
}
