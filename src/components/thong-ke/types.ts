export interface ContentWinItem {
  dbId?: string;
  id: number;
  label: string;
  content: string;
  analysis: string;
  editor: string;
  views: string;
  likes?: string;
  comments?: string;
  shares?: string;
  platform?: string;
  postDate?: string;
  highlights?: string;
  improvements?: string;
  leaderComment?: string;
  notes?: string;
  thumbnail?: string;
  videoUrl?: string;
  isVoted?: string;
  isApproved?: string;
  scores?: any[];
}

export interface FailVideoItem {
  dbId?: string;
  id: number;
  label: string;
  content: string;
  failReason: string;
  editor: string;
  views: string;
  likes?: string;
  comments?: string;
  shares?: string;
  platform?: string;
  postDate?: string;
  highlights?: string;
  improvements?: string;
  leaderComment?: string;
  notes?: string;
  thumbnail?: string;
  videoUrl?: string;
  isVoted?: string;
  isApproved?: string;
  scores?: any[];
}

export interface CaseStudyItem {
  dbId?: string;
  id: number;
  label: string;
  title: string;
  channel: string;
  views: string;
  takeaway: string;
  likes?: string;
  comments?: string;
  shares?: string;
  platform?: string;
  postDate?: string;
  highlights?: string;
  improvements?: string;
  leaderComment?: string;
  notes?: string;
  videoUrl?: string;
  isVoted?: string;
  isApproved?: string;
}

export interface EditorPerfItem {
  dbId?: string;
  editor: string;
  totalVideos: number;
  winVideos: number;
  failVideos?: number;
  winRate?: string;
  avgViews?: string;
  notes?: string;
  analysis?: string;
}

export interface CloneVideoItem {
  dbId?: string;
  id: number;
  label: string;
  content: string;
  targetChannel: string;
  editor: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  platform: string;
  postDate: string;
  analysis: string;
  highlights: string;
  improvements: string;
  leaderComment: string;
  notes: string;
  videoUrl?: string;
  isVoted?: string;
  isApproved?: string;
}

export interface ActionItem {
  id: number;
  dbId?: string;
  title: string;
  description: string;
  assignee: string;
  deadline: string;
  status: string;
  priority: string;
  notes: string;
  leaderComment: string;
}

export interface TeamData {
  teamId?: string;
  teamName: string;
  win5Stats: {
    total: number;
    win: number;
    fail: number;
    percent: string;
  };
  newVideoStats: {
    total: number;
    win: number;
    fail: number;
    percent: string;
  };
  videos: ContentWinItem[];
  failVideos: FailVideoItem[];
  caseStudies: CaseStudyItem[];
  editorPerformance: EditorPerfItem[];
  cloneVideos?: CloneVideoItem[];
  actions?: ActionItem[];
  members?: string[];
  meetingSession?: MeetingSessionResponse | null;
}

export interface MeetingSessionResponse {
  session: MeetingSession | null;
  teamMembers: { id: string; full_name: string; image_url?: string | null }[];
}

// ─────────────────────────────────────────────
// Attendance Types
// ─────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'LATE';

export interface AttendanceRecord {
  id: string;
  session_id: string;
  user_id: string;
  status: AttendanceStatus;
  note?: string | null;
  marked_by_id: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
    image_url?: string | null;
  };
  marked_by: {
    id: string;
    full_name: string;
  };
}

export interface MeetingSession {
  id: string;
  team_id: string;
  period_id: string;
  title?: string | null;
  scheduled_at: string;
  notes?: string | null;
  created_by: string;
  is_finalized: boolean;
  finalized_at?: string | null;
  finalized_by_id?: string | null;
  created_at: string;
  updated_at: string;
  team: { id: string; name: string };
  period: { id: string; label: string; start_date: string; end_date: string };
  creator: { id: string; full_name: string };
  finalized_by?: { id: string; full_name: string } | null;
  attendances: AttendanceRecord[];
}

