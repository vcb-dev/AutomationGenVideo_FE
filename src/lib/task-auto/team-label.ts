/** "K4" → "Team K4"; tên đã có tiền tố Team (vd "Team K4") thì giữ nguyên để không thành "Team Team K4". */
export function formatTeamName(name: string): string {
  const trimmed = name.trim()
  return /^team\b/i.test(trimmed) ? trimmed : `Team ${trimmed}`
}
