import { photoSrc } from '../api';

describe('photoSrc', () => {
  it('ghép đường dẫn tương đối vào gốc của API, không phải gốc của FE', () => {
    // Để nguyên đường dẫn tương đối thì trình duyệt tìm ảnh ở cổng 3001 của FE và ra 404.
    expect(photoSrc('/api/mems/photos/CAM-001_123_abc.png')).toBe(
      'http://localhost:3000/api/mems/photos/CAM-001_123_abc.png',
    );
  });

  it('URL đầy đủ của Google Drive thì giữ nguyên', () => {
    const drive = 'https://drive.google.com/uc?id=abc';
    expect(photoSrc(drive)).toBe(drive);
  });

  it('giữ nguyên cả URL http thường', () => {
    expect(photoSrc('http://cdn.noi-bo/anh.png')).toBe('http://cdn.noi-bo/anh.png');
  });
});
