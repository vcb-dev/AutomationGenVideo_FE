import { isHostedVideoUrl, isStorageUrl } from '../media-url'

describe('isHostedVideoUrl', () => {
  it('link Drive cũ → true', () => expect(isHostedVideoUrl('https://drive.google.com/file/d/abc/view')).toBe(true))
  it('video trên R2 → true, kể cả có query', () => {
    expect(isHostedVideoUrl('https://be/api/storage/files/app-media/a.mp4')).toBe(true)
    expect(isHostedVideoUrl('https://be/api/storage/files/app-media/a.mov?download=1')).toBe(true)
  })
  it('video ngoài kho → false', () => expect(isHostedVideoUrl('https://cdn.example.com/a.mp4')).toBe(false))
  it('ảnh trên R2 → false', () => expect(isHostedVideoUrl('https://be/api/storage/files/app-media/a.jpg')).toBe(false))
  it('null → false', () => expect(isHostedVideoUrl(null)).toBe(false))
})

describe('isStorageUrl', () => {
  const old = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  afterEach(() => {
    if (old === undefined) delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL
    else process.env.NEXT_PUBLIC_MEDIA_BASE_URL = old
  })

  it('route phát file của BE → true', () => expect(isStorageUrl('https://be/api/storage/files/task-auto/a.mp4')).toBe(true))
  it('domain riêng của bucket theo NEXT_PUBLIC_MEDIA_BASE_URL → true', () => {
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL = 'https://media.example.com/'
    expect(isStorageUrl('https://media.example.com/app-media/a.mp4')).toBe(true)
    expect(isStorageUrl('https://other.example.com/app-media/a.mp4')).toBe(false)
  })
})
