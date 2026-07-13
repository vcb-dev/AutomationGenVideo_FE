'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { Users, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Manager {
  id: string;
  email: string;
  full_name: string;
  avatar: string | null;
}

export default function SelectManagerModal() {
  const { user, token, setUser } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Track if we already checked in this component lifecycle
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only check once per component mount
    if (hasChecked.current) return;

    // Show modal if user is EDITOR or CONTENT and doesn't have a manager
    // Only show on first login, not during navigation within dashboard
    if (user && (user.roles?.includes(UserRole.EDITOR) || user.roles?.includes(UserRole.CONTENT)) && !user.manager_id) {
      // Check if modal was already shown/dismissed in this session
      const modalDismissed = localStorage.getItem('manager_modal_dismissed');

      if (!modalDismissed) {
        hasChecked.current = true;
        setShowModal(true);
        fetchManagers();
      } else {
        hasChecked.current = true;
      }
    }
  }, [user]);

  const fetchManagers = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/available-managers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dismiss modal and save to sessionStorage to prevent showing again
  const dismissModal = () => {
    localStorage.setItem('manager_modal_dismissed', 'true');
    setShowModal(false);
  };

  const handleSelectManager = async () => {
    if (!selectedManager || !token) return;

    try {
      setSubmitting(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/select-manager/${selectedManager}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update user in store
        setUser({ ...user!, manager_id: selectedManager });
        // Mark as dismissed so it won't show again in this session
        localStorage.setItem('manager_modal_dismissed', 'true');
        setShowModal(false);
      } else {
        toast.error('Không thể chọn quản lý. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error selecting manager:', error);
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative">
          <button
            onClick={dismissModal}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Chọn Quản Lý Của Bạn</h2>
              <p className="text-indigo-100 text-sm">
                Vui lòng chọn quản lý để tiếp tục sử dụng hệ thống
              </p>
            </div>
            <Users className="w-12 h-12 opacity-50" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Đang tải danh sách quản lý...</p>
            </div>
          ) : managers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Không có quản lý nào trong hệ thống</p>
              <p className="text-slate-500 text-sm mt-2">
                Vui lòng liên hệ admin để được hỗ trợ
              </p>
            </div>
          ) : (
            <>
              <p className="text-slate-700 mb-4 font-medium">
                Chọn một quản lý từ danh sách bên dưới:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                {managers.map((manager) => (
                  <button
                    key={manager.id}
                    onClick={() => setSelectedManager(manager.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedManager === manager.id
                      ? 'border-indigo-600 bg-indigo-50 shadow-md'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {manager.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">
                          {manager.full_name}
                        </h3>
                        <p className="text-sm text-slate-600 truncate">
                          {manager.email}
                        </p>
                      </div>
                      {selectedManager === manager.id && (
                        <CheckCircle className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {selectedManager
                ? 'Nhấn "Xác nhận" để tiếp tục'
                : 'Vui lòng chọn một quản lý'}
            </p>
            <button
              onClick={handleSelectManager}
              disabled={!selectedManager || submitting}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Xác nhận
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
