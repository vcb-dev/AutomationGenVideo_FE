// Nội dung trang Chính sách bảo mật (/privacy) và Điều khoản sử dụng (/terms).
// Bản chính tiếng Việt (giống vienchibao.com); có thêm bản tiếng Anh (?lang=en) cho người duyệt
// app của TikTok / Meta / Google. Hai trang mở được khi chưa đăng nhập (middleware chỉ chặn /dashboard).

export const LEGAL_INFO = {
  companyName: 'Công ty TNHH Trang Sức Viễn Chí Bảo',
  companyNameEn: 'Vien Chi Bao Jewelry Company Limited (Công ty TNHH Trang Sức Viễn Chí Bảo)',
  brandName: 'Viễn Chí Bảo',
  serviceName: 'VCBI',
  siteUrl: 'https://app.vienchibao.com',
  /** Hộp thư nhận yêu cầu về quyền riêng tư và xoá dữ liệu. */
  contactEmail: 'vienchibao.dev@gmail.com',
  hotlines: ['086.836.6662', '094.536.6662'],
  officeAddress: '39 Cầu Diễn, Xuân Phương, Hà Nội',
  businessRegistration: '0107994675',
  /** Ngày hiệu lực, định dạng YYYY-MM-DD. */
  effectiveDate: '2026-11-16',
} as const;

export const LEGAL_PATHS = {
  privacy: '/privacy',
  terms: '/terms',
} as const;

export type LegalLang = 'vi' | 'en';
export type LegalKind = keyof typeof LEGAL_PATHS;

export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  /** Vài ý chính hiển thị trong khung Tóm tắt đầu trang. */
  summary: string[];
  intro: string[];
  sections: LegalSection[];
}

/** Trang pháp lý công khai — dùng để ẩn các phần chỉ dành cho người dùng hệ thống (vd popup cài PWA). */
export function isLegalPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return Object.values(LEGAL_PATHS).some((p) => clean === p);
}

/** ?lang=en → tiếng Anh, còn lại tiếng Việt. Next có thể truyền mảng khi lặp tham số. */
export function resolveLegalLang(raw: string | string[] | undefined): LegalLang {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v?.toLowerCase() === 'en' ? 'en' : 'vi';
}

/** Đường dẫn trang theo ngôn ngữ; tiếng Việt là mặc định nên không thêm tham số. */
export function legalHref(kind: LegalKind, lang: LegalLang): string {
  return lang === 'en' ? `${LEGAL_PATHS[kind]}?lang=en` : LEGAL_PATHS[kind];
}

