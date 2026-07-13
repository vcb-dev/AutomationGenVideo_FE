import dynamic from 'next/dynamic';

// ssr: false → Next.js không render trang login phía server
// → không có hydration step → không có hydration mismatch
const LoginClient = dynamic(() => import('./LoginClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function LoginPage() {
  return <LoginClient />;
}
