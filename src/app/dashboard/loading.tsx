import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex-1 w-full bg-[#0b1121] text-white p-6 overflow-hidden flex flex-col items-center justify-center min-h-screen">
       <div className="flex flex-col items-center gap-4 animate-pulse">
           <div className="relative">
               <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-spin-slow">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
               </div>
               <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping"></div>
           </div>
           <div className="space-y-2 text-center">
               <div className="h-4 w-32 bg-slate-800 rounded mx-auto"></div>
               <div className="h-3 w-48 bg-slate-800/50 rounded mx-auto"></div>
           </div>
       </div>
    </div>
  );
}
