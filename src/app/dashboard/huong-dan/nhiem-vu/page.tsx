'use client';

import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Info,
  Lightbulb,
  ListChecks,
} from 'lucide-react';

const TOC: { id: string; label: string }[] = [
  { id: 'gioi-thieu', label: 'Giới thiệu' },
  { id: 'cac-khu-vuc', label: 'Các khu vực chính' },
  { id: 'trang-thai', label: 'Trạng thái nhiệm vụ' },
  { id: 'xem-danh-sach', label: 'Xem danh sách nhiệm vụ' },
  { id: 'tao-task', label: 'Tạo nhiệm vụ mới' },
  { id: 'quy-trinh', label: 'Quy trình xử lý 1 nhiệm vụ' },
  { id: 'bo-loc', label: 'Bộ lọc & tìm kiếm' },
  { id: 'chi-tiet-task', label: 'Xem chi tiết nhiệm vụ' },
  { id: 'tab-khac', label: 'Các tab khác' },
  { id: 'tong-quan', label: 'Trang Tổng quan' },
  { id: 'doi-nhom', label: 'Đội nhóm' },
  { id: 'danh-muc-kho', label: 'Danh mục & Kho cá nhân' },
  { id: 'kpi', label: 'KPI' },
  { id: 'cai-dat', label: 'Cài đặt (Admin/Manager)' },
  { id: 'faq', label: 'Câu hỏi thường gặp' },
];

const STATUS_ROWS: { label: string; color: string; desc: string }[] = [
  { label: 'Chờ xử lý', color: 'slate', desc: 'Nhiệm vụ vừa được tạo, chưa giao cho ai làm.' },
  { label: 'Đã giao', color: 'blue', desc: 'Đã có người phụ trách nhưng chưa bắt đầu làm.' },
  { label: 'Đang làm', color: 'amber', desc: 'Người phụ trách đã bấm "Bắt đầu làm".' },
  { label: 'Đã nộp', color: 'violet', desc: 'Đã nộp video/kết quả, đang chờ Leader/Quản lý duyệt.' },
  { label: 'Đã duyệt', color: 'green', desc: 'Đã được duyệt — nhiệm vụ coi như hoàn thành.' },
  { label: 'Từ chối', color: 'red', desc: 'Bị từ chối kèm lý do, người làm cần sửa và nộp lại.' },
  { label: 'Đã hủy', color: 'slate', desc: 'Nhiệm vụ đã bị huỷ, không cần xử lý nữa.' },
];

