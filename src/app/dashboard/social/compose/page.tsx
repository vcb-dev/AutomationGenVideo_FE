'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, RefreshCw, Type, Image as ImageIcon, Smartphone, Monitor,
  MapPin, Globe, Smile, MessageCircle, Share2,
  MoreHorizontal, ChevronDown, Save, Send, Clock, List, AlertCircle, ThumbsUp, X, Calendar as CalendarIcon,
  Loader2, Sparkles, Layers, Hash, Film,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { socialApi, SocialAccount, SocialPlatform, PLATFORM_META } from '@/lib/api/social';
import { useSocialAccounts, useInvalidateAccounts } from '@/hooks/useSocialAccounts';
import PublishProgressModal from './PublishProgressModal';
import HashtagPanel from './HashtagPanel';
import MediaLibraryModal from './MediaLibraryModal';
import PlatformPreview from './PlatformPreview';
import TemplateManager from './TemplateManager';
import VideoFramePicker from './VideoFramePicker';
import { useTaskStore } from '@/store/taskStore';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function ComposePage() {
  const isDraggingRef   = useRef(false);
  const dragStartXRef   = useRef(0);
  const dragStartWRef   = useRef(0);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [mobileTab, setMobileTab] = useState<'CHANNELS' | 'EDITOR' | 'PREVIEW'>('EDITOR');

  const onDragHandleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current  = true;
    dragStartXRef.current  = e.clientX;
    dragStartWRef.current  = sidebarWidth;
    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (mv: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = mv.clientX - dragStartXRef.current;
      setSidebarWidth(Math.min(480, Math.max(200, dragStartWRef.current + delta)));
    };
    const onMouseUp = () => {
      isDraggingRef.current          = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
  };
  
  // Core Data & UI State
  const { data: accounts = [] } = useSocialAccounts();
  const invalidateAccounts = useInvalidateAccounts();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [postMode, setPostMode] = useState<'text' | 'image' | 'video_vertical' | 'video_horizontal'>('text');
  const [activeTab, setActiveTab] = useState<'publish' | 'schedule' | 'queue' | 'draft'>('publish');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule' | 'queue'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [message, setMessage] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('FACEBOOK');
  const [mounted, setMounted] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [perPlatformMode, setPerPlatformMode] = useState(false);
  const [topTab, setTopTab] = useState<'publish' | 'customize'>('publish');
  const [thumbUrl, setThumbUrl] = useState<string>('');
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [libraryMode, setLibraryMode] = useState<'media' | 'thumb'>('media');
  // Map url → thumbnail_url cho các media chọn từ thư viện (để hiện đúng thumbnail Drive)
  const [mediaThumbs, setMediaThumbs] = useState<Record<string, string>>({});
  // Map url → library item id (để gọi API previewFrame/setThumbnail cho Drive video)
  const [mediaLibraryIds, setMediaLibraryIds] = useState<Record<string, string>>({});
  const [perPlatformMessages, setPerPlatformMessages] = useState<Partial<Record<SocialPlatform, string>>>({});

  // --- PORTED LOGIC FROM VCB-TOOL ---
  
  // Hashtag State
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['a1', 'a2', 'a3', 'a4', 'a5'];
    const saved = localStorage.getItem('custom_hashtags');
    return saved ? JSON.parse(saved) : ['a1', 'a2', 'a3', 'a4', 'a5'];
  });
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');

  // Channel Groups State
  const [channelGroups, setChannelGroups] = useState<{id: string, name: string, channels: string[], hashtags?: string[]}[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('composer_channel_groups');
    return saved ? JSON.parse(saved) : [];
  });

  // Advanced Options
  const [privacy, setPrivacy] = useState('EVERYONE');
  const [publishProgress, setPublishProgress] = useState<{
    show: boolean;
    phase: 'idle' | 'uploading' | 'publishing' | 'done';
    uploadPct: number;
    channels: { id: string; name: string; platform: string; status: 'pending' | 'posting' | 'success' | 'fail'; error?: string; queuePosition?: number | null; postUrl?: string }[];
  }>({
    show: false,
    phase: 'idle',
    uploadPct: 0,
    channels: []
  });

  const { addTask, updateTask, tasks } = useTaskStore();

  // Limits
  const PLATFORM_LIMITS: Record<string, number> = { 
    THREADS: 500, 
    FACEBOOK: 63206, 
    INSTAGRAM: 2200, 
    TIKTOK: 2200, 
    YOUTUBE: 5000 
  };

  const PLATFORM_SUPPORT = {
    FACEBOOK: { text: true,  image: true,  video_vertical: true, video_horizontal: true },
    THREADS:  { text: true,  image: true,  video_vertical: true, video_horizontal: true },
    INSTAGRAM:{ text: false, image: true,  video_vertical: true, video_horizontal: false },
    TIKTOK:   { text: false, image: false, video_vertical: true, video_horizontal: false },
    YOUTUBE:  { text: false, image: false, video_vertical: true, video_horizontal: true },
    ZALO:     { text: true,  image: false, video_vertical: true, video_horizontal: true },
  };

  // --- ACTIONS ---

  const addHashtag = (raw: string) => {
    const tag = raw.trim().replace(/^#+/, '');
    if (!tag) return;
    if (!hashtags.includes(tag)) setHashtags(prev => [...prev, tag]);
    setHashtagInput('');
  };

  const removeHashtag = (tag: string) => setHashtags(prev => prev.filter(h => h !== tag));

  const addSuggestedHashtag = () => {
    const tag = window.prompt("Nhập hashtag mới muốn thêm vào gợi ý (không cần ghi dấu #):");
    if (tag && tag.trim()) {
      const cleanTag = tag.trim().replace(/^#+/, '');
      if (!suggestedHashtags.includes(cleanTag)) {
        const newList = [...suggestedHashtags, cleanTag];
        setSuggestedHashtags(newList);
        localStorage.setItem('custom_hashtags', JSON.stringify(newList));
      }
    }
  };

  const removeSuggestedHashtag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc muốn xóa gợi ý #${tag} không?`)) {
      const newList = suggestedHashtags.filter(t => t !== tag);
      setSuggestedHashtags(newList);
      localStorage.setItem('custom_hashtags', JSON.stringify(newList));
    }
  };

  const saveCurrentSelectionAsGroup = () => {
    if (selectedAccountIds.length === 0) return toast.error('Vui lòng chọn ít nhất 1 kênh');
    const name = window.prompt('Nhập tên nhóm kênh (VD: Nhóm Vàng bạc, Kênh TikTok...):');
    if (!name || !name.trim()) return;
    const newGroup = {
      id: Date.now().toString(),
      name: name.trim(),
      channels: [...selectedAccountIds],
      hashtags: [...hashtags]
    };
    const updated = [...channelGroups, newGroup];
    setChannelGroups(updated);
    localStorage.setItem('composer_channel_groups', JSON.stringify(updated));
    toast.success('Đã lưu nhóm kênh');
  };

  const deleteChannelGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Xóa nhóm kênh này?')) {
      const updated = channelGroups.filter(g => g.id !== id);
      setChannelGroups(updated);
      localStorage.setItem('composer_channel_groups', JSON.stringify(updated));
    }
  };


  // --- EFFECTS ---

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    now.setHours(now.getHours() + 1);
    setScheduledAt(now.toISOString().slice(0, 16));

    // Đọc prefill data từ Repost (history page)
    const prefill = localStorage.getItem('compose_prefill');
    if (prefill) {
      try {
        const data = JSON.parse(prefill);
        if (data.message) setMessage(data.message);
        if (data.mediaUrls?.length) {
          setMediaUrls(data.mediaUrls);
          setPostMode('image');
        }
        localStorage.removeItem('compose_prefill');
      } catch {}
    }
  }, []);

  // Filter accounts based on SEARCH and POST MODE
  const filteredAccounts = accounts.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const platformKey = (a.platform || '').toUpperCase();
    const isSupported = (PLATFORM_SUPPORT as any)[platformKey]?.[postMode] ?? true;
    return matchesSearch && isSupported;
  });

  // Group accounts logically for display
  const platformGroups = filteredAccounts.reduce((acc: Record<string, SocialAccount[]>, a) => {
    const platformKey = (a.platform || '').toUpperCase();
    if (!acc[platformKey]) acc[platformKey] = [];
    acc[platformKey].push(a);
    return acc;
  }, {} as Record<string, SocialAccount[]>);

  // Sort groups: Parents first, then children
  Object.keys(platformGroups).forEach(key => {
    platformGroups[key].sort((a, b) => {
      if (!a.parent_id && b.parent_id) return -1;
      if (a.parent_id && !b.parent_id) return 1;
      return a.name.localeCompare(b.name);
    });
  });

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleHashtagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      addHashtag(hashtagInput);
    }
  };

  const handleAiOptimize = async () => {
    if (!message.trim()) return toast.error('Vui lòng nhập nội dung trước');
    setIsAiProcessing(true);
    try {
      const firstPlatform = selectedAccountIds.length > 0
        ? accounts.find(a => selectedAccountIds.includes(a.id))?.platform as SocialPlatform | undefined
        : undefined;
      const { hashtags: suggestedTags, source } = await socialApi.hashtag.suggest(message, firstPlatform);
      const currentTags = hashtags;
      const newTags = suggestedTags.map(h => h.replace(/^#+/, '').trim()).filter(h => h && !currentTags.includes(h));
      setHashtags(prev => Array.from(new Set([...prev, ...newTags])).slice(0, 30));
      toast.success(`AI gợi ý ${suggestedTags.length} hashtag (nguồn: ${source === 'ai' ? '🤖 AI' : '🔑 Keyword'})`, { duration: 3000 });
    } catch {
      toast.error('Không lấy được gợi ý hashtag, thử lại sau');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Hàng chờ: jobId[] sau khi enqueue, null = không có gì đang poll
  const [activeJobIds,   setActiveJobIds]   = useState<string[] | null>(null);
  // Map jobId → channelId (accountId) để ghép kết quả poll về UI
  const [jobChannelMap,  setJobChannelMap]  = useState<Record<string, string>>({});
  // Ref luôn giữ giá trị mới nhất — tránh stale closure trong poll effect
  const jobChannelMapRef = useRef<Record<string, string>>({});
  jobChannelMapRef.current = jobChannelMap;

  // Đồng hồ thời gian thực
  const [publishStartedAt, setPublishStartedAt] = useState<number | null>(null);
  const [elapsedSeconds,   setElapsedSeconds]   = useState(0);

  // Fake per-channel progress % khi đang posting (0 → ~85%, nhảy lên 100% khi xong)
  const [postingPcts, setPostingPcts] = useState<Record<string, number>>({});

  // Interval chạy liên tục — mỗi 300ms tăng dần % cho các channel đang 'posting'
  useEffect(() => {
    const interval = setInterval(() => {
      setPostingPcts(prev => {
        const next = { ...prev };
        let changed = false;
        publishProgress.channels.forEach(ch => {
          if (ch.status === 'posting') {
            const cur = prev[ch.id] ?? 0;
            if (cur < 85) {
              // Logarithmic slowdown: nhanh lúc đầu, chậm dần khi tiếp cận 85%
              next[ch.id] = Math.min(85, cur + Math.max(0.4, (85 - cur) / 18));
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });
    }, 300);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishProgress.channels]);

  // Khi channel xong (success / fail) → đặt lên 100%
  useEffect(() => {
    const done = publishProgress.channels.filter(c => c.status === 'success' || c.status === 'fail');
    if (done.length === 0) return;
    setPostingPcts(prev => {
      const next = { ...prev };
      done.forEach(c => { next[c.id] = 100; });
      return next;
    });
  }, [publishProgress.channels]);

  // Đồng hồ: tick mỗi giây khi đang publish, dừng khi phase === 'done'
  useEffect(() => {
    if (!publishStartedAt || publishProgress.phase === 'done') {
      setElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - publishStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [publishStartedAt, publishProgress.phase]);

  // Poll queue status mỗi 3 giây khi có activeJobIds
  useEffect(() => {
    if (!activeJobIds || activeJobIds.length === 0) return;

    const handleJobs = (jobs: any[]) => {
      setPublishProgress(prev => {
        const newChannels = prev.channels.map(ch => {
          const jobId = Object.entries(jobChannelMap).find(([, cid]) => cid === ch.id)?.[0];
          if (!jobId) return ch;
          const job = jobs.find((j: any) => j.id === jobId);
          if (!job) return ch;
          if (job.status === 'COMPLETED') {
            const r = job.result as Record<string, unknown> | null | undefined;
            const postUrl = (typeof r?.url === 'string' ? r.url : typeof r?.videoId === 'string' ? `https://youtube.com/watch?v=${r.videoId}` : undefined);
            return { ...ch, status: 'success' as const, queuePosition: null, postUrl };
          }
          if (job.status === 'FAILED')    return { ...ch, status: 'fail' as const, error: job.error_msg ?? undefined, queuePosition: null };
          const isProcessing = job.queuePosition === null;
          return { ...ch, status: isProcessing ? 'posting' as const : 'pending' as const, queuePosition: job.queuePosition };
        });
        return { ...prev, channels: newChannels };
      });

      const allDone = jobs.every((j: any) => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(j.status));
      if (allDone) {
        setActiveJobIds(null);
        setPublishing(false);
        setPublishProgress(prev => ({ ...prev, phase: 'done' }));
        if (jobs.every((j: any) => j.status === 'COMPLETED')) {
          toast.success('Đã đăng bài thành công!');
          setMessage(''); setMediaUrls([]); setHashtags([]); setSelectedAccountIds([]);
        } else {
          toast.error('Một số kênh đăng bài thất bại');
        }
      }
    };

    const poll = async () => {
      try {
        const { jobs } = await socialApi.queue.pollStatus(activeJobIds);

        setPublishProgress(prev => {
          const newChannels = prev.channels.map(ch => {
            const jobId = Object.entries(jobChannelMapRef.current).find(([, cid]) => cid === ch.id)?.[0];
            if (!jobId) return ch;
            const job = jobs.find(j => j.id === jobId);
            if (!job) return ch;
            if (job.status === 'COMPLETED') {
            const r = job.result as Record<string, unknown> | null | undefined;
            const postUrl = (typeof r?.url === 'string' ? r.url : typeof r?.videoId === 'string' ? `https://youtube.com/watch?v=${r.videoId}` : undefined);
            return { ...ch, status: 'success' as const, queuePosition: null, postUrl };
          }
            if (job.status === 'FAILED')    return { ...ch, status: 'fail' as const, error: job.error_msg ?? undefined, queuePosition: null };
            const isProcessing = job.queuePosition === null;
            return { ...ch, status: isProcessing ? 'posting' as const : 'pending' as const, queuePosition: job.queuePosition };
          });
          return { ...prev, channels: newChannels };
        });

        const allDone = jobs.every(j => j.status === 'COMPLETED' || j.status === 'FAILED' || j.status === 'CANCELLED');

        // Cập nhật task chạy ngầm
        const mainTaskId = `post-${activeJobIds[0]}`;
        const completedCount = jobs.filter(j => j.status === 'COMPLETED' || j.status === 'FAILED').length;
        const totalCount = jobs.length;
        const totalProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        updateTask(mainTaskId, {
          progress: totalProgress,
          status: allDone ? (jobs.some(j => j.status === 'FAILED') ? 'error' : 'success') : 'processing',
          message: `Đã xong ${completedCount}/${totalCount} kênh`,
        });

        if (allDone) {
          setActiveJobIds(null);
          setPublishing(false);
          setPublishProgress(prev => ({ ...prev, phase: 'done' }));
          if (jobs.every(j => j.status === 'COMPLETED')) {
            toast.success('Đã đăng bài thành công!');
            setMessage(''); setMediaUrls([]); setHashtags([]); setSelectedAccountIds([]);
          } else {
            toast.error('Một số kênh đăng bài thất bại');
          }
        }
      } catch { /* bỏ qua lỗi mạng tạm thời */ }
    };

    poll();
    const timer = setInterval(poll, 3000);

    return () => {
      clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobIds]);

  // Cảnh báo người dùng nếu họ định đóng/f5 trang khi đang có tác vụ chạy ngầm
  useEffect(() => {
    const hasActiveTasks = tasks.some(t => t.status === 'uploading' || t.status === 'processing' || t.status === 'pending');
    if (!hasActiveTasks) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Hệ thống đang xử lý bài đăng của bạn. Bạn có chắc muốn rời đi không?';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tasks]);


  const handlePublish = async () => {
    if (activeTab === 'draft') {
      if (!message.trim() && mediaUrls.length === 0) return toast.error('Vui lòng nhập nội dung trước khi lưu nháp');
      const hashtagStr = hashtags.map(h => `#${h}`).join(' ');
      const fullMessage = message.trim() + (hashtagStr ? `\n\n${hashtagStr}` : '');
      try {
        await socialApi.drafts.create({ message: fullMessage, mediaUrls: mediaUrls.length ? mediaUrls : undefined, thumbUrl: thumbUrl || undefined });
        const updated = await socialApi.drafts.list();
        setDrafts(updated);
        toast.success('Đã lưu nháp!');
        setMessage('');
        setMediaUrls([]);
        setHashtags([]);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Lưu nháp thất bại');
      }
      return;
    }

    if (selectedAccountIds.length === 0) return toast.error('Vui lòng chọn ít nhất một kênh');
    if (!message.trim() && mediaUrls.length === 0) return toast.error('Vui lòng nhập nội dung');
    if (hashtags.length === 0) return toast.error('🏷️ Vui lòng thêm ít nhất 1 hashtag');

    const isScheduling = activeTab === 'schedule';
    if (isScheduling) {
      if (!scheduledAt) return toast.error('Vui lòng chọn thời gian đặt lịch');
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) return toast.error('Thời gian đặt lịch không hợp lệ');
      if (scheduledDate <= new Date()) return toast.error('Thời gian đặt lịch phải ở tương lai');
    }

    const hashtagStr = hashtags.map(h => `#${h}`).join(' ');
    const fullMessage = message.trim() + (hashtagStr ? `\n\n${hashtagStr}` : '');
    
    const channelList = selectedAccountIds.map(id => {
      const acc = accounts.find(a => a.id === id);
      return {
        id,
        name: acc?.name || id,
        platform: (acc?.platform || 'facebook').toUpperCase(),
        status: 'pending' as 'pending' | 'posting' | 'success' | 'fail',
        error: undefined as string | undefined
      };
    });

    const initialChannels = channelList.map(ch => ({
      ...ch,
      status: 'pending' as 'pending' | 'posting' | 'success' | 'fail',
    }));

    setPostingPcts({});
    setPublishStartedAt(Date.now());
    setElapsedSeconds(0);
    setPublishProgress({ show: true, phase: 'publishing', uploadPct: 100, channels: initialChannels });
    setPublishing(true);

    // ── Đặt lịch: gọi schedule.create() cho từng kênh (không cần queue) ──────
    if (isScheduling) {
      let allOk = true;
      const results = [...initialChannels];
      for (let i = 0; i < channelList.length; i++) {
        const ch = channelList[i];
        results[i] = { ...results[i], status: 'posting' };
        setPublishProgress(prev => ({ ...prev, channels: [...results] }));
        try {
          await socialApi.schedule.create({
            accountId: ch.id,
            message: fullMessage,
            mediaUrls: mediaUrls.length ? mediaUrls : undefined,
            scheduledAt: new Date(scheduledAt).toISOString(),
            privacy,
            thumbUrl: thumbUrl || undefined,
          });
          results[i] = { ...results[i], status: 'success' };
        } catch (err: any) {
          results[i] = { ...results[i], status: 'fail', error: err.response?.data?.message || err.message };
          allOk = false;
        }
        setPublishProgress(prev => ({ ...prev, channels: [...results] }));
      }
      setPublishing(false);
      setPublishProgress(prev => ({ ...prev, phase: 'done' }));
      if (allOk) {
        toast.success('Đã đặt lịch tất cả!');
        setMessage(''); setMediaUrls([]); setHashtags([]); setSelectedAccountIds([]);
      } else {
        toast.error('Một số kênh đặt lịch thất bại');
      }
      return;
    }

    // ── Đăng ngay: enqueue toàn bộ → poll từng 3 giây ────────────────────────
    try {
      const jobs = channelList.map(ch => {
        // Dùng nội dung riêng per-platform nếu có
        const platformMsg = perPlatformMode && perPlatformMessages[ch.platform as SocialPlatform]
          ? perPlatformMessages[ch.platform as SocialPlatform]! + (hashtags.length ? `\n\n${hashtags.map(h => `#${h}`).join(' ')}` : '')
          : fullMessage;
        return {
          accountId: ch.id,
          platform:  ch.platform as any,
          message:   platformMsg,
          mediaUrls: mediaUrls.length ? mediaUrls : undefined,
          privacy,
          thumbUrl:  thumbUrl || undefined,
        };
      });

      const { jobIds } = await socialApi.queue.enqueue(jobs);

      // Thêm vào background task manager
      addTask({
        id: `post-${jobIds[0]}`,
        name: `Đăng bài: ${message.slice(0, 20)}...`,
        status: 'pending',
        progress: 0,
        type: 'post'
      });

      // Map jobId → channelId để polling effect có thể đối chiếu
      const idMap: Record<string, string> = {};
      jobIds.forEach((jobId, i) => { idMap[jobId] = channelList[i].id; });
      setJobChannelMap(idMap);
      setActiveJobIds(jobIds); // kích hoạt polling effect

      toast.success(`Đã thêm ${jobIds.length} bài vào hàng chờ — đang xử lý...`);
    } catch (err: any) {
      setPublishing(false);
      setPublishProgress(prev => ({ ...prev, phase: 'done' }));
      toast.error(err.response?.data?.message || 'Không thêm được vào hàng chờ');
    }
  };

  const selectDraft = (draft: any) => {
    // Tách hashtag ra khỏi nội dung nếu có
    const parts = (draft.message || '').split('\n\n');
    const lastPart = parts[parts.length - 1];

    if (lastPart && lastPart.startsWith('#')) {
      const foundTags = lastPart
        .split(/\s+/)
        .map((t: string) => t.replace(/^#+/, ''))
        .filter(Boolean); // loại bỏ empty strings từ trailing spaces
      setHashtags(foundTags);
      setMessage(parts.slice(0, -1).join('\n\n'));
    } else {
      setMessage(draft.message);
      setHashtags([]);
    }
    
    setMediaUrls(draft.media_urls || []);
    if (draft.media_urls?.length > 0) setPostMode('image');
    setThumbUrl(draft.thumb_url || '');
    setShowDraftsModal(false);
    toast.success('Đã nạp bản nháp');
  };

  if (!mounted) return null;

  // Helper: render media preview (xử lý cả Drive URL lẫn local URL)
  const renderMediaPreview = (url: string, className: string, videoProps?: { controls?: boolean; autoPlay?: boolean; loop?: boolean }) => {
    if (!url) return null;
    const driveId = url.includes('drive.google.com')
      ? (url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/))?.[1]
      : null;
    if (!driveId && /\.(mp4|mov|avi|mkv|webm)$/i.test(url)) {
      return <video src={url} className={className} muted {...videoProps} />;
    }
    const src = driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w400` : url;
    return <img src={src} alt="" className={className} onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] lg:h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* TOP HEADER */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white px-4 lg:px-6 pt-3 border-b border-slate-200 flex-shrink-0 z-20 shadow-sm overflow-x-auto scrollbar-none"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="text-[13px] text-slate-500 font-medium flex items-center gap-2 shrink-0">
            <span>Viết bài</span>
            <span className="text-[10px] opacity-60">❯</span>
            <span className="text-slate-900 font-bold">Đăng thường</span>
          </div>
          
          {/* Mobile Tabs */}
          <div className="flex lg:hidden bg-slate-100 rounded-lg p-1 shrink-0 self-start sm:self-auto">
            <button 
              onClick={() => setMobileTab('CHANNELS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${mobileTab === 'CHANNELS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >Kênh</button>
            <button 
              onClick={() => setMobileTab('EDITOR')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${mobileTab === 'EDITOR' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >Soạn thảo</button>
            <button 
              onClick={() => setMobileTab('PREVIEW')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${mobileTab === 'PREVIEW' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >Xem trước</button>
          </div>
        </div>
        
        <div className="flex gap-8 text-sm font-bold text-slate-600">
          {[
            { id: 'publish',   label: 'Đăng bài' },
            { id: 'customize', label: 'Tùy chỉnh' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTopTab(t.id as any)}
              className={`pb-2.5 -mb-[1px] relative transition-colors ${topTab === t.id ? 'text-blue-600' : 'hover:text-slate-900'}`}
            >
              {t.label}
              {topTab === t.id && (
                <motion.div layoutId="topTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
          <button className="hover:text-slate-900 pb-2.5 transition-colors">Chủ đề</button>
          <button className="hidden lg:block hover:text-slate-900 pb-2.5 transition-colors">Xem trước</button>
        </div>
      </motion.div>

      {/* MAIN LAYOUT */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative">
        
        {/* COLUMN 1: Kênh đăng bài — có thể kéo để đổi width */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`${mobileTab === 'CHANNELS' ? 'flex flex-1 w-full' : 'hidden'} lg:flex relative bg-white lg:border-r border-slate-200 flex-col flex-shrink-0 z-10 shadow-sm lg:w-[var(--sidebar-width)] lg:min-w-[200px] lg:max-w-[480px]`}
          style={{ '--sidebar-width': `${sidebarWidth}px` } as any}
        >
          <div className="p-4 border-b border-slate-100 bg-slate-50/30">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-extrabold text-slate-800 text-sm">Kênh đăng bài</h3>
              <div className="flex items-center gap-2.5">
                <motion.span 
                  key={selectedAccountIds.length}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-100"
                >
                  {selectedAccountIds.length} / {filteredAccounts.length}
                </motion.span>
                <motion.button 
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.4 }}
                  onClick={() => invalidateAccounts()}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            
            <div className="mb-5">
              <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 mb-2.5 tracking-wider">
                <div className="w-1.5 h-3.5 bg-blue-500 rounded-full"></div> CHẾ ĐỘ ĐĂNG
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'text', icon: Type, label: 'Chữ' },
                  { id: 'image', icon: ImageIcon, label: 'Ảnh' },
                  { id: 'video_vertical', icon: Smartphone, label: 'Video Dọc' },
                  { id: 'video_horizontal', icon: Monitor, label: 'Video Ngang' }
                ].map(mode => (
                  <motion.button 
                    key={mode.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setPostMode(mode.id as any);
                      setSelectedAccountIds([]);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all border relative ${postMode === mode.id ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <mode.icon className="w-3.5 h-3.5" /> {mode.label}
                    {postMode === mode.id && <motion.div layoutId="modeActive" className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="relative mb-5">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm kênh..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-[13px] focus:outline-none focus:border-blue-500 shadow-inner" 
              />
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1.5">
                   <Layers className="w-3 h-3" /> Nhóm tùy chỉnh:
                </span>
                <button onClick={saveCurrentSelectionAsGroup} className="text-blue-600 text-[11px] font-bold hover:underline">+ Lưu nhóm</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {channelGroups.length === 0 && (
                  <span className="text-[10px] text-slate-400 italic">Chưa có nhóm nào.</span>
                )}
                {channelGroups.map(g => (
                  <motion.div 
                    key={g.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => {
                      const activeIds = new Set(accounts.map(a => a.id));
                      setSelectedAccountIds(g.channels.filter(id => activeIds.has(id)));
                      // Luôn cập nhật Hashtag theo nhóm (nếu nhóm không có thì xóa trắng)
                      setHashtags(g.hashtags || []);
                    }}
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer shadow-sm hover:border-blue-300 transition-all group"
                  >
                    {g.name} 
                    <X 
                      onClick={(e) => deleteChannelGroup(g.id, e)}
                      className="w-3 h-3 ml-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" 
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 max-h-none"
          >
            {(Object.entries(platformGroups) as [string, SocialAccount[]][]).map(([platform, groupAccounts]) => {
              const meta = PLATFORM_META[platform as SocialPlatform] || PLATFORM_META.FACEBOOK;
              return (
                <div key={platform} className="space-y-2">
                  <div className="px-3 flex items-center gap-2">
                    <div className={`w-1 h-3 rounded-full ${meta.color}`} />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Tài khoản {platform}
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {groupAccounts.map(account => {
                          const isSelected = selectedAccountIds.includes(account.id);
                          const isChild = !!account.parent_id;
                          // Only gray out if it's a personal FB/IG profile AND it's a root account that HAS children (acting as a container)
                          // Or if it's explicitly marked as a profile in a way we can detect.
                          // For now, let's allow selection of anything that isn't a root FB/IG account IF that account is just a profile.
                          const hasChildren = accounts.some(a => a.parent_id === account.id);
                          const isPersonalRoot = !isChild && hasChildren && (account.platform === 'FACEBOOK' || account.platform === 'INSTAGRAM');
                          
                          return (
                            <motion.div 
                              variants={itemVariants}
                              key={account.id} 
                              onClick={() => !isPersonalRoot && toggleAccount(account.id)} 
                              whileHover={!isPersonalRoot ? { x: 4, backgroundColor: 'rgba(241, 245, 249, 0.4)' } : {}}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-all border relative ${isChild ? 'ml-6' : ''} ${isSelected ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-transparent'} ${isPersonalRoot ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {/* Visual connector for child accounts */}
                              {isChild && (
                                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-slate-200" />
                              )}
                              {isChild && (
                                <div className="absolute -left-4 top-0 bottom-1/2 w-[1px] bg-slate-200" />
                              )}

                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white ${meta.color} shadow-sm text-sm relative overflow-hidden flex-shrink-0`}>
                                {account.avatar_url ? (
                                  <img src={account.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : meta.emoji}
                                
                                {isChild && (
                                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center text-[7px] ${meta.color}`}>
                                    {meta.emoji}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{account.name}</p>
                                {isChild && (
                                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-tighter">
                                    {account.platform === 'INSTAGRAM' ? 'IG Business' : 'Fanpage'}
                                  </div>
                                )}
                                {account.token_expires_soon && (
                                  <div className="text-[10px] text-amber-500 font-semibold mt-0.5">
                                    ⚠️ Token hết hạn trong {account.token_expires_in_days ?? 0} ngày
                                  </div>
                                )}
                              </div>
                              {!isPersonalRoot && (
                                <motion.div 
                                  animate={{ 
                                    backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                                    borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                                    scale: isSelected ? [1, 1.2, 1] : 1
                                  }}
                                  className="w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0"
                                >
                                  {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-1 border-l-2 border-b-2 border-white -rotate-45 mb-0.5" />}
                                </motion.div>
                              )}
                            </motion.div>
                          );
                    })}
                  </div>
                </div>
              );
            })}
            
            {filteredAccounts.length === 0 && (
              <div className="text-center py-10 px-5 opacity-60">
                <AlertCircle className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p className="text-sm italic text-slate-500">Không tìm thấy kênh phù hợp</p>
              </div>
            )}
          </motion.div>

          {/* Drag handle — kéo để resize sidebar */}
          <div
            onMouseDown={onDragHandleMouseDown}
            title="Kéo để điều chỉnh độ rộng"
            className="hidden lg:flex absolute top-0 right-0 h-full w-1.5 cursor-col-resize z-20 group items-center justify-center"
          >
            {/* Visual indicator */}
            <div className="h-12 w-1 rounded-full bg-slate-200 group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors" />
          </div>
        </motion.div>

        {/* COLUMN 2: Editor */}
        <div className={`${mobileTab === 'EDITOR' ? 'flex flex-1 w-full' : 'hidden'} lg:flex lg:flex-1 overflow-y-visible lg:overflow-y-auto bg-slate-50 p-4 lg:p-6 flex-col gap-6 items-center scrollbar-none`}>

          {/* ── Tab Tùy chỉnh ── */}
          <AnimatePresence mode="wait">
          {topTab === 'customize' && (
            <motion.div
              key="customize"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full max-w-[800px]"
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <h2 className="text-base font-bold text-slate-800">Tùy chỉnh bài đăng</h2>

                {/* Ảnh bìa video */}
                {(() => {
                  const videoUrl = mediaUrls.find(u => /\.(mp4|mov|avi|mkv|webm)$/i.test(u) || u.includes('drive.google.com'));
                  const isDriveVideo = !!videoUrl?.includes('drive.google.com');
                  const driveLibraryId = videoUrl ? (mediaLibraryIds[videoUrl] || null) : null;
                  if (!videoUrl) {
                    return (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <ImageIcon className="w-10 h-10 mb-3 text-slate-300" />
                        <p className="text-sm font-semibold">Chưa có video</p>
                        <p className="text-xs mt-1">Thêm video ở tab <span className="font-bold text-blue-600 cursor-pointer" onClick={() => setTopTab('publish')}>Đăng bài</span> trước</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-bold text-slate-700 mb-1">Ảnh bìa video</p>
                        <p className="text-xs text-slate-400">Chọn frame từ video hoặc upload ảnh tùy chỉnh. Dùng cho YouTube, TikTok, Facebook video.</p>
                      </div>

                      <div className="flex gap-4 items-start flex-wrap">
                        {/* Preview ảnh bìa đã chọn */}
                        <div className="relative flex-shrink-0">
                          {thumbUrl ? (
                            <div className="relative group">
                              <img
                                src={thumbUrl}
                                alt="Ảnh bìa"
                                className="w-40 h-24 object-cover rounded-xl border-2 border-blue-400 shadow-md"
                              />
                              <button
                                onClick={() => setThumbUrl('')}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-1 left-1 right-1 text-center">
                                <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-bold">Ảnh bìa đã chọn</span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-40 h-24 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                              <ImageIcon className="w-6 h-6 mb-1" />
                              <span className="text-[10px] font-semibold">Chưa chọn</span>
                            </div>
                          )}
                        </div>

                        {/* Các nút chọn ảnh bìa */}
                        <div className="flex flex-col gap-2 flex-1">
                          <button
                            onClick={() => setShowFramePicker(true)}
                            disabled={isDriveVideo && !driveLibraryId}
                            className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-bold text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isDriveVideo && !driveLibraryId ? 'Video Drive chưa có ID thư viện — thêm từ thư viện media' : undefined}
                          >
                            <Film className="w-4 h-4" />
                            Chọn frame từ video
                            {isDriveVideo && <span className="text-[10px] font-normal text-blue-500 ml-1">(server-side)</span>}
                          </button>
                          <button
                            onClick={() => { setLibraryMode('thumb'); setShowLibrary(true); }}
                            className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-colors"
                          >
                            <ImageIcon className="w-4 h-4" />
                            Chọn ảnh từ thư viện
                          </button>
                          {thumbUrl && (
                            <button
                              onClick={() => setThumbUrl('')}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" /> Xoá ảnh bìa
                            </button>
                          )}
                        </div>
                      </div>

                      {/* VideoFramePicker modal */}
                      <VideoFramePicker
                        videoUrl={videoUrl}
                        mediaLibraryId={driveLibraryId || undefined}
                        open={showFramePicker}
                        onClose={() => setShowFramePicker(false)}
                        onConfirm={(url) => { setThumbUrl(url); setShowFramePicker(false); }}
                      />
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full max-w-[800px] flex flex-col gap-6 ${topTab === 'customize' ? 'hidden' : ''}`}
          >

            {/* Top Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4">
              <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm relative w-full md:w-auto overflow-x-auto scrollbar-none">
                {[
                  { id: 'publish', label: 'Đăng ngay' },
                  { id: 'schedule', label: 'Đặt lịch' },
                  { id: 'draft', label: 'Lưu nháp' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (tab.id === 'publish') setScheduleMode('now');
                      else if (tab.id === 'schedule') setScheduleMode('schedule');
                    }} 
                    className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all relative z-10 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="activeTabBg" className="absolute inset-0 bg-blue-50 rounded-lg -z-10" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => {
                  setShowDraftsModal(true);
                  // Lazy load drafts khi user thực sự mở modal
                  if (drafts.length === 0) socialApi.drafts.list().then(setDrafts).catch(() => {});
                }} className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 text-[13px] font-bold shadow-sm">
                  <Save className="w-4 h-4" /> Nháp ({drafts.length})
                </motion.button>
                <div className="flex shadow-sm rounded-xl overflow-hidden">
                  <motion.button 
                    whileHover={{ backgroundColor: '#1d4ed8' }}
                    onClick={handlePublish} 
                    disabled={publishing} 
                    className="px-6 py-2.5 bg-blue-600 text-white text-[13px] font-bold transition-colors disabled:opacity-50"
                  >
                    {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : activeTab === 'schedule' ? 'Đặt lịch ngay' : activeTab === 'draft' ? 'Lưu nháp' : 'Đăng ngay'}
                  </motion.button>
                  <button className="px-3 py-2.5 bg-blue-700 text-white border-l border-blue-500"><ChevronDown className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            
            {/* Scheduled Time Row */}
            {(activeTab === 'schedule' || scheduleMode === 'schedule') && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-center gap-3 shadow-sm"
              >
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-700">Thời gian đặt lịch đăng bài:</span>
                <input 
                  type="datetime-local" 
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="border border-blue-200 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-blue-500/20 outline-none font-bold text-blue-700 bg-white"
                />
              </motion.div>
            )}

            {/* Text Editor */}
            <motion.div layout className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm focus-within:ring-2 ring-blue-500/20 transition-all">
              <textarea 
                className="w-full h-48 p-5 resize-none outline-none text-slate-800 placeholder:text-slate-400 text-sm leading-relaxed"
                placeholder="Hôm nay bạn muốn chia sẻ điều gì?..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <div className="bg-white border-t border-slate-100 p-3 px-5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button className="text-slate-400 hover:text-amber-500 transition-colors"><Smile className="w-5 h-5" /></button>
                  <button className="text-slate-400 hover:text-red-500 transition-colors"><MapPin className="w-5 h-5" /></button>
                  <button className="flex items-center gap-1.5 text-slate-600 text-[13px] font-bold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                    <Globe className="w-4 h-4" /> Công khai
                  </button>
                  <TemplateManager
                    currentMessage={message}
                    currentHashtags={hashtags}
                    onApply={(text, tags) => {
                      setMessage(text);
                      if (tags.length) setHashtags(prev => Array.from(new Set([...prev, ...tags])));
                    }}
                  />
                  <motion.button
                    onClick={handleAiOptimize}
                    disabled={isAiProcessing}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 text-white bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 py-1.5 rounded-full text-[13px] font-bold shadow-sm disabled:opacity-70"
                  >
                    {isAiProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isAiProcessing ? 'Đang tối ưu...' : 'AI Tối ưu nội dung'}
                  </motion.button>
                </div>
                <div className="flex items-center gap-2">
                  {/* Cảnh báo nếu vượt giới hạn của platform nào đó */}
                  {selectedAccountIds.length > 0 && (() => {
                    const overLimit = selectedAccountIds
                      .map(id => accounts.find(a => a.id === id))
                      .filter(Boolean)
                      .filter(a => {
                        const limit = PLATFORM_LIMITS[(a!.platform || '').toUpperCase()];
                        return limit && message.length > limit;
                      });
                    return overLimit.length > 0 ? (
                      <span className="text-[11px] text-red-500 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Quá giới hạn: {overLimit.map(a => a!.platform).join(', ')}
                      </span>
                    ) : null;
                  })()}
                  <div className={`text-[11px] font-bold uppercase ${message.length > 500 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {message.length} ký tự
                  </div>
                </div>
              </div>
            </motion.div>

            <HashtagPanel
              hashtags={hashtags}
              suggestedHashtags={suggestedHashtags}
              hashtagInput={hashtagInput}
              onAdd={addHashtag}
              onRemove={removeHashtag}
              onInputChange={setHashtagInput}
              onKeyDown={handleHashtagKeyDown}
              onAddSuggested={addSuggestedHashtag}
              onRemoveSuggested={removeSuggestedHashtag}
            />

            {/* Upload Section */}
            <div className="space-y-4">
              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {mediaUrls.map((url, i) => {
                    const isDrive = url.includes('drive.google.com');
                    const isVideo = /\.(mp4|mov|avi|webm|mkv)$/i.test(url);
                    const driveFileId = isDrive ? (url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/))?.[1] : null;
                    // Ưu tiên thumbnail_url từ thư viện (ảnh FFmpeg đúng), fallback về Drive thumbnail API
                    const previewSrc = mediaThumbs[url]
                      || (driveFileId ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w300` : url);
                    return (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group">
                        {!isDrive && isVideo ? (
                          <video src={url} className="w-full h-full object-cover" muted />
                        ) : isDrive ? (
                          <div className="relative w-full h-full bg-slate-800">
                            {/* Film icon nền — hiện ra khi thumbnail fail */}
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                              <Film className="w-8 h-8" />
                            </div>
                            <img
                              src={previewSrc}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <img
                            src={previewSrc}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                          />
                        )}
                        <button onClick={() => {
                          const removed = mediaUrls[i];
                          setMediaUrls(p => p.filter((_, idx) => idx !== i));
                          // Nếu ảnh bìa đang dùng thumbnail của media bị xóa → xóa luôn ảnh bìa
                          if (thumbUrl && mediaThumbs[removed] && thumbUrl === mediaThumbs[removed]) setThumbUrl('');
                        }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              {/* Chỉ còn Thư viện media — upload video trực tiếp trong modal thư viện */}
              <div>
                <motion.div
                  whileHover={{ borderColor: '#8b5cf6', backgroundColor: '#faf5ff' }}
                  onClick={() => { setLibraryMode('media'); setShowLibrary(true); }}
                  className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer group shadow-sm"
                >
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3 text-slate-400 group-hover:text-purple-500 transition-all group-hover:bg-purple-50">
                    <Layers className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 text-center">Chọn từ thư viện media</h4>
                  <p className="text-xs text-slate-500 mt-1 text-center">Chọn file đã upload trước</p>
                </motion.div>
              </div>
            </div>

          </motion.div>
        </div>

        {/* COLUMN 3: Preview */}
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={`${mobileTab === 'PREVIEW' ? 'flex flex-1 w-full' : 'hidden'} lg:flex lg:w-[380px] bg-white lg:border-l border-slate-200 flex-col shrink-0 z-10 lg:max-h-full`}>
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50/30 gap-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Xem trước bài viết</h3>
            <div className="flex gap-2">
              {[
                { 
                  id: 'FACEBOOK', 
                  color: 'bg-blue-600', 
                  icon: (
                    <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )
                },
                { 
                  id: 'INSTAGRAM', 
                  color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500', 
                  icon: (
                    <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.058-1.689-.072-4.948-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.76 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  )
                },
                { 
                  id: 'THREADS', 
                  color: 'bg-black', 
                  icon: (
                    <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.132 15.344c-.754.754-1.802 1.156-2.956 1.132-1.328-.027-2.454-.576-3.18-1.554-.645-.87-1.025-2.072-.754-3.414.281-1.385 1.054-2.401 2.193-2.88 1.01-.424 2.19-.286 3.125.367.625.434 1.077 1.066 1.258 1.758h.044c.055-.429.071-.857.049-1.286-.066-1.332-.733-2.522-1.884-3.351-1.228-.885-2.731-1.306-4.226-1.187-1.879.149-3.57 1.031-4.759 2.483C4.912 8.878 4.316 10.74 4.372 12.656c.112 3.842 3.14 6.942 6.981 7.142.923.048 1.841-.097 2.709-.431.547-.211.968-.588 1.218-1.09.208-.415.228-.87.054-1.312l-.028-.066zm-5.071-5.185c-.636.267-1.066.834-1.219 1.597-.134.664-.002 1.295.353 1.777.348.472.905.748 1.564.779.613.028 1.2-.178 1.572-.551.467-.468.653-1.173.524-1.99-.071-.444-.27-.852-.577-1.18-.328-.352-.771-.532-1.257-.532-.321-.001-.643.033-.96.1z"/>
                    </svg>
                  )
                },
                { 
                  id: 'TIKTOK', 
                  color: 'bg-black', 
                  icon: (
                    <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.54-4.11-1.32-.76-.5-1.41-1.13-1.92-1.87v7.54c.03 2.12-.51 4.34-2 5.92-1.58 1.67-4.01 2.5-6.24 2.17-2.31-.34-4.52-2.1-5.14-4.41C-.71 14.15-.09 10.22 2.21 8.21c1.83-1.61 4.49-1.96 6.8-1.12.01 1.43-.01 2.85 0 4.28-1.47-.46-3.15-.22-4.33.72-1.14.92-1.5 2.53-1.01 3.93.45 1.26 1.77 2.15 3.1 2.13 1.48-.02 2.76-1.11 2.94-2.58.05-1.14.01-6.19.01-15.55z"/>
                    </svg>
                  )
                }
              ].map(p => (
                <button 
                  key={p.id}
                  onClick={() => setPreviewPlatform(p.id as any)} 
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${previewPlatform === p.id ? `${p.color} text-white shadow-md ring-2 ring-blue-500 ring-offset-1` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {p.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-5 flex flex-col items-center gap-4">
            {/* Per-platform content toggle */}
            <div className="w-full max-w-[380px]">
              <button
                onClick={() => setPerPlatformMode(v => !v)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${perPlatformMode ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                <span>✏️ Tùy chỉnh nội dung theo từng platform</span>
                <span className={`w-4 h-4 rounded-full border-2 transition-all ${perPlatformMode ? 'bg-purple-500 border-purple-500' : 'border-slate-300'}`} />
              </button>

              {perPlatformMode && (
                <div className="mt-3 space-y-2">
                  {(Array.from(new Set(selectedAccountIds.map(id => accounts.find(a => a.id === id)?.platform).filter(Boolean))) as SocialPlatform[]).map(platform => {
                    const meta = PLATFORM_META[platform];
                    return (
                      <div key={platform} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className={`flex items-center gap-2 px-3 py-2 ${meta.color} text-white`}>
                          <span>{meta.emoji}</span>
                          <span className="text-xs font-bold">{meta.label}</span>
                          {!perPlatformMessages[platform] && <span className="ml-auto text-[10px] opacity-70">Dùng nội dung chung</span>}
                        </div>
                        <textarea
                          rows={3}
                          placeholder={`Nội dung riêng cho ${meta.label} (bỏ trống = dùng nội dung chung)`}
                          value={perPlatformMessages[platform] || ''}
                          onChange={e => setPerPlatformMessages(prev => ({ ...prev, [platform]: e.target.value }))}
                          className="w-full px-3 py-2 text-xs text-slate-700 resize-none focus:outline-none focus:bg-blue-50/30 transition-colors"
                        />
                      </div>
                    );
                  })}
                  {selectedAccountIds.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">Chọn kênh để tùy chỉnh nội dung</p>
                  )}
                </div>
              )}
            </div>

            {/* Platform Preview */}
            <div className="w-full flex flex-col items-center">
              <div className="w-[320px] bg-white rounded-[2.5rem] border-[6px] border-slate-900 shadow-2xl overflow-hidden flex flex-col relative shrink-0" style={{ minHeight: '520px' }}>
              {/* Phone notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-10" />
              <div className="overflow-y-auto h-full pt-6">
                <PlatformPreview
                  platform={previewPlatform}
                  message={(perPlatformMode && perPlatformMessages[previewPlatform]) || message || ''}
                  mediaUrls={mediaUrls}
                  accountName={accounts.find(a => a.platform === previewPlatform && selectedAccountIds.includes(a.id))?.name}
                  accountAvatar={accounts.find(a => a.platform === previewPlatform && selectedAccountIds.includes(a.id))?.avatar_url}
                />
              </div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold text-[13px]">
              <Clock className="w-4 h-4 text-slate-500" /> Thời gian đăng bài
            </div>
            
            {/* Date Time Picker for Schedule */}
            <AnimatePresence>
              {(activeTab === 'schedule' || scheduleMode === 'schedule') && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quyền riêng tư (FB)</label>
                    <select 
                      value={privacy}
                      onChange={e => setPrivacy(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 bg-white"
                    >
                      <option value="EVERYONE">👤 Công khai</option>
                      <option value="ALL_FRIENDS">👥 Bạn bè</option>
                      <option value="SELF">🔒 Chỉ mình tôi</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Thời gian đăng bài</label>
                    <input 
                      type="datetime-local" 
                      value={scheduledAt}
                      onChange={e => {
                        setScheduledAt(e.target.value);
                        setScheduleMode('schedule');
                      }}
                      className="w-full border border-blue-200 rounded-xl p-3 text-sm focus:ring-2 ring-blue-500/20 outline-none font-bold text-blue-700 bg-blue-50/30"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3">
              {[
                { id: 'now', label: 'Đăng ngay', icon: Send },
                { id: 'schedule', label: 'Đặt lịch', icon: CalendarIcon }
              ].map(m => (
                <motion.button 
                  key={m.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setScheduleMode(m.id as any);
                    if (m.id === 'now') setActiveTab('publish');
                    else setActiveTab('schedule');
                  }}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-3.5 rounded-xl border-2 transition-all relative ${scheduleMode === m.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                >
                  <m.icon className="w-5 h-5" />
                  <span className="text-[11px] font-bold">{m.label}</span>
                  {scheduleMode === m.id && <motion.div layoutId="modeDot" className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        <PublishProgressModal
          publishProgress={publishProgress}
          postingPcts={postingPcts}
          elapsedSeconds={elapsedSeconds}
          onClose={() => setPublishProgress(p => ({ ...p, show: false }))}
        />

        {/* MEDIA LIBRARY MODAL */}
        <MediaLibraryModal
          open={showLibrary}
          onClose={() => setShowLibrary(false)}
          onSelect={(urls, thumbMap, idMap) => {
            if (libraryMode === 'thumb') {
              setThumbUrl(urls[0] || '');
              toast.success('Đã đặt ảnh bìa!');
            } else {
              setMediaUrls(prev => Array.from(new Set([...prev, ...urls])));
              if (thumbMap) setMediaThumbs(prev => ({ ...prev, ...thumbMap }));
              if (idMap) setMediaLibraryIds(prev => ({ ...prev, ...idMap }));
              // Nếu chọn video Drive và chưa có ảnh bìa → tự động dùng thumbnail FFmpeg
              if (thumbMap && !thumbUrl) {
                const firstVideoThumb = urls.find(u => u.includes('drive.google.com') && thumbMap[u]);
                if (firstVideoThumb) {
                  setThumbUrl(thumbMap[firstVideoThumb]);
                  toast.success('Đã tự động đặt ảnh bìa từ video!');
                }
              }
              if (postMode === 'text') setPostMode('image');
              if (!thumbMap || !urls.some(u => u.includes('drive.google.com') && thumbMap?.[u])) {
                toast.success(`Đã thêm ${urls.length} file từ thư viện`);
              }
            }
          }}
          maxSelect={libraryMode === 'thumb' ? 1 : 10}
          mode={libraryMode}
        />

        {/* DRAFTS MODAL */}
        <AnimatePresence>
          {showDraftsModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
              onClick={() => setShowDraftsModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-[2rem] w-full max-w-[600px] overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900">Danh sách bản nháp</h3>
                    <button onClick={() => setShowDraftsModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {drafts.length === 0 && <p className="text-center py-10 text-slate-400 italic text-sm">Chưa có bản nháp nào được lưu.</p>}
                    {drafts.map(d => (
                      <div 
                        key={d.id} 
                        onClick={() => selectDraft(d)}
                        className="group p-4 rounded-2xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all flex gap-4"
                      >
                        {(d.thumb_url || d.media_urls?.[0]) && (
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                            {d.thumb_url ? (
                              <img src={d.thumb_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                            ) : /\.(mp4|mov|avi|mkv|webm)$/i.test(d.media_urls[0]) ? (
                              <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Smartphone className="w-6 h-6 text-white/50" /></div>
                            ) : (() => {
                              const driveId = d.media_urls[0].includes('drive.google.com')
                                ? (d.media_urls[0].match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || d.media_urls[0].match(/[?&]id=([a-zA-Z0-9_-]+)/))?.[1]
                                : null;
                              return <img src={driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w200` : d.media_urls[0]} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />;
                            })()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed mb-2">{d.message || '(Không có nội dung)'}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{new Date(d.created_at).toLocaleString()}</span>
                            <span className="text-[10px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-all">Nhấn để chọn →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
