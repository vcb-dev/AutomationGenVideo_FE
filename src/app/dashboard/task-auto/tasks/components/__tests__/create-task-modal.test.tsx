/**
 * Luồng tạo nhiệm vụ nhanh trong CreateTaskModal (render thật, API giả):
 * chọn nhiều content → N task, "Tạo & tạo tiếp", giữ content lỗi để tạo lại, nhớ lựa chọn lần
 * trước, phím tắt ⌘/Ctrl+Enter, focus sẵn ô Content, đổi tab kho không mất lựa chọn; điền sẵn khi
 * Nhân bản / mở từ Kế hoạch ngày.
 */
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const mockCreateTask = jest.fn()
const mockCreateEditorContent = jest.fn()

jest.mock('@/lib/api/task-auto', () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  getEditorContents: jest.fn(async () => ({
    data: [
      { id: 'ec-1', title: 'Content một', code: 'C1', content_line: { id: 'line-a1', name: 'A1' }, _count: { tasks: 0 } },
      { id: 'ec-2', title: 'Content hai', code: 'C2', _count: { tasks: 2 } },
    ],
    total: 2,
  })),
  getContents: jest.fn(async () => ({ data: [{ id: 'gc-1', title: 'Content kho tổng', code: 'G1' }], total: 1 })),
  getTeamContents: jest.fn(async () => []),
  getEditorProducts: jest.fn(async () => ({ data: [], total: 0 })),
  getTeamProducts: jest.fn(async () => [
    { id: 'tp-1', name: 'Ví da K1', sku: 'SKU-1', source_product_id: null },
    { id: 'tp-2', name: 'Thắt lưng K1', sku: 'SKU-2', source_product_id: null },
  ]),
  searchOmsProducts: jest.fn(async () => ({ data: [], total: 0 })),
  getOmsProductDetail: jest.fn(),
  getSources: jest.fn(async () => ({ data: [], total: 0 })),
  getEditorSources: jest.fn(async () => ({ data: [], total: 0 })),
  getTeamSources: jest.fn(async () => []),
  createEditorContent: (...args: unknown[]) => mockCreateEditorContent(...args),
  getContentLines: jest.fn(async () => [{ id: 'line-a1', name: 'A1' }, { id: 'line-a2', name: 'A2' }]),
  getContentClassifications: jest.fn(async () => []),
  createContentClassification: jest.fn(),
}))
jest.mock('@/components/task-auto/ContentFormModal', () => ({ ContentFormModal: () => null, MARKET_LABEL: { VIETNAM: 'Việt Nam' } }))
jest.mock('@/components/task-auto/ProductFormModal', () => ({ ProductFormModal: () => null }))
jest.mock('react-hot-toast', () => {
  const toast: any = jest.fn()
  toast.success = jest.fn()
  toast.error = jest.fn()
  return { __esModule: true, default: toast }
})

import toast from 'react-hot-toast'
import {
  CreateTaskModal, EMPTY_DRAFT, looksLikeCode, normalizeTitle, prefillDraft, prefillFromDailyPlan, prefillFromTask,
  titleFromText, type ContentDraft, type CreateTaskPrefill,
} from '../CreateTaskModal'
import type { ContentLine, DailyPlan, Task, Team } from '@/types/task-auto'

// jsdom chưa có scrollIntoView (dropdown cuộn tới dòng đang trỏ bằng phím)
Element.prototype.scrollIntoView = jest.fn()

const TEAM = {
  id: 't1', name: 'K1', brand_type: 'DO_DA', market: 'VIETNAM', leader_id: 'lead',
  members: [{ user_id: 'u1', user: { full_name: 'Editor Một' } }],
} as unknown as Team

function vnDate(offset: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

let container: HTMLDivElement
let root: Root
let onSuccess: jest.Mock

async function flush(ms = 0) {
  await act(async () => { await new Promise(r => setTimeout(r, ms)) })
}

async function renderModal(prefill?: CreateTaskPrefill) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  onSuccess = jest.fn()
  await act(async () => {
    root.render(
      <QueryClientProvider client={qc}>
        <CreateTaskModal teams={[TEAM]} userId="u1" isMember prefill={prefill} onClose={jest.fn()} onSuccess={onSuccess} />
      </QueryClientProvider>,
    )
  })
  await flush(30) // query + requestAnimationFrame focus của DarkModal
}

const triggers = () => Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="listbox"]'))
const contentTrigger = () => triggers()[0]
const productTrigger = () => triggers()[1]

function buttonByText(text: string, scope: ParentNode = document): HTMLButtonElement {
  const btn = Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim().startsWith(text))
  if (!btn) throw new Error(`Không thấy nút "${text}"`)
  return btn
}

function option(text: string): HTMLButtonElement {
  const opt = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find(o => o.textContent?.includes(text))
  if (!opt) throw new Error(`Không thấy dòng "${text}"`)
  return opt
}

async function click(el: HTMLElement) {
  await act(async () => { el.click() })
  await flush()
}

async function key(target: EventTarget, init: KeyboardEventInit) {
  await act(async () => { target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })) })
  await flush()
}

const searchInput = () => document.querySelector<HTMLInputElement>('input[role="combobox"]')

