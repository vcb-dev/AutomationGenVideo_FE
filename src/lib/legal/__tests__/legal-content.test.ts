import {
  LEGAL_DOCS,
  LEGAL_INFO,
  LEGAL_PATHS,
  LEGAL_UI,
  formatEffectiveDate,
  isLegalPath,
  splitHeading,
  legalHref,
  resolveLegalLang,
  type LegalDocument,
} from '@/lib/legal/legal-content';

const textOf = (doc: LegalDocument) =>
  [...doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap((b) => (typeof b === 'string' ? [b] : b.list))])]
    .join('\n');

const ALL = [
  ['privacy/vi', LEGAL_DOCS.privacy.vi],
  ['privacy/en', LEGAL_DOCS.privacy.en],
  ['terms/vi', LEGAL_DOCS.terms.vi],
  ['terms/en', LEGAL_DOCS.terms.en],
] as const;

describe('đường dẫn', () => {
  it('URL công khai khai báo với TikTok / Meta / Google', () => {
    expect(LEGAL_PATHS).toEqual({ privacy: '/privacy', terms: '/terms' });
  });

  it('không nằm dưới /dashboard (middleware chỉ chặn /dashboard)', () => {
    Object.values(LEGAL_PATHS).forEach((p) => expect(p.startsWith('/dashboard')).toBe(false));
  });

  it('legalHref: tiếng Việt không thêm tham số, tiếng Anh thêm ?lang=en', () => {
    expect(legalHref('privacy', 'vi')).toBe('/privacy');
    expect(legalHref('terms', 'en')).toBe('/terms?lang=en');
  });
});

describe('isLegalPath', () => {
  it.each([
    ['/privacy', true],
    ['/terms', true],
    ['/terms/', true],
    ['/privacy?lang=en', true],
    ['/', false],
    ['/login', false],
    ['/dashboard/privacy', false],
    ['/privacy-old', false],
    [null, false],
  ] as const)('%p → %s', (path, want) => {
    expect(isLegalPath(path)).toBe(want);
  });
});

describe('resolveLegalLang', () => {
  it.each([
    [undefined, 'vi'],
    ['', 'vi'],
    ['vi', 'vi'],
    ['fr', 'vi'],
    ['en', 'en'],
    ['EN', 'en'],
    [['en', 'vi'], 'en'],
  ] as const)('%p → %s', (raw, want) => {
    expect(resolveLegalLang(raw as string | string[] | undefined)).toBe(want);
  });
});

describe('formatEffectiveDate', () => {
  it('tiếng Việt dạng dd/mm/yyyy', () => {
    expect(formatEffectiveDate('2026-11-16', 'vi')).toBe('16/11/2026');
    expect(formatEffectiveDate('2026-01-05')).toBe('05/01/2026');
  });

  it('tiếng Anh dạng "November 16, 2026"', () => {
    expect(formatEffectiveDate('2026-11-16', 'en')).toBe('November 16, 2026');
  });

  it('chuỗi sai thì trả nguyên văn', () => {
    expect(formatEffectiveDate('abc', 'vi')).toBe('abc');
  });
});

describe('thông tin công ty', () => {
  it('trang web, email liên hệ và mã số đăng ký kinh doanh đã điền', () => {
    expect(LEGAL_INFO.siteUrl).toBe('https://app.vienchibao.com');
    expect(LEGAL_INFO.contactEmail).toBe('vienchibao.dev@gmail.com');
    expect(LEGAL_INFO.businessRegistration).toMatch(/^\d{10}$/);
  });

  it.each(ALL)('%s ghi email liên hệ và trang web', (_, doc) => {
    const text = textOf(doc);
    expect(text).toContain(LEGAL_INFO.contactEmail);
    expect(text).toContain(LEGAL_INFO.siteUrl);
  });
});

