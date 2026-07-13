/**
 * Local Instant Suggestion Generator
 * Generates Vietnamese TikTok-like suggestions INSTANTLY (0ms) from a curated word bank.
 * Used as Tier 1 while real API (YouTube Suggest) loads in background.
 */

// ─── Curated Vietnamese TikTok Word Bank ────────────────────────────────────
const TIKTOK_WORDBANK: string[] = [
    // Lifestyle & Beauty
    'làm đẹp tại nhà', 'skincare routine', 'trang điểm tự nhiên', 'tóc đẹp',
    'móng tay đẹp', 'nail art', 'kem dưỡng da', 'son môi', 'mặt nạ dưỡng',
    'chăm sóc da mụn', 'tẩy trang', 'serum dưỡng ẩm', 'chống nắng',

    // Food & Drink
    'review đồ ăn', 'ăn vặt ngon', 'nấu ăn nhanh', 'trà sữa', 'cà phê',
    'món ngon mỗi ngày', 'đồ ăn đường phố', 'bánh ngọt', 'ăn gì hôm nay',
    'công thức nấu ăn', 'đồ uống hot', 'bánh mì', 'phở', 'bún bò',

    // Fashion & Style
    'outfit of the day', 'thời trang thu đông', 'quần áo trendy', 'ootd',
    'giày hot trend', 'túi xách', 'phong cách street style', 'thời trang công sở',
    'mặc đẹp với ngân sách thấp', 'thời trang tối giản',

    // Fitness & Health
    'tập gym tại nhà', 'giảm cân hiệu quả', 'bài tập cardio', 'yoga',
    'ăn healthy', 'thực đơn giảm cân', 'tập thể dục buổi sáng',
    'workout routine', 'cách giảm mỡ bụng', 'chạy bộ',

    // Entertainment & Trending
    'viral tiktok', 'trend mới nhất', 'nhảy viral', 'nhạc hot',
    'phim hay nên xem', 'game hot', 'review phim', 'nhạc chill',
    'cover bài hát', 'rap việt', 'nhạc remix',

    // Tech & Gadgets
    'review điện thoại', 'iphone', 'samsung', 'laptop', 'tai nghe',
    'đồ công nghệ', 'app hay', 'tips điện thoại', 'review máy ảnh',

    // Travel
    'du lịch đà nẵng', 'du lịch hà nội', 'du lịch hội an', 'sài gòn',
    'khách sạn đẹp', 'địa điểm check in', 'du lịch bụi', 'vlog du lịch',

    // Home & Decor
    'decor phòng ngủ', 'trang trí nhà đẹp', 'phòng trọ đẹp',
    'dọn dẹp nhà cửa', 'sắp xếp tủ quần áo', 'cây cảnh trong nhà',

    // Business & Finance
    'kiếm tiền online', 'khởi nghiệp', 'đầu tư chứng khoán',
    'bán hàng online', 'tiktok shop', 'kinh doanh nhỏ',

    // Pets
    'mèo cute', 'chó cute', 'mèo hài hước', 'nuôi chó mèo',
    'thú cưng dễ thương', 'hamster', 'chó shiba',

    // DIY & Craft
    'tự làm', 'handmade', 'craft', 'cách làm', 'mẹo hay',
    'diy tại nhà', 'decor tự làm',

    // Vietnamese-specific TikTok trends
    'tiktok việt nam', 'trending việt nam', 'viral hôm nay',
    'thách thức viral', 'duet', 'reaction',

    // Jewelry (for VietChiBao context)
    'trang sức vàng', 'trang sức bạc', 'nhẫn vàng', 'dây chuyền vàng',
    'lắc tay bạc', 'bông tai', 'nhẫn đôi', 'trang sức handmade',
    'trang sức phong thủy', 'vòng tay', 'mặt dây chuyền',
];

// Common TikTok-style suffix patterns
const SUFFIXES = [
    ' viral', ' hot trend', ' trending', ' 2024', ' 2025',
    ' mới nhất', ' hay nhất', ' tốt nhất', ' rẻ', ' đẹp',
    ' review', ' hướng dẫn', ' cách làm', ' tại nhà', ' cho người mới',
    ' hiệu quả', ' nhanh', ' dễ', ' miễn phí',
];

// ─── Generator Logic ────────────────────────────────────────────────────────

/**
 * Generate instant suggestions from local word bank.
 * Uses fuzzy prefix matching + smart suffix combinations.
 */
export function generateLocalSuggestions(query: string, count = 8): string[] {
    if (!query || query.trim().length < 1) return [];

    const q = query.trim().toLowerCase();
    const results: Array<{ text: string; score: number }> = [];

    // 1. Prefix / contains match from word bank
    for (const word of TIKTOK_WORDBANK) {
        const w = word.toLowerCase();
        if (w.startsWith(q)) {
            results.push({ text: word, score: 100 }); // Prefix match = highest
        } else if (w.includes(q)) {
            const pos = w.indexOf(q);
            results.push({ text: word, score: 80 - pos }); // Earlier match = better
        }
    }

    // 2. Build variations from query + suffixes if not enough results
    if (results.length < count) {
        // Add query + common suffixes
        const needed = count - results.length;
        const shuffled = [...SUFFIXES].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(needed, shuffled.length); i++) {
            const suggestion = query.trim() + shuffled[i];
            // Avoid duplicates
            if (!results.find(r => r.text.toLowerCase() === suggestion.toLowerCase())) {
                results.push({ text: suggestion, score: 50 });
            }
        }
    }

    // Sort by score & deduplicate
    const seen = new Set<string>();
    const deduped = results
        .sort((a, b) => b.score - a.score)
        .filter(r => {
            const key = r.text.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

    // Shuffle within score tiers → same query typed again = different order/variety
    const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
    const tier1 = shuffle(deduped.filter(r => r.score >= 90));
    const tier2 = shuffle(deduped.filter(r => r.score >= 70 && r.score < 90));
    const tier3 = shuffle(deduped.filter(r => r.score < 70));
    const varied = [...tier1, ...tier2, ...tier3];
    return varied.slice(0, count).map(r => r.text);
}