beforeEach(() => {
  window.localStorage.clear()
  mockCreateTask.mockReset()
  mockCreateTask.mockResolvedValue({ id: 'new-task' })
  mockCreateEditorContent.mockReset()
  let seq = 0
  mockCreateEditorContent.mockImplementation(async (_uid: string, body: any) => ({ id: `ec-new-${++seq}`, ...body }))
  ;(toast.success as jest.Mock).mockClear()
  ;(toast.error as jest.Mock).mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  document.body.innerHTML = ''
})

async function pickTeamProduct() {
  await click(productTrigger())
  await click(option('Ví da K1'))
}

it('mở modal là focus sẵn ô Content (không phải nút Đóng)', async () => {
  await renderModal()
  expect(document.activeElement).toBe(contentTrigger())
})

const switchBtn = () => document.querySelector<HTMLButtonElement>('button[role="switch"]')!
const rows = () => Array.from(document.querySelectorAll<HTMLLIElement>('[aria-label="Content đã chọn"] li'))
const rowProductTrigger = (i: number) => rows()[i].querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')!
const bulkTrigger = () => document.querySelector<HTMLButtonElement>('button[aria-label^="Gán nhanh"]')

async function pickThreeContents() {
  await click(contentTrigger())
  await click(option('Content một'))
  await click(option('Content hai'))
  // dropdown vẫn mở khi chọn nhiều; sang Kho tổng chọn tiếp — lựa chọn kho cá nhân không mất
  await click(buttonByText('Kho tổng', document.querySelector('[role="listbox"]')!.parentElement!))
  await click(option('Content kho tổng'))
  await key(searchInput()!, { key: 'Escape' })
  expect(searchInput()).toBeNull()
  expect(rows()).toHaveLength(3)
}

it('chọn nhiều là nút gạt; mỗi content đi với SP riêng (hoặc không SP), deadline dùng chung', async () => {
  await renderModal()
  expect(switchBtn().getAttribute('aria-checked')).toBe('false')
  await click(switchBtn())
  expect(switchBtn().getAttribute('aria-checked')).toBe('true')
  // Ô Sản phẩm chung nhường chỗ cho SP theo từng dòng
  expect(container.textContent).toContain('mỗi content chọn sản phẩm riêng ở danh sách phía trên')

  await pickThreeContents()
  await click(rowProductTrigger(0))
  await click(option('Ví da K1'))
  await click(rowProductTrigger(1))
  await click(option('Thắt lưng K1'))
  expect(rowProductTrigger(0).textContent).toContain('Ví da K1')
  expect(rowProductTrigger(1).textContent).toContain('Thắt lưng K1')
  expect(rowProductTrigger(2).textContent).toContain('Sản phẩm (không bắt buộc)')

  await click(buttonByText('Ngày mai'))
  await click(buttonByText('Tạo 3 nhiệm vụ'))
  await flush()

  const tomorrow = `${vnDate(1)}T17:50`
  expect(mockCreateTask.mock.calls.map(c => c[0])).toEqual([
    expect.objectContaining({ team_id: 't1', deadline: tomorrow, editor_content_id: 'ec-1', team_product_id: 'tp-1' }),
    expect.objectContaining({ team_id: 't1', deadline: tomorrow, editor_content_id: 'ec-2', team_product_id: 'tp-2' }),
    expect.objectContaining({ team_id: 't1', deadline: tomorrow, content_id: 'gc-1' }),
  ])
  expect(mockCreateTask.mock.calls[2][0].team_product_id).toBeUndefined()
  expect(mockCreateTask.mock.calls[2][0].editor_content_id).toBeUndefined()
  expect(toast.success).toHaveBeenCalledWith('Đã tạo 3 nhiệm vụ')
  expect(onSuccess).toHaveBeenCalledTimes(1)
})

it('gán nhanh 1 SP chỉ điền content CHƯA có SP, không đè SP đã chọn riêng', async () => {
  await renderModal()
  await click(switchBtn())
  await pickThreeContents()
  await click(rowProductTrigger(0))
  await click(option('Thắt lưng K1'))

  expect(container.textContent).toContain('Gán nhanh 1 sản phẩm cho 2 content chưa có')
  await click(bulkTrigger()!)
  await click(option('Ví da K1'))
  expect(bulkTrigger()).toBeNull() // hết dòng thiếu SP → ẩn ô gán nhanh

  await click(buttonByText('Tạo 3 nhiệm vụ'))
  await flush()
  expect(mockCreateTask.mock.calls.map(c => c[0].team_product_id)).toEqual(['tp-2', 'tp-1', 'tp-1'])
})

it('bật/tắt chọn nhiều: SP đang chọn đi theo content đang chọn, content thêm sau không tự nhận SP', async () => {
  await renderModal()
  await click(contentTrigger())
  await click(option('Content một'))
  await pickTeamProduct()

  await click(switchBtn())
  expect(rowProductTrigger(0).textContent).toContain('Ví da K1')
  await click(contentTrigger())
  await click(option('Content hai'))
  await key(searchInput()!, { key: 'Escape' })
  expect(rowProductTrigger(1).textContent).toContain('Sản phẩm (không bắt buộc)')

  await click(switchBtn())
  expect(switchBtn().getAttribute('aria-checked')).toBe('false')
  expect(contentTrigger().textContent).toContain('Content một')
  expect(productTrigger().textContent).toContain('Ví da K1')
  await key(document, { key: 'Enter', ctrlKey: true })
  await flush()
  expect(mockCreateTask).toHaveBeenCalledTimes(1)
  expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ editor_content_id: 'ec-1', team_product_id: 'tp-1' }))
})

