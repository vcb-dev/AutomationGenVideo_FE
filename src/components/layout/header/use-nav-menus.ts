import { useMemo } from "react";
import {
    Activity,
    LayoutDashboard,
    LayoutGrid,
    Layout,
    User,
    FileText,
    ClipboardList,
    CheckSquare,
    Users,
    Search,
    BarChart3,
    Calendar,
    Crown,
    CheckCircle2,
    Send,
    Link2,
    History,
    TrendingUp,
    CalendarDays,
    Bookmark,
    Languages,
    Globe,
    Bot,
} from "lucide-react";
import { NavMenu } from "./types";

export function useNavMenus(
    isManagerOrAdmin: boolean,
    isManagement: boolean,
    options?: { isAdmin?: boolean; isLeader?: boolean; isManager?: boolean },
): NavMenu[] {
    const { isAdmin, isLeader, isManager } = options ?? {};
    return useMemo<NavMenu[]>(
        () => [
            {
                id: "vcb-portal",
                label: "VCB Portal",
                activePathPrefixes: [
                    "/dashboard/manager",
                    "/dashboard/editor-management",
                    "/dashboard/hieu-suat",
                    "/dashboard/admin",
                    "/dashboard/leader",
                ],
                sections: [
                    {
                        section: "TỔNG QUAN",
                        color: "blue",
                        items: [
                            ...(isAdmin
                                ? [
                                      {
                                          label: "Dashboard Admin",
                                          href: "/dashboard/admin",
                                          icon: BarChart3,
                                          description: "Biểu đồ tổng quan toàn hệ thống",
                                      },
                                  ]
                                : []),
                            ...(isLeader
                                ? [
                                      {
                                          label: "Dashboard Leader",
                                          href: "/dashboard/leader",
                                          icon: Crown,
                                          description: "Biểu đồ theo góc nhìn Leader",
                                      },
                                  ]
                                : []),
                            {
                                label: "Hiệu suất",
                                href: "/dashboard/manager/user-activity?tab=performance",
                                icon: Activity,
                                description: "Theo dõi KPI & hiệu suất cá nhân",
                            },
                            ...(isManager
                                ? [
                                      {
                                          label: "Tổng quan nhóm",
                                          href: "/dashboard/manager/user-activity?tab=dashboard",
                                          icon: LayoutDashboard,
                                          description: "Dashboard analytics toàn nhóm",
                                      },
                                      {
                                          label: "Dashboard Tổng",
                                          href: "/dashboard/manager",
                                          icon: LayoutGrid,
                                          description: "Bảng điều khiển quản lý hệ thống",
                                      },
                                  ]
                                : []),
                            {
                                label: "Bảng xếp hạng",
                                href: "/dashboard/manager/user-activity?tab=ranking",
                                icon: Layout,
                                description: "Xếp hạng thành viên trong tháng",
                            },
                            {
                                label: "Tiến độ cá nhân",
                                href: "/dashboard/manager/user-activity?tab=personal",
                                icon: User,
                                description: "Lịch sử & biểu đồ tiến độ cá nhân",
                            },
                        ],
                    },
                    {
                        section: "BÁO CÁO HÀNG NGÀY",
                        color: "violet",
                        items: [
                            ...(isAdmin
                                ? []
                                : [
                                      {
                                          label: "Báo cáo",
                                          href: "",
                                          icon: FileText,
                                          description: "Báo cáo ngày & tháng của Leader / Member",
                                          subPanel: [
                                              {
                                                  label: "Báo cáo ngày",
                                                  href: "/dashboard/manager/user-activity?tab=daily_report&report=daily",
                                                  icon: Calendar,
                                                  description:
                                                      "Báo cáo và đánh giá công việc hàng ngày của Leader và Member.",
                                                  cta: "Chọn loại báo cáo",
                                                  accentColor: "blue" as const,
                                              },
                                              {
                                                  label: "Báo cáo tháng",
                                                  href: "/dashboard/manager/user-activity?tab=daily_report&report=monthly",
                                                  icon: BarChart3,
                                                  description:
                                                      "Tổng hợp dữ liệu hiệu suất, traffic và doanh thu theo chu kỳ tháng.",
                                                  cta: "Xem báo cáo tháng",
                                                  accentColor: "indigo" as const,
                                              },
                                          ],
                                      },
                                  ]),
                            {
                                label: isAdmin ? "Xem báo cáo" : "Checklist",
                                href: "/dashboard/manager/user-activity?tab=daily_checklist",
                                icon: CheckSquare,
                                description: isAdmin
                                    ? "Xem báo cáo, checklist và phê duyệt trong hệ thống"
                                    : "Danh sách công việc cần hoàn thành hôm nay",
                            },
                            {
                                label: isAdmin ? "Duyệt vấn đề & win" : "Vấn đề & Win",
                                href: "/dashboard/manager/user-activity?tab=daily_outstanding",
                                icon: ClipboardList,
                                description: isAdmin
                                    ? "Duyệt và ghi nhận vấn đề nổi bật & thành tích ngày"
                                    : "Ghi nhận vấn đề nổi bật & thành tích ngày",
                            },
                        ],
                    },
                    ...(isManagement
                        ? [
                              {
                                  section: "QUẢN LÝ",
                                  color: "slate" as const,
                                  items: [
                                      {
                                          label: "Quản lý Editors",
                                          href: "/dashboard/editor-management",
                                          icon: Users,
                                          description: "Quản lý danh sách Editor trong hệ thống",
                                      },
                                  ],
                              },
                          ]
                        : []),
                ],
            },
            {
                id: "social-publishing",
                label: "Đăng bài MXH",
                activePathPrefixes: [
                    "/dashboard/social",
                ],
                sections: [
                    {
                        section: "TÀI KHOẢN",
                        color: "blue",
                        items: [
                            {
                                label: "Kết nối tài khoản",
                                href: "/dashboard/social/channels",
                                icon: Link2,
                                description: "Kết nối Facebook, Instagram, TikTok, Threads, YouTube, Zalo",
                            },
                        ],
                    },
                    {
                        section: "ĐĂNG BÀI",
                        color: "indigo",
                        items: [
                            {
                                label: "Soạn & đăng bài",
                                href: "/dashboard/social/compose",
                                icon: Send,
                                description: "Tạo và đăng bài lên nhiều nền tảng",
                            },
                            {
                                label: "Lịch đăng",
                                href: "/dashboard/social/schedule",
                                icon: Calendar,
                                description: "Quản lý bài đăng theo lịch tự động",
                            },
                            {
                                label: "Lịch tháng",
                                href: "/dashboard/social/calendar",
                                icon: CalendarDays,
                                description: "Xem bài đặt lịch dạng calendar theo tháng",
                            },
                        ],
                    },
                    {
                        section: "THỐNG KÊ",
                        color: "slate",
                        items: [
                            {
                                label: "Lịch sử đăng",
                                href: "/dashboard/social/history",
                                icon: History,
                                description: "Theo dõi toàn bộ lịch sử bài đã đăng",
                            },
                            {
                                label: "Thống kê",
                                href: "/dashboard/social/stats",
                                icon: TrendingUp,
                                description: "Biểu đồ & phân tích hiệu suất đăng bài",
                            },
                        ],
                    },
                ],
            },
            {
                id: "social-discovery",
                label: "Khám phá Video",
                activePathPrefixes: [
                    "/dashboard/facebook",
                    "/dashboard/instagram",
                    "/dashboard/tiktok",
                    "/dashboard/douyin",
                    "/dashboard/xiaohongshu",
                    "/dashboard/youtube",
                    "/dashboard/search-video",
                    "/dashboard/channel-analysis",
                    "/dashboard/video-library",
                    "/dashboard/content/generate",
                ],
                sections: [
                    {
                        section: "PHÂN TÍCH",
                        color: "blue",
                        items: [
                            {
                                label: "Channels",
                                href: "/dashboard/facebook/channels",
                                icon: Users,
                                description: "Quản lý kênh mạng xã hội",
                            },
                            {
                                label: "Phân tích kênh",
                                href: "/dashboard/channel-analysis",
                                icon: BarChart3,
                                description: "Phân tích sâu dữ liệu kênh",
                            },
                        ],
                    },
                    ...(isManagement
                        ? [
                              {
                                  section: "KHÁM PHÁ",
                                  color: "slate" as const,
                                  items: [
                                      {
                                          label: "Tìm kiếm Video (Hub)",
                                          href: "/dashboard/search-video",
                                          icon: Search,
                                          description: "Tìm kiếm video trên toàn nền tảng",
                                      },
                                  ],
                              },
                          ]
                        : []),
                    {
                        section: "BỘ SƯU TẬP",
                        color: "violet" as const,
                        items: [
                            {
                                label: "Bộ sưu tập",
                                href: "/dashboard/video-library",
                                icon: Bookmark,
                                description: "Video hay do Leader & Manager tuyển chọn cho team",
                            },
                            {
                                label: "Dịch Content",
                                href: "/dashboard/content/generate?mode=translate-only",
                                icon: Languages,
                                description: "Dịch content có sẵn và recheck bằng bảng 3 cột",
                            },
                        ],
                    },
                ],
            },
            {
                id: "ai",
                label: "AI",
                activePathPrefixes: ["/dashboard/ai"],
                sections: [
                    {
                        section: "TRỢ LÝ AI",
                        color: "violet" as const,
                        items: [
                            {
                                label: "VCB Assistant",
                                href: "/dashboard/ai/assistant",
                                icon: Bot,
                                description: "Trợ lý AI thông minh hỗ trợ công việc hàng ngày",
                            },
                        ],
                    },
                ],
            },
        ],
        [isManagerOrAdmin, isManagement, isAdmin, isLeader, isManager],
    );
}
