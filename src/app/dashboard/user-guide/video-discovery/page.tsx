'use client';

import type { ReactNode } from 'react';
import {
  Search,
  Bookmark,
  Sparkles,
  TrendingUp,
  Play,
  Film,
  Music2,
  Music,
  BookOpen,
  Instagram,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb,
  ExternalLink,
  ArrowRight,
  Languages,
  MousePointerClick,
  Check,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Copy,
  HelpCircle,
  FolderOpen,
  Sliders,
  BarChart3,
  Bot,
  Zap,
  Filter,
} from 'lucide-react';

const TOC: { id: string; label: string }[] = [
  { id: 'tong-quan-module', label: '1. Danh mục các trang trong Khám phá Video' },
  { id: 'trung-tam-tim-kiem', label: '2. Trang "Tìm kiếm Video (Hub)" & 7 Nền tảng' },
  { id: 'che-do-tim-kiem', label: '3. Chế độ Từ khóa (Keyword) vs Hashtag (#)' },
  { id: 'the-video-va-thao-tac', label: '4. Thao tác trên Thẻ Video: Xem trước No-Logo, Lưu kho, Tạo Content' },
  { id: 'phan-trang-va-khu-trung', label: '5. Cơ chế Phân trang Batch & Tự động khử trùng lặp' },
  { id: 'kham-pha-kenh-doi-thu', label: '6. Trang "Khám phá Kênh" (External Channels) & AI Insights' },
  { id: 'thu-vien-video', label: '7. Trang "Bộ sưu tập" (Video Library & Tagging)' },
  { id: 'luong-chuyen-doi-ai', label: '8. Luồng chuyển đổi kịch bản AI (Sourcing & Khung PAAST)' },
  { id: 'kich-ban-thuc-te', label: '9. 💡 Kịch bản thực chiến (Cầm tay chỉ việc)' },
  { id: 'meo-tim-kiem-vang', label: '10. Bảng từ khóa vàng & Mẹo cào clip Triệu View' },
  { id: 'faq', label: '11. Câu hỏi thường gặp & Khắc phục sự cố' },
];

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

