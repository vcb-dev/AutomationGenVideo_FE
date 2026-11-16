import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { LEGAL_DOCS, LEGAL_INFO, resolveLegalLang } from '@/lib/legal/legal-content';

type Props = { searchParams?: { lang?: string | string[] } };

export function generateMetadata({ searchParams }: Props): Metadata {
  const doc = LEGAL_DOCS.privacy[resolveLegalLang(searchParams?.lang)];
  return { title: `${doc.title} - ${LEGAL_INFO.brandName}` };
}

export default function PrivacyPage({ searchParams }: Props) {
  return <LegalPage kind="privacy" lang={resolveLegalLang(searchParams?.lang)} />;
}
