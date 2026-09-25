import { buildDeleteChannelConfirm, buildDeleteChannelPath } from '../delete-channel';
import {
  normalizeThreadsUsername,
  proxyThreadsImage,
  formatThreadsStat,
  normalizeTargetPostCount,
  normalizeTargetDays,
  countWords,
  isStoryPost,
  matchLikeRange,
  parseMultipleUsernames,
  isVietnamese,
  type LikeRangeFilter,
} from '../threads-helpers';


describe('Threads Channel Helpers & Scraper Logic', () => {
  describe('normalizeThreadsUsername', () => {
    it('loại bỏ ký tự @ ở đầu', () => {
      expect(normalizeThreadsUsername('@tech_insider')).toBe('tech_insider');
    });

    it('trích xuất username từ đường dẫn threads.net/@username', () => {
      expect(normalizeThreadsUsername('https://www.threads.net/@tech_insider')).toBe('tech_insider');
      expect(normalizeThreadsUsername('https://threads.net/@tech_insider?hl=vi')).toBe('tech_insider');
    });

    it('xử lý chuỗi rỗng và khoảng trắng an toàn', () => {
      expect(normalizeThreadsUsername('')).toBe('');
      expect(normalizeThreadsUsername('   ')).toBe('');
    });
  });

  describe('proxyThreadsImage', () => {
    it('proxy ảnh cdninstagram qua wsrv.nl để tránh lỗi CORS/hotlink', () => {
      const url = 'https://scontent.cdninstagram.com/avatar.jpg';
      expect(proxyThreadsImage(url)).toContain('https://wsrv.nl/?url=');
    });

    it('proxy ảnh fbcdn.net qua wsrv.nl', () => {
      const url = 'https://scontent.fbcdn.net/thumb.jpg';
      expect(proxyThreadsImage(url)).toContain('https://wsrv.nl/?url=');
    });

    it('giữ nguyên các URL không phải CDN của Meta', () => {
      const url = 'https://example.com/avatar.png';
      expect(proxyThreadsImage(url)).toBe(url);
    });

    it('trả về chuỗi rỗng nếu không có url', () => {
      expect(proxyThreadsImage('')).toBe('');
      expect(proxyThreadsImage(undefined)).toBe('');
    });
  });

  describe('formatThreadsStat', () => {
    it('định dạng số lượt tương tác theo K và M', () => {
      expect(formatThreadsStat(500)).toBe('500');
      expect(formatThreadsStat(1500)).toBe('1.5K');
      expect(formatThreadsStat(2500000)).toBe('2.5M');
      expect(formatThreadsStat('12000')).toBe('12.0K');
    });
  });

  describe('normalizeTargetPostCount', () => {
    it('nhận đúng số nguyên người dùng tự nhập', () => {
      expect(normalizeTargetPostCount('35')).toBe(35);
      expect(normalizeTargetPostCount(75)).toBe(75);
      expect(normalizeTargetPostCount('150')).toBe(150);
    });

    it('fallback về mặc định 50 nếu nhập rỗng hoặc không hợp lệ', () => {
      expect(normalizeTargetPostCount('')).toBe(50);
      expect(normalizeTargetPostCount('abc')).toBe(50);
      expect(normalizeTargetPostCount(-10)).toBe(50);
      expect(normalizeTargetPostCount(0)).toBe(50);
    });

    it('giới hạn tối đa trần an toàn', () => {
      expect(normalizeTargetPostCount(999, 50, 500)).toBe(500);
    });
  });

  describe('Xoá kênh Threads', () => {
    it('tạo đúng đường dẫn API xoá kênh Threads', () => {
      expect(buildDeleteChannelPath('threads', 42)).toBe('/scraper/threads/profiles/42');
    });

    it('tạo thông báo xác nhận xoá nêu rõ tên kênh và số bài viết', () => {
      const confirm = buildDeleteChannelConfirm({
        name: 'Tech Insider VN',
        videoCount: 25,
      });
      expect(confirm).toContain('Tech Insider VN');
      expect(confirm).toContain('25 video đã cào');
    });
  });

  describe('Lọc và sắp xếp bài HOT Threads (Content Radar)', () => {
    const mockPosts = [
      { post_id: '1', media_type: 'VIDEO', likes_count: 500, views_count: 5000 },
      { post_id: '2', media_type: 'TEXT', likes_count: 1200, views_count: 3000 },
      { post_id: '3', media_type: 'IMAGE', likes_count: 300, views_count: 8000 },
    ];

    it('lọc chính xác bài có VIDEO để remake content', () => {
      const videoPosts = mockPosts.filter((p) => p.media_type === 'VIDEO');
      expect(videoPosts.length).toBe(1);
      expect(videoPosts[0].post_id).toBe('1');
    });

    it('sắp xếp theo lượt like cao nhất giảm dần', () => {
      const sorted = [...mockPosts].sort((a, b) => b.likes_count - a.likes_count);
      expect(sorted[0].post_id).toBe('2'); // 1200 likes
      expect(sorted[1].post_id).toBe('1'); // 500 likes
      expect(sorted[2].post_id).toBe('3'); // 300 likes
    });

    it('sắp xếp theo lượt xem nhiều nhất giảm dần', () => {
      const sorted = [...mockPosts].sort((a, b) => b.views_count - a.views_count);
      expect(sorted[0].post_id).toBe('3'); // 8000 views
      expect(sorted[1].post_id).toBe('1'); // 5000 views
    });
  });

  describe('Cào và lọc bài theo ngày (mode: days)', () => {
    it('nhận đúng số ngày người dùng tự nhập', () => {
      expect(normalizeTargetDays('3')).toBe(3);
      expect(normalizeTargetDays(14)).toBe(14);
      expect(normalizeTargetDays('30')).toBe(30);
    });

    it('fallback về mặc định 7 ngày nếu rỗng hoặc không hợp lệ', () => {
      expect(normalizeTargetDays('')).toBe(7);
      expect(normalizeTargetDays('xyz')).toBe(7);
      expect(normalizeTargetDays(-5)).toBe(7);
      expect(normalizeTargetDays(0)).toBe(7);
    });

    it('giới hạn tối đa trần ngày an toàn (180 ngày)', () => {
      expect(normalizeTargetDays(365)).toBe(180);
    });

    it('lọc chính xác bài viết trong khoảng cutoff date', () => {
      const now = Date.now();
      const testItems = [
        { id: 'recent', date_posted: new Date(now - 2 * 86400000).toISOString() }, // 2 ngày trước
        { id: 'within_week', date_posted: new Date(now - 5 * 86400000).toISOString() }, // 5 ngày trước
        { id: 'old', date_posted: new Date(now - 15 * 86400000).toISOString() }, // 15 ngày trước
      ];
      const cutoff7Days = new Date(now - 7 * 86400000);
      const filtered = testItems.filter((item) => new Date(item.date_posted) >= cutoff7Days);

      expect(filtered.length).toBe(2);
      expect(filtered.map((i) => i.id)).toEqual(['recent', 'within_week']);
    });
  });

  describe('Nhận diện và lọc bài Tiếng Việt (Language Filter)', () => {
    const VI_REGEX = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;
    const VI_COMMON_WORDS = new Set([
      'thì', 'là', 'mà', 'của', 'người', 'không', 'được', 'trong', 'với', 'cho', 'những',
      'dạo', 'thấy', 'bảo', 'có', 'mình', 'bạn', 'anh', 'em', 'chị', 'xem', 'hay', 'lại',
      'làm', 'còn', 'nên', 'cũng', 'quá', 'rất', 'luôn', 'nhiều', 'thế', 'nào', 'gì', 'ơi',
      'nhé', 'nha', 'chứ', 'đâu', 'đây', 'đó', 'này', 'kia', 'ở', 'đang', 'ra', 'vào', 'đi'
    ]);

    function checkIsVietnamese(post: { text?: string; is_vietnamese?: boolean }): boolean {
      if (post.is_vietnamese !== undefined) return Boolean(post.is_vietnamese);
      const text = (post.text || '').toLowerCase();
      if (VI_REGEX.test(text)) return true;
      const words = text.match(/\b\w+\b/g) || [];
      let count = 0;
      for (const w of words) {
        if (VI_COMMON_WORDS.has(w)) {
          count++;
          if (count >= 2) return true;
        }
      }
      return false;
    }

    it('nhận diện đúng bài viết tiếng Việt có dấu thanh', () => {
      expect(checkIsVietnamese({ text: 'Topic: toàn bộ kiến thức Lịch Sử để thi THPTQG' })).toBe(true);
      expect(checkIsVietnamese({ text: 'Dạo này thấy nhiều chủ đề hay quá' })).toBe(true);
    });

    it('nhận diện đúng bài viết tiếng Việt không dấu nhưng có từ vựng tiếng Việt', () => {
      expect(checkIsVietnamese({ text: 'topic nay rat hay luon nha' })).toBe(true);
    });

    it('loại trừ bài viết nước ngoài (tiếng Anh, Nga, v.v.)', () => {
      expect(checkIsVietnamese({ text: 'So if a man is wearing a football jersey can crash tackle him in the street?' })).toBe(false);
      expect(checkIsVietnamese({ text: 'В Вильнюсе конфликт дошёл до ножа.' })).toBe(false);
      expect(checkIsVietnamese({ text: '吃UU就好好吃 吃的都是口水是嘴巴破掉了嗎' })).toBe(false);
    });

    it('ưu tiên cờ is_vietnamese nếu backend đã gán', () => {
      expect(checkIsVietnamese({ text: 'neutral', is_vietnamese: true })).toBe(true);
      expect(checkIsVietnamese({ text: 'neutral', is_vietnamese: false })).toBe(false);
    });
  });

  describe('Độ dài và Lọc bài Kể chuyện (Storytelling Filter)', () => {
    it('đếm chính xác số từ trong bài viết', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('Hôm nay đi mua vàng')).toBe(5);
      expect(countWords('   Tâm sự chuyện   mẹ chồng tặng nhẫn cưới   ')).toBe(8);
    });

    it('nhận diện đúng bài viết kể chuyện dài để làm kịch bản', () => {
      const longStory = {
        text: 'Hôm nay mình xin kể lại câu chuyện đi mua chỉ vàng đầu tiên trong đời. ' +
              'Hồi đó vừa ra trường, lương tháng đầu tiên được 6 triệu, mình gom góp để dành mua tặng mẹ một chiếc nhẫn bạc. ' +
              'Đến tiệm vàng, chú chủ tiệm tư vấn rất nhiệt tình dù mình chỉ mua món nhỏ. ' +
              'Cảm giác lúc cầm chiếc nhẫn trên tay thật sự xúc động không bao giờ quên được. ' +
              'Từ đó mình luôn tin rằng giá trị món quà nằm ở tấm lòng.',
      };
      const shortStatus = { text: 'Hôm nay vàng tăng giá quá mọi người ơi!' };

      expect(isStoryPost(longStory, 50, 150)).toBe(true);
      expect(isStoryPost(shortStatus, 50, 150)).toBe(false);
      expect(isStoryPost({ text: '' })).toBe(false);
    });
  });

  describe('Lọc theo khoảng Like (Like Range / Hidden Gem)', () => {
    it('nhận diện chính xác bài ít like (Hidden Gem: dưới 50 like)', () => {
      expect(matchLikeRange(5, 'HIDDEN_GEM')).toBe(true);
      expect(matchLikeRange(49, 'HIDDEN_GEM')).toBe(true);
      expect(matchLikeRange(50, 'HIDDEN_GEM')).toBe(false);
      expect(matchLikeRange('12', 'HIDDEN_GEM')).toBe(true);
    });

    it('nhận diện chính xác bài tầm trung (50 - 500 like)', () => {
      expect(matchLikeRange(50, 'MEDIUM')).toBe(true);
      expect(matchLikeRange(250, 'MEDIUM')).toBe(true);
      expect(matchLikeRange(500, 'MEDIUM')).toBe(true);
      expect(matchLikeRange(49, 'MEDIUM')).toBe(false);
      expect(matchLikeRange(501, 'MEDIUM')).toBe(false);
    });

    it('nhận diện chính xác bài viral (trên 500 like)', () => {
      expect(matchLikeRange(501, 'VIRAL')).toBe(true);
      expect(matchLikeRange(15000, 'VIRAL')).toBe(true);
      expect(matchLikeRange(500, 'VIRAL')).toBe(false);
    });

    it('chế độ ALL chấp nhận mọi mức like', () => {
      expect(matchLikeRange(0, 'ALL')).toBe(true);
      expect(matchLikeRange(1000000, 'ALL')).toBe(true);
    });
  });

  describe('Thêm nhiều kênh Threads (parseMultipleUsernames)', () => {
    it('tách và chuẩn hoá danh sách nhiều username cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng', () => {
      const input = '@lilbieber, zuck\nhttps://www.threads.net/@mosseri; @vietcetera';
      const parsed = parseMultipleUsernames(input);
      expect(parsed).toEqual(['lilbieber', 'zuck', 'mosseri', 'vietcetera']);
    });

    it('loại bỏ trùng lặp và chuỗi rỗng', () => {
      const input = 'zuck, @zuck, , , lilbieber\n\nlilbieber';
      const parsed = parseMultipleUsernames(input);
      expect(parsed).toEqual(['zuck', 'lilbieber']);
    });
  });

  describe('Kho bài viết & video Threads tổng hợp (Saved Repository)', () => {
    const combinedRepository = [
      {
        id: '1',
        post_id: 'p_channel',
        text: 'Video kịch bản hay từ kênh chú ý',
        media_type: 'VIDEO',
        likes_count: 320,
        profile: { username: 'creator_a', name: 'Creator A', is_tracked: true },
      },
      {
        id: '2',
        post_id: 'p_keyword',
        text: 'Hôm nay mình xin chia sẻ câu chuyện đi mua vàng cưới của hai vợ chồng cách đây 5 năm. Lúc đó trong tay hai đứa chỉ có vỏn vẹn hai mươi triệu đồng, đi khắp phố Hàng Bạc để tìm một cặp nhẫn cưới ưng ý mà vừa túi tiền. Cuối cùng hai đứa chọn được một cặp nhẫn trơn đơn giản nhưng tràn đầy ý nghĩa và hạnh phúc.',
        media_type: 'TEXT',
        likes_count: 45,
        profile: { username: 'anonymous_b', name: 'Anonymous B', is_tracked: false },
      },
    ];

    it('tổng hợp đầy đủ bài viết từ cả kênh theo dõi (is_tracked: true) và từ khoá (is_tracked: false)', () => {
      expect(combinedRepository.length).toBe(2);
      const channelPosts = combinedRepository.filter((p) => p.profile.is_tracked);
      const keywordPosts = combinedRepository.filter((p) => !p.profile.is_tracked);
      expect(channelPosts.length).toBe(1);
      expect(keywordPosts.length).toBe(1);
    });

    it('lọc chính xác video trong kho dữ liệu tổng hợp', () => {
      const videoPosts = combinedRepository.filter((p) => p.media_type === 'VIDEO');
      expect(videoPosts.length).toBe(1);
      expect(videoPosts[0].post_id).toBe('p_channel');
    });

    it('lọc chính xác bài kể chuyện ít like (Hidden Gem) trong kho tổng hợp', () => {
      const hiddenGems = combinedRepository.filter((p) => isStoryPost(p as any) && Number(p.likes_count) < 50);
      expect(hiddenGems.length).toBe(1);
      expect(hiddenGems[0].post_id).toBe('p_keyword');
    });
  });
});
