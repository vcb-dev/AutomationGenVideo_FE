describe('Internal Channels Helpers & Identifier Generation', () => {
  describe('Proxy Image for Instagram and Threads CDN', () => {
    function proxyImg(url: string, platform: string): string {
      if (!url) return '';
      if (
        (platform === 'instagram' || platform === 'threads') &&
        (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))
      ) {
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
      }
      return url;
    }

    it('proxy ảnh cdninstagram.com cho instagram', () => {
      const url = 'https://scontent-hkg4-2.cdninstagram.com/v/t51.2885-15/photo.jpg';
      const result = proxyImg(url, 'instagram');
      expect(result).toBe(`https://wsrv.nl/?url=${encodeURIComponent(url)}`);
    });

    it('proxy ảnh fbcdn.net cho threads', () => {
      const url = 'https://scontent-hkg4-1.fbcdn.net/v/t39.30808-6/threads_avatar.jpg';
      const result = proxyImg(url, 'threads');
      expect(result).toBe(`https://wsrv.nl/?url=${encodeURIComponent(url)}`);
    });

    it('giữ nguyên url ảnh thông thường không thuộc CDN Meta', () => {
      const url = 'https://lh3.googleusercontent.com/avatar.jpg';
      const result = proxyImg(url, 'instagram');
      expect(result).toBe(url);
    });

    it('trả về rỗng khi url rỗng', () => {
      expect(proxyImg('', 'threads')).toBe('');
    });
  });

  describe('Facebook Page Avatar Resolution', () => {
    function resolveFbPageAvatar(page: {
      id: string;
      avatar_url?: string | null;
      platform_id?: string | null;
      extra_data?: any;
    }): string {
      const cleanId =
        page.extra_data?.pageId ||
        (page.platform_id?.startsWith('page_')
          ? page.platform_id.replace('page_', '')
          : null);
      if (cleanId) {
        return `https://graph.facebook.com/${cleanId}/picture?type=large`;
      }
      return page.avatar_url || '';
    }

    it('ưu tiên tạo đường dẫn trực tiếp graph.facebook.com từ cleanId để tránh lỗi 404', () => {
      const page = {
        id: 'page_10203040',
        platform_id: 'page_10203040',
        avatar_url: 'https://fbcdn.net/expired.jpg',
      };
      const avatar = resolveFbPageAvatar(page);
      expect(avatar).toBe('https://graph.facebook.com/10203040/picture?type=large');
    });

    it('lấy từ extra_data.pageId nếu có', () => {
      const page = {
        id: 'sa-fb-1',
        extra_data: { pageId: '987654321' },
      };
      const avatar = resolveFbPageAvatar(page);
      expect(avatar).toBe('https://graph.facebook.com/987654321/picture?type=large');
    });

    it('fallback về avatar_url nếu không có pageId', () => {
      const page = {
        id: 'sa-fb-2',
        avatar_url: 'https://example.com/avatar.png',
      };
      const avatar = resolveFbPageAvatar(page);
      expect(avatar).toBe('https://example.com/avatar.png');
    });
  });

  describe('Threads Channel Lookup Identifiers', () => {
    function buildThreadsIdentifiers(p: { username: string; name?: string | null; url?: string | null }): string[] {
      return [
        p.url,
        `https://www.threads.net/@${p.username}`,
        `https://threads.net/@${p.username}`,
        p.username,
        p.name,
      ].filter(Boolean) as string[];
    }

    it('sinh đầy đủ các định dạng URL và username để đối soát bảng phân công team/chủ kênh', () => {
      const profile = {
        username: 'vcbi_media',
        name: 'VCBI Media Official',
        url: 'https://www.threads.net/@vcbi_media',
      };
      const ids = buildThreadsIdentifiers(profile);
      expect(ids).toContain('vcbi_media');
      expect(ids).toContain('VCBI Media Official');
      expect(ids).toContain('https://www.threads.net/@vcbi_media');
      expect(ids).toContain('https://threads.net/@vcbi_media');
    });
  });
});
