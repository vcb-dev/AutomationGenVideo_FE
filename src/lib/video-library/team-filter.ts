/** Kho theo team: lọc video theo team (tab Team) và danh sách team cho bộ lọc của admin/manager. */

export interface LibraryTeam {
  id: string;
  name: string;
}

export interface TeamTaggedVideo {
  teams?: LibraryTeam[] | null;
}

/** Chỉ tab Team mới lọc theo team; 'all' = không lọc. Video thuộc nhiều team → khớp nếu có team được chọn. */
export function matchesTeamFilter(video: TeamTaggedVideo, activeTab: string, filterTeam: string): boolean {
  if (activeTab !== 'team' || filterTeam === 'all') return true;
  return (video.teams ?? []).some((t) => t.id === filterTeam);
}

/** Các team xuất hiện trong kho Team, không trùng, xếp theo tên tiếng Việt. */
export function buildTeamFilterOptions(videos: TeamTaggedVideo[]): { value: string; label: string }[] {
  return Array.from(new Map(videos.flatMap((v) => v.teams ?? []).map((t) => [t.id, t.name])).entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}
