'use client';

import type { ReactNode } from 'react';
import {
  Sparkles,
  DownloadCloud,
  Languages,
  Gift,
  Bookmark,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb,
  MousePointerClick,
  Check,
  Play,
  Copy,
  FolderOpen,
  ArrowRight,
  HelpCircle,
  FileVideo,
  Music,
  Share2,
  Puzzle,
  Download,
  ExternalLink,
  ShieldCheck,
  Star,
  Keyboard,
  Globe,
} from 'lucide-react';

const TOC: { id: string; label: string }[] = [
  { id: 'tong-quan', label: '1. Tổng quan Bộ Tiện ích & Extension' },
  { id: 'cai-dat-extension', label: '2. 🧩 Hướng dẫn cài đặt VCB Chrome Extension' },
  { id: 'tinh-nang-dich-tab', label: '3. ⚡ Tính năng 1: Gõ tiếng Việt ➔ Bấm [Tab] tự dịch tiếng Trung trên Douyin' },
  { id: 'tinh-nang-de-xuat', label: '4. ★ Tính năng 2: Nút "Đề xuất vào VCB" (1-Click đẩy vào kho)' },
  { id: 'tinh-nang-tai-video', label: '5. 📥 Tính năng 3: Nút tải nhanh như Cốc Cốc & Tải hàng loạt' },
  { id: 'web-downloader', label: '6. Tiện ích Web: Tải Video không Logo' },
  { id: 'dich-tieng-trung-web', label: '7. Tiện ích Web: Dịch Content Creator' },
  { id: 'vong-quay-may-man', label: '8. Tiện ích: Vòng quay may mắn (Lucky Spin)' },
  { id: 'kich-ban-thuc-te', label: '9. 💡 Ví dụ thực chiến (Cầm tay chỉ việc trọn bộ Extension)' },
  { id: 'faq', label: '10. Câu hỏi thường gặp (FAQ)' },
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
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-bold text-xs">{step}</span>
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

export default function TienIchGuidePage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-64px)] bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 flex gap-10">
        {/* Table of Contents */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-6 space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 px-2">Cầm tay chỉ việc</p>
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

        {/* Main Content */}
        <main className="flex-1 min-w-0 max-w-3xl space-y-12 pb-24">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Hướng dẫn: Bộ Tiện ích & VCB Chrome Extension</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Trọn bộ công cụ đắc lực cho Creator: Cài Extension tự dịch tiếng Trung bằng phím Tab, nút Đề xuất video 1-click, tải video No-watermark và Vòng quay may mắn.
              </p>
            </div>
          </div>

          {/* Section 1: Overview */}
          <Section id="tong-quan" title="1. Tổng quan Bộ Tiện ích & Extension">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-purple-500"><Puzzle size={18} /> 1. VCB Chrome Extension</p>
                <p className="text-xs text-muted-foreground">Tự dịch tiếng Trung trong thanh tìm kiếm Douyin/XHS, nút Đề xuất video vào VCB, tải nhanh video không logo.</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-blue-500"><DownloadCloud size={18} /> 2. Web Video Downloader</p>
                <p className="text-xs text-muted-foreground">Dán link bất kỳ tải ngay video gốc 1080p, bóc tách tệp nhạc nền MP3.</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-emerald-500"><Languages size={18} /> 3. Dịch Content Tiếng Trung</p>
                <p className="text-xs text-muted-foreground">Dịch kịch bản video theo văn phong Creator, tự tách câu ngắn để đọc voice.</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-amber-500"><Gift size={18} /> 4. Vòng quay may mắn (Lucky Spin)</p>
                <p className="text-xs text-muted-foreground">Minigame bốc thăm, vinh danh thành viên trong các buổi họp và sự kiện.</p>
              </div>
            </div>
          </Section>

          {/* Section 2: Chrome Extension Install */}
          <Section id="cai-dat-extension" title="2. 🧩 Hướng dẫn cài đặt VCB Chrome Extension (Chỉ 1 phút)">
            <p>
              <strong>VCB Video Downloader Extension</strong> hỗ trợ tất cả các trình duyệt: <strong>Google Chrome, Microsoft Edge, Cốc Cốc, Brave</strong>.
            </p>

            <ActionBox step="Các bước cài đặt" title="Cài đặt qua chế độ Developer Mode">
              <ol className="list-decimal pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  Bấm nút tải file cài đặt:{' '}
                  <a
                    href="/extensions/vcb-video-downloader.zip"
                    download
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors"
                  >
                    <Download size={12} /> Tải vcb-video-downloader.zip
                  </a>
                </li>
                <li>
                  <strong>Giải nén file zip</strong> vừa tải về thành một thư mục trên máy tính (ví dụ: <code>Downloads/vcb-video-downloader</code>).
                </li>
                <li>
                  Mở trình duyệt, gõ vào thanh địa chỉ: <Tag>chrome://extensions</Tag> (hoặc <Tag>edge://extensions</Tag> nếu dùng Edge).
                </li>
                <li>
                  Gạt công tắc <strong>"Chế độ dành cho nhà phát triển" (Developer mode)</strong> ở góc trên bên phải màn hình.
                </li>
                <li>
                  Bấm nút <strong>"Tải tiện ích đã giải nén" (Load unpacked)</strong> ở góc trên bên trái ➔ Chọn thư mục vừa giải nén.
                </li>
                <li>
                  <strong>Hoàn tất!</strong> Hãy bấm vào biểu tượng mảnh ghép trên thanh trình duyệt và ghim (Pin) VCB Extension lên thanh công cụ.
                </li>
              </ol>
            </ActionBox>
          </Section>

          {/* Section 3: Tab Translate Feature */}
          <Section id="tinh-nang-dich-tab" title="3. ⚡ Tính năng 1: Gõ tiếng Việt ➔ Bấm [Tab] tự dịch tiếng Trung trên Douyin">
            <p>
              Đây là tính năng độc quyền cực kỳ tiện lợi giúp bạn không biết tiếng Trung vẫn tìm kiếm video trên Douyin, Xiaohongshu, Bilibili, Kuaishou như người bản địa:
            </p>

            <div className="border border-amber-500/30 rounded-xl p-4 bg-amber-500/5 space-y-3 text-xs md:text-sm">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                <Keyboard size={18} />
                <span>Cách hoạt động của Phím [Tab] thần thánh:</span>
              </div>
              <ol className="list-decimal pl-5 space-y-2 text-foreground/90">
                <li>
                  Bạn truy cập trực tiếp vào các trang mạng xã hội Trung Quốc: <code>douyin.com</code>, <code>xiaohongshu.com</code>, <code>bilibili.com</code>, hoặc <code>kuaishou.com</code>.
                </li>
                <li>
                  Bấm vào <strong>ô tìm kiếm</strong> của trang web đó và gõ từ khóa bằng <strong>TIẾNG VIỆT CÓ DẤU</strong> (ví dụ: <code>máy hút bụi cầm tay</code> hoặc <code>nồi chiên không dầu</code>).
                </li>
                <li>
                  Ngay lập tức, Extension sẽ hiển thị một thanh gợi ý màu vàng ngay dưới con trỏ:
                  <div className="p-2.5 my-1.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs border border-amber-500/40 flex items-center justify-between">
                    <span>💡 [Tab] Dịch sang chữ Hán: <strong className="text-amber-400">空气炸锅</strong></span>
                    <span className="text-[10px] bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded font-bold">Nhấn Tab</span>
                  </div>
                </li>
                <li>
                  Bạn chỉ cần <strong>nhấn phím [Tab]</strong> (hoặc click chuột vào thanh gợi ý) ➔ Ô tìm kiếm sẽ tự động thay thế bằng chữ Hán chuẩn và bạn chỉ việc Enter để ra ngay kho video!
                </li>
              </ol>
            </div>
          </Section>

          {/* Section 4: Propose Feature */}
          <Section id="tinh-nang-de-xuat" title="4. ★ Tính năng 2: Nút 'Đề xuất vào VCB' (1-Click đẩy vào kho)">
            <p>
              Khi lướt web trên TikTok, Douyin, YouTube Shorts, Instagram, Facebook và phát hiện một video có ý tưởng hay ho:
            </p>

            <div className="border border-purple-500/30 rounded-xl p-4 bg-purple-500/5 space-y-3 text-xs md:text-sm">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
                <Star size={18} />
                <span>Đề xuất video về hệ thống chỉ với 1 cú click:</span>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-foreground/90">
                <li>
                  <strong>Cách 1 (Qua nút nổi):</strong> Rê chuột vào video đang phát ➔ Bấm vào nút tím <strong>[ ★ Đề xuất vào VCB ]</strong>.
                </li>
                <li>
                  <strong>Cách 2 (Qua menu chuột phải):</strong> Nhấp chuột phải vào video ➔ Chọn <strong>"Đề xuất video này vào VCB"</strong>.
                </li>
                <li>
                  <strong>Kết quả:</strong> Video (kèm tiêu đề, ảnh bìa, link gốc) sẽ được tự động lưu thẳng vào <strong>Kho đề xuất / Thư viện Video</strong> của công ty. Bạn hoặc đồng nghiệp có thể mở hệ thống ra và thấy ngay video này để tiến hành viết kịch bản và sản xuất!
                </li>
              </ul>
            </div>
          </Section>

          {/* Section 5: Extension Downloader */}
          <Section id="tinh-nang-tai-video" title="5. 📥 Tính năng 3: Nút tải nhanh như Cốc Cốc & Tải hàng loạt">
            <div className="grid sm:grid-cols-2 gap-3 text-xs md:text-sm">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <p className="font-bold text-purple-500 flex items-center gap-1.5">
                  <Play size={16} /> Rê chuột hiện nút tải
                </p>
                <p className="text-muted-foreground text-xs">
                  Rê chuột vào video trên bất kỳ trang web nào, nút tải màu tím sẽ hiện lên ở góc video. Bạn có thể chọn tải nhanh <strong>MP4 1080p</strong> hoặc <strong>tách riêng nhạc nền MP3</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <p className="font-bold text-blue-500 flex items-center gap-1.5">
                  <Layers size={16} /> Tải tất cả video trên trang
                </p>
                <p className="text-muted-foreground text-xs">
                  Bấm vào biểu tượng VCB Extension trên thanh trình duyệt ➔ Chọn <strong>"Tải tất cả video trên trang"</strong> để quét toàn bộ các clip đang hiển thị và tải lần lượt trong 1 lần bấm.
                </p>
              </div>
            </div>
          </Section>

          {/* Section 6: Web Downloader */}
          <Section id="web-downloader" title="6. Tiện ích Web: Tải Video không Logo (Downloader)">
            <p>Nếu bạn không cài extension, có thể dùng công cụ trực tiếp trên web tại <Tag>/dashboard/tools/video-downloader</Tag>:</p>
            <ActionBox step="3 Bước Tải Web" title="Dán link lấy video sạch">
              <ol className="list-decimal pl-5 space-y-1.5 text-xs md:text-sm">
                <li>Copy link video Douyin, TikTok, Facebook Reels, YouTube Shorts.</li>
                <li>Dán vào ô nhập liệu và bấm <UIButton color="blue">Phân tích & Tải xuống</UIButton>.</li>
                <li>Chọn tải: <strong>Video MP4 No-watermark</strong>, <strong>Nhạc MP3</strong>, hoặc <strong>Ảnh bìa HD</strong>.</li>
              </ol>
            </ActionBox>
          </Section>

          {/* Section 7: Web Chinese Translation */}
          <Section id="dich-tieng-trung-web" title="7. Tiện ích Web: Dịch Content Creator">
            <p>Truy cập tại: <Tag>/dashboard/content/generate?mode=translate-only</Tag></p>
            <div className="border border-border rounded-xl p-4 bg-card space-y-2 text-xs md:text-sm">
              <p className="text-muted-foreground">
                Chuyên dụng để dịch các bài viết, kịch bản, lời thoại tiếng Trung sang tiếng Việt. Tự động hiểu các thuật ngữ review bán hàng (秒杀, 沉浸式, 种草...) và ngắt sẵn nhịp câu dưới 15 chữ để phục vụ thu âm lồng tiếng và làm phụ đề video.
              </p>
            </div>
          </Section>

          {/* Section 8: Lucky Spin */}
          <Section id="vong-quay-may-man" title="8. Tiện ích: Vòng quay may mắn (Lucky Spin)">
            <p>Truy cập tại: <Tag>/dashboard/tools/lucky-spin</Tag></p>
            <div className="p-3 rounded-xl border border-border bg-card text-xs md:text-sm text-muted-foreground">
              Nhập danh sách tên thành viên trong team hoặc danh sách giải thưởng ➔ Bấm <strong>QUAY</strong> để bốc thăm ngẫu nhiên, vinh danh trong các buổi họp tuần hoặc sự kiện nội bộ.
            </div>
          </Section>

          {/* Section 9: Scenario */}
          <Section id="kich-ban-thuc-te" title="9. 💡 Ví dụ thực chiến (Lướt Douyin với trọn bộ Extension)">
            <div className="border-2 border-purple-500/40 rounded-2xl p-5 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-purple-600 text-white font-bold text-xs">Tình huống thực tế</span>
                <h4 className="font-bold text-foreground">Bạn muốn tìm ý tưởng video gia dụng mới trên Douyin</h4>
              </div>

              <div className="space-y-3 text-xs md:text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                  <div>Mở trình duyệt vào trang <code>douyin.com</code>. Bấm vào ô tìm kiếm gõ: <code>máy xay sinh tố</code>.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                  <div>Thanh gợi ý màu vàng hiện ra, bạn <strong>bấm phím [Tab]</strong> ➔ Ô tìm kiếm đổi thành <code>榨汁机</code> ➔ Bấm Enter ra kho video review máy xay!</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                  <div>Lướt thấy 1 clip đập hộp cực đẹp, bạn rê chuột vào video ➔ Bấm <strong>[ ★ Đề xuất vào VCB ]</strong> để lưu ý tưởng cho cả team.</div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">4</div>
                  <div>Bấm tiếp nút <strong>[ Tải MP4 No-watermark ]</strong> để lưu video gốc Full HD về máy cắt b-roll. Toàn bộ quy trình chỉ mất vài cú nhấp chuột ngay trên trang Douyin!</div>
                </div>
              </div>
            </div>
          </Section>

          {/* Section 10: FAQ */}
          <Section id="faq" title="10. Câu hỏi thường gặp (FAQ)">
            <div className="space-y-3 text-xs md:text-sm">
              <div className="border border-border rounded-xl p-3.5 bg-card">
                <p className="font-bold text-foreground">Q: Tính năng tự dịch bằng phím Tab hỗ trợ những trang web nào?</p>
                <p className="text-muted-foreground mt-1">A: Hỗ trợ tự động trên: Douyin (douyin.com), Xiaohongshu (xiaohongshu.com), Bilibili (bilibili.com) và Kuaishou (kuaishou.com).</p>
              </div>
              <div className="border border-border rounded-xl p-3.5 bg-card">
                <p className="font-bold text-foreground">Q: Làm sao để tắt/bật tính năng tự dịch tiếng Trung nếu không cần?</p>
                <p className="text-muted-foreground mt-1">A: Nhấp chuột phải vào biểu tượng Extension trên thanh công cụ ➔ Chọn <strong>Tùy chọn (Options)</strong> ➔ Gạt tắt công tắc <em>"Tự dịch tiếng Việt ➔ Tiếng Trung"</em>.</p>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
