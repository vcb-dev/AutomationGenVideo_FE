import { NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  // 'gemini-2.0-flash-001',
  // 'gemini-1.5-flash',
  // 'gemini-1.5-flash-001',
  // 'gemini-pro',
]

// MIME types mà Gemini inline_data chấp nhận
const GEMINI_SUPPORTED_MIMES = new Set([
  'application/pdf',
  'text/plain',
  'text/html',
  'text/csv',
  'text/markdown',
])

// Đọc magic bytes để xác định loại file thực sự
function detectMimeFromBytes(buffer: ArrayBuffer, headerContentType: string): string {
  const bytes = new Uint8Array(buffer.slice(0, 8))

  // PDF: bắt đầu bằng %PDF (25 50 44 46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf'
  }

  // Nếu header không phải octet-stream thì dùng header
  const headerMime = headerContentType.split(';')[0].trim()
  if (headerMime && headerMime !== 'application/octet-stream') return headerMime

  return 'application/octet-stream'
}

function extractDocId(url: string): string | null {
  return url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? null
}

function extractDriveId(url: string): string | null {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? null
}

type FileContent =
  | { kind: 'text'; text: string }
  | { kind: 'inline'; mimeType: string; data: string }

async function readDriveFile(fileUrl: string): Promise<FileContent | null> {
  try {
    // Google Docs → export plain text
    if (fileUrl.includes('docs.google.com/document')) {
      const docId = extractDocId(fileUrl)
      if (!docId) return null
      const res = await fetch(
        `https://docs.google.com/document/d/${docId}/export?format=txt`,
        { signal: AbortSignal.timeout(12000) },
      )
      if (!res.ok) return null
      const text = (await res.text()).trim()
      return text ? { kind: 'text', text } : null
    }

    // Drive file (PDF, DOCX...) → download + base64 cho Gemini đọc
    const fileId = extractDriveId(fileUrl)
    if (!fileId) return null
    const res = await fetch(
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      { signal: AbortSignal.timeout(20000) },
    )
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    // Drive trả HTML = trang confirm download (file lớn) → bỏ qua
    if (contentType.includes('text/html')) return null

    const buffer = await res.arrayBuffer()
    // Giới hạn 10 MB
    if (buffer.byteLength > 10 * 1024 * 1024) return null

    // Ưu tiên dùng magic bytes để xác định đúng loại file
    // vì Drive thường trả về application/octet-stream
    const mimeType = detectMimeFromBytes(buffer, contentType)

    // Gemini chỉ hỗ trợ một số MIME type nhất định cho inline_data
    // Nếu không phải loại được hỗ trợ → bỏ qua file, dùng text từ DB
    if (!GEMINI_SUPPORTED_MIMES.has(mimeType)) return null

    const data = Buffer.from(buffer).toString('base64')
    return { kind: 'inline', mimeType, data }
  } catch {
    return null
  }
}

interface ScriptParams {
  contentTitle?: string | null
  contentLine?: string | null
  contentMarket?: string | null
  scriptText?: string | null
  fileText?: string | null
  productName?: string | null
  productSku?: string | null
  productPrice?: string | null
  productMaterial?: string | null
  productPriceSegment?: string | null
  productLine?: string | null
  productMarket?: string | null
}

// Phân loại tuyến nội dung A1–A5 từ chuỗi contentLine
function detectContentLineType(contentLine?: string | null): string | null {
  if (!contentLine) return null
  const upper = contentLine.toUpperCase().trim()
  if (upper.startsWith('A1')) return 'A1'
  if (upper.startsWith('A2')) return 'A2'
  if (upper.startsWith('A3')) return 'A3'
  if (upper.startsWith('A4')) return 'A4'
  if (upper.startsWith('A5')) return 'A5'
  return null
}

