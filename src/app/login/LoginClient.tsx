'use client';

import Image from "next/image";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { getDashboardPathForRoles } from '@/lib/post-login-redirect';
import { motion } from 'framer-motion';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginClient() {
  const router = useRouter();
  const { login, error, clearError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      clearError();
      await login(data);
      const { user } = useAuthStore.getState();
      if (user) {
        router.push(getDashboardPathForRoles(user.roles));
      } else {
        router.push('/dashboard/manager/user-activity?tab=performance');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setValue('password', '');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] relative overflow-hidden flex items-center justify-center font-sans selection:bg-blue-500/30">

      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl animate-pulse-slow will-change-transform" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl animate-pulse-slow delay-1000 will-change-transform" />
      </div>

      <div className="container px-4 mx-auto relative z-10 flex flex-col items-center">

        {/* Logo/Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl shadow-blue-500/20 mb-4">
            <Image src="/logo-vcb.png" alt="VCB" className="w-full h-full object-cover" width={64} height={64} unoptimized />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Viễn Chí Bảo</h2>
          <p className="text-slate-400 text-sm mt-1">Video Intelligence Platform</p>
        </motion.div>

        {/* Glass Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">

            <div className="mb-8 text-center">
              <h1 className="text-xl font-semibold text-white mb-2">Đăng nhập tài khoản</h1>
              <p className="text-slate-400 text-sm">Nhập thông tin của bạn để truy cập hệ thống</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                    placeholder="name@example.com"
                  />
                </div>
                {errors.email?.message && <p className="text-xs text-red-400 ml-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1 pr-1">
                  <label className="text-xs font-medium text-slate-300">Mật khẩu</label>
                  <a href="#" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Quên mật khẩu?</a>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    {...register('password')}
                    type="password"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password?.message && <p className="text-xs text-red-400 ml-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Đăng nhập <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0f192d] px-2 text-slate-500">Hoặc</span></div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
                  window.location.href = `${apiUrl}/auth/google`;
                }}
                className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Tiếp tục với Google
              </button>

            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors" onClick={() => clearError()}>
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
