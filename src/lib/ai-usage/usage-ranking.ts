/**
 * Xếp hạng người dùng theo điểm tiêu dùng AI — phần trả lời câu hỏi "ai dùng nhiều, ai dùng ít"
 * của trang Tổng quan Tiện ích AI.
 *
 * Tách khỏi component vì không được tin thứ tự mảng API trả về: trang còn lọc lại theo team
 * (leader chỉ thấy người của mình), nên hạng phải tự tính chứ không phải vị trí trong mảng.
 */

export interface UsageByUser {
    user_id: string;
    full_name: string;
    email: string;
    team?: string | null;
    characters: number;
    tts_count: number;
    clone_count: number;
    cost_vnd?: number;
    last_used_at: string;
}

export interface RankedUsage extends UsageByUser {
    /** 1 là người tiêu nhiều điểm nhất. Bằng điểm nhau thì cùng hạng. */
    rank: number;
    /** Tỉ lệ điểm của người này trên tổng cả kỳ, đơn vị %. Tổng bằng 0 thì trả 0. */
    share_percent: number;
}

/**
 * Sắp xếp giảm dần theo điểm đã tiêu và gắn hạng + tỉ trọng.
 * Bằng điểm thì xếp cùng hạng (1, 1, 3) và lấy tên làm tiêu chí phụ cho ổn định thứ tự.
 */
export function rankUsage(users: UsageByUser[]): RankedUsage[] {
    const total = users.reduce((sum, user) => sum + user.characters, 0);
    const sorted = [...users].sort(
        (a, b) => b.characters - a.characters || a.full_name.localeCompare(b.full_name, 'vi'),
    );

    let rank = 0;
    let previousCharacters: number | null = null;
    return sorted.map((user, index) => {
        if (previousCharacters === null || user.characters !== previousCharacters) {
            rank = index + 1;
            previousCharacters = user.characters;
        }
        return {
            ...user,
            rank,
            share_percent: total > 0 ? (user.characters / total) * 100 : 0,
        };
    });
}
