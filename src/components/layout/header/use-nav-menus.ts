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
import { useLang } from "@/contexts/SocialLanguageContext";

export function useNavMenus(
    isManagerOrAdmin: boolean,
    isManagement: boolean,
    options?: { isAdmin?: boolean; isLeader?: boolean; isManager?: boolean },
): NavMenu[] {
    const { isAdmin, isLeader, isManager } = options ?? {};
    const { t } = useLang();
    const n = t.nav;
    return useMemo<NavMenu[]>(
        () => [
            {
                id: "vcb-portal",
                label: "VCB Portal",
                activePathPrefixes: [
                    "/dashboard/manager",
                    "/dashboard/hr-management",
                    "/dashboard/hieu-suat",
                    "/dashboard/admin",
                    "/dashboard/leader",
                    "/dashboard/channels",
                ],
                sections: [
                    {
                        section: n.secOverview,
                        color: "blue",
                        items: [
                            ...(isAdmin
                                ? [
                                    {
                                        label: n.dashboardAdmin,
                                        href: "/dashboard/admin",
                                        icon: BarChart3,
                                        description: n.dashboardAdminDesc,
                                    },
                                ]
                                : []),
                            ...(isLeader
                                ? [
                                    {
                                        label: n.dashboardLeader,
                                        href: "/dashboard/leader",
                                        icon: Crown,
                                        description: n.dashboardLeaderDesc,
                                    },
                                ]
                                : []),
                            {
                                label: n.performance,
                                href: "/dashboard/manager/user-activity?tab=performance",
                                icon: Activity,
                                description: n.performanceDesc,
                            },
                            ...(isManager
                                ? [
                                    {
                                        label: n.teamOverview,
                                        href: "/dashboard/manager/user-activity?tab=dashboard",
                                        icon: LayoutDashboard,
                                        description: n.teamOverviewDesc,
                                    },
                                    {
                                        label: n.dashboardMain,
                                        href: "/dashboard/manager",
                                        icon: LayoutGrid,
                                        description: n.dashboardMainDesc,
                                    },
                                ]
                                : []),
                            {
                                label: n.ranking,
                                href: "/dashboard/manager/user-activity?tab=ranking",
                                icon: Layout,
                                description: n.rankingDesc,
                            },
                            {
                                label: n.personalProgress,
                                href: "/dashboard/manager/user-activity?tab=personal",
                                icon: User,
                                description: n.personalProgressDesc,
                            },
                        ],
                    },
                    {
                        section: n.secDailyReport,
                        color: "violet",
                        items: [
                            ...(isAdmin
                                ? []
                                : [
                                    {
                                        label: n.report,
                                        href: "",
                                        icon: FileText,
                                        description: n.reportDesc,
                                        subPanel: [
                                            {
                                                label: n.reportTraffic,
                                                href: "/dashboard/manager/user-activity?tab=daily_report&report=daily&type=traffic",
                                                icon: BarChart3,
                                                description: n.reportTrafficDesc,
                                                cta: n.reportTrafficCta,
                                                accentColor: "blue" as const,
                                            },
                                            {
                                                label: n.todayTasks,
                                                href: "/dashboard/manager/user-activity?tab=daily_report&report=daily&type=tasks",
                                                icon: ClipboardList,
                                                description: n.todayTasksDesc,
                                                cta: n.todayTasksCta,
                                                accentColor: "blue" as const,
                                            },
                                            {
                                                label: n.monthlyReport,
                                                href: "/dashboard/manager/user-activity?tab=daily_report&report=monthly",
                                                icon: CalendarDays,
                                                description: n.monthlyReportDesc,
                                                cta: n.monthlyReportCta,
                                                accentColor: "indigo" as const,
                                            },
                                        ],
                                    },
                                ]),
                            {
                                label: isAdmin ? n.checklistView : n.checklist,
                                href: "/dashboard/manager/user-activity?tab=daily_checklist",
                                icon: CheckSquare,
                                description: isAdmin ? n.checklistViewDesc : n.checklistDesc,
                            },
                            {
                                label: isAdmin ? n.outstandingApprove : n.outstanding,
                                href: "/dashboard/manager/user-activity?tab=daily_outstanding",
                                icon: ClipboardList,
                                description: isAdmin ? n.outstandingApproveDesc : n.outstandingDesc,
                            },
                        ],
                    },
                    {
                        section: n.secChannel,
                        color: "slate" as const,
                        items: [
                            {
                                label: n.myChannels,
                                href: "/dashboard/channel-team/my",
                                icon: Radio,
                                description: n.myChannelsDesc,
                            },
                            ...(isManagement
                                ? [
                                    {
                                        label: n.teamChannels,
                                        href: "/dashboard/channel-team",
                                        icon: BookOpen,
                                        description: n.teamChannelsDesc,
                                    },
                                ]
                                : []),
                        ],
                    },
                    ...(isManagement
                        ? [
                            {
                                section: n.secManagement,
                                color: "slate" as const,
                                items: [
                                    {
                                        label: n.hr,
                                        href: "/dashboard/hr-management",
                                        icon: UserCog,
                                        description: n.hrDesc,
                                    },
                                ],
                            },
                        ]
                        : []),
                ],
            },
            {
                id: "social-publishing",
                label: n.menuSocial,
                activePathPrefixes: [
                    "/dashboard/social",
                ],
                sections: [
                    {
                        section: n.secAccount,
                        color: "blue",
                        items: [
                            {
                                label: n.connectAccounts,
                                href: "/dashboard/social/channels",
                                icon: Link2,
                                description: n.connectAccountsDesc,
                            },
                        ],
                    },
                    {
                        section: n.secPublish,
                        color: "indigo",
                        items: [
                            {
                                label: n.compose,
                                href: "/dashboard/social/compose",
                                icon: Send,
                                description: n.composeDesc,
                            },
                            {
                                label: n.schedule,
                                href: "/dashboard/social/schedule",
                                icon: Calendar,
                                description: n.scheduleDesc,
                            },
                            {
                                label: n.monthCalendar,
                                href: "/dashboard/social/calendar",
                                icon: CalendarDays,
                                description: n.monthCalendarDesc,
                            },
                        ],
                    },
                    {
                        section: n.secStats,
                        color: "slate",
                        items: [
                            {
                                label: n.postHistory,
                                href: "/dashboard/social/history",
                                icon: History,
                                description: n.postHistoryDesc,
                            },
                            {
                                label: n.socialStats,
                                href: "/dashboard/social/stats",
                                icon: TrendingUp,
                                description: n.socialStatsDesc,
                            },
                        ],
                    },
                ],
            },
            {
                id: "social-discovery",
                label: n.menuDiscovery,
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
                        section: n.secAnalysis,
                        color: "blue",
                        items: [
                            {
                                label: n.channels,
                                href: "/dashboard/facebook/channels",
                                icon: Users,
                                description: n.channelsDesc,
                            },
                            {
                                label: n.channelAnalysis,
                                href: "/dashboard/channel-analysis",
                                icon: BarChart3,
                                description: n.channelAnalysisDesc,
                            },
                            {
                                label: "Kênh nội bộ",       // ← thêm
                                href: "/dashboard/internalChannels",
                                icon: BookOpen,
                                description: "Danh sách kênh MXH của team",
                            },
                            {
                                label: "Khám phá kênh",  
                                href: "/dashboard/externalChannels",
                                icon: BookOpen,
                                description: "Khám phá kênh MXH bên ngoài",
                            },
                        ],
                    },
                    ...(isManagement
                        ? [
                            {
                                section: n.secDiscover,
                                color: "slate" as const,
                                items: [
                                    {
                                        label: n.searchHub,
                                        href: "/dashboard/search-video",
                                        icon: Search,
                                        description: n.searchHubDesc,
                                    },
                                ],
                            },
                        ]
                        : []),
                    {
                        section: n.secCollections,
                        color: "violet" as const,
                        items: [
                            {
                                label: n.collections,
                                href: "/dashboard/video-library",
                                icon: Bookmark,
                                description: n.collectionsDesc,
                            },
                            {
                                label: n.translateContent,
                                href: "/dashboard/content/generate?mode=translate-only",
                                icon: Languages,
                                description: n.translateContentDesc,
                            },
                        ],
                    },
                ],
            },
            {
                id: "task-auto",
                label: n.menuTasks,
                activePathPrefixes: ["/dashboard/task-auto"],
                sections: [
                    {
                        section: n.secTasks,
                        color: "indigo",
                        items: [
                            {
                                label: n.taskOverview,
                                href: "/dashboard/task-auto",
                                icon: LayoutDashboard,
                                description: n.taskOverviewDesc,
                            },
                            {
                                label: n.taskList,
                                href: "/dashboard/task-auto/tasks",
                                icon: ClipboardList,
                                description: n.taskListDesc,
                            },
                        ],
                    },
                    {
                        section: n.secTeamCatalog,
                        color: "blue",
                        items: [
                            {
                                label: n.teams,
                                href: "/dashboard/task-auto/teams",
                                icon: Users,
                                description: n.teamsDesc,
                            },
                            {
                                label: n.catalog,
                                href: "/dashboard/task-auto/catalog",
                                icon: FolderOpen,
                                description: n.catalogDesc,
                            },
                        ],
                    },
                    {
                        section: n.secPersonal,
                        color: "violet",
                        items: [
                            {
                                label: n.myCatalog,
                                href: "/dashboard/task-auto/my-catalog",
                                icon: User,
                                description: n.myCatalogDesc,
                            },
                            {
                                label: n.kpi,
                                href: "/dashboard/task-auto/kpi",
                                icon: BarChart3,
                                description: n.kpiDesc,
                            },
                            ...(isManagerOrAdmin ? [{
                                label: n.taskSettings,
                                href: "/dashboard/task-auto/settings",
                                icon: Zap,
                                description: n.taskSettingsDesc,
                            }] : []),
                        ],
                    },
                ],
            },
            {
                id: "tien-ich",
                label: n.menuUtilities,
                activePathPrefixes: [
                    "/dashboard/ai/clone-voice",
                    "/dashboard/ai/overview",
                ] as string[],
                sections: [
                    {
                        section: n.secAiVoice,
                        color: "violet" as const,
                        items: [
                            {
                                label: n.aiOverview,
                                href: "/dashboard/ai/overview",
                                icon: LayoutDashboard,
                                description: n.aiOverviewDesc,
                            },
                            {
                                label: n.cloneVoice,
                                href: "/dashboard/ai/clone-voice",
                                icon: AudioLines,
                                description: n.cloneVoiceDesc,
                            },
                        ],
                    },
                ],
            },
        ],
        [isManagerOrAdmin, isManagement, isAdmin, isLeader, isManager, n],
    );
}
