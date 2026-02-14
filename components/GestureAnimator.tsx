
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DualHandFrames, Keyframe } from '../types';
import { ASL_ALPHABET } from '../constants';

interface GestureAnimatorProps {
  animation: DualHandFrames;
  isPlaying: boolean;
  onComplete?: () => void;
}

const Hand: React.FC<{ 
  frames: Keyframe[]; 
  isPlaying: boolean; 
  side: 'left' | 'right'; 
  onFinished?: () => void 
}> = ({ frames, isPlaying, side, onFinished }) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      setFrameIndex(0);
      return;
    }

    let timeout: NodeJS.Timeout;
    if (frameIndex < frames.length - 1) {
      timeout = setTimeout(() => {
        setFrameIndex(prev => prev + 1);
      }, frames[frameIndex].duration);
    } else {
      timeout = setTimeout(() => {
        if (onFinished) onFinished();
        setFrameIndex(0);
      }, frames[frameIndex].duration);
    }

    return () => clearTimeout(timeout);
  }, [isPlaying, frameIndex, frames, onFinished]);

  if (frames.length === 0) return null;

  const currentFrame = frames[frameIndex];
  const imageUrl = ASL_ALPHABET[currentFrame.handshape.toUpperCase()] || ASL_ALPHABET['B'];

  return (
    <motion.div
      animate={{
        x: currentFrame.x * 1.8,
        y: currentFrame.y * 1.8,
        rotate: currentFrame.rotation,
        scaleX: side === 'left' ? -1 : 1, // Mirror left hand
      }}
      transition={{
        duration: currentFrame.duration / 1000,
        ease: "circOut"
      }}
      className="absolute z-20 w-40 h-40 flex items-center justify-center"
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={currentFrame.handshape}
          src={imageUrl}
          alt={`${side} handshape`}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          className="w-full h-full object-contain filter drop-shadow-xl"
        />
      </AnimatePresence>
      <div 
        className={`absolute -bottom-2 px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-tighter shadow-sm ${
          side === 'left' ? 'bg-rose-500' : 'bg-indigo-600'
        }`}
        style={{ transform: side === 'left' ? 'scaleX(-1)' : 'none' }}
      >
        {side === 'left' ? 'Left' : 'Right'}
      </div>
    </motion.div>
  );
};

const GestureAnimator: React.FC<GestureAnimatorProps> = ({ animation, isPlaying, onComplete }) => {
  const [completedHands, setCompletedHands] = useState(0);

  const handleHandFinished = () => {
    setCompletedHands(prev => {
      const newVal = prev + 1;
      if (newVal >= 2) {
        if (onComplete) onComplete();
        return 0;
      }
      return newVal;
    });
  };

  return (
    <div className="w-full aspect-square bg-white rounded-3xl shadow-inner border-2 border-slate-100 flex items-center justify-center relative overflow-hidden gesture-stage">
      {/* Background Silhouette Reference */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
         <i className="fas fa-user-tie text-[24rem]"></i>
      </div>

      {/* Grid Lines for Visual Context */}
      <div className="absolute inset-0 pointer-events-none border-x border-slate-100 left-1/2 -translate-x-1/2 w-px"></div>
      <div className="absolute inset-0 pointer-events-none border-y border-slate-100 top-1/2 -translate-y-1/2 h-px"></div>

      <Hand 
        side="left" 
        frames={animation.leftHand} 
        isPlaying={isPlaying} 
        onFinished={handleHandFinished}
      />
      <Hand 
        side="right" 
        frames={animation.rightHand} 
        isPlaying={isPlaying} 
        onFinished={handleHandFinished}
      />

      <div className="absolute bottom-4 left-4 flex gap-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          <span className="text-[8px] font-bold text-slate-400 uppercase">Left</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
          <span className="text-[8px] font-bold text-slate-400 uppercase">Right</span>
        </div>
      </div>
    </div>
  );
};

export default GestureAnimator;
