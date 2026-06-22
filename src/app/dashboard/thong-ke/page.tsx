'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  TrendingUp,
  Play,
  Award,
  Video,
  User,
  Eye,
  Sparkles,
  CheckCircle,
  FileText,
  Plus,
  Menu,
  ChevronDown,
  XCircle,
  Lightbulb,
  Link2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  Presentation,
  Trash2,
  Trophy,
  BookOpen,
  Copy,
  Target,
  MessageSquare,
  Wrench,
  Flame,
  Calendar,
  Maximize2,
  Minimize2,
  Heart,
  Share2,
  ThumbsUp,
  MessageCircle,
  X,
  CheckSquare,
  ListTodo,
  Image as ImageIcon
} from 'lucide-react';

interface ContentWinItem {
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
}

interface FailVideoItem {
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
}

interface CaseStudyItem {
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
}

interface EditorPerfItem {
  editor: string;
  totalVideos: number;
  winVideos: number;
  failVideos?: number;
  winRate?: string;
  avgViews?: string;
}

interface CloneVideoItem {
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
}

interface ActionItem {
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

interface TeamData {
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

const TEAMS_DATA: Record<string, TeamData> = {
  K1: {
    teamName: 'Team K1',
    win5Stats: { total: 154, win: 32, fail: 122, percent: '20.8%' },
    newVideoStats: { total: 98, win: 22, fail: 76, percent: '22.4%' },
    videos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Review chi tiết bộ vệ sinh laptop 7 trong 1 đa năng cho học sinh sinh viên.',
        analysis: 'Góc quay cận cảnh thao tác làm sạch chi tiết cực kỳ trực quan kích thích thị giác người xem trong 3 giây đầu.',
        editor: 'Đỗ Thị Nga',
        views: '1.5M views',
        thumbnail: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=150&auto=format&fit=crop&q=60',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
      },
      {
        id: 2,
        label: 'Video 2',
        content: 'Bắt trend biến hình phối đồ công sở phong cách trẻ trung năng động.',
        analysis: 'Chuyển cảnh khớp với nhịp điệu nhạc nền đang hot trend trên TikTok và chọn góc sáng làm nổi bật phom dáng quần áo.',
        editor: 'Lệnh Ngọc Khánh',
        views: '920K views',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
      },
      {
        id: 3,
        label: 'Video 3',
        content: 'ASMR gõ bàn phím cơ và unboxing set keycap custom phong cách retro cổ điển.',
        analysis: 'Chất lượng âm thanh thu bằng mic chuyên dụng cực tốt, tạo cảm giác thư giãn (satisfying) giữ chân người xem rất lâu.',
        editor: 'Mai Anh',
        views: '780K views',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
      },
      {
        id: 4,
        label: 'Video 4',
        content: 'Review nhanh tai nghe chống ồn phân khúc giá rẻ dưới 500k cực hot.',
        analysis: 'So sánh trực tiếp độ chống ồn khi dùng tai nghe trong quán cà phê đông người, giải quyết đúng băn khoăn của tệp khách hàng.',
        editor: 'Nguyễn Linh Chi',
        views: '650K views',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
      }
    ],
    failVideos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Chia sẻ mẹo học tiếng Anh qua bài hát cho người mới bắt đầu.',
        failReason: 'Nhạc nền quá to đè lên giọng thuyết minh, không có phụ đề (caption) chạy trên màn hình khiến người xem khó theo dõi.',
        editor: 'Mai Anh',
        views: '2.5K views',
        thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=60'
      },
      {
        id: 2,
        label: 'Video 2',
        content: 'Đập hộp chiếc ốp lưng điện thoại chống bám mồ hôi vân tay.',
        failReason: '3 giây đầu chỉ quay chiếc hộp giấy tĩnh, nhịp điệu cắt cảnh quá chậm làm tỷ lệ giữ chân người xem tụt dốc ngay lập tức.',
        editor: 'Đỗ Thị Nga',
        views: '1.2K views'
      },
      {
        id: 3,
        label: 'Video 3',
        content: 'Hướng dẫn cài đặt giao diện desktop phong cách cyberpunk cực chất.',
        failReason: 'Giao diện cyberpunk quá nhiều chi tiết rối mắt, độ phân giải xuất video thấp khiến các dòng chữ hướng dẫn bị nhòe.',
        editor: 'Nguyễn Linh Chi',
        views: '4.8K views'
      }
    ],
    caseStudies: [
      {
        id: 1,
        label: 'Case 1',
        title: 'Review dán màn hình cường lực tự hít khí không bong bóng.',
        channel: 'Kênh Công Nghệ - @techreview',
        views: '3.4M views',
        takeaway: 'Sử dụng hiệu ứng âm thanh giòn giã (ASMR) khi lột miếng dán cũ và đẩy khí miếng dán mới, tạo cảm giác vô cùng thoả mãn cho người xem.'
      },
      {
        id: 2,
        label: 'Case 2',
        title: 'Cách biến bàn làm việc bừa bộn thành góc chill lý tưởng.',
        channel: 'Decor Nghiện Nhà - @decorroom',
        views: '2.1M views',
        takeaway: 'Góc quay điện ảnh (cinematic) kết hợp tone màu ấm áp và nhạc nền lofi nhẹ nhàng. Đánh trúng tâm lý muốn F5 không gian sống của dân văn phòng.'
      }
    ],
    editorPerformance: [
      { editor: 'Đỗ Thị Nga', totalVideos: 42, winVideos: 12, failVideos: 30, winRate: '28.6%', avgViews: '250K' },
      { editor: 'Lệnh Ngọc Khánh', totalVideos: 38, winVideos: 8, failVideos: 30, winRate: '21.1%', avgViews: '180K' },
      { editor: 'Mai Anh', totalVideos: 39, winVideos: 7, failVideos: 32, winRate: '17.9%', avgViews: '150K' },
      { editor: 'Nguyễn Linh Chi', totalVideos: 35, winVideos: 5, failVideos: 30, winRate: '14.3%', avgViews: '120K' }
    ]
  },
  K2: {
    teamName: 'Team K2',
    win5Stats: { total: 120, win: 18, fail: 102, percent: '15.0%' },
    newVideoStats: { total: 75, win: 12, fail: 63, percent: '16.0%' },
    videos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Top 3 kem chống nắng kiềm dầu cực đỉnh cho nam giới vào mùa hè.',
        analysis: 'Đưa ra thử nghiệm bôi kem và kiểm tra độ dầu trên giấy thấm sau 4 tiếng, tạo sự tin cậy tuyệt đối về tính chân thực.',
        editor: 'Trần Văn An',
        views: '480K views'
      },
      {
        id: 2,
        label: 'Video 2',
        content: 'Mẹo vệ sinh giày sneaker trắng sạch như mới chỉ bằng nguyên liệu tại nhà.',
        analysis: 'Hình ảnh so sánh trước/sau (before/after) khác biệt rõ rệt ở phần đầu và cuối video tạo hiệu ứng tò mò cho người xem.',
        editor: 'Lê Thu Trang',
        views: '540K views'
      },
      {
        id: 3,
        label: 'Video 3',
        content: 'Unboxing và setup bàn làm việc tối giản (minimalism setup) truyền cảm hứng học tập.',
        analysis: 'Tone màu ấm áp, góc quay điện ảnh (cinematic) nhẹ nhàng tạo cảm giác chill, kích thích lượt lưu và chia sẻ cao.',
        editor: 'Phạm Minh Đức',
        views: '320K views'
      },
      {
        id: 4,
        label: 'Video 4',
        content: 'Review giá đỡ điện thoại thông minh tự động xoay theo gương mặt.',
        analysis: 'Biểu diễn trực tiếp tính năng tracking theo gương mặt khi người dùng di chuyển quanh phòng, làm nổi bật công nghệ của sản phẩm.',
        editor: 'Hoàng Thùy Linh',
        views: '290K views'
      }
    ],
    failVideos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Hướng dẫn tự cắt tóc mái thưa chuẩn Hàn Quốc tại nhà.',
        failReason: 'Góc quay không soi rõ thao tác cắt kéo, hướng dẫn thiếu cụ thể khiến người xem khó thực hành và thoát sớm.',
        editor: 'Lê Thu Trang',
        views: '3.1K views'
      },
      {
        id: 2,
        label: 'Video 2',
        content: 'Trải nghiệm làm nến thơm handmade từ sáp đậu nành.',
        failReason: 'Quy trình đun nấu quá dài dòng không tua nhanh, thiếu nhạc nền lôi cuốn dẫn tới thời gian xem trung bình quá ngắn.',
        editor: 'Phạm Minh Đức',
        views: '1.9K views'
      }
    ],
    caseStudies: [
      {
        id: 1,
        label: 'Case 1',
        title: 'Review bình giữ nhiệt vỏ tre khắc tên cá nhân hóa.',
        channel: 'Kênh Quà Tặng Độc Đáo - @giftideas',
        views: '1.8M views',
        takeaway: 'Quay cận cảnh nét khắc laser sắc nét và tiếng rót nước đá mát lạnh kích thích xúc giác và thính giác.'
      }
    ],
    editorPerformance: [
      { editor: 'Trần Văn An', totalVideos: 32, winVideos: 6, failVideos: 26, winRate: '18.8%', avgViews: '110K' },
      { editor: 'Lê Thu Trang', totalVideos: 28, winVideos: 5, failVideos: 23, winRate: '17.9%', avgViews: '105K' },
      { editor: 'Phạm Minh Đức', totalVideos: 30, winVideos: 4, failVideos: 26, winRate: '13.3%', avgViews: '95K' },
      { editor: 'Hoàng Thùy Linh', totalVideos: 30, winVideos: 3, failVideos: 27, winRate: '10.0%', avgViews: '80K' }
    ]
  },
  K3: {
    teamName: 'Team K3',
    win5Stats: { total: 95, win: 14, fail: 81, percent: '14.7%' },
    newVideoStats: { total: 60, win: 9, fail: 51, percent: '15.0%' },
    videos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Tips chụp ảnh thẻ tại nhà siêu đẹp bằng điện thoại không cần ra tiệm.',
        analysis: 'Hướng dẫn chi tiết cách set đèn tự chế và app chỉnh ảnh miễn phí, giải quyết bài toán nhanh - gọn - rẻ cho học sinh.',
        editor: 'Nguyễn Tiến Dũng',
        views: '350K views'
      },
      {
        id: 2,
        label: 'Video 2',
        content: 'Review bình giữ nhiệt 1.2L giữ đá lạnh suốt 24h thực tế.',
        analysis: 'Bỏ đá vào bình và quay timelapse kiểm tra sau 24 giờ để chứng minh khả năng giữ nhiệt thực tế của sản phẩm.',
        editor: 'Vũ Hải Yến',
        views: '410K views'
      },
      {
        id: 3,
        label: 'Video 3',
        content: 'Review chiếc đèn ngủ phi hành gia chiếu bầu trời sao cực ảo diệu.',
        analysis: 'Quay video trong phòng tối hoàn toàn hiển thị luồng sáng lung linh chân thực làm nổi bật giá trị trang trí phòng ngủ.',
        editor: 'Đặng Quốc Huy',
        views: '270K views'
      },
      {
        id: 4,
        label: 'Video 4',
        content: 'Đánh giá ví da nam mini thông minh tự đẩy thẻ tiện lợi.',
        analysis: 'Thao tác gạt nút đẩy thẻ mượt mà lặp lại nhiều lần tạo cảm giác sướng mắt và sướng tay cho người dùng ví.',
        editor: 'Phan Bảo Trâm',
        views: '210K views'
      }
    ],
    failVideos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Đánh giá nhanh chiếc đế tản nhiệt laptop giá 80k.',
        failReason: 'Thiết kế quá mỏng manh không tải được máy nặng, hiệu suất giảm nhiệt kém nhưng video nói quá phóng đại, mất uy tín.',
        editor: 'Vũ Hải Yến',
        views: '2.2K views'
      }
    ],
    caseStudies: [
      {
        id: 1,
        label: 'Case 1',
        title: 'Mẹo sửa khóa kéo áo khoác bị kẹt cực đơn giản.',
        channel: 'Kênh Handmade - @easydiy',
        views: '2.5M views',
        takeaway: 'Nội dung ngắn gọn chỉ 15 giây, đi thẳng vào vấn đề bằng hình ảnh cận cảnh rõ nét.'
      }
    ],
    editorPerformance: [
      { editor: 'Nguyễn Tiến Dũng', totalVideos: 25, winVideos: 4, failVideos: 21, winRate: '16.0%', avgViews: '90K' },
      { editor: 'Vũ Hải Yến', totalVideos: 24, winVideos: 4, failVideos: 20, winRate: '16.7%', avgViews: '92K' },
      { editor: 'Đặng Quốc Huy', totalVideos: 23, winVideos: 3, failVideos: 20, winRate: '13.0%', avgViews: '85K' },
      { editor: 'Phan Bảo Trâm', totalVideos: 23, winVideos: 3, failVideos: 20, winRate: '13.0%', avgViews: '80K' }
    ]
  },
  K4: {
    teamName: 'Team K4',
    win5Stats: { total: 85, win: 11, fail: 74, percent: '12.9%' },
    newVideoStats: { total: 54, win: 7, fail: 47, percent: '13.0%' },
    videos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Review balo chống trộm, chống nước đi mưa cực an tâm.',
        analysis: 'Đổ nước trực tiếp lên balo để test độ trượt nước chống thấm và quay cận cảnh các ngăn khóa ẩn an toàn.',
        editor: 'Bùi Thế Anh',
        views: '190K views'
      },
      {
        id: 2,
        label: 'Video 2',
        content: 'Review máy tăm nước cầm tay du lịch siêu nhỏ gọn tiện lợi.',
        analysis: 'Hướng dẫn cách dùng trực quan trên răng giả và mô tả cảm giác sạch sâu sau khi dùng, thuyết phục tệp khách hàng niềng răng.',
        editor: 'Đỗ Phương Thảo',
        views: '230K views'
      },
      {
        id: 3,
        label: 'Video 3',
        content: 'Cách sửa dây cáp sạc điện thoại bị đứt gãy bằng lò xo bút bi đơn giản.',
        analysis: 'Mẹo nhỏ cực kỳ hữu ích, nguyên liệu dễ tìm tạo độ tương tác chia sẻ và lưu lại cực kỳ cao từ cộng đồng mạng.',
        editor: 'Nguyễn Hoàng Long',
        views: '150K views'
      },
      {
        id: 4,
        label: 'Video 4',
        content: 'Review chiếc gối massage cổ hồng ngoại giảm đau mỏi vai gáy.',
        analysis: 'Quay cận cảnh các bi xoay hoạt động và phỏng vấn nhanh cảm nhận của phụ huynh khi được trải nghiệm sản phẩm.',
        editor: 'Lê Kiều Trang',
        views: '120K views'
      }
    ],
    failVideos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Hướng dẫn lắp ráp chiếc kệ sách gỗ đa tầng tự ráp.',
        failReason: 'Hướng dẫn quá phức tạp, không hiển thị sơ đồ lắp, góc máy khuất tay người lắp tạo cảm giác ức chế.',
        editor: 'Bùi Thế Anh',
        views: '1.5K views'
      }
    ],
    caseStudies: [
      {
        id: 1,
        label: 'Case 1',
        title: 'Review chiếc máy sấy tóc ion âm bảo vệ tóc khô xơ.',
        channel: 'Kênh Tóc Đẹp - @beautyhair',
        views: '1.2M views',
        takeaway: 'Chỉ số đo nhiệt độ thực tế bằng súng đo nhiệt và hình ảnh tóc suôn mượt óng ả sau sấy kích thích người xem.'
      }
    ],
    editorPerformance: [
      { editor: 'Bùi Thế Anh', totalVideos: 22, winVideos: 3, failVideos: 19, winRate: '13.6%', avgViews: '75K' },
      { editor: 'Đỗ Phương Thảo', totalVideos: 21, winVideos: 3, failVideos: 18, winRate: '14.3%', avgViews: '78K' },
      { editor: 'Nguyễn Hoàng Long', totalVideos: 21, winVideos: 3, failVideos: 18, winRate: '14.3%', avgViews: '72K' },
      { editor: 'Lê Kiều Trang', totalVideos: 21, winVideos: 2, failVideos: 19, winRate: '9.5%', avgViews: '65K' }
    ]
  },
  K5: {
    teamName: 'Team K5',
    win5Stats: { total: 64, win: 7, fail: 57, percent: '10.9%' },
    newVideoStats: { total: 40, win: 4, fail: 36, percent: '10.0%' },
    videos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Review sạc dự phòng không dây nam châm bám siêu chắc cho điện thoại.',
        analysis: 'Lắc mạnh điện thoại đang gắn sạc dự phòng không rơi để chứng minh lực hút nam châm từ tính mạnh mẽ của sản phẩm.',
        editor: 'Trịnh Hùng Cường',
        views: '95K views'
      },
      {
        id: 2,
        label: 'Video 2',
        content: 'Review lót chuột cỡ lớn (deskmat) chống trượt in hình tranh thủy mặc.',
        analysis: 'Góc quay panorama khoe vẻ đẹp nghệ thuật của bàn làm việc sau khi trải lót chuột mới, kích thích thị giác cực mạnh.',
        editor: 'Nguyễn Mai Chi',
        views: '110K views'
      },
      {
        id: 3,
        label: 'Video 3',
        content: 'Trải nghiệm quạt mini đeo cổ không cánh tiện lợi khi đi ngoài đường.',
        analysis: 'Đo tốc độ gió thổi bay tóc người mẫu khi đi bộ dưới trời nắng nóng, chứng minh tính thực tế và độ mát của quạt.',
        editor: 'Phạm Hải Đăng',
        views: '88K views'
      },
      {
        id: 4,
        label: 'Video 4',
        content: 'Mở hộp kệ đỡ sách chống cận thị và bảo vệ cột sống cho bé học bài.',
        analysis: 'Mô tả chi tiết góc nghiêng khoa học điều chỉnh được và chia sẻ của bà mẹ bỉm sữa về thói quen học tập của con.',
        editor: 'Vương Mỹ Linh',
        views: '75K views'
      }
    ],
    failVideos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Review chiếc máy phun sương mini tạo ẩm bàn làm việc.',
        failReason: 'Độ phun sương quá yếu hầu như không thấy khói nước trên cam, video thiếu sự thuyết phục.',
        editor: 'Trịnh Hùng Cường',
        views: '950 views'
      }
    ],
    caseStudies: [
      {
        id: 1,
        label: 'Case 1',
        title: 'Review sáp vuốt tóc nam giữ nếp cực tốt khi đội mũ bảo hiểm.',
        channel: 'Kênh Men Style - @menstyle',
        views: '950K views',
        takeaway: 'Chạy thử xe máy thực tế đội mũ bảo hiểm 30 phút rồi tháo mũ vuốt lại nếp tóc, độ thuyết phục thực tiễn cực kỳ cao.'
      }
    ],
    editorPerformance: [
      { editor: 'Trịnh Hùng Cường', totalVideos: 16, winVideos: 2, failVideos: 14, winRate: '12.5%', avgViews: '55K' },
      { editor: 'Nguyễn Mai Chi', totalVideos: 16, winVideos: 2, failVideos: 14, winRate: '12.5%', avgViews: '58K' },
      { editor: 'Phạm Hải Đăng', totalVideos: 16, winVideos: 2, failVideos: 14, winRate: '12.5%', avgViews: '52K' },
      { editor: 'Vương Mỹ Linh', totalVideos: 16, winVideos: 1, failVideos: 15, winRate: '6.3%', avgViews: '45K' }
    ]
  }
};

