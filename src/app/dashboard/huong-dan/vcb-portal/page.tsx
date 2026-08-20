'use client';

import type { ReactNode } from 'react';
import {
  LayoutGrid,
  Activity,
  Award,
  User,
  FileText,
  CheckSquare,
  ClipboardList,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb,
  Crown,
} from 'lucide-react';

const TOC: { id: string; label: string }[] = [
  { id: 'gioi-thieu', label: '1. Giới thiệu VCB Portal' },
  { id: 'hieu-suat', label: '2. Báo cáo Hiệu suất (Performance)' },
  { id: 'bang-xep-hang', label: '3. Bảng xếp hạng & Vinh danh (Ranking)' },
  { id: 'tien-do-ca-nhan', label: '4. Tiến độ công việc cá nhân' },
  { id: 'bao-cao-hang-ngay', label: '5. Báo cáo ngày (Daily Report)' },
  { id: 'checklist-cong-viec', label: '6. Checklist công việc hàng ngày' },
  { id: 'van-de-va-win', label: '7. Vấn đề phát sinh & Bài học Win' },
  { id: 'faq', label: '8. Câu hỏi thường gặp (FAQ)' },
];

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
        <p className="font-semibold mb-1 text-foreground">{title}</p>
        <div className="text-foreground/90 dark:text-foreground/80">{children}</div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <h2 className="text-xl font-bold border-b border-border pb-2 text-foreground">{title}</h2>
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

export default function VcbPortalGuidePage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-64px)] bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 flex gap-10">
        {/* Table of Contents */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-6 space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 px-2">Mục lục hướng dẫn</p>
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
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <LayoutGrid size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Hướng dẫn: VCB Portal (Quản trị Vận hành & Hiệu suất)</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Theo dõi hiệu suất làm việc, tiến độ KPI, báo cáo checklist hàng ngày và xếp hạng vinh danh nhân sự.
              </p>
            </div>
          </div>

          <Section id="gioi-thieu" title="1. Giới thiệu VCB Portal">
            <p>
              <strong>VCB Portal</strong> là không gian làm việc tập trung dành cho toàn bộ nhân sự (Editor, Content, Leader, Manager), giúp đo lường kết quả công việc minh bạch, ghi nhận đóng góp và duy trì kỷ luật vận hành hàng ngày.
            </p>
          </Section>

          <Section id="hieu-suat" title="2. Báo cáo Hiệu suất (Performance)">
            <p>Truy cập tại <Tag>/dashboard/manager/user-activity?tab=performance</Tag>:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4 bg-card">
                <p className="font-semibold mb-1 flex items-center gap-1.5 text-blue-500"><TrendingUp size={16} /> Chỉ số lượt xem & Tương tác</p>
                <p className="text-xs text-muted-foreground">Thống kê tổng lượt view, like, comment của tất cả video đã xuất bản theo tuần, tháng hoặc quý.</p>
              </div>
              <div className="rounded-xl border border-border p-4 bg-card">
                <p className="font-semibold mb-1 flex items-center gap-1.5 text-green-500"><BarChart3 size={16} /> Sản lượng sản xuất</p>
                <p className="text-xs text-muted-foreground">Theo dõi số lượng video đã hoàn thành, tỷ lệ duyệt đúng hạn và tốc độ trả bài của từng cá nhân.</p>
              </div>
            </div>
          </Section>

          <Section id="bang-xep-hang" title="3. Bảng xếp hạng & Vinh danh (Ranking)">
            <p>Truy cập tại <Tag>/dashboard/manager/user-activity?tab=ranking</Tag>:</p>
            <p className="text-sm text-muted-foreground">
              Bảng xếp hạng cập nhật theo thời gian thực dựa trên điểm sản lượng, video đạt mốc triệu view và tỷ lệ hoàn thành checklist. Top 3 thành viên dẫn đầu sẽ nhận được huy hiệu vinh danh và phần thưởng tương ứng từ quỹ khen thưởng.
            </p>
          </Section>

          <Section id="tien-do-ca-nhan" title="4. Tiến độ công việc cá nhân">
            <p>Truy cập tại <Tag>/dashboard/manager/user-activity?tab=personal</Tag>:</p>
            <p className="text-sm text-muted-foreground">
              Giúp từng nhân sự tự theo dõi tỷ lệ hoàn thành KPI trong tháng (ví dụ: mục tiêu 30 video/tháng), số task đang làm dở và danh sách các video cần chỉnh sửa lại theo yêu cầu của Leader.
            </p>
          </Section>

          <Section id="bao-cao-hang-ngay" title="5. Báo cáo ngày (Daily Report)">
            <p>Truy cập tại <Tag>/dashboard/manager/user-activity?tab=daily_report</Tag>:</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Cuối mỗi ngày làm việc (trước 18h00), nhân sự gửi báo cáo tổng kết gồm:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Danh sách các đầu việc/video đã hoàn thành trong ngày.</li>
                <li>Khối lượng công việc dự kiến cho ngày làm việc tiếp theo.</li>
                <li>Số liệu tăng trưởng traffic trên các kênh phụ trách.</li>
              </ul>
            </div>
          </Section>

          <Section id="checklist-cong-viec" title="6. Checklist công việc hàng ngày">
            <p>Truy cập tại <Tag>/dashboard/manager/user-activity?tab=daily_checklist</Tag>:</p>
            <p className="text-sm text-muted-foreground">
              Danh sách kiểm tra tiêu chuẩn chất lượng đầu ra (QA/QC) trước khi nộp video: Đúng tỷ lệ khung hình, âm lượng chuẩn không rè, phụ đề không lỗi chính tả, cover hấp dẫn đúng brand guideline.
            </p>
          </Section>

          <Section id="van-de-va-win" title="7. Vấn đề phát sinh & Bài học Win">
            <p>Truy cập tại <Tag>/dashboard/manager/user-activity?tab=daily_outstanding</Tag>:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4 bg-card">
                <p className="font-semibold mb-1 text-red-500">⚠️ Vấn đề phát sinh (Issues)</p>
                <p className="text-xs text-muted-foreground">Báo cáo các khó khăn về thiết bị, tài khoản kênh hoặc vướng mắc kỹ thuật để Leader hỗ trợ giải quyết kịp thời.</p>
              </div>
              <div className="rounded-xl border border-border p-4 bg-card">
                <p className="font-semibold mb-1 text-amber-500">🏆 Bài học thành công (Wins)</p>
                <p className="text-xs text-muted-foreground">Chia sẻ công thức làm video viral, tiêu đề hiệu quả hoặc cách tối ưu thời gian dựng để cả đội nhóm cùng học hỏi.</p>
              </div>
            </div>
          </Section>

          <Section id="faq" title="8. Câu hỏi thường gặp (FAQ)">
            <div className="space-y-4">
              <div className="border border-border rounded-xl p-4">
                <p className="font-semibold text-foreground">Q: Điểm bảng xếp hạng được tính như thế nào?</p>
                <p className="text-muted-foreground text-xs mt-1">A: Điểm tổng hợp được tính dựa trên: Số lượng video được duyệt (+10đ/video), Video đạt mốc 100k view (+20đ), Video đạt triệu view (+50đ), Nộp báo cáo và hoàn thành checklist đúng hạn hàng ngày (+5đ/ngày).</p>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
