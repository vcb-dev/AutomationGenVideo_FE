'use client';

import type { ReactNode } from 'react';
import {
  Camera,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb,
  Sparkles,
  QrCode,
  ShieldCheck,
  RotateCcw,
  Sliders,
  ArrowRight,
  MousePointerClick,
  Check,
  X,
  Package,
  Calendar,
  Clock,
  UserCheck,
  Image as ImageIcon,
  HelpCircle,
  BarChart3,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Settings,
} from 'lucide-react';

const TOC: { id: string; label: string }[] = [
  { id: 'tong-quan-mems', label: '1. Danh mục các trang trong Quản lý Thiết bị (MEMS)' },
  { id: 'trang-tong-quan', label: '2. Trang "Bảng điều khiển & KPI" (Overview)' },
  { id: 'trang-kho-thiet-bi', label: '3. Trang "Danh sách kho & Thêm máy mới" (Assets Management)' },
  { id: 'buoc-1-tao-phieu', label: '4. Bước 1: Tạo phiếu mượn thiết bị (New Request)' },
  { id: 'buoc-2-duyet-phieu', label: '5. Bước 2: Phê duyệt phiếu (Approvals - Leader/Manager)' },
  { id: 'buoc-3-gan-serial', label: '6. Bước 3: Chuẩn bị & Gán số Serial máy (Prepare & Assignment)' },
  { id: 'buoc-4-ban-giao', label: '7. Bước 4: Bàn giao & Chụp ảnh hiện trạng (Handover)' },
  { id: 'buoc-5-hoan-tra', label: '8. Bước 5: Hoàn trả & Kiểm kê nghiệm thu (Returns)' },
  { id: 'trang-nhat-ky', label: '9. Trang "Nhật ký & Lịch sử mượn trả" (Borrow History)' },
  { id: 'kich-ban-thuc-te', label: '10. 💡 Kịch bản thực chiến (Cầm tay chỉ việc)' },
  { id: 'quy-tac-bao-quan', label: '11. 4 Quy tắc vàng bảo quản thiết bị Media' },
  { id: 'faq', label: '12. Câu hỏi thường gặp & Khắc phục sự cố' },
];

const STATUS_ROWS = [
  { label: 'Sẵn sàng (Available)', color: 'green', desc: 'Thiết bị đang nằm trong tủ chống ẩm, đầy đủ pin sạc, sẵn sàng xuất kho mượn.' },
  { label: 'Đang mượn (Borrowed)', color: 'blue', desc: 'Thiết bị đã bàn giao cho ekip mang đi tác nghiệp quay/chụp.' },
  { label: 'Đang bảo trì (Maintenance)', color: 'amber', desc: 'Thiết bị đang vệ sinh cảm biến sensor, gửi hãng bảo hành hoặc thay thế linh kiện.' },
  { label: 'Hư hỏng / Đang xử lý (Damaged)', color: 'red', desc: 'Thiết bị bị rơi vỡ, trầy kính hoặc thất lạc phụ kiện trong quá trình sử dụng.' },
];