it('Tạo & tạo tiếp: giữ SP + deadline, chỉ xoá content, đếm số đã tạo, không đóng modal', async () => {
  await renderModal()
  await click(contentTrigger())
  await click(option('Content một'))
  await pickTeamProduct()
  await click(buttonByText('Hôm qua'))
  expect(container.textContent).toContain('Hạn chót đã qua')

  await click(buttonByText('Tạo & tạo tiếp'))
  await flush(30)
  expect(mockCreateTask).toHaveBeenLastCalledWith(expect.objectContaining({
    editor_content_id: 'ec-1', team_product_id: 'tp-1', deadline: `${vnDate(-1)}T17:50`,
  }))
  expect(onSuccess).not.toHaveBeenCalled()
  expect(container.textContent).toContain('Đã tạo 1 nhiệm vụ')
  expect(contentTrigger().textContent).toContain('Tìm trong cá nhân')
  expect(productTrigger().textContent).toContain('Ví da K1')
  expect(document.activeElement).toBe(contentTrigger())

  // Lần 2 bằng bàn phím: mở dropdown, ↓ xuống dòng 2, Enter chọn, rồi Ctrl+Shift+Enter
  await click(contentTrigger())
  await key(searchInput()!, { key: 'ArrowDown' })
  await key(searchInput()!, { key: 'Enter' })
  expect(contentTrigger().textContent).toContain('Content hai')
  await key(document, { key: 'Enter', ctrlKey: true, shiftKey: true })
  await flush(30)
  expect(mockCreateTask).toHaveBeenLastCalledWith(expect.objectContaining({ editor_content_id: 'ec-2', team_product_id: 'tp-1' }))
  expect(container.textContent).toContain('Đã tạo 2 nhiệm vụ')
})

it('Esc trong dropdown chỉ đóng dropdown, không đóng modal', async () => {
  await renderModal()
  const docListener = jest.fn()
  document.addEventListener('keydown', docListener)
  await click(contentTrigger())
  await key(searchInput()!, { key: 'Escape' })
  document.removeEventListener('keydown', docListener)
  expect(searchInput()).toBeNull()
  expect(document.querySelector('[data-dark-modal]')).not.toBeNull()
  expect(docListener).not.toHaveBeenCalled()
})

it('task lỗi được giữ lại để tạo lại; task đã tạo bỏ khỏi danh sách', async () => {
  mockCreateTask
    .mockResolvedValueOnce({ id: 'ok' })
    .mockRejectedValueOnce({ response: { data: { message: 'Editor này đã có task với cặp content + sản phẩm này' } } })
  await renderModal()
  await click(switchBtn())
  await click(contentTrigger())
  await click(option('Content một'))
  await click(option('Content hai'))
  await key(searchInput()!, { key: 'Escape' })

  await click(buttonByText('Tạo 2 nhiệm vụ'))
  await flush()

  expect(toast.error).toHaveBeenCalledWith('1/2 nhiệm vụ chưa tạo được: Editor này đã có task với cặp content + sản phẩm này')
  const chips = Array.from(document.querySelectorAll('[aria-label="Content đã chọn"] li')).map(li => li.textContent)
  expect(chips).toHaveLength(1)
  expect(chips[0]).toContain('Content hai')
  expect(onSuccess).not.toHaveBeenCalled()
})

it('nhớ kho + giờ hạn chót lần trước cho lần mở sau', async () => {
  await renderModal()
  await click(contentTrigger())
  await click(buttonByText('Kho tổng', document.querySelector('[role="listbox"]')!.parentElement!))
  await click(option('Content kho tổng'))
  const input = container.querySelector<HTMLInputElement>('input[type="datetime-local"]')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, `${vnDate(0)}T16:30`)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await key(document, { key: 'Enter', metaKey: true })
  await flush()
  expect(onSuccess).toHaveBeenCalled()

  await act(async () => root.unmount())
  root = createRoot(container)
  await renderModal()
  expect(contentTrigger().textContent).toContain('Tìm trong kho tổng')
  expect(container.querySelector<HTMLInputElement>('input[type="datetime-local"]')!.value).toBe(`${vnDate(0)}T16:30`)
})

it('nhân bản: điền sẵn SP + nguồn, chưa có content thì chưa tạo được', async () => {
  await renderModal({
    team_id: 't1',
    deadline: `${vnDate(0)}T09:00`,
    product: { scope: 'team', value: 'tp-9', actualId: 'tp-9', item: { value: 'tp-9', label: 'Ví nhân bản', image: null } },
    sources: { source_outro_id: 'global:o-1' },
    origin: 'Nhân bản từ: Video cũ — chọn content mới',
  })
  expect(container.textContent).toContain('Nhân bản từ: Video cũ')
  expect(productTrigger().textContent).toContain('Ví nhân bản')
  expect(container.textContent).toContain('1 đã chọn')

  await key(document, { key: 'Enter', ctrlKey: true })
  expect(mockCreateTask).not.toHaveBeenCalled()

  await click(contentTrigger())
  await click(option('Content một'))
  await key(document, { key: 'Enter', ctrlKey: true })
  await flush()
  expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
    team_id: 't1', deadline: `${vnDate(0)}T09:00`, editor_content_id: 'ec-1', team_product_id: 'tp-9', source_outro_id: 'o-1',
  }))
})

