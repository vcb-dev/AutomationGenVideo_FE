'use client';

import type { ReactNode } from 'react';
import {
  Send,
  Calendar,
  Share2,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb,
  Facebook,
  Instagram,
  Youtube,
  Radio,
  FileVideo,
  RefreshCw,
  Sliders,
  History,
  ShieldCheck,
  Zap,
  MousePointerClick,
  Check,
  X,
  UploadCloud,
  Hash,
  Sparkles,
  PlaySquare,
  ArrowRight,
  HelpCircle,
  FileSpreadsheet,
  BarChart3,
  Key,
  FolderOpen,
  FileCode,
  Tag as TagIcon,
  Eye,
  Settings,
} from 'lucide-react';

const TOC: { id: string; label: string }[] = [
  { id: 'tong-quan-module', label: '1. Danh mục tất cả các trang & Chức năng trong Module' },
  { id: 'trang-kenh-ket-noi', label: '2. Trang "Kênh kết nối" (Channels & OAuth)' },
  { id: 'trang-soan-bai', label: '3. Trang "Soạn bài" (Compose) & Toàn bộ tính năng' },
  { id: 'tinh-nang-template', label: '4. Tính năng Template & Biến động {tên_biến}' },
  { id: 'tinh-nang-media', label: '5. Các nguồn Media & Xử lý Thumbnail' },
  { id: 'dang-ngay-va-hang-cho', label: '6. Đăng ngay, Hàng chờ & Theo dõi tiến trình Realtime' },
  { id: 'trang-dang-hang-loat', label: '7. Trang "Đăng hàng loạt" (Bulk Post từ CSV & Kho)' },
  { id: 'trang-lich-dang', label: '8. Trang "Lịch đăng / Hàng đợi" (Schedule & Queue Management)' },
  { id: 'trang-lich-phat-song', label: '9. Trang "Lịch phát sóng" (Calendar View)' },
  { id: 'trang-lich-su', label: '10. Trang "Lịch sử đăng bài" (History)' },
  { id: 'trang-thong-ke', label: '11. Trang "Thống kê hiệu suất" (Stats & Analytics)' },
  { id: 'co-che-bao-ve-va-loi', label: '12. Cơ chế an toàn (Concurrency, Rate Limit, Retries)' },
  { id: 'kich-ban-thuc-te', label: '13. 💡 Kịch bản thực chiến (Cầm tay chỉ việc)' },
  { id: 'faq', label: '14. Bảng tra cứu lỗi & Khắc phục trong 30 giây' },
];

