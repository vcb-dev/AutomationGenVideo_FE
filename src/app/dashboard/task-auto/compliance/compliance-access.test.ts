import { UserRole } from '@/types/auth'
import { getComplianceVisibleTeams } from './compliance-access'

const teams = [
  { id: 'team-own', leader_id: 'leader-1' },
  { id: 'team-other', leader_id: 'leader-2' },
  { id: 'team-no-leader', leader_id: null },
]

describe('getComplianceVisibleTeams', () => {
  it('Leader chỉ nhìn thấy team mình quản lý', () => {
    expect(
      getComplianceVisibleTeams(teams, [UserRole.LEADER], 'leader-1').map(team => team.id),
    ).toEqual(['team-own'])
  })

  it('Leader không có user id thì không lộ danh sách team', () => {
    expect(getComplianceVisibleTeams(teams, [UserRole.LEADER], undefined)).toEqual([])
  })

  it('Admin/Manager vẫn xem được tất cả team', () => {
    expect(getComplianceVisibleTeams(teams, [UserRole.ADMIN], 'admin')).toEqual(teams)
    expect(getComplianceVisibleTeams(teams, [UserRole.MANAGER], 'manager')).toEqual(teams)
  })

  it('quyền Admin/Manager ưu tiên khi tài khoản có nhiều role', () => {
    expect(
      getComplianceVisibleTeams(teams, [UserRole.LEADER, UserRole.ADMIN], 'leader-1'),
    ).toEqual(teams)
  })
})
