import React, { useRef, useState } from 'react';

interface VideoCardProps {
  title: string;
  description: string;
  url: string;
  duration?: string;
  label?: string;
  poster?: string;
}

export function VideoCard({ title, description, url, duration, label = "Watch before drilling", poster }: VideoCardProps) {
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <div className="bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 overflow-hidden group transition-all hover:border-[#1a1a1a]/20 mb-8 rounded-sm shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
      <div className="aspect-video bg-[#1a1a1a] relative flex items-center justify-center group/video cursor-pointer">
        {error ? (
          <div className="text-white/40 text-center p-6 space-y-4">
            <span className="text-[10px] uppercase tracking-widest font-bold block opacity-50">Video unavailable</span>
            <p className="text-[10px] font-mono opacity-30 max-w-[240px] mx-auto text-balance">
              Missing file: <code className="bg-white/10 px-1 rounded">{url}</code>
            </p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef}
              controls={isPlaying}
              className={`w-full h-full object-contain transition-opacity duration-700 ${isPlaying ? 'opacity-100' : 'opacity-90'}`}
              playsInline
              poster={poster}
              onError={() => setError(true)}
              onPlay={() => setIsPlaying(true)}
            >
              <source src={url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {!isPlaying && !error && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/40 transition-all duration-300"
                onClick={() => {
                  videoRef.current?.play().catch(() => setError(true));
                }}
              >
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover/video:scale-110 transition-transform duration-500 shadow-xl">
                  <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-4 md:p-7 space-y-3 bg-white">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
             <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/30 block">{label}</span>
             <h3 className="font-serif text-xl italic text-[#1a1a1a] leading-tight tracking-tight font-medium">{title}</h3>
          </div>
          {duration && <span className="text-[10px] font-mono bg-[#1a1a1a]/5 px-2 py-0.5 rounded text-[#1a1a1a]/40 pt-[3px] border border-[#1a1a1a]/5">{duration}</span>}
        </div>
        <p className="text-sm text-[#1a1a1a]/60 font-light leading-relaxed max-w-xl">
          {description}
        </p>
      </div>
    </div>
  );
}
