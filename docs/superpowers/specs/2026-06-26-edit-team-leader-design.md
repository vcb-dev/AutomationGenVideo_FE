# Design Spec: Allow Leader to change Team for Members

This spec describes the change to allow Leaders (`callerRole === 'LEADER'`) to change the team of their members using a dropdown select in the HR management page, instead of only having a "Delete from team" button.

## Problem Description
In the current HR Management Edit Modal (`HRModal`), when a Leader edits a member, the "Đội nhóm" (Team) field is disabled, only showing a button "Xóa khỏi team" (Remove from team). However, in real workflows, a member might be transferred to another team (e.g. from JP1 to JP2), and the Leader should be able to select that team from a dropdown of existing teams.

## Proposed Changes

### Frontend Component: `HRModal` in [shared.tsx](file:///c:/WorkSpace/VienChiBao_Dev/AutomationGenVideo_FE/src/app/dashboard/hr-management/shared.tsx)

1. **Modify initial form state logic in `useEffect`**:
   - Change `team` field initialization when editing to prioritize `editing.team` first.
   - Fallback to `selfTeam` (for LEADER) or empty string (for MANAGER) if `editing.team` is not present.

2. **Modify the JSX rendering for the "Đội nhóm" (Team) field**:
   - Merge the condition for rendering the dropdown select: show it if `callerRole === 'LEADER'` OR if `callerRole === 'MANAGER' && form.roles[0] === UserRole.MEMBER`.
   - Ensure the dropdown lists `existingTeams`.
   - Update `team_leader_id` automatically when a team is selected if that team has exactly one leader.
   - If the list of existing teams is empty, show a text input that is disabled for Leaders but enabled for Managers.

## Verification Plan

### Manual Verification
1. Login/simulate being a Leader (e.g., "Nguyễn Toàn").
2. Navigate to HR Management.
3. Click "Edit" (Sửa) on a team member.
4. Verify that the "Đội nhóm" field is now a dropdown select listing all active teams.
5. Select a different team (e.g. "Global - JP2") and save changes.
6. Verify the member is successfully transferred to the selected team.