const STATUS_ROWS = [
  { label: 'Chờ đăng (Pending)', color: 'blue', desc: 'Đã lên lịch thành công, đang đợi đến giờ hẹn. Bạn có thể sửa giờ, sửa nội dung hoặc hủy bài bất cứ lúc nào.' },
  { label: 'Đang xử lý (Processing)', color: 'amber', desc: 'Hệ thống đang tải video, transcode chuẩn hóa FFmpeg hoặc gửi API tới mạng xã hội. Không đóng web lúc này.' },
  { label: 'Thành công (Success)', color: 'green', desc: 'Bài đã xuất bản thành công! Bấm vào link để nhảy trực tiếp tới bài viết trên Facebook/Instagram/YouTube.' },
  { label: 'Thất bại (Failed)', color: 'red', desc: 'Đăng bài lỗi (hết hạn token, video sai chuẩn...). Bấm nút "Thử lại" sau khi kiểm tra.' },
  { label: 'Đã hủy (Cancelled)', color: 'slate', desc: 'Bài đã được bạn chủ động hủy lịch trước giờ phát.' },
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

export default function DangBaiMxhGuidePage() {
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
              <Send size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cẩm nang Toàn diện: Đăng bài MXH & Tự động hóa Xuất bản</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Hướng dẫn cặn kẽ 100% chức năng, giao diện, form nhập liệu và cơ chế vận hành của phân hệ Social Publishing.
              </p>
            </div>
          </div>

          {/* Section 1: Overview */}
          <Section id="tong-quan-module" title="1. Danh mục tất cả các trang & Chức năng trong Module">
            <p>Phân hệ Đăng bài tự động gồm <strong>7 trang nghiệp vụ</strong> chuyên sâu:</p>
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
                    <td className="px-3 py-2 font-bold text-foreground">1. Kênh kết nối</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/social/channels</td>
                    <td className="px-3 py-2 text-muted-foreground">Quản lý ủy quyền OAuth Facebook, Instagram, YouTube, Threads; cấp quyền chia sẻ tài khoản.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">2. Soạn bài</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/social/compose</td>
                    <td className="px-3 py-2 text-muted-foreground">Soạn thảo đa kênh, chọn media (Task, Drive, Máy tính), chèn Template, đăng ngay & hẹn giờ.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">3. Đăng hàng loạt</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/social/bulk</td>
                    <td className="px-3 py-2 text-muted-foreground">Import file CSV hoặc chọn danh sách video sẵn có để rải lịch đăng theo tần suất.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">4. Lịch đăng / Hàng đợi</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/social/schedule</td>
                    <td className="px-3 py-2 text-muted-foreground">Quản lý hàng đợi PENDING, sửa giờ phát, hủy lịch, xem lý do lỗi và Retry bài thất bại.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">5. Lịch phát sóng</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/social/calendar</td>
                    <td className="px-3 py-2 text-muted-foreground">Xem trực quan dưới dạng Calendar lưới tháng/tuần, kéo thả đổi ngày đăng.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">6. Lịch sử bài đăng</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/social/history</td>
                    <td className="px-3 py-2 text-muted-foreground">Nhật ký bài đã xuất bản, link trực tiếp tới bài viết trên MXH, lượt tương tác ban đầu.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">7. Thống kê hiệu suất</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/social/stats</td>
                    <td className="px-3 py-2 text-muted-foreground">Biểu đồ tỷ lệ thành công (%), số bài theo ngày/tuần/tháng, phân tích theo team và nhân sự.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Section 2: Channels */}
          <Section id="trang-kenh-ket-noi" title="2. Trang 'Kênh kết nối' (Channels & OAuth)">
            <p>Vào trang <Tag>/dashboard/social/channels</Tag> để quản lý tài khoản mạng xã hội:</p>
            <ActionBox step="Thao tác" title="Các tính năng trên trang Kênh kết nối">
              <ul className="space-y-2 text-xs md:text-sm">
                <li><strong>Nút kết nối mới:</strong> Bấm <UIButton color="blue"><Facebook size={12} /> + Kết nối Facebook</UIButton> (tự động nhận diện cả Fanpage và Instagram gắn kèm), hoặc <UIButton color="red"><Youtube size={12} /> + Kết nối YouTube</UIButton>, <UIButton color="purple"><Radio size={12} /> + Kết nối Threads</UIButton>.</li>
                <li><strong>Trạng thái Token:</strong> Thẻ kênh hiển thị ảnh đại diện, tên Page, Platform và nhãn trạng thái <UIButton color="green"><Check size={10} /> Đang hoạt động</UIButton> hoặc <UIButton color="red"><AlertTriangle size={10} /> Cần kết nối lại</UIButton>.</li>
                <li><strong>Nút 'Kết nối lại' (Reconnect):</strong> Khi token Facebook/Instagram hết hạn (sau 60 ngày), bấm nút này để làm mới token trong 5 giây mà không làm mất lịch sử đăng.</li>
                <li><strong>Chia sẻ tài khoản (Is Shared):</strong> Cho phép bật chia sẻ kênh để các thành viên khác trong cùng Team có thể cùng chọn đăng bài lên Fanpage đó.</li>
              </ul>
            </ActionBox>
          </Section>

          {/* Section 3: Compose page */}
          <Section id="trang-soan-bai" title="3. Trang 'Soạn bài' (Compose) & Toàn bộ tính năng">
            <p>Vào trang <Tag>/dashboard/social/compose</Tag> — Trung tâm sáng tạo nội dung:</p>
            <div className="border border-border rounded-xl p-4 bg-card space-y-3 text-xs md:text-sm">
              <p className="font-bold text-foreground flex items-center gap-1.5 text-blue-500">
                <MousePointerClick size={16} /> Chi tiết từng trường dữ liệu trên màn hình Soạn bài:
              </p>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <p className="font-bold text-foreground">1. Danh sách Kênh (Channel Selector):</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Hiển thị toàn bộ Fanpage, Instagram, YouTube của bạn. Tích chọn 1 hoặc nhiều kênh. Có nút <strong>"Chọn tất cả"</strong> để chọn nhanh.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <p className="font-bold text-foreground">2. Khung Nội dung & Hashtag:</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Nhập caption, tiêu đề. Có thanh đếm ký tự, thanh gợi ý hashtag xu hướng dưới chân khung soạn thảo để bấm 1-click chèn thêm tag.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <p className="font-bold text-foreground">3. Quyền riêng tư (Privacy):</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Tùy chọn hiển thị: <strong>Công khai (Public)</strong>, <strong>Chỉ mình tôi (Private)</strong> hoặc <strong>Không công khai (Unlisted)</strong> cho video YouTube.</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Section 4: Template Manager */}
          <Section id="tinh-nang-template" title="4. Tính năng Template & Biến động {tên_biến}">
            <ActionBox step="Tính năng nâng cao" title="Sử dụng Mẫu nội dung (Template Manager)">
              <p className="text-xs md:text-sm">
                Giúp bạn lưu các mẫu bài đăng chuẩn thương hiệu và tái sử dụng cho hàng trăm video:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-xs md:text-sm mt-2">
                <li>Bấm nút <strong>"Template"</strong> cạnh khung soạn thảo.</li>
                <li>Nhập nội dung mẫu có chứa các biến động đặt trong dấu ngoặc nhọn, ví dụ:<br />
                  <code className="p-1 rounded bg-slate-900 text-amber-400 text-xs block my-1">
                    🔥 Đánh giá chi tiết {'{tên_sản_phẩm}'} sau 1 tháng sử dụng! Giá ưu đãi chỉ {'{giá_tiền}'}. Đặt mua tại link bio! #review
                  </code>
                </li>
                <li>Bấm <strong>"Lưu Template"</strong>. Khi sử dụng, bạn chỉ cần chọn template đó ➔ Hệ thống hiện form <strong>"Điền biến động"</strong> ➔ Nhập tên sản phẩm & giá tiền ➔ Nội dung tự động điền hoàn chỉnh!</li>
              </ol>
            </ActionBox>
          </Section>

          {/* Section 5: Media Sources & Thumbnails */}
          <Section id="tinh-nang-media" title="5. Các nguồn Media & Xử lý Thumbnail">
            <div className="grid sm:grid-cols-2 gap-3 text-xs md:text-sm">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <p className="font-bold text-blue-500 flex items-center gap-1.5"><UploadCloud size={16} /> 3 Nguồn tải Video/Ảnh:</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
                  <li><strong>Kéo thả từ máy tính:</strong> Hỗ trợ Chunked Upload file dung lượng lớn đến 1GB.</li>
                  <li><strong>Chọn từ Task đã duyệt:</strong> Lấy thẳng video thành phẩm của Editor từ module Nhiệm vụ.</li>
                  <li><strong>Chọn từ Thư viện Media:</strong> Tái sử dụng video, ảnh bìa đã lưu trong kho chung.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <p className="font-bold text-emerald-500 flex items-center gap-1.5"><Sparkles size={16} /> Xử lý Ảnh bìa (Thumbnail):</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
                  <li><strong>Tự động sinh thumbnail:</strong> Hệ thống tự trích xuất khung hình tại giây thứ 1 của video làm ảnh bìa.</li>
                  <li><strong>Tùy chỉnh ảnh bìa:</strong> Bấm nút <em>"Tải ảnh bìa tùy chỉnh"</em> để chọn ảnh thiết kế riêng cho Facebook Reels và YouTube Shorts.</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Section 6: Publish Now & Realtime Modal */}
          <Section id="dang-ngay-va-hang-cho" title="6. Đăng ngay, Hàng chờ & Theo dõi tiến trình Realtime">
            <p>Khi bạn bấm nút <UIButton color="blue"><Send size={12} /> Đăng ngay</UIButton>:</p>
            <div className="border border-blue-500/30 rounded-xl p-4 bg-blue-500/5 space-y-3 text-xs md:text-sm">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <BarChart3 size={16} className="text-blue-500" /> Cửa sổ theo dõi tiến trình trực tiếp (Publish Progress Modal):
              </p>
              <ul className="space-y-1 text-muted-foreground list-disc pl-5">
                <li>Thanh tiến trình phần trăm: <code>[Đang tải media: 40%]</code> ➔ <code>[FFmpeg Transcode: 75%]</code> ➔ <code>[Đăng bài: 100%]</code>.</li>
                <li><strong>Nhật ký thời gian thực (Realtime Log):</strong> Hiển thị chi tiết từng kênh:<br />
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">✅ Fanpage VCBI: Đăng thành công → https://facebook.com/posts/12345</span><br />
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">✅ YouTube Shorts: Đăng thành công → https://youtube.com/shorts/xyz</span>
                </li>
                <li>Thông báo đẩy chuông rung trên góc phải màn hình qua kết nối máy chủ SSE Stream.</li>
              </ul>
            </div>
          </Section>

          {/* Section 7: Bulk Post */}
          <Section id="trang-dang-hang-loat" title="7. Trang 'Đăng hàng loạt' (Bulk Post từ CSV & Kho)">
            <p>Truy cập tại <Tag>/dashboard/social/bulk</Tag>:</p>
            <ActionBox step="Quy trình 4 bước" title="Đăng 10 - 50 bài chỉ với 1 file CSV">
              <ol className="list-decimal pl-5 space-y-1.5 text-xs md:text-sm">
                <li>Bấm nút <UIButton color="slate"><FileSpreadsheet size={12} /> Tải mẫu CSV</UIButton> về máy.</li>
                <li>Mở file bằng Excel/Google Sheets, điền các cột: <code>Tên tài khoản</code>, <code>Nội dung</code>, <code>Hashtag</code>, <code>Link video/ảnh</code>, <code>Thời gian hẹn giờ (ISO: 2026-08-21T11:30)</code>.</li>
                <li>Kéo file CSV thả vào ô upload trên trang ➔ Hệ thống tự động đọc và kiểm tra tính hợp lệ (báo rõ hàng nào chuẩn, hàng nào lỗi).</li>
                <li>Bấm <UIButton color="blue">Đăng tất cả hàng hợp lệ</UIButton> ➔ Toàn bộ bài được đưa vào hàng đợi phát sóng tự động!</li>
              </ol>
            </ActionBox>
          </Section>

          {/* Section 8: Schedule Queue Management */}
          <Section id="trang-lich-dang" title="8. Trang 'Lịch đăng / Hàng đợi' (Schedule & Queue Management)">
            <p>Truy cập tại <Tag>/dashboard/social/schedule</Tag>:</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {STATUS_ROWS.map((s) => (
                    <tr key={s.label}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <StatusPill label={s.label} color={s.color} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card space-y-2 text-xs">
              <p className="font-bold text-foreground">4 Thao tác quản trị trên mỗi dòng bài đăng:</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <span className="p-2 rounded bg-muted border border-border">✏️ <strong>Chỉnh sửa nội dung & giờ:</strong> Sửa caption hoặc dời giờ phát cho bài PENDING.</span>
                <span className="p-2 rounded bg-muted border border-border">🗑️ <strong>Hủy bài (Cancel):</strong> Hủy bài trước khi worker nhận lệnh xử lý.</span>
                <span className="p-2 rounded bg-muted border border-border">🔄 <strong>Thử lại (Retry):</strong> Nhấn khi bài bị FAILED để máy chủ thử đăng lại.</span>
                <span className="p-2 rounded bg-muted border border-border">👁️ <strong>Xem trước Media:</strong> Bấm vào thumbnail để xem lại video sẽ phát.</span>
              </div>
            </div>
          </Section>

          {/* Section 9: Calendar View */}
          <Section id="trang-lich-phat-song" title="9. Trang 'Lịch phát sóng' (Calendar View)">
            <p>Truy cập tại <Tag>/dashboard/social/calendar</Tag>:</p>
            <div className="border border-border rounded-xl p-4 bg-card space-y-2 text-xs md:text-sm">
              <p className="text-muted-foreground">
                Giao diện lịch tháng/tuần trực quan. Mỗi ô ngày hiển thị số lượng bài đã lên lịch của từng kênh (Facebook, YouTube, Instagram). Bạn có thể <strong>kéo thả bài viết từ ngày này sang ngày khác</strong> để dời lịch hoặc bấm trực tiếp vào ô ngày để lên lịch bài mới cho ngày đó.
              </p>
            </div>
          </Section>

          {/* Section 10: History */}
          <Section id="trang-lich-su" title="10. Trang 'Lịch sử bài đăng' (History)">
            <p>Truy cập tại <Tag>/dashboard/social/history</Tag>:</p>
            <div className="border border-border rounded-xl p-4 bg-card space-y-2 text-xs md:text-sm">
              <p className="text-muted-foreground">
                Lưu trữ vĩnh viễn toàn bộ bài viết đã đăng thành công kèm thời gian đăng, người thực hiện, kênh xuất bản và liên kết trực tiếp mở bài viết trên mạng xã hội để kiểm tra tương tác.
              </p>
            </div>
          </Section>

          {/* Section 11: Stats */}
          <Section id="trang-thong-ke" title="11. Trang 'Thống kê hiệu suất' (Stats & Analytics)">
            <p>Truy cập tại <Tag>/dashboard/social/stats</Tag>:</p>
            <div className="grid sm:grid-cols-3 gap-3 text-xs md:text-sm">
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="font-bold text-blue-500">📊 Tổng số bài đăng</p>
                <p className="text-xs text-muted-foreground mt-1">Lọc theo 7 ngày, 30 ngày, 90 ngày hoặc tất cả thời gian.</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="font-bold text-emerald-500">🎯 Tỷ lệ thành công (%)</p>
                <p className="text-xs text-muted-foreground mt-1">Tỷ lệ đăng bài mượt mà không gặp lỗi kỹ thuật.</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="font-bold text-purple-500">👥 Lọc theo Team & Nhân sự</p>
                <p className="text-xs text-muted-foreground mt-1">Xem sản lượng đăng bài của từng nhân viên hoặc toàn bộ team.</p>
              </div>
            </div>
          </Section>

          {/* Section 12: Concurrency & Safety */}
          <Section id="co-che-bao-ve-va-loi" title="12. Cơ chế an toàn (Concurrency, Rate Limit, Retries)">
            <div className="border border-border rounded-xl p-4 bg-card space-y-3 text-xs md:text-sm">
              <p className="font-bold text-foreground flex items-center gap-1.5 text-emerald-500">
                <ShieldCheck size={18} /> Các cơ chế bảo vệ kênh mạng xã hội chạy ngầm:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li><strong>Tuần tự hóa từng kênh (<code>ACCOUNT_CONCURRENCY = 1</code>):</strong> Mỗi Page chỉ đăng 1 bài tại một thời điểm, các bài sau tự xếp hàng đợi để tránh bị thuật toán Facebook/Instagram đánh dấu spam vì đăng dồn dập.</li>
                <li><strong>Chống click đúp (<code>inFlightPublishNow</code>):</strong> Ngăn chặn người dùng bấm liên tục nút "Đăng ngay" làm trùng lặp 2 bài viết giống nhau trên Fanpage.</li>
                <li><strong>Tự động thử lại theo cấp số nhân (Exponential Backoff):</strong> Khi mạng bị ngắt quãng, máy chủ tự động retry sau 5 phút, 15 phút, 45 phút.</li>
              </ul>
            </div>
          </Section>

          {/* Section 13: Scenario */}
          <Section id="kich-ban-thuc-te" title="13. 💡 Kịch bản thực chiến (Cầm tay chỉ việc)">
            <div className="border-2 border-blue-500/40 rounded-2xl p-5 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold text-xs">Tình huống thực tế</span>
                <h4 className="font-bold text-foreground">Bạn muốn đăng 1 video Shorts & Reels lúc 19:30 tối nay</h4>
              </div>

              <div className="space-y-3 text-xs md:text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                  <div>Vào <Tag>/dashboard/social/compose</Tag>, tích chọn <strong>Fanpage Review Gia Dụng</strong> và <strong>YouTube Shorts Official</strong>.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                  <div>Gõ tiêu đề: <code>Hé lộ bí quyết nấu ăn nhanh cho người bận rộn! #nauan #shorts</code>.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                  <div>Kéo video <code>video_final_9x16.mp4</code> từ Desktop thả vào khung upload, đợi thanh tiến trình chạy đủ 100%.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">4</div>
                  <div>Gạt công tắc <strong>Hẹn giờ</strong> ➔ Chọn ngày hôm nay ➔ Chọn giờ <strong>19:30</strong>.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">5</div>
                  <div>Bấm nút màu cam <UIButton color="amber"><Clock size={12} /> Lên lịch đăng bài</UIButton>. Màn hình báo <em>"Đã đặt lịch tất cả!"</em>. Đúng 19:30 máy chủ tự động đăng video lên cả 2 kênh!</div>
                </div>
              </div>
            </div>
          </Section>

          {/* Section 14: Troubleshooting */}
          <Section id="faq" title="14. Bảng tra cứu lỗi & Khắc phục trong 30 giây">
            <div className="space-y-3 text-xs md:text-sm">
              <div className="border border-border rounded-xl p-3.5 bg-card">
                <p className="font-bold text-red-500 flex items-center gap-1.5">
                  <X size={16} /> Lỗi: "Error validating access token..." (Hết hạn quyền truy cập)
                </p>
                <p className="text-muted-foreground mt-1">
                  👉 <strong>Cách xử lý:</strong> Token Facebook của bạn đã hết hạn (sau 60 ngày). Vào <Tag>/dashboard/social/channels</Tag> ➔ Bấm nút <strong>"Kết nối lại"</strong> tại dòng Fanpage đó là xong ngay trong 5 giây.
                </p>
              </div>

              <div className="border border-border rounded-xl p-3.5 bg-card">
                <p className="font-bold text-red-500 flex items-center gap-1.5">
                  <X size={16} /> Lỗi: "Video format unsupported" (Video không đúng chuẩn Reels/Shorts)
                </p>
                <p className="text-muted-foreground mt-1">
                  👉 <strong>Cách xử lý:</strong> Đối với Facebook Reels và YouTube Shorts, video bắt buộc phải có tỷ lệ dọc <strong>9:16</strong> (độ phân giải 1080x1920) và độ dài dưới 60 giây.
                </p>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