const formatCommaNumber = (viewsStr: string) => {
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

const formatWinRate = (win: number, total: number) => {
  if (total === 0) return '0,00%';
  const rate = (win / total) * 100;
  return `${rate.toFixed(2).replace('.', ',')}%`;
};

const enrichTeamsData = (raw: Record<string, TeamData>): Record<string, any> => {
  const enriched = JSON.parse(JSON.stringify(raw));
  Object.keys(enriched).forEach(teamKey => {
    const team = enriched[teamKey];

    // Enrich videos
    team.videos = team.videos.map((v: any, index: number) => ({
      ...v,
      likes: v.likes || `${Math.round((parseFloat(v.views) || 500) * 0.05)}K`,
      comments: v.comments || `${Math.round((parseFloat(v.views) || 500) * 0.005)}`,
      shares: v.shares || `${Math.round((parseFloat(v.views) || 500) * 0.01)}K`,
      platform: v.platform || (index % 2 === 0 ? 'TikTok' : 'Reels'),
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
      platform: v.platform || (index % 2 === 0 ? 'Reels' : 'TikTok'),
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
      platform: v.platform || (index % 2 === 0 ? 'Shorts' : 'TikTok'),
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
        platform: 'Reels',
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

function StatisticsDashboard() {
  const searchParams = useSearchParams();
  const subParam = searchParams.get('sub');

  const [activeSubTab, setActiveSubTab] = useState<'bao-cao' | 'trinh-bay' | 'thong-ke'>('bao-cao');
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  useEffect(() => {
    if (subParam === 'trinh-bay') {
      setActiveSubTab('trinh-bay');
    } else if (subParam === 'thong-ke') {
      setActiveSubTab('thong-ke');
    } else {
      setActiveSubTab('bao-cao');
    }
  }, [subParam]);

  const handleSubTabChange = (tab: 'bao-cao' | 'trinh-bay' | 'thong-ke') => {
    setActiveSubTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('sub', tab);
      window.history.pushState({}, '', url.toString());
    }
  };

  const SLIDES = [
    {
      title: "Báo cáo Chiến lược Content Q3",
      subtitle: "Tổng hợp chiến dịch định hướng & phát triển video",
      content: (
        <div className="flex flex-col gap-4 text-slate-300">
          <p className="text-sm leading-relaxed">
            Trong chu kỳ Q3, VCB Studio tập trung đẩy mạnh các định dạng video ngắn (Shorts/Reels/TikTok) với mục tiêu gia tăng tỷ lệ giữ chân người xem (Retention Rate) lên trên 30% và nâng số lượng video đạt mốc 10K views trung bình của team.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Mục tiêu Views</span>
              <p className="text-xl font-bold text-white mt-1">10M+</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Video Sản xuất</span>
              <p className="text-xl font-bold text-white mt-1">500+</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Tỷ lệ Win KPI</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">20.8%</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Phân tích 5 Content Win của Team",
      subtitle: "Tại sao các video này đạt tương tác cao?",
      content: (
        <div className="flex flex-col gap-3 text-slate-300 text-xs">
          <div className="flex gap-2 items-center bg-[#073525]/30 p-2.5 rounded-lg border border-emerald-500/10">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">1</span>
            <div>
              <p className="font-bold text-white">Review Bộ Vệ Sinh Laptop (Đỗ Thị Nga - 1.5M views)</p>
              <p className="text-slate-400 mt-0.5">Góc quay cận cảnh làm sạch trực quan trong 3 giây đầu kích thích thị giác.</p>
            </div>
          </div>
          <div className="flex gap-2 items-center bg-[#073525]/30 p-2.5 rounded-lg border border-emerald-500/10">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">2</span>
            <div>
              <p className="font-bold text-white">Bắt Trend Phối Đồ Công Sở (Lệnh Ngọc Khánh - 920K views)</p>
              <p className="text-slate-400 mt-0.5">Chuyển cảnh khớp với nhịp điệu nhạc nền đang hot trend trên TikTok.</p>
            </div>
          </div>
          <div className="flex gap-2 items-center bg-[#073525]/30 p-2.5 rounded-lg border border-emerald-500/10">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">3</span>
            <div>
              <p className="font-bold text-white">ASMR Gõ Bàn Phím Cơ (Mai Anh - 780K views)</p>
              <p className="text-slate-400 mt-0.5">Âm thanh satisfying giữ chân người xem rất lâu nhờ mic chuyên dụng.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Bài học từ 5 Content Fail",
      subtitle: "Các điểm yếu kỹ thuật cần khắc phục ngay lập tức",
      content: (
        <div className="flex flex-col gap-3 text-slate-300 text-xs">
          <div className="flex gap-2 items-center bg-[#271414]/30 p-2.5 rounded-lg border border-red-500/10">
            <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold">1</span>
            <div>
              <p className="font-bold text-white">Chia Sẻ Mẹo Học Tiếng Anh (Mai Anh - 2.5K views)</p>
              <p className="text-slate-400 mt-0.5">Nhạc nền quá to đè lên giọng thuyết minh, thiếu phụ đề chạy trên màn hình.</p>
            </div>
          </div>
          <div className="flex gap-2 items-center bg-[#271414]/30 p-2.5 rounded-lg border border-red-500/10">
            <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold">2</span>
            <div>
              <p className="font-bold text-white">Đập Hộp Ốp Lưng Điện Thoại (Đỗ Thị Nga - 1.2K views)</p>
              <p className="text-slate-400 mt-0.5">3 giây đầu chỉ quay hộp giấy tĩnh, nhịp điệu cắt cảnh quá chậm làm tụt retention rate.</p>
            </div>
          </div>
          <div className="flex gap-2 items-center bg-[#271414]/30 p-2.5 rounded-lg border border-red-500/10">
            <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold">3</span>
            <div>
              <p className="font-bold text-white">Hướng Dẫn Giao Diện Cyberpunk (Nguyễn Linh Chi - 4.8K views)</p>
              <p className="text-slate-400 mt-0.5">Giao diện quá rối mắt, độ phân giải xuất video thấp khiến dòng chữ bị nhòe.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Kế hoạch hành động Q3 nâng cao",
      subtitle: "Các tiêu chuẩn sản xuất mới áp dụng cho toàn team",
      content: (
        <div className="flex flex-col gap-4 text-slate-300">
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong className="text-white">Quy tắc 3 giây đầu:</strong> Bắt buộc phải có chuyển động hoặc hình ảnh cận cảnh kích thích thị giác, tuyệt đối không quay hộp giấy hoặc màn hình tĩnh.</li>
            <li><strong className="text-white">Tiêu chuẩn âm thanh:</strong> Nhạc nền tối đa -18dB so với giọng thuyết minh (voice-over), bắt buộc sử dụng mic cài áo chống ồn.</li>
            <li><strong className="text-white">Subtitles/Captions:</strong> 100% video ngắn phải có phụ đề chạy chữ sinh động, khớp 100% giọng nói.</li>
          </ul>
        </div>
      )
    }
  ];

  const [activeTab, setActiveTab] = useState<string>('K1');
  const [activeSheet, setActiveSheet] = useState<string>('Báo cáo content');
  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>({});
  const [teamsData, setTeamsData] = useState<Record<string, TeamData>>(() => enrichTeamsData(TEAMS_DATA) as any);

  // States for interactive Slide presentation screen
  const [presentationMenu, setPresentationMenu] = useState<'win' | 'fail' | 'case' | 'clone' | 'action'>('win');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isFullscreenSlide, setIsFullscreenSlide] = useState<boolean>(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);

  const updateSlideField = (category: 'win' | 'fail' | 'case' | 'clone' | 'action', index: number, field: string, value: string) => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      let listKey: 'videos' | 'failVideos' | 'caseStudies' | 'cloneVideos' | 'actions';
      if (category === 'win') listKey = 'videos';
      else if (category === 'fail') listKey = 'failVideos';
      else if (category === 'case') listKey = 'caseStudies';
      else if (category === 'clone') listKey = 'cloneVideos';
      else listKey = 'actions';

      const list = [...(teamData[listKey] || [])] as any[];
      if (list[index]) {
        list[index] = { ...list[index], [field]: value };
      }
      (teamData as any)[listKey] = list;
      updated[activeTab] = teamData;
      return updated;
    });
  };

  const addSlide = (category: 'win' | 'fail' | 'case' | 'clone' | 'action') => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      if (category === 'win') {
        const newId = teamData.videos.length + 1;
        teamData.videos = [
          ...teamData.videos,
          {
            id: newId,
            label: `Video ${newId}`,
            content: 'Nhập nội dung video...',
            analysis: 'Nhập phân tích tại sao win...',
            editor: teamData.videos[0]?.editor || 'Đỗ Thị Nga',
            views: '500K views',
            likes: '25K',
            comments: '120',
            shares: '2.5K',
            platform: 'TikTok',
            postDate: new Date().toISOString().split('T')[0],
            highlights: 'Nhập điểm sáng nổi bật...',
            improvements: 'Nhập điểm cần cải thiện...',
            leaderComment: 'Nhập ý kiến của leader...',
            notes: 'Ghi chú nội bộ...'
          }
        ];
        setActiveSlideIndex(teamData.videos.length - 1);
      } else if (category === 'fail') {
        const newId = teamData.failVideos.length + 1;
        teamData.failVideos = [
          ...teamData.failVideos,
          {
            id: newId,
            label: `Video ${newId}`,
            content: 'Nhập nội dung video...',
            failReason: 'Nhập lý do tại sao không win...',
            editor: teamData.failVideos[0]?.editor || 'Mai Anh',
            views: '2.5K views',
            likes: '15',
            comments: '2',
            shares: '0',
            platform: 'TikTok',
            postDate: new Date().toISOString().split('T')[0],
            highlights: 'Nhập điểm sáng nổi bật...',
            improvements: 'Nhập điểm cần cải thiện...',
            leaderComment: 'Nhập ý kiến của leader...',
            notes: 'Ghi chú nội bộ...'
          }
        ];
        setActiveSlideIndex(teamData.failVideos.length - 1);
      } else if (category === 'case') {
        const newId = teamData.caseStudies.length + 1;
        teamData.caseStudies = [
          ...teamData.caseStudies,
          {
            id: newId,
            label: `Case ${newId}`,
            title: 'Nhập tiêu đề case study...',
            channel: 'Nhập tên kênh đối thủ...',
            views: '1.5M views',
            likes: '75K',
            comments: '250',
            shares: '4.2K',
            platform: 'TikTok',
            postDate: new Date().toISOString().split('T')[0],
            takeaway: 'Nhập bài học rút ra và hướng áp dụng...',
            highlights: 'Nhập điểm sáng nổi bật...',
            improvements: 'Nhập điểm cần cải thiện...',
            leaderComment: 'Nhập ý kiến của leader...',
            notes: 'Ghi chú nội bộ...'
          }
        ];
        setActiveSlideIndex(teamData.caseStudies.length - 1);
      } else if (category === 'clone') {
        const newId = (teamData.cloneVideos?.length || 0) + 1;
        const newClones = [...(teamData.cloneVideos || [])];
        newClones.push({
          id: newId,
          label: `Clone ${newId}`,
          content: 'Nhập nội dung video cần clone...',
          targetChannel: 'Kênh mục tiêu',
          editor: teamData.videos[0]?.editor || 'Đỗ Thị Nga',
          views: '800K views',
          likes: '40K',
          comments: '300',
          shares: '1.2K',
          platform: 'TikTok',
          postDate: new Date().toISOString().split('T')[0],
          analysis: 'Tại sao chọn clone video này?',
          highlights: 'Nhập điểm sáng nổi bật...',
          improvements: 'Nhập điểm cần cải thiện...',
          leaderComment: 'Nhập ý kiến của leader...',
          notes: 'Ghi chú nội bộ...'
        });
        teamData.cloneVideos = newClones;
        setActiveSlideIndex(newClones.length - 1);
      } else if (category === 'action') {
        const newId = (teamData.actions?.length || 0) + 1;
        const newActions = [...(teamData.actions || [])];
        newActions.push({
          id: newId,
          title: 'Hành động mới',
          description: 'Mô tả chi tiết hành động...',
          assignee: 'Người chịu trách nhiệm',
          deadline: 'Thời hạn',
          status: 'Chưa bắt đầu',
          priority: 'Trung bình',
          notes: 'Ghi chú thêm...',
          leaderComment: 'Định hướng từ leader...'
        });
        teamData.actions = newActions;
        setActiveSlideIndex(newActions.length - 1);
      }

      updated[activeTab] = teamData;
      return updated;
    });
  };

  const deleteSlide = (category: 'win' | 'fail' | 'case' | 'clone' | 'action', index: number) => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      let listKey: 'videos' | 'failVideos' | 'caseStudies' | 'cloneVideos' | 'actions';
      if (category === 'win') listKey = 'videos';
      else if (category === 'fail') listKey = 'failVideos';
      else if (category === 'case') listKey = 'caseStudies';
      else if (category === 'clone') listKey = 'cloneVideos';
      else listKey = 'actions';

      const list = [...(teamData[listKey] || [])] as any[];
      if (list.length > 0) {
        list.splice(index, 1);
        // reindex labels
        if (category === 'win' || category === 'fail') {
          list.forEach((v, idx) => {
            v.id = idx + 1;
            v.label = `Video ${idx + 1}`;
          });
        } else if (category === 'case') {
          list.forEach((v, idx) => {
            v.id = idx + 1;
            v.label = `Case ${idx + 1}`;
          });
        } else if (category === 'clone') {
          list.forEach((v, idx) => {
            v.id = idx + 1;
            v.label = `Clone ${idx + 1}`;
          });
        }
      }

      (teamData as any)[listKey] = list;
      updated[activeTab] = teamData;

      // Adjust active index
      const newLen = list.length;
      setActiveSlideIndex(prev => Math.max(0, Math.min(prev, newLen - 1)));

      return updated;
    });
  };

  const toggleSheetCollapse = (sheetName: string) => {
    setCollapsedSheets(prev => ({
      ...prev,
      [sheetName]: !prev[sheetName]
    }));
  };

  const addRow = (sheetName: string) => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      if (sheetName === '5 Content win của team') {
        const newId = teamData.videos.length + 1;
        teamData.videos = [
          ...teamData.videos,
          {
            id: newId,
            label: `Video ${newId}`,
            content: 'Nhấp đúp để nhập nội dung...',
            analysis: 'Nhấp đúp để nhập phân tích...',
            editor: 'Tên Editor',
            views: '0 views'
          }
        ];
      } else if (sheetName === '5 Content fail của team') {
        const newId = teamData.failVideos.length + 1;
        teamData.failVideos = [
          ...teamData.failVideos,
          {
            id: newId,
            label: `Video ${newId}`,
            content: 'Nhấp đúp để nhập nội dung...',
            failReason: 'Nhấp đúp để nhập lý do...',
            editor: 'Tên Editor',
            views: '0 views'
          }
        ];
      } else if (sheetName === '5 Case Study hay bên ngoài') {
        const newId = teamData.caseStudies.length + 1;
        teamData.caseStudies = [
          ...teamData.caseStudies,
          {
            id: newId,
            label: `Case ${newId}`,
            title: 'Nhấp đúp để nhập tiêu đề...',
            channel: 'Tên kênh',
            views: '0 views',
            takeaway: 'Nhấp đúp để nhập bài học...'
          }
        ];
      } else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
        teamData.editorPerformance = [
          ...teamData.editorPerformance,
          {
            editor: 'Editor mới',
            totalVideos: 0,
            winVideos: 0
          }
        ];
      }

      updated[activeTab] = teamData;
      return updated;
    });
  };

  const updateRowValue = (sheetName: string, rowIndex: number, field: string, value: string) => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      if (sheetName === '5 Content win của team') {
        const list = [...teamData.videos];
        while (list.length <= rowIndex) {
          list.push({
            id: list.length + 1,
            label: `Video ${list.length + 1}`,
            content: '',
            analysis: '',
            editor: 'Tên Editor',
            views: '0 views'
          });
        }
        list[rowIndex] = { ...list[rowIndex], [field]: value };
        teamData.videos = list;
      } else if (sheetName === '5 Content fail của team') {
        const list = [...teamData.failVideos];
        while (list.length <= rowIndex) {
          list.push({
            id: list.length + 1,
            label: `Video ${list.length + 1}`,
            content: '',
            failReason: '',
            editor: 'Tên Editor',
            views: '0 views'
          });
        }
        list[rowIndex] = { ...list[rowIndex], [field]: value };
        teamData.failVideos = list;
      } else if (sheetName === '5 Case Study hay bên ngoài') {
        const list = [...teamData.caseStudies];
        while (list.length <= rowIndex) {
          list.push({
            id: list.length + 1,
            label: `Case ${list.length + 1}`,
            title: '',
            channel: 'Tên kênh',
            views: '0 views',
            takeaway: ''
          });
        }
        list[rowIndex] = { ...list[rowIndex], [field]: value };
        teamData.caseStudies = list;
      } else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
        const list = [...teamData.editorPerformance];
        while (list.length <= rowIndex) {
          list.push({
            editor: 'Editor mới',
            totalVideos: 0,
            winVideos: 0
          });
        }
        if (field === 'totalVideos' || field === 'winVideos') {
          list[rowIndex] = { ...list[rowIndex], [field]: parseInt(value) || 0 };
        } else {
          list[rowIndex] = { ...list[rowIndex], [field]: value };
        }
        teamData.editorPerformance = list;
      }

      updated[activeTab] = teamData;
      return updated;
    });
  };

  const deleteRow = (sheetName: string, rowIndex: number) => {
    setTeamsData(prev => {
      const updated = { ...prev };
      const teamData = { ...updated[activeTab] };

      if (sheetName === '5 Content win của team') {
        const list = [...teamData.videos];
        list.splice(rowIndex, 1);
        teamData.videos = list.map((item, idx) => ({
          ...item,
          id: idx + 1,
          label: `Video ${idx + 1}`
        }));
      } else if (sheetName === '5 Content fail của team') {
        const list = [...teamData.failVideos];
        list.splice(rowIndex, 1);
        teamData.failVideos = list.map((item, idx) => ({
          ...item,
          id: idx + 1,
          label: `Video ${idx + 1}`
        }));
      } else if (sheetName === '5 Case Study hay bên ngoài') {
        const list = [...teamData.caseStudies];
        list.splice(rowIndex, 1);
        teamData.caseStudies = list.map((item, idx) => ({
          ...item,
          id: idx + 1,
          label: `Case ${idx + 1}`
        }));
      } else if (sheetName === 'Số video content win của cá nhân trong team' || sheetName === 'Content mới win của cá nhân trong team/trên số video đã làm') {
        const list = [...teamData.editorPerformance];
        list.splice(rowIndex, 1);
        teamData.editorPerformance = list;
      }

      updated[activeTab] = teamData;
      return updated;
    });
  };

  const SHEETS = [
    'Báo cáo content',
    '5 Content win của team',
    '5 Content fail của team',
    '5 Case Study hay bên ngoài',
    'Số video content win của cá nhân trong team',
    'Content mới win của cá nhân trong team/trên số video đã làm'
  ];

  const getSheetMultiplier = (sheet: string) => {
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

  const multiplier = getSheetMultiplier(activeSheet);
  const baseData = teamsData[activeTab];

  // Tính số liệu đã nhân hệ số và làm tròn
  const win5Stats = {
    total: Math.round(baseData.win5Stats.total * multiplier),
    win: Math.round(baseData.win5Stats.win * multiplier),
    fail: Math.round(baseData.win5Stats.fail * multiplier),
    percent: ''
  };
  const rawWin5Percent = (win5Stats.win / win5Stats.total) * 100;
  win5Stats.percent = `${rawWin5Percent.toFixed(1).replace('.', ',')}%`;

  const newVideoStats = {
    total: Math.round(baseData.newVideoStats.total * multiplier),
    win: Math.round(baseData.newVideoStats.win * multiplier),
    fail: Math.round(baseData.newVideoStats.fail * multiplier),
    percent: ''
  };
  const rawNewVideoPercent = (newVideoStats.win / newVideoStats.total) * 100;
  newVideoStats.percent = `${rawNewVideoPercent.toFixed(1).replace('.', ',')}%`;

  const formatViews = (viewsStr: string, mult: number) => {
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

  const videos = baseData.videos.map(v => ({
    ...v,
    views: formatViews(v.views, multiplier)
  }));

  const renderSheetContent = (sheetName: string = activeSheet) => {
    const multiplier = getSheetMultiplier(sheetName);
    const isCollapsed = collapsedSheets[sheetName] || false;

    // Tính số liệu đã nhân hệ số và làm tròn cho sheetName cụ thể
    const win5Stats = {
      total: Math.round(baseData.win5Stats.total * multiplier),
      win: Math.round(baseData.win5Stats.win * multiplier),
      fail: Math.round(baseData.win5Stats.fail * multiplier),
      percent: ''
    };
    const rawWin5Percent = (win5Stats.win / win5Stats.total) * 100;
    win5Stats.percent = `${rawWin5Percent.toFixed(1).replace('.', ',')}%`;

    const newVideoStats = {
      total: Math.round(baseData.newVideoStats.total * multiplier),
      win: Math.round(baseData.newVideoStats.win * multiplier),
      fail: Math.round(baseData.newVideoStats.fail * multiplier),
      percent: ''
    };
    const rawNewVideoPercent = (newVideoStats.win / newVideoStats.total) * 100;
    newVideoStats.percent = `${rawNewVideoPercent.toFixed(1).replace('.', ',')}%`;

    const videos = baseData.videos.map(v => ({
      ...v,
      views: formatViews(v.views, multiplier)
    }));

    switch (sheetName) {

      case '5 Content fail của team': {
        const rows = [...baseData.failVideos].map(v => ({
          ...v,
          views: formatViews(v.views, multiplier)
        }));
        while (rows.length < 5) {
          rows.push({
            id: rows.length + 1,
            label: 'Data point',
            content: 'Data point',
            failReason: 'Data point',
            editor: 'Data point',
            views: '-'
          });
        }

        return (
          <div className="flex flex-col rounded-xl overflow-hidden border border-red-500/20 shadow-lg shadow-red-950/10">
            <div
              onClick={() => toggleSheetCollapse(sheetName)}
              className="bg-[#271414] px-4 py-3 flex items-center justify-between border-b border-red-500/20 cursor-pointer select-none hover:bg-[#341b1b] transition-colors"
            >
              <span className="text-red-400 font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" /> 5 Content fail của team
              </span>
              <ChevronDown className={`w-4 h-4 text-red-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
            </div>

            {!isCollapsed && (
              <div className="bg-[#0c1322] p-6 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400 text-[10px] uppercase tracking-wider font-bold bg-white/[0.02]">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 text-center">TEAM</th>
                      <th className="py-3 px-4 text-center">EDITOR</th>
                      <th className="py-3 px-4 text-center">LINK</th>
                      <th className="py-3 px-4 text-center">THUMBNAIL</th>
                      <th className="py-3 px-4 w-1/3 text-center">NỘI DUNG CONTENT</th>
                      <th className="py-3 px-4 w-1/3 text-center">PHÂN TÍCH TẠI SAO KHÔNG WIN?</th>
                      <th className="py-3 px-4 text-center">SỐ VIEWS</th>
                      <th className="py-3 px-4 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((video, idx) => {
                      const isMock = video.label === 'Data point';
                      return (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                          <td className="py-3.5 px-4 text-slate-300 font-semibold text-xs">
                            {isMock ? 'Data point' : activeTab}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'editor', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-slate-300 font-medium text-xs outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {video.editor}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'videoUrl', e.currentTarget.textContent || '')}
                            className={`py-3.5 px-4 text-xs outline-none focus:bg-white/[0.04] cursor-text max-w-[120px] truncate focus:max-w-none focus:whitespace-normal break-all ${
                              isMock 
                                ? 'text-slate-500 font-bold text-center' 
                                : !video.videoUrl 
                                  ? 'text-blue-400/50 italic' 
                                  : 'text-blue-400 hover:text-blue-300 underline font-medium'
                            }`}
                            title={isMock ? '' : (video.videoUrl || 'Dán link video...')}
                          >
                            {isMock ? '-' : (video.videoUrl || 'Dán link video...')}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {isMock ? (
                              <span className="text-slate-500 font-bold">Data point</span>
                            ) : (
                              <div className="flex items-start shrink-0">
                                <label className="cursor-pointer group relative block">
                                  {video.thumbnail ? (
                                    <div className="w-10 h-10 rounded bg-slate-800 border border-white/10 overflow-hidden transition-all duration-200 hover:border-blue-500 hover:scale-105 shrink-0">
                                      <img src={video.thumbnail} className="w-full h-full object-cover" alt="Thumb" />
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ImageIcon className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-slate-900 border border-dashed border-white/10 hover:border-blue-500 hover:bg-white/[0.02] flex items-center justify-center transition-all duration-200 shrink-0" title="Click để tải ảnh lên">
                                      <ImageIcon className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                                    </div>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const localUrl = URL.createObjectURL(file);
                                        updateRowValue(sheetName, idx, 'thumbnail', localUrl);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            )}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'content', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {video.content}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'failReason', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {video.failReason}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'views', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-right font-bold text-xs text-red-400 outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {isMock ? '-' : video.views}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {!isMock && (
                              <button
                                onClick={() => deleteRow(sheetName, idx)}
                                className="text-red-500/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Add Row Button */}
                <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-start">
                  <button
                    onClick={() => addRow(sheetName)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white rounded-lg text-xs font-bold transition shadow"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm dòng mới
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case '5 Case Study hay bên ngoài': {
        const rows = [...baseData.caseStudies].map(v => ({
          ...v,
          views: formatViews(v.views, multiplier)
        }));
        while (rows.length < 5) {
          rows.push({
            id: rows.length + 1,
            label: 'Data point',
            title: 'Data point',
            channel: 'Data point',
            views: '-',
            takeaway: 'Data point'
          });
        }

        return (
          <div className="flex flex-col rounded-xl overflow-hidden border border-purple-500/20 shadow-lg shadow-purple-950/10">
            <div
              onClick={() => toggleSheetCollapse(sheetName)}
              className="bg-[#1e1b4b] px-4 py-3 flex items-center justify-between border-b border-purple-500/20 cursor-pointer select-none hover:bg-[#2e2a72] transition-colors"
            >
              <span className="text-purple-300 font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400" /> 5 Case Study hay bên ngoài
              </span>
              <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
            </div>

            {!isCollapsed && (
              <div className="bg-[#0c1322] p-6 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400 text-[10px] uppercase tracking-wider font-bold bg-white/[0.02]">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">TEAM</th>
                      <th className="py-3 px-4">EDITOR</th>
                      <th className="py-3 px-4">LINK</th>
                      <th className="py-3 px-4 w-1/3">NỘI DUNG CONTENT</th>
                      <th className="py-3 px-4 w-1/3">SẼ ÁP DỤNG NHƯ THẾ NÀO, HỌC ĐƯỢC CÁI GÌ?</th>
                      <th className="py-3 px-4 text-right">SỐ VIEWS</th>
                      <th className="py-3 px-4 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((video, idx) => {
                      const isMock = video.title === 'Data point';
                      return (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                          <td className="py-3.5 px-4 text-slate-300 font-semibold text-xs">
                            {isMock ? 'Data point' : 'Bên ngoài'}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'channel', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-slate-300 font-medium text-xs outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {video.channel}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'videoUrl', e.currentTarget.textContent || '')}
                            className={`py-3.5 px-4 text-xs outline-none focus:bg-white/[0.04] cursor-text max-w-[120px] truncate focus:max-w-none focus:whitespace-normal break-all ${
                              isMock 
                                ? 'text-slate-500 font-bold text-center' 
                                : !video.videoUrl 
                                  ? 'text-blue-400/50 italic' 
                                  : 'text-blue-400 hover:text-blue-300 underline font-medium'
                            }`}
                            title={isMock ? '' : (video.videoUrl || 'Dán link video...')}
                          >
                            {isMock ? '-' : (video.videoUrl || 'Dán link video...')}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'title', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {video.title}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'takeaway', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {video.takeaway}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'views', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-right font-bold text-xs text-purple-400 outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {isMock ? '-' : video.views}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {!isMock && (
                              <button
                                onClick={() => deleteRow(sheetName, idx)}
                                className="text-red-500/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Add Row Button */}
                <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-start">
                  <button
                    onClick={() => addRow(sheetName)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white rounded-lg text-xs font-bold transition shadow"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm dòng mới
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'Số video content win của cá nhân trong team': {
        const scaledPerformance = baseData.editorPerformance.map(perf => {
          const total = Math.round(perf.totalVideos * multiplier);
          const win = Math.round(perf.winVideos * multiplier);
          const fail = total - win;
          const winRate = formatWinRate(win, total);
          return {
            editor: perf.editor,
            total,
            win,
            fail,
            winRate
          };
        });

        return (
          <div className="flex flex-col rounded-xl overflow-hidden border border-blue-500/20 shadow-lg shadow-blue-950/10">
            <div
              onClick={() => toggleSheetCollapse(sheetName)}
              className="bg-[#1e293b] px-4 py-3 flex items-center justify-between border-b border-blue-500/20 cursor-pointer select-none hover:bg-[#2b3a52] transition-colors"
            >
              <span className="text-blue-300 font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Số video content win của cá nhân trong team
              </span>
              <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
            </div>

            {!isCollapsed && (
              <div className="bg-[#0c1322] p-6 flex flex-col gap-6">
                {/* TỔNG VIDEO TEAM */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">TỔNG VIDEO TEAM</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Tổng Video */}
                    <div className="bg-[#1e293b]/30 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-blue-500/20 shadow-md">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tổng Video</span>
                        <span className="text-2xl font-black text-white mt-1">{win5Stats.total}</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Video className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                    {/* Card 2: Win */}
                    <div className="bg-[#1e293b]/30 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-emerald-500/20 shadow-md">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Video Win</span>
                        <span className="text-2xl font-black text-emerald-400 mt-1">{win5Stats.win}</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Award className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                    {/* Card 3: Fail */}
                    <div className="bg-[#1e293b]/30 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-red-500/20 shadow-md">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Video Fail</span>
                        <span className="text-2xl font-black text-red-400 mt-1">{win5Stats.fail}</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <XCircle className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                    {/* Card 4: % Win */}
                    <div className="bg-[#1e293b]/30 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-emerald-500/20 shadow-md">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tỷ Lệ Win</span>
                        <span className="text-2xl font-black text-emerald-400 mt-1">{win5Stats.percent}</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* HIỆU SUẤT CÁ NHÂN (10K VIEW) */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">HIỆU SUẤT CÁ NHÂN (10K VIEW)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                          <th className="pb-3 pl-2 w-12">#</th>
                          <th className="pb-3">TÊN</th>
                          <th className="pb-3 text-center">TỔNG VIDEO</th>
                          <th className="pb-3 text-center">WIN</th>
                          <th className="pb-3 text-center">FAIL</th>
                          <th className="pb-3 text-right pr-2">% WIN</th>
                          <th className="pb-3 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {scaledPerformance.map((perf, index) => (
                          <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 pl-2 text-slate-400 font-medium">{index + 1}</td>
                            <td
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => updateRowValue(sheetName, index, 'editor', e.currentTarget.textContent || '')}
                              className="py-4 font-bold text-slate-200 outline-none focus:bg-white/[0.04] cursor-text"
                            >
                              {perf.editor}
                            </td>
                            <td
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const val = parseInt(e.currentTarget.textContent || '0') || 0;
                                const rawVal = Math.round(val / multiplier);
                                updateRowValue(sheetName, index, 'totalVideos', rawVal.toString());
                              }}
                              className="py-4 text-center text-slate-300 outline-none focus:bg-white/[0.04] cursor-text"
                            >
                              {perf.total}
                            </td>
                            <td
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const val = parseInt(e.currentTarget.textContent || '0') || 0;
                                const rawVal = Math.round(val / multiplier);
                                updateRowValue(sheetName, index, 'winVideos', rawVal.toString());
                              }}
                              className="py-4 text-center text-emerald-400 font-semibold outline-none focus:bg-white/[0.04] cursor-text"
                            >
                              {perf.win}
                            </td>
                            <td className="py-4 text-center text-red-400">{perf.fail}</td>
                            <td className="py-4 text-right pr-2 text-emerald-400 font-extrabold">{perf.winRate}</td>
                            <td className="py-4 text-center pr-2">
                              <button
                                onClick={() => deleteRow(sheetName, index)}
                                className="text-red-500/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Row Button */}
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-start">
                    <button
                      onClick={() => addRow(sheetName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white rounded-lg text-xs font-bold transition shadow"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm dòng mới
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'Content mới win của cá nhân trong team/trên số video đã làm': {
        const ratio = baseData.win5Stats.total > 0 ? (baseData.newVideoStats.total / baseData.win5Stats.total) : 0;

        const scaledPerformance = baseData.editorPerformance.map(perf => {
          const total = Math.round(perf.totalVideos * ratio * multiplier);
          const win = Math.round(perf.winVideos * ratio * multiplier);
          const fail = total - win;
          const winRate = formatWinRate(win, total);
          return {
            editor: perf.editor,
            total,
            win,
            fail,
            winRate
          };
        });

        return (
          <div className="flex flex-col rounded-xl overflow-hidden border border-[#10b981]/20 shadow-lg shadow-emerald-950/10">
            <div
              onClick={() => toggleSheetCollapse(sheetName)}
              className="bg-[#063529] px-4 py-3 flex items-center justify-between border-b border-[#10b981]/20 cursor-pointer select-none hover:bg-[#0a4d3b] transition-colors"
            >
              <span className="text-[#10b981] font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#10b981]" /> Content mới win của cá nhân trong team/trên số video đã làm
              </span>
              <ChevronDown className={`w-4 h-4 text-[#10b981] transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
            </div>

            {!isCollapsed && (
              <div className="bg-[#0c1322] p-6 flex flex-col gap-6">
                {/* TỔNG VIDEO TEAM */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">TỔNG VIDEO TEAM</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Tổng Video */}
                    <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-emerald-500/20 shadow-md">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tổng Video Team</span>
                        <span className="text-2xl font-black text-white mt-1">{newVideoStats.total}</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Video className="w-5 h-5 text-[#10b981]" />
                      </div>
                    </div>
                    {/* Card 2: Win */}
                    <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-emerald-500/20 shadow-md">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Video Win</span>
                        <span className="text-2xl font-black text-emerald-400 mt-1">{newVideoStats.win}</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Award className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                    {/* Card 3: Fail */}
                    <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-red-500/20 shadow-md">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Video Fail</span>
                        <span className="text-2xl font-black text-red-400 mt-1">{newVideoStats.fail}</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <XCircle className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                    {/* Card 4: % Win */}
                    <div className="bg-[#063529]/20 border border-white/[0.04] rounded-xl p-4 flex items-center justify-between transition-all hover:border-emerald-500/20 shadow-md">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tỷ Lệ Win</span>
                        <span className="text-2xl font-black text-emerald-400 mt-1">{newVideoStats.percent}</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CỦA CÁ NHÂN (10K VIEW) */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">CỦA CÁ NHÂN (10K VIEW)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                          <th className="pb-3 pl-2 w-12">#</th>
                          <th className="pb-3">TÊN</th>
                          <th className="pb-3 text-center">TỔNG VIDEO</th>
                          <th className="pb-3 text-center">WIN</th>
                          <th className="pb-3 text-center">FAIL</th>
                          <th className="pb-3 text-right pr-2">% WIN</th>
                          <th className="pb-3 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {scaledPerformance.map((perf, index) => (
                          <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 pl-2 text-slate-400 font-medium">{index + 1}</td>
                            <td
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => updateRowValue(sheetName, index, 'editor', e.currentTarget.textContent || '')}
                              className="py-4 font-bold text-slate-200 outline-none focus:bg-white/[0.04] cursor-text"
                            >
                              {perf.editor}
                            </td>
                            <td
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const val = parseInt(e.currentTarget.textContent || '0') || 0;
                                const factor = ratio * multiplier;
                                const rawVal = factor > 0 ? Math.round(val / factor) : 0;
                                updateRowValue(sheetName, index, 'totalVideos', rawVal.toString());
                              }}
                              className="py-4 text-center text-slate-300 outline-none focus:bg-white/[0.04] cursor-text"
                            >
                              {perf.total}
                            </td>
                            <td
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const val = parseInt(e.currentTarget.textContent || '0') || 0;
                                const factor = ratio * multiplier;
                                const rawVal = factor > 0 ? Math.round(val / factor) : 0;
                                updateRowValue(sheetName, index, 'winVideos', rawVal.toString());
                              }}
                              className="py-4 text-center text-emerald-400 font-semibold outline-none focus:bg-white/[0.04] cursor-text"
                            >
                              {perf.win}
                            </td>
                            <td className="py-4 text-center text-red-400">{perf.fail}</td>
                            <td className="py-4 text-right pr-2 text-[#10b981] font-extrabold">{perf.winRate}</td>
                            <td className="py-4 text-center pr-2">
                              <button
                                onClick={() => deleteRow(sheetName, index)}
                                className="text-red-500/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Row Button */}
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-start">
                    <button
                      onClick={() => addRow(sheetName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white rounded-lg text-xs font-bold transition shadow"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm dòng mới
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'Báo cáo content': {
        return (
          <div className="flex flex-col rounded-xl overflow-hidden border border-[#10b981]/20 shadow-lg shadow-emerald-950/10">
            <div
              onClick={() => toggleSheetCollapse(sheetName)}
              className="bg-[#063529] px-4 py-3 flex items-center justify-between border-b border-[#10b981]/20 cursor-pointer select-none hover:bg-[#0a4d3b] transition-colors"
            >
              <span className="text-[#10b981] font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#10b981]" /> I. Content Mới Win
              </span>
              <ChevronDown className={`w-4 h-4 text-[#10b981] transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
            </div>

            {!isCollapsed && (
              <div className="bg-[#0c1322] p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="bg-[#131d31]/70 border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-4 flex flex-col gap-4 transition-all duration-200 shadow-md group"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Left Player Mock */}
                        <div className="w-full sm:w-44 h-48 bg-[#080d19] border border-white/[0.06] rounded-lg flex flex-col items-center justify-center relative overflow-hidden shrink-0 group-hover:border-blue-500/30 transition-colors">
                          <div className="absolute inset-0 bg-radial-gradient from-blue-900/10 to-transparent pointer-events-none" />

                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 z-10">
                            {video.label}
                          </span>

                          <div className="w-10 h-10 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-200 cursor-pointer z-10">
                            <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Right Contents Detail */}
                        <div className="flex-1 flex flex-col gap-3">
                          <div className="flex flex-col">
                            <div className="text-[10px] font-extrabold text-slate-300 bg-[#1e2a45] px-2.5 py-1 rounded-t-md border-b border-white/[0.06] tracking-wide uppercase">
                              Nội dung video
                            </div>
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => updateRowValue('5 Content win của team', video.id - 1, 'content', e.currentTarget.textContent || '')}
                              className="text-slate-300 text-xs bg-[#090f1b] p-2.5 rounded-b-md leading-relaxed min-h-[60px] font-medium border border-t-0 border-white/[0.03] outline-none focus:bg-white/[0.04] cursor-text"
                            >
                              {video.content}
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <div className="text-[10px] font-extrabold text-emerald-400 bg-[#073525] px-2.5 py-1 rounded-t-md border-b border-emerald-400/10 tracking-wide uppercase">
                              Phân tích tại sao win?
                            </div>
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => updateRowValue('5 Content win của team', video.id - 1, 'analysis', e.currentTarget.textContent || '')}
                              className="text-slate-300 text-xs bg-[#051a14]/60 p-2.5 rounded-b-md leading-relaxed min-h-[60px] font-medium border border-t-0 border-[#10b981]/5 outline-none focus:bg-[#051a14]/90 cursor-text"
                            >
                              {video.analysis}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.04]">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-md text-slate-300 text-[10px] font-extrabold tracking-wide uppercase">
                          <User className="w-3 h-3 text-slate-400" /> Editor:
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue('5 Content win của team', video.id - 1, 'editor', e.currentTarget.textContent || '')}
                            className="outline-none focus:bg-white/[0.04] cursor-text ml-1"
                          >
                            {video.editor}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-md text-[10px] font-extrabold tracking-wide uppercase ml-auto">
                          <Eye className="w-3 h-3 text-blue-500" />
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue('5 Content win của team', video.id - 1, 'views', e.currentTarget.textContent || '')}
                            className="outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {video.views}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case '5 Content win của team':
      default: {
        const rows = [...videos];
        while (rows.length < 5) {
          rows.push({
            id: rows.length + 1,
            label: 'Data point',
            content: 'Data point',
            analysis: 'Data point',
            editor: 'Data point',
            views: '-'
          });
        }

        return (
          <div className="flex flex-col rounded-xl overflow-hidden border border-[#10b981]/20 shadow-lg shadow-emerald-950/10">
            <div
              onClick={() => toggleSheetCollapse(sheetName)}
              className="bg-[#063529] px-4 py-3 flex items-center justify-between border-b border-[#10b981]/20 cursor-pointer select-none hover:bg-[#0a4d3b] transition-colors"
            >
              <span className="text-[#10b981] font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#10b981]" /> 5 Content win của team
              </span>
              <ChevronDown className={`w-4 h-4 text-[#10b981] transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
            </div>

            {!isCollapsed && (
              <div className="bg-[#0c1322] p-6 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400 text-[10px] uppercase tracking-wider font-bold bg-white/[0.02]">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 text-center">TEAM</th>
                      <th className="py-3 px-4 text-center">EDITOR</th>
                      <th className="py-3 px-4 text-center">LINK</th>
                      <th className="py-3 px-4 text-center">THUMBNAIL</th>
                      <th className="py-3 px-4 w-1/3 text-center">NỘI DUNG CONTENT</th>
                      <th className="py-3 px-4 w-1/3 text-center">PHÂN TÍCH TẠI SAO WIN?</th>
                      <th className="py-3 px-4 text-center">SỐ VIEWS</th>
                      <th className="py-3 px-4 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((video, idx) => {
                      const isMock = video.label === 'Data point';
                      return (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                          <td className="py-3.5 px-4 text-slate-300 font-semibold text-xs">
                            {isMock ? 'Data point' : activeTab}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'editor', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-slate-300 font-medium text-xs outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {video.editor}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'videoUrl', e.currentTarget.textContent || '')}
                            className={`py-3.5 px-4 text-xs outline-none focus:bg-white/[0.04] cursor-text max-w-[120px] truncate focus:max-w-none focus:whitespace-normal break-all ${
                              isMock 
                                ? 'text-slate-500 font-bold text-center' 
                                : !video.videoUrl 
                                  ? 'text-blue-400/50 italic' 
                                  : 'text-blue-400 hover:text-blue-300 underline font-medium'
                            }`}
                            title={isMock ? '' : (video.videoUrl || 'Dán link video...')}
                          >
                            {isMock ? '-' : (video.videoUrl || 'Dán link video...')}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {isMock ? (
                              <span className="text-slate-500 font-bold">Data point</span>
                            ) : (
                              <div className="flex items-start shrink-0">
                                <label className="cursor-pointer group relative block">
                                  {video.thumbnail ? (
                                    <div className="w-10 h-10 rounded bg-slate-800 border border-white/10 overflow-hidden transition-all duration-200 hover:border-blue-500 hover:scale-105 shrink-0">
                                      <img src={video.thumbnail} className="w-full h-full object-cover" alt="Thumb" />
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ImageIcon className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-slate-900 border border-dashed border-white/10 hover:border-blue-500 hover:bg-white/[0.02] flex items-center justify-center transition-all duration-200 shrink-0" title="Click để tải ảnh lên">
                                      <ImageIcon className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                                    </div>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const localUrl = URL.createObjectURL(file);
                                        updateRowValue(sheetName, idx, 'thumbnail', localUrl);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            )}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'content', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {video.content}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'analysis', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {video.analysis}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateRowValue(sheetName, idx, 'views', e.currentTarget.textContent || '')}
                            className="py-3.5 px-4 text-right font-bold text-xs text-emerald-400 outline-none focus:bg-white/[0.04] cursor-text"
                          >
                            {isMock ? '-' : formatCommaNumber(video.views)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {!isMock && (
                              <button
                                onClick={() => deleteRow(sheetName, idx)}
                                className="text-red-500/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Add Row Button */}
                <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-start">
                  <button
                    onClick={() => addRow(sheetName)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white rounded-lg text-xs font-bold transition shadow"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm dòng mới
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className={`-m-6 p-8 bg-[#0b0f19] text-white flex flex-col gap-6 font-sans ${activeSubTab === 'trinh-bay' ? 'lg:h-[calc(100vh-64px)] lg:overflow-hidden pb-8' : 'min-h-[calc(100vh-64px)] pb-20'}`}>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-white/[0.08] gap-8">
        <button
          onClick={() => handleSubTabChange('bao-cao')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all duration-150 ${activeSubTab === 'bao-cao'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-200'
            }`}
        >
          Báo cáo
        </button>
        <button
          onClick={() => handleSubTabChange('trinh-bay')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all duration-150 ${activeSubTab === 'trinh-bay'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-200'
            }`}
        >
          Trình bày
        </button>
        <button
          onClick={() => handleSubTabChange('thong-ke')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all duration-150 ${activeSubTab === 'thong-ke'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-200'
            }`}
        >
          Thống kê
        </button>
      </div>

      {activeSubTab === 'bao-cao' && (
        <div className="flex flex-col gap-6">
          {/* Teams Selector */}
          <div className="flex bg-[#121929] border border-white/[0.08] p-1 rounded-xl max-w-xs shadow-inner">
            {Object.keys(teamsData).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === tab
                    ? 'bg-[#bfdbfe] text-[#1e3a8a] shadow-md scale-100'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>


          {/* Render all 5 tables stacked */}
          <div className="flex flex-col gap-8 mt-2">
            {renderSheetContent('5 Content win của team')}
            {renderSheetContent('5 Content fail của team')}
            {renderSheetContent('5 Case Study hay bên ngoài')}
            {renderSheetContent('Số video content win của cá nhân trong team')}
            {renderSheetContent('Content mới win của cá nhân trong team/trên số video đã làm')}
          </div>
        </div>
      )}

      {activeSubTab === 'trinh-bay' && (() => {
        const baseData = teamsData[activeTab];

        let slidesList: any[] = [];
        if (presentationMenu === 'win') slidesList = baseData.videos || [];
        else if (presentationMenu === 'fail') slidesList = baseData.failVideos || [];
        else if (presentationMenu === 'case') slidesList = baseData.caseStudies || [];
        else if (presentationMenu === 'clone') slidesList = baseData.cloneVideos || [];
        else if (presentationMenu === 'action') slidesList = baseData.actions || [];

        // Safe indexing
        const validSlideIndex = Math.max(0, Math.min(activeSlideIndex, slidesList.length - 1));
        const selectedSlide = slidesList.length > 0 ? slidesList[validSlideIndex] : null;

        const handlePlayerClick = (e: React.MouseEvent) => {
          const target = e.target as HTMLElement;
          if (target.closest('.no-player-click')) return;

          if (selectedSlide?.videoUrl && selectedSlide.videoUrl.trim() !== '') {
            setIsPlayingVideo(true);
          } else {
            alert('Vui lòng điền link video ở cột LINK trong tab Báo cáo trước khi phát!');
          }
        };

        // Custom Unsplash matching helper based on title or content
        const getSlideUnsplashImage = (slide: any) => {
          if (!slide) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'; // abstract design
          if (slide.thumbnail && slide.thumbnail.trim()) return slide.thumbnail;
          const text = ((slide.content || '') + ' ' + (slide.title || '')).toLowerCase();
          if (text.includes('laptop') || text.includes('keycap') || text.includes('bàn phím') || text.includes('tai nghe') || text.includes('công nghệ') || text.includes('cáp sạc')) {
            return 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80'; // tech laptop
          }
          if (text.includes('quần áo') || text.includes('phối đồ') || text.includes('thời trang') || text.includes('sáp vuốt tóc') || text.includes('vải')) {
            return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80'; // fashion
          }
          if (text.includes('vệ sinh giày') || text.includes('sneaker') || text.includes('giày')) {
            return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'; // shoe
          }
          if (text.includes('ốp lưng') || text.includes('điện thoại') || text.includes('sạc dự phòng') || text.includes('ví da') || text.includes('giá đỡ')) {
            return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'; // phone
          }
          if (text.includes('nến thơm') || text.includes('decor') || text.includes('bình giữ nhiệt') || text.includes('lót chuột') || text.includes('đèn ngủ') || text.includes('kệ sách') || text.includes('gối massage')) {
            return 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80'; // home decor
          }
          return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'; // default abstract
        };

        const renderPlatformBadge = (platform: string) => {
          const p = (platform || 'TikTok').toLowerCase();
          if (p.includes('reels') || p.includes('instagram')) {
            return (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-pink-500/10 border border-pink-500/30 text-pink-400">
                Instagram Reels
              </span>
            );
          }
          if (p.includes('shorts') || p.includes('youtube')) {
            return (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400">
                YouTube Shorts
              </span>
            );
          }
          return (
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              TikTok
            </span>
          );
        };

        return (
          <div className="flex flex-col gap-6 lg:flex-1 lg:min-h-0">

            {/* Team Statistics Overview Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#131d31] border border-white/[0.06] p-4 rounded-2xl shadow-lg shrink-0">
              {/* Team Name Display */}
              <div className="flex items-center gap-3 bg-[#0c1322] border border-white/[0.04] px-4 py-3 rounded-xl shadow-inner">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-md shadow-blue-500/50" />
                <span className="text-lg font-black uppercase text-slate-200 tracking-wider">
                  {baseData.teamName || `Team ${activeTab}`}
                </span>
              </div>

              {/* Stat 1: Tổng Content Win */}
              <div className="bg-[#0c1322] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between shadow">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Tổng Content Win</span>
                  <span className="text-2xl font-black text-white mt-1">
                    {baseData.win5Stats.win}/{baseData.win5Stats.total}
                  </span>
                </div>
                <Trophy className="w-6 h-6 text-amber-400 shrink-0 ml-2" />
              </div>

              {/* Stat 2: Content mới win */}
              <div className="bg-[#0c1322] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between shadow">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Content mới win</span>
                  <span className="text-2xl font-black text-white mt-1">
                    {baseData.newVideoStats.win}/{baseData.newVideoStats.total}
                  </span>
                </div>
                <Sparkles className="w-6 h-6 text-emerald-400 shrink-0 ml-2" />
              </div>

              {/* Stat 3: Tỷ lệ win content mới */}
              <div className="bg-[#0c1322] border border-emerald-500/20 bg-emerald-500/[0.02] rounded-xl p-3 flex items-center justify-between shadow">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wide">Tỷ lệ win content mới</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1">
                    {(baseData.newVideoStats.percent || '').replace('.', ',')}
                  </span>
                </div>
                <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0 ml-2" />
              </div>
            </div>

            {/* Top Team & Presentation Tab Navigation Bar */}
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-[#131d31] border border-white/[0.06] p-4 rounded-2xl shadow-lg">

              {/* Category Tabs Menu with icons & counts */}
              <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                {[
                  { id: 'win', label: 'Content Win Mới', count: baseData.videos.length, icon: Trophy, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                  { id: 'fail', label: 'Content Fail', count: baseData.failVideos.length, icon: XCircle, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
                  { id: 'case', label: 'Case Study', count: baseData.caseStudies.length, icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                  { id: 'clone', label: 'Clone/Cover Win', count: (baseData.cloneVideos || []).length, icon: Copy, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' }
                ].map((menuItem) => {
                  const isActive = presentationMenu === menuItem.id;
                  const Icon = menuItem.icon;
                  return (
                    <button
                      key={menuItem.id}
                      onClick={() => {
                        setPresentationMenu(menuItem.id as any);
                        setActiveSlideIndex(0);
                        setIsPlayingVideo(false);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-extrabold transition-all duration-200 ${isActive
                          ? 'bg-[#1e293b] text-white border-blue-500 shadow-lg shadow-blue-950/50 scale-100'
                          : 'bg-white/[0.02] text-slate-400 border-white/[0.04] hover:bg-white/[0.05] hover:text-slate-200'
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : menuItem.color.split(' ')[0]}`} />
                      <span>{menuItem.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-white/[0.05] text-slate-500'}`}>
                        {menuItem.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Team Selector in Presentation mode */}
              <div className="flex bg-[#0c1322] border border-white/[0.06] p-1 rounded-xl shadow-inner w-full xl:w-auto xl:max-w-xs self-stretch xl:self-auto justify-between xl:justify-start gap-1">
                {Object.keys(teamsData).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setActiveSlideIndex(0);
                      setIsPlayingVideo(false);
                    }}
                    className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === tab
                        ? 'bg-[#bfdbfe] text-[#1e3a8a] shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* 3-Column Interactive Presentation Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:flex-1 lg:min-h-0">

              {/* Column 1: Left Slides List Sidebar (3 cols on desktop) */}
              <div className="lg:col-span-3 bg-[#131d31]/80 border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between shadow-xl lg:h-full lg:min-h-0 h-[680px]">
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 shrink-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <ListTodo className="w-3.5 h-3.5 text-blue-400" /> Danh sách Slide
                    </span>
                    <span className="text-[10px] font-black text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-full">
                      {slidesList.length} slide
                    </span>
                  </div>

                  {/* Scrollable slides list container */}
                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {slidesList.length === 0 ? (
                      <div className="text-center py-10 text-slate-500 text-xs font-medium">
                        Chưa có slide nào
                      </div>
                    ) : (
                      slidesList.map((slide, index) => {
                        const isCurrent = validSlideIndex === index;
                        return (
                          <div
                            key={index}
                            onClick={() => {
                              setActiveSlideIndex(index);
                              setIsPlayingVideo(false);
                            }}
                            className={`flex gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-200 group select-none relative overflow-hidden flex-shrink-0 ${isCurrent
                                ? 'bg-gradient-to-r from-blue-950/50 to-[#1e293b]/50 border-blue-500 shadow-md shadow-blue-950/20'
                                : 'bg-white/[0.01] hover:bg-white/[0.03] border-white/[0.04]'
                              }`}
                          >
                            {/* Slide Number */}
                            <div className={`text-[10px] font-black px-1.5 py-0.5 rounded h-5 flex items-center justify-center ${isCurrent ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.05] text-slate-500'
                              }`}>
                              {String(index + 1).padStart(2, '0')}
                            </div>

                            {/* Thumbnail & Title Info */}
                            <div className="flex-1 flex flex-col gap-1 min-w-0">
                              <span className={`text-[11px] font-extrabold truncate ${isCurrent ? 'text-white font-black' : 'text-slate-300 group-hover:text-white'
                                }`}>
                                {presentationMenu === 'action' ? slide.title : slide.content}
                              </span>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                                <span className="truncate max-w-[100px] flex items-center gap-1 font-semibold">
                                  <User className="w-2.5 h-2.5 text-slate-600" />
                                  {presentationMenu === 'action' ? slide.assignee : (slide.editor || 'Ẩn danh')}
                                </span>
                                <span className="font-extrabold text-blue-400/80">
                                  {presentationMenu === 'action' ? slide.deadline : slide.views}
                                </span>
                              </div>
                            </div>

                            {/* Platform dot selector indicator */}
                            {isCurrent && (
                              <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Sidebar Bottom Add Slide Button */}
                <button
                  onClick={() => addSlide(presentationMenu)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-white/[0.03] hover:bg-blue-600 hover:text-white border border-white/[0.06] hover:border-blue-500 text-slate-300 rounded-xl text-xs font-black transition-all duration-200 shadow-md group shrink-0"
                >
                  <Plus className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
                  Thêm slide mới
                </button>
              </div>

              {/* Column 2: Center Main Slide Stage (6 cols on desktop) */}
              <div className="lg:col-span-6 flex flex-col gap-4 lg:h-full lg:min-h-0 h-[680px]">

                {/* stage title bar */}
                <div className="bg-[#131d31] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between shadow-lg shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                      Slide {slidesList.length > 0 ? validSlideIndex + 1 : 0} / {slidesList.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsFullscreenSlide(true)}
                      disabled={!selectedSlide}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600/90 text-white rounded-lg text-xs font-black transition-all duration-150 shadow"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Trình chiếu Fullscreen
                    </button>
                    <button
                      onClick={() => deleteSlide(presentationMenu, validSlideIndex)}
                      disabled={!selectedSlide}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-500/20 disabled:opacity-40 text-red-400 hover:text-white border border-red-500/20 rounded-lg text-xs font-black transition-all duration-150"
                      title="Xóa slide hiện tại"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main slide stage area */}
                {selectedSlide ? (
                  <div className="flex-1 bg-[#131d31]/50 border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-6 shadow-xl relative overflow-hidden overflow-y-auto custom-scrollbar">
                    <div className="absolute inset-0 bg-radial-gradient from-blue-900/[0.03] to-transparent pointer-events-none" />

                    {/* Content Detail Visual Stage */}
                    <div className="flex flex-col md:flex-row gap-6 items-stretch">

                      {/* Left: Video Mockup Player */}
                      <div
                        onClick={handlePlayerClick}
                        className="w-full md:w-56 bg-[#090e18] border border-white/[0.08] rounded-xl flex flex-col justify-between overflow-hidden relative group shrink-0 min-h-[220px] cursor-pointer hover:border-blue-500/50 transition-all duration-300 select-none"
                      >
                        {isPlayingVideo && selectedSlide.videoUrl ? (
                          <div className="absolute inset-0 z-10 bg-[#090e18] flex flex-col justify-between no-player-click">
                            <video 
                              src={selectedSlide.videoUrl} 
                              controls 
                              autoPlay 
                              className="w-full h-full object-cover" 
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsPlayingVideo(false);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 border border-white/10 rounded-full text-white hover:text-red-400 z-20 transition-all duration-150"
                              title="Đóng video"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <img
                            src={getSlideUnsplashImage(selectedSlide)}
                            alt="Mock preview"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>

                      {/* Right: Info Fields & Editing */}
                      <div className="flex-1 flex flex-col gap-4">

                        {/* Title or content core editable text */}
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                            {presentationMenu === 'action' ? 'Nội dung công việc' : (presentationMenu === 'case' ? 'Tiêu đề Case Study' : 'Nội dung video / Kịch bản')}
                          </label>
                          {presentationMenu === 'action' ? (
                            <input
                              type="text"
                              value={selectedSlide.title || ''}
                              onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'title', e.target.value)}
                              className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-xl p-3 text-xs text-white placeholder-slate-500 font-medium transition-all"
                              placeholder="Nhập tiêu đề hành động..."
                            />
                          ) : presentationMenu === 'case' ? (
                            <input
                              type="text"
                              value={selectedSlide.title || ''}
                              onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'title', e.target.value)}
                              className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-xl p-3 text-xs text-white placeholder-slate-500 font-medium transition-all"
                              placeholder="Nhập tiêu đề case study..."
                            />
                          ) : (
                            <textarea
                              rows={3}
                              value={selectedSlide.content || ''}
                              onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'content', e.target.value)}
                              className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-xl p-3 text-xs text-white placeholder-slate-500 font-medium leading-relaxed resize-none transition-all"
                              placeholder="Nhập nội dung/kịch bản video..."
                            />
                          )}
                        </div>

                        {/* General Meta Rows Grid */}
                        <div className="grid grid-cols-2 gap-4">

                          {/* Row 1 Field: Assignee/Editor */}
                          <div className="flex flex-col">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1">
                              <User className="w-3 h-3 text-blue-400" />
                              {presentationMenu === 'action' ? 'Người thực hiện' : 'Editor'}
                            </label>
                            <input
                              type="text"
                              value={presentationMenu === 'action' ? (selectedSlide.assignee || '') : (selectedSlide.editor || '')}
                              onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, presentationMenu === 'action' ? 'assignee' : 'editor', e.target.value)}
                              className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-2.5 py-2 text-xs text-white transition-all font-semibold"
                            />
                          </div>

                          {/* Row 2 Field: Deadline/Views */}
                          <div className="flex flex-col">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-blue-400" />
                              {presentationMenu === 'action' ? 'Thời hạn' : 'Lượt xem (Views)'}
                            </label>
                            <input
                              type="text"
                              value={presentationMenu === 'action' ? (selectedSlide.deadline || '') : (selectedSlide.views || '')}
                              onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, presentationMenu === 'action' ? 'deadline' : 'views', e.target.value)}
                              className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-2.5 py-2 text-xs text-white transition-all font-semibold"
                            />
                          </div>
                        </div>

                        {/* Platform / Channel Row */}
                        <div className="grid grid-cols-2 gap-4">

                          {/* Select platform for videos/case studies, or priority for action, or targetChannel for clone */}
                          {presentationMenu === 'action' ? (
                            <div className="flex flex-col">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Độ ưu tiên</label>
                              <select
                                value={selectedSlide.priority || 'Trung bình'}
                                onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'priority', e.target.value)}
                                className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-2 py-2 text-xs text-white font-semibold transition-all"
                              >
                                <option value="Cao">Cao</option>
                                <option value="Trung bình">Trung bình</option>
                                <option value="Thấp">Thấp</option>
                              </select>
                            </div>
                          ) : presentationMenu === 'case' ? (
                            <div className="flex flex-col">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Kênh Case study</label>
                              <input
                                type="text"
                                value={selectedSlide.channel || ''}
                                onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'channel', e.target.value)}
                                className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-2.5 py-2 text-xs text-white transition-all font-semibold"
                              />
                            </div>
                          ) : presentationMenu === 'clone' ? (
                            <div className="flex flex-col">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Kênh đối thủ cần Clone</label>
                              <input
                                type="text"
                                value={selectedSlide.targetChannel || ''}
                                onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'targetChannel', e.target.value)}
                                className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-2.5 py-2 text-xs text-white transition-all font-semibold"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Nền tảng</label>
                              <select
                                value={selectedSlide.platform || 'TikTok'}
                                onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'platform', e.target.value)}
                                className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-2 py-2 text-xs text-white font-semibold transition-all"
                              >
                                <option value="TikTok">TikTok</option>
                                <option value="Instagram Reels">Instagram Reels</option>
                                <option value="YouTube Shorts">YouTube Shorts</option>
                              </select>
                            </div>
                          )}

                          {/* Post Date or Status */}
                          {presentationMenu === 'action' ? (
                            <div className="flex flex-col">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Trạng thái</label>
                              <select
                                value={selectedSlide.status || 'Chưa bắt đầu'}
                                onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'status', e.target.value)}
                                className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-2 py-2 text-xs text-white font-semibold transition-all"
                              >
                                <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                                <option value="Đang tiến hành">Đang tiến hành</option>
                                <option value="Hoàn thành">Hoàn thành</option>
                              </select>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Ngày đăng</label>
                              <input
                                type="date"
                                value={selectedSlide.postDate || ''}
                                onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'postDate', e.target.value)}
                                className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-lg px-2.5 py-2 text-xs text-white transition-all font-semibold"
                              />
                            </div>
                          )}
                        </div>



                      </div>
                    </div>

                    {/* Stats Dashboard Grid Rows (Only for videos / cases / clones) */}
                    {presentationMenu !== 'action' && (
                      <div className="grid grid-cols-4 gap-4 border-t border-white/[0.06] pt-4">

                        {/* stat 1: likes */}
                        <div className="bg-[#0c1322] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between shadow">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide truncate">Thích</span>
                            <input
                              type="text"
                              value={selectedSlide.likes || '0'}
                              onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'likes', e.target.value)}
                              className="bg-transparent text-sm font-black text-white outline-none w-full mt-0.5 focus:border-b focus:border-blue-500"
                            />
                          </div>
                          <Heart className="w-4 h-4 text-rose-500 shrink-0 ml-1.5" />
                        </div>

                        {/* stat 2: comments */}
                        <div className="bg-[#0c1322] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between shadow">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide truncate">Bình luận</span>
                            <input
                              type="text"
                              value={selectedSlide.comments || '0'}
                              onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'comments', e.target.value)}
                              className="bg-transparent text-sm font-black text-white outline-none w-full mt-0.5 focus:border-b focus:border-blue-500"
                            />
                          </div>
                          <MessageCircle className="w-4 h-4 text-blue-400 shrink-0 ml-1.5" />
                        </div>

                        {/* stat 3: shares */}
                        <div className="bg-[#0c1322] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between shadow">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide truncate">Chia sẻ</span>
                            <input
                              type="text"
                              value={selectedSlide.shares || '0'}
                              onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'shares', e.target.value)}
                              className="bg-transparent text-sm font-black text-white outline-none w-full mt-0.5 focus:border-b focus:border-blue-500"
                            />
                          </div>
                          <Share2 className="w-4 h-4 text-cyan-400 shrink-0 ml-1.5" />
                        </div>

                        {/* stat 4: total views mockup */}
                        <div className="bg-[#0c1322] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between shadow">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide truncate">Lượt xem</span>
                            <span className="text-sm font-black text-blue-400 truncate mt-0.5">
                              {selectedSlide.views || '0'}
                            </span>
                          </div>
                          <Eye className="w-4 h-4 text-blue-400 shrink-0 ml-1.5" />
                        </div>
                      </div>
                    )}

                    {/* Detailed Notes Field */}
                    <div className="border-t border-white/[0.06] pt-4 flex flex-col">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        Ghi chú định hướng nội bộ
                      </label>
                      <textarea
                        rows={2}
                        value={selectedSlide.notes || ''}
                        onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'notes', e.target.value)}
                        className="bg-[#0c1322] border border-white/[0.06] focus:border-blue-500 outline-none rounded-xl p-3 text-xs text-white placeholder-slate-500 font-medium leading-relaxed resize-none transition-all"
                        placeholder="Nhập ghi chú định hướng chiến dịch..."
                      />
                    </div>

                  </div>
                ) : (
                  <div className="bg-[#131d31]/30 border border-white/[0.06] rounded-2xl p-10 flex flex-col items-center justify-center min-h-[400px] text-center shadow-xl flex-1">
                    <Presentation className="w-12 h-12 text-slate-600 mb-4 animate-bounce" />
                    <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Không có slide</h3>
                    <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                      Hãy chọn danh mục khác hoặc click vào nút "Thêm slide mới" ở cột bên trái để tạo slide thuyết trình!
                    </p>
                  </div>
                )}

              </div>

              {/* Column 3: Right Analysis Cards Panel (3 cols on desktop) */}
              <div className="lg:col-span-3 flex flex-col gap-4 lg:h-full lg:min-h-0 h-[680px]">

                {/* Header title */}
                <div className="bg-[#131d31] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between shadow shadow-blue-950/20 shrink-0">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Phân tích & Đánh giá
                  </span>
                </div>

                {/* Scrollable analysis cards container */}
                {selectedSlide ? (
                  <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 custom-scrollbar">

                    {/* Card 1: Core reason (Why win/fail/takeaway) */}
                    {(() => {
                      let title = 'Tại sao Win?';
                      let field = 'analysis';
                      let borderClass = 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/[0.02]';
                      let iconColor = 'text-emerald-400';
                      let icon = Trophy;

                      if (presentationMenu === 'fail') {
                        title = 'Tại sao Fail?';
                        field = 'failReason';
                        borderClass = 'border-rose-500/20 hover:border-rose-500/40 bg-rose-500/[0.02]';
                        iconColor = 'text-rose-400';
                        icon = XCircle;
                      } else if (presentationMenu === 'case') {
                        title = 'Bài học rút ra (Takeaway)';
                        field = 'takeaway';
                        borderClass = 'border-amber-500/20 hover:border-amber-500/40 bg-amber-500/[0.02]';
                        iconColor = 'text-amber-400';
                        icon = BookOpen;
                      } else if (presentationMenu === 'clone') {
                        title = 'Tại sao Clone?';
                        field = 'analysis';
                        borderClass = 'border-indigo-500/20 hover:border-indigo-500/40 bg-indigo-500/[0.02]';
                        iconColor = 'text-indigo-400';
                        icon = Copy;
                      } else if (presentationMenu === 'action') {
                        title = 'Mô tả chi tiết công việc';
                        field = 'description';
                        borderClass = 'border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-500/[0.02]';
                        iconColor = 'text-cyan-400';
                        icon = ListTodo;
                      }

                      const CustomIcon = icon;
                      const value = selectedSlide[field] || '';

                      return (
                        <div className={`border rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 shadow-md ${borderClass}`}>
                          <div className="flex items-center gap-1.5">
                            <CustomIcon className={`w-4 h-4 ${iconColor}`} />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{title}</span>
                          </div>
                          <textarea
                            rows={4}
                            value={value}
                            onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, field, e.target.value)}
                            className="bg-transparent border-0 outline-none text-xs leading-relaxed text-slate-300 placeholder-slate-600 resize-none font-medium mt-1 w-full min-h-[140px] overflow-y-auto custom-scrollbar"
                            placeholder="Nhập nội dung phân tích..."
                          />
                        </div>
                      );
                    })()}

                    {/* Card 2: Highlights / Priority */}
                    {(() => {
                      const isAction = presentationMenu === 'action';
                      const title = isAction ? 'Mô tả chi tiết' : 'Điểm sáng nổi bật';
                      const field = isAction ? 'description' : 'highlights';
                      const borderClass = 'border-amber-500/10 hover:border-amber-500/30 bg-amber-500/[0.01]';
                      const iconColor = 'text-amber-400';
                      const Icon = isAction ? ListTodo : Sparkles;

                      // Skip highlights card if it's action menu since Description is already handled above
                      if (isAction) return null;

                      return (
                        <div className={`border rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 shadow-md ${borderClass}`}>
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-4 h-4 ${iconColor}`} />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{title}</span>
                          </div>
                          <textarea
                            rows={4}
                            value={selectedSlide[field] || ''}
                            onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, field, e.target.value)}
                            className="bg-transparent border-0 outline-none text-xs leading-relaxed text-slate-300 placeholder-slate-600 resize-none font-medium mt-1 w-full min-h-[140px] overflow-y-auto custom-scrollbar"
                            placeholder="Nhập các điểm sáng nổi bật..."
                          />
                        </div>
                      );
                    })()}

                    {/* Card 3: Improvements */}
                    {(() => {
                      const isAction = presentationMenu === 'action';
                      const title = isAction ? 'Ghi chú thêm' : 'Nếu làm lại sẽ cải thiện gì?';
                      const field = isAction ? 'notes' : 'improvements';
                      const borderClass = 'border-sky-500/20 hover:border-sky-500/40 bg-sky-500/[0.02]';
                      const iconColor = 'text-sky-400';
                      const Icon = isAction ? BookOpen : Wrench;

                      return (
                        <div className={`border rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 shadow-md ${borderClass}`}>
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-4 h-4 ${iconColor}`} />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{title}</span>
                          </div>
                          <textarea
                            rows={4}
                            value={selectedSlide[field] || ''}
                            onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, field, e.target.value)}
                            className="bg-transparent border-0 outline-none text-xs leading-relaxed text-slate-300 placeholder-slate-600 resize-none font-medium mt-1 w-full min-h-[140px] overflow-y-auto custom-scrollbar"
                            placeholder={isAction ? "Ghi chú thêm..." : "Nhập hướng cải tiến mới..."}
                          />
                        </div>
                      );
                    })()}

                    {/* Card 4: Leader comments */}
                    <div className="border border-purple-500/20 hover:border-purple-500/40 bg-purple-500/[0.02] rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 shadow-md">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-purple-400" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Leader duyệt / Đánh giá</span>
                      </div>
                      <textarea
                        rows={4}
                        value={selectedSlide.leaderComment || ''}
                        onChange={(e) => updateSlideField(presentationMenu, validSlideIndex, 'leaderComment', e.target.value)}
                        className="bg-transparent border-0 outline-none text-xs leading-relaxed text-slate-300 placeholder-slate-600 resize-none font-medium mt-1 w-full min-h-[140px] overflow-y-auto custom-scrollbar"
                        placeholder="Nhập ý kiến đánh giá từ Leader..."
                      />
                    </div>

                  </div>
                ) : (
                  <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-6 text-center text-slate-600 text-xs flex-1">
                    Chưa có slide để hiển thị phân tích.
                  </div>
                )}

              </div>

            </div>

            {/* Presenter Fullscreen Modal View */}
            {isFullscreenSlide && selectedSlide && (
              <div className="fixed inset-0 bg-[#070b13] z-50 flex flex-col justify-between p-10 font-sans text-white animate-fade-in select-none">
                <div className="absolute inset-0 bg-radial-gradient from-blue-950/20 to-transparent pointer-events-none" />

                {/* Top Control Bar */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-6 z-10">
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-blue-600 rounded-lg text-xs font-black uppercase tracking-widest">
                      {activeTab} PRESENTATION
                    </span>
                    <span className="text-sm font-extrabold uppercase text-slate-400 tracking-wider">
                      {presentationMenu === 'win' ? 'Content Win Mới' : (presentationMenu === 'fail' ? 'Content Fail' : (presentationMenu === 'case' ? 'Case Study' : (presentationMenu === 'clone' ? 'Clone/Cover Win' : 'Action tuần tới')))}
                    </span>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Slide indicator */}
                    <span className="text-sm font-black text-slate-400">
                      SLIDE {validSlideIndex + 1} / {slidesList.length}
                    </span>

                    {/* Close button */}
                    <button
                      onClick={() => {
                        setIsFullscreenSlide(false);
                        setIsPlayingVideo(false);
                      }}
                      className="p-2 bg-white/[0.06] hover:bg-red-500/20 hover:text-red-400 border border-white/[0.08] rounded-full transition-all duration-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Center Content Section */}
                <div className="flex-1 my-10 grid grid-cols-12 gap-10 items-center z-10">

                  {/* Left Side: Thumbnail Preview or Title Card (5 cols) */}
                  <div className="col-span-5 flex flex-col gap-6 justify-center">

                    {/* Video mockup frame */}
                    {presentationMenu !== 'action' ? (
                       <div 
                        onClick={handlePlayerClick}
                        className="w-full max-w-sm aspect-[4/3] bg-[#0c1322] border-2 border-white/[0.08] rounded-2xl overflow-hidden relative shadow-2xl mx-auto shadow-blue-950/50 cursor-pointer hover:border-blue-500/50 transition-all duration-300 select-none"
                      >
                        {isPlayingVideo && selectedSlide.videoUrl ? (
                          <div className="absolute inset-0 z-10 bg-[#0c1322] flex flex-col justify-between no-player-click" onClick={(e) => e.stopPropagation()}>
                            <video 
                              src={selectedSlide.videoUrl} 
                              controls 
                              autoPlay 
                              className="w-full h-full object-cover" 
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsPlayingVideo(false);
                              }}
                              className="absolute top-4 right-4 p-1.5 bg-black/70 hover:bg-black/90 border border-white/10 rounded-full text-white hover:text-red-400 z-20 transition-all"
                              title="Đóng video"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <img
                            src={getSlideUnsplashImage(selectedSlide)}
                            alt="mock"
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-full max-w-md bg-[#131d31] border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center gap-2 mb-4">
                          <Target className="w-6 h-6 text-cyan-400" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">
                            ACTION ITEM
                          </span>
                        </div>
                        <h2 className="text-2xl font-black text-white leading-snug tracking-tight">
                          {selectedSlide.title}
                        </h2>
                        <div className="flex gap-4 mt-6 text-xs text-slate-400 border-t border-white/[0.06] pt-6 font-bold">
                          <div className="flex flex-col gap-1">
                            <span>Người làm:</span>
                            <span className="text-white font-black">{selectedSlide.assignee}</span>
                          </div>
                          <div className="flex flex-col gap-1 ml-auto">
                            <span>Thời hạn:</span>
                            <span className="text-white font-black">{selectedSlide.deadline}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Big metrics summary row */}
                    {presentationMenu !== 'action' && (
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <div className="bg-[#131d31]/50 border border-white/[0.06] p-4 rounded-2xl text-center shadow-lg">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Lượt xem</p>
                          <p className="text-lg font-black text-blue-400 mt-1">{selectedSlide.views}</p>
                        </div>
                        <div className="bg-[#131d31]/50 border border-white/[0.06] p-4 rounded-2xl text-center shadow-lg">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Thích</p>
                          <p className="text-lg font-black text-rose-400 mt-1">{selectedSlide.likes}</p>
                        </div>
                        <div className="bg-[#131d31]/50 border border-white/[0.06] p-4 rounded-2xl text-center shadow-lg">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Bình luận</p>
                          <p className="text-lg font-black text-white mt-1">{selectedSlide.comments}</p>
                        </div>
                        <div className="bg-[#131d31]/50 border border-white/[0.06] p-4 rounded-2xl text-center shadow-lg">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Chia sẻ</p>
                          <p className="text-lg font-black text-cyan-400 mt-1">{selectedSlide.shares}</p>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Right Side: Large Analysis Cards (7 cols) */}
                  <div className="col-span-7 flex flex-col gap-6 justify-center">

                    {/* Core analysis note banner */}
                    <div className="bg-[#131d31]/40 border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-2">
                      <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
                        {presentationMenu === 'action' ? 'Mô tả công việc' : (presentationMenu === 'case' ? 'Mô tả Case study' : 'Kịch bản / Nội dung gốc')}
                      </span>
                      <p className="text-base font-medium leading-relaxed text-slate-200">
                        {presentationMenu === 'action' ? selectedSlide.description : (presentationMenu === 'case' ? selectedSlide.takeaway : selectedSlide.content)}
                      </p>
                    </div>

                    {/* Detailed Analysis Cards Row */}
                    <div className="grid grid-cols-2 gap-6">

                      {/* Analysis Card 1 */}
                      {presentationMenu !== 'action' && (
                        <div className="bg-[#0b1f1a]/80 border border-emerald-500/20 p-5 rounded-2xl flex flex-col gap-2 shadow-lg">
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-emerald-400" />
                            {presentationMenu === 'fail' ? 'Tại sao Fail?' : 'Tại sao Win / Bài học'}
                          </span>
                          <p className="text-xs font-semibold leading-relaxed text-slate-300">
                            {presentationMenu === 'fail' ? selectedSlide.failReason : (presentationMenu === 'case' ? selectedSlide.takeaway : selectedSlide.analysis)}
                          </p>
                        </div>
                      )}

                      {/* Analysis Card 2 */}
                      {presentationMenu !== 'action' && (
                        <div className="bg-[#1c1810]/80 border border-amber-500/20 p-5 rounded-2xl flex flex-col gap-2 shadow-lg">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            Đặc điểm nổi bật
                          </span>
                          <p className="text-xs font-semibold leading-relaxed text-slate-300">
                            {selectedSlide.highlights || 'Không có ghi chú đặc biệt.'}
                          </p>
                        </div>
                      )}

                      {/* Analysis Card 3 */}
                      <div className="bg-[#0b1b26]/80 border border-sky-500/20 p-5 rounded-2xl flex flex-col gap-2 shadow-lg">
                        <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-sky-400" />
                          {presentationMenu === 'action' ? 'Mức độ ưu tiên' : 'Hướng cải thiện'}
                        </span>
                        <p className="text-xs font-semibold leading-relaxed text-slate-300">
                          {presentationMenu === 'action' ? `Độ ưu tiên: ${selectedSlide.priority}` : (selectedSlide.improvements || 'Tiếp tục duy trì chất lượng hiện tại.')}
                        </p>
                      </div>

                      {/* Analysis Card 4 */}
                      <div className="bg-[#160d26]/80 border border-purple-500/20 p-5 rounded-2xl flex flex-col gap-2 shadow-lg">
                        <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-purple-400" />
                          Leader nhận xét
                        </span>
                        <p className="text-xs font-semibold leading-relaxed text-slate-300">
                          {selectedSlide.leaderComment || 'Chưa có nhận xét từ leader.'}
                        </p>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Bottom Navigator */}
                <div className="flex items-center justify-between border-t border-white/[0.08] pt-6 z-10">
                  <button
                    onClick={() => setActiveSlideIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={validSlideIndex === 0}
                    className="flex items-center gap-1.5 px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-20 disabled:hover:bg-white/[0.06] text-white border border-white/[0.08] rounded-xl text-xs font-black transition shadow"
                  >
                    <ChevronLeft className="w-4 h-4" /> Slide trước
                  </button>

                  <div className="text-xs font-bold text-slate-400">
                    Sử dụng các nút hoặc phím ← / → để chuyển slide
                  </div>

                  <button
                    onClick={() => setActiveSlideIndex((prev) => Math.min(prev + 1, slidesList.length - 1))}
                    disabled={validSlideIndex === slidesList.length - 1}
                    className="flex items-center gap-1.5 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:hover:bg-blue-600 text-white rounded-xl text-xs font-black transition shadow"
                  >
                    Slide tiếp theo <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {activeSubTab === 'thong-ke' && (
        <>
          {/* Teams Selector */}
          <div className="flex bg-[#121929] border border-white/[0.08] p-1 rounded-xl max-w-xs shadow-inner">
            {Object.keys(teamsData).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === tab
                    ? 'bg-[#bfdbfe] text-[#1e3a8a] shadow-md scale-100'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Stats Table Overview Grid */}
          {activeSheet === 'Báo cáo content' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: 5 Content Win Của Team */}
              <div className="bg-[#131d31] border border-white/[0.06] rounded-xl overflow-hidden shadow-lg transition-all duration-200 hover:border-white/[0.1]">
                <div className="px-4 py-3 bg-[#1e2a45]/40 border-b border-white/[0.06] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#10b981]/10 flex items-center justify-center border border-[#10b981]/20">
                    <Award className="w-3 h-3 text-[#10b981]" />
                  </div>
                  <span className="uppercase text-xs font-extrabold tracking-wider text-slate-200">
                    5 Content win của team
                  </span>
                </div>
                <div className="p-5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">Tổng Video Team</th>
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">Win</th>
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">Fail</th>
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 text-right">% Win</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="pt-4 text-xl font-black text-white">{win5Stats.total}</td>
                        <td className="pt-4 text-xl font-black text-white">{win5Stats.win}</td>
                        <td className="pt-4 text-xl font-black text-white">{win5Stats.fail}</td>
                        <td className="pt-4 text-xl font-black text-emerald-400 text-right">{win5Stats.percent}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Box 2: Tổng Video Content Mới Của Team */}
              <div className="bg-[#131d31] border border-white/[0.06] rounded-xl overflow-hidden shadow-lg transition-all duration-200 hover:border-white/[0.1]">
                <div className="px-4 py-3 bg-[#1e2a45]/40 border-b border-white/[0.06] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#10b981]/10 flex items-center justify-center border border-[#10b981]/20">
                    <FileText className="w-3 h-3 text-[#10b981]" />
                  </div>
                  <span className="uppercase text-xs font-extrabold tracking-wider text-slate-200">
                    Tổng video content mới của team
                  </span>
                </div>
                <div className="p-5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">Tổng Video Content Mới</th>
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">Win</th>
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">Fail</th>
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 text-right">% Win</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="pt-4 text-xl font-black text-white">{newVideoStats.total}</td>
                        <td className="pt-4 text-xl font-black text-white">{newVideoStats.win}</td>
                        <td className="pt-4 text-xl font-black text-white">{newVideoStats.fail}</td>
                        <td className="pt-4 text-xl font-black text-emerald-400 text-right">{newVideoStats.percent}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Render the selected sheet's content (tables / detail views) */}
          {renderSheetContent()}

        </>
      )}

      {/* Excel Bottom Sheets Tab Bar */}
      {activeSubTab === 'thong-ke' && (
        <div className="fixed bottom-0 left-0 right-0 h-11 bg-[#0f172a] border-t border-white/[0.08] flex items-center select-none z-50 text-slate-300">
          {/* Left Actions: + and Menu */}
          <div className="flex items-center h-full border-r border-white/[0.08] px-3 gap-3 shrink-0">
            <button className="hover:bg-white/[0.06] hover:text-white p-1 rounded transition-colors duration-150" title="Thêm trang tính">
              <Plus className="w-4 h-4 text-slate-400 hover:text-white" />
            </button>
            <button className="hover:bg-white/[0.06] hover:text-white p-1 rounded transition-colors duration-150" title="Tất cả trang tính">
              <Menu className="w-4 h-4 text-slate-400 hover:text-white" />
            </button>
          </div>

          {/* Tab Items */}
          <div className="flex-1 flex h-full overflow-x-auto scrollbar-none items-center">
            {SHEETS.map((sheet) => {
              const isActive = activeSheet === sheet;
              return (
                <button
                  key={sheet}
                  onClick={() => setActiveSheet(sheet)}
                  className={`flex items-center gap-1.5 px-5 h-full text-xs font-semibold border-r border-white/[0.08] transition-all duration-150 shrink-0 ${isActive
                      ? 'bg-[#1e293b] text-blue-400 font-bold border-b-2 border-blue-500'
                      : 'text-slate-400 hover:bg-[#1e293b]/30 hover:text-slate-200'
                    }`}
                >
                  <span>{sheet}</span>
                  <ChevronDown className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ThongKePage() {
  return (
    <Suspense fallback={
      <div className="-m-6 p-8 min-h-[calc(100vh-64px)] bg-[#0b0f19] text-white flex items-center justify-center">
        <div className="text-slate-400 text-sm">Đang tải báo cáo...</div>
      </div>
    }>
      <StatisticsDashboard />
    </Suspense>
  );
}