// Mô tả định hướng & chiến lược theo từng tuyến nội dung
const CONTENT_LINE_GUIDE: Record<string, { goal: string; strategy: string; hookStyle: string; ctaStyle: string }> = {
  A1: {
    goal: 'Kéo view tối đa & khắc sâu nhận diện thương hiệu',
    strategy: `Ưu tiên yếu tố giải trí, xu hướng (trend), cảm xúc mạnh hoặc yếu tố bất ngờ để người xem dừng scroll.
Sản phẩm xuất hiện tự nhiên, không ép buộc — thương hiệu được lặp lại nhẹ nhàng 1–2 lần.
Nhịp video nhanh, hình ảnh động, âm thanh bắt tai. Không cần bán hàng trực tiếp — mục tiêu là lượt xem & nhớ brand.`,
    hookStyle: 'Gây sốc nhẹ, kể chuyện nhanh, câu hỏi khiêu khích, hoặc dùng trend đang viral — phải khiến người xem tò mò ngay lập tức.',
    ctaStyle: 'Follow để xem thêm / Lưu lại video này / Tag người bạn cần xem cái này',
  },
  A2: {
    goal: 'Khẳng định vị thế thương hiệu và xây dựng hình ảnh chuyên gia trong ngành',
    strategy: `Nội dung thể hiện sự am hiểu sâu về sản phẩm, ngành hàng, hoặc nhu cầu khách hàng.
Giọng điệu tự tin, chuyên nghiệp nhưng gần gũi. Có thể chia sẻ góc nhìn chuyên gia, behind-the-scenes, hoặc quá trình tạo ra sản phẩm.
Tránh quảng cáo lộ liễu — tập trung vào giá trị & câu chuyện thương hiệu.`,
    hookStyle: 'Câu mở đầu định vị chuyên gia: "Sau X năm trong ngành...", "Sai lầm mà 90% người dùng mắc phải...", "Bí quyết mà ít ai biết..."',
    ctaStyle: 'Follow để học thêm / Xem series tiếp theo / Bình luận câu hỏi của bạn',
  },
  A3: {
    goal: 'Xây dựng niềm tin vững chắc với khách hàng tiềm năng',
    strategy: `Dùng bằng chứng xã hội (social proof): review thật, trước/sau, số liệu cụ thể, chứng nhận, câu chuyện khách hàng thực tế.
Mỗi claim đều có dẫn chứng — tránh lời hứa suông. Giọng chân thực, không "quá đà".
Có thể dùng format: vấn đề → giải pháp → kết quả thực tế → cam kết thương hiệu.`,
    hookStyle: 'Nêu một nỗi lo thật của khách hàng hoặc một kết quả ấn tượng có thật: "Khách hàng của chúng tôi đã...", "Tôi đã thử sản phẩm này trong X tuần và..."',
    ctaStyle: 'Đọc đánh giá thật tại link bio / Nhắn tin để nhận tư vấn miễn phí / Xem thêm phản hồi khách hàng',
  },
  A4: {
    goal: 'Chuyển đổi trực tiếp — thúc đẩy người xem mua hàng ngay',
    strategy: `Nội dung tập trung 100% vào lý do MUA NGAY: giá tốt, ưu đãi có hạn, lợi ích rõ ràng, so sánh giá trị.
Hook ngay lập tức nêu lợi ích/ưu đãi. Body nhấn mạnh pain point và giải pháp. CTA mạnh với yếu tố khan hiếm/khẩn cấp.
Mỗi cảnh phục vụ mục đích bán hàng: demo sản phẩm, giá, ưu đãi, cam kết đổi trả.`,
    hookStyle: 'Nêu ưu đãi hoặc lợi ích cụ thể ngay: "Chỉ hôm nay giảm X%...", "Tại sao X triệu người chọn sản phẩm này?", "Bí quyết [kết quả] chỉ với [giá]..."',
    ctaStyle: 'Mua ngay hôm nay — link trong bio / Ưu đãi kết thúc lúc [giờ] / Inbox để đặt hàng ngay',
  },
  A5: {
    goal: 'Cung cấp giá trị kiến thức thực tiễn, mẹo hay — tạo engagement cao và giữ chân follower',
    strategy: `Format "X tips/mẹo/bước" hoặc "Bạn có biết..." rất hiệu quả cho tuyến này.
Nội dung phải thật sự hữu ích, actionable — người xem áp dụng được ngay.
Sản phẩm được lồng ghép tự nhiên như "công cụ/giải pháp" giúp thực hiện mẹo đó, không phải trọng tâm bán hàng.
Kết thúc bằng một takeaway đáng nhớ để người xem lưu/chia sẻ.`,
    hookStyle: 'Câu hỏi khơi gợi nhu cầu học hỏi: "Bạn có đang làm sai điều này?", "X mẹo [chủ đề] mà ai cũng nên biết", "[Con số] sai lầm khiến bạn [hậu quả]..."',
    ctaStyle: 'Lưu video để dùng sau / Follow để nhận thêm mẹo mỗi ngày / Bình luận bạn đang dùng cách nào',
  },
}