export default function KhamPhaVideoGuidePage() {
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
              <Search size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cẩm nang Toàn diện: Khám phá Video & Tìm kiếm Đa nền tảng</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Hướng dẫn chi tiết 100% tính năng tìm kiếm video xu hướng trên Douyin, TikTok, Xiaohongshu, phân tích kênh đối thủ và chuyển đổi kịch bản AI.
              </p>
            </div>
          </div>

          {/* Section 1: Overview */}
          <Section id="tong-quan-module" title="1. Danh mục các trang trong Khám phá Video">
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
                    <td className="px-3 py-2 font-bold text-foreground">1. Tìm kiếm Video (Hub)</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/search-video</td>
                    <td className="px-3 py-2 text-muted-foreground">Trung tâm quét video tập trung trên 7 nền tảng theo từ khóa/hashtag, tải theo đợt, xem trước No-logo.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">2. Khám phá kênh</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/externalChannels</td>
                    <td className="px-3 py-2 text-muted-foreground">Soi kênh đối thủ theo nền tảng, bóc tách toàn bộ video của kênh, lọc video triệu view, AI phân tích tương tác.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">3. Bộ sưu tập</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/video-library</td>
                    <td className="px-3 py-2 text-muted-foreground">Kho lưu trữ video đã bookmark/lưu từ các công cụ khám phá, phân loại theo Folder, gắn nhãn tagging.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground">4. Xưởng Kịch bản AI</td>
                    <td className="px-3 py-2 font-mono text-blue-500">/dashboard/content/product-selection</td>
                    <td className="px-3 py-2 text-muted-foreground">Bóc tách lời thoại video ngoại quốc, dịch thuật, viết lại kịch bản chuẩn công thức PAAST và chấm điểm viral.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Section 2: Search Hub & 7 Platforms */}
          <Section id="trung-tam-tim-kiem" title="2. Trang 'Tìm kiếm Video (Hub)' & 7 Nền tảng">
            <p>Truy cập tại <Tag>/dashboard/search-video</Tag> — Cung cấp khả năng cào dữ liệu trên 7 nền tảng video lớn nhất thế giới:</p>
            <div className="grid sm:grid-cols-2 gap-3 text-xs md:text-sm">
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-red-500"><Music size={14} /> Douyin (TikTok TQ):</p>
                <p className="text-muted-foreground text-xs">Kho tàng trào lưu gốc, video review đồ gia dụng thông minh, tiểu phẩm bán hàng sáng tạo triệu view.</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-cyan-500"><Music2 size={14} /> TikTok Toàn cầu & VN:</p>
                <p className="text-muted-foreground text-xs">Các trào lưu hot tại thị trường Việt Nam & Quốc tế, âm nhạc thịnh hành, dance challenge.</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-500"><BookOpen size={14} /> Xiaohongshu (RED):</p>
                <p className="text-muted-foreground text-xs">Review mỹ phẩm, thời trang, đồ decor nhà cửa sang trọng, hình ảnh & video chất lượng thẩm mỹ cao.</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-purple-500"><Instagram size={14} /> Instagram Reels:</p>
                <p className="text-muted-foreground text-xs">Nội dung đồ họa, du lịch, kiến trúc, thời trang quốc tế với góc máy nghệ thuật.</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-sky-500"><Play size={14} /> Bilibili:</p>
                <p className="text-muted-foreground text-xs">Review công nghệ chuyên sâu, hoạt hình, tiểu phẩm có cốt truyện dài.</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-500"><Play size={14} /> Kuaishou:</p>
                <p className="text-muted-foreground text-xs">Tiểu phẩm đời sống nông thôn, ẩm thực dân dã, mẹo vặt thực tế gần gũi.</p>
              </div>
            </div>
          </Section>

          {/* Section 3: Keyword vs Hashtag */}
          <Section id="che-do-tim-kiem" title="3. Chế độ Từ khóa (Keyword) vs Hashtag (#)">
            <ActionBox step="Cách chọn chế độ" title="Sử dụng đúng chế độ để ra kết quả chuẩn xác nhất">
              <div className="space-y-2 text-xs md:text-sm">
                <div>
                  <strong>1. Chế độ Từ khóa (Keyword):</strong> Thích hợp khi bạn muốn tìm theo chủ đề rộng (ví dụ: <code>nồi chiên không dầu</code>, <code>kem chống nắng cho da dầu</code>, <code>robot hút bụi</code>). Hệ thống sẽ tìm trong tiêu đề, mô tả và caption của video.
                </div>
                <div>
                  <strong>2. Chế độ Hashtag (#):</strong> Thích hợp khi bạn muốn theo sát một trào lưu hoặc chiến dịch đang viral (ví dụ: <code>#reviewmypham</code>, <code>#goodthings</code>, <code>#unbox</code>). Hệ thống tự động thêm dấu <code>#</code> nếu bạn quên nhập.
                </div>
              </div>
            </ActionBox>
          </Section>

          {/* Section 4: Video Card Actions */}
          <Section id="the-video-va-thao-tac" title="4. Thao tác trên Thẻ Video: Xem trước No-Logo, Lưu kho, Tạo Content">
            <p>Mỗi thẻ video trả về được trang bị đầy đủ các nút tương tác nhanh:</p>
            <div className="border border-border rounded-xl p-4 bg-card space-y-3 text-xs md:text-sm">
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded bg-blue-600/20 text-blue-500 border border-blue-500/40 font-semibold">1. Xem trước No-watermark</span>
                <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-semibold">2. Nút Lưu vào kho (Bookmark)</span>
                <span className="px-2.5 py-1 rounded bg-purple-600/20 text-purple-400 border border-purple-500/40 font-semibold">3. Nút Tạo Content AI</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground text-xs">
                <li><strong>Bấm vào ảnh bìa (Thumbnail):</strong> Mở video Full HD âm thanh chất lượng cao để xem thử nội dung, góc quay không bị che bởi logo nền tảng.</li>
                <li><strong>Bấm nút "Lưu vào kho" (Bookmark):</strong> Lưu siêu dữ liệu video vào <Tag>/dashboard/video-library</Tag> để làm tư liệu vĩnh viễn. Nút tự đổi sang <UIButton color="green"><Check size={10} /> Đã lưu</UIButton>.</li>
                <li><strong>Bấm nút "Tạo Content":</strong> Chuyển thẳng link, tiêu đề và mô tả video sang trang viết kịch bản AI mà không cần copy paste thủ công.</li>
                <li><strong>Hiển thị số liệu minh bạch:</strong> Lượt xem (<Eye size={12} className="inline" /> Views), Lượt tim (<Heart size={12} className="inline text-red-500" /> Likes), Bình luận (<MessageCircle size={12} className="inline" /> Comments), Chia sẻ (<Share2 size={12} className="inline" /> Shares).</li>
              </ul>
            </div>
          </Section>

          {/* Section 5: Batch Pagination & Deduplication */}
          <Section id="phan-trang-va-khu-trung" title="5. Cơ chế Phân trang Batch & Tự động khử trùng lặp">
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2 text-xs md:text-sm">
              <p className="font-bold text-foreground flex items-center gap-1.5 text-blue-500">
                <Filter size={16} /> Thuật toán lọc thông minh:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong>Tải theo đợt (Next Batch):</strong> Mỗi lần tìm kiếm trả về 30 video. Bấm nút <em>"Tải thêm kết quả (Trang tiếp theo)"</em> ở cuối trang để cào tiếp 30 video kế tiếp.</li>
                <li><strong>Tự động khử trùng (Deduplication):</strong> Hệ thống ghi nhớ các video đã hiển thị (`seenIds`), đảm bảo đợt cào tiếp theo không bao giờ bị lặp lại video cũ.</li>
                <li><strong>Tự động ẩn video đã có trong kho:</strong> Nếu một video đã được bạn lưu vào Thư viện trước đó, hệ thống sẽ tự động nhận diện và ẩn đi để bạn chỉ tập trung vào các video hoàn toàn mới.</li>
              </ul>
            </div>
          </Section>

          {/* Section 6: External Channels */}
          <Section id="kham-pha-kenh-doi-thu" title="6. Trang 'Khám phá Kênh' (External Channels) & AI Insights">
            <p>Truy cập tại <Tag>/dashboard/externalChannels</Tag>:</p>
            <ActionBox step="3 Tính năng Soi Kênh" title="Nghiên cứu đối thủ toàn diện">
              <ol className="list-decimal pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  <strong>Theo dõi kênh mục tiêu:</strong> Dán đường link kênh Douyin/TikTok của đối thủ vào ô tìm kiếm ➔ Bấm <strong>Quét kênh</strong> để lưu kênh vào danh sách theo dõi thường xuyên.
                </li>
                <li>
                  <strong>Bóc tách toàn bộ kho video:</strong> Xem danh sách tất cả video của kênh, lọc theo <em>Lượt xem cao nhất</em>, <em>Tỷ lệ tương tác cao nhất (Engagement Rate)</em> để tìm ra công thức làm video viral của họ.
                </li>
                <li>
                  <strong>AI Insights (Phân tích kênh thông minh):</strong> AI tự động tổng hợp tần suất ra clip, khung giờ đăng hiệu quả nhất và phân tích các chủ đề ăn khách nhất của kênh đối thủ.
                </li>
              </ol>
            </ActionBox>
          </Section>

          {/* Section 7: Video Library */}
          <Section id="thu-vien-video" title="7. Trang 'Bộ sưu tập' (Video Library & Tagging)">
            <p>Truy cập tại <Tag>/dashboard/video-library</Tag>:</p>
            <div className="border border-border rounded-xl p-4 bg-card space-y-2 text-xs md:text-sm">
              <p className="font-bold text-foreground">Quản lý kho tư liệu sáng tạo:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong>Tạo Thư mục / Bộ sưu tập:</strong> Gom nhóm video theo chủ đề (VD: <em>"Review Gia Dụng Tháng 8"</em>, <em>"Ý tưởng Video Tết"</em>).</li>
                <li><strong>Gắn Nhãn (Tags):</strong> Gắn các tag phân loại: <code>#ASMR</code>, <code>#HaiHuoc</code>, <code>#DapHop</code>, <code>#KichTinh</code>.</li>
                <li><strong>Tìm kiếm nội bộ:</strong> Tìm lại bất kỳ video nào trong kho chỉ bằng một từ khóa trong tiêu đề đã lưu.</li>
              </ul>
            </div>
          </Section>

          {/* Section 8: Sourcing & PAAST Framework */}
          <Section id="luong-chuyen-doi-ai" title="8. Luồng chuyển đổi kịch bản AI (Sourcing & Khung PAAST)">
            <p>Quy trình biến video nước ngoài thành kịch bản sản xuất nội địa chất lượng cao:</p>
            <div className="border border-purple-500/30 rounded-xl p-4 bg-purple-500/5 space-y-3 text-xs md:text-sm">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
                <Bot size={18} />
                <span>Khung cấu trúc kịch bản PAAST chuẩn triệu view:</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-background border border-border"><strong>1. Hook (3s đầu):</strong> Câu mở đầu gây tò mò, giữ chân người xem không lướt qua.</div>
                <div className="p-2 rounded bg-background border border-border"><strong>2. Pain (Nỗi đau):</strong> Nêu vấn đề khó chịu người xem đang gặp phải.</div>
                <div className="p-2 rounded bg-background border border-border"><strong>3. Agitate (Kích thích):</strong> Đẩy cảm xúc khó chịu lên cao nếu không giải quyết.</div>
                <div className="p-2 rounded bg-background border border-border"><strong>4. Solution (Giải pháp):</strong> Giới thiệu tính năng vượt trội của sản phẩm.</div>
                <div className="p-2 rounded bg-background border border-border col-span-2"><strong>5. CTA (Kêu gọi hành động):</strong> Hướng dẫn bấm vào giỏ hàng hoặc link bio để mua ngay với giá ưu đãi.</div>
              </div>
            </div>
          </Section>

          {/* Section 9: Scenario */}
          <Section id="kich-ban-thuc-te" title="9. 💡 Kịch bản thực chiến (Cầm tay chỉ việc)">
            <div className="border-2 border-blue-500/40 rounded-2xl p-5 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold text-xs">Tình huống thực tế</span>
                <h4 className="font-bold text-foreground">Bạn cần tìm 5 video Douyin review máy hút bụi cầm tay để viết kịch bản</h4>
              </div>

              <div className="space-y-3 text-xs md:text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                  <div>Vào <Tag>/dashboard/search-video</Tag>, nhấp chọn tab <strong>Douyin</strong>.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                  <div>Gõ từ khóa: <code>máy hút bụi cầm tay</code> hoặc dán chữ Hán <code>手持吸尘器</code> ➔ Bấm <strong>Tìm kiếm</strong>.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                  <div>Xem qua danh sách, bấm vào thumbnail để xem thử 3 clip có trên 200k like với góc quay hút bụi mịn trên ghế sofa cực kỳ thuyết phục.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">4</div>
                  <div>Bấm <strong>Lưu vào kho</strong> để lưu trữ, bấm <strong>Tạo Content</strong> ở clip hay nhất để chuyển sang AI sinh kịch bản lồng tiếng tiếng Việt.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">5</div>
                  <div>Chỉ trong 3 phút, bạn đã hoàn thành việc nghiên cứu thị trường và có ngay kịch bản sẵn sàng bấm máy quay!</div>
                </div>
              </div>
            </div>
          </Section>

          {/* Section 10: Golden Keywords */}
          <Section id="meo-tim-kiem-vang" title="10. Bảng từ khóa vàng & Mẹo cào clip Triệu View">
            <p>Copy các từ khóa sau dán vào ô tìm kiếm để mở ra kho tàng video viral:</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px]">
                  <tr>
                    <th className="text-left px-3 py-2">Từ khóa tiếng Trung</th>
                    <th className="text-left px-3 py-2">Nghĩa tiếng Việt</th>
                    <th className="text-left px-3 py-2">Chủ đề áp dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-blue-500">好物推荐</td>
                    <td className="px-3 py-2">Gợi ý đồ tốt / Review sản phẩm</td>
                    <td className="px-3 py-2 text-muted-foreground">Gia dụng, đời sống, đồ decor</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-blue-500">沉浸式开箱</td>
                    <td className="px-3 py-2">Đập hộp thư giãn (ASMR Unboxing)</td>
                    <td className="px-3 py-2 text-muted-foreground">Mỹ phẩm, phụ kiện, đồ công nghệ</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-blue-500">美食教程</td>
                    <td className="px-3 py-2">Hướng dẫn nấu ăn ngon</td>
                    <td className="px-3 py-2 text-muted-foreground">Thiết bị bếp, nồi chiên, chảo chống dính</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-blue-500">生活小妙招</td>
                    <td className="px-3 py-2">Mẹo vặt cuộc sống thông minh</td>
                    <td className="px-3 py-2 text-muted-foreground">Dọn dẹp nhà cửa, dụng cụ tiện ích</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Section 11: Troubleshooting */}
          <Section id="faq" title="11. Câu hỏi thường gặp & Khắc phục sự cố">
            <div className="space-y-3 text-xs md:text-sm">
              <div className="border border-border rounded-xl p-3.5 bg-card">
                <p className="font-bold text-foreground">Q: Tìm kiếm Douyin có cần mở VPN sang Trung Quốc không?</p>
                <p className="text-muted-foreground mt-1">A: Hoàn toàn không cần. Máy chủ backend của VCB đã thiết lập hệ thống proxy chuyên dụng, cho phép bạn tìm kiếm và tải video mượt mà với tốc độ đường truyền nội địa.</p>
              </div>
              <div className="border border-border rounded-xl p-3.5 bg-card">
                <p className="font-bold text-foreground">Q: Video tải về hoặc xem trước có bị dính ID hay logo mờ không?</p>
                <p className="text-muted-foreground mt-1">A: Hệ thống tự động phân giải luồng video gốc (No-watermark Stream) từ CDN máy chủ Douyin/TikTok, đảm bảo chất lượng video 1080p sắc nét và hoàn toàn sạch logo.</p>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