// ── Viết content mới ngay trong modal ─────────────────────────────────────────

const titleInput = () => document.querySelector<HTMLInputElement>('input[placeholder^="Nhập tiêu đề"]')!
const codeInput = () => document.querySelector<HTMLInputElement>('input[placeholder="VD: CT-101"]')!
const bodyInput = () => document.querySelector<HTMLTextAreaElement>('textarea[placeholder^="Dán kịch bản"]')!

async function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

// Giả lập dán: phát sự kiện paste (có clipboardData) rồi chèn chữ vào ô như trình duyệt làm
async function pasteInto(el: HTMLTextAreaElement, text: string) {
  const ev = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'clipboardData', { value: { getData: () => text } })
  await act(async () => { el.dispatchEvent(ev) })
  await typeInto(el, el.value + text)
}

const PLAN_A1: CreateTaskPrefill = { team_id: 't1', content_line: { id: 'line-a1', name: 'A1' }, origin: 'Theo kế hoạch A1' }

describe('Viết content mới ngay trong modal', () => {
  it('tìm không ra → "Viết content mới “…”": tiêu đề lấy từ ô tìm, tuyến theo kế hoạch; Tạo = lưu content rồi tạo task', async () => {
    await renderModal(PLAN_A1)
    await click(contentTrigger())
    await typeInto(searchInput()!, 'Ví da mới toanh')
    await click(buttonByText('Viết content mới “Ví da mới toanh”'))
    await flush(30)

    expect(titleInput().value).toBe('Ví da mới toanh')
    expect(document.activeElement).toBe(titleInput())
    expect(container.textContent).toContain('Lấy từ ô tìm kiếm')
    expect(container.textContent).toContain('Tự chọn theo kế hoạch A1')

    await key(document, { key: 'Enter', ctrlKey: true })
    await flush()
    expect(mockCreateEditorContent).toHaveBeenCalledWith('u1', expect.objectContaining({
      title: 'Ví da mới toanh', content_line_id: 'line-a1', market: 'VIETNAM', brand_type: 'DO_DA',
    }))
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ team_id: 't1', editor_content_id: 'ec-new-1' }))
    expect(mockCreateEditorContent.mock.invocationCallOrder[0]).toBeLessThan(mockCreateTask.mock.invocationCallOrder[0])
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('từ khoá dạng mã → ô Mã; từ khoá trùng tên tuyến → chọn tuyến (không thành tiêu đề)', async () => {
    await renderModal()
    await click(contentTrigger())
    await typeInto(searchInput()!, 'CT-999')
    await click(buttonByText('Viết content mới “CT-999”'))
    expect(codeInput().value).toBe('CT-999')
    expect(titleInput().value).toBe('')

    await click(buttonByText('Chọn từ kho'))
    await click(contentTrigger())
    await typeInto(searchInput()!, 'a2')
    await click(buttonByText('Viết content mới “a2”'))
    expect(titleInput().value).toBe('')
    expect(container.textContent).toContain('Tự chọn theo từ khoá đang tìm')

    await typeInto(titleInput(), 'Review túi A2')
    await key(document, { key: 'Enter', ctrlKey: true })
    await flush()
    expect(mockCreateEditorContent).toHaveBeenCalledWith('u1', expect.objectContaining({
      title: 'Review túi A2', code: 'CT-999', content_line_id: 'line-a2',
    }))
  })

  it('task lỗi sau khi đã lưu content → bấm tạo lại KHÔNG tạo trùng content', async () => {
    mockCreateTask.mockRejectedValueOnce({ response: { data: { message: 'Lỗi tạm' } } })
    await renderModal()
    await click(buttonByText('Viết content mới'))
    await typeInto(titleInput(), 'Content viết tay')
    await click(buttonByText('Tạo nhiệm vụ'))
    await flush()

    expect(toast.error).toHaveBeenCalledWith('Lỗi tạm (content mới đã lưu vào kho cá nhân — bấm tạo lại không bị trùng)')
    expect(contentTrigger().textContent).toContain('Content viết tay')

    await click(buttonByText('Tạo nhiệm vụ'))
    await flush()
    expect(mockCreateEditorContent).toHaveBeenCalledTimes(1)
    expect(mockCreateTask).toHaveBeenCalledTimes(2)
    expect(mockCreateTask.mock.calls[1][0]).toEqual(expect.objectContaining({ editor_content_id: 'ec-new-1' }))
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('lưu content lỗi → không tạo task, bản nháp giữ nguyên', async () => {
    mockCreateEditorContent.mockRejectedValueOnce({ response: { data: { message: 'Mã content đã tồn tại' } } })
    await renderModal()
    await click(buttonByText('Viết content mới'))
    await typeInto(titleInput(), 'Bản nháp quý')
    await click(buttonByText('Tạo nhiệm vụ'))
    await flush()

    expect(toast.error).toHaveBeenCalledWith('Không lưu được content: Mã content đã tồn tại')
    expect(mockCreateTask).not.toHaveBeenCalled()
    expect(titleInput().value).toBe('Bản nháp quý')
  })

  it('dán nội dung khi tiêu đề trống → tiêu đề = dòng đầu; tiêu đề đã có thì không đụng', async () => {
    await renderModal()
    await click(buttonByText('Viết content mới'))
    await pasteInto(bodyInput(), '#hot\nReview ví da 2 ngăn #vida\nCảnh 1: mở hộp')
    expect(titleInput().value).toBe('Review ví da 2 ngăn')
    expect(container.textContent).toContain('Lấy từ dòng đầu nội dung')
    expect(bodyInput().value).toContain('Cảnh 1: mở hộp')

    await typeInto(titleInput(), 'Tự đặt')
    expect(container.textContent).not.toContain('Lấy từ dòng đầu nội dung')
    await pasteInto(bodyInput(), '\nDòng khác')
    expect(titleInput().value).toBe('Tự đặt')
  })

  it('Tạo & tạo tiếp: quay lại form viết mới trống, giữ tuyến, focus tiêu đề', async () => {
    await renderModal(PLAN_A1)
    await click(buttonByText('Viết content mới'))
    await typeInto(titleInput(), 'Bài 1')
    await key(document, { key: 'Enter', ctrlKey: true, shiftKey: true })
    await flush(30)

    expect(onSuccess).not.toHaveBeenCalled()
    expect(titleInput().value).toBe('')
    expect(document.activeElement).toBe(titleInput())
    expect(container.textContent).toContain('Giống lần viết content trước')

    await typeInto(titleInput(), 'Bài 2')
    await key(document, { key: 'Enter', ctrlKey: true, shiftKey: true })
    await flush(30)
    expect(mockCreateEditorContent).toHaveBeenLastCalledWith('u1', expect.objectContaining({ title: 'Bài 2', content_line_id: 'line-a1' }))
    expect(mockCreateTask).toHaveBeenLastCalledWith(expect.objectContaining({ editor_content_id: 'ec-new-2' }))
    expect(container.textContent).toContain('Đã tạo 2 nhiệm vụ')
  })

  it('tiêu đề trùng content trong kho cá nhân → cảnh báo, "Dùng content có sẵn" không tạo bản trùng', async () => {
    await renderModal()
    await click(buttonByText('Viết content mới'))
    await typeInto(titleInput(), '  content MỘT ')
    await flush(450) // debounce 400ms
    await flush(20)  // React render lại sau act → query tra kho mới chạy
    await flush(20)
    expect(container.textContent).toContain('Kho cá nhân đã có content cùng tiêu đề')

    await click(buttonByText('Dùng content có sẵn'))
    expect(contentTrigger().textContent).toContain('Content một')
    await key(document, { key: 'Enter', ctrlKey: true })
    await flush()
    expect(mockCreateEditorContent).not.toHaveBeenCalled()
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ editor_content_id: 'ec-1' }))
  })

  it('nhớ chế độ "Viết content mới" + tuyến cho lần mở sau', async () => {
    await renderModal(PLAN_A1)
    await click(buttonByText('Viết content mới'))
    await typeInto(titleInput(), 'Lần một')
    await key(document, { key: 'Enter', ctrlKey: true })
    await flush()
    expect(onSuccess).toHaveBeenCalled()

    await act(async () => root.unmount())
    root = createRoot(container)
    await renderModal()
    expect(document.activeElement).toBe(titleInput())
    expect(container.textContent).toContain('Giống lần viết content trước')
    await typeInto(titleInput(), 'Lần hai')
    await key(document, { key: 'Enter', ctrlKey: true })
    await flush()
    expect(mockCreateEditorContent).toHaveBeenLastCalledWith('u1', expect.objectContaining({ title: 'Lần hai', content_line_id: 'line-a1' }))
  })

  it('chọn nhiều + viết mới: Enter ở tiêu đề = lưu & viết tiếp; bản nháp còn lại cũng được tạo', async () => {
    await renderModal()
    await click(switchBtn())
    await click(buttonByText('Viết content mới'))
    await typeInto(titleInput(), 'Một')
    await key(titleInput(), { key: 'Enter' })
    await flush(30)
    expect(mockCreateEditorContent).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll('[aria-label="Content đã chọn"] li')).toHaveLength(1)
    expect(titleInput().value).toBe('')

    // Enter lúc bộ gõ tiếng Việt đang ghép chữ → không lưu
    await typeInto(titleInput(), 'Hai')
    await key(titleInput(), { key: 'Enter', isComposing: true })
    expect(mockCreateEditorContent).toHaveBeenCalledTimes(1)

    await click(buttonByText('Tạo 2 nhiệm vụ'))
    await flush()
    expect(mockCreateEditorContent).toHaveBeenCalledTimes(2)
    expect(mockCreateTask.mock.calls.map(c => c[0].editor_content_id)).toEqual(['ec-new-1', 'ec-new-2'])
  })
})

