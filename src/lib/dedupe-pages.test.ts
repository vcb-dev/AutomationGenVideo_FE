import { dedupeById } from './dedupe-pages';

/**
 * Lỗi thật người dùng báo: "khi cào video vẫn bị trùng".
 *
 * Đã tái hiện được trên DB thật: lấy trang 1 (24 video) → chèn 5 video mới đúng lúc job cào
 * đang chạy → lấy trang 2 thì 5 video cuối của trang 1 lặp lại nguyên vẹn. Nguyên nhân là
 * phân trang LIMIT/OFFSET: video mới xếp trước vị trí đang xem đẩy cả danh sách xuống 5 ô.
 * Màn hình dùng cuộn vô tận nên các trang được nối vào một mảng — video lặp hiện ra ngay.
 */
describe('dedupeById — lọc video lặp khi nối trang cuộn vô tận', () => {
    it('đúng tình huống đã tái hiện: 5 video cuối trang 1 lặp lại ở trang 2', () => {
        const trang1 = Array.from({ length: 24 }, (_, i) => ({ post_id: `v${i}` }));
        // Chèn 5 video lúc đang cào → trang 2 bắt đầu sớm 5 ô, lặp v19..v23
        const trang2 = [
            ...trang1.slice(19),
            ...Array.from({ length: 19 }, (_, i) => ({ post_id: `v${24 + i}` })),
        ];

        const noiTrang = [...trang1, ...trang2];
        expect(noiTrang).toHaveLength(48);

        const ketQua = dedupeById(noiTrang);
        expect(ketQua).toHaveLength(43);
        expect(new Set(ketQua.map((v) => v.post_id)).size).toBe(43);
    });

    it('giữ nguyên thứ tự, giữ lần xuất hiện ĐẦU TIÊN', () => {
        const items = [{ post_id: 'a' }, { post_id: 'b' }, { post_id: 'a' }, { post_id: 'c' }];
        expect(dedupeById(items).map((v) => v.post_id)).toEqual(['a', 'b', 'c']);
    });

    it('nhận diện được mọi kiểu khoá các danh sách đang dùng', () => {
        expect(dedupeById([{ video_id: 'x' }, { video_id: 'x' }])).toHaveLength(1);
        expect(dedupeById([{ note_id: 'n' }, { note_id: 'n' }])).toHaveLength(1);
        expect(dedupeById([{ shortcode: 's' }, { shortcode: 's' }])).toHaveLength(1);
        expect(dedupeById([{ id: 7 }, { id: 7 }])).toHaveLength(1);
        expect(dedupeById([{ url: 'https://a' }, { url: 'https://a' }])).toHaveLength(1);
    });

    it('KHÔNG gộp nhầm hai video khác nhau chỉ vì trùng giá trị ở trường khác tên', () => {
        // post_id 'x' và video_id 'x' là hai video khác nhau — khoá phải kèm cả tên trường.
        expect(dedupeById([{ post_id: 'x' }, { video_id: 'x' }])).toHaveLength(2);
    });

    it('phần tử không có khoá nào → giữ lại, thà hiện thừa còn hơn nuốt mất', () => {
        const items = [{ title: 'a' }, { title: 'b' }, { post_id: 'p' }, { post_id: 'p' }];
        expect(dedupeById(items)).toHaveLength(3);
    });

    it('mảng rỗng / phần tử null → không nổ', () => {
        expect(dedupeById([])).toEqual([]);
        expect(dedupeById([null, undefined, { post_id: 'p' }] as unknown[])).toHaveLength(3);
    });

    it('ưu tiên post_id khi một phần tử có nhiều khoá cùng lúc', () => {
        // Cùng post_id nhưng id khác nhau (vd BE đổi kiểu id) → vẫn phải coi là một video.
        const items = [
            { post_id: 'same', id: 1 },
            { post_id: 'same', id: 2 },
        ];
        expect(dedupeById(items)).toHaveLength(1);
    });
});
