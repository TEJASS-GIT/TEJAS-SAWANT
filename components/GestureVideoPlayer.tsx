
import React from 'react';

interface GestureVideoPlayerProps {
  videoUrl: string | null;
  isGenerating: boolean;
  status: string;
}

const GestureVideoPlayer: React.FC<GestureVideoPlayerProps> = ({ videoUrl, isGenerating, status }) => {
  if (isGenerating) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/10 animate-pulse"></div>
        <div className="z-10 flex flex-col items-center gap-4">
          <div className="relative">
             <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
             <i className="fas fa-hand-sparkles absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl text-blue-400"></i>
          </div>
          <p className="text-lg font-bold tracking-wide animate-pulse">{status}</p>
          <p className="text-xs text-slate-400 text-center max-w-[250px]">
            Our AI is synthesizing authentic ASL movements. This typically takes about 30-60 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="w-full aspect-video bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
        <i className="fas fa-video-slash text-4xl mb-3"></i>
        <p className="font-medium">No gesture video generated yet</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group relative">
      <video 
        src={videoUrl} 
        autoPlay 
        loop 
        muted 
        className="w-full h-full object-cover"
        controls
      />
      <div className="absolute top-4 right-4 bg-blue-600/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        AI Generated ASL
      </div>
    </div>
  );
};

export default GestureVideoPlayer;
