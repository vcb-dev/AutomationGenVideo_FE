import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ScrapedVideo {
    id: number;
    platform: string;
    video_id: string;
    title: string;
    description: string;
    author_username: string;
    author_name: string;
    likes_count: number;
    views_count: number;
    comments_count: number;
    shares_count: number;
    video_url: string;
    download_url: string;
    thumbnail_url: string;
    published_at: string;
    hashtags: string[];
    raw_data: any;
}

interface TikTokSearchState {
    // Search inputs
    searchTerm: string;
    searchType: 'keyword' | 'hashtag';
    maxPosts: number;

    // Results
    videos: ScrapedVideo[];
    currentPage: number;
    normalizedQuery: string | null;
    error: string | null;
    loading: boolean;
    isFetchingMore: boolean;
    taskId: string | null;
    searchSessionId: string | null;

    // Actions
    setSearchTerm: (term: string) => void;
    setSearchType: (type: 'keyword' | 'hashtag') => void;
    setMaxPosts: (max: number) => void;
    setVideos: (videos: ScrapedVideo[]) => void;
    setCurrentPage: (page: number) => void;
    setNormalizedQuery: (query: string | null) => void;
    setError: (error: string | null) => void;
    setLoading: (loading: boolean) => void;
    setIsFetchingMore: (isFetchingMore: boolean) => void;
    setTaskId: (taskId: string | null) => void;
    setSearchSessionId: (id: string | null) => void;
    reset: () => void;
}

export const useTikTokSearchStore = create<TikTokSearchState>()(
    persist(
        (set) => ({
            // Default state
            searchTerm: '',
            searchType: 'keyword',
            maxPosts: 30,
            videos: [],
            currentPage: 1,
            normalizedQuery: null,
            error: null,
            loading: false,
            isFetchingMore: false,
            taskId: null,
            searchSessionId: null,

            // Actions
            setSearchTerm: (term) => set({ searchTerm: term }),
            setSearchType: (type) => set({ searchType: type }),
            setMaxPosts: (max) => set({ maxPosts: max }),
            setVideos: (videos) => set({ videos }),
            setCurrentPage: (page) => set({ currentPage: page }),
            setNormalizedQuery: (query) => set({ normalizedQuery: query }),
            setError: (error) => set({ error }),
            setLoading: (loading) => set({ loading }),
            setIsFetchingMore: (isFetchingMore) => set({ isFetchingMore }),
            setTaskId: (taskId) => set({ taskId }),
            setSearchSessionId: (id) => set({ searchSessionId: id }),
            reset: () => set({
                videos: [],
                currentPage: 1,
                normalizedQuery: null,
                error: null,
                maxPosts: 30,
                loading: false,
                isFetchingMore: false,
                taskId: null,
                searchSessionId: null,
            }),
        }),
        {
            name: 'tiktok-search-storage',
            storage: createJSONStorage(() => sessionStorage), // sessionStorage: xóa khi đóng tab, không persist vĩnh viễn
            partialize: (state) => ({
                searchTerm: state.searchTerm,
                searchType: state.searchType,
                videos: state.videos,
                currentPage: state.currentPage,
                normalizedQuery: state.normalizedQuery,
                maxPosts: state.maxPosts,
                loading: state.loading,
                isFetchingMore: state.isFetchingMore,
                taskId: state.taskId,
                searchSessionId: state.searchSessionId,
            }),
        }
    )
);
