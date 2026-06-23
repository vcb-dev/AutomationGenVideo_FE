import { TeamData } from './types';

export const TEAMS_DATA: Record<string, TeamData> = {
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
      { id: 1, label: 'Video 1', content: 'Top 3 kem chống nắng kiềm dầu cực đỉnh cho nam giới vào mùa hè.', analysis: 'Đưa ra thử nghiệm bôi kem và kiểm tra độ dầu trên giấy thấm sau 4 tiếng, tạo sự tin cậy tuyệt đối về tính chân thực.', editor: 'Trần Văn An', views: '480K views' },
      { id: 2, label: 'Video 2', content: 'Mẹo vệ sinh giày sneaker trắng sạch như mới chỉ bằng nguyên liệu tại nhà.', analysis: 'Hình ảnh so sánh trước/sau (before/after) khác biệt rõ rệt ở phần đầu và cuối video tạo hiệu ứng tò mò cho người xem.', editor: 'Lê Thu Trang', views: '540K views' },
      { id: 3, label: 'Video 3', content: 'Unboxing và setup bàn làm việc tối giản (minimalism setup) truyền cảm hứng học tập.', analysis: 'Tone màu ấm áp, góc quay điện ảnh (cinematic) nhẹ nhàng tạo cảm giác chill, kích thích lượt lưu và chia sẻ cao.', editor: 'Phạm Minh Đức', views: '320K views' },
      { id: 4, label: 'Video 4', content: 'Review giá đỡ điện thoại thông minh tự động xoay theo gương mặt.', analysis: 'Biểu diễn trực tiếp tính năng tracking theo gương mặt khi người dùng di chuyển quanh phòng, làm nổi bật công nghệ của sản phẩm.', editor: 'Hoàng Thùy Linh', views: '290K views' }
    ],
    failVideos: [
      { id: 1, label: 'Video 1', content: 'Hướng dẫn tự cắt tóc mái thưa chuẩn Hàn Quốc tại nhà.', failReason: 'Góc quay không soi rõ thao tác cắt kéo, hướng dẫn thiếu cụ thể khiến người xem khó thực hành và thoát sớm.', editor: 'Lê Thu Trang', views: '3.1K views' },
      { id: 2, label: 'Video 2', content: 'Trải nghiệm làm nến thơm handmade từ sáp đậu nành.', failReason: 'Quy trình đun nấu quá dài dòng không tua nhanh, thiếu nhạc nền lôi cuốn dẫn tới thời gian xem trung bình quá ngắn.', editor: 'Phạm Minh Đức', views: '1.9K views' }
    ],
    caseStudies: [
      { id: 1, label: 'Case 1', title: 'Review bình giữ nhiệt vỏ tre khắc tên cá nhân hóa.', channel: 'Kênh Quà Tặng Độc Đáo - @giftideas', views: '1.8M views', takeaway: 'Quay cận cảnh nét khắc laser sắc nét và tiếng rót nước đá mát lạnh kích thích xúc giác và thính giác.' }
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
      { id: 1, label: 'Video 1', content: 'Tips chụp ảnh thẻ tại nhà siêu đẹp bằng điện thoại không cần ra tiệm.', analysis: 'Hướng dẫn chi tiết cách set đèn tự chế và app chỉnh ảnh miễn phí, giải quyết bài toán nhanh - gọn - rẻ cho học sinh.', editor: 'Nguyễn Tiến Dũng', views: '350K views' },
      { id: 2, label: 'Video 2', content: 'Review bình giữ nhiệt 1.2L giữ đá lạnh suốt 24h thực tế.', analysis: 'Bỏ đá vào bình và quay timelapse kiểm tra sau 24 giờ để chứng minh khả năng giữ nhiệt thực tế của sản phẩm.', editor: 'Vũ Hải Yến', views: '410K views' },
      { id: 3, label: 'Video 3', content: 'Review chiếc đèn ngủ phi hành gia chiếu bầu trời sao cực ảo diệu.', analysis: 'Quay video trong phòng tối hoàn toàn hiển thị luồng sáng lung linh chân thực làm nổi bật giá trị trang trí phòng ngủ.', editor: 'Đặng Quốc Huy', views: '270K views' },
      { id: 4, label: 'Video 4', content: 'Đánh giá ví da nam mini thông minh tự đẩy thẻ tiện lợi.', analysis: 'Thao tác gạt nút đẩy thẻ mượt mà lặp lại nhiều lần tạo cảm giác sướng mắt và sướng tay cho người dùng ví.', editor: 'Phan Bảo Trâm', views: '210K views' }
    ],
    failVideos: [
      { id: 1, label: 'Video 1', content: 'Đánh giá nhanh chiếc đế tản nhiệt laptop giá 80k.', failReason: 'Thiết kế quá mỏng manh không tải được máy nặng, hiệu suất giảm nhiệt kém nhưng video nói quá phóng đại, mất uy tín.', editor: 'Vũ Hải Yến', views: '2.2K views' }
    ],
    caseStudies: [
      { id: 1, label: 'Case 1', title: 'Mẹo sửa khóa kéo áo khoác bị kẹt cực đơn giản.', channel: 'Kênh Handmade - @easydiy', views: '2.5M views', takeaway: 'Nội dung ngắn gọn chỉ 15 giây, đi thẳng vào vấn đề bằng hình ảnh cận cảnh rõ nét.' }
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
      { id: 1, label: 'Video 1', content: 'Review balo chống trộm, chống nước đi mưa cực an tâm.', analysis: 'Đổ nước trực tiếp lên balo để test độ trượt nước chống thấm và quay cận cảnh các ngăn khóa ẩn an toàn.', editor: 'Bùi Thế Anh', views: '190K views' },
      { id: 2, label: 'Video 2', content: 'Review máy tăm nước cầm tay du lịch siêu nhỏ gọn tiện lợi.', analysis: 'Hướng dẫn cách dùng trực quan trên răng giả và mô tả cảm giác sạch sâu sau khi dùng, thuyết phục tệp khách hàng niềng răng.', editor: 'Đỗ Phương Thảo', views: '230K views' },
      { id: 3, label: 'Video 3', content: 'Cách sửa dây cáp sạc điện thoại bị đứt gãy bằng lò xo bút bi đơn giản.', analysis: 'Mẹo nhỏ cực kỳ hữu ích, nguyên liệu dễ tìm tạo độ tương tác chia sẻ và lưu lại cực kỳ cao từ cộng đồng mạng.', editor: 'Nguyễn Hoàng Long', views: '150K views' },
      { id: 4, label: 'Video 4', content: 'Review chiếc gối massage cổ hồng ngoại giảm đau mỏi vai gáy.', analysis: 'Quay cận cảnh các bi xoay hoạt động và phỏng vấn nhanh cảm nhận của phụ huynh khi được trải nghiệm sản phẩm.', editor: 'Lê Kiều Trang', views: '120K views' }
    ],
    failVideos: [
      { id: 1, label: 'Video 1', content: 'Hướng dẫn lắp ráp chiếc kệ sách gỗ đa tầng tự ráp.', failReason: 'Hướng dẫn quá phức tạp, không hiển thị sơ đồ lắp, góc máy khuất tay người lắp tạo cảm giác ức chế.', editor: 'Bùi Thế Anh', views: '1.5K views' }
    ],
    caseStudies: [
      { id: 1, label: 'Case 1', title: 'Review chiếc máy sấy tóc ion âm bảo vệ tóc khô xơ.', channel: 'Kênh Tóc Đẹp - @beautyhair', views: '1.2M views', takeaway: 'Chỉ số đo nhiệt độ thực tế bằng súng đo nhiệt và hình ảnh tóc suôn mượt óng ả sau sấy kích thích người xem.' }
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
      { id: 1, label: 'Video 1', content: 'Review sạc dự phòng không dây nam châm bám siêu chắc cho điện thoại.', analysis: 'Lắc mạnh điện thoại đang gắn sạc dự phòng không rơi để chứng minh lực hút nam châm từ tính mạnh mẽ của sản phẩm.', editor: 'Trịnh Hùng Cường', views: '95K views' },
      { id: 2, label: 'Video 2', content: 'Review lót chuột cỡ lớn (deskmat) chống trượt in hình tranh thủy mặc.', analysis: 'Góc quay panorama khoe vẻ đẹp nghệ thuật của bàn làm việc sau khi trải lót chuột mới, kích thích thị giác cực mạnh.', editor: 'Nguyễn Mai Chi', views: '110K views' },
      { id: 3, label: 'Video 3', content: 'Trải nghiệm quạt mini đeo cổ không cánh tiện lợi khi đi ngoài đường.', analysis: 'Đo tốc độ gió thổi bay tóc người mẫu khi đi bộ dưới trời nắng nóng, chứng minh tính thực tế và độ mát của quạt.', editor: 'Phạm Hải Đăng', views: '88K views' },
      { id: 4, label: 'Video 4', content: 'Mở hộp kệ đỡ sách chống cận thị và bảo vệ cột sống cho bé học bài.', analysis: 'Mô tả chi tiết góc nghiêng khoa học điều chỉnh được và chia sẻ của bà mẹ bỉm sữa về thói quen học tập của con.', editor: 'Vương Mỹ Linh', views: '75K views' }
    ],
    failVideos: [
      { id: 1, label: 'Video 1', content: 'Review chiếc máy phun sương mini tạo ẩm bàn làm việc.', failReason: 'Độ phun sương quá yếu hầu như không thấy khói nước trên cam, video thiếu sự thuyết phục.', editor: 'Trịnh Hùng Cường', views: '950 views' }
    ],
    caseStudies: [
      { id: 1, label: 'Case 1', title: 'Review sáp vuốt tóc nam giữ nếp cực tốt khi đội mũ bảo hiểm.', channel: 'Kênh Men Style - @menstyle', views: '950K views', takeaway: 'Chạy thử xe máy thực tế đội mũ bảo hiểm 30 phút rồi tháo mũ vuốt lại nếp tóc, độ thuyết phục thực tiễn cực kỳ cao.' }
    ],
    editorPerformance: [
      { editor: 'Trịnh Hùng Cường', totalVideos: 16, winVideos: 2, failVideos: 14, winRate: '12.5%', avgViews: '55K' },
      { editor: 'Nguyễn Mai Chi', totalVideos: 16, winVideos: 2, failVideos: 14, winRate: '12.5%', avgViews: '58K' },
      { editor: 'Phạm Hải Đăng', totalVideos: 16, winVideos: 2, failVideos: 14, winRate: '12.5%', avgViews: '52K' },
      { editor: 'Vương Mỹ Linh', totalVideos: 16, winVideos: 1, failVideos: 15, winRate: '6.3%', avgViews: '45K' }
    ]
  }
};

export const SHEETS = [
  'Báo cáo content',
  '5 Content win của team',
  '5 Content fail của team',
  '5 Case Study hay bên ngoài',
  'Số video content win của cá nhân trong team',
  'Content mới win của cá nhân trong team/trên số video đã làm'
];