it('chọn nhiều + viết mới: SP chọn cho content đang viết đi đúng content đó', async () => {
  await renderModal()
  await click(switchBtn())
  await click(buttonByText('Viết content mới'))
  const draftProductTrigger = () => {
    const label = Array.from(document.querySelectorAll('label')).find(l => l.textContent === 'Sản phẩm cho content này')!
    return document.getElementById(label.htmlFor) as HTMLButtonElement
  }
  await typeInto(titleInput(), 'Có SP')
  await click(draftProductTrigger())
  await click(option('Ví da K1'))
  await key(titleInput(), { key: 'Enter' })
  await flush(30)

  expect(rowProductTrigger(0).textContent).toContain('Ví da K1')
  // SP của bản nháp không tự chuyển sang content viết tiếp
  expect(draftProductTrigger().textContent).toContain('Không bắt buộc')

  await typeInto(titleInput(), 'Không SP')
  await click(buttonByText('Tạo 2 nhiệm vụ'))
  await flush()
  expect(mockCreateTask.mock.calls.map(c => [c[0].editor_content_id, c[0].team_product_id])).toEqual([
    ['ec-new-1', 'tp-1'],
    ['ec-new-2', undefined],
  ])
})

// ── Phím Enter = tạo nhiệm vụ ────────────────────────────────────────────────

