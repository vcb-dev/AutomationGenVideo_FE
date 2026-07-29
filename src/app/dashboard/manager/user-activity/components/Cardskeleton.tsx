export const CardSkeleton = () => (
    <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-white animate-pulse">
        <div className="p-4 flex flex-col items-center">
            <div className="mt-2 mb-3">
                <div className="w-16 h-16 rounded-full bg-slate-200" />
            </div>
            <div className="text-center mb-4 w-full flex flex-col items-center">
                <div className="h-4 w-24 bg-slate-200 rounded mb-2" />
                <div className="flex gap-1.5">
                    <div className="h-4 w-14 bg-slate-100 rounded" />
                    <div className="h-4 w-16 bg-slate-100 rounded" />
                </div>
            </div>
            <div className="w-full space-y-1.5 mb-4 px-1">
                <div className="h-9 bg-slate-100 rounded-2xl" />
                <div className="h-9 bg-slate-100 rounded-2xl" />
                <div className="h-9 bg-slate-100 rounded-2xl" />
            </div>
            <div className="h-7 w-28 bg-slate-200 rounded-2xl mb-4" />
            <div className="w-full space-y-1.5 mb-4 px-1">
                <div className="flex justify-between">
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                    <div className="h-3 w-8 bg-slate-100 rounded" />
                </div>
                <div className="h-2 bg-slate-100 rounded-full" />
            </div>
            <div className="grid grid-cols-2 w-full gap-2 px-1">
                <div className="h-14 bg-slate-100 rounded-2xl" />
                <div className="h-14 bg-slate-100 rounded-2xl" />
            </div>
        </div>
    </div>
);