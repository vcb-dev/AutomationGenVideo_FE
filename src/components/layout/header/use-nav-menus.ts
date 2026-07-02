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
    UserCog,
    Search,
    BarChart3,
    Calendar,
    Crown,
    Send,
    Link2,
    History,
    TrendingUp,
    CalendarDays,
    Bookmark,
    Languages,
    BookOpen,
    Zap,
    Package,
    Radio,
    FolderOpen,
    Mic,
    ExternalLink,
    Wrench,
    AudioLines,
    Wand2,
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
                    "/dashboard/hr-management",
                    "/dashboard/hieu-suat",
                    "/dashboard/admin",
                    "/dashboard/leader",
                    "/dashboard/channels",
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
                                                label: "Báo cáo traffic",
                                                href: "/dashboard/manager/user-activity?tab=daily_report&report=daily&type=traffic",
                                                icon: BarChart3,
                                                description: "Thống kê lượt xem, click, nguồn traffic theo ngày",
                                                cta: "Xem báo cáo",
                                                accentColor: "blue" as const,
                                            },
                                            {
                                                label: "Công việc hôm nay",
                                                href: "/dashboard/manager/user-activity?tab=daily_report&report=daily&type=tasks",
                                                icon: ClipboardList,
                                                description: "Danh sách task & tiến độ trong ngày của member",
                                                cta: "Xem công việc",
                                                accentColor: "blue" as const,
                                            },
                                            {
                                                label: "Báo cáo tháng",
                                                href: "/dashboard/manager/user-activity?tab=daily_report&report=monthly",
                                                icon: CalendarDays,
                                                description: "Tổng hợp hiệu suất, traffic và doanh thu theo tháng",
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
                    {
                        section: "KÊNH",
                        color: "slate" as const,
                        items: [
                            {
                                label: "Kênh của tôi",
                                href: "/dashboard/channel-team/my",
                                icon: Radio,
                                description: "Danh sách kênh MXH của bạn",
                            },
                            ...(isManagement
                                ? [
                                    {
                                        label: "Quản lý kênh nhóm",
                                        href: "/dashboard/channel-team",
                                        icon: BookOpen,
                                        description: "Danh sách kênh MXH của toàn team",
                                    },
                                ]
                                : []),
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
                                    {
                                        label: "Quản lý nhân sự",
                                        href: "/dashboard/hr-management",
                                        icon: UserCog,
                                        description: "Thêm, sửa, xóa nhân sự trong team",
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
                    "/dashboard/ai",
                    "/dashboard/search-video",
                    "/dashboard/channel-analysis",
                    "/dashboard/video-library",
                    "/dashboard/content/generate",
                    "/dashboard/channels",
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
                id: "task-auto",
                label: "Nhiệm vụ",
                activePathPrefixes: ["/dashboard/task-auto"],
                sections: [
                    {
                        section: "NHIỆM VỤ",
                        color: "indigo",
                        items: [
                            {
                                label: "Tổng quan",
                                href: "/dashboard/task-auto",
                                icon: LayoutDashboard,
                                description: "Dashboard tổng quan hệ thống nhiệm vụ",
                            },
                            {
                                label: "Danh sách nhiệm vụ",
                                href: "/dashboard/task-auto/tasks",
                                icon: ClipboardList,
                                description: "Xem và quản lý toàn bộ nhiệm vụ",
                            },
                        ],
                    },
                    {
                        section: "ĐỘI NHÓM & DANH MỤC",
                        color: "blue",
                        items: [
                            {
                                label: "Đội nhóm",
                                href: "/dashboard/task-auto/teams",
                                icon: Users,
                                description: "Quản lý team, kho sản phẩm & source của team",
                            },
                            {
                                label: "Danh mục tổng",
                                href: "/dashboard/task-auto/catalog",
                                icon: FolderOpen,
                                description: "Kho sản phẩm, content, source toàn hệ thống",
                            },
                        ],
                    },
                    {
                        section: "CÁ NHÂN",
                        color: "violet",
                        items: [
                            {
                                label: "Kho cá nhân",
                                href: "/dashboard/task-auto/my-catalog",
                                icon: User,
                                description: "Sản phẩm, content, source của bạn",
                            },
                            {
                                label: "KPI",
                                href: "/dashboard/task-auto/kpi",
                                icon: BarChart3,
                                description: "Theo dõi chỉ số KPI cá nhân",
                            },
                            ...(isManagerOrAdmin ? [{
                                label: "Cài đặt",
                                href: "/dashboard/task-auto/settings",
                                icon: Zap,
                                description: "Cấu hình tự động hóa & phân công nhiệm vụ",
                            }] : []),
                        ],
                    },
                ],
            },
            {
                id: "tien-ich",
                label: "Tiện ích",
                activePathPrefixes: [
                    "/dashboard/ai/clone-voice",
                    "/dashboard/ai/overview",
                ] as string[],
                sections: [
                    {
                        section: "GIỌNG NÓI AI",
                        color: "violet" as const,
                        items: [
                            {
                                label: "Tổng quan",
                                href: "/dashboard/ai/overview",
                                icon: LayoutDashboard,
                                description: "Xem báo cáo chi tiêu, token tiêu thụ & số lượng voice",
                            },
                            {
                                label: "Clone Voice",
                                href: "/dashboard/ai/clone-voice",
                                icon: AudioLines,
                                description: "Clone & tạo giọng nói AI từ văn bản, dịch kịch bản",
                            },
                        ],
                    },
                ],
            },
        ],
        [isManagerOrAdmin, isManagement, isAdmin, isLeader, isManager],
    );
}
