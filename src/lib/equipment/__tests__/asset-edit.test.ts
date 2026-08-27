import { buildUpdatePayload, deleteBlockReason } from '../asset-edit';

const ASSET = {
  asset_code: 'CAM-001',
  serial_number: 'SN-CU',
  status: 'AVAILABLE',
  condition: 'GOOD',
  model: { id: 'model-1', name: 'Sony A7 IV', category: { id: 'cat-1', name: 'Camera' } },
  location: { id: 'loc-1', name: 'Tủ A' },
};

const FORM = {
  modelId: 'model-1',
  serialNumber: 'SN-CU',
  locationId: 'loc-1',
  condition: 'GOOD',
  status: 'AVAILABLE',
  note: '',
};

describe('buildUpdatePayload', () => {
  it('không đổi gì thì gửi payload rỗng', () => {
    // Gửi cả form thì mỗi lần bấm Lưu đều ghi đè mọi cột bằng chính giá trị cũ, và nhật ký
    // vòng đời đầy những mốc "đã sửa" mà chẳng có gì đổi.
    expect(buildUpdatePayload(ASSET, FORM)).toEqual({});
  });

  it('chỉ gửi đúng trường đã đổi', () => {
    expect(buildUpdatePayload(ASSET, { ...FORM, condition: 'USED' })).toEqual({
      condition: 'USED',
    });
  });

  it('gộp nhiều trường đổi trong một lần lưu', () => {
    const payload = buildUpdatePayload(ASSET, {
      ...FORM,
      serialNumber: 'SN-MOI',
      status: 'UNDER_MAINTENANCE',
    });
    expect(payload).toEqual({ serialNumber: 'SN-MOI', status: 'UNDER_MAINTENANCE' });
  });

  it('gỡ máy khỏi vị trí thì gửi chuỗi rỗng, không phải bỏ trống', () => {
    // BE phân biệt hai chuyện: bỏ trống là "đừng đụng chỗ cũ", chuỗi rỗng là "cố ý gỡ ra".
    expect(buildUpdatePayload(ASSET, { ...FORM, locationId: '' })).toEqual({ locationId: '' });
  });

  it('máy vốn chưa xếp chỗ mà vẫn để trống thì không gửi gì', () => {
    const chuaXepCho = { ...ASSET, location: null };
    expect(buildUpdatePayload(chuaXepCho, { ...FORM, locationId: '' })).toEqual({});
  });

  it('ghi chú luôn được gửi khi có nhập, dù không đổi trường nào khác', () => {
    // Ghi chú là thứ đi vào nhật ký vòng đời — người sửa cố ý viết thì phải tới nơi.
    expect(buildUpdatePayload(ASSET, { ...FORM, note: 'Đổi pin mới' })).toEqual({
      note: 'Đổi pin mới',
    });
  });

  it('ghi chú toàn khoảng trắng coi như không nhập', () => {
    expect(buildUpdatePayload(ASSET, { ...FORM, note: '   ' })).toEqual({});
  });

  it('serial thừa khoảng trắng hai đầu không tính là đã đổi', () => {
    // Copy serial từ Excel hay dính khoảng trắng; coi là đổi thì lần nào lưu cũng đụng BR-04.
    expect(buildUpdatePayload(ASSET, { ...FORM, serialNumber: '  SN-CU  ' })).toEqual({});
  });
});

describe('deleteBlockReason', () => {
  it('máy trên kệ thì xoá được', () => {
    expect(deleteBlockReason(ASSET)).toBeNull();
  });

  it('máy đang mượn thì chặn, nêu rõ lý do', () => {
    const reason = deleteBlockReason({ ...ASSET, status: 'ON_LOAN' });
    expect(reason).toMatch(/đang được mượn/i);
  });

  it('máy đang chờ kiểm tra sau trả thì chặn', () => {
    // Chưa ai kết luận nó ra sao mà đã xoá thì mất luôn manh mối của lần hỏng gần nhất.
    expect(deleteBlockReason({ ...ASSET, status: 'POST_RETURN_CHECK' })).not.toBeNull();
  });

  it('máy đã thanh lý rồi thì không xoá lại lần nữa', () => {
    expect(deleteBlockReason({ ...ASSET, status: 'DISPOSED' })).toMatch(/thanh lý/i);
  });

  it('máy đang bảo trì vẫn xoá được', () => {
    // Bảo trì là máy nằm ở xưởng chứ không phải đang ở tay ai; thanh lý luôn là chuyện thường.
    expect(deleteBlockReason({ ...ASSET, status: 'UNDER_MAINTENANCE' })).toBeNull();
  });
});
