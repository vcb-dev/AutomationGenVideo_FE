'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import {
  Wand2,
  Copy,
  Check,
  History,
  Users,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Eye,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  Video,
  Mic,
  Zap,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';

interface Character {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar_url: string | null;
  is_active: boolean;
  order_index: number;
}

interface TransformHistoryItem {
  id: string;
  user_id: string;
  character_id: string;
  input_text: string;
  output_text: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  error_message: string | null;
  model_used: string | null;
  duration_ms: number | null;
  created_at: string;
  character: {
    id: string;
    name: string;
    slug: string;
    avatar_url: string | null;
  };
}

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  team?: string;
}

export default function ContentTransformPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'transform' | 'history' | 'team'>('transform');

  // Core content transform states
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<'text' | 'video' | 'audio'>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

  // History states
  const [historyItems, setHistoryItems] = useState<TransformHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyLimit] = useState<number>(10);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  // Detail Modal states
  const [selectedItem, setSelectedItem] = useState<TransformHistoryItem | null>(null);

  // Team History states
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberHistoryItems, setMemberHistoryItems] = useState<TransformHistoryItem[]>([]);
  const [memberHistoryTotal, setMemberHistoryTotal] = useState<number>(0);
  const [memberHistoryPage, setMemberHistoryPage] = useState<number>(1);
  const [memberHistoryTotalPages, setMemberHistoryTotalPages] = useState<number>(1);
  const [isMemberHistoryLoading, setIsMemberHistoryLoading] = useState<boolean>(false);

  const isPrivileged = user?.roles?.some(r =>
    [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER].includes(r as any)
  );

  // 1. Fetch active characters
  const fetchCharacters = useCallback(async () => {
    try {
      const res = await apiClient.get<Character[]>('/content-transform/characters');
      setCharacters(res.data);
      if (res.data.length > 0) {
        setSelectedCharacterId(res.data[0].id);
      }
    } catch (err: any) {
      toast.error('Không thể tải danh sách nhân vật AI');
    }
  }, []);

  // 2. Fetch personal history
  const fetchPersonalHistory = useCallback(async (page: number) => {
    setIsHistoryLoading(true);
    try {
      const res = await apiClient.get('/content-transform/history', {
        params: { page, limit: historyLimit },
      });
      setHistoryItems(res.data.items || []);
      setHistoryTotal(res.data.total || 0);
      setHistoryTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      toast.error('Lỗi khi tải lịch sử chuyển đổi');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [historyLimit]);

  // 3. Fetch team members (for Admin/Manager/Leader)
  const fetchTeamMembers = useCallback(async () => {
    console.log('[fetchTeamMembers] called. isPrivileged =', isPrivileged);
    if (!isPrivileged) return;
    try {
      const res = await apiClient.get<TeamMember[]>('/users/team-members');
      console.log('[fetchTeamMembers] API success response:', res.data);
      setTeamMembers(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedMemberId(res.data[0].id);
      }
    } catch (err: any) {
      console.error('[fetchTeamMembers] API error:', err);
    }
  }, [isPrivileged]);

  // 4. Fetch selected member's history
  const fetchMemberHistory = useCallback(async (memberId: string, page: number) => {
    if (!memberId) return;
    setIsMemberHistoryLoading(true);
    try {
      const res = await apiClient.get(`/content-transform/history/member/${memberId}`, {
        params: { page, limit: historyLimit },
      });
      setMemberHistoryItems(res.data.items || []);
      setMemberHistoryTotal(res.data.total || 0);
      setMemberHistoryTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      toast.error('Không có quyền xem lịch sử của thành viên này');
      setMemberHistoryItems([]);
      setMemberHistoryTotal(0);
      setMemberHistoryTotalPages(1);
    } finally {
      setIsMemberHistoryLoading(false);
    }
  }, [historyLimit]);

  // Run initial queries
  useEffect(() => {
    console.log('[ContentTransformPage] mounted/updated. user =', user?.email, 'roles =', user?.roles, 'isPrivileged =', isPrivileged);
    fetchCharacters();
  }, [fetchCharacters]);

  useEffect(() => {
    console.log('[ContentTransformPage] checking privilege for fetching team members. isPrivileged =', isPrivileged);
    if (isPrivileged) {
      fetchTeamMembers();
    }
  }, [fetchTeamMembers, isPrivileged]);

  // Load personal history on tab change or page changes
  useEffect(() => {
    if (activeTab === 'history') {
      fetchPersonalHistory(historyPage);
    }
  }, [activeTab, historyPage, fetchPersonalHistory]);

  // Load member history on selection or page changes
  useEffect(() => {
    if (activeTab === 'team' && selectedMemberId) {
      fetchMemberHistory(selectedMemberId, memberHistoryPage);
    }
  }, [activeTab, selectedMemberId, memberHistoryPage, fetchMemberHistory]);

  const handleTranscribe = async () => {
    if (!selectedFile) return;
    setIsTranscribing(true);
    const loadingToast = toast.loading('Đang nghe và chuyển đổi nội dung...');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await apiClient.post('/content-transform/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 70000, // 70s timeout
      });

      if (res.data && res.data.transcript) {
        setInputText(res.data.transcript);
        toast.success('Chuyển đổi âm thanh thành văn bản thành công!', { id: loadingToast });
      } else {
        throw new Error(res.data?.message || 'Không thể transcribe file. Vui lòng kiểm tra lại.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi transcribe file. Hãy đảm bảo file dưới 10 phút và thử lại.';
      toast.error(errMsg, { id: loadingToast });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTransform = async () => {
    if (!selectedCharacterId) {
      toast.error('Vui lòng chọn một nhân vật AI');
      return;
    }
    if (!inputText.trim()) {
      toast.error('Vui lòng nhập kịch bản thô');
      return;
    }

    setIsGenerating(true);
    setOutputText('');
    const loadingToast = toast.loading('Đang chuyển đổi kịch bản...');

    try {
      const res = await apiClient.post('/content-transform/transform', {
        character_id: selectedCharacterId,
        input_text: inputText,
        input_type: inputMode === 'video' ? 'VIDEO' : inputMode === 'audio' ? 'AUDIO' : 'TEXT',
      });

      if (res.data && res.data.status === 'SUCCESS') {
        setOutputText(res.data.output_text);
        toast.success('Chuyển đổi kịch bản thành công!', { id: loadingToast });
      } else {
        throw new Error(res.data?.error_message || 'Lỗi xử lý kịch bản');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi gọi AI';
      toast.error(errMsg, { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    toast.success('Đã sao chép kịch bản!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="text-[#1b1b1d] bg-[#fcf8fb] min-h-screen">
      <main className="pt-24 px-4 md:px-16 pb-44 md:pb-52">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1b1b1d] mb-2 tracking-tight">Chuyển đổi nội dung</h1>
            <p className="text-[#464554] text-sm">Biến ý tưởng thô thành kịch bản chuyên nghiệp với trợ lý AI đa nhân vật.</p>
          </header>

          {/* Horizontal Tab Navigation */}
          <div className="flex items-center space-x-8 border-b border-[#c7c4d7] mb-8">
            <button
              onClick={() => setActiveTab('transform')}
              className={`py-2 px-1 text-sm font-semibold transition-all focus:outline-none ${
                activeTab === 'transform'
                  ? 'border-b-2 border-[#4441cc] text-[#4441cc]'
                  : 'text-[#464554] hover:text-[#4441cc]'
              }`}
            >
              Chuyển đổi content
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setHistoryPage(1);
              }}
              className={`py-2 px-1 text-sm font-semibold transition-all focus:outline-none ${
                activeTab === 'history'
                  ? 'border-b-2 border-[#4441cc] text-[#4441cc]'
                  : 'text-[#464554] hover:text-[#4441cc]'
              }`}
            >
              Lịch sử
            </button>
            <button
              onClick={() => {
                setActiveTab('team');
                setMemberHistoryPage(1);
              }}
              className={`py-2 px-1 text-sm font-semibold transition-all focus:outline-none ${
                activeTab === 'team'
                  ? 'border-b-2 border-[#4441cc] text-[#4441cc]'
                  : 'text-[#464554] hover:text-[#4441cc]'
              }`}
            >
              Thống kê
            </button>
          </div>

          {/* Main Transformation Content */}
          {activeTab === 'transform' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Step 1 & 2 */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Step 1: Input Section */}
                <section className="bg-white border border-[#c7c4d7] p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center space-x-4 mb-6">
                    <span className="w-8 h-8 rounded-full bg-[#4441cc] text-white flex items-center justify-center font-bold text-sm">1</span>
                    <h2 className="text-xl md:text-2xl font-bold text-[#1b1b1d]">Nhập kịch bản thô</h2>
                  </div>
                  
                  {/* Tab System */}
                  <div className="flex p-1 bg-[#f6f3f5] rounded-xl mb-6 w-fit">
                    <button
                      onClick={() => { setInputMode('text'); setSelectedFile(null); }}
                      className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                        inputMode === 'text'
                          ? 'bg-white text-[#4441cc] shadow-sm'
                          : 'text-[#464554] hover:text-[#4441cc]'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                      <span>Văn bản</span>
                    </button>
                    <button
                      onClick={() => { setInputMode('video'); setSelectedFile(null); }}
                      className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                        inputMode === 'video'
                          ? 'bg-white text-[#4441cc] shadow-sm'
                          : 'text-[#464554] hover:text-[#4441cc]'
                      }`}
                    >
                      <Video className="w-5 h-5" />
                      <span>Video</span>
                    </button>
                    <button
                      onClick={() => { setInputMode('audio'); setSelectedFile(null); }}
                      className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                        inputMode === 'audio'
                          ? 'bg-white text-[#4441cc] shadow-sm'
                          : 'text-[#464554] hover:text-[#4441cc]'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                      <span>Giọng nói</span>
                    </button>
                  </div>

                  {/* File Upload Section for Video & Audio Modes */}
                  {inputMode !== 'text' && (
                    <div className="mb-6 p-6 border-2 border-dashed border-[#c7c4d7] hover:border-[#4441cc] rounded-xl flex flex-col items-center justify-center bg-[#fcf8fb] transition-all relative">
                      <input
                        type="file"
                        id="file-upload"
                        accept={inputMode === 'video' ? 'video/*' : 'audio/*'}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setSelectedFile(file);
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center text-[#464554] w-full text-center"
                      >
                        <Upload className="w-10 h-10 text-[#4441cc] mb-2 animate-bounce" style={{ animationDuration: '3s' }} />
                        <span className="font-semibold text-sm">
                          {selectedFile ? selectedFile.name : `Nhấp để chọn file ${inputMode === 'video' ? 'video' : 'âm thanh'}`}
                        </span>
                        <span className="text-xs text-[#464554]/60 mt-1">
                          {inputMode === 'video'
                            ? 'Hỗ trợ MP4, MOV, AVI, MKV, WEBM (Tối đa 200MB, 10 phút)'
                            : 'Hỗ trợ MP3, WAV, M4A, AAC, OGG, FLAC (Tối đa 200MB, 10 phút)'}
                        </span>
                      </label>
                      {selectedFile && (
                        <button
                          onClick={handleTranscribe}
                          disabled={isTranscribing}
                          className="mt-4 px-6 py-2 bg-[#4441cc] hover:bg-[#4441cc]/90 text-white rounded-lg font-semibold text-sm flex items-center space-x-2 transition-all disabled:opacity-50"
                        >
                          {isTranscribing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Đang nghe nội dung...</span>
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4" />
                              <span>Chuyển thành văn bản</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Textarea Container */}
                  <div className="relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value.slice(0, 2000))}
                      placeholder={
                        inputMode === 'text'
                          ? "Dán hoặc gõ kịch bản thô của bạn vào đây. Ví dụ: nội dung giới thiệu sản phẩm, ý tưởng video, ghi chú nhanh..."
                          : "Văn bản nhận diện từ file video/âm thanh sẽ hiển thị tại đây. Bạn có thể tự do chỉnh sửa trước khi tiến hành chuyển đổi."
                      }
                      className="w-full h-48 p-6 rounded-xl bg-white border border-[#c7c4d7] focus:border-[#4441cc] focus:ring-4 focus:ring-[#4441cc]/5 transition-all text-base text-[#1b1b1d] placeholder-[#464554]/60 outline-none custom-scrollbar resize-none"
                    />
                    <div className="flex justify-between mt-2 px-1 text-xs text-[#464554]">
                      <span>Hỗ trợ tiếng Việt có dấu</span>
                      <span>{inputText.length} ký tự</span>
                    </div>
                  </div>
                </section>

                {/* Step 2: Character Selection */}
                <section className="bg-white border border-[#c7c4d7] p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center space-x-4 mb-6">
                    <span className="w-8 h-8 rounded-full bg-[#4441cc] text-white flex items-center justify-center font-bold text-sm">2</span>
                    <h2 className="text-xl md:text-2xl font-bold text-[#1b1b1d]">Chọn nhân vật</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Render active characters from backend */}
                    {characters.map((char) => {
                      const isSelected = selectedCharacterId === char.id;
                      return (
                        <div
                          key={char.id}
                          onClick={() => setSelectedCharacterId(char.id)}
                          className={`group relative p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#4441cc] bg-[#5e5ce6]/5'
                              : 'border-[#c7c4d7] bg-white hover:border-[#4441cc]'
                          }`}
                        >
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#eae7ea] group-hover:border-[#4441cc]/20">
                              {char.avatar_url ? (
                                <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#eae7ea] text-[#464554] font-bold text-sm flex items-center justify-center">
                                  {getInitials(char.name)}
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm text-[#1b1b1d]">{char.name}</h3>
                              <p className="text-[11px] text-[#464554]">Năng lượng • Viral</p>
                            </div>
                          </div>
                          <p className="text-xs text-[#464554] line-clamp-3 mb-6 leading-relaxed">
                            {char.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[10px] font-bold">Năng động</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[10px] font-bold">Hài hước</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[10px] font-bold">Trending</span>
                          </div>
                          <div className={`absolute top-2 right-2 transition-opacity duration-200 ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <Check className="w-5 h-5 text-[#4441cc]" />
                          </div>
                        </div>
                      );
                    })}

                    {/* Dummy character placeholder 2: Chị Nhạn (mockup exact copy) */}
                    <div className="group relative p-6 border-2 rounded-2xl cursor-pointer transition-all border-[#c7c4d7] bg-white">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#4441cc]/20">
                          <img alt="Chị Nhạn" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1AaFdELtmwmgSb9uG2HcI1kMeuO63zvWNv-iQABmVHTbhky6sSwyVm5CAbwTxbeNJnaqA-EPbRrrQ_afofat9cYl2_JWKkLv_yEXQWIVPDaCFXpKYYlR7rHwZRy0w5013Wqlg7QKfXTOEFGekhB8ouDvCJELFlhRnnTV83YPSv9N0lgYckco8d9lad6gYhJaNJYg8eqW3KxyuAfcfJdU8XqaXP-brWhZDROyeLhACyCnbmMRM1Fsjxg" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[#1b1b1d]">Chị Nhạn</h3>
                          <p className="text-[11px] text-[#464554]">Kể chuyện • Cảm xúc</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#464554] line-clamp-3 mb-6 leading-relaxed">
                        Ấm áp, gần gũi, kể chuyện có mở đầu – cao trào – kết, nhiều cảm xúc.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[10px] font-bold">Ấm áp</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[10px] font-bold">Tâm tình</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[10px] font-bold">Truyền cảm</span>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0">
                        <Check className="w-5 h-5 text-[#4441cc]" />
                      </div>
                    </div>

                    {/* Dummy character placeholder 3: Chung Bùi (mockup exact copy) */}
                    <div className="group relative p-6 border-2 rounded-2xl hover:border-[#4441cc] cursor-pointer transition-all border-[#c7c4d7] bg-white">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#eae7ea] group-hover:border-[#4441cc]/20">
                          <img alt="Chung Bùi" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHfh4UZaE23hQqzJ_k7SX2OpO5ZyN7FjWZFxF2dCcQtnXCMh70phb13ssXLkvxpCzp-zwc878zMCg6squudM-883Plz4J-H4C36CN0SaBykbO_NqLLjbT5ecajfh3pAA2AaW34IE3SJIYEvZw_EcCAZyF-H-Ft70B0DSb1IBE7EwaF20ObfclfI_Gr_gXtZzm4Yy7G-txyh_j8t3_yQg8XF6hY8PfG-O9UQY5ndVzaueSBrM4RyRPIbw" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[#1b1b1d]">Chung Bùi</h3>
                          <p className="text-[11px] text-[#464554]">Chuyên sâu • Phân tích</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#464554] line-clamp-3 mb-6 leading-relaxed">
                        Mạch lạc, dẫn chứng số liệu, chia luận điểm rõ ràng, giọng chuyên gia.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-[#5e5ce6] text-white text-[10px] font-bold">Chuyên nghiệp</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#5e5ce6] text-white text-[10px] font-bold">Logic</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#5e5ce6] text-white text-[10px] font-bold">Uy tín</span>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Check className="w-5 h-5 text-[#4441cc]" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Step 3 Preview */}
              <div className="lg:col-span-5">
                <section className="lg:sticky lg:top-24 bg-white border border-[#c7c4d7] p-6 rounded-2xl min-h-[480px] lg:h-[calc(100vh-210px)] flex flex-col shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <span className="w-8 h-8 rounded-full bg-[#4441cc] text-white flex items-center justify-center font-bold text-sm">3</span>
                      <h2 className="text-xl md:text-2xl font-bold text-[#1b1b1d]">Kết quả chuyển đổi</h2>
                    </div>
                    {outputText && (
                      <button
                        onClick={copyToClipboard}
                        className="p-2 rounded-lg bg-white hover:bg-[#f6f3f5] border border-[#c7c4d7] text-[#464554] hover:text-[#1b1b1d] transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="Copy kịch bản"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Đã copy' : 'Copy'}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-grow flex flex-col justify-center">
                    {outputText ? (
                      <div className="flex-1 bg-[#f6f3f5] p-5 rounded-2xl border border-[#c7c4d7] shadow-inner overflow-y-auto max-h-[calc(100vh-320px)] text-sm text-[#1b1b1d] leading-relaxed whitespace-pre-wrap select-text custom-scrollbar">
                        {outputText}
                      </div>
                    ) : (
                      <div className="flex-grow bg-[#f6f3f5] rounded-xl border-2 border-dashed border-[#c7c4d7] flex flex-col items-center justify-center p-12 text-center space-y-6">
                        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[#5e5ce6] shadow-sm">
                          <Sparkles className="w-12 h-12" />
                        </div>
                        <div className="max-w-xs">
                          <h4 className="text-xl font-bold text-[#1b1b1d] mb-2">Sẵn sàng biến đổi</h4>
                          <p className="text-sm text-[#464554]">
                            Nhập kịch bản và chọn nhân vật, sau đó nhấn <strong className="text-[#4441cc]">Chuyển đổi</strong> để xem trước nội dung tại đây.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* History Section (Tab 2) */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl p-6 border border-[#c7c4d7] shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#1b1b1d] flex items-center gap-2">
                  <History className="w-5 h-5 text-[#4441cc]" />
                  Lịch sử chuyển đổi của tôi
                </h2>
                <span className="text-xs bg-[#5e5ce6]/5 text-[#4441cc] border border-[#5e5ce6]/10 px-3 py-1.5 rounded-full font-semibold">
                  Tổng số bản ghi: {historyTotal}
                </span>
              </div>

              {isHistoryLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#4441cc]" />
                  <p className="text-xs text-[#464554] mt-2">Đang tải lịch sử...</p>
                </div>
              ) : historyItems.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#eae7ea] text-xs font-bold text-[#464554] uppercase tracking-wider">
                          <th className="py-3.5 px-4">Nhân vật</th>
                          <th className="py-3.5 px-4">Nội dung thô (Input)</th>
                          <th className="py-3.5 px-4">Kết quả (Output)</th>
                          <th className="py-3.5 px-4">Thời gian tạo</th>
                          <th className="py-3.5 px-4 text-right">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eae7ea]/50 text-sm text-[#464554]">
                        {historyItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[#f6f3f5] transition-colors">
                            <td className="py-4 px-4 font-semibold text-[#1b1b1d]">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-[#5e5ce6]/5 text-[#4441cc] border border-[#5e5ce6]/10 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                  {item.character.name[0]}
                                </span>
                                {item.character.name}
                              </div>
                            </td>
                            <td className="py-4 px-4 max-w-xs truncate">{item.input_text}</td>
                            <td className="py-4 px-4 max-w-xs truncate text-[#464554]">
                              {item.output_text || <span className="text-xs text-red-500 font-bold">Lỗi</span>}
                            </td>
                            <td className="py-4 px-4 text-xs text-[#464554]/80">
                              {new Date(item.created_at).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => setSelectedItem(item)}
                                className="p-1.5 rounded-lg hover:bg-[#eae7ea] text-[#4441cc] transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {historyTotalPages > 1 && (
                    <div className="flex justify-between items-center pt-4 border-t border-[#eae7ea]">
                      <button
                        disabled={historyPage === 1}
                        onClick={() => setHistoryPage((p) => p - 1)}
                        className="flex items-center gap-1 px-3.5 py-2 border border-[#c7c4d7] rounded-xl text-xs font-semibold text-[#464554] hover:bg-[#f6f3f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Trang trước
                      </button>
                      <span className="text-xs text-[#464554] font-medium">
                        Trang {historyPage} / {historyTotalPages}
                      </span>
                      <button
                        disabled={historyPage === historyTotalPages}
                        onClick={() => setHistoryPage((p) => p + 1)}
                        className="flex items-center gap-1 px-3.5 py-2 border border-[#c7c4d7] rounded-xl text-xs font-semibold text-[#464554] hover:bg-[#f6f3f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Trang sau
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 text-[#464554] space-y-2">
                  <History className="w-10 h-10 mx-auto text-[#464554]/50" />
                  <p className="text-sm font-semibold">Chưa có lịch sử chuyển đổi</p>
                  <p className="text-xs max-w-xs mx-auto text-[#464554]/75">
                    Hãy thực hiện chuyển đổi kịch bản đầu tiên của bạn để lưu lịch sử tại đây.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Statistics / Team Section (Tab 3) */}
          {activeTab === 'team' && (
            isPrivileged ? (
              <div className="bg-white border border-[#c7c4d7] rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <h2 className="text-lg font-bold text-[#1b1b1d] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#4441cc]" />
                    Lịch sử của thành viên đội nhóm
                  </h2>

                  {/* Member selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#464554] font-semibold whitespace-nowrap">Chọn thành viên:</span>
                    <select
                      value={selectedMemberId}
                      onChange={(e) => {
                        setSelectedMemberId(e.target.value);
                        setMemberHistoryPage(1);
                      }}
                      className="bg-white border border-[#c7c4d7] rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1b1b1d] focus:outline-none focus:border-[#4441cc] transition-colors shadow-sm cursor-pointer"
                    >
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isMemberHistoryLoading ? (
                  <div className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#4441cc]" />
                    <p className="text-xs text-[#464554] mt-2">Đang tải lịch sử thành viên...</p>
                  </div>
                ) : memberHistoryItems.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#eae7ea] text-xs font-bold text-[#464554] uppercase tracking-wider">
                            <th className="py-3.5 px-4">Nhân vật</th>
                            <th className="py-3.5 px-4">Nội dung thô (Input)</th>
                            <th className="py-3.5 px-4">Kết quả (Output)</th>
                            <th className="py-3.5 px-4">Thời gian tạo</th>
                            <th className="py-3.5 px-4 text-right">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eae7ea]/50 text-sm text-[#464554]">
                          {memberHistoryItems.map((item) => (
                            <tr key={item.id} className="hover:bg-[#f6f3f5] transition-colors">
                              <td className="py-4 px-4 font-semibold text-[#1b1b1d]">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-[#5e5ce6]/5 text-[#4441cc] border border-[#5e5ce6]/10 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                    {item.character.name[0]}
                                  </span>
                                  {item.character.name}
                                </div>
                              </td>
                              <td className="py-4 px-4 max-w-xs truncate">{item.input_text}</td>
                              <td className="py-4 px-4 max-w-xs truncate text-[#464554]">
                                {item.output_text || <span className="text-xs text-red-500 font-bold">Lỗi</span>}
                              </td>
                              <td className="py-4 px-4 text-xs text-[#464554]/80">
                                {new Date(item.created_at).toLocaleString('vi-VN')}
                              </td>
                              <td className="py-4 px-4 text-right">
                                <button
                                  onClick={() => setSelectedItem(item)}
                                  className="p-1.5 rounded-lg hover:bg-[#eae7ea] text-[#4441cc] transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {memberHistoryTotalPages > 1 && (
                      <div className="flex justify-between items-center pt-4 border-t border-[#eae7ea]">
                        <button
                          disabled={memberHistoryPage === 1}
                          onClick={() => setMemberHistoryPage((p) => p - 1)}
                          className="flex items-center gap-1 px-3.5 py-2 border border-[#c7c4d7] rounded-xl text-xs font-semibold text-[#464554] hover:bg-[#f6f3f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Trang trước
                        </button>
                        <span className="text-xs text-[#464554] font-medium">
                          Trang {memberHistoryPage} / {memberHistoryTotalPages}
                        </span>
                        <button
                          disabled={memberHistoryPage === memberHistoryTotalPages}
                          onClick={() => setMemberHistoryPage((p) => p + 1)}
                          className="flex items-center gap-1 px-3.5 py-2 border border-[#c7c4d7] rounded-xl text-xs font-semibold text-[#464554] hover:bg-[#f6f3f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Trang sau
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20 text-[#464554] space-y-2">
                    <Users className="w-10 h-10 mx-auto text-[#464554]/50" />
                    <p className="text-sm font-semibold">Thành viên này chưa có lịch sử</p>
                    <p className="text-xs max-w-xs mx-auto text-[#464554]/75">
                      Lịch sử chuyển đổi kịch bản của thành viên được chọn sẽ hiển thị ở đây sau khi họ thực hiện thao tác.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-[#c7c4d7] rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <Users className="w-16 h-16 text-[#464554]/50 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold text-[#1b1b1d]">Thống kê Đội nhóm</h3>
                <p className="text-[#464554] text-sm max-w-md mx-auto leading-relaxed">
                  Tính năng Thống kê Đội nhóm đang được phát triển (Sắp ra mắt dành cho Thành viên). Hiện tại chỉ có tài khoản cấp Quản lý (Leader, Manager, Admin) mới có thể truy cập để xem dữ liệu của thành viên khác.
                </p>
              </div>
            )
          )}
        </div>
      </main>

      {/* Floating Footer Action (Step 3 Submit) */}
      {activeTab === 'transform' && (
        <div className="fixed bottom-0 left-0 right-0 py-4 px-4 md:px-16 bg-[#fcf8fb]/90 backdrop-blur-md border-t border-[#c7c4d7] z-40 flex justify-center shadow-lg">
          <button
            onClick={handleTransform}
            disabled={isGenerating || !inputText.trim() || !selectedCharacterId}
            className="max-w-7xl w-full bg-[#4441cc] text-white py-3.5 px-8 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#4441cc]/20 hover:scale-[1.01] active:scale-[0.99] transition-all transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang xử lý kịch bản AI...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Chuyển đổi nội dung</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* History Detail Modal (Popup drawer) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSelectedItem(null)}
          />
          <div className="relative bg-white border border-[#c7c4d7] text-[#1b1b1d] w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            {/* Header info */}
            <div className="flex items-center justify-between pb-4 border-b border-[#eae7ea]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#5e5ce6]/10 text-[#4441cc] flex items-center justify-center font-bold">
                  {selectedItem.character.name[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1b1b1d]">Chi tiết kịch bản — {selectedItem.character.name}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-[#464554] mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(selectedItem.created_at).toLocaleString('vi-VN')}
                    </span>
                    {selectedItem.duration_ms && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {selectedItem.duration_ms}ms
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-[#f6f3f5] hover:bg-[#eae7ea] text-[#464554] hover:text-[#1b1b1d] flex items-center justify-center transition-colors font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body content */}
            <div className="mt-6 space-y-5 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#464554] uppercase tracking-wider">Kịch bản gốc (Input)</span>
                <div className="bg-[#f6f3f5] border border-[#c7c4d7] p-4 rounded-xl text-sm text-[#1b1b1d] whitespace-pre-wrap select-text shadow-inner">
                  {selectedItem.input_text}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#4441cc] uppercase tracking-wider">Kết quả kịch bản AI (Output)</span>
                  {selectedItem.output_text && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedItem.output_text || '');
                        toast.success('Đã copy kịch bản!');
                      }}
                      className="text-xs text-[#4441cc] hover:text-[#4441cc]/80 font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>
                {selectedItem.output_text ? (
                  <div className="bg-[#5e5ce6]/5 border border-[#5e5ce6]/25 p-4 rounded-xl text-sm text-[#1b1b1d] whitespace-pre-wrap select-text leading-relaxed">
                    {selectedItem.output_text}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl text-sm bg-red-50 border border-red-200 text-red-650 font-medium">
                    {selectedItem.error_message || 'Quá trình chuyển đổi thất bại'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
