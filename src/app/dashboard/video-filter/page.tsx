'use client';

import Image from "next/image";
import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Film, AlertTriangle, CheckCircle, X, FileVideo, Loader2, RefreshCw, Search, ArrowRight } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
interface Channel {
  id: string;
  platform: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  total_followers?: number;
}

interface DuplicateResult {
  isDuplicate: boolean;
  matchedVideo?: {
    id: string;
    title: string;
    createdAt: string;
    platforms: string[];
  };
  similarity: number;
  confidence: string;
  needsReview: boolean;
}

const PLATFORMS = [
  { id: 'TIKTOK', name: 'TikTok', icon: '🎵', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-500/10 border-pink-500/20' },
  { id: 'INSTAGRAM', name: 'Instagram', icon: '📷', color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10 border-purple-500/20' },
  { id: 'FACEBOOK', name: 'Facebook', icon: '👥', color: 'from-blue-600 to-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'DOUYIN', name: 'Douyin', icon: '🎶', color: 'from-red-500 to-orange-500', bg: 'bg-red-500/10 border-red-500/20' },
  { id: 'XIAOHONGSHU', name: 'Xiaohongshu', icon: '📕', color: 'from-red-600 to-red-400', bg: 'bg-red-600/10 border-red-600/20' },
];

export default function VideoFilterPage() {
  // --- State ---
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<DuplicateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingChannel, setUpdatingChannel] = useState(false);
  const [updateStats, setUpdateStats] = useState<{ found: number; saved: number } | null>(null);

  // --- Logic ---
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Fetch channels when platform selected
  useEffect(() => {
    if (selectedPlatform) {
      fetchChannels(selectedPlatform);
    } else {
      setChannels([]);
      setSelectedChannel('');
    }
  }, [selectedPlatform]);

  const fetchChannels = async (platform: string) => {
    setLoadingChannels(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/tracked-channels/my-channels?platform=${platform}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch channels');
      setChannels(data.channels || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load channels');
      setChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleChannelSelect = async (channelId: string) => {
    setSelectedChannel(channelId);
    setResult(null);
    setError(null);
    setUpdateStats(null);
    setUpdatingChannel(true);
    
    try {
        const token = localStorage.getItem('auth_token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
        
        const response = await fetch(`${apiUrl}/tracked-channels/${channelId}/check`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Sync failed');
        
        setUpdateStats({
            found: data.total_found || 0,
            saved: data.saved || 0
        });
        
    } catch (err: any) {
        console.error("Sync error:", err);
        setError(`Lỗi cập nhật: ${err.message}`);
    } finally {
        setUpdatingChannel(false);
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    setUploading(false);
    setUploadProgress(0);
    setError('Đã hủy bỏ quá trình kiểm tra.');
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedChannel) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    // Create new AbortController
    abortControllerRef.current = new AbortController();

    // Fake progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10));
    }, 400);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('channelId', selectedChannel);

      const token = localStorage.getItem('auth_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      
      const response = await fetch(`${apiUrl}/videos/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
        signal: abortControllerRef.current.signal // Attach signal
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');

      if (data.success) {
        setResult({
          isDuplicate: false,
          similarity: 0,
          confidence: 'high',
          needsReview: false,
        });
      } else if (data.duplicate) {
        setResult(data.duplicate);
      }

      // Auto clear upload after delay if success
      if (data.success) {
        setTimeout(() => {
            setSelectedFile(null);
            setUploadProgress(0);
        }, 3000);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
         console.log('Upload cancelled');
      } else {
         setError(err.message || 'Failed to upload video');
      }
      setUploadProgress(0);
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
          setUploading(false);
      }
      abortControllerRef.current = null;
      clearInterval(progressInterval);
    }
  };

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setError(null);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'] },
    maxFiles: 1,
    multiple: false
  });

  const resetAll = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
  };

  const selectedPlatformData = PLATFORMS.find(p => p.id === selectedPlatform);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2">
              Bộ Lọc Video AI
            </h1>
            <p className="text-slate-400 text-lg">Kiểm tra trùng lặp & Bản quyền nội dung đa nền tảng</p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-slate-300">Hệ thống AI sẵn sàng</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Input Flow */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* STEP 1: Platform */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 overflow-hidden relative group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">1</span>
                Chọn Nền Tảng
              </h3>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={`relative p-3 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 group/btn ${
                      selectedPlatform === platform.id
                        ? `border-transparent bg-gradient-to-br ${platform.color} bg-opacity-10 text-white shadow-lg shadow-${platform.id === 'FACEBOOK' ? 'blue' : 'pink'}-500/20`
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-2xl transform group-hover/btn:scale-110 transition-transform duration-300">{platform.icon}</span>
                    <span className="text-sm font-medium">{platform.name}</span>
                    {selectedPlatform === platform.id && (
                      <motion.div layoutId="platform-indicator" className="absolute inset-0 border-2 border-white/20 rounded-2xl" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* STEP 2: Channel */}
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.2 }}
               className={`bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 relative transition-all duration-500 ${
                 !selectedPlatform ? 'opacity-50 grayscale pointer-events-none' : ''
               }`}
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">2</span>
                Chọn Kênh Nguồn
              </h3>

              {loadingChannels ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-sm">Đang tải danh sách kênh...</p>
                  </div>
              ) : channels.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-600 bg-slate-900/30 rounded-2xl border border-slate-800/50 border-dashed">
                    <Search className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">Chưa có kênh nào</p>
                  </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {channels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel.id)}
                      disabled={updatingChannel}
                      className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all duration-300 text-left relative overflow-hidden group/item ${
                        selectedChannel === channel.id
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-slate-800 bg-slate-900/30 hover:bg-slate-800'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative">
                        {channel.avatar_url ? (
                          <Image src={channel.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-800" width={48} height={48} unoptimized />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg font-bold text-slate-400">
                             {channel.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Platform Icon Badge */}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700">
                           <span className="text-[10px]">{PLATFORMS.find(p => p.id === channel.platform.toUpperCase())?.icon}</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold truncate ${selectedChannel === channel.id ? 'text-blue-400' : 'text-slate-200'}`}>
                          {channel.display_name || channel.username}
                        </h4>
                        <p className="text-slate-500 text-sm truncate">@{channel.username}</p>
                        
                        {/* Sync Status Inline */}
                        <AnimatePresence>
                          {selectedChannel === channel.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="mt-2"
                            >
                               {updatingChannel ? (
                                 <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg w-fit">
                                   <Loader2 className="w-3 h-3 animate-spin"/> Đang đồng bộ...
                                 </div>
                               ) : updateStats ? (
                                 <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-lg w-fit">
                                   <CheckCircle className="w-3 h-3"/> Mới nhất ({updateStats.found})
                                 </div>
                               ) : null}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Selection Checkmark */}
                      {selectedChannel === channel.id && !updatingChannel && (
                        <div className="text-blue-500"><CheckCircle className="w-6 h-6"/></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* STEP 3: Upload */}
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.3 }}
               className={`bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 relative overflow-hidden transition-all duration-500 ${
                 !selectedChannel || updatingChannel || !updateStats ? 'opacity-40 pointer-events-none' : ''
               }`}
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">3</span>
                Upload Video Kiểm Tra
              </h3>

              {(!selectedChannel || updatingChannel) && (
                 <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px]">
                    <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
                      {updatingChannel ? <Loader2 className="w-4 h-4 animate-spin text-amber-400"/> : <ArrowRight className="w-4 h-4 text-slate-400"/>}
                      <span className="text-sm font-medium text-slate-200">
                        {updatingChannel ? 'Đợi đồng bộ dữ liệu xong...' : 'Hoàn thành bước 2 trước'}
                      </span>
                    </div>
                 </div>
              )}

              <div 
                {...getRootProps()} 
                className={`relative border-2 border-dashed rounded-2xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
                    : selectedFile 
                    ? 'border-green-500/50 bg-green-500/5' 
                    : 'border-slate-700 bg-slate-900/30 hover:border-slate-500 hover:bg-slate-800/50'
                }`}
              >
                <input {...getInputProps()} />
                
                {selectedFile ? (
                   <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                         <FileVideo className="w-8 h-8 text-green-400" />
                      </div>
                      <p className="text-green-400 font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                      <p className="text-slate-500 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                        className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center justify-center gap-1 bg-red-500/10 px-3 py-1 rounded-full mx-auto"
                      >
                         <X className="w-3 h-3" /> Chọn lại
                      </button>
                   </div>
                ) : (
                   <div className="text-center group-hover:-translate-y-1 transition-transform duration-300">
                      <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                         <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-400" />
                      </div>
                      <p className="text-slate-300 font-medium">Kéo thả video vào đây</p>
                      <p className="text-slate-500 text-sm mt-1">hoặc click để chọn file</p>
                   </div>
                )}
              </div>

              {/* UPLOAD PROGRESS & CONTROLS */}
              <div className="mt-4">
                  {uploading ? (
                     <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Progress Status Card */}
                        <div className="bg-slate-800/80 rounded-xl p-4 border border-blue-500/30 shadow-lg shadow-blue-500/10">
                           <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                 <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                 <span className="text-blue-100 font-medium">Đang xử lý...</span>
                              </div>
                              <span className="text-xl font-bold text-blue-400">{uploadProgress}%</span>
                           </div>
                           
                           {/* Progress Bar */}
                           <div className="h-2 bg-slate-700 rounded-full overflow-hidden w-full">
                              <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${uploadProgress}%` }}
                                 transition={{ ease: "linear" }}
                                 className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full relative"
                              >
                                  <div className="absolute inset-0 bg-white/30 w-full animate-[shimmer_1s_infinite] skew-x-12 translate-x-[-100%]" />
                              </motion.div>
                           </div>
                           <p className="text-xs text-slate-400 mt-2 text-center">Đang upload & trích xuất vector đặc trưng...</p>
                        </div>

                        {/* Stop Button */}
                        <button
                            onClick={handleCancelUpload}
                            className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/30 transition-all flex items-center justify-center gap-2"
                          >
                             <div className="bg-red-500 rounded-sm w-3 h-3" /> 
                             <span>Dừng Xử Lý</span>
                        </button>
                     </div>
                  ) : (
                      <button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 group"
                      >
                         <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                         <span>Kiểm Tra Ngay</span>
                      </button>
                  )}
              </div>
            </motion.div>

          </div>

          {/* RIGHT COLUMN: Results */}
          <div className="lg:col-span-7">
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="h-full bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 relative min-h-[500px] flex flex-col"
             >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20" />
                
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-200">
                  <Film className="w-6 h-6 text-purple-400" />
                  Kết Quả Phân Tích
                </h3>

                {!result && !error ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-50">
                      <div className="w-32 h-32 rounded-full border-4 border-slate-800 border-dashed animate-spin-slow flex items-center justify-center mb-6">
                         <Search className="w-12 h-12" />
                      </div>
                      <p className="text-lg font-medium">Đang chờ dữ liệu đầu vào...</p>
                      <p className="text-sm">Vui lòng hoàn thành các bước bên trái</p>
                   </div>
                ) : error ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-red-400">
                      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                         <AlertTriangle className="w-10 h-10" />
                      </div>
                      <h4 className="text-xl font-bold mb-2">Thông báo</h4>
                      <p className="text-center max-w-md bg-red-500/5 p-4 rounded-xl border border-red-500/20">{error}</p>
                      <button onClick={resetAll} className="mt-6 text-sm text-slate-400 hover:text-white underline">Thử lại</button>
                   </div>
                ) : result && (
                   <div className="flex-1">
                      {/* Result Header Card */}
                      <div className={`rounded-3xl p-6 border-2 flex items-center gap-6 mb-8 transform transition-all duration-500 ${
                         result.isDuplicate || result.similarity > 0.40
                            ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-900/20' 
                            : 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-900/20'
                      }`}>
                         <div className={`w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 ${
                            result.isDuplicate || result.similarity > 0.40 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                         }`}>
                            {result.isDuplicate || result.similarity > 0.40 ? <AlertTriangle className="w-10 h-10"/> : <CheckCircle className="w-10 h-10"/>}
                         </div>
                         <div>
                            <h4 className={`text-3xl font-bold mb-1 ${
                               result.isDuplicate || result.similarity > 0.40 ? 'text-red-400' : 'text-green-400'
                            }`}>
                               {result.isDuplicate || result.similarity > 0.40 ? 'Phát hiện Trùng lặp!' : 'Nội dung Hợp lệ'}
                            </h4>
                            <p className="text-slate-300">
                               {result.isDuplicate || result.similarity > 0.40
                                  ? 'Video này có độ tương đồng cao với nội dung đã có.' 
                                  : 'Video có sự khác biệt đủ lớn (Tương đồng < 40%).'}
                            </p>
                         </div>
                      </div>

                      {/* Similarity Stats */}
                      <div className="bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-700">
                         <div className="flex justify-between items-end mb-4">
                            <span className="text-slate-400 font-medium">Độ tương đồng thuật toán AI</span>
                            <div className="text-right">
                                <span className={`text-4xl font-bold ${
                                   result.similarity > 0.40 ? 'text-red-400' : 'text-green-400'
                                }`}>
                                   {(result.similarity * 100).toFixed(1)}%
                                </span>
                                <p className="text-xs text-slate-500 mt-1">Ngưỡng an toàn: &lt; 40%</p>
                            </div>
                         </div>
                         <div className="h-4 bg-slate-700 rounded-full overflow-hidden relative">
                            {/* Threshold Marker at 40% */}
                            <div className="absolute left-[40%] top-0 bottom-0 w-0.5 bg-white z-10 opacity-50" title="Ngưỡng 40%"></div>
                            
                            <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${result.similarity * 100}%` }}
                               className={`h-full relative ${
                                  result.similarity > 0.40 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'
                               }`}
                            >
                                <div className="absolute right-0 top-0 h-full w-1 bg-white/50 animate-pulse" />
                            </motion.div>
                         </div>
                      </div>

                      {/* Matched Video Info */}
                      {result.matchedVideo && (
                         <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                            <h5 className="text-slate-400 font-medium mb-4 flex items-center gap-2">
                               <Film className="w-4 h-4"/> Nguồn đối chiếu (Video gốc)
                            </h5>
                            <div className="bg-slate-900 rounded-xl p-4 flex gap-4">
                               <div className="w-32 h-24 bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center border border-slate-700">
                                  <Film className="w-8 h-8 text-slate-600" />
                               </div>
                               <div>
                                  <h6 className="font-bold text-lg text-white mb-1 line-clamp-1">{result.matchedVideo.title}</h6>
                                  <div className="flex flex-wrap gap-2 mb-2">
                                     {result.matchedVideo.platforms.map(p => (
                                        <span key={p} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-md uppercase border border-blue-500/20">{p}</span>
                                     ))}
                                  </div>
                                  <p className="text-slate-500 text-sm">Upload ngày: {new Date(result.matchedVideo.createdAt).toLocaleDateString()}</p>
                                  <p className="text-slate-500 text-sm mt-1">ID: {result.matchedVideo.id}</p>
                               </div>
                            </div>
                         </div>
                      )}
                      
                      <button onClick={resetAll} className="mt-8 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors">
                         Kiểm tra video khác
                      </button>
                   </div>
                )}
             </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
