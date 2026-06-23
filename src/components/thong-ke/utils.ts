import { TeamData } from './types';

export const formatCommaNumber = (viewsStr: string) => {
  const matchM = viewsStr.match(/^([\d.]+)\s*M/i);
  if (matchM) {
    const val = Math.round(parseFloat(matchM[1]) * 1000000);
    return val.toLocaleString('en-US');
  }
  const matchK = viewsStr.match(/^([\d.]+)\s*K/i);
  if (matchK) {
    const val = Math.round(parseFloat(matchK[1]) * 1000);
    return val.toLocaleString('en-US');
  }
  return viewsStr;
};

export const formatDotViews = (viewsStr: string): string => {
  if (!viewsStr || viewsStr === '-') return '-';
  const clean = viewsStr.replace(/\s*views/gi, '').replace(/\./g, '').replace(/,/g, '').trim();
  const matchM = clean.match(/^([\d.]+)\s*M/i);
  let val: number;
  if (matchM) {
    val = Math.round(parseFloat(matchM[1]) * 1000000);
  } else {
    const matchK = clean.match(/^([\d.]+)\s*K/i);
    if (matchK) {
      val = Math.round(parseFloat(matchK[1]) * 1000);
    } else {
      const parsed = parseInt(clean.replace(/[^\d.]/g, ''), 10);
      val = isNaN(parsed) ? 0 : parsed;
    }
  }
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const formatWinRate = (win: number, total: number) => {
  if (total === 0) return '0,00%';
  const rate = (win / total) * 100;
  return `${rate.toFixed(2).replace('.', ',')}%`;
};

export const formatViews = (viewsStr: string, mult: number) => {
  const matchM = viewsStr.match(/^([\d.]+)\s*M/i);
  if (matchM) {
    const val = parseFloat(matchM[1]) * mult;
    return `${val.toFixed(1)}M views`;
  }
  const matchK = viewsStr.match(/^([\d.]+)\s*K/i);
  if (matchK) {
    const val = Math.round(parseFloat(matchK[1]) * mult);
    return `${val}K views`;
  }
  return viewsStr;
};

export const getSheetMultiplier = (sheet: string) => {
  switch (sheet) {
    case '5 Content fail của team': return 0.85;
    case '5 Case Study hay bên ngoài': return 0.9;
    case 'Số video content win của cá nhân trong team': return 1.1;
    case 'Content mới win của cá nhân trong team/trên số video đã làm': return 0.95;
    case 'Báo cáo content':
    case '5 Content win của team':
    default: return 1.0;
  }
};

export const isDateInFilter = (
  dateStr: string | undefined,
  filterMode: 'all' | 'week' | 'month',
  selectedWeek: 'all' | '1' | '2' | '3' | '4'
) => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length < 3) return true;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (filterMode === 'month') {
    return month === 6;
  } else if (filterMode === 'week') {
    if (month !== 6) return false;
    if (selectedWeek !== 'all') {
      const week = parseInt(selectedWeek, 10);
      if (week === 1) return day >= 1 && day <= 7;
      if (week === 2) return day >= 8 && day <= 14;
      if (week === 3) return day >= 15 && day <= 21;
      if (week === 4) return day >= 22 && day <= 30;
    }
  }
  return true;
};

