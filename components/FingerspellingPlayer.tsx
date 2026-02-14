
import React, { useState, useEffect, useRef } from 'react';
import { ASL_ALPHABET } from '../constants';

interface FingerspellingPlayerProps {
  text: string;
  isPlaying: boolean;
  onComplete?: () => void;
  speed?: number;
}

const FingerspellingPlayer: React.FC<FingerspellingPlayerProps> = ({ 
  text, 
  isPlaying, 
  onComplete, 
  speed = 800 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cleanText = text.toUpperCase().replace(/[^A-Z ]/g, '');

  useEffect(() => {
    if (isPlaying) {
      if (currentIndex < cleanText.length) {
        timerRef.current = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, speed);
      } else {
        if (onComplete) onComplete();
        // Don't reset immediately so the last letter stays visible for a moment
      }
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, cleanText.length, speed, onComplete]);

  // Reset if text changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [text]);

  const currentLetter = cleanText[currentIndex] || cleanText[cleanText.length - 1] || 'A';
  const imageUrl = ASL_ALPHABET[currentLetter] || ASL_ALPHABET['A'];

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner border-2 border-slate-100 min-h-[300px]">
      <div className="relative w-48 h-48 mb-4 transition-all duration-300 transform">
        <img 
          src={imageUrl} 
          alt={`ASL sign for ${currentLetter}`} 
          className="w-full h-full object-contain drop-shadow-md"
        />
        <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl shadow-lg border-4 border-white">
          {currentLetter}
        </div>
      </div>
      
      <div className="flex gap-1 overflow-x-auto max-w-full p-2">
        {cleanText.split('').map((char, idx) => (
          <span 
            key={idx}
            className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
              idx === currentIndex ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
};

export default FingerspellingPlayer;
