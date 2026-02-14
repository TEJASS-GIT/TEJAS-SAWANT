
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { translateToASL } from './services/geminiService';
import { TranslationResult, SignGloss } from './types';
import { COMMON_PHRASES } from './constants';
import FingerspellingPlayer from './components/FingerspellingPlayer';
import GestureAnimator from './components/GestureAnimator';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [activeGlossIndex, setActiveGlossIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'gesture' | 'fingerspell'>('gesture');

  // Voice Recording State
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);

  const handleTranslate = async (textToUse?: string) => {
    const text = textToUse || inputText;
    if (!text.trim()) return;

    setIsTranslating(true);
    setError(null);
    setResult(null);
    setActiveGlossIndex(0);
    setIsPlaying(false);

    try {
      const translation = await translateToASL(text);
      if (!translation.glosses || translation.glosses.length === 0) {
        throw new Error("Linguistic data parsing failed.");
      }
      setResult(translation);
    } catch (err) {
      console.error(err);
      setError("Unable to process linguistic gesture data. Check your connection or try a simpler phrase.");
    } finally {
      setIsTranslating(false);
    }
  };

  const startVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsListening(true);
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
              sessionPromise.then(session => {
                session.sendRealtimeInput({ 
                  media: { data: base64, mimeType: 'audio/pcm;rate=16000' } 
                });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setInputText(prev => prev + text);
            }
            if (message.serverContent?.turnComplete) {
              stopVoiceInput();
              // Trigger translation after a small delay to ensure state update
              setTimeout(() => handleTranslate(), 100);
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            stopVoiceInput();
          },
          onclose: () => setIsListening(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: 'Transcribe the user speech perfectly. If they speak Hindi, transcribe it into Devanagari script.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start voice input:", err);
      setError("Microphone access denied or Gemini Live API unavailable.");
    }
  };

  const stopVoiceInput = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsListening(false);
  };

  const nextGloss = () => {
    if (result && activeGlossIndex < result.glosses.length - 1) {
      setActiveGlossIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setActiveGlossIndex(0);
    }
  };

  const currentGloss: SignGloss | null = result ? result.glosses[activeGlossIndex] : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <i className="fas fa-hand-holding-heart text-white text-xl"></i>
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Gesture <span className="text-indigo-600">Talk</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase tracking-tighter">ASL v3.0 Voice Enabled</span>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Column */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <i className="fas fa-comment-dots text-indigo-500"></i>
                Input Source
              </h2>
              {isListening && (
                <div className="flex items-center gap-2 text-rose-500 animate-pulse">
                  <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Listening...</span>
                </div>
              )}
            </div>
            
            <div className="relative group">
              <textarea
                className={`w-full h-48 p-6 bg-slate-50 rounded-3xl border-2 transition-all resize-none text-2xl text-slate-700 leading-tight font-medium outline-none ${
                  isListening ? 'border-rose-400 bg-rose-50/30' : 'border-transparent focus:border-indigo-500 focus:bg-white'
                }`}
                placeholder="Type or click the mic to speak..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              
              <div className="absolute bottom-4 right-4 flex gap-3">
                <button
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 ${
                    isListening 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                  }`}
                  title="Voice Input"
                >
                  <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'} text-xl`}></i>
                </button>
                
                <button
                  onClick={() => handleTranslate()}
                  disabled={isTranslating || !inputText.trim()}
                  className={`px-10 py-4 rounded-2xl font-black text-white shadow-2xl flex items-center gap-3 transition-all active:scale-95 ${
                    isTranslating || !inputText.trim() 
                    ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1'
                  }`}
                >
                  {isTranslating ? (
                    <><i className="fas fa-spinner fa-spin"></i> Processing</>
                  ) : (
                    <><i className="fas fa-magic"></i> Translate</>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {COMMON_PHRASES.map((phrase, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputText(phrase);
                    handleTranslate(phrase);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 text-xs font-bold rounded-xl transition-all"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </section>

          {result && result.translatedEnglish && (
            <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-lg flex items-center justify-between animate-in fade-in zoom-in">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                   <i className="fas fa-language"></i>
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase opacity-60">Source Bridge</p>
                   <p className="text-lg font-bold">"{result.translatedEnglish}"</p>
                 </div>
               </div>
               <div className="text-[10px] font-black border border-white/20 px-2 py-1 rounded uppercase">Linguistic Processing</div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 text-rose-700 p-6 rounded-[2rem] border border-rose-100 flex items-start gap-4 animate-in slide-in-from-top-4">
              <i className="fas fa-exclamation-triangle mt-1"></i>
              <p className="font-bold">{error}</p>
            </div>
          )}

          {result && (
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-10 duration-700">
              <div className="mb-8 flex items-center justify-between">
                 <h2 className="text-xl font-black text-slate-800 tracking-tight">ASL Sequence</h2>
                 <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full border border-indigo-100 uppercase tracking-widest">
                   {result.aslStructure}
                 </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {result.glosses.map((gloss, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      setActiveGlossIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={`p-6 rounded-3xl border-2 transition-all text-left group flex items-center justify-between ${
                      activeGlossIndex === idx 
                      ? 'border-indigo-600 bg-indigo-50 shadow-md translate-x-2' 
                      : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${activeGlossIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tighter group-hover:text-indigo-600 transition-colors uppercase">{gloss.gloss}</h3>
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Original: {gloss.word}</p>
                      </div>
                    </div>
                    {gloss.isTwoHanded && (
                       <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">Dual Hand Sign</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Visualizer Column */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-6">
            <section className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-200">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Interpreter</h2>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  {(['gesture', 'fingerspell'] as const).map(mode => (
                    <button 
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400'}`}
                    >
                      {mode === 'gesture' ? 'Sign' : 'Spell'}
                    </button>
                  ))}
                </div>
              </div>

              {currentGloss ? (
                <div className="space-y-8">
                  {viewMode === 'gesture' ? (
                    <GestureAnimator 
                      animation={currentGloss.animation} 
                      isPlaying={isPlaying}
                      onComplete={nextGloss}
                    />
                  ) : (
                    <FingerspellingPlayer 
                      text={currentGloss.gloss} 
                      isPlaying={isPlaying} 
                      onComplete={nextGloss}
                    />
                  )}

                  <div className="flex flex-col items-center gap-8">
                    <div className="flex items-center justify-center gap-6">
                      <button 
                        onClick={() => {
                          setActiveGlossIndex(prev => Math.max(0, prev - 1));
                          setIsPlaying(false);
                        }}
                        disabled={activeGlossIndex === 0}
                        className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-all flex items-center justify-center"
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-24 h-24 rounded-3xl bg-indigo-600 text-white text-4xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                      >
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} ${isPlaying ? '' : 'ml-1'}`}></i>
                      </button>

                      <button 
                        onClick={() => {
                          setActiveGlossIndex(prev => Math.min((result?.glosses.length || 1) - 1, prev + 1));
                          setIsPlaying(false);
                        }}
                        disabled={!result || activeGlossIndex === result.glosses.length - 1}
                        className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-all flex items-center justify-center"
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>

                    <div className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-3">Sign Token</p>
                      <div className="text-5xl font-black text-slate-800 tracking-tighter uppercase mb-4">
                        {currentGloss.gloss}
                      </div>
                      <div className="text-sm text-slate-500 font-medium leading-relaxed bg-white/80 p-5 rounded-2xl border border-slate-100 shadow-sm">
                        {currentGloss.handshapeDescription}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-slate-200 space-y-8">
                  <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-6xl shadow-inner animate-pulse">
                    <i className="fas fa-microphone-alt"></i>
                  </div>
                  <p className="text-center font-black text-slate-400 uppercase tracking-widest text-xs">Ready for voice or text</p>
                </div>
              )}
            </section>

            <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-slate-800">
               <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-3xl"></div>
              <h3 className="font-black text-lg mb-4 flex items-center gap-3">
                <i className="fas fa-wave-square text-indigo-400"></i>
                Gesture Intelligence
              </h3>
              <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wider">
                Our dual-hand engine simulates the HOLM parameters (Handshape, Orientation, Location, Movement) of American Sign Language using high-precision 2D coordinates.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="py-12 border-t border-slate-100 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Gesture Talk Multimodal Accessibility Engine</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
