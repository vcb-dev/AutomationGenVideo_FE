import { proxyImg, isTransientError } from '../social/image-proxy-helper';

describe('Internal Channels - Image Proxy & Resilience Helper', () => {
  describe('proxyImg', () => {
    it('bọc link Google Drive CDN và resize để chống rate limit 429', () => {
      const googleDriveUrl = 'https://lh3.googleusercontent.com/d/1JxoT_3gf4M2CfE0HKdzAfjufJGyteIca';
      const proxied = proxyImg(googleDriveUrl, 120, 120);

      expect(proxied).toContain('https://wsrv.nl/?url=');
      expect(proxied).toContain(encodeURIComponent(googleDriveUrl));
      expect(proxied).toContain('&w=120&h=120&fit=cover');
    });

    it('bọc link Meta CDN (Instagram/Facebook) qua wsrv proxy', () => {
      const fbcdnUrl = 'https://scontent.fhan14-3.fna.fbcdn.net/v/t51.82787-15/avatar.jpg';
      const proxied = proxyImg(fbcdnUrl);

      expect(proxied).toContain('https://wsrv.nl/?url=');
      expect(proxied).toContain(encodeURIComponent(fbcdnUrl));
    });

    it('giữ nguyên các link ảnh không thuộc domain cần proxy', () => {
      const normalUrl = 'https://example.com/images/avatar.png';
      expect(proxyImg(normalUrl)).toBe(normalUrl);
    });

    it('trả về chuỗi rỗng khi url rỗng', () => {
      expect(proxyImg('')).toBe('');
    });
  });

  describe('isTransientError', () => {
    it('nhận diện đúng các lỗi mạng tạm thời (DNS, urllib3, 429, 502, timeout)', () => {
      expect(
        isTransientError(
          "HTTPSConnectionPool(host='graph.facebook.com', port=443): Max retries exceeded (Caused by NameResolutionError)",
        ),
      ).toBe(true);
      expect(isTransientError('Request failed with status code 502')).toBe(true);
      expect(isTransientError('Request failed with status code 429')).toBe(true);
      expect(isTransientError('Too Many Requests')).toBe(true);
      expect(isTransientError('connect ETIMEDOUT')).toBe(true);
      expect(isTransientError('getaddrinfo ENOTFOUND')).toBe(true);
      expect(isTransientError('Temporary failure in name resolution')).toBe(true);
    });

    it('không nhận nhầm lỗi phân quyền hoặc token hết hạn', () => {
      expect(isTransientError('Error validating access token: Session has expired')).toBe(false);
      expect(isTransientError('OAuthException: (#10) Application does not have permission for this action')).toBe(false);
      expect(isTransientError(null)).toBe(false);
      expect(isTransientError(undefined)).toBe(false);
    });
  });
});
