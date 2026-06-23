export interface ContentWinItem {
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
}

export interface FailVideoItem {
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
}

export interface CaseStudyItem {
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
  editor: string;
  totalVideos: number;
  winVideos: number;
  failVideos?: number;
  winRate?: string;
  avgViews?: string;
}

export interface CloneVideoItem {
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
}