/** Ngày hiệu lực: "16/11/2026" (vi) hoặc "November 16, 2026" (en); cố định UTC để server/client giống nhau. */
export function formatEffectiveDate(iso: string, lang: LegalLang = 'vi'): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang === 'vi') {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

const I = LEGAL_INFO;

// ------------------------------------------------------------------ Tiếng Việt

const PRIVACY_VI: LegalDocument = {
  title: 'Chính sách bảo mật thông tin',
  summary: [
    'Chỉ nhận dữ liệu TikTok tương ứng với quyền quý khách đã cấp.',
    'Chỉ đăng nội dung khi chính quý khách thao tác.',
    'Mã truy cập được mã hoá AES-256-GCM khi lưu trữ.',
    'Không bán dữ liệu và không dùng dữ liệu cho quảng cáo.',
    'Ngắt kết nối hoặc yêu cầu xoá dữ liệu bất cứ lúc nào.',
  ],
  intro: [
    `Chính sách này giải thích cách ${I.companyName} ("chúng tôi") thu thập, sử dụng và bảo vệ thông tin khi quý khách sử dụng hệ thống ${I.serviceName} tại ${I.siteUrl}, bao gồm khi quý khách kết nối tài khoản TikTok, Facebook, Instagram, Threads hoặc YouTube.`,
  ],
  sections: [
    {
      id: 'thong-tin-thu-thap',
      heading: '1. Thông tin chúng tôi thu thập',
      blocks: [
        'Thông tin tài khoản: họ tên, email và ảnh đại diện khi quý khách đăng nhập bằng email hoặc Google.',
        'Tài khoản mạng xã hội được kết nối: khi quý khách đăng nhập TikTok hoặc nền tảng khác và đồng ý cấp quyền, chúng tôi chỉ nhận dữ liệu tương ứng với quyền đã cấp:',
        {
          list: [
            'TikTok: mã định danh (open ID), tên hiển thị và ảnh đại diện (user.info.basic); danh sách video và số liệu công khai như lượt xem, thích, bình luận, chia sẻ (video.list); và khi quý khách chọn đăng bài, quyền tải lên hoặc đăng những video quý khách chọn (video.upload / video.publish).',
            'Facebook, Instagram, Threads và YouTube: tên, ảnh đại diện và ID của trang hoặc kênh quý khách chọn kết nối, cùng số liệu của bài đăng qua hệ thống.',
            'Mã truy cập (access token) do nền tảng cấp để hệ thống thao tác thay quý khách.',
          ],
        },
        'Nội dung quý khách tạo: video, ảnh bìa, chú thích, hashtag và lịch đăng.',
        'Dữ liệu kỹ thuật: địa chỉ IP, loại trình duyệt, thời điểm truy cập, dùng cho bảo mật và khắc phục lỗi.',
      ],
    },
    {
      id: 'muc-dich-su-dung',
      heading: '2. Mục đích sử dụng',
      blocks: [
        {
          list: [
            'Cho phép quý khách đăng nhập và hiển thị tài khoản TikTok hoặc mạng xã hội đã kết nối.',
            'Tải lên, lên lịch và đăng nội dung quý khách chọn, chỉ lên tài khoản quý khách đã kết nối và chỉ khi quý khách yêu cầu.',
            'Hiển thị số liệu video và bài đăng của chính quý khách.',
            'Vận hành, bảo mật, cải thiện hệ thống và hỗ trợ quý khách.',
          ],
        },
        'Chúng tôi không bán thông tin cá nhân, không dùng dữ liệu nhận từ TikTok hay nền tảng khác cho quảng cáo, và không đăng bất cứ nội dung gì lên tài khoản của quý khách khi quý khách chưa thao tác.',
      ],
    },
    {
      id: 'chia-se',
      heading: '3. Phạm vi chia sẻ',
      blocks: [
        {
          list: [
            'Với nền tảng quý khách đã kết nối (ví dụ TikTok) khi quý khách đăng nội dung lên đó.',
            'Với nhà cung cấp hạ tầng lưu trữ máy chủ, cơ sở dữ liệu và tệp (như Google Cloud, Google Drive), chỉ để vận hành hệ thống.',
            'Khi cơ quan nhà nước có thẩm quyền yêu cầu theo quy định pháp luật.',
          ],
        },
      ],
    },
    {
      id: 'luu-tru-bao-mat',
      heading: '4. Lưu trữ & bảo mật',
      blocks: [
        {
          list: [
            'Mã truy cập của tài khoản mạng xã hội được mã hoá AES-256-GCM khi lưu trữ; kết nối dùng HTTPS và hệ thống yêu cầu đăng nhập.',
            'Dữ liệu được lưu trong thời gian tài khoản hoặc kết nối còn hoạt động, hoặc cho đến khi quý khách yêu cầu xoá.',
          ],
        },
      ],
    },
    {
      id: 'quyen-khach-hang',
      heading: '5. Quyền của quý khách',
      blocks: [
        {
          list: [
            'Yêu cầu truy cập, chỉnh sửa hoặc xoá thông tin cá nhân bất kỳ lúc nào.',
            'Ngắt kết nối tài khoản TikTok hoặc mạng xã hội khác tại trang Kênh trong hệ thống; sau khi ngắt, hệ thống ngừng sử dụng tài khoản và mã truy cập đó.',
            'Thu hồi quyền ngay trên nền tảng, ví dụ trong TikTok: Cài đặt và quyền riêng tư > Bảo mật > Quản lý quyền ứng dụng.',
            'Yêu cầu xoá vĩnh viễn mã truy cập, tài khoản và toàn bộ dữ liệu liên quan qua email bên dưới; chúng tôi xử lý trong vòng 30 ngày.',
          ],
        },
      ],
    },
    {
      id: 'tre-em',
      heading: '6. Trẻ em',
      blocks: ['Hệ thống không dành cho người dưới 18 tuổi và chúng tôi không chủ động thu thập thông tin của trẻ em.'],
    },
    {
      id: 'thay-doi',
      heading: '7. Thay đổi chính sách',
      blocks: ['Chúng tôi có thể cập nhật chính sách này; ngày hiệu lực ở đầu trang sẽ được thay đổi và các thay đổi quan trọng sẽ được thông báo trong hệ thống.'],
    },
    {
      id: 'lien-he',
      heading: '8. Liên hệ',
      blocks: [`Mọi câu hỏi hoặc yêu cầu về dữ liệu, vui lòng liên hệ ${I.companyName} qua email ${I.contactEmail}.`],
    },
  ],
};

const TERMS_VI: LegalDocument = {
  title: 'Điều khoản sử dụng',
  summary: [
    'Chỉ kết nối tài khoản quý khách sở hữu hoặc được uỷ quyền quản lý.',
    'Nội dung quý khách tải lên vẫn thuộc về quý khách.',
    'Việc đăng bài tuân theo điều khoản của TikTok và từng nền tảng.',
    'Không dùng hệ thống để spam hay thao túng tương tác.',
  ],
  intro: [
    `Khi quý khách truy cập và sử dụng hệ thống ${I.serviceName} tại ${I.siteUrl} do ${I.companyName} vận hành, có nghĩa là quý khách đồng ý với các điều khoản sử dụng này. Chúng tôi có quyền thay đổi, chỉnh sửa, thêm hoặc lược bỏ bất kỳ phần nào trong điều khoản vào bất cứ lúc nào; việc tiếp tục sử dụng sau khi thay đổi được đăng tải đồng nghĩa với việc quý khách chấp nhận những thay đổi đó.`,
    'Quý khách vui lòng kiểm tra thường xuyên để cập nhật những thay đổi của chúng tôi.',
  ],
  sections: [
    {
      id: 'dich-vu',
      heading: '1. Dịch vụ',
      blocks: [
        'Hệ thống giúp quý khách quản lý nội dung video, kết nối tài khoản TikTok và các mạng xã hội khác, tải lên, lên lịch và đăng video của chính quý khách lên các tài khoản đó, và xem số liệu.',
      ],
    },
    {
      id: 'tai-khoan',
      heading: '2. Tài khoản',
      blocks: [
        {
          list: [
            'Người dùng phải từ 18 tuổi trở lên.',
            'Quý khách chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động trên tài khoản của mình, và phải báo ngay cho chúng tôi khi tài khoản bị truy cập trái phép.',
          ],
        },
      ],
    },
    {
      id: 'tai-khoan-mxh',
      heading: '3. Tài khoản mạng xã hội được kết nối',
      blocks: [
        {
          list: [
            'Quý khách chỉ được kết nối tài khoản mình sở hữu hoặc được uỷ quyền quản lý.',
            'Khi kết nối TikTok hoặc nền tảng khác, quý khách cho phép hệ thống thao tác trên tài khoản đó trong phạm vi quyền đã cấp, như đăng nội dung quý khách chọn.',
            'Việc sử dụng từng nền tảng vẫn tuân theo điều khoản riêng của nền tảng đó, bao gồm Điều khoản dịch vụ và Nguyên tắc cộng đồng của TikTok.',
            'Quý khách có thể ngắt kết nối bất kỳ lúc nào trong hệ thống hoặc thu hồi quyền trên nền tảng.',
          ],
        },
      ],
    },
    {
      id: 'noi-dung',
      heading: '4. Nội dung của quý khách',
      blocks: [
        {
          list: [
            'Quý khách giữ toàn bộ quyền đối với nội dung tải lên; chúng tôi chỉ lưu trữ, xử lý và truyền nội dung đó khi cần để cung cấp dịch vụ, như đăng lên tài khoản quý khách chọn.',
            'Quý khách chịu trách nhiệm về nội dung của mình và cam kết có quyền đăng tải, không vi phạm pháp luật hay chính sách của nền tảng.',
          ],
        },
      ],
    },
    {
      id: 'hanh-vi-cam',
      heading: '5. Hành vi bị nghiêm cấm',
      blocks: [
        {
          list: [
            'Đăng nội dung spam, sai sự thật hoặc xâm phạm quyền của người khác.',
            'Dùng hệ thống để thao túng tương tác hoặc truy cập tài khoản không được phép.',
            'Sử dụng bất kỳ chương trình, công cụ hay hình thức nào để can thiệp, phá hoại hoặc xâm nhập trái phép vào hệ thống.',
          ],
        },
      ],
    },
    {
      id: 'ben-thu-ba',
      heading: '6. Dịch vụ bên thứ ba',
      blocks: [
        'Hệ thống dựa vào các nền tảng bên thứ ba như TikTok, Meta, Google và YouTube. Chúng tôi không chịu trách nhiệm về việc gián đoạn, thay đổi API hay các hành động của những nền tảng này đối với tài khoản của quý khách.',
      ],
    },
    {
      id: 'thuong-hieu',
      heading: '7. Thương hiệu và bản quyền',
      blocks: [
        `Mọi quyền sở hữu trí tuệ đối với thiết kế, phần mềm, mã nguồn và giao diện của hệ thống là tài sản của ${I.companyName} và được bảo hộ theo luật bản quyền của Việt Nam.`,
      ],
    },
    {
      id: 'cham-dut',
      heading: '8. Tạm ngưng và chấm dứt',
      blocks: [
        'Quý khách có thể ngừng sử dụng bất kỳ lúc nào. Chúng tôi có thể tạm ngưng hoặc chấm dứt quyền truy cập nếu quý khách vi phạm điều khoản hoặc khi cần để bảo vệ hệ thống và người dùng khác.',
      ],
    },
    {
      id: 'mien-tru',
      heading: '9. Giới hạn trách nhiệm',
      blocks: [
        'Hệ thống được cung cấp theo hiện trạng. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm cho thiệt hại gián tiếp hoặc việc nội dung không đăng được do lỗi từ nền tảng bên thứ ba.',
      ],
    },
    {
      id: 'quyen-phap-ly',
      heading: '10. Quyền pháp lý',
      blocks: [
        'Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam và Toà án có thẩm quyền tại Việt Nam sẽ giải quyết mọi tranh chấp phát sinh.',
      ],
    },
    {
      id: 'lien-he',
      heading: '11. Liên hệ',
      blocks: [`Mọi thắc mắc về điều khoản, vui lòng liên hệ ${I.companyName} qua email ${I.contactEmail}.`],
    },
  ],
};

// ------------------------------------------------------------------ English (cho người duyệt app)

const PRIVACY_EN: LegalDocument = {
  title: 'Privacy Policy',
  summary: [
    'We only receive the TikTok data covered by the permissions you grant.',
    'We only post content when you take the action yourself.',
    'Access tokens are encrypted at rest with AES-256-GCM.',
    'We never sell your data or use it for advertising.',
    'Disconnect or request deletion of your data at any time.',
  ],
  intro: [
    `This Privacy Policy explains how ${I.companyNameEn} ("we", "us") collects, uses and protects information when you use ${I.serviceName} at ${I.siteUrl} (the "Service"), including when you connect your TikTok, Facebook, Instagram, Threads or YouTube account to it.`,
  ],
  sections: [
    {
      id: 'information-we-collect',
      heading: '1. Information we collect',
      blocks: [
        'Account information: your name, email address and profile picture when you sign in with email or Google.',
        'Connected social accounts: when you log in with TikTok or another platform and grant permission, we receive only the data for the permissions you approved:',
        {
          list: [
            'TikTok: your open ID, display name and avatar (user.info.basic); the list of your videos and their public statistics such as views, likes, comments and shares (video.list); and, when you choose to post, the ability to upload or publish the videos you select (video.upload / video.publish).',
            'Facebook, Instagram, Threads and YouTube: the name, avatar and ID of the pages or channels you choose to connect, and statistics for posts published through the Service.',
            'Access tokens issued by the platform so the Service can act on your behalf.',
          ],
        },
        'Content you provide: videos, thumbnails, captions, hashtags and schedules.',
        'Technical data: IP address, browser type and time of requests, used for security and troubleshooting.',
      ],
    },
    {
      id: 'how-we-use',
      heading: '2. How we use information',
      blocks: [
        {
          list: [
            'To let you log in and show which TikTok or other social account is connected.',
            'To upload, schedule and publish the content you choose, only to the account you connected and only when you ask us to.',
            'To show you statistics about your own videos and posts.',
            'To operate, secure and improve the Service and support you.',
          ],
        },
        'We do not sell your personal information, we do not use data received from TikTok or other platforms for advertising, and we do not post anything to your account without your action.',
      ],
    },
    {
      id: 'sharing',
      heading: '3. How we share information',
      blocks: [
        {
          list: [
            'With the platform you connected (for example TikTok) when you publish content to it.',
            'With providers that host our servers, database and file storage (such as Google Cloud and Google Drive), only to operate the Service.',
            'When required by law.',
          ],
        },
      ],
    },
    {
      id: 'storage-security',
      heading: '4. Storage and security',
      blocks: [
        {
          list: [
            'Access tokens for connected social accounts are encrypted at rest with AES-256-GCM; connections use HTTPS and the Service requires login.',
            'We keep data while your account or connection is active, or until you ask us to delete it.',
          ],
        },
      ],
    },
    {
      id: 'your-rights',
      heading: '5. Your rights',
      blocks: [
        {
          list: [
            'Request access to, correction of or deletion of your personal information at any time.',
            'Disconnect a TikTok or other social account from the Channels page in the Service; after you disconnect, the Service stops using that account and its tokens.',
            'Revoke access on the platform itself, for example in TikTok under Settings and privacy > Security > Manage app permissions.',
            'Ask us by email to permanently delete your stored tokens, account and all associated data; we complete requests within 30 days.',
          ],
        },
      ],
    },
    {
      id: 'children',
      heading: "6. Children's privacy",
      blocks: ['The Service is not intended for anyone under 18, and we do not knowingly collect information from children.'],
    },
    {
      id: 'changes',
      heading: '7. Changes to this policy',
      blocks: ['We may update this policy. We will change the effective date above and notify users in the Service of significant changes.'],
    },
    {
      id: 'contact',
      heading: '8. Contact us',
      blocks: [`For questions or data requests, contact ${I.companyNameEn} at ${I.contactEmail}.`],
    },
  ],
};

const TERMS_EN: LegalDocument = {
  title: 'Terms of Service',
  summary: [
    'Only connect accounts you own or are authorised to manage.',
    'You keep all rights to the content you upload.',
    'Publishing follows the terms of TikTok and each platform.',
    'Do not use the Service for spam or engagement manipulation.',
  ],
  intro: [
    `These Terms of Service govern your use of ${I.serviceName} at ${I.siteUrl} (the "Service"), operated by ${I.companyNameEn}. By using the Service you agree to these Terms. We may change them at any time, and continued use after a change means you accept it.`,
  ],
  sections: [
    {
      id: 'service',
      heading: '1. The Service',
      blocks: [
        'The Service lets you manage video content, connect your TikTok and other social media accounts, upload, schedule and publish your own videos to those accounts, and view their statistics.',
      ],
    },
    {
      id: 'accounts',
      heading: '2. Your account',
      blocks: [
        {
          list: [
            'You must be at least 18 years old.',
            'You are responsible for keeping your login secure and for all activity under your account, and must tell us promptly about unauthorised access.',
          ],
        },
      ],
    },
    {
      id: 'connected-accounts',
      heading: '3. Connected social media accounts',
      blocks: [
        {
          list: [
            'You may only connect accounts that you own or are authorised to manage.',
            'When you connect TikTok or another platform, you authorise the Service to act on that account within the permissions you approved, such as publishing the content you choose.',
            "Your use of each platform remains subject to that platform's own terms, including the TikTok Terms of Service and Community Guidelines.",
            'You can disconnect an account at any time in the Service or revoke access on the platform.',
          ],
        },
      ],
    },
    {
      id: 'content',
      heading: '4. Your content',
      blocks: [
        {
          list: [
            'You keep all rights to the content you upload. We store, process and transmit it only as needed to provide the Service, such as publishing it to the account you choose.',
            'You are responsible for your content and confirm that you have the rights to publish it and that it does not break any law or platform policy.',
          ],
        },
      ],
    },
    {
      id: 'acceptable-use',
      heading: '5. Prohibited conduct',
      blocks: [
        {
          list: [
            'Publishing spam, misleading content or content that infringes the rights of others.',
            'Using the Service to manipulate engagement or to access accounts you are not authorised to use.',
            'Using any program, tool or method to interfere with, damage or gain unauthorised access to the Service.',
          ],
        },
      ],
    },
    {
      id: 'third-party',
      heading: '6. Third-party services',
      blocks: [
        'The Service relies on third-party platforms such as TikTok, Meta, Google and YouTube. We are not responsible for their outages, API changes or actions they take on your account.',
      ],
    },
    {
      id: 'ip',
      heading: '7. Trademarks and copyright',
      blocks: [`All intellectual property in the design, software, source code and interface of the Service belongs to ${I.companyNameEn} and is protected by Vietnamese copyright law.`],
    },
    {
      id: 'termination',
      heading: '8. Suspension and termination',
      blocks: ['You may stop using the Service at any time. We may suspend or end access if you breach these Terms or to protect the Service and other users.'],
    },
    {
      id: 'disclaimer',
      heading: '9. Limitation of liability',
      blocks: [
        'The Service is provided "as is". To the extent permitted by law, we are not liable for indirect losses or for content that fails to publish because of a third-party platform.',
      ],
    },
    {
      id: 'law',
      heading: '10. Governing law',
      blocks: ['These Terms are governed by the laws of Vietnam, and the competent courts of Vietnam will resolve any dispute.'],
    },
    {
      id: 'contact',
      heading: '11. Contact',
      blocks: [`Questions about these Terms can be sent to ${I.companyNameEn} at ${I.contactEmail}.`],
    },
  ],
};

export const LEGAL_DOCS: Record<LegalKind, Record<LegalLang, LegalDocument>> = {
  privacy: { vi: PRIVACY_VI, en: PRIVACY_EN },
  terms: { vi: TERMS_VI, en: TERMS_EN },
};

/** Chữ cố định trên khung trang (breadcrumb, chân trang…) theo ngôn ngữ. */
export const LEGAL_UI: Record<LegalLang, {
  home: string; effective: string; termsGroup: string; hotline: string; address: string;
  email: string; registration: string; privacyLink: string; termsLink: string;
  summary: string; toc: string; contactTitle: string; contactBody: string; contactCta: string;
  backToTop: string; otherLang: string;
}> = {
  vi: {
    home: 'Trang Chủ', effective: 'Ngày hiệu lực', termsGroup: 'Điều khoản', hotline: 'Hotline',
    address: 'Địa chỉ văn phòng', email: 'Email', registration: 'Đã chứng nhận đăng ký kinh doanh',
    privacyLink: 'Chính sách bảo mật', termsLink: 'Điều khoản sử dụng',
    summary: 'Tóm tắt', toc: 'Mục lục', contactTitle: 'Cần hỗ trợ về dữ liệu của quý khách?',
    contactBody: 'Gửi yêu cầu truy cập, chỉnh sửa hoặc xoá dữ liệu cho chúng tôi. Mọi yêu cầu được xử lý trong vòng 30 ngày.',
    contactCta: 'Gửi email', backToTop: 'Lên đầu trang', otherLang: 'English version',
  },
  en: {
    home: 'Home', effective: 'Effective date', termsGroup: 'Legal', hotline: 'Hotline',
    address: 'Office address', email: 'Email', registration: 'Business registration no.',
    privacyLink: 'Privacy Policy', termsLink: 'Terms of Service',
    summary: 'At a glance', toc: 'Contents', contactTitle: 'Questions about your data?',
    contactBody: 'Send us a request to access, correct or delete your data. Every request is handled within 30 days.',
    contactCta: 'Email us', backToTop: 'Back to top', otherLang: 'Bản tiếng Việt',
  },
};

/** Tách "3. Phạm vi chia sẻ" → { num: '3', text: 'Phạm vi chia sẻ' } để vẽ số trong ô tròn; không có số thì num rỗng. */
export function splitHeading(heading: string): { num: string; text: string } {
  const m = /^(\d+)\.\s+(.*)$/.exec(heading.trim());
  return m ? { num: m[1], text: m[2] } : { num: '', text: heading.trim() };
}
