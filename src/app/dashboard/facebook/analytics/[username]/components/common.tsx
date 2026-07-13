import Image from "next/image";
import { Video, Image as ImageIcon } from 'lucide-react';
import React, { useState } from 'react';

export interface FacebookPost {
  id: string;
  text: string;
  url: string;
  timestamp: number;
  time: string;
  isVideo: boolean;
  thumbnail: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export const ImageWithFallback = ({ src, alt, className, isVideo }: { src: string, alt: string, className: string, isVideo: boolean }) => {
  const [error, setError] = useState(false);
  
  if (error || !src) {
    return (
        <div className={`w-full h-full flex items-center justify-center text-slate-300 bg-slate-50 flex-col gap-2`}>
            {isVideo ? <Video className="w-8 h-8 opacity-50" /> : <ImageIcon className="w-8 h-8 opacity-50" />}
            <span className="text-[10px] uppercase font-bold opacity-50">No Image</span>
        </div>
    );
  }
  
  return (
    <Image 
        src={src} 
        alt={alt} 
        className={className} 
        onError={() => setError(true)}
        loading="lazy"
     width={0} height={0} sizes="100vw" unoptimized/>
  );
};