describe('Chính sách bảo mật', () => {
  it.each([['vi', LEGAL_DOCS.privacy.vi], ['en', LEGAL_DOCS.privacy.en]] as const)(
    '%s: nêu đủ các quyền TikTok xin',
    (_, doc) => {
      ['TikTok', 'user.info.basic', 'video.list', 'video.publish'].forEach((w) => expect(textOf(doc)).toContain(w));
    },
  );

  it('tiếng Việt: có ngắt kết nối, thu hồi quyền, xoá vĩnh viễn và cam kết không bán dữ liệu', () => {
    const t = textOf(LEGAL_DOCS.privacy.vi);
    expect(t).toMatch(/Ngắt kết nối/);
    expect(t).toMatch(/Thu hồi quyền/);
    expect(t).toMatch(/xoá vĩnh viễn/);
    expect(t).toMatch(/không bán thông tin cá nhân/);
  });

  it('tiếng Anh: có disconnect, revoke, permanently delete và do not sell', () => {
    const t = textOf(LEGAL_DOCS.privacy.en);
    expect(t).toMatch(/Disconnect/);
    expect(t).toMatch(/Revoke/);
    expect(t).toMatch(/permanently delete/);
    expect(t).toMatch(/do not sell/);
  });
});

describe('Điều khoản sử dụng', () => {
  it('nhắc tuân thủ điều khoản TikTok và chỉ nối tài khoản của mình', () => {
    expect(textOf(LEGAL_DOCS.terms.vi)).toMatch(/Điều khoản dịch vụ và Nguyên tắc cộng đồng của TikTok/);
    expect(textOf(LEGAL_DOCS.terms.vi)).toMatch(/sở hữu hoặc được uỷ quyền/);
    expect(textOf(LEGAL_DOCS.terms.en)).toContain('TikTok Terms of Service');
    expect(textOf(LEGAL_DOCS.terms.en)).toMatch(/own or are authorised to manage/);
  });
});

describe('cấu trúc tài liệu', () => {
  it.each(ALL)('%s: id mục không trùng, không có mục rỗng, mục cuối là liên hệ', (_, doc) => {
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    doc.sections.forEach((s) => expect(s.blocks.length).toBeGreaterThan(0));
    expect(ids[ids.length - 1]).toMatch(/^(lien-he|contact)$/);
  });

  it.each(ALL)('%s: các mục đánh số liên tục 1, 2, 3…', (_, doc) => {
    doc.sections.forEach((s, i) => expect(s.heading.startsWith(`${i + 1}. `)).toBe(true));
  });

  it('bản Việt và bản Anh có cùng số mục', () => {
    expect(LEGAL_DOCS.privacy.vi.sections.length).toBe(LEGAL_DOCS.privacy.en.sections.length);
    expect(LEGAL_DOCS.terms.vi.sections.length).toBe(LEGAL_DOCS.terms.en.sections.length);
  });

  it('chữ trên khung trang có đủ cho cả hai ngôn ngữ', () => {
    expect(Object.keys(LEGAL_UI.vi).sort()).toEqual(Object.keys(LEGAL_UI.en).sort());
  });
});

describe('splitHeading', () => {
  it('tách số và chữ', () => {
    expect(splitHeading('3. Phạm vi chia sẻ')).toEqual({ num: '3', text: 'Phạm vi chia sẻ' });
    expect(splitHeading('10. Governing law')).toEqual({ num: '10', text: 'Governing law' });
  });

  it('không có số thì num rỗng', () => {
    expect(splitHeading('Liên hệ')).toEqual({ num: '', text: 'Liên hệ' });
  });
});

describe('khung tóm tắt', () => {
  it.each(ALL)('%s có 3–6 ý tóm tắt, không trùng', (_, doc) => {
    expect(doc.summary.length).toBeGreaterThanOrEqual(3);
    expect(doc.summary.length).toBeLessThanOrEqual(6);
    expect(new Set(doc.summary).size).toBe(doc.summary.length);
  });

  it('bản Việt và bản Anh có cùng số ý tóm tắt', () => {
    expect(LEGAL_DOCS.privacy.vi.summary.length).toBe(LEGAL_DOCS.privacy.en.summary.length);
    expect(LEGAL_DOCS.terms.vi.summary.length).toBe(LEGAL_DOCS.terms.en.summary.length);
  });
});
