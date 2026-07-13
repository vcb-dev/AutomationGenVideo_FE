'use client';

import React, { useState, useRef } from 'react';
import { Upload, Film, Loader2, Trash2, CheckCircle, Download, Music, Scissors, FolderOpen, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

const BE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const PARTS_LABELS = [
    'Sản phẩm', 'HuyK', 'Chế tác (Above)', 'Chế tác (Below)',
    'Chế tác (Above)', 'HuyK (Above)', 'HuyK (Above)',
    'Chế tác (Below)', 'Sản phẩm HT', 'Outtrol',
];

interface FolderSlot {
    path: string;
    videoCount: number;
    scanning: boolean;
}

export default function MixVideoUpload() {
    const [folderSlots, setFolderSlots] = useState<FolderSlot[]>(
        Array(10).fill(null).map(() => ({
            path: '',
            videoCount: 0,
            scanning: false
        }))
    );
    
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [numOutputs, setNumOutputs] = useState(5); // ← Số video output
    const [videosPerFolder, setVideosPerFolder] = useState(10); // ← Số video lấy/folder
    const [fastMode, setFastMode] = useState(true); // ← Fast Mode (ultrafast preset)
    const [mixLoading, setMixLoading] = useState(false);
    const [mixProgress, setMixProgress] = useState(0);
    const [mixError, setMixError] = useState('');
    const [mixResult, setMixResult] = useState<any>(null);
    
    const audioInputRef = useRef<HTMLInputElement>(null);

    // Update slot path
    const updateSlotPath = (slotIndex: number, path: string) => {
        const newSlots = [...folderSlots];
        newSlots[slotIndex].path = path;
        setFolderSlots(newSlots);
    };

    // Scan slot to count videos
    const scanSlot = async (slotIndex: number) => {
        const slot = folderSlots[slotIndex];
        if (!slot.path.trim()) return;

        const newSlots = [...folderSlots];
        newSlots[slotIndex].scanning = true;
        setFolderSlots(newSlots);

        try {
            const response = await fetch(`${BE_API_URL}/ai/scan-folder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: slot.path })
            });

            if (!response.ok) {
                throw new Error('Failed to scan folder');
            }

            const data = await response.json();
            const videoCount = data.total_video_count || 0;

            newSlots[slotIndex].videoCount = videoCount;
            newSlots[slotIndex].scanning = false;
            setFolderSlots(newSlots);

            if (videoCount === 0) {
                toast.error(`❌ Không tìm thấy video trong folder này`);
            } else {
                toast.success(`✅ Tìm thấy ${videoCount} videos`);
            }
        } catch (error: any) {
            newSlots[slotIndex].scanning = false;
            setFolderSlots(newSlots);
            toast.error(`❌ Lỗi khi scan: ${error.message}`);
        }
    };

    // Clear slot
    const clearSlot = (slotIndex: number) => {
        const newSlots = [...folderSlots];
        newSlots[slotIndex] = { path: '', videoCount: 0, scanning: false };
        setFolderSlots(newSlots);
    };

    // Get filled slots count
    const getFilledSlots = () => {
        return folderSlots.filter(slot => slot.path.trim()).length;
    };

    // Handle mix
    const handleMix = async () => {
        const filledSlotsCount = getFilledSlots();
        if (filledSlotsCount === 0) {
            toast.error('❌ Vui lòng chọn ít nhất 1 folder');
            return;
        }
        if (!audioFile) {
            toast.error('❌ Vui lòng upload file nhạc');
            return;
        }

        setMixLoading(true);
        setMixProgress(0);
        setMixError('');
        setMixResult(null);
        
        try {
            const formData = new FormData();
            
            // Append audio
            formData.append('audio', audioFile);
            
            // Append folder paths
            folderSlots.forEach((slot, index) => {
                if (slot.path.trim()) {
                    formData.append(`folder_paths_${index}`, slot.path.trim());
                }
            });
            
            // Append params
            formData.append('width', fastMode ? '540' : '720'); // Lower res in fast mode
            formData.append('height', fastMode ? '960' : '1280'); // Lower res in fast mode
            formData.append('num_outputs', numOutputs.toString());
            formData.append('videos_per_folder', videosPerFolder.toString());
            formData.append('fast_mode', fastMode ? 'true' : 'false'); // ← NEW: Fast Mode
            
            // Call BE
            const response = await fetch(`${BE_API_URL}/ai/mix-video`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Mix failed');
            }
            
            const data = await response.json();
            const progressId = data.progress_id;
            
            toast.success('✅ Bắt đầu mix video...');
            
            // Poll mix progress
            await pollMixProgress(progressId);
            
        } catch (error: any) {
            setMixError(error.message || 'Lỗi khi mix video');
            toast.error(error.message);
        } finally {
            setMixLoading(false);
        }
    };
    
    const pollMixProgress = async (progressId: string) => {
        return new Promise<void>((resolve) => {
            const poll = async () => {
                try {
                    const response = await fetch(`${BE_API_URL}/ai/mix-video/status/${progressId}`);
                    const data = await response.json();

                    setMixProgress(data.percent || 0);

                    if (data.status === 'completed' && data.output_urls) {
                        setMixResult(data);
                        toast.success('🎉 Mix video hoàn tất!');
                        resolve();
                        return;
                    }

                    if (data.status === 'error') {
                        setMixError(data.error || 'Lỗi không xác định');
                        toast.error(`❌ ${data.error}`);
                        resolve();
                        return;
                    }

                    setTimeout(poll, 2000);
                } catch (error: any) {
                    setMixError(error.message);
                    toast.error(`❌ ${error.message}`);
                    resolve();
                }
            };
            poll();
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-6 rounded-2xl border border-purple-500/20">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                        <Scissors className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white mb-2">Mix Video (Path Input)</h2>
                        <p className="text-gray-400">
                            Nhập path của 10 folders chứa video. Hệ thống sẽ lấy <strong className="text-purple-400">{videosPerFolder} videos đầu tiên</strong> từ mỗi folder để mix thành <strong className="text-pink-400">{numOutputs} videos</strong> output.
                        </p>
                    </div>
                </div>
            </div>

            {/* Config: Num Outputs & Videos Per Folder & Fast Mode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Số lượng video output
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={numOutputs}
                        onChange={(e) => setNumOutputs(parseInt(e.target.value) || 5)}
                        className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Số video sẽ được tạo ra</p>
                </div>

                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        Videos lấy từ mỗi folder
                        <Info className="w-4 h-4 text-blue-400" />
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={videosPerFolder}
                        onChange={(e) => setVideosPerFolder(parseInt(e.target.value) || 10)}
                        className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-pink-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Giới hạn video/folder → nhanh hơn!</p>
                </div>

                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        ⚡ Fast Mode (Khuyến nghị)
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={fastMode}
                            onChange={(e) => setFastMode(e.target.checked)}
                            className="w-5 h-5 bg-[#0a0a0a] border border-gray-800 rounded text-green-500 focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                            {fastMode ? 'Bật (540p, ultrafast)' : 'Tắt (720p, veryfast)'}
                        </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                        {fastMode ? '✅ Nhanh gấp 3x, quality OK' : '⚠️ Chậm hơn, quality cao hơn'}
                    </p>
                </div>
            </div>

            {/* 10 Folder Slots */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-yellow-400" />
                    10 Folder Paths ({getFilledSlots()}/10)
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                    {folderSlots.map((slot, index) => (
                        <div key={index} className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-24">
                                    <span className="text-xs text-gray-500 font-mono">{PARTS_LABELS[index]}</span>
                                </div>
                                
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="text"
                                        placeholder={`Path to folder ${index + 1}...`}
                                        value={slot.path}
                                        onChange={(e) => updateSlotPath(index, e.target.value)}
                                        onBlur={() => {
                                            if (slot.path.trim() && slot.videoCount === 0 && !slot.scanning) {
                                                scanSlot(index);
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                    />
                                    
                                    {slot.scanning && (
                                        <div className="flex items-center gap-2 text-xs text-blue-400">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Scanning...
                                        </div>
                                    )}
                                    
                                    {!slot.scanning && slot.videoCount > 0 && (
                                        <div className="flex items-center gap-2 text-xs text-green-400">
                                            <CheckCircle className="w-3 h-3" />
                                            {slot.videoCount} videos (sẽ lấy {Math.min(slot.videoCount, videosPerFolder)})
                                        </div>
                                    )}
                                </div>

                                {slot.path && (
                                    <button
                                        onClick={() => clearSlot(index)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Audio Upload */}
            <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Music className="w-5 h-5 text-pink-400" />
                    2. Upload File Nhạc
                </h3>
                
                <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            setAudioFile(file);
                            toast.success(`✅ Đã chọn: ${file.name}`);
                        }
                    }}
                    className="hidden"
                />
                
                {!audioFile ? (
                    <button
                        onClick={() => audioInputRef.current?.click()}
                        className="w-full py-4 border-2 border-dashed border-gray-700 rounded-xl hover:border-pink-500 hover:bg-pink-500/5 transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-pink-400"
                    >
                        <Upload className="w-5 h-5" />
                        <span>Click để upload nhạc</span>
                    </button>
                ) : (
                    <div className="bg-pink-500/10 p-4 rounded-xl flex items-center justify-between border border-pink-500/20">
                        <div className="flex items-center gap-3">
                            <Music className="w-5 h-5 text-pink-400" />
                            <div>
                                <p className="text-white font-medium">{audioFile.name}</p>
                                <p className="text-xs text-gray-400">{(audioFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setAudioFile(null)}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                    </div>
                )}
            </div>

            {/* Mix Button */}
            <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Film className="w-5 h-5 text-purple-400" />
                    3. Tiến hành Mix
                </h3>

                {mixError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {mixError}
                    </div>
                )}

                {!mixLoading && !mixResult && (
                    <button
                        onClick={handleMix}
                        disabled={getFilledSlots() === 0 || !audioFile}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40"
                    >
                        <Scissors className="w-5 h-5" />
                        BẮT ĐẦU MIX VIDEO
                    </button>
                )}

                {mixLoading && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-400">
                            <span>Đang mix video...</span>
                            <span>{mixProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                                style={{ width: `${mixProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                            Lưu ý: Hệ thống đọc trực tiếp từ đường dẫn folder trên server. Tốc độ mix phụ thuộc vào số lượng video và dung lượng.
                        </p>
                    </div>
                )}

                {mixResult && (
                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-400 mb-3">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-semibold">Mix thành công!</span>
                        </div>
                        
                        {mixResult.output_urls && mixResult.output_urls.length > 0 && (
                            <div className="space-y-2">
                                {mixResult.output_urls.map((url: string, idx: number) => (
                                    <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg hover:bg-[#1a1a1a] transition-colors"
                                    >
                                        <span className="text-sm text-gray-300">Video {idx + 1}</span>
                                        <Download className="w-4 h-4 text-purple-400" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
