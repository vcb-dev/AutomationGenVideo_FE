import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ suggestions: [] });
    }

    try {
        // FIX LỖI FONT: Thêm &oe=utf-8 để Google trả về UTF-8 chuẩn
        // Thêm &gl=vn để ưu tiên kết quả tại Việt Nam
        const googleUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}&hl=vi&gl=vn&oe=utf-8`;

        const response = await fetch(googleUrl, { signal: AbortSignal.timeout(3000) });

        if (!response.ok) {
            throw new Error('Google API Error');
        }

        // Đọc dữ liệu dạng ArrayBuffer và decode UTF-8 thủ công để tránh mọi lỗi font tiềm ẩn
        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(arrayBuffer);

        const data = JSON.parse(text);
        const suggestions = data[1] || [];

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Proxy Suggest Error:', error);
        return NextResponse.json({ suggestions: [] });
    }
}
