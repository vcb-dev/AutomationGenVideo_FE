import { Asset } from '../api';
import { groupModels, listCategories } from '../group-models';

const asset = (
  id: string,
  modelId: string,
  modelName: string,
  categoryId: string,
  categoryName: string,
  status = 'AVAILABLE',
): Asset => ({
  id,
  asset_code: id,
  serial_number: `SN-${id}`,
  status,
  condition: 'GOOD',
  model: { id: modelId, name: modelName, category: { id: categoryId, name: categoryName } },
  location: null,
});

describe('groupModels', () => {
  it('gom nhiều máy cùng model thành một dòng và đếm đúng số máy', () => {
    const models = groupModels([
      asset('CAM-001', 'm1', 'Sony A7 IV', 'c1', 'Camera'),
      asset('CAM-002', 'm1', 'Sony A7 IV', 'c1', 'Camera'),
      asset('LEN-001', 'm2', 'Sony 24-70 GM II', 'c2', 'Lens'),
    ]);
    expect(models).toHaveLength(2);
    expect(models.find((m) => m.id === 'm1')?.totalUnits).toBe(2);
  });

  it('loại máy đã thanh lý và máy mất khỏi tổng số', () => {
    // Để chúng trong tổng khiến người mượn tưởng kho nhiều máy hơn thực tế.
    const models = groupModels([
      asset('CAM-001', 'm1', 'Sony A7 IV', 'c1', 'Camera'),
      asset('CAM-002', 'm1', 'Sony A7 IV', 'c1', 'Camera', 'DISPOSED'),
      asset('CAM-003', 'm1', 'Sony A7 IV', 'c1', 'Camera', 'LOST'),
    ]);
    expect(models[0].totalUnits).toBe(1);
  });

  it('máy đang mượn hoặc đang bảo trì vẫn nằm trong tổng số của model', () => {
    // Chúng sẽ quay lại kho; số mượn được là việc của /mems/availability, không phải của hàm này.
    const models = groupModels([
      asset('CAM-001', 'm1', 'Sony A7 IV', 'c1', 'Camera', 'ON_LOAN'),
      asset('CAM-002', 'm1', 'Sony A7 IV', 'c1', 'Camera', 'UNDER_MAINTENANCE'),
    ]);
    expect(models[0].totalUnits).toBe(2);
  });

  it('model chỉ toàn máy đã thanh lý thì biến mất khỏi danh sách', () => {
    expect(groupModels([asset('CAM-001', 'm1', 'Sony A7 IV', 'c1', 'Camera', 'DISPOSED')]))
      .toEqual([]);
  });

  it('xếp theo danh mục trước, tên model sau', () => {
    const models = groupModels([
      asset('LEN-001', 'm3', 'Sony 24-70', 'c2', 'Lens'),
      asset('CAM-001', 'm2', 'Sony A7 IV', 'c1', 'Camera'),
      asset('CAM-002', 'm1', 'Canon EOS R5', 'c1', 'Camera'),
    ]);
    expect(models.map((m) => m.name)).toEqual(['Canon EOS R5', 'Sony A7 IV', 'Sony 24-70']);
  });

  it('kho rỗng cho ra danh sách rỗng, không nổ', () => {
    expect(groupModels([])).toEqual([]);
  });
});

describe('listCategories', () => {
  it('mỗi danh mục chỉ xuất hiện một lần', () => {
    const cats = listCategories([
      asset('CAM-001', 'm1', 'Sony A7 IV', 'c1', 'Camera'),
      asset('CAM-002', 'm2', 'Canon EOS R5', 'c1', 'Camera'),
      asset('LEN-001', 'm3', 'Sony 24-70', 'c2', 'Lens'),
    ]);
    expect(cats).toEqual([
      { id: 'c1', name: 'Camera' },
      { id: 'c2', name: 'Lens' },
    ]);
  });
});
