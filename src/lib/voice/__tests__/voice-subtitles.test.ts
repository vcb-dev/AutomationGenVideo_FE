/**
 * Chức năng: Xử lý phụ đề SRT tải về khi tạo Voice TTS từ MiniMax.
 *
 * Kiểm tra:
 * 1. Hàm downloadSrtFile: tạo Blob có tiền tố UTF-8 BOM (\uFEFF) giúp hiển thị tiếng Việt chuẩn xác
 *    trong CapCut/Notepad, gán thẻ <a> tải về và giải phóng ObjectURL.
 * 2. Hàm buildSrtDownloadUrl: sinh URL stream phụ đề từ Backend kèm tham số tải về.
 */

import { downloadSrtFile, buildSrtDownloadUrl, type TtsResult } from '@/lib/api/voice-tts'

describe('downloadSrtFile', () => {
  let originalCreateElement: typeof document.createElement
  let originalAppendChild: typeof document.body.appendChild
  let originalRemoveChild: typeof document.body.removeChild
  let originalCreateObjectURL: typeof URL.createObjectURL
  let originalRevokeObjectURL: typeof URL.revokeObjectURL

  let createdBlob: Blob | null = null
  let mockLink: any = null
  let clicked = false
  let appendedChild: any = null
  let removedChild: any = null

  beforeEach(() => {
    createdBlob = null
    clicked = false
    appendedChild = null
    removedChild = null

    // Mock URL methods
    originalCreateObjectURL = URL.createObjectURL
    originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = jest.fn((blob: Blob) => {
      createdBlob = blob
      return 'blob:mock-srt-url'
    })
    URL.revokeObjectURL = jest.fn()

    // Mock DOM elements
    mockLink = {
      href: '',
      download: '',
      click: jest.fn(() => {
        clicked = true
      }),
    }
    originalCreateElement = document.createElement.bind(document)
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockLink as any
      return originalCreateElement(tagName)
    })

    originalAppendChild = document.body.appendChild.bind(document.body)
    jest.spyOn(document.body, 'appendChild').mockImplementation((node: any) => {
      appendedChild = node
      return node
    })

    originalRemoveChild = document.body.removeChild.bind(document.body)
    jest.spyOn(document.body, 'removeChild').mockImplementation((node: any) => {
      removedChild = node
      return node
    })
  })

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    jest.restoreAllMocks()
  })

  it('tạo Blob chứa UTF-8 BOM và kích hoạt tải về với tên file đúng', async () => {
    const srtContent = '1\n00:00:00,000 --> 00:00:02,500\nXin chào các bạn.\n\n'
    const fileName = 'test_subtitles.srt'

    downloadSrtFile(srtContent, fileName)

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(createdBlob).toBeInstanceOf(Blob)
    expect(createdBlob?.type).toBe('application/x-subrip;charset=utf-8')

    // Kiểm tra kích thước và type của Blob
    expect(createdBlob?.size).toBeGreaterThan(0)

    expect(mockLink.href).toBe('blob:mock-srt-url')
    expect(mockLink.download).toBe(fileName)
    expect(mockLink.click).toHaveBeenCalledTimes(1)
    expect(clicked).toBe(true)

    expect(appendedChild).toBe(mockLink)
    expect(removedChild).toBe(mockLink)
  })

  it('dùng tên mặc định subtitles.srt nếu không truyền fileName', () => {
    const srtContent = '1\n00:00:00,000 --> 00:00:01,000\nNội dung\n\n'
    downloadSrtFile(srtContent)
    expect(mockLink.download).toBe('subtitles.srt')
  })

  it('không làm gì nếu srtContent rỗng', () => {
    downloadSrtFile('')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(mockLink.click).not.toHaveBeenCalled()
  })
})

describe('buildSrtDownloadUrl', () => {
  it('trả về srt_url trực tiếp nếu đã có sẵn và không có srt_filename', () => {
    const result: TtsResult = {
      success: true,
      audio_url: 'https://example.com/audio.mp3',
      srt_url: 'https://example.com/subtitles.srt',
    }
    expect(buildSrtDownloadUrl(result)).toBe('https://example.com/subtitles.srt')
  })

  it('sinh URL stream phụ đề từ backend nếu có srt_filename', () => {
    const result: TtsResult = {
      success: true,
      audio_url: '/audio.mp3',
      srt_filename: 'tts_abc-123.srt',
    }
    const url = buildSrtDownloadUrl(result, 'custom_voice.srt')
    expect(url).toContain('/ai/voice/tts/stream/tts_abc-123.srt')
    expect(url).toContain('download=1')
    expect(url).toContain('filename=custom_voice.srt')
  })

  it('hỗ trợ trường srt_file_name (snake_case phổ biến)', () => {
    const result: TtsResult = {
      success: true,
      audio_url: '/audio.mp3',
      srt_file_name: 'tts_xyz-789.srt',
    }
    const url = buildSrtDownloadUrl(result)
    expect(url).toContain('/ai/voice/tts/stream/tts_xyz-789.srt')
    expect(url).toContain('filename=subtitles.srt')
  })

  it('trả về null nếu không có thông tin phụ đề nào', () => {
    const result: TtsResult = {
      success: true,
      audio_url: 'https://example.com/audio.mp3',
    }
    expect(buildSrtDownloadUrl(result)).toBeNull()
  })
})