const STATUS_COLOR_CLASS: Record<string, string> = {
  slate: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  violet: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  red: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_COLOR_CLASS[color]}`}>
      {label}
    </span>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[13px] font-semibold bg-muted text-foreground border border-border">
      {children}
    </span>
  );
}

function InfoBox({ variant, title, children }: { variant: 'tip' | 'warning' | 'note'; title: string; children: ReactNode }) {
  const style = {
    tip: { icon: Lightbulb, cls: 'bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400' },
    warning: { icon: AlertTriangle, cls: 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400' },
    note: { icon: Info, cls: 'bg-muted border-border text-muted-foreground' },
  }[variant];
  const Icon = style.icon;
  return (
    <div className={`rounded-xl border p-4 flex gap-3 ${style.cls}`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="text-sm leading-relaxed">
        <p className="font-semibold mb-1">{title}</p>
        <div className="text-foreground/90 dark:text-foreground/80">{children}</div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <h2 className="text-xl font-bold border-b border-border pb-2">{title}</h2>
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div className="text-sm leading-relaxed">
        <p className="font-semibold text-foreground mb-0.5">{title}</p>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function NhiemVuGuidePage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-64px)] bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 flex gap-10">
        {/* TOC */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-6 space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 px-2">Mục lục</p>
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 max-w-3xl space-y-12 pb-24">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <BookOpen size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Hướng dẫn sử dụng: Nhiệm vụ</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Hướng dẫn chi tiết cách tạo, giao, xử lý và duyệt nhiệm vụ trong module Nhiệm vụ (Task Auto).
              </p>
            </div>
          </div>

          <Section id="gioi-thieu" title="1. Giới thiệu">
            <p>
              Module <strong>Nhiệm vụ</strong> là nơi giao và theo dõi công việc sản xuất video/content trong đội nhóm.
              Mỗi nhiệm vụ (task) thường gắn với một <Tag>Content</Tag> (kịch bản) và có thể gắn thêm{' '}
              <Tag>Sản phẩm</Tag> cần lên hình cùng các <Tag>Source</Tag> (nguồn tư liệu) hỗ trợ.
            </p>
            <p>
              Có 2 loại nhiệm vụ:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Auto</strong> — hệ thống tự động tạo hàng ngày dựa trên KPI và kho tháng của từng người (chạy vào
                một giờ cố định, cấu hình ở mục <a href="#cai-dat" className="text-blue-500 hover:underline">Cài đặt</a>).
              </li>
              <li>
                <strong>Sáng tạo</strong> (còn gọi task thủ công) — do người dùng tự tạo bằng nút{' '}
                <Tag>Tạo task</Tag>, không giới hạn vai trò.
              </li>
            </ul>
            <p>Menu "Nhiệm vụ" nằm trong đội nhóm sản xuất, gồm 8 khu vực con — xem chi tiết ở mục tiếp theo.</p>
          </Section>

          <Section id="cac-khu-vuc" title="2. Các khu vực chính">
            <p>Vào <strong>Nhiệm vụ</strong> ở menu trên cùng, bạn sẽ thấy thanh điều hướng con với các mục:</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Khu vực</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Dùng để</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Ai thấy được</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ['Tổng quan', 'Trang chủ, xem số liệu tổng hợp theo vai trò', 'Tất cả'],
                    ['Nhiệm vụ', 'Danh sách, tạo, xử lý và duyệt nhiệm vụ', 'Tất cả'],
                    ['Đội nhóm', 'Quản lý thành viên, kho của team', 'Tất cả'],
                    ['Danh mục', 'Kho sản phẩm/nguồn dùng chung toàn team/hệ thống', 'Tất cả'],
                    ['Content', 'Kho kịch bản (content) dùng chung', 'Tất cả'],
                    ['Kho cá nhân', 'Kho sản phẩm/content/nguồn của riêng bạn', 'Leader, Member, Editor, Content'],
                    ['KPI', 'Đặt và theo dõi chỉ tiêu công việc', 'Tất cả (chỉnh sửa tùy vai trò)'],
                    ['Cài đặt', 'Cấu hình hệ thống giao việc tự động', 'Admin, Manager'],
                  ].map((row) => (
                    <tr key={row[0]}>
                      <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{row[0]}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row[1]}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="trang-thai" title="3. Trạng thái nhiệm vụ">
            <p>Một nhiệm vụ luôn ở một trong 7 trạng thái sau, đi theo trình tự từ trên xuống:</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {STATUS_ROWS.map((s) => (
                    <tr key={s.label}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <StatusPill label={s.label} color={s.color} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <InfoBox variant="note" title="Đường thời gian (Status Timeline)">
              Khi mở chi tiết một nhiệm vụ, phần đầu trang luôn có thanh tiến trình 5 bước:{' '}
              <em>Tạo task → Đã giao → Đang làm → Đã nộp → Hoàn thành</em>. Nếu bị từ chối hoặc huỷ, thanh này sẽ rẽ
              sang nhánh <StatusPill label="Từ chối" color="red" /> hoặc <StatusPill label="Đã hủy" color="slate" /> tương ứng.
            </InfoBox>
            <InfoBox variant="tip" title="'Quá hạn' không phải là một trạng thái thật">
              Trên bảng Kanban có thêm cột <strong>Quá hạn</strong> — đây chỉ là một cách gom nhóm hiển thị: mọi nhiệm vụ
              đang ở trạng thái Đã giao / Đang làm / Đã nộp mà đã trễ deadline sẽ tự động xuất hiện ở đây, không phải một
              trạng thái riêng trong hệ thống.
            </InfoBox>
          </Section>

          <Section id="xem-danh-sach" title="4. Xem danh sách nhiệm vụ">
            <p>
              Vào tab <strong>Danh sách task</strong> (tab mặc định của trang Nhiệm vụ). Góc trên bên phải có nút chuyển
              chế độ xem:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <p className="font-semibold mb-1">🗂 Kanban (mặc định)</p>
                <p className="text-muted-foreground">
                  5 cột: <StatusPill label="Đã giao" color="blue" />{' '}
                  <StatusPill label="Đang làm" color="amber" />{' '}
                  <StatusPill label="Đã nộp" color="violet" />{' '}
                  <StatusPill label="Đã duyệt" color="green" />{' '}
                  <StatusPill label="Quá hạn" color="red" />. Bạn có thể{' '}
                  <strong>kéo-thả thẻ nhiệm vụ</strong> giữa các cột để đổi trạng thái nhanh:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                  <li>Kéo giữa "Đã giao" ⇄ "Đang làm" — đổi ngay, không cần nhập gì thêm.</li>
                  <li>Kéo vào "Đã duyệt" — duyệt nhiệm vụ luôn (giống bấm nút "Duyệt").</li>
                  <li>
                    Muốn <strong>nộp</strong> hoặc <strong>từ chối</strong> thì phải dùng nút/mở chi tiết — không kéo-thả
                    được vì cần nhập thêm dữ liệu (video, lý do).
                  </li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Mỗi thẻ có sẵn nút nhanh <Tag>Bắt đầu làm</Tag> / <Tag>Duyệt</Tag> / <Tag>Từ chối</Tag> ngay trên thẻ,
                  không cần mở chi tiết. Mỗi cột hiển thị 12 thẻ, bấm "Xem thêm" để tải thêm.
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="font-semibold mb-1">📋 Danh sách (bảng)</p>
                <p className="text-muted-foreground">
                  Bảng phẳng, phân trang, đủ cột: Task, Team, Người làm, Trạng thái, Deadline, Loại (Auto/Sáng tạo). Bấm
                  biểu tượng mắt để xem chi tiết. Chế độ này mới có <strong>bộ lọc theo trạng thái</strong> (Kanban không
                  cần vì đã tách sẵn theo cột).
                </p>
              </div>
            </div>
            <p>Bấm vào bất kỳ thẻ/dòng nào để mở <strong>Chi tiết nhiệm vụ</strong>.</p>
          </Section>

          <Section id="tao-task" title="5. Tạo nhiệm vụ mới">
            <p>
              Bấm nút <Tag>Tạo task</Tag> (góc trên trang Nhiệm vụ). Mọi vai trò đều tạo được task thủ công (loại{' '}
              <em>Sáng tạo</em>). Điền các mục sau:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Content *</strong> (bắt buộc) — chọn kịch bản có sẵn từ 3 nguồn: <Tag>Cá nhân</Tag> (kho riêng
                của bạn), <Tag>Kho tổng</Tag>, <Tag>Kho team</Tag>; hoặc bấm "Tạo content mới…" để viết ngay.
              </li>
              <li>
                <strong>Sản phẩm</strong> (tuỳ chọn) — tương tự content, chọn từ 3 nguồn hoặc tạo mới. Nếu sản phẩm có
                sẵn nguồn tư liệu đi kèm, hệ thống sẽ gợi ý "Source kèm".
              </li>
              <li>
                <strong>Đội nhóm *</strong> (bắt buộc) — tự khoá nếu bạn chỉ thuộc 1 team, chọn nếu thuộc nhiều team.
              </li>
              <li>
                <strong>Người được giao</strong> (tuỳ chọn) — chọn ai sẽ làm nhiệm vụ này (Member không thấy mục này vì
                chỉ tạo cho chính mình).
              </li>
              <li>
                <strong>Deadline</strong> — mặc định là 17:50 hôm nay, có thể đổi tuỳ ý.
              </li>
              <li>
                <strong>Nguồn source (tuỳ chọn)</strong> — bấm "Chọn nguồn" để mở rộng, gắn thêm tối đa 4 loại:{' '}
                <em>Outro, Sưu tầm, Chế tác, Huy-K</em>.
              </li>
            </ol>
            <p>Chỉ cần điền xong <strong>Content</strong> và <strong>Đội nhóm</strong> là nút <Tag>Tạo task</Tag> sẽ bật lên, các mục còn lại là tuỳ chọn.</p>
          </Section>

          <Section id="quy-trinh" title="6. Quy trình xử lý 1 nhiệm vụ">
            <p>Từ lúc nhiệm vụ được giao đến lúc hoàn thành, người được giao và người duyệt sẽ thao tác theo 4 bước:</p>
            <div className="space-y-4">
              <Step n={1} title='Bấm "Bắt đầu làm"'>
                Chuyển nhiệm vụ từ <StatusPill label="Đã giao" color="blue" /> sang{' '}
                <StatusPill label="Đang làm" color="amber" />, cho mọi người biết bạn đang xử lý.
              </Step>
              <Step n={2} title='Bấm "Nộp task" khi làm xong'>
                Mở form nộp: kéo/chọn file video (MP4, tối đa 2GB — video sẽ tự động tải lên Google Drive ngay khi nộp),
                hoặc bấm "Nhập link thủ công thay thế" để dán link có sẵn thay vì upload. Nộp xong, nhiệm vụ chuyển sang{' '}
                <StatusPill label="Đã nộp" color="violet" /> và chờ duyệt.
              </Step>
              <Step n={3} title="Leader/Quản lý xem và Duyệt hoặc Từ chối">
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    <strong>Duyệt</strong> → nhiệm vụ chuyển <StatusPill label="Đã duyệt" color="green" />, coi như xong.
                  </li>
                  <li>
                    <strong>Từ chối</strong> → phải nhập lý do, nhiệm vụ chuyển <StatusPill label="Từ chối" color="red" />
                    . Video đã nộp trước đó sẽ bị xoá khỏi Drive.
                  </li>
                </ul>
              </Step>
              <Step n={4} title='Nếu bị từ chối: xem lý do rồi "Nộp lại"'>
                Người được giao mở nhiệm vụ, đọc lý do từ chối, sửa và nộp video mới (bắt buộc upload lại vì video cũ đã
                bị xoá). Sau khi nộp lại, quy trình quay lại bước 3.
              </Step>
            </div>
            <InfoBox variant="tip" title="Sau khi được duyệt">
              Nếu video có link Google Drive hợp lệ, nút <Tag>Lên lịch đăng bài</Tag> sẽ xuất hiện để lên lịch đăng lên
              các nền tảng mạng xã hội ngay từ chi tiết nhiệm vụ.
            </InfoBox>
          </Section>

          <Section id="bo-loc" title="7. Bộ lọc & tìm kiếm">
            <p>Ở tab "Danh sách task" (và "Video chờ duyệt"), bạn có các bộ lọc sau:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Tìm kiếm</strong> — gõ theo tiêu đề nhiệm vụ.</li>
              <li><strong>Trạng thái</strong> — chỉ có ở chế độ "Danh sách" (bảng); Kanban đã tách sẵn theo cột nên không cần lọc thêm.</li>
              <li><strong>Team</strong> — ẩn với Member và Leader vì họ mặc định chỉ thấy team của mình.</li>
              <li><strong>Người làm</strong> — ẩn khi bạn đang xem chế độ "Của tôi".</li>
              <li>
                <strong>Khoảng ngày</strong> — có sẵn: <Tag>Hôm nay</Tag> <Tag>7 ngày qua</Tag> <Tag>30 ngày qua</Tag>{' '}
                <Tag>Tháng này</Tag>, hoặc tự chọn Từ ngày/Đến ngày, hoặc bấm <Tag>Tất cả ngày</Tag> để bỏ lọc.
              </li>
            </ul>
            <InfoBox variant="warning" title="Bộ lọc ngày lọc theo cái gì?">
              Trên tab "Danh sách task" / "Video chờ duyệt", bộ lọc ngày lọc theo <strong>hạn chót (deadline)</strong> của
              nhiệm vụ — nếu nhiệm vụ chưa đặt deadline, hệ thống sẽ lọc theo <strong>ngày tạo</strong> thay thế. Riêng ở
              tab "Video đã nộp", cùng bộ lọc này lại lọc theo <strong>ngày được duyệt</strong> (mặc định không giới hạn
              ngày). Tab "Content chờ duyệt" thì không có bộ lọc ngày.
            </InfoBox>
            <p>Khi có bộ lọc đang bật, nút <Tag>Xoá lọc</Tag> sẽ hiện kèm số lượng bộ lọc đang áp dụng.</p>
          </Section>

          <Section id="chi-tiet-task" title="8. Xem chi tiết nhiệm vụ">
            <p>Bấm vào một thẻ/dòng để mở bảng chi tiết, gồm các phần:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Nội dung</strong> — kịch bản, có thể chấm điểm, tạo giọng đọc AI, dịch, viết lại bằng AI. Có luồng duyệt riêng cho content (khác với duyệt video) — xem thêm ở mục 9.</li>
              <li><strong>Sources</strong> — các nguồn tư liệu đính kèm (Outro/Sưu tầm/Chế tác/Huy-K) và nguồn đi theo sản phẩm.</li>
              <li><strong>Sản phẩm</strong> — ảnh sản phẩm, giá, chất liệu, phân khúc (nếu có gắn sản phẩm).</li>
              <li><strong>Người thực hiện / Deadline / Đội nhóm</strong> — dải thông tin tóm tắt (deadline trễ hạn sẽ hiện màu đỏ cảnh báo).</li>
              <li><strong>Link bài đăng</strong> — chỉ hiện khi nhiệm vụ đã <StatusPill label="Đã duyệt" color="green" />, dùng để gắn link bài đã đăng lên Facebook/TikTok/Instagram/YouTube… và xem số liệu tương tác.</li>
            </ul>
            <p>Nếu là task loại <em>Sáng tạo</em> (task thủ công), sẽ có thêm nút <Tag>Sửa</Tag> để chỉnh sửa lại thông tin nhiệm vụ.</p>
          </Section>

          <Section id="tab-khac" title="9. Các tab khác trong trang Nhiệm vụ">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Video chờ duyệt</strong> — dạng lưới ảnh/video cho các nhiệm vụ đã nộp, có nút Duyệt/Từ chối ngay
                trên từng ô, không cần mở chi tiết.
              </li>
              <li>
                <strong>Video đã nộp</strong> — lịch sử các nhiệm vụ đã được duyệt, lọc theo ngày duyệt.
              </li>
              <li>
                <strong>Content chờ duyệt</strong> — đây là luồng duyệt <em>nội dung kịch bản</em> (khác với duyệt video
                ở trên). Khi người viết content bấm "Gửi yêu cầu duyệt content" trong chi tiết nhiệm vụ, yêu cầu sẽ xuất
                hiện ở đây để Leader/Quản lý Duyệt hoặc Từ chối kèm lý do — việc này <strong>không</strong> làm đổi trạng
                thái chính của nhiệm vụ.
              </li>
              <li>
                <strong>Chấm điểm content</strong> — công cụ độc lập, dán bất kỳ đoạn content nào vào và bấm "Chấm điểm"
                để AI (mô hình PAAST — 5 tiêu chí: Prefer · Action · Acknowledge · Stick · Trust) chấm điểm 0–100 và gợi
                ý "Nâng cấp content". Không cần gắn với nhiệm vụ nào.
              </li>
            </ul>
          </Section>

          <Section id="tong-quan" title="10. Trang Tổng quan">
            <p>
              Trang Tổng quan hiển thị khác nhau tuỳ vai trò đăng nhập — vì vậy nếu bạn và đồng nghiệp thấy giao diện
              khác nhau, đó là chuyện bình thường:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Admin/Manager</strong> — nhìn toàn hệ thống: tỷ lệ hoàn thành, phân bố trạng thái, số liệu editor chờ duyệt.</li>
              <li><strong>Leader (team sản xuất)</strong> — hiệu suất team, KPI team theo tháng, bảng KPI từng thành viên.</li>
              <li><strong>Member/Editor</strong> — bảng tin cá nhân: việc quá hạn, đến hạn hôm nay, tiến độ hôm nay, KPI cá nhân theo tháng.</li>
              <li><strong>Content Creator</strong> — số liệu sưu tầm content/bản dịch, video được sản xuất từ content của mình.</li>
              <li><strong>Leader Content Team</strong> — hiệu suất cả team content creator.</li>
            </ul>
            <p>Hầu hết các thẻ số liệu có bộ lọc ngày riêng: <Tag>Hôm nay</Tag> <Tag>7 ngày qua</Tag> <Tag>Tháng này</Tag> <Tag>Tháng trước</Tag> <Tag>Tùy chọn</Tag>.</p>
          </Section>

          <Section id="doi-nhom" title="11. Đội nhóm">
            <p>Trang Đội nhóm có các tab:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Nhóm của tôi</strong> — danh sách thành viên, vai trò (Leader/Editor/Content Creator).</li>
              <li><strong>Kho sản phẩm / Kho content / Kho source</strong> — kho dùng chung cho cả team.</li>
              <li><strong>Kho tháng</strong> — tập hợp sản phẩm/content/nguồn dành riêng cho một tháng, dùng để hệ thống tự động giao việc (Auto).</li>
              <li><strong>Chờ duyệt</strong> (Leader/Quản lý) — duyệt các yêu cầu đẩy sản phẩm/content từ kho cá nhân thành viên lên kho team.</li>
              <li><strong>Thống kê</strong> — số liệu đóng góp nguồn/content theo từng thành viên trong tháng.</li>
            </ul>
            <p>Admin/Manager có thể bấm <Tag>Tạo đội mới</Tag> để lập team mới, chọn Leader và thêm thành viên.</p>
          </Section>

          <Section id="danh-muc-kho" title="12. Danh mục & Kho cá nhân">
            <p>Hệ thống quản lý sản phẩm/content/nguồn theo mô hình 3 tầng, đẩy dần từ riêng tư ra chung:</p>
            <div className="rounded-xl border border-border p-4 bg-muted/40 text-center font-semibold text-sm">
              Kho cá nhân (riêng bạn) → đẩy sang → Kho team (Leader duyệt) → đẩy sang → Danh mục / Content (dùng chung toàn hệ thống)
            </div>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Kho cá nhân</strong> — chỉ mình bạn quản lý, có nút "Đẩy sang kho team" trên từng mục.</li>
              <li><strong>Danh mục</strong> / <strong>Content</strong> — kho chung, ai cũng chọn được khi tạo nhiệm vụ.</li>
              <li><strong>Kho tháng</strong> (xuất hiện ở cả Danh mục lẫn Kho cá nhân) — không phải kho tổng, mà là phần trích riêng cho một tháng cụ thể để hệ thống tự động giao việc dùng.</li>
            </ul>
            <InfoBox variant="note" title="Sản phẩm / Nguồn / Kho tháng là gì?">
              <strong>Sản phẩm</strong>: món hàng thật sẽ lên hình trong video. <strong>Nguồn (Source)</strong>: tư liệu hỗ
              trợ dựng video, gồm 5 loại — Source sản phẩm, Source sản phẩm sưu tầm, Source Outro, Source chế tác,
              Source Huy-K. <strong>Kho tháng</strong>: danh sách sản phẩm/content/nguồn đã "đăng ký" cho một tháng cụ
              thể — nếu kho tháng trống, hệ thống tự động giao việc sẽ không tạo được task cho tháng đó.
            </InfoBox>
          </Section>

          <Section id="kpi" title="13. KPI">
            <p>Trang KPI có 5 tab, chọn tháng ở góc trên:</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Tab</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Dùng để</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Ai chỉnh sửa được</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ['KPI Team', 'Đặt chỉ tiêu tháng cho cả team, phân bổ % theo tuyến nội dung/dòng sản phẩm', 'Admin, Manager'],
                    ['KPI Editor', 'Đặt chỉ tiêu tháng cho từng editor: tổng video, video win, content, sản phẩm', 'Admin, Manager, Leader (team mình)'],
                    ['KPI Ngày', 'Ghi đè chỉ tiêu của MỘT ngày cụ thể cho từng người', 'Admin, Manager, Leader (team mình)'],
                    ['KPI Content', 'Đặt chỉ tiêu tháng cho Content Creator (content sưu tầm, bản dịch)', 'Admin, Manager, Leader (team mình)'],
                    ['KPI Ngày Content', 'Giống KPI Ngày nhưng dành cho Content Creator', 'Admin, Manager, Leader (team mình)'],
                  ].map((r) => (
                    <tr key={r[0]}>
                      <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{r[0]}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r[1]}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <InfoBox variant="tip" title="KPI Ngày hoạt động thế nào?">
              KPI Ngày là <strong>số video mục tiêu của từng người cho đúng một ngày</strong> — số này sẽ thay thế chỉ
              tiêu tự tính từ KPI tháng khi hệ thống tự động giao việc chạy (thường chạy từ chiều hôm trước cho ngày hôm
              sau, giờ chạy chính xác xem ở mục Cài đặt). Để ô này là <strong>0</strong> nghĩa là "chưa set" — hệ thống sẽ
              tự tính theo KPI tháng như bình thường. Có nút "Áp cho tất cả" để điền nhanh cùng một số cho cả team.
            </InfoBox>
            <p>Mọi người đều xem được cả 5 tab (ở chế độ chỉ đọc nếu không có quyền chỉnh sửa) để biết chỉ tiêu của mình/team.</p>
          </Section>

          <Section id="cai-dat" title="14. Cài đặt (Admin/Manager)">
            <p>Chỉ Admin/Manager chỉnh được, người khác xem được nhưng không sửa được. Gồm:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Kích hoạt hệ thống</strong> — bật/tắt toàn bộ tính năng tự động giao việc.</li>
              <li><strong>Thời gian chạy</strong> — giờ hệ thống tự động tạo task Auto mỗi ngày (mặc định 08:00).</li>
              <li><strong>Múi giờ</strong> — mặc định giờ Việt Nam.</li>
              <li><strong>Cooldown mặc định</strong> — số ngày tối thiểu trước khi một sản phẩm được giao lại (mặc định 5 ngày).</li>
              <li><strong>Chạy vào cuối tuần</strong> — bật/tắt giao việc tự động vào thứ 7, Chủ nhật.</li>
            </ul>
            <p>
              Có nút <Tag>Chạy ngay</Tag> để kích hoạt thủ công một lượt giao việc ngay lập tức, và bảng{' '}
              <strong>Lịch sử phân công</strong> (50 lượt gần nhất) để xem mỗi lần chạy đã giao bao nhiêu task, bỏ qua bao
              nhiêu, mất bao lâu.
            </p>
          </Section>

          <Section id="faq" title="15. Câu hỏi thường gặp">
            <div className="space-y-4">
              <div>
                <p className="font-semibold flex items-center gap-1.5"><ListChecks size={15} className="text-blue-500" /> Vì sao tôi không thấy nhiệm vụ của mình trên Kanban?</p>
                <p className="text-muted-foreground pl-6">Kiểm tra lại bộ lọc ngày — mặc định chỉ hiện nhiệm vụ có hạn chót (hoặc ngày tạo, nếu chưa đặt hạn) trong "Hôm nay". Bấm "Tất cả ngày" để xem toàn bộ.</p>
              </div>
              <div>
                <p className="font-semibold flex items-center gap-1.5"><ListChecks size={15} className="text-blue-500" /> Nhiệm vụ bị từ chối rồi, sao tôi không nộp lại được?</p>
                <p className="text-muted-foreground pl-6">Video cũ đã tự động bị xoá khỏi Drive khi bị từ chối, bạn cần upload video mới (hoặc dán link mới) chứ không thể giữ nguyên video cũ.</p>
              </div>
              <div>
                <p className="font-semibold flex items-center gap-1.5"><ListChecks size={15} className="text-blue-500" /> Tôi để KPI Ngày = 0 thì có sao không?</p>
                <p className="text-muted-foreground pl-6">Không sao — 0 nghĩa là "chưa đặt riêng cho ngày đó", hệ thống sẽ tự tính chỉ tiêu theo KPI tháng như bình thường.</p>
              </div>
              <div>
                <p className="font-semibold flex items-center gap-1.5"><ListChecks size={15} className="text-blue-500" /> Duyệt content và Duyệt video khác nhau thế nào?</p>
                <p className="text-muted-foreground pl-6">Duyệt content (tab "Content chờ duyệt") chỉ duyệt phần kịch bản/nội dung chữ, không đổi trạng thái nhiệm vụ. Duyệt video (tab "Video chờ duyệt" hoặc trong chi tiết nhiệm vụ) mới là bước làm nhiệm vụ chuyển sang "Đã duyệt".</p>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