// Phát Enter lên 1 phần tử, trả về event để xem có bị chặn (preventDefault) không
async function pressEnter(target: EventTarget, init: KeyboardEventInit = {}) {
  const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init })
  await act(async () => { target.dispatchEvent(ev) })
  await flush()
  return ev
}

describe('Enter để tạo nhiệm vụ', () => {
  it('chọn content bằng bàn phím xong (focus về ô Content) → Enter tạo luôn', async () => {
    await renderModal()
    await click(contentTrigger())
    await key(searchInput()!, { key: 'Enter' }) // Enter trong danh sách = chọn dòng, chưa tạo
    expect(mockCreateTask).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(contentTrigger())

    await pressEnter(contentTrigger())
    expect(mockCreateTask).toHaveBeenCalledTimes(1)
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ editor_content_id: 'ec-1' }))
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('Shift+Enter = Tạo & tạo tiếp', async () => {
    await renderModal()
    await click(contentTrigger())
    await click(option('Content hai'))
    await pressEnter(contentTrigger(), { shiftKey: true })
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ editor_content_id: 'ec-2' }))
    expect(onSuccess).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Đã tạo 1 nhiệm vụ')
  })

  it('form chưa đủ (chưa có content) → Enter không bị chặn, để ô Content mở danh sách như thường', async () => {
    await renderModal()
    const ev = await pressEnter(contentTrigger())
    expect(ev.defaultPrevented).toBe(false)
    expect(mockCreateTask).not.toHaveBeenCalled()
  })

  it('ô Content đã chọn: ↓ mở lại danh sách (Enter giờ dành cho tạo)', async () => {
    await renderModal()
    await click(contentTrigger())
    await click(option('Content một'))
    await key(contentTrigger(), { key: 'ArrowDown' })
    expect(searchInput()).not.toBeNull()
  })

  it('viết content mới: Enter ở ô tiêu đề tạo luôn; Enter ở ô nội dung là xuống dòng', async () => {
    await renderModal()
    await click(buttonByText('Viết content mới'))
    await typeInto(titleInput(), 'Gõ xong Enter')
    const inBody = await pressEnter(bodyInput())
    expect(inBody.defaultPrevented).toBe(false)
    expect(mockCreateEditorContent).not.toHaveBeenCalled()

    await pressEnter(titleInput())
    expect(mockCreateEditorContent).toHaveBeenCalledWith('u1', expect.objectContaining({ title: 'Gõ xong Enter' }))
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ editor_content_id: 'ec-new-1' }))
  })

  it('Enter lúc bộ gõ tiếng Việt đang ghép chữ không tạo', async () => {
    await renderModal()
    await click(buttonByText('Viết content mới'))
    await typeInto(titleInput(), 'Tiêu đề có dấu')
    await pressEnter(titleInput(), { isComposing: true })
    expect(mockCreateEditorContent).not.toHaveBeenCalled()
  })

  it('Enter ở nút khác (chip ngày, Huỷ...) là bấm nút đó, không tạo nhiệm vụ', async () => {
    await renderModal()
    await click(contentTrigger())
    await click(option('Content một'))
    const ev = await pressEnter(buttonByText('Ngày mai'))
    expect(ev.defaultPrevented).toBe(false)
    expect(mockCreateTask).not.toHaveBeenCalled()
  })
})

// ── Điền sẵn: Nhân bản / Kế hoạch ngày ───────────────────────────────────────

const task = (over: Partial<Task>): Task => ({
  id: 'task-1',
  team_id: 'team-1',
  assignee_id: 'editor-1',
  deadline: '2026-09-30T10:50:00.000Z', // 17:50 giờ VN
  content_id: null, editor_content_id: null, team_content_id: null,
  product_id: null, editor_product_id: null, team_product_id: null,
  source_outro_id: null, source_extra_id: null, source_workshop_id: null, source_huyk_id: null,
  editor_source_outro_id: null, editor_source_extra_id: null, editor_source_workshop_id: null, editor_source_huyk_id: null,
  team_source_outro_id: null, team_source_extra_id: null, team_source_workshop_id: null, team_source_huyk_id: null,
  ...over,
} as unknown as Task)