export const enrichTeamsData = (raw: Record<string, TeamData>): Record<string, any> => {
  const enriched = JSON.parse(JSON.stringify(raw));
  Object.keys(enriched).forEach(teamKey => {
    const team = enriched[teamKey];

    // Enrich videos
    team.videos = team.videos.map((v: any, index: number) => ({
      ...v,
      likes: v.likes || `${Math.round((parseFloat(v.views) || 500) * 0.05)}K`,
      comments: v.comments || `${Math.round((parseFloat(v.views) || 500) * 0.005)}`,
      shares: v.shares || `${Math.round((parseFloat(v.views) || 500) * 0.01)}K`,
      platform: v.platform || (index % 3 === 0 ? 'TikTok' : index % 3 === 1 ? 'Instagram Reels' : 'YouTube Shorts'),
      postDate: v.postDate || `2026-06-${10 + index}`,
      highlights: v.highlights || 'Góc quay cận cảnh thao tác trực quan, âm thanh chuyển cảnh sắc nét.',
      improvements: v.improvements || 'Nên đẩy nhịp độ nhanh hơn ở 5 giây giữa video để giữ chân người xem.',
      leaderComment: v.leaderComment || 'Video làm tốt, đúng định hướng. Editor tiếp tục phát huy concept này.',
      notes: v.notes || 'Đã phân phối trên đa nền tảng, thu hút tệp đối tượng học sinh sinh viên tốt.'
    }));

    // Enrich failVideos
    team.failVideos = team.failVideos.map((v: any, index: number) => ({
      ...v,
      likes: v.likes || `${10 + index * 5}`,
      comments: v.comments || `${2 + index}`,
      shares: v.shares || `${index}`,
      platform: v.platform || (index % 3 === 0 ? 'Instagram Reels' : index % 3 === 1 ? 'TikTok' : 'YouTube Shorts'),
      postDate: v.postDate || `2026-06-${15 + index}`,
      highlights: v.highlights || 'Ý tưởng ban đầu khá thú vị, chủ đề được nhiều người quan tâm.',
      improvements: v.improvements || 'Cần đầu tư mic chống ồn, thêm phụ đề chạy chữ nổi bật và đẩy nhanh tốc độ cắt cảnh.',
      leaderComment: v.leaderComment || 'Chất lượng âm thanh quá tệ làm hỏng cả video. Lần sau duyệt kỹ âm thanh trước khi đăng.',
      notes: v.notes || 'Video bị bóp tương tác do giữ chân kém ở 3s đầu.'
    }));

    // Enrich caseStudies
    team.caseStudies = team.caseStudies.map((v: any, index: number) => ({
      ...v,
      likes: v.likes || `${50 + index * 10}K`,
      comments: v.comments || `${100 + index * 20}`,
      shares: v.shares || `${5 + index * 2}K`,
      platform: v.platform || (index % 3 === 0 ? 'YouTube Shorts' : index % 3 === 1 ? 'TikTok' : 'Instagram Reels'),
      postDate: v.postDate || `2026-05-${20 + index}`,
      highlights: v.highlights || 'Hiệu ứng âm thanh chân thực kết hợp tone màu ấm áp và góc quay điện ảnh.',
      improvements: v.improvements || 'Có thể tối ưu thêm tiêu đề click-bait để thu hút người xem hơn.',
      leaderComment: v.leaderComment || 'Case study chất lượng. Đề nghị team nghiên cứu áp dụng ngay hình thức ASMR vào các dự án tuần tới.',
      notes: v.notes || 'Đây là kênh đối thủ cạnh tranh trực tiếp, cần theo dõi thêm.'
    }));

    // Initialize cloneVideos
    team.cloneVideos = [
      {
        id: 1,
        label: 'Clone 1',
        content: `Cover clip review sản phẩm gia dụng thông minh hot trend của ${teamKey === 'K1' ? '@deco_home' : '@smartlife'}.`,
        targetChannel: teamKey === 'K1' ? '@deco_home' : '@smartlife',
        editor: team.videos[0]?.editor || 'Đỗ Thị Nga',
        views: '750K views',
        likes: '38K',
        comments: '450',
        shares: '1.8K',
        platform: 'TikTok',
        postDate: '2026-06-12',
        analysis: 'Sao chép nhịp điệu cắt dựng nhanh và cách đặt dòng tiêu đề (hook) màu vàng nổi bật ở 3 giây đầu.',
        highlights: 'Chèn thêm âm thanh pop-up vui nhộn tạo điểm nhấn.',
        improvements: 'Tăng cường độ sáng khung hình khi quay sản phẩm.',
        leaderComment: 'Ý tưởng cover tốt, bám sát timeline. Cần triển khai thêm các sản phẩm tương tự.',
        notes: 'Target views: 500K. Đã đạt mục tiêu.'
      },
      {
        id: 2,
        label: 'Clone 2',
        content: `Re-up và remake concept phối đồ dạo phố thu hút triệu view trên Douyin.`,
        targetChannel: '@douyin_fashion',
        editor: team.videos[1]?.editor || 'Lệnh Ngọc Khánh',
        views: '1.2M views',
        likes: '62K',
        comments: '890',
        shares: '3.5K',
        platform: 'Instagram Reels',
        postDate: '2026-06-14',
        analysis: 'Bắt chước các chuyển động camera zoom-in/zoom-out theo nhịp nhạc để tạo cảm giác thời thượng.',
        highlights: 'Hiệu ứng chuyển cảnh mượt mà, khớp nhạc 100%.',
        improvements: 'Phối màu trang phục tương phản rõ rệt hơn.',
        leaderComment: 'Được đánh giá cao về mặt visuals. Sẽ áp dụng rộng rãi cho nhóm thời trang.',
        notes: 'Được đề xuất lên xu hướng sau 2 giờ đăng.'
      }
    ];

    // Initialize actions
    team.actions = [
      {
        id: 1,
        title: 'Cải thiện âm thanh video',
        description: 'Bắt buộc kiểm tra độ chống ồn và căn chỉnh voice-over lớn hơn nhạc nền ít nhất 15dB trước khi xuất file.',
        assignee: 'Cả team',
        deadline: 'Thứ 2 tuần tới',
        status: 'Đang tiến hành',
        priority: 'Cao',
        notes: 'Leader sẽ kiểm tra ngẫu nhiên trước khi upload.',
        leaderComment: 'Yêu cầu nghiêm túc thực hiện để giảm tỷ lệ video fail do lỗi âm thanh.'
      },
      {
        id: 2,
        title: 'Áp dụng template hook 3s mới',
        description: 'Sử dụng bộ template chữ tiêu đề động và hiệu ứng zoom mặt trong 3 giây đầu tiên để tăng retention rate.',
        assignee: 'Tất cả Editor',
        deadline: 'Thứ 4 tuần tới',
        status: 'Chưa bắt đầu',
        priority: 'Trung bình',
        notes: 'Tải template trên thư mục Drive chung.',
        leaderComment: 'Rất cần thiết để cải thiện chỉ số giữ chân người xem.'
      }
    ];
  });
  return enriched;
};
