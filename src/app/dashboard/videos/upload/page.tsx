'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface DuplicateInfo {
  isDuplicate: boolean;
  matchedVideo?: {
    id: string;
    title: string;
    createdAt: string;
    platforms: string[];
  };
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
  needsReview: boolean;
}

export default function UploadVideoPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [channelId, setChannelId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !channelId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('channelId', channelId);

      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!result.success && result.duplicate) {
        // Video is duplicate
        setDuplicate(result.duplicate);
        setShowDuplicateModal(true);
      } else if (result.success) {
        // Upload success
        toast.success('Video uploaded successfully!');
        router.push('/dashboard/videos');
      } else {
        toast.error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Upload Video</h1>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
        {/* File Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video File *
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Title Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter video title"
          />
        </div>

        {/* Description Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter video description"
          />
        </div>

        {/* Channel ID Input (temporary - should be dropdown) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Channel ID *
          </label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter channel ID"
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !file || !title || !channelId}
          className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-colors ${
            uploading || !file || !title || !channelId
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {uploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading & Checking...
            </span>
          ) : (
            'Upload Video'
          )}
        </button>
      </div>

      {/* Duplicate Warning Modal */}
      {showDuplicateModal && duplicate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <svg className="w-12 h-12 text-red-500 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-2xl font-bold text-red-600">Duplicate Video Detected!</h2>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                This video appears to be a duplicate of an existing video:
              </p>
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="font-semibold">{duplicate.matchedVideo?.title}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Uploaded: {new Date(duplicate.matchedVideo?.createdAt || '').toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Platforms: {duplicate.matchedVideo?.platforms.join(', ')}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Similarity: {(duplicate.similarity * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">
                  Confidence: <span className={`font-semibold ${
                    duplicate.confidence === 'high' ? 'text-red-600' :
                    duplicate.confidence === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>{duplicate.confidence.toUpperCase()}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicate(null);
                  setFile(null);
                  setTitle('');
                  setDescription('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
              >
                Cancel Upload
              </button>
              {duplicate.needsReview && (
                <button
                  onClick={() => {
                    // TODO: Send to manager review
                    toast.success('Sent to manager for review');
                    setShowDuplicateModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-semibold"
                >
                  Request Review
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