describe('prefillFromTask (nút Nhân bản)', () => {
  // 18:30 UTC ngày 6/10 = 01:30 sáng 7/10 giờ VN — "hôm nay" phải là 7/10 dù máy/CI chạy UTC
  beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-10-06T18:30:00.000Z') }) })
  afterEach(() => { jest.useRealTimers() })

  it('chép team, người được giao và GIỜ hạn chót sang hôm nay (giờ VN), không chép content', () => {
    const p = prefillFromTask(task({
      editor_content_id: 'ec-1',
      editor_content: { id: 'ec-1', title: 'Ví da nam bò sáp', code: 'C01' } as any,
    }))
    expect(p.team_id).toBe('team-1')
    expect(p.assignee_id).toBe('editor-1')
    expect(p.deadline).toBe('2026-10-07T17:50')
    expect(p).not.toHaveProperty('content_line')
    expect(p.origin).toBe('Nhân bản từ: Ví da nam bò sáp — chọn content mới')
  })

  it('task chưa giao ai → assignee rỗng; không có hạn → 17:50 hôm nay', () => {
    const p = prefillFromTask(task({ assignee_id: null, deadline: null }))
    expect(p.assignee_id).toBe('')
    expect(p.deadline).toBe('2026-10-07T17:50')
    expect(p.origin).toBe('Nhân bản nhiệm vụ — chọn content mới')
  })

  it('sản phẩm kho cá nhân / kho team giữ đúng kho và id thật để gửi BE', () => {
    expect(prefillFromTask(task({
      editor_product_id: 'ep-1',
      editor_product: { id: 'ep-1', name: 'Ví A', sku: 'SKU-A', image_url: null, image_urls: [] } as any,
    })).product).toEqual({
      scope: 'personal', value: 'ep-1', actualId: 'ep-1',
      item: { value: 'ep-1', label: 'Ví A', sublabel: 'SKU-A', image: null },
    })
    expect(prefillFromTask(task({
      team_product_id: 'tp-1',
      team_product: { id: 'tp-1', name: null, sku: null, source_editor_product: { name: 'Ví gốc', sku: 'SKU-G' } } as any,
    })).product).toMatchObject({
      scope: 'team', value: 'tp-1', actualId: 'tp-1', item: { label: 'Ví gốc', sublabel: 'SKU-G' },
    })
  })

  it('SP kho tổng (OMS) đang chờ materialize → giữ oms_product_id/oms_variant_id; SP local cũ thì bỏ', () => {
    expect(prefillFromTask(task({ oms_product_id: 'oms-1', oms_variant_id: 'var-1' })).product).toMatchObject({
      scope: 'global', value: 'oms-1', oms: { oms_product_id: 'oms-1', oms_variant_id: 'var-1' },
    })
    expect(prefillFromTask(task({ product_id: 'legacy-1' })).product).toBeUndefined()
  })

  it('nguồn gắn tiền tố đúng kho (global > editor > team) để resolve lại khi tạo', () => {
    const p = prefillFromTask(task({
      source_outro_id: 'g-outro',
      editor_source_extra_id: 'e-extra',
      team_source_workshop_id: 't-ws',
    }))
    expect(p.sources).toEqual({
      source_outro_id: 'global:g-outro',
      source_collected_id: 'editor:e-extra',
      source_workshop_id: 'team:t-ws',
      source_huyk_id: '',
    })
  })

  it('tiêu đề dài bị cắt ở 80 ký tự trong dòng phụ', () => {
    const p = prefillFromTask(task({ content: { id: 'c-1', title: 'x'.repeat(120) } as any, content_id: 'c-1' }))
    expect(p.origin).toBe(`Nhân bản từ: ${'x'.repeat(80)}… — chọn content mới`)
  })
})

describe('prefillFromDailyPlan (Tự tạo nhiệm vụ trong hộp thoại kế hoạch)', () => {
  it('đúng team + hạn chót của kế hoạch (giờ VN), lọc sẵn tuyến, giao cho chính mình', () => {
    const plan = {
      id: 'plan-1',
      team: { id: 'team-2', name: 'K2', market: 'VIETNAM' },
      content_line: { id: 'line-a1', name: 'A1' },
      deadline: '2026-10-08T10:00:00.000Z',
    } as DailyPlan
    expect(prefillFromDailyPlan(plan, 'me')).toEqual({
      team_id: 'team-2',
      assignee_id: 'me',
      deadline: '2026-10-08T17:00',
      content_line: { id: 'line-a1', name: 'A1' },
      origin: 'Theo kế hoạch A1 · hạn 08/10',
    })
  })
})

// ─── Content viết mới trong modal (EMPTY_DRAFT / prefillDraft / titleFromText…) ───

const LINES: ContentLine[] = [
  { id: 'l-a1', name: 'A1' },
  { id: 'l-a2', name: 'A2' },
]

const draft = (over: Partial<ContentDraft> = {}): ContentDraft => ({ ...EMPTY_DRAFT, ...over })

describe('looksLikeCode — từ khoá là mã hay tiêu đề', () => {
  it.each(['CT-101', 'C101', '101', 'VCB_01', 'k1.2'])('"%s" là mã', s => expect(looksLikeCode(s)).toBe(true))
  it.each(['ví da', 'Ví', 'review ví 2 ngăn', 'CT-', 'abc'])('"%s" không phải mã', s => expect(looksLikeCode(s)).toBe(false))
})

describe('normalizeTitle', () => {
  it('chữ Việt dạng NFD (dán từ nguồn khác) khớp dạng NFC, không phân biệt hoa thường/khoảng trắng', () => {
    expect(normalizeTitle('Ví  da  BÒ sáp '.normalize('NFD'))).toBe(normalizeTitle('ví da bò sáp'))
  })
})

