import { isMediaStorageUrl } from '../media-storage-url'

const BASE = 'https://be.example.com/api/storage/files'

describe('isMediaStorageUrl', () => {
  it('cùng host + đường dẫn gốc → true', () =>
    expect(isMediaStorageUrl(new URL(`${BASE}/task-auto/a.jpg`), BASE)).toBe(true))
  it('cùng host khác đường dẫn → false', () =>
    expect(isMediaStorageUrl(new URL('https://be.example.com/api/users/1'), BASE)).toBe(false))
  it('host khác → false', () =>
    expect(isMediaStorageUrl(new URL('https://evil.example.com/api/storage/files/a.jpg'), BASE)).toBe(false))
  it('thiếu biến → ném lỗi có tên biến', () =>
    expect(() => isMediaStorageUrl(new URL(`${BASE}/a.jpg`), '')).toThrow(/NEXT_PUBLIC_MEDIA_BASE_URL/))
})
