import Image from 'next/image';
import Link from 'next/link';
import './fonts/legal-fonts.css';
import {
  LEGAL_DOCS,
  LEGAL_INFO,
  LEGAL_UI,
  formatEffectiveDate,
  legalHref,
  splitHeading,
  type LegalBlock,
  type LegalKind,
  type LegalLang,
} from '@/lib/legal/legal-content';

// Khung chung cho /privacy và /terms theo nhận diện Viễn Chí Bảo (vienchibao.com):
// nâu #4A330E, vàng #D1A55F, kem #F8F1E5, tiêu đề Cormorant SC, chữ Montserrat.
// Bố cục kiểu trang pháp lý chuyên nghiệp: dải tiêu đề, khung tóm tắt, mục lục dính bên trái
// (desktop), mục đánh số trong ô tròn, thẻ liên hệ, chân trang đen như web chính.
// Server component, không cần đăng nhập, không gọi API; màu cố định (không theo dark mode).
const BROWN = '#4A330E';
const GOLD = '#D1A55F';
const CREAM = '#F8F1E5';
const SERIF = "'VCB Cormorant SC', Georgia, serif";
const SANS = "'VCB Montserrat', Montserrat, system-ui, sans-serif";

function Diamond({ size = 6, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block rotate-45 shrink-0 ${className}`}
      style={{ width: size, height: size, background: GOLD }}
    />
  );
}

/** Đường kẻ trang trí: — ◆ — */
function Ornament() {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      <span className="h-px w-12" style={{ background: GOLD }} />
      <Diamond size={7} />
      <span className="h-px w-12" style={{ background: GOLD }} />
    </div>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p className="mb-4">{block}</p>;
  return (
    <ul className="mb-4 space-y-3">
      {block.list.map((item) => (
        <li key={item} className="flex gap-3">
          <Diamond className="mt-[0.6em]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LegalPage({ kind, lang }: { kind: LegalKind; lang: LegalLang }) {
  const doc = LEGAL_DOCS[kind][lang];
  const ui = LEGAL_UI[lang];
  const other: LegalLang = lang === 'vi' ? 'en' : 'vi';
  const pageName = kind === 'privacy' ? ui.privacyLink : ui.termsLink;

  return (
    <div id="top" lang={lang} className="min-h-screen flex flex-col bg-white text-[#3a3a3a]" style={{ fontFamily: SANS, fontWeight: 500 }}>
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#eee]">
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${BROWN}, ${GOLD}, ${BROWN})` }} />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 h-[80px] flex items-center justify-center">
          {/* File logo có nhiều khoảng trắng quanh hình: phóng ảnh to rồi cắt khung để logo rõ hơn. */}
          <Link href="/" aria-label={LEGAL_INFO.brandName} className="w-[100px] h-[72px] overflow-hidden flex items-center justify-center">
            <Image src="/logo-vcb-gold.png" alt={LEGAL_INFO.brandName} width={240} height={240} className="w-[118px] h-[118px] max-w-none object-contain translate-y-[3px]" priority />
          </Link>
          <nav className="absolute right-4 sm:right-6 flex items-center rounded-full border border-[#e8dcc6] p-0.5 text-[11px] tracking-widest" aria-label="Language">
            {(['vi', 'en'] as const).map((l) =>
              l === lang ? (
                <span key={l} className="px-2.5 py-1 rounded-full text-white" style={{ background: BROWN, fontWeight: 700 }}>
                  {l.toUpperCase()}
                </span>
              ) : (
                <Link key={l} href={legalHref(kind, l)} hrefLang={l} className="px-2.5 py-1 rounded-full text-[#8a7a60] hover:text-[#4A330E] transition-colors">
                  {l.toUpperCase()}
                </Link>
              ),
            )}
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: CREAM }}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-5 pb-12 sm:pb-14">
          <nav className="text-[12px] sm:text-[13px]" aria-label="Breadcrumb">
            <Link href="/" className="text-[#9a8b73] hover:text-[#4A330E] transition-colors">{ui.home}</Link>
            <span className="mx-2.5 text-[#c9b994]">/</span>
            <span style={{ color: BROWN }}>{pageName}</span>
          </nav>
          <div className="text-center mt-8 sm:mt-10">
            <p className="uppercase tracking-[0.3em] text-[11px] mb-3" style={{ color: GOLD, fontWeight: 700 }}>
              {LEGAL_INFO.brandName} · {LEGAL_INFO.serviceName}
            </p>
            <h1 className="uppercase text-[30px] sm:text-[44px] leading-[1.15] mb-5" style={{ fontFamily: SERIF, color: BROWN }}>
              {doc.title}
            </h1>
            <Ornament />
            <p className="mt-5 text-[13px] text-[#7a6a50]">
              {ui.effective}: <span style={{ color: BROWN, fontWeight: 700 }}>{formatEffectiveDate(LEGAL_INFO.effectiveDate, lang)}</span>
              <span className="mx-3 text-[#c9b994]">|</span>
              <Link href={legalHref(kind, other)} hrefLang={other} className="underline underline-offset-4 decoration-[#D1A55F] hover:text-[#4A330E]">
                {ui.otherLang}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* BODY */}
      <div className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
        {/* MỤC LỤC (desktop) */}
        <aside className="hidden lg:block">
          <nav className="sticky top-[100px]" aria-label={ui.toc}>
            <p className="uppercase tracking-[0.2em] text-[11px] mb-4" style={{ color: GOLD, fontWeight: 700 }}>{ui.toc}</p>
            <ol className="border-l border-[#eadfca] space-y-0.5 text-[13px] leading-snug">
              {doc.sections.map((s) => {
                const h = splitHeading(s.heading);
                return (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="flex gap-2 -ml-px pl-4 py-1.5 border-l-2 border-transparent text-[#6b5d47] hover:text-[#4A330E] hover:border-[#D1A55F] transition-colors">
                      <span className="tabular-nums" style={{ color: GOLD }}>{h.num}</span>
                      <span>{h.text}</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        <main className="max-w-[760px] text-[15px] leading-[1.8]">
          {/* TÓM TẮT */}
          <div className="rounded-2xl border border-[#eadfca] mb-10 overflow-hidden" style={{ background: CREAM }}>
            <div className="px-6 sm:px-8 pt-6 pb-2 flex items-center gap-3">
              <Diamond size={8} />
              <p className="uppercase tracking-[0.2em] text-[12px]" style={{ color: BROWN, fontWeight: 700 }}>{ui.summary}</p>
            </div>
            <ul className="px-6 sm:px-8 pb-6 pt-2 grid gap-x-8 gap-y-3 sm:grid-cols-2 text-[14px] leading-relaxed">
              {doc.summary.map((item) => (
                <li key={item} className="flex gap-3">
                  <svg viewBox="0 0 20 20" className="w-[18px] h-[18px] mt-0.5 shrink-0" aria-hidden="true">
                    <circle cx="10" cy="10" r="10" fill={GOLD} />
                    <path d="M5.5 10.2l3 3 6-6.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ color: BROWN }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {doc.intro.map((p) => (
            <p key={p} className="mb-4 text-[#555]">{p}</p>
          ))}

          {doc.sections.map((section) => {
            const h = splitHeading(section.heading);
            return (
              <section key={section.id} id={section.id} className="scroll-mt-[100px] pt-8 mt-8 border-t border-[#f0e8d8] first-of-type:border-t-0">
                <h2 className="flex items-center gap-4 text-[19px] sm:text-[21px] leading-snug mb-4" style={{ color: BROWN, fontWeight: 700 }}>
                  {h.num && (
                    <span className="flex items-center justify-center w-9 h-9 rounded-full text-[14px] shrink-0 border" style={{ borderColor: GOLD, color: GOLD }}>
                      {h.num}
                    </span>
                  )}
                  {h.text}
                </h2>
                <div className="sm:pl-[52px]">
                  {section.blocks.map((block, i) => (
                    <Block key={i} block={block} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* THẺ LIÊN HỆ */}
          <div className="mt-12 rounded-2xl px-6 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8" style={{ background: BROWN }}>
            <div className="flex-1">
              <p className="text-[22px] sm:text-[26px] leading-tight mb-2 text-white" style={{ fontFamily: SERIF }}>{ui.contactTitle}</p>
              <p className="text-[13px] leading-relaxed text-[#e6d8bd]">{ui.contactBody}</p>
            </div>
            <a
              href={`mailto:${LEGAL_INFO.contactEmail}`}
              className="inline-flex flex-col items-center justify-center rounded-full px-6 py-3 text-center transition-opacity hover:opacity-90 shrink-0"
              style={{ background: GOLD, color: BROWN }}
            >
              <span className="text-[13px] uppercase tracking-widest" style={{ fontWeight: 700 }}>{ui.contactCta}</span>
              <span className="text-[12px]">{LEGAL_INFO.contactEmail}</span>
            </a>
          </div>

          <p className="mt-8 text-right text-[13px]">
            <a href="#top" className="text-[#9a8b73] hover:text-[#4A330E] transition-colors">↑ {ui.backToTop}</a>
          </p>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="bg-black text-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-[1fr_1.4fr_auto] text-[14px]">
          <div>
            <p className="uppercase tracking-wide mb-4 text-[15px]">{ui.termsGroup}</p>
            <ul className="space-y-3 text-[#ddd]">
              <li><Link href={legalHref('terms', lang)} className="hover:text-[#D1A55F] transition-colors">{ui.termsLink}</Link></li>
              <li><Link href={legalHref('privacy', lang)} className="hover:text-[#D1A55F] transition-colors">{ui.privacyLink}</Link></li>
            </ul>
          </div>
          <div className="space-y-3 text-[#ddd]">
            <p className="uppercase tracking-wide text-[15px] text-white">{LEGAL_INFO.companyName}</p>
            <p className="text-[12px] text-[#999]">{ui.hotline}</p>
            <p className="flex flex-wrap items-center gap-3">
              {LEGAL_INFO.hotlines.map((h, i) => (
                <span key={h} className="flex items-center gap-3">
                  {i > 0 && <Diamond size={8} />}
                  <a href={`tel:${h.replace(/\./g, '')}`} className="hover:text-[#D1A55F] transition-colors">{h}</a>
                </span>
              ))}
            </p>
            <p>{ui.address}: {LEGAL_INFO.officeAddress}</p>
            <p>
              {ui.email}:{' '}
              <a href={`mailto:${LEGAL_INFO.contactEmail}`} className="hover:text-[#D1A55F] transition-colors">{LEGAL_INFO.contactEmail}</a>
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <Image src="/logo-vcb-gold.png" alt="" width={120} height={120} className="w-28 h-28 object-contain -my-4" />
            <p className="text-[11px] text-[#bbb]">{ui.registration}: {LEGAL_INFO.businessRegistration}</p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-[12px] text-[#888]">
          Copyright {new Date(`${LEGAL_INFO.effectiveDate}T00:00:00Z`).getUTCFullYear()} © {LEGAL_INFO.brandName}
        </div>
      </footer>
    </div>
  );
}
