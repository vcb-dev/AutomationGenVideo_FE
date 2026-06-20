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
  Presentation
} from 'lucide-react';

interface ContentWinItem {
  id: number;
  label: string;
  content: string;
  analysis: string;
  editor: string;
  views: string;
}

interface FailVideoItem {
  id: number;
  label: string;
  content: string;
  failReason: string;
  editor: string;
  views: string;
}

interface CaseStudyItem {
  id: number;
  label: string;
  title: string;
  channel: string;
  views: string;
  takeaway: string;
}

interface EditorPerfItem {
  editor: string;
  totalVideos: number;
  winVideos: number;
  failVideos: number;
  winRate: string;
  avgViews: string;
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
        views: '1.5M views'
      },
      {
        id: 2,
        label: 'Video 2',
        content: 'Bắt trend biến hình phối đồ công sở phong cách trẻ trung năng động.',
        analysis: 'Chuyển cảnh khớp với nhịp điệu nhạc nền đang hot trend trên TikTok và chọn góc sáng làm nổi bật phom dáng quần áo.',
        editor: 'Lệnh Ngọc Khánh',
        views: '920K views'
      },
      {
        id: 3,
        label: 'Video 3',
        content: 'ASMR gõ bàn phím cơ và unboxing set keycap custom phong cách retro cổ điển.',
        analysis: 'Chất lượng âm thanh thu bằng mic chuyên dụng cực tốt, tạo cảm giác thư giãn (satisfying) giữ chân người xem rất lâu.',
        editor: 'Mai Anh',
        views: '780K views'
      },
      {
        id: 4,
        label: 'Video 4',
        content: 'Review nhanh tai nghe chống ồn phân khúc giá rẻ dưới 500k cực hot.',
        analysis: 'So sánh trực tiếp độ chống ồn khi dùng tai nghe trong quán cà phê đông người, giải quyết đúng băn khoăn của tệp khách hàng.',
        editor: 'Nguyễn Linh Chi',
        views: '650K views'
      }
    ],
    failVideos: [
      {
        id: 1,
        label: 'Video 1',
        content: 'Chia sẻ mẹo học tiếng Anh qua bài hát cho người mới bắt đầu.',
        failReason: 'Nhạc nền quá to đè lên giọng thuyết minh, không có phụ đề (caption) chạy trên màn hình khiến người xem khó theo dõi.',
        editor: 'Mai Anh',
        views: '2.5K views'
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

  const SHEETS = [
    'Báo cáo content',
    '5 Content win của team',
    '5 Content fail của team',
    '5 Case Study hay bên ngoài',
    'Thống kê hiệu suất video',
    'Content mới win của cá nhân trong team/trên số video đã làm'
  ];

  const getSheetMultiplier = (sheet: string) => {
    switch (sheet) {
      case '5 Content fail của team': return 0.85;
      case '5 Case Study hay bên ngoài': return 0.9;
      case 'Thống kê hiệu suất video': return 1.1;
      case 'Content mới win của cá nhân trong team/trên số video đã làm': return 0.95;
      case 'Báo cáo content':
      case '5 Content win của team':
      default: return 1.0;
    }
  };

  const multiplier = getSheetMultiplier(activeSheet);
  const baseData = TEAMS_DATA[activeTab];

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

  const renderSheetContent = () => {
    switch (activeSheet) {

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
            <div className="bg-[#271414] px-4 py-3 flex items-center border-b border-red-500/20">
              <span className="text-red-400 font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" /> 5 Content fail của team
              </span>
            </div>
            
            <div className="bg-[#0c1322] p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400 text-[10px] uppercase tracking-wider font-bold bg-white/[0.02]">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">TEAM</th>
                    <th className="py-3 px-4">EDITOR</th>
                    <th className="py-3 px-4">LINK</th>
                    <th className="py-3 px-4 w-1/3">NỘI DUNG CONTENT</th>
                    <th className="py-3 px-4 w-1/3">PHÂN TÍCH TẠI SAO KHÔNG WIN?</th>
                    <th className="py-3 px-4 text-right">SỐ VIEWS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((video, idx) => {
                    const isMock = video.label === 'Data point';
                    return (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                        <td className="py-3.5 px-4 text-slate-300 font-semibold text-xs">
                          {isMock ? 'Data point' : baseData.teamName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium text-xs">{video.editor}</td>
                        <td className="py-3.5 px-4 text-xs">
                          <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors">
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Link video</span>
                          </a>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed">{video.content}</td>
                        <td className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed">{video.failReason}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-xs text-red-400">
                          {isMock ? '-' : formatCommaNumber(video.views)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
            <div className="bg-[#1e1b4b] px-4 py-3 flex items-center border-b border-purple-500/20">
              <span className="text-purple-300 font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400" /> 5 Case Study hay bên ngoài
              </span>
            </div>
            
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
                        <td className="py-3.5 px-4 text-slate-300 font-medium text-xs">
                          {isMock ? 'Data point' : video.channel}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors">
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Link video</span>
                          </a>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed">{video.title}</td>
                        <td className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed">{video.takeaway}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-xs text-purple-400">
                          {isMock ? '-' : formatCommaNumber(video.views)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'Thống kê hiệu suất video': {
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
            <div className="bg-[#1e293b] px-4 py-3 flex items-center border-b border-blue-500/20">
              <span className="text-blue-300 font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Thống kê hiệu suất video
              </span>
            </div>
            
            <div className="bg-[#0c1322] p-6 flex flex-col gap-6">
              {/* TỔNG VIDEO TEAM */}
              <div>
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">TỔNG VIDEO TEAM</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                        <th className="pb-3 pl-2">TỔNG VIDEO</th>
                        <th className="pb-3 text-center">WIN</th>
                        <th className="pb-3 text-center">FAIL</th>
                        <th className="pb-3 text-right pr-2">% WIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 pl-2 font-bold text-slate-200">{win5Stats.total}</td>
                        <td className="py-4 text-center text-slate-300">{win5Stats.win}</td>
                        <td className="py-4 text-center text-slate-300">{win5Stats.fail}</td>
                        <td className="py-4 text-right pr-2 text-emerald-400 font-black">{win5Stats.percent}</td>
                      </tr>
                    </tbody>
                  </table>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {scaledPerformance.map((perf, index) => (
                        <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 pl-2 text-slate-400 font-medium">{index + 1}</td>
                          <td className="py-4 font-bold text-slate-200">{perf.editor}</td>
                          <td className="py-4 text-center text-slate-300">{perf.total}</td>
                          <td className="py-4 text-center text-emerald-400 font-semibold">{perf.win}</td>
                          <td className="py-4 text-center text-red-400">{perf.fail}</td>
                          <td className="py-4 text-right pr-2 text-emerald-400 font-extrabold">{perf.winRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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
            <div className="bg-[#063529] px-4 py-3 flex items-center border-b border-[#10b981]/20">
              <span className="text-[#10b981] font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#10b981]" /> Content mới win của cá nhân trong team/trên số video đã làm
              </span>
            </div>
            
            <div className="bg-[#0c1322] p-6 flex flex-col gap-6">
              {/* TỔNG VIDEO TEAM */}
              <div>
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">TỔNG VIDEO TEAM</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                        <th className="pb-3 pl-2">TỔNG VIDEO TEAM</th>
                        <th className="pb-3 text-center">WIN</th>
                        <th className="pb-3 text-center">FAIL</th>
                        <th className="pb-3 text-right pr-2">% WIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 pl-2 font-bold text-slate-200">{newVideoStats.total}</td>
                        <td className="py-4 text-center text-slate-300">{newVideoStats.win}</td>
                        <td className="py-4 text-center text-slate-300">{newVideoStats.fail}</td>
                        <td className="py-4 text-right pr-2 text-emerald-400 font-black">{newVideoStats.percent}</td>
                      </tr>
                    </tbody>
                  </table>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {scaledPerformance.map((perf, index) => (
                        <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 pl-2 text-slate-400 font-medium">{index + 1}</td>
                          <td className="py-4 font-bold text-slate-200">{perf.editor}</td>
                          <td className="py-4 text-center text-slate-300">{perf.total}</td>
                          <td className="py-4 text-center text-emerald-400 font-semibold">{perf.win}</td>
                          <td className="py-4 text-center text-red-400">{perf.fail}</td>
                          <td className="py-4 text-right pr-2 text-emerald-400 font-extrabold">{perf.winRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'Báo cáo content': {
        return (
          <div className="flex flex-col rounded-xl overflow-hidden border border-[#10b981]/20 shadow-lg shadow-emerald-950/10">
            <div className="bg-[#063529] px-4 py-3 flex items-center border-b border-[#10b981]/20">
              <span className="text-[#10b981] font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#10b981]" /> I. Content Mới Win
              </span>
            </div>
            
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
                          <div className="text-slate-300 text-xs bg-[#090f1b] p-2.5 rounded-b-md leading-relaxed min-h-[60px] font-medium border border-t-0 border-white/[0.03]">
                            {video.content}
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <div className="text-[10px] font-extrabold text-emerald-400 bg-[#073525] px-2.5 py-1 rounded-t-md border-b border-emerald-400/10 tracking-wide uppercase">
                            Phân tích tại sao win?
                          </div>
                          <div className="text-slate-300 text-xs bg-[#051a14]/60 p-2.5 rounded-b-md leading-relaxed min-h-[60px] font-medium border border-t-0 border-[#10b981]/5">
                            {video.analysis}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-md text-slate-300 text-[10px] font-extrabold tracking-wide uppercase">
                        <User className="w-3 h-3 text-slate-400" /> Editor: {video.editor}
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-md text-[10px] font-extrabold tracking-wide uppercase ml-auto">
                        <Eye className="w-3 h-3 text-blue-500" /> {video.views}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
            <div className="bg-[#063529] px-4 py-3 flex items-center border-b border-[#10b981]/20">
              <span className="text-[#10b981] font-black tracking-wider text-sm uppercase flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#10b981]" /> 5 Content win của team
              </span>
            </div>
            
            <div className="bg-[#0c1322] p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400 text-[10px] uppercase tracking-wider font-bold bg-white/[0.02]">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">TEAM</th>
                    <th className="py-3 px-4">EDITOR</th>
                    <th className="py-3 px-4">LINK</th>
                    <th className="py-3 px-4 w-1/3">NỘI DUNG CONTENT</th>
                    <th className="py-3 px-4 w-1/3">PHÂN TÍCH TẠI SAO WIN?</th>
                    <th className="py-3 px-4 text-right">SỐ VIEWS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((video, idx) => {
                    const isMock = video.label === 'Data point';
                    return (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                        <td className="py-3.5 px-4 text-slate-300 font-semibold text-xs">
                          {isMock ? 'Data point' : baseData.teamName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium text-xs">
                          {isMock ? 'Data point' : video.editor}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors">
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Link video</span>
                          </a>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed">
                          {isMock ? 'Data point' : video.content}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed">
                          {isMock ? 'Data point' : video.analysis}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-xs text-emerald-400">
                          {isMock ? '-' : formatCommaNumber(video.views)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="-m-6 p-8 pb-20 min-h-[calc(100vh-64px)] bg-[#0b0f19] text-white flex flex-col gap-6 font-sans">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Báo cáo content
        </h1>
        <p className="text-slate-400 text-sm mt-1.5 font-medium">
          Phân tích hiệu suất nội dung và tăng trưởng của đội ngũ trong chu kỳ Q3.
        </p>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-white/[0.08] gap-8">
        <button
          onClick={() => handleSubTabChange('bao-cao')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all duration-150 ${
            activeSubTab === 'bao-cao'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-200'
          }`}
        >
          Báo cáo
        </button>
        <button
          onClick={() => handleSubTabChange('trinh-bay')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all duration-150 ${
            activeSubTab === 'trinh-bay'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-200'
          }`}
        >
          Trình bày
        </button>
        <button
          onClick={() => handleSubTabChange('thong-ke')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all duration-150 ${
            activeSubTab === 'thong-ke'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-200'
          }`}
        >
          Thống kê
        </button>
      </div>

      {activeSubTab === 'bao-cao' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#131d31] border border-white/[0.06] rounded-xl p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng báo cáo</p>
                <p className="text-2xl font-black text-white mt-1">12 Bản ghi</p>
              </div>
            </div>
            <div className="bg-[#131d31] border border-white/[0.06] rounded-xl p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái duyệt</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">100% Hoàn thành</p>
              </div>
            </div>
            <div className="bg-[#131d31] border border-white/[0.06] rounded-xl p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cập nhật gần nhất</p>
                <p className="text-sm font-semibold text-slate-300 mt-2">Hôm nay, 17:00</p>
              </div>
            </div>
          </div>

          <div className="bg-[#131d31] border border-white/[0.06] rounded-xl overflow-hidden shadow-lg">
            <div className="px-5 py-4 bg-[#1e2a45]/40 border-b border-white/[0.06] flex items-center justify-between">
              <span className="uppercase text-xs font-extrabold tracking-wider text-slate-200">
                Danh sách báo cáo định kỳ
              </span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow">
                <Plus className="w-3.5 h-3.5" /> Tạo báo cáo mới
              </button>
            </div>
            <div className="p-5 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-400 text-xs font-bold">
                    <th className="pb-3">TÊN BÁO CÁO</th>
                    <th className="pb-3">CHU KỲ BÁO CÁO</th>
                    <th className="pb-3 text-center">TRẠNG THÁI</th>
                    <th className="pb-3">NGƯỜI TẠO</th>
                    <th className="pb-3 text-right">TẢI XUỐNG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-4 font-bold text-white flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-blue-400" /> Báo cáo hiệu suất content Tuần 25
                    </td>
                    <td className="py-4 text-slate-300">15/06/2026 - 21/06/2026</td>
                    <td className="py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Hoàn thành</span>
                    </td>
                    <td className="py-4 text-slate-400 font-semibold">Đỗ Thị Nga</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button className="p-1.5 hover:bg-white/10 text-slate-300 rounded transition" title="Tải PDF">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-4 font-bold text-white flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-blue-400" /> Báo cáo hiệu suất content Tuần 24
                    </td>
                    <td className="py-4 text-slate-300">08/06/2026 - 14/06/2026</td>
                    <td className="py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Hoàn thành</span>
                    </td>
                    <td className="py-4 text-slate-400 font-semibold">Lệnh Ngọc Khánh</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button className="p-1.5 hover:bg-white/10 text-slate-300 rounded transition" title="Tải PDF">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-4 font-bold text-white flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-blue-400" /> Báo cáo chiến dịch video Tháng 6
                    </td>
                    <td className="py-4 text-slate-300">01/06/2026 - 30/06/2026</td>
                    <td className="py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">Bản nháp</span>
                    </td>
                    <td className="py-4 text-slate-400 font-semibold">Mai Anh</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button className="p-1.5 hover:bg-white/10 text-slate-300 rounded transition" title="Tải PDF">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-4 font-bold text-white flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-blue-400" /> Báo cáo tổng kết chu kỳ Q2
                    </td>
                    <td className="py-4 text-slate-300">01/04/2026 - 30/06/2026</td>
                    <td className="py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Hoàn thành</span>
                    </td>
                    <td className="py-4 text-slate-400 font-semibold">Nguyễn Linh Chi</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button className="p-1.5 hover:bg-white/10 text-slate-300 rounded transition" title="Tải PDF">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'trinh-bay' && (
        <div className="flex flex-col gap-6">
          <div className="bg-[#131d31] border border-white/[0.06] rounded-xl overflow-hidden shadow-lg p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2">
                <Presentation className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-extrabold tracking-wider text-slate-200 uppercase">
                  Slide Trình Chiếu Case Study & Chiến Lược
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/[0.04] px-3 py-1.5 rounded-lg font-semibold">
                Slide {currentSlide + 1} / {SLIDES.length}
              </div>
            </div>

            <div className="bg-[#0c1322] border border-white/[0.04] rounded-2xl p-8 min-h-[300px] flex flex-col justify-between shadow-inner relative overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-radial-gradient from-blue-900/[0.03] to-transparent pointer-events-none" />
              
              <div className="flex flex-col gap-4 z-10">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">{SLIDES[currentSlide].title}</h2>
                  <p className="text-xs text-blue-400 font-bold mt-1 uppercase tracking-wider">{SLIDES[currentSlide].subtitle}</p>
                </div>
                <div className="mt-2">
                  {SLIDES[currentSlide].content}
                </div>
              </div>

              <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/[0.04] z-10">
                <button
                  onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
                  disabled={currentSlide === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow"
                >
                  <ChevronLeft className="w-4 h-4" /> Trước
                </button>
                <div className="flex gap-1.5">
                  {SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        currentSlide === idx ? 'bg-blue-500 w-4' : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, SLIDES.length - 1))}
                  disabled={currentSlide === SLIDES.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow"
                >
                  Tiếp <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'thong-ke' && (
        <>
          {/* Teams Selector */}
          <div className="flex bg-[#121929] border border-white/[0.08] p-1 rounded-xl max-w-xs shadow-inner">
        {Object.keys(TEAMS_DATA).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              activeTab === tab
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
                  className={`flex items-center gap-1.5 px-5 h-full text-xs font-semibold border-r border-white/[0.08] transition-all duration-150 shrink-0 ${
                    isActive
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
