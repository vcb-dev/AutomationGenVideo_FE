/**
 * Chức năng: kho theo team — tab Team lọc theo team được chọn, bộ lọc liệt kê các team có video.
 */
import { buildTeamFilterOptions, matchesTeamFilter } from '../team-filter';

const thai = { id: 't-thai', name: 'Global Thái Lan' };
const k0 = { id: 't-k0', name: 'Team K0' };

describe('matchesTeamFilter', () => {
  it('chọn "Tất cả team" → mọi video đều khớp', () => {
    expect(matchesTeamFilter({ teams: [thai] }, 'team', 'all')).toBe(true);
    expect(matchesTeamFilter({ teams: [] }, 'team', 'all')).toBe(true);
  });

  it('chọn một team → chỉ video gắn team đó', () => {
    expect(matchesTeamFilter({ teams: [thai] }, 'team', 't-thai')).toBe(true);
    expect(matchesTeamFilter({ teams: [k0] }, 'team', 't-thai')).toBe(false);
  });

  it('video thuộc nhiều team (người đề xuất ở nhiều team) → khớp khi chọn bất kỳ team nào', () => {
    expect(matchesTeamFilter({ teams: [k0, thai] }, 'team', 't-thai')).toBe(true);
    expect(matchesTeamFilter({ teams: [k0, thai] }, 'team', 't-k0')).toBe(true);
  });

  it('video chưa gắn team (teams rỗng / null) → không khớp khi đang lọc một team', () => {
    expect(matchesTeamFilter({ teams: null }, 'team', 't-thai')).toBe(false);
    expect(matchesTeamFilter({}, 'team', 't-thai')).toBe(false);
  });

  it('tab Chung không lọc theo team dù còn giữ lựa chọn cũ', () => {
    expect(matchesTeamFilter({ teams: [k0] }, 'shared', 't-thai')).toBe(true);
  });
});

describe('buildTeamFilterOptions', () => {
  it('gom team của mọi video, bỏ trùng, xếp theo tên tiếng Việt', () => {
    const options = buildTeamFilterOptions([{ teams: [k0] }, { teams: [thai, k0] }, { teams: null }, {}]);
    expect(options).toEqual([
      { value: 't-thai', label: 'Global Thái Lan' },
      { value: 't-k0', label: 'Team K0' },
    ]);
  });

  it('kho trống → không có team nào', () => {
    expect(buildTeamFilterOptions([])).toEqual([]);
  });
});
