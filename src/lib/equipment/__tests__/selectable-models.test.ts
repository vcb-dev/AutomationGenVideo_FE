import { ModelOption } from '../group-models';
import { noModelLeft, selectableModels } from '../selectable-models';

const model = (id: string, name = `Model ${id}`): ModelOption => ({
  id,
  name,
  categoryId: 'cat-1',
  categoryName: 'Lens',
  totalUnits: 1,
});

const MODELS = [model('m1'), model('m2'), model('m3')];

describe('selectableModels', () => {
  it('bỏ model mà dòng khác đã khai', () => {
    // Đây là gốc của lỗi: ba dòng cùng một model đều hỏi khả dụng riêng nên cùng báo "còn 1
    // máy", rồi tóm tắt cộng thành 3 máy cho model chỉ có 1 chiếc.
    const options = selectableModels(MODELS, ['m1', ''], 1);

    expect(options.map((m) => m.id)).toEqual(['m2', 'm3']);
  });

  it('giữ lại model của CHÍNH dòng đang xét, nếu không thì ô chọn tự rỗng', () => {
    const options = selectableModels(MODELS, ['m1', 'm2'], 0);

    expect(options.map((m) => m.id)).toEqual(['m1', 'm3']);
  });

  it('dòng chưa chọn gì thì không chiếm model nào của dòng khác', () => {
    const options = selectableModels(MODELS, ['', ''], 0);

    expect(options.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('khai hết model thì dòng trống không còn gì để chọn', () => {
    const options = selectableModels(MODELS, ['m1', 'm2', 'm3', ''], 3);

    expect(options).toEqual([]);
  });

  it('không còn model nào trong kho thì trả danh sách rỗng, không vỡ', () => {
    expect(selectableModels([], ['', ''], 0)).toEqual([]);
  });
});

describe('noModelLeft', () => {
  it('còn model chưa khai thì vẫn thêm được dòng', () => {
    expect(noModelLeft(MODELS, ['m1', ''])).toBe(false);
  });

  it('khai hết model thì khoá nút thêm dòng', () => {
    expect(noModelLeft(MODELS, ['m1', 'm2', 'm3'])).toBe(true);
  });

  it('kho chưa tải xong thì chưa khoá, tránh chặn nhầm lúc danh sách còn rỗng', () => {
    // models rỗng lúc đầu là "chưa biết", không phải "hết model". Khoá ở đây thì người dùng vào
    // trang trước khi API trả về sẽ thấy nút chết mà không rõ vì sao.
    expect(noModelLeft([], [''])).toBe(false);
  });

  it('dòng trống không tính là đã khai model', () => {
    expect(noModelLeft(MODELS, ['m1', '', ''])).toBe(false);
  });
});