function buildPrompt(p: ScriptParams): string {
  const lines: string[] = []
  const lineType = detectContentLineType(p.contentLine)
  const guide = lineType ? CONTENT_LINE_GUIDE[lineType] : null
  const hasFileText = !!p.fileText
  const hasScript   = !!p.scriptText
  const hasSource   = hasFileText || hasScript
  const targetMarket = p.contentMarket || p.productMarket || null

  lines.push('Bạn là chuyên gia adapt content mạng xã hội (TikTok/Reels) cho thị trường Việt Nam.')
  lines.push('QUAN TRỌNG: Nhiệm vụ của bạn KHÔNG PHẢI là viết kịch bản quay video (không chia cảnh, không mô tả góc máy/hành động quay). Content bên dưới ĐÃ ĐƯỢC TEST THỰC TẾ VÀ CHỨNG MINH HIỆU QUẢ (content đã "win") cho một sản phẩm khác.')
  lines.push('Việc của bạn là ÁP DỤNG LẠI đúng phần lời/nội dung (copy) của content đã win đó cho sản phẩm mới được cung cấp — bám sát tối đa câu chữ, cấu trúc, nhịp điệu, giọng văn, hook, CTA của content gốc. CHỈ chỉnh sửa những chi tiết liên quan trực tiếp đến sản phẩm (tên, đặc điểm, chất liệu, giá, ưu đãi, USP...) để khớp với sản phẩm mới. Không sáng tạo thêm ý tưởng, không đổi cấu trúc, không đổi tông giọng nếu không bắt buộc. Output là MỘT ĐOẠN CONTENT LIỀN MẠCH (văn bản lời thoại/caption), không phải danh sách cảnh quay.')
  lines.push('')

  // ── Thông tin nội dung ──
  lines.push('═══ THÔNG TIN NỘI DUNG ═══')
  if (p.contentTitle)  lines.push(`Tiêu đề / Chủ đề: ${p.contentTitle}`)
  if (p.contentLine)   lines.push(`Tuyến nội dung: ${p.contentLine}`)
  if (p.contentMarket) lines.push(`Thị trường mục tiêu: ${p.contentMarket}`)

  // ── Bối cảnh tuyến nội dung (chỉ để hiểu tone gốc, không dùng để sáng tác mới) ──
  if (guide) {
    lines.push('')
    lines.push(`═══ BỐI CẢNH TUYẾN NỘI DUNG ${lineType} (tham khảo để hiểu tone, KHÔNG dùng để viết lại từ đầu) ═══`)
    lines.push(`Mục tiêu của content gốc: ${guide.goal}`)
    lines.push(`Phong cách Hook đặc trưng: ${guide.hookStyle}`)
    lines.push(`Phong cách CTA đặc trưng: ${guide.ctaStyle}`)
  }

  // ── Content gốc đã test win ──
  lines.push('')
  lines.push('═══ CONTENT GỐC ĐÃ TEST WIN (BẮT BUỘC BÁM SÁT — đây là nền tảng, không phải gợi ý) ═══')
  if (hasFileText) {
    if (hasScript) lines.push(`Script tóm tắt (tham khảo thêm): ${p.scriptText}`)
    lines.push('')
    lines.push('TÀI LIỆU ĐÍNH KÈM (content gốc — giữ nguyên cấu trúc, chỉ thay chi tiết sản phẩm):')
    lines.push(p.fileText!)
  } else if (hasScript) {
    lines.push('Script gốc đã win (giữ nguyên cấu trúc, chỉ thay chi tiết sản phẩm):')
    lines.push(p.scriptText!)
  } else {
    lines.push('(Không có content gốc được cung cấp — trường hợp này hãy sáng tác dựa trên tiêu đề, tuyến nội dung và thông tin sản phẩm bên dưới, vì không có gì để bám theo.)')
  }

  // ── Thông tin sản phẩm ──
  lines.push('')
  lines.push('═══ SẢN PHẨM MỚI CẦN ÁP DỤNG CONTENT VÀO ═══')
  if (p.productName)         lines.push(`Tên sản phẩm: ${p.productName}`)
  if (p.productSku)          lines.push(`SKU: ${p.productSku}`)
  if (p.productPrice)        lines.push(`Giá bán: ${p.productPrice}`)
  if (p.productMaterial)     lines.push(`Chất liệu: ${p.productMaterial}`)
  if (p.productPriceSegment) lines.push(`Phân khúc giá: ${p.productPriceSegment}`)
  if (p.productLine)         lines.push(`Dòng sản phẩm: ${p.productLine}`)
  if (p.productMarket)       lines.push(`Thị trường sản phẩm: ${p.productMarket}`)

  // ── Thị trường mục tiêu & bản dịch ──
  if (targetMarket) {
    lines.push('')
    lines.push('═══ THỊ TRƯỜNG MỤC TIÊU & NGÔN NGỮ ═══')
    lines.push(`Thị trường: ${targetMarket}`)
    lines.push('Hãy điều chỉnh content (ví dụ: đơn vị tiền tệ, cách xưng hô, ví dụ văn hóa, mức độ trang trọng...) cho phù hợp với người tiêu dùng ở thị trường này, dựa trên nền content gốc đã test win — vẫn giữ nguyên cấu trúc và tinh thần bản gốc, chỉ bản địa hóa chi tiết cần thiết.')
    lines.push('Sau đó BẮT BUỘC dịch toàn bộ content (và hashtags) sang ngôn ngữ chính thức/phổ biến được dùng trên mạng xã hội tại thị trường đó (nếu thị trường là Việt Nam thì không cần bản dịch riêng).')
  }

  // ── Yêu cầu output ──
  lines.push('')
  lines.push('═══ NHIỆM VỤ ═══')
  if (hasSource) {
    lines.push('Viết lại content gốc đã test win ở trên bằng tiếng Việt tự nhiên, ÁP DỤNG cho sản phẩm mới nêu trên. Đây KHÔNG phải kịch bản quay video — chỉ là phần lời/content hoàn chỉnh.')
    lines.push('')
    lines.push('YÊU CẦU BẮT BUỘC:')
    lines.push('1. BÁM SÁT content gốc: giữ nguyên cấu trúc câu chữ, thứ tự ý, độ dài, nhịp điệu, phong cách hook và CTA như bản gốc.')
    lines.push('2. CHỈ thay thế phần liên quan đến sản phẩm: tên sản phẩm, đặc điểm/chất liệu, giá/ưu đãi, USP — sao cho khớp chính xác và tự nhiên với sản phẩm mới.')
    lines.push('3. Nếu content gốc nhắc tên sản phẩm cũ, giá cũ, chất liệu cũ, đặc điểm cũ... phải thay hoàn toàn bằng thông tin sản phẩm mới, không được lẫn thông tin sản phẩm cũ.')
    lines.push('4. Không thêm/bớt ý tưởng sáng tạo ngoài phạm vi cần thiết để khớp sản phẩm — không đổi giọng văn, không đổi thông điệp cốt lõi của content gốc.')
    lines.push('5. Nếu content gốc thiếu thông tin mà sản phẩm mới cần nhấn mạnh (giá, chất liệu...), có thể bổ sung ngắn gọn nhưng không phá vỡ mạch của content gốc.')
    lines.push('6. KHÔNG chia thành cảnh/scene, KHÔNG mô tả góc máy/hành động quay/text overlay — chỉ trả về đúng phần lời văn liền mạch, giữ các dấu xuống dòng như content gốc (nếu có) để phân đoạn ý.')
    lines.push('7. Hashtags: thay hashtag đặc thù của sản phẩm/nội dung cũ bằng hashtag phù hợp sản phẩm mới; giữ hashtag ngành hàng/tuyến nội dung nếu vẫn còn đúng.')
  } else {
    lines.push('Viết content TikTok/Reels bằng tiếng Việt tự nhiên, sinh động. Đây KHÔNG phải kịch bản quay video — chỉ là phần lời/content hoàn chỉnh, KHÔNG chia cảnh, KHÔNG mô tả góc máy.')
    if (guide) {
      lines.push(`Toàn bộ nội dung phải phục vụ đúng mục tiêu: ${guide.goal}`)
    }
    lines.push('')
    lines.push('YÊU CẦU BẮT BUỘC:')
    lines.push('1. Hook (câu mở đầu): phải khiến người xem DỪNG SCROLL ngay lập tức — dùng yếu tố bất ngờ, câu hỏi, hoặc tuyên bố mạnh mẽ.')
    lines.push('2. Nội dung viết tự nhiên như người thật nói/viết, không nhồi nhét thông tin.')
    if (lineType === 'A4') {
      lines.push('3. Nêu rõ giá / ưu đãi. Tạo cảm giác khan hiếm hoặc khẩn cấp.')
    } else if (lineType === 'A3') {
      lines.push('3. Có social proof cụ thể (số liệu, testimonial, chứng nhận).')
    } else if (lineType === 'A5') {
      lines.push('3. Cấu trúc rõ ràng: intro → từng tip/bước → kết luận. Đánh số tips nếu có nhiều tips.')
    }
    lines.push(`4. CTA cuối: ${guide?.ctaStyle ?? 'rõ ràng, tạo cảm giác cấp bách hoặc giá trị'}`)
    lines.push('5. Hashtags: 5–8 hashtag, mix giữa broad (ngành hàng) và specific (sản phẩm, tuyến nội dung).')
  }
  lines.push('')
  lines.push('CHỈ trả về JSON hợp lệ (không markdown, không giải thích), đúng format sau:')
  lines.push(`{
  "content": "toàn bộ nội dung/lời văn hoàn chỉnh bằng tiếng Việt, viết liền mạch (có thể xuống dòng để phân đoạn ý), KHÔNG chia cảnh, KHÔNG mô tả góc máy/hành động quay",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "translation": ${targetMarket
    ? `{
    "language": "tên ngôn ngữ/thị trường đã dịch sang, ví dụ 'Tiếng Anh (Mỹ)', 'Tiếng Thái', 'Bahasa Indonesia'",
    "content": "bản dịch đầy đủ của content sang ngôn ngữ đó, đã bản địa hóa phù hợp văn hóa/thị trường",
    "hashtags": ["#tag1", "#tag2", "..."]
  }`
    : 'null'}
}`)

  return lines.join('\n')
}

