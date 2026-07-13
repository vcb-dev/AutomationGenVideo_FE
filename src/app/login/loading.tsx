import { Loader2 } from 'lucide-react';

export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
       <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  );
}
