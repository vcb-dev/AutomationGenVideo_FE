import Image from 'next/image';
import Link from 'next/link';
import './fonts/legal-fonts.css';
import { LEGAL_INFO, LEGAL_UI, legalHref, type LegalLang } from '@/lib/legal/legal-content';

// Chân trang đen theo kiểu vienchibao.com, dùng chung cho trang chủ và /privacy, /terms:
// link Điều khoản / Chính sách bảo mật, thông tin công ty, logo + mã số đăng ký kinh doanh.
// Không dùng hook nên đặt được trong cả server component lẫn client component.
const GOLD = '#D1A55F';
const SANS = "'VCB Montserrat', Montserrat, system-ui, sans-serif";

function Diamond() {
  return <span aria-hidden="true" className="inline-block w-2 h-2 rotate-45 shrink-0" style={{ background: GOLD }} />;
}

export default function LegalFooter({ lang = 'vi' }: { lang?: LegalLang }) {
  const ui = LEGAL_UI[lang];
  return (
    <footer className="bg-black text-white" style={{ fontFamily: SANS, fontWeight: 500 }}>
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
                {i > 0 && <Diamond />}
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
  );
}
