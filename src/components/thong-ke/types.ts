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
}