export async function POST(req: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY chưa được cấu hình' }, { status: 500 })
  }

  const body = await req.json()
  const {
    fileUrl, scriptText, contentTitle, contentLine, contentMarket,
    productName, productSku, productPrice, productMaterial,
    productPriceSegment, productLine, productMarket,
  } = body

  const fileContent = fileUrl ? await readDriveFile(fileUrl) : null
  const fileText = fileContent?.kind === 'text' ? fileContent.text : null

  const prompt = buildPrompt({
    contentTitle, contentLine, contentMarket, scriptText, fileText,
    productName, productSku, productPrice, productMaterial,
    productPriceSegment, productLine, productMarket,
  })

  const parts: object[] = []
  if (fileContent?.kind === 'inline') {
    parts.push({ inline_data: { mime_type: fileContent.mimeType, data: fileContent.data } })
  }
  parts.push({ text: prompt })

  const requestBody = JSON.stringify({
    contents: [{ parts }],
    // Không dùng responseMimeType để tương thích với nhiều model hơn
    generationConfig: { temperature: 0.8 },
  })

  // Thử lần lượt các model, thu thập lỗi từng model để debug
  let geminiData: any = null
  const modelErrors: { model: string; status: number; message: string }[] = []

  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    })

    if (res.ok) {
      geminiData = await res.json()
      break
    }

    const errBody = await res.json().catch(() => ({}))
    modelErrors.push({
      model,
      status: res.status,
      message: errBody?.error?.message ?? `HTTP ${res.status}`,
    })

    // Auth fail hoặc quota = 0 → không thử tiếp
    if (res.status === 401 || res.status === 403 || res.status === 429) break
  }

  if (!geminiData) {
    const summary = modelErrors.map(e => `[${e.model}] ${e.status}: ${e.message}`).join(' | ')
    return NextResponse.json({ error: `Gemini API lỗi: ${summary}` }, { status: 502 })
  }

  const raw: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  const script = extractJson(raw)
  if (!script) {
    return NextResponse.json({ error: 'Không parse được kết quả từ AI', raw }, { status: 500 })
  }
  return NextResponse.json({ script })
}

function extractJson(text: string): any {
  // Thử parse thẳng
  try { return JSON.parse(text) } catch {}
  // Tìm trong block markdown ```json ... ```
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (mdMatch) { try { return JSON.parse(mdMatch[1]) } catch {} }
  // Lấy từ { đầu tiên đến } cuối cùng
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) { try { return JSON.parse(text.slice(start, end + 1)) } catch {} }
  return null
}