const STATUS_COLOR_CLASS: Record<string, string> = {
  slate: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
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

function UIButton({ children, color = 'blue' }: { children: ReactNode; color?: 'blue' | 'green' | 'amber' | 'slate' | 'red' | 'purple' }) {
  const styles = {
    blue: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500 shadow-sm shadow-blue-500/20',
    green: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-500 shadow-sm shadow-emerald-500/20',
    amber: 'bg-amber-600 text-white hover:bg-amber-700 border-amber-500 shadow-sm shadow-amber-500/20',
    slate: 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700',
    red: 'bg-red-600 text-white hover:bg-red-700 border-red-500',
    purple: 'bg-purple-600 text-white hover:bg-purple-700 border-purple-500',
  }[color];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-default ${styles}`}>
      {children}
    </span>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-muted text-foreground border border-border">
      {children}
    </span>
  );
}

function ActionBox({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-xs">{step}</span>
        <h4 className="font-bold text-sm text-foreground">{title}</h4>
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed pl-1">{children}</div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <h2 className="text-xl font-bold border-b border-border pb-2 text-foreground flex items-center gap-2">
        {title}
      </h2>
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

export default function ThietBiMediaGuidePage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-64px)] bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 flex gap-10">
        {/* Table of Contents */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-6 space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 px-2">Cẩm nang toàn diện</p>
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors leading-snug"
              >
                {item.label}
              </a>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 max-w-3xl space-y-12 pb-24">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Camera size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cẩm nang Toàn diện: Quản lý Thiết bị Media (MEMS)</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Hướng dẫn cặn kẽ 100% chức năng quản lý kho tài sản máy quay, ống kính, mic thu âm và quy trình mượn - trả 5 bước chuẩn hóa.
              </p>
            </div>
          </div>

          {/* Section 1: Overview */}
          <Section id="tong-quan-mems" title="1. Danh mục các trang trong Quản lý Thiết bị (MEMS)">
            <p>Hệ thống MEMS (Media Equipment Management System) gồm <strong>7 trang nghiệp vụ</strong>:</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px]">
                  <tr>
                    <th className="text-left px-3 py-2">Trang</th>
                    <th className="text-left px-3 py-2">Đường dẫn</th>
                    <th className="text-left px-3 py-2">Chức năng chính</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">1. Bảng điều khiển</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/equipment</td>
                    <td className="px-3 py-2 text-muted-foreground">Thống kê KPI số lượng máy sẵn sàng, đang mượn, bảo trì theo từng danh mục.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">2. Tạo phiếu mượn</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/equipment/new-request</td>
                    <td className="px-3 py-2 text-muted-foreground">Nhân viên xin mượn thiết bị theo khung giờ, hệ thống tự kiểm tra khả dụng chống trùng lịch.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">3. Duyệt phiếu</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/equipment/approvals</td>
                    <td className="px-3 py-2 text-muted-foreground">Leader / Quản lý xem xét chi tiết buổi quay, duyệt hoặc từ chối phiếu mượn kèm lý do.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">4. Chuẩn bị, gán serial</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/equipment/prepare</td>
                    <td className="px-3 py-2 text-muted-foreground">Thủ kho chọn máy vật lý cụ thể (số serial, mã tài sản) trong kho gán vào phiếu đã duyệt.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">5. Bàn giao</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/equipment/handover</td>
                    <td className="px-3 py-2 text-muted-foreground">Biên bản bàn giao kiểm tra tình trạng máy, kiểm đếm phụ kiện và chụp ảnh lưu hệ thống.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">6. Trả và kiểm tra</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/equipment/returns</td>
                    <td className="px-3 py-2 text-muted-foreground">Nhận lại máy, đối chiếu hiện trạng, kết luận sự cố hư hỏng (nếu có) và trả máy về kho.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">7. Nhật ký mượn</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/equipment/borrow-history</td>
                    <td className="px-3 py-2 text-muted-foreground">Tra cứu toàn bộ lịch sử sử dụng theo từng thiết bị hoặc theo từng nhân sự.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Section 2: Dashboard Overview */}
          <Section id="trang-tong-quan" title="2. Trang 'Bảng điều khiển & KPI' (Overview)">
            <p>Truy cập tại <Tag>/dashboard/equipment</Tag>:</p>
            <div className="grid sm:grid-cols-4 gap-3 text-xs md:text-sm">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="font-bold text-emerald-500">Sẵn sàng (Available)</p>
                <p className="text-xs text-muted-foreground mt-1">Thiết bị đang rảnh trong tủ kho, sẵn sàng xuất mượn.</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="font-bold text-blue-500">Đang mượn (Borrowed)</p>
                <p className="text-xs text-muted-foreground mt-1">Thiết bị đã bàn giao cho ekip mang đi tác nghiệp.</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="font-bold text-amber-500">Bảo trì (Maintenance)</p>
                <p className="text-xs text-muted-foreground mt-1">Thiết bị đang vệ sinh sensor, gửi hãng bảo hành.</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="font-bold text-red-500">Hư hỏng (Damaged)</p>
                <p className="text-xs text-muted-foreground mt-1">Thiết bị gặp sự cố kỹ thuật chờ xử lý đền bù/sửa chữa.</p>
              </div>
            </div>
          </Section>

          {/* Section 3: Add Asset Dialog */}
          <Section id="trang-kho-thiet-bi" title="3. Trang 'Danh sách kho & Thêm máy mới' (Assets Management)">
            <ActionBox step="Dành cho Thủ kho / Quản trị" title="Thao tác thêm mới 1 thiết bị vào hệ thống (Add Asset Dialog)">
              <ol className="list-decimal pl-5 space-y-1.5 text-xs md:text-sm">
                <li>Bấm nút <UIButton color="blue"><PlusCircle size={12} /> + Thêm thiết bị mới</UIButton> trên góc phải màn hình.</li>
                <li><strong>Điền thông tin định danh:</strong> Tên thiết bị (VD: <em>Sony Alpha A7 IV</em>), Hãng sản xuất (<em>Sony</em>), Model, Chủng loại (<em>Camera Body</em>).</li>
                <li><strong>Mã tài sản & Serial:</strong> Nhập Mã tài sản nội bộ (VD: <code>CAM-SONY-002</code>) và Số Serial in trên thân máy (VD: <code>#4920194</code>).</li>
                <li><strong>Hạn bảo hành & Vị trí:</strong> Chọn ngày mua, hạn bảo hành hãng, vị trí ngăn tủ cất giữ (VD: <em>Tủ chống ẩm A - Tầng 2</em>).</li>
                <li><strong>Phụ kiện kèm theo:</strong> Tích chọn các phụ kiện đi liền máy (Pin zin, Nắp lens cap, Sạc đôi, Thẻ nhớ SD 128GB, Túi đựng).</li>
                <li><strong>Tải ảnh thực tế (AssetPhotoGallery):</strong> Chụp 2-3 tấm ảnh góc cạnh máy tải lên làm hồ sơ lưu trữ ➔ Bấm <strong>Lưu tài sản</strong>.</li>
              </ol>
            </ActionBox>
          </Section>

          {/* Section 4: Step 1 Create Request */}
          <Section id="buoc-1-tao-phieu" title="4. Bước 1: Tạo phiếu mượn thiết bị (New Request)">
            <p>Vào trang <Tag>/dashboard/equipment/new-request</Tag> — Người mượn thực hiện:</p>
            <div className="border border-border rounded-xl p-4 bg-card space-y-3 text-xs md:text-sm">
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <p className="font-bold text-foreground">1. Chọn khung thời gian mượn - trả:</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Chọn ngày giờ bắt đầu và ngày giờ trả dự kiến. Hệ thống tự động kích hoạt bộ kiểm tra <code>AvailabilityService</code> để đảm bảo máy bạn chọn không bị người khác đặt trước trong khung giờ đó.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <p className="font-bold text-foreground">2. Nhập mục đích sử dụng:</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Ghi rõ tên Task sản xuất, kênh phát sóng hoặc buổi quay sự kiện.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <p className="font-bold text-foreground">3. Chọn danh sách thiết bị:</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Chọn số lượng thân máy (Body), ống kính (Lens), bộ micro không dây, đèn flash/led, gimbal.</p>
                </div>
              </div>
              <div className="pt-1">
                <UIButton color="blue">Gửi phiếu mượn</UIButton> ➔ Phiếu chuyển sang trạng thái <strong>Chờ duyệt (Pending Approval)</strong>.
              </div>
            </div>
          </Section>

          {/* Section 5: Step 2 Approval */}
          <Section id="buoc-2-duyet-phieu" title="5. Bước 2: Phê duyệt phiếu (Approvals - Leader/Manager)">
            <p>Dành cho Quản lý / Leader tại <Tag>/dashboard/equipment/approvals</Tag>:</p>
            <ActionBox step="Thao tác xét duyệt" title="Đánh giá tính cần thiết của yêu cầu">
              <ul className="space-y-1.5 text-xs md:text-sm">
                <li>Leader kiểm tra lịch quay, mục đích sử dụng và các thiết bị đề xuất.</li>
                <li>Bấm <UIButton color="green"><Check size={12} /> Duyệt phiếu</UIButton> để cho phép xuất kho.</li>
                <li>Hoặc bấm <UIButton color="red"><X size={12} /> Từ chối</UIButton> và nhập lý do giải thích (ví dụ: <em>"Trùng lịch quay sự kiện công ty, vui lòng đổi sang buổi chiều"</em>).</li>
              </ul>
            </ActionBox>
          </Section>

          {/* Section 6: Step 3 Prepare & Assignment */}
          <Section id="buoc-3-gan-serial" title="6. Bước 3: Chuẩn bị & Gán số Serial máy (Prepare & Assignment)">
            <p>Dành cho Thủ kho / Kỹ thuật tại <Tag>/dashboard/equipment/prepare</Tag>:</p>
            <div className="border border-border rounded-xl p-4 bg-card space-y-2 text-xs md:text-sm">
              <p className="text-muted-foreground">
                Thủ kho mở phiếu đã được Leader duyệt, tiến hành lấy máy từ tủ chống ẩm và chọn chính xác từng mã tài sản / số serial vật lý trong hệ thống (VD: gán thân máy <code>CAM-002</code>, ống kính <code>LENS-005</code>) ➔ Bấm <strong>Xác nhận gán máy</strong>.
              </p>
            </div>
          </Section>

          {/* Section 7: Step 4 Handover */}
          <Section id="buoc-4-ban-giao" title="7. Bước 4: Bàn giao & Chụp ảnh hiện trạng (Handover)">
            <p>Tại trang <Tag>/dashboard/equipment/handover</Tag> (lúc hai bên gặp nhau giao nhận máy):</p>
            <div className="border border-border rounded-xl p-4 bg-card space-y-3 text-xs md:text-sm">
              <p className="font-bold text-foreground">3 bước kiểm tra bắt buộc khi nhận bàn giao:</p>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Kiểm tra hoạt động:</strong> Bật máy, test quay 5s, kiểm tra pin sạc đầy và độ nhạy của micro.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Kiểm đếm phụ kiện:</strong> Đủ nắp cap che kính, 2 viên pin, thẻ nhớ 128GB, túi chống sốc.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ImageIcon size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <span><strong>Chụp ảnh hiện trạng:</strong> Chụp 1 tấm ảnh mặt kính/thân máy lưu vào hệ thống làm bằng chứng đối chiếu.</span>
                </div>
              </div>
              <div className="pt-1">
                <UIButton color="blue"><UserCheck size={14} /> Xác nhận Bàn giao</UIButton> ➔ Máy chính thức đổi sang trạng thái <StatusPill label="Đang mượn" color="blue" />.
              </div>
            </div>
          </Section>

          {/* Section 8: Step 5 Returns */}
          <Section id="buoc-5-hoan-tra" title="8. Bước 5: Hoàn trả & Kiểm kê nghiệm thu (Returns)">
            <p>Sau khi quay xong, người mượn mang máy về kho: <Tag>/dashboard/equipment/returns</Tag></p>
            <ActionBox step="Nghiệm thu hoàn trả" title="Thủ kho kiểm tra 3 bước">
              <ol className="list-decimal pl-5 space-y-2 text-xs md:text-sm">
                <li>Kiểm tra mặt kính lens không bị trầy xước, thân máy không bị móp méo do va đập.</li>
                <li>Thu hồi đủ thẻ nhớ, pin, cáp sạc đi kèm.</li>
                <li>
                  Bấm <UIButton color="green"><Check size={12} /> Nhận trả máy hoàn tất</UIButton> ➔ Hệ thống giải phóng máy về trạng thái <StatusPill label="Sẵn sàng" color="green" /> trong tủ chống ẩm để phục vụ ekip tiếp theo.
                </li>
              </ol>
            </ActionBox>
          </Section>

          {/* Section 9: Borrow History */}
          <Section id="trang-nhat-ky" title="9. Trang 'Nhật ký & Lịch sử mượn trả' (Borrow History)">
            <p>Truy cập tại <Tag>/dashboard/equipment/borrow-history</Tag>:</p>
            <div className="border border-border rounded-xl p-4 bg-card space-y-2 text-xs md:text-sm">
              <p className="text-muted-foreground">
                Tra cứu dòng thời gian sử dụng của từng máy (Asset Timeline) hoặc xem tổng số lần mượn của từng nhân sự, thời lượng mượn trung bình và lịch sử bảo dưỡng định kỳ của từng thiết bị.
              </p>
            </div>
          </Section>

          {/* Section 10: Scenario */}
          <Section id="kich-ban-thuc-te" title="10. 💡 Kịch bản thực chiến (Cầm tay chỉ việc)">
            <div className="border-2 border-blue-500/40 rounded-2xl p-5 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold text-xs">Tình huống thực tế</span>
                <h4 className="font-bold text-foreground">Bạn cần mượn 1 máy ảnh Sony A7IV và Mic DJI vào sáng mai</h4>
              </div>

              <div className="space-y-3 text-xs md:text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                  <div>Vào <Tag>/dashboard/equipment/new-request</Tag>, chọn ngày mai từ 08:30 đến 17:30.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                  <div>Chọn: 1 Thân máy Sony, 1 Lens 24-70mm, 1 Bộ mic DJI ➔ Ghi chú: <em>Quay ngoại cảnh tại công viên</em> ➔ Bấm <strong>Gửi phiếu</strong>.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                  <div>Leader duyệt phiếu trong 5 phút. Sáng mai 08:30 bạn xuống kho nhận máy, kiểm tra đủ pin và bấm ký nhận.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">4</div>
                  <div>Chiều 17:00 quay xong, bạn mang trả lại kho, thủ kho bấm kiểm tra hoàn tất. Toàn bộ lịch sử mượn sạch sẽ, đúng quy trình!</div>
                </div>
              </div>
            </div>
          </Section>

          {/* Section 11: Golden Rules */}
          <Section id="quy-tac-bao-quan" title="11. 4 Quy tắc vàng bảo quản thiết bị Media">
            <div className="border border-amber-500/30 rounded-xl p-4 bg-amber-500/5 space-y-2 text-xs md:text-sm">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                <AlertTriangle size={18} />
                <span>4 Nguyên tắc an toàn thiết bị Media:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/90 text-xs">
                <li><strong>Luôn đậy nắp Lens (Cap)</strong> ngay khi ngừng quay để tránh bụi bẩn hoặc dị vật làm xước thấu kính.</li>
                <li><strong>Không thay Lens ngoài trời nhiều gió bụi</strong> để bảo vệ cảm biến sensor không bị dính bụi.</li>
                <li><strong>Luôn gắn dây đeo máy ảnh vào cổ hoặc tay</strong> khi cầm tác nghiệp để phòng tránh rơi vỡ.</li>
                <li><strong>Cất thiết bị vào tủ chống ẩm</strong> ngay sau khi trả máy về kho công ty.</li>
              </ul>
            </div>
          </Section>

          {/* Section 12: Troubleshooting */}
          <Section id="faq" title="12. Câu hỏi thường gặp & Khắc phục sự cố">
            <div className="space-y-3 text-xs md:text-sm">
              <div className="border border-border rounded-xl p-3.5 bg-card">
                <p className="font-bold text-foreground">Q: Tôi có thể gia hạn thời gian mượn thiết bị không?</p>
                <p className="text-muted-foreground mt-1">A: Nếu buổi quay kéo dài hơn dự kiến, bạn cần báo trước cho Leader/Thủ kho để cập nhật thời hạn trả trên hệ thống, tránh bị tính là trễ hạn hoặc xung đột lịch mượn của người khác.</p>
              </div>
              <div className="border border-border rounded-xl p-3.5 bg-card">
                <p className="font-bold text-foreground">Q: Nếu thiết bị bị trầy xước hoặc gặp sự cố thì xử lý thế nào?</p>
                <p className="text-muted-foreground mt-1">A: Trong bước Hoàn trả, thủ kho sẽ chọn tình trạng 'Hư hỏng', chụp ảnh thiệt hại và lập biên bản kiểm tra để chuyển Quản lý xem xét bảo hành/sửa chữa theo quy chế công ty.</p>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
