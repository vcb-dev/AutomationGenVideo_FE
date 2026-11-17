import { drivePreviewEmbedUrl, resultThumbUrl, resultVideoKind, storageDownloadUrl } from '../result-video'

const R2 = 'https://be.example.com/api/storage/files/task-auto/videos/2026-11-17/an_abcdef12'
const DRIVE = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view'

describe('resultVideoKind', () => {
  it('link Drive → drive', () => expect(resultVideoKind(DRIVE)).toBe('drive'))
  it('video R2 .mp4 / .mov → file', () => {
    expect(resultVideoKind(`${R2}/a.mp4`)).toBe('file')
    expect(resultVideoKind(`${R2}/a.mov`)).toBe('file')
  })
  it('video ngoài kho → none', () => expect(resultVideoKind('https://cdn.example.com/a.mp4')).toBe('none'))
  it('link TikTok → none', () => expect(resultVideoKind('https://www.tiktok.com/@a/video/1')).toBe('none'))
  it('rỗng → none', () => expect(resultVideoKind(null)).toBe('none'))
})

describe('resultThumbUrl', () => {
  it('video R2 → ảnh bìa BE cắt sẵn trong thumb/', () =>
    expect(resultThumbUrl(`${R2}/task_1_9_a1b2c3d4.mov`)).toBe(`${R2}/thumb/task_1_9_a1b2c3d4.jpg`))
  it('Drive → ảnh thu nhỏ của Drive', () => expect(resultThumbUrl(DRIVE)).toContain('drive.google.com/thumbnail?id='))
  it('link ngoài → null', () => expect(resultThumbUrl('https://www.tiktok.com/@a/video/1')).toBeNull())
})

describe('storageDownloadUrl / drivePreviewEmbedUrl', () => {
  it('thêm download=1 và tên file', () =>
    expect(storageDownloadUrl(`${R2}/a.mp4?x=1`, 'Video A.mp4')).toBe(`${R2}/a.mp4?download=1&filename=Video%20A.mp4`))
  it('link Drive view → preview', () =>
    expect(drivePreviewEmbedUrl('https://drive.google.com/file/d/x/view?usp=sharing')).toBe('https://drive.google.com/file/d/x/preview'))
})