describe('titleFromText — tiêu đề từ nội dung vừa dán', () => {
  it('lấy dòng có chữ đầu tiên, bỏ hashtag', () => {
    expect(titleFromText('\n\n#vidanam #xuhuong\nVí da bò sáp giá rẻ #sale\nNội dung...')).toBe('Ví da bò sáp giá rẻ')
  })
  it('bỏ gạch đầu dòng, đánh số, nhãn "Tiêu đề:" và ** bao quanh', () => {
    expect(titleFromText('- Hook mở đầu')).toBe('Hook mở đầu')
    expect(titleFromText('1. Cảnh 1')).toBe('Cảnh 1')
    expect(titleFromText('Tiêu đề: Review thắt lưng')).toBe('Review thắt lưng')
    expect(titleFromText('**Unbox ví mới**')).toBe('Unbox ví mới')
  })
  it('quá 150 ký tự thì cắt ở ranh giới từ, không cụt giữa chữ', () => {
    const t = titleFromText(`${'chữ '.repeat(60)}cuối`)
    expect(t.length).toBeLessThanOrEqual(150)
    expect(t.endsWith('chữ')).toBe(true)
  })
  it('chuẩn hoá NFC', () => {
    expect(titleFromText('Bò sáp'.normalize('NFD'))).toBe('Bò sáp'.normalize('NFC'))
  })
  it('chỉ có hashtag/khoảng trắng → rỗng (không điền gì)', () => {
    expect(titleFromText('#a #b\n   \n')).toBe('')
  })
})

describe('prefillDraft — điền sẵn khi bấm "Viết content mới"', () => {
  it('từ khoá thường → tiêu đề; trông như mã → ô Mã', () => {
    expect(prefillDraft(draft(), {}, { search: '  ví da  mới ', lines: LINES })).toEqual({
      draft: draft({ title: 'ví da mới' }), hints: { title: 'search' },
    })
    expect(prefillDraft(draft(), {}, { search: 'CT-101', lines: LINES })).toEqual({
      draft: draft({ code: 'CT-101' }), hints: { code: 'search' },
    })
  })

  it('từ khoá trùng tên tuyến → chọn tuyến, KHÔNG thành tiêu đề', () => {
    expect(prefillDraft(draft(), {}, { search: 'a2', lines: LINES })).toEqual({
      draft: draft({ content_line_id: 'l-a2' }), hints: { line: 'search' },
    })
  })

  it('không bao giờ ghi đè tiêu đề/mã/tuyến người dùng tự nhập', () => {
    const mine = draft({ title: 'Tiêu đề của tôi', code: 'X-1', content_line_id: 'l-a1' })
    expect(prefillDraft(mine, {}, { search: 'CT-9', lines: LINES, planLine: LINES[1], lastLineId: 'l-a2' }))
      .toEqual({ draft: mine, hints: {} })
    expect(prefillDraft(mine, {}, { search: 'ví khác', lines: LINES }).draft.title).toBe('Tiêu đề của tôi')
  })

  it('tuyến: từ khoá > kế hoạch > lần trước; tự điền yếu hơn thì được thay, mạnh hơn thì giữ', () => {
    expect(prefillDraft(draft(), {}, { search: '', lines: LINES, planLine: LINES[0], lastLineId: 'l-a2' }).hints.line).toBe('plan')
    expect(prefillDraft(draft(), {}, { search: '', lines: LINES, lastLineId: 'l-a2' }).draft.content_line_id).toBe('l-a2')

    // đã tự điền "lần trước" → kế hoạch / từ khoá thay được
    const fromLast = draft({ content_line_id: 'l-a2' })
    expect(prefillDraft(fromLast, { line: 'last' }, { search: '', lines: LINES, planLine: LINES[0] }).draft.content_line_id).toBe('l-a1')
    expect(prefillDraft(fromLast, { line: 'last' }, { search: 'A1', lines: LINES }).hints.line).toBe('search')

    // đã tự điền theo từ khoá → kế hoạch không thay
    const fromSearch = draft({ content_line_id: 'l-a2' })
    expect(prefillDraft(fromSearch, { line: 'search' }, { search: '', lines: LINES, planLine: LINES[0] }).draft.content_line_id).toBe('l-a2')
  })

  it('tuyến đã bị xoá khỏi danh mục thì bỏ qua; danh mục chưa tải thì tạm nhận', () => {
    expect(prefillDraft(draft(), {}, { search: '', lines: LINES, lastLineId: 'l-deleted' })).toEqual({ draft: draft(), hints: {} })
    expect(prefillDraft(draft(), {}, { search: '', lines: undefined, lastLineId: 'l-deleted' }).draft.content_line_id).toBe('l-deleted')
  })

  it('tiêu đề tự điền từ lần tìm trước được thay bằng từ khoá mới; tiêu đề lấy từ nội dung dán thì giữ', () => {
    expect(prefillDraft(draft({ title: 'cũ' }), { title: 'search' }, { search: 'mới', lines: LINES }).draft.title).toBe('mới')
    expect(prefillDraft(draft({ title: 'từ nội dung' }), { title: 'body' }, { search: 'mới', lines: LINES }).draft.title).toBe('từ nội dung')
  })
})
