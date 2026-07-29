'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Video } from 'lucide-react';
import Link from 'next/link';

interface Collection {
  id: number;
  name: string;
  description: string;
  color: string;
  video_count: number;
  created_at: string;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/ai/collections/`);
      const data = await response.json();
      if (data.success) {
        setCollections(data.collections);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    if (!newCollection.name.trim()) {
      toast.error('Vui lòng nhập tên bộ sưu tập');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/ai/collections/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCollection)
      });
      const data = await response.json();
      
      if (data.success) {
        setShowCreateModal(false);
        setNewCollection({ name: '', description: '', color: '#3B82F6' });
        fetchCollections();
      }
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const deleteCollection = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa bộ sưu tập "${name}"?`)) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/ai/collections/${id}/`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        fetchCollections();
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bộ sưu tập của tôi</h1>
          <p className="text-gray-600">Quản lý video yêu thích của bạn</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tạo bộ sưu tập
        </button>
      </div>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div className="text-center py-16">
          <Video className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Chưa có bộ sưu tập nào</h3>
          <p className="text-gray-600 mb-4">Tạo bộ sưu tập đầu tiên để bắt đầu!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Tạo ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
            >
              {/* Color Bar */}
              <div
                className="h-2"
                style={{ backgroundColor: collection.color }}
              />

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{collection.name}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {collection.description || 'Chưa có mô tả'}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <Video className="w-4 h-4" />
                  <span className="text-sm">
                    {collection.video_count} video{collection.video_count !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/collections/${collection.id}`}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-center transition-colors"
                  >
                    Xem chi tiết
                  </Link>
                  <button
                    onClick={() => deleteCollection(collection.id, collection.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Tạo bộ sưu tập mới</h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tên bộ sưu tập *
                </label>
                <input
                  type="text"
                  value={newCollection.name}
                  onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="VD: Viral Dance Videos"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mô tả
                </label>
                <textarea
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Mô tả ngắn về bộ sưu tập..."
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Màu sắc
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCollection({ ...newCollection, color })}
                      className={`w-10 h-10 rounded-lg transition-transform ${
                        newCollection.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 py-2 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={createCollection}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
